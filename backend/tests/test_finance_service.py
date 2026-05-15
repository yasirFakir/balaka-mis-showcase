import pytest
from sqlalchemy.orm import Session
from app import models, schemas
from app.core.finance import finance_service
from app.crud.service import service as service_crud
from app.crud.service_request import service_request as service_request_crud
from app.crud.transaction import transaction as transaction_crud
from datetime import datetime

def test_finance_summary_stats(db: Session):
    # Setup
    from app.models.user import User
    from app.core.security import get_password_hash
    
    # Create User
    user = db.query(User).filter(User.email == "finance_test@example.com").first()
    if not user:
        user = User(
            email="finance_test@example.com",
            hashed_password=get_password_hash("password"),
            full_name="Finance Tester",
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Create Service
    service = service_crud.create(db, obj_in=schemas.ServiceDefinitionCreate(
        name="Finance Test Service",
        slug="finance-test-service",
        base_price=1000
    ))

    # 1. Create Active Request (Approved)
    # Selling: 1000, Cost: 400, Profit: 600
    req1 = service_request_crud.create_with_user(
        db, 
        obj_in=schemas.ServiceRequestCreate(
            service_def_id=service.id,
            form_data={},
            quantity=1
        ), 
        user_id=user.id,
        selling_price=1000,
        cost_price=400,
        variant_id=None,
        vendor_id=None,
        quantity=1
    )
    req1.profit = 600
    req1.status = "Payment Verified"
    db.add(req1)
    db.commit()
    # 2. Create Active Request (In Transit) - To test new status inclusion
    # Selling: 500, Cost: 100, Profit: 400
    req2 = service_request_crud.create_with_user(
        db, 
        obj_in=schemas.ServiceRequestCreate(
            service_def_id=service.id,
            form_data={},
            quantity=1
        ), 
        user_id=user.id,
        selling_price=500,
        cost_price=100,
        variant_id=None,
        vendor_id=None,
        quantity=1
    )
    req2.profit = 400
    req2.status = "In Transit"
    db.add(req2)
    db.commit()

    # 3. Create Partial Payment (Verified) for Req1
    # Cash In: 800
    txn = transaction_crud.create_with_user(
        db, 
        obj_in=schemas.TransactionCreate(
            service_request_id=req1.id,
            amount=800,
            payment_method="CASH",
            claimed_currency="SAR",
            status="Verified"
        ),
        user_id=user.id,
        service=req1
    )
    # create_with_user defaults to "Pending"
    txn.status = "Verified"
    db.add(txn)
    db.commit()
    
    # 4. Run Stats
    stats = finance_service.get_summary_stats(db)
    
    # Expected Values:
    # Total Revenue (Cash) = 800 (from txn)
    # Total Cost (Accrual) = 400 (req1) + 100 (req2) = 500
    # Net Yield (Accrual Profit) = 600 (req1) + 400 (req2) = 1000
    # (Old Logic would have been: 800 - 500 = 300)
    
    
    assert stats["total_revenue"] == 800.0
    assert stats["total_cost"] == 500.0
    assert stats["net_yield"] == 1000.0
