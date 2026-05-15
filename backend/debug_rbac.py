from app.db.session import SessionLocal
from app.models.role import Role
from app.models.permission import Permission
from app.models.user import User

def check_rbac_state():
    db = SessionLocal()
    try:
        print("\n--- RBAC DIAGNOSTIC ---")
        
        # 1. Check Manager Role
        manager_role = db.query(Role).filter(Role.name == "Manager").first()
        if not manager_role:
            print("❌ Role 'Manager' NOT FOUND")
        else:
            print(f"✅ Role 'Manager' found (ID: {manager_role.id})")
            perms = [p.slug for p in manager_role.permissions]
            print(f"   Permissions ({len(perms)}): {perms}")
            
            if "users.manage" in perms:
                print("   ✅ 'users.manage' is present.")
            else:
                print("   ❌ 'users.manage' is MISSING!")

        # 2. Check Permissions Table for Fixes
        required_slugs = ["requests.view_all", "finance.view_ledger", "analytics.view_dashboard", "services.manage_catalog"]
        print("\nChecking Critical Permissions:")
        for slug in required_slugs:
            p = db.query(Permission).filter(Permission.slug == slug).first()
            if p:
                print(f"   ✅ '{slug}' exists.")
            else:
                print(f"   ❌ '{slug}' MISSING in DB!")

        # 3. List Users and Roles
        print("\nChecking Users:")
        users = db.query(User).all()
        for u in users:
            role_names = [r.name for r in u.roles]
            if "Client" not in role_names: # Filter out clients to reduce noise
                print(f"   User: {u.email} | Active: {u.is_active} | Superuser: {u.is_superuser} | Roles: {role_names}")

    finally:
        db.close()

if __name__ == "__main__":
    check_rbac_state()
