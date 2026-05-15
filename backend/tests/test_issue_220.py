import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app import models, schemas
from datetime import datetime, timezone

def test_bdt_payment_preservation_and_reconciliation(client: TestClient, admin_token_headers: dict, db: Session):
    """
    Test for Issue #220: BDT Payment Amount Reduced on Verification.
    Verifies that BDT amounts are correctly converted and preserved through reconciliation.
    """
    print("\n[TEST] Verifying BDT Payment Preservation (Issue #220)...")
    
    # 1. Setup: Create a Service Request
    service_def = db.query(models.ServiceDefinition).first()
    if not service_def:
        service_def = models.ServiceDefinition(
            name="Test Service #220",
            slug="test-service-220",
            base_price=100.0,
            category="Test",
            form_schema={"sections": []}
        )
        db.add(service_def)
        db.commit()
        db.refresh(service_def)

    user = db.query(models.User).filter(models.User.email == "admin@test.com").first()
    if not user:
        user = db.query(models.User).first()

    request = models.ServiceRequest(
        user_id=user.id,
        service_def_id=service_def.id,
        status="Approved",
        selling_price=1000.0,
        exchange_rate=32.62,
        currency="BDT",
        form_data={}
    )
    db.add(request)
    db.commit()
    db.refresh(request)

    # 2. Simulate Frontend Correct Submission (199.31 BDT)
    # 199.31 BDT / 32.62 = 6.11 SAR
    print("  Creating 199.31 BDT Transaction...")
    txn_in = {
        "service_request_id": request.id,
        "amount": 199.31,
        "claimed_currency": "BDT",
        "exchange_rate": 32.62,
        "payment_method": "Bank Transfer",
        "client_reference_id": "BANK-220",
        "notes": "Original BDT Payment"
    }
    response = client.post("/api/v1/transactions/", json=txn_in, headers=admin_token_headers)
    assert response.status_code == 200
    txn = response.json()
    
    assert txn["claimed_amount"] == 199.31
    assert round(txn["amount"], 2) == 6.11 
    print(f"  Initial transaction: {round(txn['amount'], 2)} SAR (from {txn['claimed_amount']} {txn['claimed_currency']})")

    # 3. Verify Reconciliation WITHOUT Overrides (Amount should NOT change)
    print("  Reconciling without overrides...")
    reconcile_in = {
        "internal_reference_id": "BANK-220"
    }
    res_recon = client.put(f"/api/v1/transactions/{txn['id']}/reconcile", json=reconcile_in, headers=admin_token_headers)
    assert res_recon.status_code == 200
    txn_recon = res_recon.json()
    assert round(txn_recon["amount"], 2) == 6.11
    print(f"  After reconciliation: {round(txn_recon['amount'], 2)} SAR (No change - OK)")

    # 4. Simulate a "BAD" record (Issue #220 root cause)
    print("  Creating a second 'bad' record (claimed_amount = SAR value)...")
    # We create it via DB directly to simulate the bug that happened in the past
    bad_txn = models.Transaction(
        transaction_id="TXN-BAD-220",
        service_request_id=request.id,
        user_id=user.id,
        amount=6.11,
        claimed_amount=6.11, # THE BUG: SAR value stored in claimed_amount
        claimed_currency="BDT",
        exchange_rate=32.62,
        payment_method="Cash",
        status="Pending",
        transaction_type="Payment",
        base_price=6.11,
        discount=0,
        created_by_id=user.id
    )
    db.add(bad_txn)
    db.commit()
    db.refresh(bad_txn)
    
    # 5. Reconcile the "BAD" record WITHOUT Overrides
    # With my fix (is_suspicious check), the system should detect that claimed_amount (6.11)
    # is the SAR value and should NOT reduce the amount further.
    # Actually, it should RESTORE the claimed_amount to 199.31.
    print("  Reconciling 'bad' record without overrides (System Auto-Fix)...")
    res_recon_bad = client.put(f"/api/v1/transactions/{bad_txn.id}/reconcile", json={"internal_reference_id": "BAD-FIX"}, headers=admin_token_headers)
    assert res_recon_bad.status_code == 200
    txn_recon_bad = res_recon_bad.json()
    
    print(f"  Bad record after reconciliation: {round(txn_recon_bad['amount'], 2)} SAR")
    # VERIFY IT DID NOT DROP TO 0.18
    assert round(txn_recon_bad["amount"], 2) == 6.11 
    # VERIFY claimed_amount was RESTORED
    assert round(txn_recon_bad["claimed_amount"], 2) == 199.31
    
    # 6. Verify that Reconciliation WITH Overrides STILL WORKS
    print("  Reconciling with EXPLICIT override (326.2 BDT)...")
    # Create another pending one
    ovr_txn = models.Transaction(
        transaction_id="TXN-OVR-220",
        service_request_id=request.id,
        user_id=user.id,
        amount=6.11,
        claimed_amount=199.31,
        claimed_currency="BDT",
        exchange_rate=32.62,
        payment_method="Cash",
        status="Pending",
        transaction_type="Payment",
        base_price=6.11,
        discount=0,
        created_by_id=user.id
    )
    db.add(ovr_txn)
    db.commit()
    db.refresh(ovr_txn)

    reconcile_override = {
        "internal_reference_id": "BANK-220-OVR",
        "amount": 326.2, # Override to 10 SAR
        "claimed_currency": "BDT",
        "exchange_rate": 32.62
    }
    res_ovr = client.put(f"/api/v1/transactions/{ovr_txn.id}/reconcile", json=reconcile_override, headers=admin_token_headers)
    assert res_ovr.status_code == 200
    txn_ovr = res_ovr.json()
    
    assert txn_ovr["claimed_amount"] == 326.2
    assert round(txn_ovr["amount"], 2) == 10.0
    print(f"  Override result: {round(txn_ovr['amount'], 2)} SAR (Correctly recalculated)")

    print("  ✅ Issue #220 Regression Test Passed.")
