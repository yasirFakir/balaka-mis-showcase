from app.db.session import SessionLocal
from app import models
from sqlalchemy.orm import joinedload

def list_vendors():
    """
    CLI Tool to audit vendor balances.
    """
    db = SessionLocal()
    try:
        vendors = db.query(models.Vendor).all()
        print(f"\n{'ID':<5} | {'VENDOR NAME':<30} | {'TYPE':<10} | {'BALANCE'}")
        print("-" * 65)
        for v in vendors:
            print(f"{v.id:<5} | {v.name[:30]:<30} | {v.type:<10} | ${v.current_balance:10.2f}")
        print("-" * 65)
    finally:
        db.close()

def list_vendor_transactions(limit: int = 20):
    """
    CLI Tool to view recent vendor transactions.
    """
    db = SessionLocal()
    try:
        txns = db.query(models.VendorTransaction).options(
            joinedload(models.VendorTransaction.vendor)
        ).order_by(models.VendorTransaction.created_at.desc()).limit(limit).all()

        print(f"\n{'ID':<5} | {'VENDOR':<25} | {'TYPE':<10} | {'AMOUNT':<10} | {'REF'}")
        print("-" * 75)
        for t in txns:
            v_name = t.vendor.name if t.vendor else "N/A"
            print(f"{t.id:<5} | {v_name[:25]:<25} | {t.transaction_type:<10} | ${t.amount:9.2f} | {t.transaction_id}")
        print("-" * 75)
    finally:
        db.close()

