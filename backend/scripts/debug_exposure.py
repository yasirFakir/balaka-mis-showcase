from app.db.session import SessionLocal
from app.models.vendor import Vendor, VendorTransaction
from app.crud.vendor import vendor as vendor_crud
from app.schemas.vendor import VendorTransactionCreate
from sqlalchemy import func

def debug_exposure():
    db = SessionLocal()
    try:
        print("--- 1. Vendor Balance Check ---")
        vendors = db.query(Vendor).all()
        for v in vendors:
            print(f"Vendor: {v.name}, Balance: {v.current_balance}")

        print("\n--- 2. Transaction Check ---")
        txns = db.query(VendorTransaction).all()
        print(f"Total Vendor Transactions: {len(txns)}")
        for t in txns:
            print(f"VND: {t.vendor_id}, Type: {t.transaction_type}, Amt: {t.amount}")

        if not vendors:
            print("\n!!! ERROR: No vendors found. Seed the database first.")
            return

        # 3. Simulate Activity if needed
        test_v = vendors[0]
        print(f"\n--- 3. Simulating Activity for {test_v.name} ---")
        
        # Add a test purchase
        txn_in = VendorTransactionCreate(
            vendor_id=test_v.id,
            amount=1500.0,
            transaction_type="PURCHASE",
            notes="Debug test purchase"
        )
        vendor_crud.record_transaction(db, obj_in=txn_in, user_id=1)
        db.commit()
        
        print(f"Success! Updated {test_v.name} balance to: {test_v.current_balance}")

        # 4. Verify Analytics Query
        debt_vendors = db.query(Vendor).filter(Vendor.current_balance != 0).all()
        print(f"\n--- 4. Analytics Query Result ---")
        print(f"Vendors with non-zero balance: {len(debt_vendors)}")
        for dv in debt_vendors:
            print(f"Found: {dv.name} -> {dv.current_balance}")

    finally:
        db.close()

if __name__ == "__main__":
    debug_exposure()
