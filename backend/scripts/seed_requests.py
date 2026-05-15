import sys
import os
from datetime import datetime, timedelta, timezone

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.db.session import SessionLocal
from app.models.service import ServiceDefinition
from app.models.service_request import ServiceRequest
from app.models.user import User

def seed_requests():
    db = SessionLocal()
    try:
        print("--- Seeding Service Requests for Verification ---")
        
        client = db.query(User).filter(User.email == "client@example.com").first()
        if not client:
            print("❌ Client 'client@example.com' not found. Please run seed.sh first.")
            return

        services = db.query(ServiceDefinition).limit(3).all()
        if not services:
            print("❌ No services found. Please run seed.sh first.")
            return

        now = datetime.now(timezone.utc)

        # 1. Recent Pending Request
        req1 = ServiceRequest(
            user_id=client.id,
            service_def_id=services[0].id,
            status="Pending",
            selling_price=services[0].base_price,
            form_data={"full_name": "Recent Pending", "note": "Testing Filter"},
            created_at=now - timedelta(hours=2)
        )

        # 2. Processing Request (from 5 days ago)
        req2 = ServiceRequest(
            user_id=client.id,
            service_def_id=services[1].id,
            status="Processing",
            selling_price=services[1].base_price,
            form_data={"full_name": "Past Processing", "note": "Testing Date Filter"},
            created_at=now - timedelta(days=5)
        )

        # 3. Completed Request (from 40 days ago)
        req3 = ServiceRequest(
            user_id=client.id,
            service_def_id=services[2].id if len(services) > 2 else services[0].id,
            status="Completed",
            selling_price=1500.0,
            form_data={"full_name": "Old Completed", "note": "Testing All Time Filter"},
            created_at=now - timedelta(days=40)
        )

        # 4. Cancelled Request
        req4 = ServiceRequest(
            user_id=client.id,
            service_def_id=services[0].id,
            status="Cancelled",
            selling_price=services[0].base_price,
            form_data={"full_name": "Cancelled Test", "note": "Testing Status Filter"},
            created_at=now - timedelta(days=1)
        )

        db.add_all([req1, req2, req3, req4])
        db.commit()
        print(f"✅ Successfully seeded 4 requests for {client.email}")

    except Exception as e:
        print(f"❌ Seed failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_requests()
