from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.role import Role
from app.models.permission import Permission
from app.models.user import User
from app.core.security import get_password_hash
import random
import string

def random_lower_string() -> str:
    return "".join(random.choices(string.ascii_lowercase, k=32))

def random_email() -> str:
    return f"{random_lower_string()}@test.com"

def create_random_user(db: Session, email: str = None, password: str = None) -> User:
    email = email or random_email()
    password = password or random_lower_string()
    user = User(
        email=email, 
        hashed_password=get_password_hash(password),
        is_active=True,
        is_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def authentication_token_from_email(
    client: TestClient, email: str, db: Session
) -> dict:
    password = "password" # Assumed if we are using this helper with known password or resetting it
    # But wait, create_random_user uses hashed password. We need known password for login.
    # So we must pass known password to create_random_user or set it.
    
    login_data = {
        "username": email,
        "password": password,
    }
    r = client.post(f"/api/v1/login/access-token", data=login_data)
    tokens = r.json()
    return {"Authorization": f"Bearer {tokens['access_token']}"}

def test_superuser_bypass(
    client: TestClient, admin_token_headers: dict, db: Session
) -> None:
    """
    Superuser should bypass all permission checks.
    Using admin_token_headers which conftest provides (usually superuser).
    """
    # Try accessing a protected endpoint (e.g. read roles)
    response = client.get(
        f"/api/v1/roles/", headers=admin_token_headers
    )
    assert response.status_code == 200

def test_rbac_denial(
    client: TestClient, db: Session
) -> None:
    """
    A user without required permissions should be denied (403).
    """
    # Create a standard user (Client role by default usually)
    email = random_email()
    password = "password"
    user = create_random_user(db, email=email, password=password)
    user_token_headers = authentication_token_from_email(
        client=client, email=email, db=db
    )
    
    # Try accessing Admin-only endpoint (e.g. create role)
    response = client.post(
        f"/api/v1/roles/", 
        headers=user_token_headers,
        json={"name": "NewRole", "description": "Test"}
    )
    assert response.status_code == 403

def test_rbac_success_manager(
    client: TestClient, db: Session
) -> None:
    """
    A Manager should be able to access Manager-level endpoints.
    """
    # 1. Create User
    email = random_email()
    password = "password"
    user = create_random_user(db, email=email, password=password)
    
    # 2. Assign Manager Role
    role = db.query(Role).filter(Role.name == "Manager").first()
    if not role:
        role = Role(name="Manager")
        db.add(role)
        db.commit()
    
    # Ensure permission exists and is assigned
    perm_slug = "users.view"
    perm = db.query(Permission).filter(Permission.slug == perm_slug).first()
    if not perm:
        perm = Permission(slug=perm_slug, module="Users")
        db.add(perm)
        db.commit()
    
    if perm not in role.permissions:
        role.permissions.append(perm)
        db.add(role)
        db.commit()

    user.roles.append(role)
    db.add(user)
    db.commit()
    
    user_token_headers = authentication_token_from_email(
        client=client, email=email, db=db
    )
    
    # 3. Access users list (Requires 'users.view')
    response = client.get(
        f"/api/v1/users/", headers=user_token_headers
    )
    assert response.status_code == 200

def test_rbac_specific_fixes(
    client: TestClient, db: Session
) -> None:
    """
    Verify the specific permission slugs we fixed:
    - requests.view_all
    - finance.view_ledger
    - analytics.view_dashboard
    - services.manage_catalog
    """
    # Create a user and assign a custom role with these EXACT permissions
    email = random_email()
    password = "password"
    user = create_random_user(db, email=email, password=password)
    
    role = Role(name="TestFixRole")
    db.add(role)
    
    slugs = [
        "requests.view_all", 
        "finance.view_ledger", 
        "analytics.view_dashboard", 
        "services.manage_catalog"
    ]
    
    for slug in slugs:
        perm = db.query(Permission).filter(Permission.slug == slug).first()
        if not perm:
            perm = Permission(slug=slug, module="Test")
            db.add(perm)
        role.permissions.append(perm)
    
    db.commit()
    
    user.roles.append(role)
    db.add(user)
    db.commit()
    
    headers = authentication_token_from_email(
        client=client, email=email, db=db
    )
    
    # 1. Requests (requests.view_all)
    r1 = client.get(f"/api/v1/service-requests/", headers=headers)
    assert r1.status_code == 200
    
    # 2. Vendors (finance.view_ledger) - vendors list
    r2 = client.get(f"/api/v1/vendors/", headers=headers)
    assert r2.status_code == 200
    
    # 3. Analytics (analytics.view_dashboard) - summary
    r3 = client.get(f"/api/v1/analytics/summary", headers=headers)
    assert r3.status_code == 200
    
    # 4. Services (services.manage_catalog) - create service
    r4 = client.post(
        f"/api/v1/services/", 
        headers=headers,
        json={
            "name": "TestService", 
            "slug": "test-service", 
            "base_price": 100,
            "category": "Test",
            "tags": ["Test"]
        }
    )
    # If slug collision, it might be 400, but NOT 403
    assert r4.status_code in [200, 201, 400]