from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.service import ServiceDefinition, ServiceVariant
from app.models.service_request import ServiceRequest
from app.models.user import User
import random
import json
from datetime import datetime, timedelta

def seed_test_cargo():
    db = SessionLocal()
    try:
        print("🚀 Seeding 'Sea Freight Container' Service and Test Data...")

        # 1. Create/Get the Service Definition
        service_slug = "sea-freight-container"
        service = db.query(ServiceDefinition).filter(ServiceDefinition.slug == service_slug).first()

        if not service:
            print(f"Creating new service: Sea Freight Container...")
            service = ServiceDefinition(
                name="Sea Freight Container",
                name_bn="সমুদ্র মালবাহী কন্টেইনার",
                slug=service_slug,
                category="Cargo Service",
                tags=["Cargo Service", "Logistics"],
                description="Cost-effective sea shipping for large bulk items. 45-60 days delivery.",
                description_bn="বড় বাল্ক আইটেমের জন্য সাশ্রয়ী সমুদ্র পরিবহন। ৪৫-৬০ দিনে ডেলিভারি।",
                image_url="/shared/images/services/svc-cargo-service.webp", # Reusing existing cargo image
                is_public=True,
                is_active=True,
                base_price=0, # Calculated via variants
                form_schema={
                    "sections": [
                        {
                            "title": "Sender Info",
                            "fields": [
                                {"key": "full_name", "label": "Sender Name", "type": "text", "required": True},
                                {"key": "contact_number", "label": "Sender Phone", "type": "phone", "required": True}
                            ]
                        },
                        {
                            "title": "Consignment Details",
                            "fields": [
                                {"key": "receiver_name", "label": "Receiver Name", "type": "text", "required": True},
                                {"key": "district", "label": "District", "type": "select", "options": ["Dhaka", "Chittagong", "Khulna"], "required": True},
                                {"key": "weight_kg", "label": "Approx Weight (KG)", "type": "number", "required": True},
                                {"key": "contents", "label": "Contents Description", "type": "textarea", "required": True}
                            ]
                        }
                    ]
                },
                financial_schema=[
                    {"key": "freight_charge", "label": "Freight Charge", "type": "INCOME", "source": "CLIENT", "amount": 0},
                    {"key": "customs_duty", "label": "Customs Duty", "type": "EXPENSE", "source": "EXTERNAL", "amount": 0},
                    {"key": "local_delivery", "label": "Local Delivery Cost", "type": "EXPENSE", "source": "INTERNAL", "amount": 50}
                ]
            )
            db.add(service)
            db.flush()

            # Add Variants
            variants = [
                {"name_en": "Small Container (20ft)", "price_model": "FIXED", "default_price": 1500.0},
                {"name_en": "Large Container (40ft)", "price_model": "FIXED", "default_price": 2800.0},
                {"name_en": "Loose Cargo (Per KG)", "price_model": "PER_UNIT", "default_price": 12.0}
            ]
            
            for v in variants:
                var = ServiceVariant(service_def_id=service.id, **v)
                db.add(var)
            
            db.commit()
            print("✅ Service Created.")
        else:
            print("ℹ️ Service already exists.")

        # 2. Get a Client User
        client = db.query(User).filter(User.email == "client@example.com").first()
        if not client:
            print("⚠️ 'client@example.com' not found. Fetching first available user...")
            client = db.query(User).first()
        
        if not client:
            print("❌ No users found to assign requests to.")
            return

        # 3. Create Test Requests
        print(f"Generating requests for user: {client.email}...")
        
        statuses = [
            ("Pending", 1),
            ("Processing", 2),
            ("In Transit", 3),
            ("Completed", 1)
        ]

        variant = db.query(ServiceVariant).filter(ServiceVariant.service_def_id == service.id).first()
        base_price = variant.default_price if variant else 500.0

        created_count = 0
        for status, count in statuses:
            for i in range(count):
                req = ServiceRequest(
                    service_def_id=service.id,
                    user_id=client.id,
                    variant_id=variant.id if variant else None,
                    status=status,
                    quantity=random.randint(1, 5),
                    selling_price=base_price * random.randint(1, 5),
                    cost_price=base_price * 0.7,
                    form_data={
                        "full_name": f"Test Sender {random.randint(100, 999)}",
                        "contact_number": f"050{random.randint(1000000, 9999999)}",
                        "receiver_name": f"Test Receiver {random.randint(100, 999)}",
                        "district": random.choice(["Dhaka", "Chittagong"]),
                        "weight_kg": random.randint(10, 100),
                        "contents": "Household goods and electronics"
                    },
                    created_at=datetime.utcnow() - timedelta(days=random.randint(0, 10))
                )
                db.add(req)
                created_count += 1
        
        db.commit()
        print(f"✅ Successfully created {created_count} test requests for 'Sea Freight Container'.")

    except Exception as e:
        db.rollback()
        print(f"❌ Error: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_test_cargo()
