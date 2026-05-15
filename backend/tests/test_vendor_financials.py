import pytest
from sqlalchemy.orm import Session
from app import models, schemas
from app.crud.vendor import vendor as vendor_crud

def test_vendor_payment_with_currency_conversion(db: Session):
    # Setup User
    from app.models.user import User
    from app.core.security import get_password_hash
    user = db.query(User).filter(User.email == "vendor_test@example.com").first()
    if not user:
        user = User(
            email="vendor_test@example.com",
            hashed_password=get_password_hash("password"),
            full_name="Vendor Tester",
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Setup Vendor
    vendor = vendor_crud.create_with_owner(db, obj_in=schemas.VendorCreate(
        name="Currency Test Vendor",
        type="EXTERNAL"
    ))
    
    # 1. Add Debt (Purchase) in SAR
    vendor_crud.record_transaction(db, obj_in=schemas.VendorTransactionCreate(
        vendor_id=vendor.id,
        amount=1000.0,
        transaction_type="PURCHASE",
        notes="Initial Debt"
    ), user_id=user.id)
    
    db.refresh(vendor)
    assert vendor.current_balance == 1000.0

    # 2. Record Payment in BDT
    # Pay 3000 BDT with rate 30 BDT/SAR => Should deduct 100 SAR
    payment_in = schemas.VendorTransactionCreate(
        vendor_id=vendor.id,
        amount=3000.0, # Entered amount
        transaction_type="PAYMENT",
        reference_id="BANK-123",
        currency="BDT",
        exchange_rate=30.0,
        notes="Paying in BDT"
    )
    
    txn = vendor_crud.record_transaction(db, obj_in=payment_in, user_id=user.id)
    
    db.refresh(vendor)
    
    # Assertions
    assert txn.amount == 100.0 # Converted to SAR
    assert txn.claimed_amount == 3000.0 # Original BDT
    assert txn.currency == "BDT"
    assert txn.exchange_rate == 30.0
    assert txn.reference_id == "BANK-123"
    
    # 1000 SAR - 100 SAR = 900 SAR
    assert vendor.current_balance == 900.0
