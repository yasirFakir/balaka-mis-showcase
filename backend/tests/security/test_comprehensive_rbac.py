import pytest
import random
import string
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.core.security import create_access_token
from app import schemas, models
from app.core.config import settings
from app.crud.user import user as user_crud
from app.crud.service import service as service_crud
from app.crud.service_request import service_request as request_crud
from app.crud.ticket import ticket as ticket_crud

# -----------------------------------------------------------------------------
# FIXTURES
# -----------------------------------------------------------------------------

@pytest.fixture
def rbac_client(client: TestClient) -> TestClient:
    """Returns a client instance."""
    return client

@pytest.fixture
def create_staff_user(db: Session):
    """Factory to create users with specific roles dynamically."""
    def _create_user(email: str, role_name: str, allowed_services=None):
        # Unique email generator
        rand_suffix = "".join(random.choices(string.ascii_lowercase, k=5))
        email_parts = email.split("@")
        unique_email = f"{email_parts[0]}_{rand_suffix}@{email_parts[1]}"

        # 1. Create User
        user_in = schemas.UserCreate(
            email=unique_email,
            password="password123",
            full_name=f"Test {role_name}",
            is_active=True
        )
        user = user_crud.create(db, obj_in=user_in)
        
        # 2. Assign Role
        role = db.query(models.Role).filter(models.Role.name == role_name).first()
        assert role, f"Role '{role_name}' must exist in seed data."
        
        user.roles.append(role)
        
        # 3. Assign Scope (if any)
        if allowed_services:
            services = db.query(models.ServiceDefinition).filter(models.ServiceDefinition.id.in_(allowed_services)).all()
            user.allowed_services = services
            
        db.commit()
        db.refresh(user)
        return user
    return _create_user

@pytest.fixture
def auth_header():
    """Helper to generate Auth headers."""
    def _get_header(user):
        token = create_access_token(subject=user.id)
        return {"Authorization": f"Bearer {token}"}
    return _get_header

# -----------------------------------------------------------------------------
# TESTS
# -----------------------------------------------------------------------------

def test_rbac_lifecycle_promotion_demotion(rbac_client, db, create_staff_user, auth_header):
    """
    Scenario: A Staff member is promoted to Finance, checks access, then is demoted back.
    """
    # 1. Start as "Staff" (No Finance Access)
    user = create_staff_user("lifecycle@example.com", "Staff")
    headers = auth_header(user)
    
    # Try to access Ledger (Should Fail)
    # Note: Using a read-only endpoint that requires 'finance.view_ledger'
    res = rbac_client.get("/api/v1/transactions", headers=headers)
    assert res.status_code == 403, "Staff should NOT access ledger"

    # 2. Promote to "Finance"
    finance_role = db.query(models.Role).filter(models.Role.name == "Finance").first()
    user.roles = [finance_role]
    db.commit()
    db.refresh(user)
    
    # Verify Finance Access (Should Succeed)
    res = rbac_client.get("/api/v1/transactions", headers=headers)
    assert res.status_code == 200, "Promoted Finance user SHOULD access ledger"

    # 3. Demote to "Client" (Should lose almost all access)
    client_role = db.query(models.Role).filter(models.Role.name == "Client").first()
    user.roles = [client_role]
    db.commit()
    db.refresh(user)
    
    res = rbac_client.get("/api/v1/transactions", headers=headers)
    assert res.status_code == 403, "Demoted user should lose ledger access"


def test_rbac_department_isolation(rbac_client, db, create_staff_user, auth_header):
    """
    Scenario: Finance cannot close tickets, Support cannot view ledger.
    """
    finance = create_staff_user("finance_dept@example.com", "Finance")
    support = create_staff_user("support_dept@example.com", "Support")
    
    # 1. Finance trying to create a ticket (Allowed? Actually Finance usually can create tickets)
    # Let's check 'tickets.manage' (Closing tickets) which Finance usually doesn't have?
    # Actually based on seed_permissions, Finance does NOT have 'tickets.manage'.
    
    # Create a dummy ticket first (by Admin)
    # We need to find admin user ID or just use finance to create one if allowed
    # Let's assume finance can CREATE, but not MANAGE status.
    
    # Actually, let's create a ticket via CRUD directly to test the isolation
    ticket = ticket_crud.create_with_user(
        db, 
        obj_in=schemas.SupportTicketCreate(subject="Test", initial_message="Test", priority="Low"), 
        user_id=finance.id
    )
    
    # Finance tries to update status (Close ticket) -> Should Fail
    res = rbac_client.put(
        f"/api/v1/tickets/{ticket.id}/status",
        json={"status": "Closed"},
        headers=auth_header(finance)
    )
    assert res.status_code == 403, "Finance user should NOT be able to close tickets"

    # 2. Support trying to view Ledger -> Should Fail
    res = rbac_client.get(
        "/api/v1/transactions",
        headers=auth_header(support)
    )
    assert res.status_code == 403, "Support user should NOT access ledger"


def test_rbac_scope_enforcement(rbac_client, db, create_staff_user, auth_header):
    """
    Scenario: A Manager restricted to 'Visa' cannot see 'Flight' requests.
    """
    # 1. Setup Services
    visa_svc = service_crud.create(db, obj_in=schemas.ServiceDefinitionCreate(name="Visa Service", slug="visa-test", base_price=100))
    flight_svc = service_crud.create(db, obj_in=schemas.ServiceDefinitionCreate(name="Flight Service", slug="flight-test", base_price=500))
    
    # 2. Create Data
    admin_user = user_crud.get_by_email(db, email="admin@airbalakatravel.com") or create_staff_user("admin_scope@test.com", "Admin")
    
    # Visa Request
    request_crud.create_with_user(
        db, 
        obj_in=schemas.ServiceRequestCreate(service_def_id=visa_svc.id, form_data={}, quantity=1),
        user_id=admin_user.id
    )
    
    # Flight Request
    request_crud.create_with_user(
        db, 
        obj_in=schemas.ServiceRequestCreate(service_def_id=flight_svc.id, form_data={}, quantity=1),
        user_id=admin_user.id
    )
    
    # 3. Create Scoped Manager (Only allowed Visa)
    scoped_manager = create_staff_user("scoped@example.com", "Manager", allowed_services=[visa_svc.id])
    headers = auth_header(scoped_manager)
    
    # 4. Fetch Requests
    res = rbac_client.get("/api/v1/service-requests", headers=headers)
    assert res.status_code == 200
    data = res.json()
    
    items = data.get("items", data) # Handle list or dict response
    
    # Verify strict filtering
    service_ids = [item['service_def_id'] for item in items]
    assert visa_svc.id in service_ids, "Should see Visa requests"
    assert flight_svc.id not in service_ids, "Should NOT see Flight requests due to scope"


def test_rbac_inactive_user_block(rbac_client, db, create_staff_user, auth_header):
    """
    Scenario: An Admin user is deactivated. They should lose ALL access immediately.
    """
    user = create_staff_user("blocked@example.com", "Admin")
    headers = auth_header(user)
    
    # Verify Access First
    res = rbac_client.get("/api/v1/users/me", headers=headers)
    assert res.status_code == 200
    
    # Deactivate
    user.is_active = False
    db.commit()
    
    # Verify Block
    res = rbac_client.get("/api/v1/users/me", headers=headers)
    # The dependency get_current_active_user throws 400 "Inactive user"
    assert res.status_code == 400 or res.status_code == 401, "Inactive user should be blocked"


def test_rbac_client_isolation(rbac_client, db, create_staff_user, auth_header):
    """
    Scenario: A standard Client cannot see other clients' data.
    """
    client1 = create_staff_user("c1@example.com", "Client")
    client2 = create_staff_user("c2@example.com", "Client")
    
    # Client 1 creates a request
    visa_svc = db.query(models.ServiceDefinition).first() # Assume at least one service exists
    if not visa_svc:
        pytest.skip("No services seeded")

    req1 = request_crud.create_with_user(
        db, 
        obj_in=schemas.ServiceRequestCreate(service_def_id=visa_svc.id, form_data={}, quantity=1),
        user_id=client1.id
    )
    
    # Client 2 tries to fetch Client 1's request
    res = rbac_client.get(f"/api/v1/service-requests/{req1.id}", headers=auth_header(client2))
    
    # Should return 404 (Not Found) or 403 (Forbidden)
    # Good security practice is often 404 to prevent enumeration, but 403 is also valid rbac.
    assert res.status_code in [403, 404], "Client should not access another's data"


def test_all_roles_baseline_access(rbac_client, db, create_staff_user, auth_header):
    """
    Data-driven test to verify EVERY role against critical endpoints.
    Ensures that the seed_permissions logic is correctly enforcing access.
    """
    # Define Role Expectations
    # (Role Name, Endpoint, Method, Expected Status)
    test_cases = [
        # --- Manager (Super Staff) ---
        ("Manager", "/api/v1/transactions", "GET", 200),      # Ledger Access: YES
        ("Manager", "/api/v1/tickets", "GET", 200),           # Tickets Access: YES
        
        # --- Finance ---
        ("Finance", "/api/v1/transactions", "GET", 200),      # Ledger Access: YES
        ("Finance", "/api/v1/tickets", "POST", 200),          # Ticket Create: YES (Common for staff)
        # Finance usually CANNOT manage ticket status (Close), but can view/create.
        
        # --- Field Ops ---
        ("Field Ops", "/api/v1/transactions", "GET", 403),    # Ledger Access: NO
        ("Field Ops", "/api/v1/service-requests", "GET", 200),# Requests Access: YES
        
        # --- Support ---
        ("Support", "/api/v1/transactions", "GET", 403),      # Ledger Access: NO
        ("Support", "/api/v1/tickets", "GET", 200),           # Tickets Access: YES
        
        # --- Staff (General) ---
        ("Staff", "/api/v1/transactions", "GET", 403),        # Ledger Access: NO
        ("Staff", "/api/v1/service-requests", "GET", 200),    # Requests Access: YES
        
        # --- Client ---
        ("Client", "/api/v1/transactions", "GET", 403),       # Ledger Access: NO (Global)
        ("Client", "/api/v1/users/me", "GET", 200),           # Self Profile: YES
    ]
    
    # Pre-create a dummy ticket payload for POST checks
    dummy_ticket = {"subject": "RBAC Test", "initial_message": "Testing", "priority": "Low"}

    for role_name, url, method, expected_code in test_cases:
        print(f"Testing Role: {role_name} -> {method} {url}")
        
        # Create fresh user for this role to ensure isolation
        email_sanitized = role_name.lower().replace(" ", "_")
        user = create_staff_user(f"{email_sanitized}_rbac@example.com", role_name)
        headers = auth_header(user)
        
        if method == "GET":
            res = rbac_client.get(url, headers=headers)
        elif method == "POST":
            res = rbac_client.post(url, json=dummy_ticket, headers=headers)
            
        assert res.status_code == expected_code, \
            f"Role '{role_name}' failed check for {url}. Expected {expected_code}, got {res.status_code}"


def test_all_roles_baseline_access(rbac_client, db, create_staff_user, auth_header):
    """
    Data-driven test to verify EVERY role against critical endpoints.
    Ensures that the seed_permissions logic is correctly enforcing access.
    """
    # Define Role Expectations
    # (Role Name, Endpoint, Method, Expected Status)
    test_cases = [
        # --- Manager (Super Staff) ---
        ("Manager", "/api/v1/transactions", "GET", 200),      # Ledger Access: YES
        ("Manager", "/api/v1/tickets", "GET", 200),           # Tickets Access: YES
        
        # --- Finance ---
        ("Finance", "/api/v1/transactions", "GET", 200),      # Ledger Access: YES
        ("Finance", "/api/v1/tickets", "POST", 200),          # Ticket Create: YES (Common for staff)
        # Finance usually CANNOT manage ticket status (Close), but can view/create.
        
        # --- Field Ops ---
        ("Field Ops", "/api/v1/transactions", "GET", 403),    # Ledger Access: NO
        ("Field Ops", "/api/v1/service-requests", "GET", 200),# Requests Access: YES
        
        # --- Support ---
        ("Support", "/api/v1/transactions", "GET", 403),      # Ledger Access: NO
        ("Support", "/api/v1/tickets", "GET", 200),           # Tickets Access: YES
        
        # --- Staff (General) ---
        ("Staff", "/api/v1/transactions", "GET", 403),        # Ledger Access: NO
        ("Staff", "/api/v1/service-requests", "GET", 200),    # Requests Access: YES
        
        # --- Client ---
        ("Client", "/api/v1/transactions", "GET", 403),       # Ledger Access: NO (Global)
        ("Client", "/api/v1/users/me", "GET", 200),           # Self Profile: YES
    ]
    
    # Pre-create a dummy ticket payload for POST checks
    dummy_ticket = {"subject": "RBAC Test", "initial_message": "Testing", "priority": "Low"}

    for role_name, url, method, expected_code in test_cases:
        print(f"Testing Role: {role_name} -> {method} {url}")
        
        # Create fresh user for this role to ensure isolation
        email_sanitized = role_name.lower().replace(" ", "_")
        user = create_staff_user(f"{email_sanitized}_rbac@example.com", role_name)
        headers = auth_header(user)
        
        if method == "GET":
            res = rbac_client.get(url, headers=headers)
        elif method == "POST":
            res = rbac_client.post(url, json=dummy_ticket, headers=headers)
            
        assert res.status_code == expected_code, \
            f"Role '{role_name}' failed check for {url}. Expected {expected_code}, got {res.status_code}"
