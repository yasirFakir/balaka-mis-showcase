from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timezone

from app import schemas, models
from app.api import dependencies
from app.crud.transaction import transaction as transaction_crud
from app.crud.service_request import service_request as service_request_crud
from app.core.events import event_broadcaster
from app.core.notifications import notification_manager
from app.services.email_service import email_service
from app.schemas.transaction import TransactionListResponse
from app.core.finance import finance_service
from app.core import security
import json

router = APIRouter()

@router.post("/", response_model=schemas.Transaction)
async def create_transaction(
    *,
    db: Session = Depends(dependencies.get_db),
    transaction_in: schemas.TransactionCreate,
    current_user: models.User = Depends(dependencies.require_permission("finance.manage_transactions")),
):
    """
    Record a new payment transaction. Staff/Manager.
    """
    # Verify request exists and get its definition
    request = db.query(models.ServiceRequest).filter(models.ServiceRequest.id == transaction_in.service_request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Service Request not found")

    # 1. Prevent payment if already finalized (Approved/Paid)
    # We check if the sum of VERIFIED transactions already covers the cost, 
    # OR if the status is explicitly "Approved" or "Completed".
    if request.status in ["Completed", "Rejected"]:
        raise HTTPException(status_code=400, detail="This request is closed/rejected. No further payments allowed.")

    # Overpayment Validation
    from sqlalchemy import func
    
    # Total Paid (Verified + Pending)
    total_paid = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.service_request_id == transaction_in.service_request_id,
        models.Transaction.status.in_(["Verified", "Pending"]),
        models.Transaction.amount > 0
    ).scalar() or 0.0

    # Total Refunded (Verified + Pending)
    total_refunded = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.service_request_id == transaction_in.service_request_id,
        models.Transaction.status.in_(["Verified", "Pending"]),
        models.Transaction.amount < 0
    ).scalar() or 0.0

    net_paid = total_paid + total_refunded # Refunds are negative
    remaining_balance = request.selling_price - net_paid
    
    # Round to 2 decimal places to avoid floating point issues
    remaining_balance = round(remaining_balance, 2)
    
    # NEW: Multi-Currency Validation
    # We must convert the incoming amount to SAR before comparing with balance
    # Use request's locked rate if not explicitly provided in transaction
    effective_rate = transaction_in.exchange_rate or request.exchange_rate or 1.0
    
    # Store raw amount for claimed_amount logic in CRUD
    raw_amount = transaction_in.amount
    
    incoming_sar_amount = raw_amount
    if transaction_in.claimed_currency == "BDT":
        incoming_sar_amount = round(raw_amount / effective_rate, 2)
    
    if round(incoming_sar_amount, 2) > remaining_balance:
        raise HTTPException(
            status_code=400,
            detail=f"Payment amount ({incoming_sar_amount:.2f} SAR) cannot exceed the remaining balance ({remaining_balance:.2f} SAR)."
        )

    # 2. Enforce Client Reference ID for Non-Cash methods
    if transaction_in.payment_method != "Cash" and not transaction_in.client_reference_id:
        raise HTTPException(
            status_code=400, 
            detail=f"{transaction_in.payment_method} requires a Client Reference ID (e.g. Transaction Number)."
        )

    transaction = transaction_crud.create_with_user(
        db, obj_in=transaction_in, user_id=current_user.id, service=request
    )
    
    # NEW: AUTO-VERIFY for all Staff/Admin created transactions
    # (Previously this was only for Internal Operations)
    is_staff = current_user.is_superuser or any(role.name in ["Admin", "Manager", "Finance", "Staff", "Field Ops", "Support"] for role in current_user.roles)
    
    if is_staff:
        transaction.status = "Verified"
        transaction.verified_by_id = current_user.id
        transaction.verified_at = datetime.now(timezone.utc)
        
        # Determine if we should also trigger an auto-transition for the request status
        # Reuse logic similar to reconciliation if needed
        db.add(transaction)
        db.flush() # Sync ID and state for broadcast
        
        # Logic to potentially move request to 'Payment Verified'
        total_verified = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.service_request_id == request.id,
            models.Transaction.status == "Verified"
        ).scalar() or 0.0

        if (request.selling_price or 0.0) <= 0.01 or (total_verified >= (request.selling_price - 0.01)):
            if request.status in ["Approved", "Verifying Information"]:
                old_req_status = request.status
                request.status = "Payment Verified"
                db.add(request)
                
                # Log Status History
                history_entry = models.StatusHistory(
                    service_request_id=request.id,
                    old_status=old_req_status,
                    new_status="Payment Verified",
                    changed_by_id=current_user.id
                )
                db.add(history_entry)
                
                # Re-sync financials to trigger vendor debt
                from app.services.workflow_service import workflow_service
                workflow_service.sync_financials(db=db, request=request, breakdown=None, user_id=current_user.id)

        db.commit()
        db.refresh(transaction)
        db.refresh(request)

        # Send Receipt Email
        try:
            target_user = request.user
            email_to = target_user.email
            if not email_to and request.form_data:
                email_to = request.form_data.get("email") or request.form_data.get("email_address")
            
            if email_to:
                email_service.send_payment_receipt_email(
                    email_to=email_to,
                    name=target_user.full_name or "Valued Client",
                    transaction_id=transaction.transaction_id,
                    amount=transaction.amount,
                    currency="SAR",
                    date=transaction.created_at.strftime('%d %b %Y, %H:%M'),
                    method=transaction.payment_method,
                    ref_id=transaction.client_reference_id or transaction.internal_reference_id
                )
        except Exception as e:
            print(f"FAILED TO SEND RECEIPT EMAIL: {e}")

    await event_broadcaster.broadcast({
        "event": "transaction_created",
        "data": {
            "id": transaction.id,
            "service_request_id": transaction.service_request_id,
            "amount": transaction.amount,
            "status": transaction.status
        }
    })
    
    return transaction

@router.get("", response_model=TransactionListResponse)
@router.get("/", response_model=TransactionListResponse)
def read_all_transactions(
    db: Session = Depends(dependencies.get_db),
    skip: int = 0,
    limit: int = 100,
    q: Optional[str] = None,
    status: Optional[List[str]] = Query(None),
    min_amount: Optional[float] = None,
    transaction_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    service_def_id: Optional[int] = None,
    category: Optional[str] = None,
    is_public: Optional[bool] = None,
    payment_method: Optional[str] = None,
    current_user: models.User = Depends(dependencies.require_permission("finance.view_ledger")),
):
    """
    Get all transactions system-wide with centralized financial summary.
    Supports search (q), status filter, category, and public/private filtering.
    """
    items, total = transaction_crud.get_multi_with_count(
        db,
        skip=skip,
        limit=limit,
        search_query=q,
        status_filter=status,
        min_amount=min_amount,
        transaction_type=transaction_type,
        start_date=start_date,
        end_date=end_date,
        service_def_id=service_def_id,
        category_filter=category,
        is_public_filter=is_public,
        payment_method=payment_method
    )
    
    # Calculate Stats with filters
    summary_stats = transaction_crud.get_filtered_summary(
        db,
        search_query=q,
        status_filter=status,
        min_amount=min_amount,
        transaction_type=transaction_type,
        start_date=start_date,
        end_date=end_date,
        service_def_id=service_def_id,
        category_filter=category,
        is_public_filter=is_public,
        payment_method=payment_method
    )
    
    # Add count stats (Respect filters for vertical views)
    raw_counts = transaction_crud.get_status_counts(
        db,
        category_filter=category,
        is_public_filter=is_public
    )
    summary_stats["count_stats"] = {
        "all": sum(raw_counts.values()),
        "verified": raw_counts.get("Verified", 0),
        "pending": raw_counts.get("Pending", 0),
        "flagged": raw_counts.get("Flagged", 0),
        "rejected": raw_counts.get("Rejected", 0)
    }

    return {
        "items": items,
        "total": total,
        "summary": summary_stats
    }

@router.get("/wrapped", response_model=TransactionListResponse)
def read_wrapped_transactions(
    db: Session = Depends(dependencies.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(dependencies.require_permission("finance.view_ledger")),
):
    return read_all_transactions(db=db, skip=skip, limit=limit, current_user=current_user)

@router.post("/claim", response_model=schemas.Transaction)
async def claim_transaction(
    *,
    db: Session = Depends(dependencies.get_db),
    claim_in: schemas.TransactionClaim,
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    """
    Client submits a payment claim (e.g. "I paid via Bank with Ref XYZ").
    """
    # Verify request exists
    request = db.query(models.ServiceRequest).filter(models.ServiceRequest.id == claim_in.service_request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Service Request not found")

    # Permission: Must be owner or have finance.manage
    is_owner = request.user_id == current_user.id
    can_manage = dependencies.check_permission(current_user, "finance.manage")
    
    if not is_owner and not can_manage:
        raise HTTPException(status_code=403, detail="Not authorized to claim payment for this request")

    # Overpayment Validation & Amount Calculation
    from sqlalchemy import func
    
    # Total Paid (Verified + Pending)
    total_paid = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.service_request_id == claim_in.service_request_id,
        models.Transaction.status.in_(["Verified", "Pending"]),
        models.Transaction.amount > 0
    ).scalar() or 0.0

    # Total Refunded (Verified + Pending)
    total_refunded = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.service_request_id == claim_in.service_request_id,
        models.Transaction.status.in_(["Verified", "Pending"]),
        models.Transaction.amount < 0
    ).scalar() or 0.0

    net_paid = total_paid + total_refunded # Refunds are negative
    remaining_balance = request.selling_price - net_paid
    
    # Round to 2 decimal places to avoid floating point issues
    remaining_balance = round(remaining_balance, 2)

    if remaining_balance <= 0:
        raise HTTPException(
            status_code=400, 
            detail="This service request is already fully paid. No further payment claims are allowed."
        )

    target_amount = 0.0
    # If client specifies an amount, validate it
    if claim_in.amount is not None and claim_in.amount > 0:
        # Convert to SAR for validation
        # Use request's locked rate if not provided
        effective_rate = claim_in.exchange_rate or request.exchange_rate or 1.0
        
        claimed_sar_amount = claim_in.amount
        if claim_in.currency == "BDT":
            claimed_sar_amount = round(claim_in.amount / effective_rate, 2)
            
        if round(claimed_sar_amount, 2) > remaining_balance:
            raise HTTPException(
                status_code=400, 
                detail=f"Payment amount ({claimed_sar_amount:.2f} SAR) cannot exceed the remaining balance ({remaining_balance:.2f} SAR)."
            )
        target_amount = claim_in.amount
        
        # Ensure claim_in reflects the effective rate for the transaction creation below
        claim_in.exchange_rate = effective_rate
    else:
        # If no amount is given, assume they are claiming the full remaining balance
        # THIS IS A BUSINESS LOGIC DECISION. Let's make it explicit.
        # For now, we will require an amount to be specified by the client.
        raise HTTPException(
            status_code=400,
            detail="Please specify the amount you have paid."
        )

    if target_amount <= 0:
        raise HTTPException(
            status_code=400, 
            detail="Payment amount must be greater than 0."
        )

    # Enforce Client Reference ID for Non-Cash methods
    if claim_in.payment_method != "Cash" and not claim_in.client_reference_id:
        raise HTTPException(
            status_code=400, 
            detail=f"{claim_in.payment_method} requires a Client Reference ID (e.g. Transaction Number)."
        )

    transaction_in = schemas.TransactionCreate(
        service_request_id=claim_in.service_request_id,
        amount=target_amount, 
        payment_method=claim_in.payment_method,
        client_reference_id=claim_in.client_reference_id,
        notes=claim_in.notes,
        discount=0.0,
        claimed_currency=claim_in.currency,
        exchange_rate=claim_in.exchange_rate
    )

    transaction = transaction_crud.create_with_user(
        db, obj_in=transaction_in, user_id=current_user.id, service=request
    )
    
    await event_broadcaster.broadcast({
        "event": "transaction_created",
        "data": {
            "id": transaction.id,
            "service_request_id": transaction.service_request_id,
            "amount": transaction.amount,
            "status": transaction.status,
        }
    })
    
    # NEW: Dynamic Notification for Staff
    await notification_manager.notify_staff(
        db,
        title="New Payment Claim",
        title_bn="নতুন পেমেন্ট দাবি",
        message=f"Client {current_user.full_name} has claimed a payment of SR {target_amount} for request #{request.id}.",
        message_bn=f"ক্লায়েন্ট {current_user.full_name} অনুরোধ #{request.id} এর জন্য {target_amount} পেমেন্ট দাবি করেছেন।",
        link=f"/finance?view=verification&search={request.id}",
        required_permission="finance.view_ledger",
        notification_type="transaction_claimed"
    )
    
    return transaction

@router.post("/refund", response_model=schemas.Transaction)
async def create_refund_request(
    *,
    db: Session = Depends(dependencies.get_db),
    refund_in: schemas.TransactionRefund,
    current_user: models.User = Depends(dependencies.require_permission("finance.manage_transactions")),
):
    """
    Initiate a Refund Request. 
    Validates that we are not refunding more than we collected.
    Supports manual exchange rates for foreign currency refunds.
    """
    from sqlalchemy import func
    
    # 1. Get Request
    request = db.query(models.ServiceRequest).filter(models.ServiceRequest.id == refund_in.service_request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    # 2. Calculate Balance (Only Verified Transactions)
    # Total Paid (Positive)
    total_paid = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.service_request_id == refund_in.service_request_id,
        models.Transaction.status == "Verified",
        models.Transaction.amount > 0
    ).scalar() or 0.0

    # Total Refunded (Negative)
    total_refunded = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.service_request_id == refund_in.service_request_id,
        models.Transaction.status.in_(["Verified", "Pending"]), # Count pending refunds against balance
        models.Transaction.amount < 0
    ).scalar() or 0.0

    # Available Balance = Paid - |Refunded|
    available_balance = total_paid + total_refunded # Refunded is negative, so we add it to subtract
    available_balance = round(available_balance, 2)

    # Calculate requested refund amount in SAR
    refund_sar = refund_in.amount
    if refund_in.currency != "SAR":
        if refund_in.exchange_rate <= 0:
             raise HTTPException(status_code=400, detail="Exchange rate must be positive.")
        refund_sar = refund_in.amount / refund_in.exchange_rate
    
    refund_sar = round(refund_sar, 2)
    
    if refund_sar > available_balance:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot refund {refund_sar} SAR. Max refundable amount is {available_balance} SAR."
        )

    # 3. Create Refund Transaction
    # We use CRUDCreate but manually set fields
    temp_txn_id = security.generate_transaction_id("REF")
    transaction = models.Transaction(
        transaction_id=temp_txn_id,
        service_request_id=refund_in.service_request_id,
        amount=-refund_sar, # Negative for refund (SAR)
        claimed_amount=-refund_in.amount, # Negative for refund (Original Currency)
        claimed_currency=refund_in.currency,
        exchange_rate=refund_in.exchange_rate,
        base_price=0, # Not applicable
        discount=0,
        payment_method=refund_in.method,
        transaction_type="Refund",
        status="Pending",
        notes=f"Reason: {refund_in.reason}",
        user_id=request.user_id,
        created_by_id=current_user.id
    )
    db.add(transaction)
    db.flush() # Populate ID
    
    # Generate Final Serial-Based ID
    transaction.transaction_id = security.generate_transaction_id("REF", transaction.id)
    
    # Update service request status to Refunded
    old_status = request.status
    request.status = "Refunded"
    db.add(request)
    
    # Log Status Change
    history_entry = models.StatusHistory(
        service_request_id=request.id,
        old_status=old_status,
        new_status="Refunded",
        changed_by_id=current_user.id
    )
    db.add(history_entry)
    
    db.commit()
    db.refresh(transaction)
    db.refresh(request)
    
    await event_broadcaster.broadcast({
        "event": "transaction_created",
        "data": {
            "id": transaction.id,
            "service_request_id": transaction.service_request_id,
            "amount": transaction.amount,
            "status": transaction.status,
            "type": "refund"
        }
    })
    
    return transaction

@router.get("/request/{request_id}", response_model=schemas.ListResponse[schemas.Transaction])
def read_request_transactions(
    *,
    db: Session = Depends(dependencies.get_db),
    request_id: int,
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    """
    Get payment history for a specific request. 
    Accessible by Admin/Finance OR the owner.
    """
    # Permission Logic
    # 1. Check if user is owner
    request = service_request_crud.get(db, id=request_id)
    if not request:
         raise HTTPException(status_code=404, detail="Request not found")
         
    is_owner = request.user_id == current_user.id
    
    # 2. Check if user has finance permission
    has_perm = dependencies.check_permission(current_user, "finance.view_ledger")
    
    if not is_owner and not has_perm:
         raise HTTPException(status_code=403, detail="Not authorized")

    from sqlalchemy.orm import joinedload
    transactions = db.query(models.Transaction).options(
        joinedload(models.Transaction.user),
        joinedload(models.Transaction.created_by),
        joinedload(models.Transaction.updated_by),
        joinedload(models.Transaction.verified_by)
    ).filter(models.Transaction.service_request_id == request_id).all()
    return {
        "items": transactions,
        "total": len(transactions)
    }

from app.core.pdf_generator import generate_receipt_pdf
from app.services.ledger_export import LedgerExportService
from fastapi.responses import StreamingResponse

@router.post("/export-ledger", response_class=StreamingResponse)
def export_ledger(
    *,
    db: Session = Depends(dependencies.get_db),
    export_in: schemas.TransactionExportRequest,
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    """
    Export financial ledger as PDF or Excel.
    """
    if not dependencies.check_permission(current_user, "finance.export_ledger"):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    service = LedgerExportService(db)
    file_stream = service.generate_export(
        start_date=export_in.start_date,
        end_date=export_in.end_date,
        format_type=export_in.format,
        components=export_in.components,
        currency=export_in.currency,
        scope=export_in.scope,
        service_ids=export_in.service_ids,
        sort_order=export_in.sort_order
    )
    
    filename = f"Ledger_{export_in.start_date.date()}_{export_in.end_date.date()}.{export_in.format.lower()}"
    if export_in.format.lower() == "excel":
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename += ".xlsx" # Ensure extension
    else:
        media_type = "application/pdf"
    
    headers = {
        'Content-Disposition': f'attachment; filename="{filename}"'
    }
    
    return StreamingResponse(file_stream, headers=headers, media_type=media_type)

@router.put("/{transaction_id}/reconcile", response_model=schemas.Transaction)
async def reconcile_transaction(
    *,
    db: Session = Depends(dependencies.get_db),
    transaction_id: int,
    reconcile_in: schemas.TransactionReconcile,
    current_user: models.User = Depends(dependencies.require_permission("finance.manage_transactions")),
):
    """
    Reconcile a transaction. 
    - Cash: Verifies physical receipt. No internal ref needed.
    - Bank/Online: Requires internal bank reference ID.
    """
    transaction = transaction_crud.get(db, id=transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if transaction.status != "Pending":
        raise HTTPException(status_code=400, detail="Only Pending transactions can be reconciled.")

    # Logic Check
    if transaction.payment_method in ["Bank Transfer", "Card", "Online"]:
        if not reconcile_in.internal_reference_id:
             raise HTTPException(status_code=400, detail="Bank/Online payments require an Internal Reference ID for reconciliation.")
        
        # Strict Matching for Client Claims
        # If client provided a reference, the admin's input MUST match it to verify.
        if transaction.client_reference_id and transaction.client_reference_id != reconcile_in.internal_reference_id:
             raise HTTPException(
                 status_code=400, 
                 detail="Verification Failed: The provided internal reference does not match the client's claim. Please check your bank statement and try again."
             )

        transaction.internal_reference_id = reconcile_in.internal_reference_id
    else:
        # For Cash, we don't need a specific bank reference. 
        # Leave as None so PDF fallback logic works.
        transaction.internal_reference_id = None

    # NEW: Admin Override Logic
    if reconcile_in.exchange_rate is not None:
        transaction.exchange_rate = reconcile_in.exchange_rate
        transaction.notes = (transaction.notes or "") + f" | [Admin Override]: Rate adjusted to {reconcile_in.exchange_rate}"
    
    if reconcile_in.amount is not None:
        transaction.claimed_amount = reconcile_in.amount
        transaction.notes = (transaction.notes or "") + f" | [Admin Override]: Claimed amount adjusted to {reconcile_in.amount}"

    if reconcile_in.claimed_currency:
        transaction.claimed_currency = reconcile_in.claimed_currency

    # Recalculate Base Amount (SAR) ONLY if an override was provided
    # OR if the record looks corrupted (claimed_amount ~= amount but currency is BDT)
    is_suspicious = (
        transaction.claimed_currency == "BDT" and 
        transaction.claimed_amount is not None and 
        transaction.exchange_rate > 1.1 and
        abs(transaction.claimed_amount - transaction.amount) < 0.01
    )

    has_override = any([
        reconcile_in.exchange_rate is not None,
        reconcile_in.amount is not None,
        reconcile_in.claimed_currency is not None
    ])

    if has_override or is_suspicious:
        if transaction.claimed_amount is not None:
            if transaction.claimed_currency == "BDT":
                # If suspicious, we assume claimed_amount WAS the SAR value and needs to be multiplied by rate
                # to get the REAL claimed amount first, THEN divided back? 
                # No, if it's suspicious, it means claimed_amount is wrong. 
                # But we can't know the REAL BDT if we only have SAR.
                # Actually, the 'Robust Legacy Fix' on frontend handles this by sending the corrected BDT.
                # If we are here and has_override is FALSE but it's suspicious, 
                # it means the admin DID NOT enable adjustments.
                # In this case, we SHOULD NOT recalculate because we would just get the same 0.18.
                # WE SHOULD INSTEAD FIX THE claimed_amount!
                
                if not has_override and is_suspicious:
                    # Fix claimed_amount: 6.11 -> 199.31
                    transaction.claimed_amount = round(transaction.amount * (transaction.exchange_rate or 1.0), 2)
                    transaction.notes = (transaction.notes or "") + " | [System Auto-Fix]: Corrupted claimed_amount restored from SAR base."
                
                # Now recalculate (or just keep amount if we just fixed claimed_amount)
                transaction.amount = transaction.claimed_amount / (transaction.exchange_rate or 1.0)
            else:
                transaction.amount = transaction.claimed_amount # SAR to SAR
        else:
            if transaction.amount is None:
                 transaction.amount = 0.0

    transaction.status = "Verified"
    transaction.verified_by_id = current_user.id
    transaction.verified_at = datetime.now(timezone.utc)
    
    db.add(transaction)
    db.flush() # Ensure transaction is updated for the sum check

    # NEW: Coupon Fulfillment Logic
    # If this transaction used a coupon, we apply it to the ServiceRequest permanently
    if transaction.coupon_code:
        request = transaction.service_request
        # Check if already applied to avoid duplicates
        if not request.coupon_code:
            try:
                # 1. Fetch Coupon Data (Reuse validation logic or direct fetch)
                coupon = db.query(models.Coupon).filter(models.Coupon.code == transaction.coupon_code).first()
                # Fallback to service default if not in global table
                svc_config = request.service_definition.coupon_config
                
                discount_val = 0
                is_perc = False
                
                if coupon:
                    discount_val = coupon.value
                    is_perc = coupon.is_percentage
                    # Increment usage
                    coupon.used_count += 1
                    db.add(coupon)
                elif svc_config and svc_config.get("enabled") and svc_config.get("code") == transaction.coupon_code:
                    discount_val = svc_config.get("percentage", 0)
                    is_perc = True
                
                if discount_val > 0:
                    # 2. Update Request Breakdown
                    breakdown = request.financial_breakdown or []
                    
                    # Calculate amount
                    discount_amt = discount_val
                    if is_perc:
                        # Total Income from breakdown
                        total_inc = sum(float(i.get("amount") or 0) for i in breakdown if i.get("type") == "INCOME")
                        # Fallback if no income items yet
                        if total_inc == 0: total_inc = request.selling_price
                        discount_amt = (total_inc * discount_val) / 100

                    # Add or update DISCOUNT item
                    coupon_item = {
                        "label": f"Coupon: {transaction.coupon_code}",
                        "type": "DISCOUNT",
                        "amount": round(discount_amt, 2),
                        "source": "INTERNAL",
                        "key": "coupon_discount"
                    }
                    
                    # Remove any existing coupon discount
                    breakdown = [i for i in breakdown if i.get("key") != "coupon_discount"]
                    breakdown.append(coupon_item)
                    
                    request.financial_breakdown = breakdown
                    request.coupon_code = transaction.coupon_code
                    db.add(request)
                    db.flush()
                    
                    # 3. Sync Financials (Recalculates selling_price and profit)
                    from app.services.workflow_service import workflow_service
                    workflow_service.sync_financials(db, request, None, current_user.id)
            except Exception as e:
                print(f"COUPON FULFILLMENT ERROR: {e}")

    # AUTO-TRANSITION: Check if request is fully paid
    request = transaction.service_request
    from sqlalchemy import func
    total_verified = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.service_request_id == request.id,
        models.Transaction.status == "Verified"
    ).scalar() or 0.0

    # If selling price is 0 (free) or fully paid, move to Payment Verified
    # We use a small epsilon for float comparison
    if (request.selling_price or 0.0) <= 0.01 or (total_verified >= (request.selling_price - 0.01)):
        if request.status in ["Approved", "Verifying Information"]:
            old_req_status = request.status
            request.status = "Payment Verified"
            db.add(request)
            
            # Log Status History
            history_entry = models.StatusHistory(
                service_request_id=request.id,
                old_status=old_req_status,
                new_status="Payment Verified",
                changed_by_id=current_user.id
            )
            db.add(history_entry)
            
            # Re-sync financials to trigger vendor debt now that it's verified
            from app.services.workflow_service import workflow_service
            workflow_service.sync_financials(
                db=db,
                request=request,
                breakdown=None, # It will use existing breakdown
                user_id=current_user.id
            )

    db.commit()
    db.refresh(transaction)
    db.refresh(request)
    
    # Send Receipt Email
    try:
        target_user = request.user
        email_to = target_user.email
        if not email_to and request.form_data:
            email_to = request.form_data.get("email") or request.form_data.get("email_address")
        
        if email_to:
            email_service.send_payment_receipt_email(
                email_to=email_to,
                name=target_user.full_name or "Valued Client",
                transaction_id=transaction.transaction_id,
                amount=transaction.amount,
                currency="SAR",
                date=transaction.created_at.strftime('%d %b %Y, %H:%M'),
                method=transaction.payment_method,
                ref_id=transaction.client_reference_id or transaction.internal_reference_id
            )
    except Exception as e:
        print(f"FAILED TO SEND RECONCILE RECEIPT EMAIL: {e}")

    await event_broadcaster.broadcast({
        "event": "transaction_updated",
        "data": {
            "id": transaction.id,
            "service_request_id": transaction.service_request_id,
            "status": transaction.status,
            "action": "reconcile"
        }
    })
    
    # NEW: Dynamic Notification for Client
    await notification_manager.create_notification(
        db,
        user_id=transaction.service_request.user_id,
        title="Payment Verified",
        title_bn="পেমেন্ট যাচাই করা হয়েছে",
        message=f"Your payment of SR {transaction.amount} for request #{transaction.service_request_id} has been verified.",
        message_bn=f"অনুরোধ #{transaction.service_request_id} এর জন্য আপনার {transaction.amount} পেমেন্টটি যাচাই করা হয়েছে।",
        link=f"/requests/{transaction.service_request_id}",
        notification_type="transaction_verified"
    )
    
    return transaction
from app.crud.ticket import ticket as ticket_crud
from app.schemas.ticket import SupportTicketCreate

@router.put("/{transaction_id}/flag", response_model=schemas.Transaction)
async def flag_transaction(
    *,
    db: Session = Depends(dependencies.get_db),
    transaction_id: int,
    flag_in: schemas.TransactionFlag,
    current_user: models.User = Depends(dependencies.require_permission("finance.manage_transactions")),
):
    """
    Flag a transaction as suspicious/mismatched. 
    Auto-creates a Support Ticket.
    """
    transaction = transaction_crud.get(db, id=transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if transaction.status == "Verified":
        # Allowing flagging verified transactions is useful for post-audit corrections
        pass 

    transaction.status = "Flagged"
    # Append flag reason to notes
    transaction.notes = (transaction.notes or "") + f" | [Flagged]: {flag_in.reason}"
    
    db.add(transaction)
    
    # Auto-create Support Ticket
    # We need to fetch the request to get the user_id
    request = db.query(models.ServiceRequest).filter(models.ServiceRequest.id == transaction.service_request_id).first()
    
    ticket_in = SupportTicketCreate(
        subject=f"Urgent: Flagged Transaction #{transaction.transaction_id}",
        priority="High",
        initial_message=f"Transaction was flagged by {current_user.full_name}. Reason: {flag_in.reason}. \n\nTransaction Details: Amount: {transaction.amount}, Method: {transaction.payment_method}, Client Ref: {transaction.client_reference_id}",
        service_request_id=transaction.service_request_id
    )
    
    ticket = ticket_crud.create_with_user(db, obj_in=ticket_in, user_id=request.user_id)

    db.commit()
    db.refresh(transaction)
    
    await event_broadcaster.broadcast({
        "event": "transaction_updated",
        "data": {
            "id": transaction.id,
            "service_request_id": transaction.service_request_id,
            "status": transaction.status,
        }
    })
    
    # NEW: Dynamic Notification for Client
    await notification_manager.create_notification(
        db,
        user_id=request.user_id,
        title="Transaction Flagged",
        title_bn="লেনদেনটি ফ্ল্যাগ করা হয়েছে",
        message=f"A transaction for your request #{transaction.service_request_id} has been flagged for review. A support ticket has been opened.",
        message_bn=f"আপনার অনুরোধ #{transaction.service_request_id} এর একটি লেনদেন পর্যালোচনার জন্য ফ্ল্যাগ করা হয়েছে। বিস্তারিত জানতে একটি সাপোর্ট টিকিট খোলা হয়েছে।",
        link=f"/support/{ticket.id}",
        notification_type="transaction_flagged"
    )
    
    return transaction

@router.get("/{transaction_id}/receipt", response_class=StreamingResponse)
def get_transaction_receipt(
    *,
    db: Session = Depends(dependencies.get_db),
    transaction_id: int,
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    """
    Generate and stream a PDF receipt for a transaction.
    """
    # Eagerly load dependencies for PDF generation
    transaction = db.query(models.Transaction).options(
        joinedload(models.Transaction.service_request).joinedload(models.ServiceRequest.service_definition),
        joinedload(models.Transaction.service_request).joinedload(models.ServiceRequest.variant),
        joinedload(models.Transaction.user)
    ).filter(models.Transaction.id == transaction_id).first()

    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    # Permission check: User must be admin or owner of the request
    is_admin = any(role.name == "Admin" for role in current_user.roles) or current_user.is_superuser
    if not is_admin and transaction.service_request.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    pdf_buffer = generate_receipt_pdf(transaction)
    
    safe_name = "".join([c for c in (transaction.user.full_name or "Client") if c.isalnum() or c in (' ', '_')]).strip().replace(' ', '_')
    filename = f"Receipt_{transaction.transaction_id}_{safe_name}.pdf"
    
    headers = {
        'Content-Disposition': f'attachment; filename="{filename}"'
    }
    return StreamingResponse(pdf_buffer, headers=headers, media_type="application/pdf")
