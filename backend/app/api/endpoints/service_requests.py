from typing import Any, List, Optional
from datetime import datetime, date, timezone
import time

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session, joinedload

from app import schemas, models
from app.api import dependencies
from app.crud.service_request import service_request as service_request_crud
from app.crud.service import service as service_def_crud
from app.core.form_validation import validate_dynamic_form
from app.models.service import ServiceVariant
from sqlalchemy import func, or_
from app.models.transaction import Transaction
from app.models.status_history import StatusHistory
from app.crud.vendor import vendor as vendor_crud
from app.schemas.vendor import VendorTransactionCreate
from app.crud.ticket import ticket as ticket_crud
from app.schemas.ticket import SupportTicketCreate
from app.core.events import event_broadcaster
from app.core.notifications import notification_manager
from app.core.pdf_generator import generate_service_invoice_pdf
from app.core.rate_limiter import limiter
from app.core.finance import finance_service
from app.services.workflow_service import workflow_service
from fastapi.responses import StreamingResponse
import json

router = APIRouter()

@router.post("/", response_model=schemas.ServiceRequest)
@limiter.limit("5/minute")
async def create_service_request(
    request: Request,
    *,
    db: Session = Depends(dependencies.get_db),
    request_in: schemas.ServiceRequestCreate,
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    """
    Submit a new service request.
    """
    # Verify service definition exists
    service_def = service_def_crud.get(db, id=request_in.service_def_id)
    if not service_def:
        raise HTTPException(status_code=404, detail="Service Definition not found")

    # Perform Backend Validation against the JSON Schema
    if service_def.form_schema:
        validate_dynamic_form(service_def.form_schema, request_in.form_data)
    
    # Calculate Selling Price
    unit_price = service_def.base_price
    variant_id = request_in.variant_id
    cost_price = 0.0
    vendor_id = None
    
    # Administrative Overrides & Scope Enforcement
    is_admin = current_user.is_superuser or any(role.name == "Admin" for role in current_user.roles)
    # Inclusive check for all administrative/staff roles
    is_staff_action = is_admin or any(role.name in ["Staff", "Manager", "Finance", "Field Ops", "Support"] for role in current_user.roles)

    # Enforce Service Scope for Staff (Server-Side Safeguard)
    if not is_admin and current_user.allowed_services:
        allowed_ids = [s.id for s in current_user.allowed_services]
        if service_def.id not in allowed_ids:
            raise HTTPException(
                status_code=403, 
                detail=f"You do not have permission to create requests for '{service_def.name}'. Out of service scope."
            )
    
    if variant_id:
        variant = db.query(models.ServiceVariant).filter(models.ServiceVariant.id == variant_id).first()
        if variant:
            unit_price = variant.default_price
            cost_price = (variant.default_cost or 0.0) * request_in.quantity
            vendor_id = variant.default_vendor_id
    
    selling_price = unit_price * request_in.quantity
    
    # Direct overrides for privileged users
    if is_staff_action:
        # If breakdown provided, it defines the truth for prices
        if request_in.financial_breakdown:
            income = sum(float(i.amount or 0) for i in request_in.financial_breakdown if i.type == "INCOME")
            expense = sum(float(i.amount or 0) for i in request_in.financial_breakdown if i.type in ["EXPENSE", "PAYMENT"])
            discount = sum(float(i.amount or 0) for i in request_in.financial_breakdown if i.type == "DISCOUNT")
            payouts = sum(float(i.amount or 0) for i in request_in.financial_breakdown if i.type == "PAYMENT")
            
            base_target = max(0, income - discount)
            # Internal check: service_def is available here
            is_internal = not service_def.is_public
            
            selling_price = base_target + (payouts if is_internal else 0)
            cost_price = expense
        else:
            if request_in.selling_price is not None:
                selling_price = request_in.selling_price
            if request_in.cost_price is not None:
                cost_price = request_in.cost_price
        
        if request_in.vendor_id is not None:
            vendor_id = request_in.vendor_id

    target_user_id = current_user.id
    if is_staff_action and request_in.user_id:
        target_user_id = request_in.user_id
    elif is_staff_action:
        # Default to the staff/admin themselves if no client selected
        target_user_id = current_user.id

    # Fetch current exchange rate for BDT/SAR from centralized service
    current_rate = await finance_service.get_exchange_rate(db)
    
    # Use provided currency/rate if admin
    target_currency = request_in.currency or service_def.currency or "SAR"
    if is_staff_action and request_in.exchange_rate:
        current_rate = request_in.exchange_rate

    # --- LOGIC: Active Request Check (Anti-Spam / Time-Window) ---
    # Prevent users from creating multiple PENDING/ACTIVE requests for the same service WITH IDENTICAL DATA.
    # SKIP for Admins/Staff creating on behalf of clients
    if not is_staff_action:
        active_statuses = ["Pending", "Approved", "Verifying Information", "Service on Hold", "Processing", "In Transit", "Received at Warehouse", "Out for Delivery"]
        
        # Fetch active requests for this service and user
        active_requests = db.query(models.ServiceRequest).filter(
            models.ServiceRequest.user_id == target_user_id,
            models.ServiceRequest.service_def_id == service_def.id,
            models.ServiceRequest.status.in_(active_statuses)
        ).all()

        # Filter by identical data in Python to ensure DB compatibility (especially for JSON fields)
        existing_active = next(
            (req for req in active_requests 
            if req.form_data == request_in.form_data and req.variant_id == request_in.variant_id),
            None
        )

        if existing_active:
            raise HTTPException(
                status_code=400, 
                detail=f"You already have an active request (#{existing_active.id}) for this service with identical information. Please wait for it to be completed or cancelled."
            )
    
    # --- NEW: Smart Overwrite for Staff Settlements ---
    if service_def.slug == "staff-settlement":
        agent = request_in.form_data.get("agent")
        month = request_in.form_data.get("month")
        year = request_in.form_data.get("year")
        
        if agent and month and year:
            # Look for existing record
            existing = db.query(models.ServiceRequest).filter(
                models.ServiceRequest.service_def_id == service_def.id,
                models.ServiceRequest.status != "Cancelled",
                models.ServiceRequest.status != "Rejected"
            ).all()
            
            for ex in existing:
                if (ex.form_data.get("agent") == agent and 
                    ex.form_data.get("month") == month and 
                    ex.form_data.get("year") == year):
                    # Delete existing to overwrite
                    db.delete(ex)
                    db.flush()
    
    request = service_request_crud.create_with_user(
        db, 
        obj_in=request_in, 
        user_id=target_user_id,
        selling_price=selling_price,
        cost_price=cost_price,
        vendor_id=vendor_id,
        variant_id=variant_id,
        quantity=request_in.quantity,
        currency=target_currency,
        exchange_rate=current_rate,
        created_by_id=current_user.id
    )
    
    # Eagerly load service definition for financials sync
    db.refresh(request, ["service_definition"])
    
    # 1. Apply Status Override FIRST
    if is_staff_action and request_in.status and request_in.status != "Pending":
        request.status = request_in.status
        db.add(request)
        db.flush() # Ensure status is available for sync_financials check

    # 2. Sync financials if breakdown provided (Handles re-calculation and vendor debt)
    if is_staff_action and request_in.financial_breakdown:
        workflow_service.sync_financials(
            db=db,
            request=request,
            breakdown=request_in.financial_breakdown,
            user_id=current_user.id
        )
    
    # Refresh to pick up any changes from sync_financials
    db.refresh(request)

    # --- NEW: Direct Payment Processing & Auto-Settle for Completed ---
    # Case 1: Manual payment amount provided
    if is_staff_action and request_in.payment_amount and request_in.payment_amount > 0:
        payment_amount = request_in.payment_amount
    # Case 2: Direct Completed (Auto-settle full price if no payment provided)
    elif is_staff_action and request.status == "Completed" and request.selling_price > 0:
        payment_amount = request.selling_price
    else:
        payment_amount = 0

    if payment_amount > 0:
        # Create a pre-verified transaction
        txn_currency = request.currency
        txn_rate = request.exchange_rate
        
        new_txn = models.Transaction(
            transaction_id=f"PAY-{request.id}-{int(time.time())}",
            service_request_id=request.id,
            user_id=request.user_id,
            amount=payment_amount,
            base_price=payment_amount,
            claimed_amount=payment_amount * (txn_rate if txn_currency == "BDT" else 1.0),
            claimed_currency=txn_currency,
            exchange_rate=txn_rate,
            payment_method=request_in.payment_method or "Cash",
            client_reference_id=request_in.payment_reference or f"AUTO-SETTLE-REQ-{request.id}",
            status="Verified", # Auto-verified
            transaction_type="Payment",
            notes="Automated settlement for direct entry.",
            created_by_id=current_user.id,
            verified_by_id=current_user.id,
            verified_at=datetime.now(timezone.utc)
        )
        db.add(new_txn)
        db.commit()

    await workflow_service.process_creation(
        db=db,
        request=request,
        current_user=current_user,
        service_def=service_def
    )
    
    # Final Commit to ensure all sync_financials changes are persisted
    db.commit()
    db.refresh(request)
    
    return request

@router.get("/me", response_model=schemas.ListResponse[schemas.ServiceRequest])
def read_my_service_requests(
    db: Session = Depends(dependencies.get_db),
    skip: int = 0,
    limit: int = 100,
    q: Optional[str] = None,
    status: Optional[List[str]] = Query(None),
    service_def_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    """
    Get all service requests submitted by the current user.
    Supports filtering by search query 'q', status, service type, and date range.
    """
    query = db.query(models.ServiceRequest).filter(models.ServiceRequest.user_id == current_user.id)
    
    # 1. Apply Filters
    if status:
        query = query.filter(models.ServiceRequest.status.in_(status))
    
    if service_def_id:
        query = query.filter(models.ServiceRequest.service_def_id == service_def_id)
        
    if start_date:
        query = query.filter(models.ServiceRequest.created_at >= start_date)
    
    if end_date:
        query = query.filter(models.ServiceRequest.created_at <= end_date)

    # 2. Apply Search
    if q:
        search_term = f"%{q}%"
        # Search by ID (if numeric) or Service Name
        conditions = [
            models.ServiceRequest.service_definition.has(models.ServiceDefinition.name.ilike(search_term))
        ]
        
        # Try to parse ID
        # Handle "REQ-123" format
        clean_id = q.replace("REQ-", "").replace("#", "").strip()
        if clean_id.isdigit():
            conditions.append(models.ServiceRequest.id == int(clean_id))
        
        query = query.filter(or_(*conditions))

    total = query.count()
    items = query.order_by(models.ServiceRequest.id.desc()).offset(skip).limit(limit).all()
    
    return {
        "items": items,
        "total": total
    }

@router.get("", response_model=schemas.ListResponse[schemas.ServiceRequest])
@router.get("/", response_model=schemas.ListResponse[schemas.ServiceRequest])
def read_all_service_requests(
    db: Session = Depends(dependencies.get_db),
    skip: int = 0,
    limit: int = 100,
    q: Optional[str] = None,
    status: Optional[List[str]] = Query(None),
    category: Optional[str] = None,
    user_id: Optional[int] = None, # Added filter
    has_financials: bool = False,
    vendor_id: Optional[int] = None,
    service_def_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    is_public: Optional[bool] = None,
    current_user: models.User = Depends(dependencies.require_permission("requests.view_all")),
):
    """
    Get all service requests (Admin only).
    Optional: Filter by user_id, search query (q), status (list), category.
    """
    status_filter = status
    if status and "Active" in status:
        # "Active" is a macro. If selected, we expand it.
        # But if combined with others, it's tricky.
        # Logic: If "Active" is present, we include all active statuses.
        active_statuses = [
            "Pending", "Approved", "Verifying Information", "Service on Hold", 
            "Processing", "In Transit", "Received at Warehouse", "Out for Delivery"
        ]
        # If status is JUST ["Active"], we use the list.
        # If it's ["Active", "Cancelled"], we want Active OR Cancelled.
        
        # Remove "Active" keyword and extend with actual statuses
        status_filter = [s for s in status if s != "Active"]
        status_filter.extend(active_statuses)
        # Remove duplicates
        status_filter = list(set(status_filter))
    
    items, total = service_request_crud.get_multi_with_count(
        db, 
        skip=skip, 
        limit=limit, 
        user=current_user,
        filter_user_id=user_id,
        search_query=q,
        status_filter=status_filter,
        category_filter=category,
        has_financials=has_financials,
        vendor_id=vendor_id,
        service_def_id=service_def_id,
        start_date=start_date,
        end_date=end_date,
        is_public_filter=is_public
    )

    # Enrich items with calculated financial fields
    for item in items:
        verified_paid = sum(t.amount for t in item.transactions if t.status == "Verified")
        item.paid_amount = round(verified_paid, 2)
        item.balance_due = round(max(0, item.selling_price - verified_paid), 2)
    
    # Calculate Stats (Respect filters)
    raw_counts = service_request_crud.get_status_counts(
        db, 
        user=current_user,
        category_filter=category,
        is_public_filter=is_public
    )
    
    # Aggregate for Tabs
    stats = {
        "all": sum(raw_counts.values()),
        "pending": raw_counts.get("Pending", 0),
        "completed": raw_counts.get("Completed", 0),
        "cancelled": raw_counts.get("Cancelled", 0),
    }
    
    # Calculate "Active" (All - Closed)
    closed_statuses = ["Completed", "Cancelled", "Rejected"]
    stats["active"] = sum(count for st, count in raw_counts.items() if st not in closed_statuses)

    # Optional: Financial Summary
    summary_data = { "stats": stats }
    if has_financials:
        # Use optimized CRUD method for filtered summary
        financial_summary = service_request_crud.get_filtered_summary(
            db,
            user=current_user,
            filter_user_id=user_id,
            search_query=q,
            status_filter=status_filter,
            category_filter=category,
            has_financials=has_financials,
            vendor_id=vendor_id,
            service_def_id=service_def_id,
            start_date=start_date,
            end_date=end_date,
            is_public_filter=is_public
        )
        summary_data["total_profit"] = financial_summary["total_profit"]
    
    return {
        "items": items,
        "total": total,
        "summary": summary_data
    }

@router.put("/{request_id}", response_model=schemas.ServiceRequest)
async def update_service_request(
    *,
    db: Session = Depends(dependencies.get_db),
    request_id: int,
    request_in: schemas.ServiceRequestUpdate,
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    """
    Update a service request (Status, Data). Admin/Staff.
    Enforces State Machine Logic, logs status history, and manages Vendor Debt.
    """
    # Use with_for_update to prevent race conditions during status changes
    request = db.query(models.ServiceRequest).filter(models.ServiceRequest.id == request_id).with_for_update().first()
    if not request:
        raise HTTPException(
            status_code=404,
            detail="The service request with this id does not exist in the system",
        )
        
    # Permission & Scope Check
    is_admin = current_user.is_superuser or any(role.name == "Admin" for role in current_user.roles)
    
    # Allowed permissions for update
    allowed_perms = ["requests.manage", "requests.process_technical", "requests.approve_business", "requests.finalize"]
    has_perm = any(dependencies.check_permission(current_user, perm) for perm in allowed_perms)
    
    is_in_scope = True
    if current_user.allowed_services:
        allowed_ids = [s.id for s in current_user.allowed_services]
        if request.service_def_id not in allowed_ids:
            is_in_scope = False
            
    if not is_admin and not (has_perm and is_in_scope):
         raise HTTPException(status_code=403, detail="Not enough permissions or out of service scope")
    
    # Delegate update logic to Workflow Service
    request = await workflow_service.process_update(
        db=db,
        request=request,
        request_in=request_in,
        current_user=current_user
    )
    
    return request

@router.put("/{request_id}/cancel", response_model=schemas.ServiceRequest)
async def cancel_service_request(
    *,
    db: Session = Depends(dependencies.get_db),
    request_id: int,
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    """
    Cancel a service request. 
    Accessible by the owner of the request.
    """
    request = service_request_crud.get(db, id=request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Service Request not found")
        
    if request.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this request")
        
    return await workflow_service.cancel_request(
        db=db,
        request=request,
        current_user=current_user
    )

@router.get("/{request_id}/invoice", response_class=StreamingResponse)
def get_service_request_invoice(
    *,
    db: Session = Depends(dependencies.get_db),
    request_id: int,
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    """
    Generate and stream a complete PDF invoice for a service request.
    """
    request = service_request_crud.get(db, id=request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Service Request not found")
        
    # Permission Check
    is_admin = False
    if current_user.is_superuser:
        is_admin = True
    elif any(role.name == "Admin" for role in current_user.roles):
        is_admin = True
        
    if not is_admin and request.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # Fetch Transactions
    transactions = db.query(models.Transaction).filter(
        models.Transaction.service_request_id == request_id
    ).order_by(models.Transaction.created_at.desc()).all()

    pdf_buffer = generate_service_invoice_pdf(request, transactions)
    
    safe_name = "".join([c for c in (request.user.full_name or "Client") if c.isalnum() or c in (' ', '_')]).strip().replace(' ', '_')
    filename = f"Invoice_REQ-{request.id}_{safe_name}.pdf"
    
    headers = {
        'Content-Disposition': f'attachment; filename="{filename}"'
    }
    return StreamingResponse(pdf_buffer, headers=headers, media_type="application/pdf")

@router.get("/{request_id}", response_model=schemas.ServiceRequest)
def read_service_request(
    *,
    db: Session = Depends(dependencies.get_db),
    request_id: int,
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    """
    Get a specific service request. 
    Accessible by Admins OR the owner of the request.
    """
    from sqlalchemy.orm import joinedload
    request = db.query(models.ServiceRequest).options(
        joinedload(models.ServiceRequest.service_definition),
        joinedload(models.ServiceRequest.user),
        joinedload(models.ServiceRequest.created_by),
        joinedload(models.ServiceRequest.updated_by)
    ).filter(models.ServiceRequest.id == request_id).first()
    
    if not request:
        raise HTTPException(
            status_code=404,
            detail="The service request with this id does not exist in the system",
        )
    
    # Permission Check
    is_admin = current_user.is_superuser or any(role.name == "Admin" for role in current_user.roles)
    is_owner = request.user_id == current_user.id
    
    # Check if user has explicit 'requests.view_all' permission and is within scope
    has_view_perm = dependencies.check_permission(current_user, "requests.view_all")
    is_in_scope = True
    if has_view_perm and current_user.allowed_services:
        allowed_ids = [s.id for s in current_user.allowed_services]
        if request.service_def_id not in allowed_ids:
            is_in_scope = False
            
    if not is_admin and not is_owner and not (has_view_perm and is_in_scope):
        raise HTTPException(
            status_code=403, detail="Not enough permissions"
        )
        
    return request

@router.get("/{request_id}/remaining-balance", response_model=float)
def get_remaining_balance(
    *,
    db: Session = Depends(dependencies.get_db),
    request_id: int,
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    """
    Get the remaining balance for a service request.
    """
    request = service_request_crud.get(db, id=request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Service Request not found")

    # Permission Check
    is_admin = any(role.name in ["Admin", "Manager"] for role in current_user.roles) or current_user.is_superuser
    if not is_admin and request.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # Total Paid (Verified + Pending)
    total_paid = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.service_request_id == request_id,
        models.Transaction.status.in_(["Verified", "Pending"]),
        models.Transaction.amount > 0
    ).scalar() or 0.0

    # Total Refunded (Verified + Pending)
    total_refunded = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.service_request_id == request_id,
        models.Transaction.status.in_(["Verified", "Pending"]),
        models.Transaction.amount < 0
    ).scalar() or 0.0

    net_paid = total_paid + total_refunded # Refunds are negative
    remaining_balance = request.selling_price - net_paid
    
    return round(remaining_balance, 2)