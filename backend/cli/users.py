from app.db.session import SessionLocal
from app import models
from sqlalchemy.orm import joinedload

def list_users(role: str = None, active_only: bool = False):
    """
    CLI Tool to list and audit system users.
    """
    db = SessionLocal()
    try:
        query = db.query(models.User).options(joinedload(models.User.roles))
        
        if active_only:
            query = query.filter(models.User.is_active == True)
            
        users = query.all()
        
        # Manual role filtering
        if role:
            users = [u for u in users if any(r.name.lower() == role.lower() for r in u.roles)]

        print(f"\n{'ID':<5} | {'FULL NAME':<25} | {'EMAIL':<30} | {'ROLES':<20} | {'STATUS'}")
        print("-" * 95)
        for u in users:
            roles = ", ".join([r.name for r in u.roles])
            status = "ACTIVE" if u.is_active else "INACTIVE"
            print(f"{u.id:<5} | {u.full_name[:25]:<25} | {u.email[:30]:<30} | {roles[:20]:<20} | {status}")
        print("-" * 95)
        print(f"Total entries: {len(users)}\n")
    finally:
        db.close()
