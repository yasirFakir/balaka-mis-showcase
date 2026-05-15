from app.db.session import SessionLocal
from app import models

def fix_transaction_users():
    db = SessionLocal()
    try:
        txns = db.query(models.Transaction).all()
        print(f"Checking {len(txns)} transactions...")
        count = 0
        for t in txns:
            if not t.user_id:
                # Find the service request owner
                req = db.query(models.ServiceRequest).filter(models.ServiceRequest.id == t.service_request_id).first()
                if req:
                    t.user_id = req.user_id
                    db.add(t)
                    count += 1
        db.commit()
        print(f"Fixed {count} transactions.")
    finally:
        db.close()

if __name__ == "__main__":
    fix_transaction_users()
