from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User
from app.models.role import Role
from app.core.security import get_password_hash

def seed_admin(db: Session = None):
    own_db = False
    if db is None:
        db = SessionLocal()
        own_db = True

    admin_role = db.query(Role).filter(Role.name == "Admin").first()
    if not admin_role:
        admin_role = Role(name="Admin", description="Administrator with full access")
        db.add(admin_role)
        db.flush()

    import os
    from app.core.config import settings
    admin_email = os.getenv("FIRST_SUPERUSER") or settings.ROOT_EMAIL or "admin@airbalakatravel.com"
    admin_password = os.getenv("FIRST_SUPERUSER_PASSWORD", "Balaka@2026#SecureAdminVault!")
    
    user = db.query(User).filter(User.email == admin_email).first()
    
    if not user:
        print(f"Creating admin user: {admin_email}")
        user = User(
            email=admin_email,
            full_name="System Admin",
            hashed_password=get_password_hash(admin_password),
            is_active=True,
            is_verified=True,
            is_superuser=True,
            must_change_password=False
        )
        user.roles.append(admin_role)
        db.add(user)
    else:
        print(f"Updating admin user password: {admin_email}")
        user.hashed_password = get_password_hash(admin_password)
        user.is_superuser = True
        user.is_verified = True
        user.must_change_password = False
        if admin_role not in user.roles:
            user.roles.append(admin_role)
    
    if own_db:
        db.commit()
        db.close()
    else:
        db.flush()

if __name__ == "__main__":
    seed_admin()
