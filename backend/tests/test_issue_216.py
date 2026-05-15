import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app import models
import re

def test_transaction_id_format(client: TestClient, admin_token_headers: dict, db: Session):
    print("\n[TEST] Verifying Transaction ID Format (Issue #216)...")
    
    # Setup Service Definition & Request
    service_def = db.query(models.ServiceDefinition).first()
    if not service_def:
        service_def = models.ServiceDefinition(
            name="Test Service",
            slug="test-service",
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
    
    # Create Transaction
    txn_data = {
        "service_request_id": request.id,
        "amount": 100.0,
        "claimed_currency": "SAR",
        "exchange_rate": 1.0,
        "payment_method": "Cash",
        "notes": "Test ID Format"
    }
    
    response = client.post("/api/v1/transactions/", json=txn_data, headers=admin_token_headers)
    assert response.status_code == 200
    data = response.json()
    
    txn_id = data["transaction_id"]
    print(f"  Generated Transaction ID: {txn_id}")
    
    # Verify Format: TXN-{SERIAL}-{HEX}
    # Serial should be 6 digits (db id)
    # Hex should be 4 chars
    
    # Regex: ^TXN-\d{6}-[0-9A-F]{4}$
    match = re.match(r"^TXN-\d{6}-[0-9A-F]{4}$", txn_id)
    
    assert match is not None, f"Transaction ID '{txn_id}' does not match expected format 'TXN-000000-XXXX'"
    
    # Verify the serial matches the ID (if we can infer it, but the response usually contains ID)
    db_id = data["id"]
    expected_serial = f"{db_id:06d}"
    assert expected_serial in txn_id, f"Transaction ID '{txn_id}' does not contain serial '{expected_serial}'"
    
    print("  ✅ Transaction ID Format Verified.")
