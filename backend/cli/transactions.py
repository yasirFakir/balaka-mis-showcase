from app.db.session import SessionLocal
from app import models
from sqlalchemy.orm import joinedload

def list_transactions(limit: int = 20):
    """
    CLI Tool to audit client payments.
    """
    db = SessionLocal()
    try:
        txns = db.query(models.Transaction).options(
            joinedload(models.Transaction.user)
        ).order_by(models.Transaction.created_at.desc()).limit(limit).all()

        print(f"\n{'ID':<5} | {'CUSTOMER':<20} | {'METHOD':<15} | {'AMOUNT':<10} | {'STATUS'}")
        print("-" * 75)
        for t in txns:
            cust = t.user.full_name if t.user else "N/A"
            print(f"{t.id:<5} | {cust[:20]:<20} | {t.payment_method:<15} | ${t.amount:9.2f} | {t.status}")
        print("-" * 75)
    finally:
        db.close()
