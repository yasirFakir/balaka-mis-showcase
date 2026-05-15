from app.db.session import SessionLocal
from app.models.user import User
from sqlalchemy import or_

def fix():
    db = SessionLocal()
    try:
        users = db.query(User).filter(
            or_(
                User.must_change_password == None,
                User.is_active == None,
                User.is_verified == None,
                User.is_superuser == None,
                User.is_support_banned_permanently == None
            )
        ).all()
        
        print(f"Found {len(users)} users with NULL boolean fields.")
        
        for u in users:
            if u.must_change_password is None: u.must_change_password = False
            if u.is_active is None: u.is_active = False
            if u.is_verified is None: u.is_verified = False
            if u.is_superuser is None: u.is_superuser = False
            if u.is_support_banned_permanently is None: u.is_support_banned_permanently = False
            
        db.commit()
        print("Successfully updated NULL boolean fields to False.")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix()
