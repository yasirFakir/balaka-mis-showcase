import sys
import os
from datetime import datetime, timedelta

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.db.session import SessionLocal
from app.models.service import ServiceDefinition
from app.models.service_request import ServiceRequest
from app.models.transaction import Transaction
from app.models.user import User
from app.models.vendor import Vendor, VendorTransaction

def seed_test_ledger():
    db = SessionLocal()
    try:
        print("--- Adding Test BDT Transactions ---")
        
        admin = db.query(User).filter(User.email == "admin@airbalakatravel.com").first()
        client = db.query(User).filter(User.email == "client@example.com").first()
        # Corrected slug
        service = db.query(ServiceDefinition).filter(ServiceDefinition.slug == "cargo-service").first()
        
        if not all([admin, client, service]):
            print(f"Missing entities: Admin={bool(admin)}, Client={bool(client)}, Service={bool(service)}")
            return

        # Request 1: Cargo Service (1000 SAR)
        req1 = ServiceRequest(
            user_id=client.id,
            service_def_id=service.id,
            status="Processing",
            selling_price=1000.0,
            cost_price=700.0,
            profit=300.0,
            form_data={"full_name": "Test Client", "location": "Jeddah", "contact_number": "0500000000"}
        )
        db.add(req1)
        db.flush()

        # Transaction 1: BDT Payment (30,000 BDT @ 30.0) -> 1000 SAR
        t1 = Transaction(
            transaction_id="TXN-BDT-001",
            service_request_id=req1.id,
            base_price=1000.0,
            amount=1000.0,
            exchange_rate=30.0,
            claimed_amount=30000.0,
            claimed_currency="BDT",
            payment_method="Bank Transfer",
            transaction_type="Payment",
            status="Verified",
            created_by_id=admin.id,
            user_id=client.id
        )
        
        # Request 2: Cargo Service (500 SAR)
        req2 = ServiceRequest(
            user_id=client.id,
            service_def_id=service.id,
            status="Completed",
            selling_price=500.0,
            cost_price=350.0,
            profit=150.0,
            form_data={"full_name": "Test Client", "location": "Jeddah", "contact_number": "0500000000"}
        )
        db.add(req2)
        db.flush()

        # Transaction 2: BDT Payment (16,250 BDT @ 32.5) -> 500 SAR
        t2 = Transaction(
            transaction_id="TXN-BDT-002",
            service_request_id=req2.id,
            base_price=500.0,
            amount=500.0,
            exchange_rate=32.5,
            claimed_amount=16250.0,
            claimed_currency="BDT",
            payment_method="Cash",
            transaction_type="Payment",
            status="Verified",
            created_by_id=admin.id,
            user_id=client.id
        )

        # Request 3: Cargo Service (2000 SAR)
        req3 = ServiceRequest(
            user_id=client.id,
            service_def_id=service.id,
            status="Processing",
            selling_price=2000.0,
            cost_price=1400.0,
            profit=600.0,
            currency="BDT",
            exchange_rate=31.25,
            form_data={"full_name": "Test Client Multi", "location": "Riyadh", "contact_number": "0500000011"}
        )
        db.add(req3)
        db.flush()

        # Transaction 3: Partial BDT Payment (31,250 BDT @ 31.25) -> 1000 SAR
        t3 = Transaction(
            transaction_id="TXN-BDT-003",
            service_request_id=req3.id,
            base_price=1000.0,
            amount=1000.0,
            exchange_rate=31.25,
            claimed_amount=31250.0,
            claimed_currency="BDT",
            payment_method="bKash",
            transaction_type="Payment",
            status="Pending",
            created_by_id=admin.id,
            user_id=client.id
        )

        db.add_all([t1, t2, t3])
        db.commit()
        print(f"✅ Created 3 Service Requests and 3 BDT Transactions.")
        print(f"   - TXN-BDT-001: 30,000 BDT (Rate 30.0)")
        print(f"   - TXN-BDT-002: 16,250 BDT (Rate 32.5)")
        print(f"   - TXN-BDT-003: 31,250 BDT (Rate 31.25) [Pending]")

    except Exception as e:
        print(f"❌ Test seed failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_test_ledger()