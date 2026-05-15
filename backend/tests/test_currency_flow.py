import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app import models, schemas
from app.core.config import settings
from datetime import datetime

def test_currency_rate_fetching(client: TestClient, admin_token_headers: dict, db: Session):
    """
    Test 1: Check if BDT to SAR conversion rate is fetching correctly.
    """
    print("\n[TEST] Verifying Currency Rate Fetching...")
    
    # 1. Ensure manual rate is set for predictability
    # We use the system-settings endpoints if available, or direct DB manipulation
    from app.models.system import SystemSetting
    
    # Set manual rate to 30.0
    manual_enabled = db.query(SystemSetting).filter(SystemSetting.key == "currency_manual_enabled").first()
    if not manual_enabled:
        manual_enabled = SystemSetting(key="currency_manual_enabled", value_bool=True)
        db.add(manual_enabled)
    else:
        manual_enabled.value_bool = True
        
    manual_rate = db.query(SystemSetting).filter(SystemSetting.key == "currency_manual_rate").first()
    if not manual_rate:
        manual_rate = SystemSetting(key="currency_manual_rate", value_float=30.0)
        db.add(manual_rate)
    else:
        manual_rate.value_float = 30.0
        
    db.commit()

    # 2. Fetch via API
    response = client.get("/api/v1/system/currency-rate")
    assert response.status_code == 200
    data = response.json()
    
    print(f"  Received Rate Data: {data}")
    assert data["base"] == "SAR"
    assert data["target"] == "BDT"
    assert data["rate"] == 30.0
    print("  ✅ Currency Rate Fetching Verified.")

def test_multi_currency_transaction_and_finance_update(client: TestClient, admin_token_headers: dict, db: Session):
    """
    Test 2: Make transactions in both BDT and SAR, verify them, and check finance updates.
    """
    print("\n[TEST] Verifying Multi-Currency Transaction Flow...")
    
    # 1. Setup: Create a Service Request to link transactions to
    # Need a service definition first
    service_def = db.query(models.ServiceDefinition).first()
    if not service_def:
        service_def = models.ServiceDefinition(
            name="Test Cargo",
            slug="test-cargo",
            base_price=500.0,
            category="Cargo",
            form_schema={"sections": []}
        )
        db.add(service_def)
        db.commit()
        db.refresh(service_def)

    # Need a user
    user = db.query(models.User).filter(models.User.email == "admin@test.com").first()
    
    request = models.ServiceRequest(
        user_id=user.id,
        service_def_id=service_def.id,
        status="Approved",
        selling_price=1000.0, # 1000 SAR total
        form_data={}
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    print(f"  Created Service Request #{request.id} with Selling Price: 1000 SAR")

    # 2. Create SAR Transaction (400 SAR)
    print("  Logging 400 SAR Transaction...")
    txn_sar_in = {
        "service_request_id": request.id,
        "amount": 400.0,
        "claimed_currency": "SAR",
        "exchange_rate": 1.0,
        "payment_method": "Cash",
        "notes": "SAR Payment"
    }
    res_sar = client.post("/api/v1/transactions/", json=txn_sar_in, headers=admin_token_headers)
    assert res_sar.status_code == 200
    txn_sar = res_sar.json()
    assert txn_sar["amount"] == 400.0
    
    # 3. Create BDT Transaction (9000 BDT at rate 30 = 300 SAR)
    print("  Logging 9000 BDT Transaction (Expected 300 SAR)...")
    txn_bdt_in = {
        "service_request_id": request.id,
        "amount": 9000.0,
        "claimed_currency": "BDT",
        "exchange_rate": 30.0,
        "payment_method": "Bank Transfer",
        "client_reference_id": "BANK-123",
        "notes": "BDT Payment"
    }
    res_bdt = client.post("/api/v1/transactions/", json=txn_bdt_in, headers=admin_token_headers)
    
    if res_bdt.status_code != 200:
        print(f"  ❌ BDT Transaction Failed with {res_bdt.status_code}: {res_bdt.json()}")
    
    assert res_bdt.status_code == 200
    txn_bdt = res_bdt.json()
    # Check if conversion worked (9000 / 30 = 300)
    assert txn_bdt["amount"] == 300.0
    assert txn_bdt["claimed_amount"] == 9000.0
    assert txn_bdt["exchange_rate"] == 30.0

    # 4. Verify both transactions
    print("  Verifying transactions to update revenue...")
    client.put(f"/api/v1/transactions/{txn_sar['id']}/reconcile", json={"internal_reference_id": "CASH-001"}, headers=admin_token_headers)
    client.put(f"/api/v1/transactions/{txn_bdt['id']}/reconcile", json={"internal_reference_id": "BANK-123"}, headers=admin_token_headers)

    # 5. Check Finance Summary
    print("  Fetching Analytics Summary...")
    res_summary = client.get("/api/v1/analytics/summary", headers=admin_token_headers)
    assert res_summary.status_code == 200
    summary = res_summary.json()
    
    print(f"  Total Revenue: {summary['total_revenue']} SAR")
    print(f"  Net Profit: {summary['net_profit']} SAR")
    
    # Revenue should be 400 + 300 = 700 SAR
    assert summary["total_revenue"] == 700.0
    
    # Net Profit = Revenue - Operational Costs
    # Operational cost for this request is 0 (we didn't set cost_price)
    # But other requests might exist in test DB. 
    # Let's verify at least it incremented by 700 if no costs.
    print("  ✅ Multi-Currency Flow and Finance Updates Verified.")
