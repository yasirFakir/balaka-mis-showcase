import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import datetime
from app import models

def get_valid_form_data(svc_slug: str, suffix: str = ""):
    """Returns valid form data based on seed_services schema."""
    base = {
        "full_name": f"Test User {suffix}",
        "contact_number": "+8801711223344",
        "location": "Riyadh, Saudi Arabia"
    }
    
    if "ticket" in svc_slug:
        base.update({
            "pnr_number": f"PNR123456{suffix}",
            "passport_number": f"A00112233{suffix}",
            "departure_city": "Jeddah",
            "arrival_city": "Dhaka",
            "travel_date": "2026-05-20",
            "adult_count": 1,
            "passport_copy": "/api/v1/files/secure/passport.jpg"
        })
    
    return base

def test_refined_duplicate_prevention(client: TestClient, admin_token_headers: dict, user_token_headers: dict, db: Session):
    # 1. Setup - Get a service
    r = client.get("/api/v1/services/", headers=admin_token_headers)
    services = r.json()["items"]
    svc = next((s for s in services if s["slug"] == "air-ticket"), None)
    if not svc:
        pytest.skip("Air Ticket service not found")
    
    # 2. First Request (Data A)
    data_a = get_valid_form_data(svc["slug"], "A")
    req_data_a = {
        "service_def_id": svc["id"],
        "quantity": 1,
        "form_data": data_a
    }
    
    print("\nCreating first request (Data A)...")
    r = client.post("/api/v1/service-requests/", json=req_data_a, headers=user_token_headers)
    assert r.status_code == 200
    req_id_a = r.json()["id"]
    
    # 3. Identical Request (Data A again) - Should block
    print("Attempting identical request (Data A)...")
    r = client.post("/api/v1/service-requests/", json=req_data_a, headers=user_token_headers)
    assert r.status_code == 400
    assert "identical information" in r.json()["detail"]
    print("Identical request correctly blocked.")
    
    # 4. Different Request (Data B) - Should allow
    data_b = get_valid_form_data(svc["slug"], "B")
    req_data_b = {
        "service_def_id": svc["id"],
        "quantity": 1,
        "form_data": data_b
    }
    
    print("Attempting different request (Data B)...")
    r = client.post("/api/v1/service-requests/", json=req_data_b, headers=user_token_headers)
    assert r.status_code == 200
    req_id_b = r.json()["id"]
    print(f"Different request allowed (ID: {req_id_b})")
    
    # 5. Different Variant (Data A, but different variant) - Should allow
    # Create a variant for this service first if it doesn't have one
    variant = models.ServiceVariant(
        service_def_id=svc["id"],
        name_en="Express",
        default_price=2000.0,
        default_cost=1500.0
    )
    db.add(variant)
    db.commit()
    db.refresh(variant)
    
    req_data_a_express = {
        "service_def_id": svc["id"],
        "quantity": 1,
        "form_data": data_a,
        "variant_id": variant.id
    }
    
    print("Attempting identical data but different variant...")
    r = client.post("/api/v1/service-requests/", json=req_data_a_express, headers=user_token_headers)
    assert r.status_code == 200
    req_id_a_express = r.json()["id"]
    print(f"Different variant allowed (ID: {req_id_a_express})")

    # 6. Complete Request A and try again - Should allow
    print("Completing request A...")
    # Set price and pay to allow completion
    client.put(f"/api/v1/service-requests/{req_id_a}", json={"selling_price": 100.0, "status": "Approved"}, headers=admin_token_headers)
    client.post("/api/v1/transactions/", json={"service_request_id": req_id_a, "amount": 100.0, "payment_method": "Cash"}, headers=admin_token_headers)
    
    # Verify/Reconcile the transaction so it's fully paid
    txns = db.query(models.Transaction).filter(models.Transaction.service_request_id == req_id_a).all()
    for t in txns:
        client.put(f"/api/v1/transactions/{t.id}/reconcile", json={"internal_reference_id": "TEST-DUP"}, headers=admin_token_headers)

    r = client.put(f"/api/v1/service-requests/{req_id_a}", json={"status": "Completed"}, headers=admin_token_headers)
    assert r.status_code == 200
    
    print("Attempting request A again after completion...")
    r = client.post("/api/v1/service-requests/", json=req_data_a, headers=user_token_headers)
    assert r.status_code == 200
    print(f"Request A allowed after completion (ID: {r.json()['id']})")
