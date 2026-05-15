import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app import models
from tests.e2e.helpers import log_step, log_success, log_info, get_valid_form_data

def test_multi_currency_and_bound_rates(client: TestClient, admin_token_headers: dict, user_token_headers: dict, db: Session):
    """
    Modular Test: Verifies that Admin manually sets exchange rate and it binds to transactions.
    Matches clarified business logic: Admin sets the rate during pricing.
    """
    log_step("CURRENCY: Testing Bound Conversion Rates (Admin Manual Entry)")

    # 1. Setup: User creates a Request
    r = client.get("/api/v1/services/", headers=user_token_headers)
    service = next((s for s in r.json()["items"] if s["is_public"]), None)
    
    req_data = {
        "service_def_id": service["id"],
        "quantity": 1,
        "form_data": get_valid_form_data(service["slug"])
    }
    r = client.post("/api/v1/service-requests/", json=req_data, headers=user_token_headers)
    assert r.status_code == 200
    req = r.json()
    req_id = req["id"]
    log_info(f"Initial Request Created (ID: {req_id})")

    # 2. Admin sets the Price and manually inputs the Exchange Rate (e.g., 30.0)
    # This is the "Exclusive" bound rate for this request.
    log_info("Admin setting manual rate: 30.0 BDT/SAR")
    update_data = {
        "selling_price": 1000.0, # 1000 SAR
        "exchange_rate": 30.0,
        "status": "Approved"
    }
    r = client.put(f"/api/v1/service-requests/{req_id}", json=update_data, headers=admin_token_headers)
    assert r.status_code == 200
    updated_req = r.json()
    assert updated_req["exchange_rate"] == 30.0
    log_success(f"Request #{req_id} now bound to rate 30.0")

    # 3. Perform a BDT payment for this request
    # Since the request is bound to 30.0, 3000 BDT should exactly cover 100 SAR.
    # The transaction endpoint logic in transactions.py (line 68 approx) uses request.exchange_rate.
    txn_data = {
        "service_request_id": req_id,
        "amount": 3000.0,
        "claimed_currency": "BDT",
        "payment_method": "Cash",
        "notes": "Payment at bound rate"
    }
    r = client.post("/api/v1/transactions/", json=txn_data, headers=admin_token_headers)
    assert r.status_code == 200
    txn = r.json()
    
    log_info(f"Transaction converted 3000 BDT to {txn['amount']} SAR using bound rate")
    assert txn["amount"] == 100.0
    assert txn["exchange_rate"] == 30.0
    log_success("Bound conversion verified successfully")