from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User
from app.models.role import Role
from app.core.security import get_password_hash

def seed_client(db: Session = None):
    own_db = False
    if db is None:
        db = SessionLocal()
        own_db = True
    
    client_role = db.query(Role).filter(Role.name == "Client").first()
    if not client_role:
        client_role = Role(name="Client", description="Standard user")
        db.add(client_role)
        db.flush()

    import os
    client_email = os.getenv("TEST_CLIENT_EMAIL", "client@example.com")
    client_password = os.getenv("TEST_CLIENT_PASSWORD", "ClientBalaka@2026!#Pass")
    client = db.query(User).filter(User.email == client_email).first()
    
    if not client:
        print(f"Creating dummy client: {client_email}")
        client = User(
            email=client_email,
            full_name="Standard Client",
            phone_number="+880 1711223344",
            hashed_password=get_password_hash(client_password),
            is_active=True,
            is_verified=True,
            must_change_password=False
        )
        client.roles.append(client_role)
        db.add(client)
    else:
        client.is_verified = True
        client.must_change_password = False
        if client_role not in client.roles:
            client.roles.append(client_role)

    if own_db:
        db.commit()
        db.close()
    else:
        db.flush()

if __name__ == "__main__":
    seed_client()
