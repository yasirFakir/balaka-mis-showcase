import random
import json
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app import models
from app.seeds.core.seed_staff import seed_staff

def seed_performance_data(num_requests=1000):
    db: Session = SessionLocal()
    
    # 0. Seed Staff first to ensure we have agents for analytics
    print("👥 Seeding operational staff members...")
    seed_staff(db)
    db.commit()

    print(f"🚀 Initializing Performance Stress Test: Generating {num_requests} requests...")

    # 1. Get entities
    users = db.query(models.User).all()
    user_ids = [u.id for u in users]
    
    agents = [u for u in users if any(r.name == "Staff" for r in u.roles)]
    agent_ids = [a.id for a in agents]
    # Create labels for selectors (Matches frontend format: "Full Name (Category - Office)")
    agent_labels = [f"{a.full_name} ({a.staff_category or 'Staff'} - {a.work_office or 'HQ'})" for a in agents]
    
    vendors = db.query(models.Vendor).all()
    # Simplified vendor selection for mock data
    external_vendor_ids = [v.id for v in vendors if v.name == "External Cost" or v.name == "Delivery Cost"]
    internal_vendor_ids = [v.id for v in vendors if v.name == "Internal Cost" or v.name == "Petty Cash"]
    all_vendor_ids = [v.id for v in vendors]
    
    service_defs = db.query(models.ServiceDefinition).all()
    
    public_services = [s for s in service_defs if s.is_public]
    private_services = [s for s in service_defs if not s.is_public]
    
    admin_user = db.query(models.User).filter(models.User.email == "admin@airbalakatravel.com").first()
    admin_id = admin_user.id if admin_user else 1

    if not user_ids or not service_defs:
        print("❌ Error: Please run basic seeders first.")
        return

    statuses = ["Pending", "Approved", "Processing", "Completed", "Rejected", "Cancelled", "Payment Verified"]
    payment_methods = ["Cash", "Bank Transfer", "bKash", "STC Pay"]
    months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    years = ["2024", "2025"]

    count = 0
    batch_size = 500
    
    print(f"📊 Found {len(agent_ids)} agents and {len(external_vendor_ids)} external vendors. Distributing workload...")

    for i in range(num_requests):
        # 30% chance of being an "Internal Affair" (Private Service)
        is_internal = random.random() < 0.3
        
        # Multi-currency support for requests
        # 20% chance of request being locked in BDT
        is_bdt_request = random.random() < 0.2
        req_currency = "BDT" if is_bdt_request else "SAR"
        req_rate = round(random.uniform(29.5, 33.5), 2) if is_bdt_request else 1.0

        if is_internal and private_services and agent_ids:
            svc = random.choice(private_services)
            user_id = random.choice(agent_ids)
            
            if svc.slug == "internal-trading":
                form_data = {
                    "sourcing_agent": random.choice(agent_labels),
                    "item_categories": ["Grocery Food", "BD Spices"],
                    "item_description": f"Bulk import cycle #{i}",
                    "status": random.choice(["Sourcing in BD", "Shipped to KSA", "In-Stock Riyadh"]),
                }
            elif svc.slug == "staff-settlement":
                form_data = {
                    "agent": random.choice(agent_labels),
                    "month": random.choice(months),
                    "year": random.choice(years),
                    "settlement_methods": [random.choice(payment_methods)]
                }
            elif svc.slug == "tt-gr":
                form_data = {
                    "asset_type": random.choice(["Gold (24K)", "USD Cash"]),
                    "quantity": random.randint(100, 500),
                    "carrier_name": random.choice(agent_labels)
                }
            else:
                form_data = {"note": f"Internal operation {i}"}
        else:
            svc = random.choice(public_services if public_services else service_defs)
            user_id = random.choice(user_ids)
            form_data = {
                "full_name": f"Performance Test User {i}",
                "contact_number": f"+88017{random.randint(10000000, 99999999)}",
                "location": "Dhaka, Bangladesh"
            }
            if svc.slug == "cargo-service":
                form_data.update({
                    "receiver_name": "Mock Receiver",
                    "receiver_phone": "+880180000000",
                    "district": "Dhaka"
                })
        
        days_ago = random.randint(0, 365)
        created_at = datetime.now(timezone.utc) - timedelta(days=days_ago)
        
        selling_price = float(random.randint(500, 10000))
        cost_price = round(selling_price * random.uniform(0.6, 0.9), 2)
        
        financial_breakdown = []
        if svc.financial_schema:
            for schema_item in svc.financial_schema:
                item_type = schema_item.get("type", "INCOME")
                is_income = item_type == "INCOME"
                
                vendor_id = None
                source = schema_item.get("source", "CLIENT")
                if not is_income and source == "EXTERNAL" and external_vendor_ids:
                    vendor_id = random.choice(external_vendor_ids)
                    source = "VENDOR"
                elif not is_income and source == "INTERNAL" and internal_vendor_ids:
                    vendor_id = random.choice(internal_vendor_ids)
                    source = "VENDOR"
                elif not is_income and source == "VENDOR" and all_vendor_ids:
                    vendor_id = random.choice(all_vendor_ids)
                    source = "VENDOR"

                amount = selling_price if is_income else round(cost_price / 2, 2)
                
                financial_breakdown.append({
                    "key": schema_item["key"],
                    "label": schema_item["label"],
                    "type": item_type,
                    "amount": amount,
                    "source": source,
                    "source_id": vendor_id,
                    "vendor_id": vendor_id
                })

        request = models.ServiceRequest(
            user_id=user_id,
            service_def_id=svc.id,
            status=random.choice(statuses),
            form_data=form_data,
            financial_breakdown=financial_breakdown,
            selling_price=selling_price,
            cost_price=cost_price,
            profit=round(selling_price - cost_price, 2),
            currency=req_currency,
            exchange_rate=req_rate,
            created_at=created_at,
            updated_at=created_at,
            created_by_id=random.choice(agent_ids) if agent_ids else admin_id
        )
        db.add(request)
        count += 1
        
        if count % batch_size == 0:
            db.commit()
            print(f"✅ Committed {count}/{num_requests} requests...")

    db.commit()
    print(f"🌟 Successfully generated {num_requests} service requests.")

    # 2. Generate Client Transactions & Vendor Debt
    print("💸 Generating transaction ledger and vendor debts...")
    requests = db.query(models.ServiceRequest).order_by(models.ServiceRequest.id.desc()).limit(num_requests).all()
    
    count = 0
    for req in requests:
        is_verified = random.random() < 0.8
        
        # Client Transactions
        # Transactions usually match the request currency, but some can be different
        for j in range(random.randint(1, 2)):
            txn_status = "Verified" if is_verified else "Pending"
            verifier_id = random.choice(agent_ids) if is_verified and agent_ids else None
            verified_at = req.created_at + timedelta(hours=random.randint(25, 48)) if is_verified else None
            
            # Mix of SAR and BDT payments
            is_bdt_txn = random.random() < 0.4 # 40% BDT payments
            txn_currency = "BDT" if is_bdt_txn else "SAR"
            # Use request rate or a slightly different one for variety
            txn_rate = req.exchange_rate if txn_currency == req.currency else (round(random.uniform(29.5, 33.5), 2) if is_bdt_txn else 1.0)
            
            sar_amount = round(req.selling_price / 2, 2)
            claimed_amount = round(sar_amount * txn_rate, 2) if txn_currency == "BDT" else sar_amount

            txn = models.Transaction(
                transaction_id=f"TXN-{req.id}-{j}-{random.randint(1000, 9999)}",
                service_request_id=req.id,
                user_id=req.user_id,
                base_price=sar_amount,
                amount=sar_amount,
                claimed_amount=claimed_amount,
                claimed_currency=txn_currency,
                exchange_rate=txn_rate,
                payment_method=random.choice(payment_methods),
                status=txn_status,
                transaction_type="Payment",
                created_by_id=random.choice(agent_ids) if agent_ids else admin_id,
                verified_by_id=verifier_id,
                verified_at=verified_at,
                created_at=req.created_at + timedelta(hours=random.randint(1, 24))
            )
            db.add(txn)
        
        # Vendor Debts
        if req.financial_breakdown:
            for item in req.financial_breakdown:
                if item.get("type") == "EXPENSE" and item.get("source") == "VENDOR" and item.get("source_id"):
                    # Use standard 'PURCHASE' type for debts
                    v_txn = models.VendorTransaction(
                        transaction_id=f"VND-{req.id}-{random.randint(1000, 9999)}",
                        vendor_id=item["source_id"],
                        transaction_type="PURCHASE",
                        amount=item["amount"],
                        claimed_amount=item["amount"],
                        currency="SAR",
                        exchange_rate=1.0,
                        notes=f"Mock debt for {item['label']}",
                        created_at=req.created_at,
                        created_by_id=req.created_by_id
                    )
                    db.add(v_txn)
                    
                    # Update Vendor Balance
                    vendor = db.get(models.Vendor, item["source_id"])
                    if vendor:
                        vendor.current_balance = round((vendor.current_balance or 0) + item["amount"], 2)

        count += 1
        if count % batch_size == 0:
            db.commit()
            print(f"💰 Processed ledger for {count} requests...")
    
    db.commit()
    print("✨ Performance, Staff Analytics & Vendor Debt seeding complete.")
    db.close()

if __name__ == "__main__":
    seed_performance_data()
