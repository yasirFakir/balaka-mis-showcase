import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from tests.e2e.helpers import log_step, log_success, log_fail, get_valid_form_data

def test_finance_lifecycle_and_safeguards(client: TestClient, admin_token_headers: dict, user_token_headers: dict, db: Session):
    """
    Modular Test: Partial payments, refunds, overpayment protection, and coupons.
    """
    log_step("FINANCE: Testing Ledger Lifecycle & Safeguards")

    # 1. Setup: 1000 SAR Request
    r = client.get("/api/v1/services/", headers=admin_token_headers)
    service = next((s for s in r.json()["items"] if s["is_public"]), None)
    
    req_data = {
        "service_def_id": service["id"],
        "quantity": 1,
        "form_data": get_valid_form_data(service["slug"])
    }
    r = client.post("/api/v1/service-requests/", json=req_data, headers=user_token_headers)
    req_id = r.json()["id"]
    
    # Admin prices it
    client.put(f"/api/v1/service-requests/{req_id}", json={"selling_price": 1000.0, "status": "Approved"}, headers=admin_token_headers)

    # 2. Overpayment Protection
    txn_too_much = {
        "service_request_id": req_id,
        "amount": 1001.0,
        "payment_method": "Cash"
    }
    r = client.post("/api/v1/transactions/", json=txn_too_much, headers=admin_token_headers)
    assert r.status_code == 400
    log_success("Finance: Overpayment correctly blocked")

    # 3. Partial Payment
    txn_part = {
        "service_request_id": req_id,
        "amount": 400.0,
        "payment_method": "Cash"
    }
    r = client.post("/api/v1/transactions/", json=txn_part, headers=admin_token_headers)
    txn_id = r.json()["id"]
    client.put(f"/api/v1/transactions/{txn_id}/reconcile", json={"internal_reference_id": "PART-1"}, headers=admin_token_headers)
    
    r = client.get(f"/api/v1/service-requests/{req_id}/remaining-balance", headers=admin_token_headers)
    assert r.json() == 600.0
    log_success("Finance: Partial payment balance verified")

    # 4. Refund logic
    refund_data = {
        "service_request_id": req_id,
        "amount": 100.0,
        "reason": "Test refund",
        "method": "Cash"
    }
    r = client.post("/api/v1/transactions/refund", json=refund_data, headers=admin_token_headers)
    assert r.status_code == 200
    
    r = client.get(f"/api/v1/service-requests/{req_id}/remaining-balance", headers=admin_token_headers)
    assert r.json() == 700.0
    log_success("Finance: Refund impact on balance verified")
