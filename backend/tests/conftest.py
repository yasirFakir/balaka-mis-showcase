import os
import subprocess
from urllib.parse import urlparse
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

# 1. IDENTIFY DEV DB FOR SAFETY BACKUP
# We read the root .env directly to find what the user considers "their" database
DEV_DB_NAME = "balaka_db" # Default fallback
try:
    with open("../.env", "r") as f:
        for line in f:
            if line.startswith("POSTGRES_DB="):
                DEV_DB_NAME = line.split("=")[1].strip()
except:
    pass

# FORCE TEST DATABASE ENVIRONMENT before any other imports
os.environ["POSTGRES_DB"] = "balaka_test"
os.environ["ROOT_EMAIL"] = "admin@test.com"
os.environ["FIRST_SUPERUSER_PASSWORD"] = "password"

import pytest
from app import models
from app.db.base_class import Base
from app.main import app
from app.api.dependencies import get_db
from app.core.config import settings

# Use credentials from .env but target the test database
SQLALCHEMY_DATABASE_URL = str(settings.DATABASE_URL)

engine = create_engine(SQLALCHEMY_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def db_engine():
    # Parse DEV DB info for safety backup
    # We use the same host/user/pass as the test DB (assumed same instance)
    parsed = urlparse(SQLALCHEMY_DATABASE_URL)
    user = parsed.username
    password = parsed.password
    host = parsed.hostname
    port = parsed.port or 5432
    
    backup_file = "dev_db_safety_backup.sql"
    env = os.environ.copy()
    if password:
        env["PGPASSWORD"] = password

    # A. BACKUP DEV DB
    print(f"\n[pytest] SAFETY: Backing up development database '{DEV_DB_NAME}'...")
    try:
        subprocess.run(
            ["pg_dump", "-h", host, "-p", str(port), "-U", user, "--clean", "--if-exists", "-f", backup_file, DEV_DB_NAME],
            env=env,
            check=True
        )
        print(f"[pytest] Safety backup created: {backup_file}")
    except Exception as e:
        print(f"[pytest] Safety backup failed: {e}")

    # B. SETUP TEST DB
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    from app.seeds.core.seed_services import seed_services
    from app.seeds.core.seed_roles import seed_roles
    from app.seeds.core.seed_permissions import seed_permissions
    
    db = TestingSessionLocal()
    seed_roles(db)
    seed_permissions(db)
    seed_services(db)
    db.commit()
    db.close()
    
    yield engine
    
    # C. RESTORE DEV DB
    print(f"\n[pytest] SAFETY: Restoring development database '{DEV_DB_NAME}'...")
    if os.path.exists(backup_file):
        try:
            # We must kill connections to DEV_DB to restore
            # Note: This engine is connected to balaka_test, we need a conn to postgres or balaka_test to kill others
            with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
                conn.execute(text(f"""
                    SELECT pg_terminate_backend(pid)
                    FROM pg_stat_activity
                    WHERE datname = '{DEV_DB_NAME}'
                    AND pid <> pg_backend_pid();
                """))
            
            subprocess.run(
                ["psql", "-h", host, "-p", str(port), "-U", user, "-d", DEV_DB_NAME, "-f", backup_file],
                env=env,
                check=True
            )
            print("[pytest] Development database restored.")
        except Exception as e:
            print(f"[pytest] Restore failed: {e}")
        finally:
            os.remove(backup_file)
    
    # Final cleanup of test DB
    Base.metadata.drop_all(bind=engine)

from sqlalchemy import text # Ensure text is available for the restore connections logic

@pytest.fixture(scope="function")
def db() -> Generator[Session, None, None]:
    # For Postgres E2E tests where API commits, we use a standard session
    # Ensure fresh connection
    engine.dispose()
    session = TestingSessionLocal()
    yield session
    session.close()

@pytest.fixture(scope="function")
def client(db: Session) -> Generator[TestClient, None, None]:
    # Override the get_db dependency to use our test database session
    def override_get_db():
        yield db
    
    app.dependency_overrides[get_db] = override_get_db
    
    # Disable Rate Limiting for Tests
    if hasattr(app.state, "limiter"):
        app.state.limiter.enabled = False
        
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def admin_token_headers(client: TestClient) -> dict:
    from app.core.security import get_password_hash
    from app.models.user import User
    from app.models.role import Role
    
    db = TestingSessionLocal()
    
    # Seed Roles if missing
    if not db.query(Role).filter(Role.name == "Admin").first():
        db.add(Role(name="Admin", description="Superuser"))
        db.add(Role(name="Client", description="Regular user"))
        db.commit()
    
    # Seed Admin
    admin_email = "admin@test.com"
    if not db.query(User).filter(User.email == admin_email).first():
        admin = User(
            email=admin_email,
            hashed_password=get_password_hash("password"),
            full_name="Test Admin",
            is_active=True,
            is_verified=True,
            is_superuser=True
        )
        admin_role = db.query(Role).filter(Role.name == "Admin").first()
        if admin_role:
            admin.roles.append(admin_role)
        db.add(admin)
        db.commit()
    else:
        # Ensure existing admin is verified for tests
        admin = db.query(User).filter(User.email == admin_email).first()
        admin.is_verified = True
        admin.is_active = True
        db.add(admin)
        db.commit()
    
    db.close()

    # Login
    login_data = {
        "username": "admin@test.com",
        "password": "password",
    }
    r = client.post("/api/v1/login/access-token", data=login_data)
    tokens = r.json()
    return {"Authorization": f"Bearer {tokens['access_token']}"}

@pytest.fixture(scope="function", autouse=True)

def cleanup_db_each_test(db: Session):

    """

    Ensure a clean state for each test by purging transactional data.

    Config data (users, roles, services, vendors) is preserved.

    """

    # 1. Clear Transactional Tables

    db.execute(text("TRUNCATE TABLE service_request, transaction, vendor_transactions, status_history, support_ticket, ticket_message, notification CASCADE"))

    db.commit()



@pytest.fixture(scope="function")

def admin_token_headers(client: TestClient) -> dict:

    from app.core.security import get_password_hash

    from app.models.user import User

    from app.models.role import Role

    

    db = TestingSessionLocal()

    

    # Ensure Roles exist

    admin_role = db.query(Role).filter(Role.name == "Admin").first()

    if not admin_role:

        from app.seeds.core.seed_roles import seed_roles

        seed_roles(db)

        admin_role = db.query(Role).filter(Role.name == "Admin").first()

    

    # Seed Admin

    admin_email = "admin@test.com"

    admin = db.query(User).filter(User.email == admin_email).first()

    if not admin:

        admin = User(

            email=admin_email,

            hashed_password=get_password_hash("password"),

            full_name="Test Admin",

            is_active=True,

            is_verified=True,

            is_superuser=True

        )

        if admin_role: admin.roles.append(admin_role)

        db.add(admin)

    else:

        admin.is_verified = True

        admin.is_active = True

        if admin_role and admin_role not in admin.roles:

            admin.roles.append(admin_role)

        db.add(admin)

    

    db.commit()

    db.close()



    # Login

    r = client.post("/api/v1/login/access-token", data={"username": admin_email, "password": "password"})

    tokens = r.json()

    return {"Authorization": f"Bearer {tokens['access_token']}"}



@pytest.fixture(scope="function")

def user_token_headers(client: TestClient) -> dict:

    email = "user@test.com"

    password = "password"

    

    db = TestingSessionLocal()

    user = db.query(models.User).filter(models.User.email == email).first()

    

    if not user:

        client.post("/api/v1/users/register", json={

            "email": email, "password": password, "full_name": "Test User", "phone_number": "+8801700000000"

        })

        user = db.query(models.User).filter(models.User.email == email).first()

    

    if user:

        user.is_verified = True

        user.is_active = True

        db.add(user)

        db.commit()

    db.close()

    

    r = client.post("/api/v1/login/access-token", data={"username": email, "password": "password"})

    tokens = r.json()

    return {"Authorization": f"Bearer {tokens['access_token']}"}