from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.role import Role

def seed_staff(db: Session = None):
    own_db = False
    if db is None:
        db = SessionLocal()
        own_db = True

    staff_role = db.query(Role).filter(Role.name == "Staff").first()
    if not staff_role:
        print("Creating Staff role...")
        staff_role = Role(name="Staff", description="Operational staff member")
        db.add(staff_role)
        db.flush()

    if own_db:
        db.commit()
        db.close()
    else:
        db.flush()

if __name__ == "__main__":
    seed_staff()