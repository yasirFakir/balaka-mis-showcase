from app.db.session import SessionLocal
from app.models.user import User

def fix():
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.failed_login_attempts == None).all()
        print(f"Found {len(users)} users with NULL failed_login_attempts.")
        for u in users:
            u.failed_login_attempts = 0
        db.commit()
        print("Fixed.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix()
