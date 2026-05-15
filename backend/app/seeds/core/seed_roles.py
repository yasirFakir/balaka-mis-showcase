from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.role import Role

def seed_roles(db: Session = None):
    own_db = False
    if db is None:
        db = SessionLocal()
        own_db = True

    roles_to_create = [
        {"name": "Admin", "description": "Administrator with full access"},
        {"name": "Manager", "description": "Strategic management and approvals"},
        {"name": "Finance", "description": "Financial management and auditing"},
        {"name": "Field Ops", "description": "Logistics, warehouse, and field operations"},
        {"name": "Support", "description": "Customer support and ticket resolution"},
        {"name": "Staff", "description": "General staff access"},
        {"name": "Client", "description": "Standard user access"}
    ]

    print("Seeding Roles...")
    for role_data in roles_to_create:
        # Check if role exists
        existing = db.query(Role).filter(Role.name == role_data["name"]).first()
        if not existing:
            role = Role(name=role_data["name"], description=role_data["description"])
            db.add(role)
        else:
            print(f"Role {role_data['name']} already exists. Skipping.")
            
    if own_db:
        db.commit()
        db.close()
    else:
        db.flush()

if __name__ == "__main__":
    seed_roles()