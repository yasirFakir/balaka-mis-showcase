import pytest
import time
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app import models
from tests.e2e.helpers import log_step, log_success, log_fail, get_valid_form_data

def test_user_management_and_rbac(client: TestClient, admin_token_headers: dict, db: Session):
    """
    Modular Test: Covers staff creation and permission isolation.
    """
    log_step("USER: Testing Staff Creation & RBAC")
    
    # 1. Fetch dependencies
    r = client.get("/api/v1/services/", headers=admin_token_headers)
    services = r.json()["items"]
    cargo_svc = next((s for s in services if "cargo" in s["slug"]), None)
    ticket_svc = next((s for s in services if "ticket" in s["slug"]), None)
    
    r = client.get("/api/v1/roles/", headers=admin_token_headers)
    roles = r.json()["items"]
    manager_role = next((r for r in roles if r["name"] == "Manager"), None)

    # 2. Create Staff
    unique_email = f"cargo_agent_{int(time.time())}@balaka.com"
    staff_data = {
        "email": unique_email,
        "password": "password123",
        "full_name": "New Cargo Agent",
        "allowed_service_ids": [cargo_svc["id"]] if cargo_svc else [],
        "role_ids": [manager_role["id"]] if manager_role else []
    }
    r = client.post("/api/v1/users/staff", json=staff_data, headers=admin_token_headers)
    assert r.status_code == 200
    staff_user = r.json()
    log_success(f"Staff created: {staff_user['email']}")

    # Activate via DB and set password (since API generates random one)
    from app.core.security import get_password_hash
    db_user = db.query(models.User).filter(models.User.email == staff_data["email"]).first()
    db_user.is_verified = True
    db_user.is_active = True
    db_user.hashed_password = get_password_hash(staff_data["password"])
    db.commit()

    # 3. Authenticate Staff
    r = client.post("/api/v1/login/access-token", data={"username": staff_data["email"], "password": "password123"})
    staff_token = {"Authorization": f"Bearer {r.json()['access_token']}"}

    # 4. Check Isolation (Cannot see ticket requests)
    # First create a ticket request as admin
    ticket_req = {
        "service_def_id": ticket_svc["id"],
        "quantity": 1,
        "form_data": get_valid_form_data(ticket_svc["slug"])
    }
    r = client.post("/api/v1/service-requests/", json=ticket_req, headers=admin_token_headers)
    assert r.status_code == 200, f"Failed to create ticket request: {r.text}"
    req_id = r.json()["id"]

    r = client.get(f"/api/v1/service-requests/{req_id}", headers=staff_token)
    if r.status_code in [403, 404]:
        log_success("RBAC: Staff correctly blocked from viewing unauthorized service")
    else:
        log_fail("RBAC: Staff accessed unauthorized service!")
        assert False

    # 5. Check Creation Scope Enforcement
    # Attempt 1: Create Cargo request (In Scope)
    cargo_req_data = {
        "service_def_id": cargo_svc["id"],
        "quantity": 1,
        "form_data": get_valid_form_data(cargo_svc["slug"])
    }
    r = client.post("/api/v1/service-requests/", json=cargo_req_data, headers=staff_token)
    assert r.status_code == 200, f"Staff should be able to create Cargo request: {r.text}"
    log_success("RBAC: Staff allowed to create request within assigned scope")

    # Attempt 2: Create Air Ticket request (Out of Scope)
    ticket_req_data = {
        "service_def_id": ticket_svc["id"],
        "quantity": 1,
        "form_data": get_valid_form_data(ticket_svc["slug"])
    }
    r = client.post("/api/v1/service-requests/", json=ticket_req_data, headers=staff_token)
    assert r.status_code == 403, f"Staff should be blocked from creating Air Ticket request: {r.status_code}"
    log_success("RBAC: Staff correctly blocked from creating request outside assigned scope")
