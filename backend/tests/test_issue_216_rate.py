import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app import models, schemas
from app.core import security

def test_currency_rate_persistence(client: TestClient, admin_token_headers: dict, db: Session):
    print("\n[TEST] Verifying Currency Rate Persistence (Issue #216)...")
    
    # 1. Setup Service & Request
    service_def = db.query(models.ServiceDefinition).first()
    if not service_def:
        service_def = models.ServiceDefinition(
            name="Test Service 216",
            slug="test-service-216",
            base_price=100.0,
            category="Test",
            form_schema={}
        )
        db.add(service_def)
        db.commit()
    
    user = db.query(models.User).filter(models.User.email == "admin@test.com").first()
    
    request = models.ServiceRequest(
        user_id=user.id,
        service_def_id=service_def.id,
        status="Approved",
        selling_price=100.0,
        form_data={}
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    
    # 2. Create BDT Transaction with Rate 30.0
    print("  Creating BDT Transaction with Rate 30.0...")
    txn_data = {
        "service_request_id": request.id,
        "amount": 3000.0, # 3000 BDT
        "claimed_currency": "BDT",
        "exchange_rate": 30.0,
        "payment_method": "Bank Transfer",
        "client_reference_id": "REF-BDT-001",
        "notes": "Test Rate Persistence"
    }
    
    response = client.post("/api/v1/transactions/", json=txn_data, headers=admin_token_headers)
    assert response.status_code == 200, f"Response: {response.text}"
    data = response.json()
    
    print(f"  Response Data: Rate={data.get('exchange_rate')}, Currency={data.get('claimed_currency')}")
    
    assert data["exchange_rate"] == 30.0, f"Expected 30.0, got {data['exchange_rate']}"
    assert data["claimed_currency"] == "BDT"

    # 3. Create SAR Transaction - Should default/force to 1.0
    # Increase selling price first to allow second payment
    request.selling_price = 500.0
    db.add(request)
    db.commit()

    print("  Creating SAR Transaction...")
    txn_sar_data = {
        "service_request_id": request.id,
        "amount": 100.0,
        "claimed_currency": "SAR",
        "exchange_rate": 1.0, # Even if we sent 5.0, it should be forced to 1.0 by logic? Or validated?
        "payment_method": "Cash",
        "notes": "Test SAR"
    }
    
    res_sar = client.post("/api/v1/transactions/", json=txn_sar_data, headers=admin_token_headers)
    assert res_sar.status_code == 200
    data_sar = res_sar.json()
    
    print(f"  SAR Response Data: Rate={data_sar.get('exchange_rate')}, Currency={data_sar.get('claimed_currency')}")
    
    assert data_sar["exchange_rate"] == 1.0
    assert data_sar["claimed_currency"] == "SAR"