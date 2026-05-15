from typing import Any, List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app import schemas, models
from app.api import dependencies
from app.crud.vendor import vendor as vendor_crud, vendor_transaction as vendor_transaction_crud
from app.schemas.vendor import VendorTransactionListResponse
from app.core.finance import finance_service

router = APIRouter()

@router.get("", response_model=schemas.ListResponse[schemas.Vendor])
@router.get("/", response_model=schemas.ListResponse[schemas.Vendor])
def read_vendors(
    db: Session = Depends(dependencies.get_db),
    skip: int = 0,
    limit: int = 100,
    service_id: Optional[int] = None,
    category: Optional[str] = None,
    current_user: models.User = Depends(dependencies.require_any_permission([
        "finance.view_ledger", 
        "requests.process_technical", 
        "services.manage_catalog"
    ])),
) -> Any:
    """
    Retrieve vendors. Supports filtering by service_id or category.
    """
    query = db.query(models.Vendor)
    
    if service_id:
        from app.models.service import service_vendors
        query = query.join(service_vendors).filter(service_vendors.c.service_id == service_id)
    elif category:
        from app.models.service import ServiceDefinition, service_vendors
        query = query.join(service_vendors).join(ServiceDefinition).filter(ServiceDefinition.category == category)
        # Prevent duplicates if a vendor is in multiple services of same category
        query = query.distinct()

    total = query.count()
    items = query.offset(skip).limit(limit).all()
    
    return {
        "items": items,
        "total": total
    }

@router.post("/", response_model=schemas.Vendor)
def create_vendor(
    *,
    db: Session = Depends(dependencies.get_db),
    vendor_in: schemas.VendorCreate,
    current_user: models.User = Depends(dependencies.require_permission("finance.manage_transactions")),
) -> Any:
    """
    Create new vendor.
    """
    vendor = vendor_crud.create_with_owner(db, obj_in=vendor_in)
    return vendor

@router.get("/transactions", response_model=VendorTransactionListResponse)
def read_all_vendor_transactions(
    db: Session = Depends(dependencies.get_db),
    skip: int = 0,
    limit: int = 100,
    q: Optional[str] = None,
    vendor_id: Optional[int] = None,
    vendor_type: Optional[str] = None,
    transaction_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: models.User = Depends(dependencies.require_permission("finance.view_ledger")),
) -> Any:
    """
    Get all vendor transactions (History) with centralized financial summary.
    Supports filtering by vendor type and search query.
    """
    items, total = vendor_transaction_crud.get_multi_with_count(
        db, 
        skip=skip, 
        limit=limit,
        search_query=q,
        vendor_id=vendor_id,
        vendor_type=vendor_type,
        transaction_type=transaction_type,
        start_date=start_date,
        end_date=end_date
    )
    
    # Calculate filtered summary for accuracy
    summary = vendor_transaction_crud.get_filtered_summary(
        db,
        search_query=q,
        vendor_id=vendor_id,
        vendor_type=vendor_type,
        transaction_type=transaction_type,
        start_date=start_date,
        end_date=end_date
    )
    
    return {
        "items": items,
        "total": total,
        "summary": summary
    }

@router.get("/{id}", response_model=schemas.VendorWithHistory)
def read_vendor(
    *,
    db: Session = Depends(dependencies.get_db),
    id: int,
    current_user: models.User = Depends(dependencies.require_permission("finance.view_ledger")),
) -> Any:
    """
    Get vendor by ID with transaction history.
    """
    vendor = vendor_crud.get(db, id=id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor

@router.post("/{id}/pay", response_model=schemas.VendorTransaction)
def pay_vendor(
    *,
    db: Session = Depends(dependencies.get_db),
    id: int,
    payment_in: schemas.VendorPaymentRequest, 
    current_user: models.User = Depends(dependencies.require_permission("finance.manage_transactions")),
) -> Any:
    """
    Record a payment to a vendor.
    """
    vendor = vendor_crud.get(db, id=id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    transaction_in = schemas.VendorTransactionCreate(
        vendor_id=id,
        amount=payment_in.amount,
        transaction_type="PAYMENT",
        reference_id=payment_in.reference_id,
        currency=payment_in.currency,
        exchange_rate=payment_in.exchange_rate,
        proof_url=payment_in.proof_url,
        notes=payment_in.notes
    )
    
    transaction = vendor_crud.record_transaction(db, obj_in=transaction_in, user_id=current_user.id)
    return transaction

@router.put("/{id}", response_model=schemas.Vendor)
def update_vendor(
    *,
    db: Session = Depends(dependencies.get_db),
    id: int,
    vendor_in: schemas.VendorUpdate,
    current_user: models.User = Depends(dependencies.require_permission("finance.manage_transactions")),
) -> Any:
    """
    Update vendor details.
    """
    vendor = vendor_crud.get(db, id=id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    vendor = vendor_crud.update(db, db_obj=vendor, obj_in=vendor_in)
    return vendor

@router.delete("/{id}", response_model=schemas.Vendor)
def delete_vendor(
    *,
    db: Session = Depends(dependencies.get_db),
    id: int,
    current_user: models.User = Depends(dependencies.get_current_active_superuser),
) -> Any:
    """
    Delete a vendor. Restricted to superusers.
    """
    vendor = vendor_crud.get(db, id=id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Check if vendor has transactions before allowing delete? 
    # Or rely on cascade/integrity if not soft-deleting.
    # For now, standard CRUD remove.
    return vendor_crud.remove(db, id=id)