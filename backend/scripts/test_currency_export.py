import sys
import os
from datetime import datetime, timedelta

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.service import ServiceDefinition
from app.models.service_request import ServiceRequest
from app.models.transaction import Transaction
from app.models.user import User
from app.services.ledger_export import LedgerExportService
from app.models.system import SystemSetting

def test_currency_export():
    db = SessionLocal()
    try:
        print("--- Setting up Test Data ---")
        
        # 1. Get or Create Admin User (for creator)
        admin = db.query(User).filter(User.is_superuser == True).first()
        if not admin:
            admin = db.query(User).first()
            
        # 2. Create Test Service
        service_slug = f"currency-test-svc-{int(datetime.now().timestamp())}"
        service = ServiceDefinition(
            name="Currency Test Service",
            slug=service_slug,
            is_active=True,
            is_public=True,
            base_price=100.0
        )
        db.add(service)
        db.flush()
        print(f"Service Created: {service.name} (ID: {service.id})")
        
        # 3. Create Request
        req = ServiceRequest(
            user_id=admin.id,
            service_def_id=service.id,
            status="Completed",
            selling_price=300.0, 
            cost_price=150.0,
            profit=150.0,
            form_data={}
        )
        db.add(req)
        db.flush()
        print(f"Request Created: #{req.id}")
        
        # 4. Create Transactions with different rates
        # Txn 1: SAR 100 (Rate 1.0)
        t1 = Transaction(
            transaction_id=f"TEST-SAR-{req.id}",
            service_request_id=req.id,
            base_price=100.0,
            amount=100.0,
            payment_method="Cash",
            transaction_type="Payment",
            status="Verified",
            created_by_id=admin.id,
            exchange_rate=1.0,
            claimed_currency="SAR",
            claimed_amount=100.0
        )
        
        # Txn 2: BDT 3500 (Rate 35.0) -> 100 SAR
        t2 = Transaction(
            transaction_id=f"TEST-BDT-HIGH-{req.id}",
            service_request_id=req.id,
            base_price=100.0,
            amount=100.0,
            payment_method="Bank Transfer",
            transaction_type="Payment",
            status="Verified",
            created_by_id=admin.id,
            exchange_rate=35.0,
            claimed_currency="BDT",
            claimed_amount=3500.0
        )

        # Txn 3: BDT 3000 (Rate 30.0) -> 100 SAR
        t3 = Transaction(
            transaction_id=f"TEST-BDT-LOW-{req.id}",
            service_request_id=req.id,
            base_price=100.0,
            amount=100.0,
            payment_method="Bank Transfer",
            transaction_type="Payment",
            status="Verified",
            created_by_id=admin.id,
            exchange_rate=30.0,
            claimed_currency="BDT",
            claimed_amount=3000.0
        )
        
        # Txn 4: Pending Transaction (Should NOT appear in report)
        t4 = Transaction(
            transaction_id=f"TEST-PENDING-{req.id}",
            service_request_id=req.id,
            base_price=100.0,
            amount=100.0,
            payment_method="Cash",
            transaction_type="Payment",
            status="Pending",
            created_by_id=admin.id,
            exchange_rate=1.0,
            claimed_currency="SAR",
            claimed_amount=100.0
        )
        
        db.add_all([t1, t2, t3, t4])
        db.flush()
        print("Transactions Created: 3x 100 SAR (Verified), 1x 100 SAR (Pending)")
        
        # 5. Set Manual System Rate for BDT to 32.0 for consistent testing
        manual_setting = db.query(SystemSetting).filter(SystemSetting.key == "currency_manual_enabled").first()
        if not manual_setting:
            manual_setting = SystemSetting(key="currency_manual_enabled", value_bool=True)
            db.add(manual_setting)
        else:
            manual_setting.value_bool = True
            
        rate_setting = db.query(SystemSetting).filter(SystemSetting.key == "currency_manual_rate").first()
        if not rate_setting:
            rate_setting = SystemSetting(key="currency_manual_rate", value_float=32.0)
            db.add(rate_setting)
        else:
            rate_setting.value_float = 32.0
        db.flush()
        print("System Manual Rate set to 1 SAR = 32.0 BDT")
        
        db.commit()

        # --- TEST EXECUTION ---
        exporter = LedgerExportService(db)
        start = datetime.now() - timedelta(days=1)
        end = datetime.now() + timedelta(days=1)
        
        print("\n--- Generating Report in BDT ---")
        data_bdt = exporter._fetch_data(
            start_date=start,
            end_date=end,
            components=["all"],
            scope="both",
            currency="BDT",
            service_ids=[service.id]
        )
        
        rate_report = data_bdt["meta"]["rate"]
        print(f"Report Generation Rate: {rate_report}")
        
        # Verification 1: Pending Transaction Excluded
        txn_count = len(data_bdt["transactions"])
        print(f"Verified Transactions in Report: {txn_count}")
        assert txn_count == 3, f"Expected 3 verified transactions, got {txn_count}"
        
        # Verification 2: Revenue Calculation (300 SAR * 32.0 = 9600 BDT)
        total_rev = data_bdt["revenue"][0]["total"]
        print(f"Total Revenue: {total_rev} BDT")
        assert total_rev == 9600.0, f"Expected 9600.0 BDT, got {total_rev}"
        
        # Verification 3: Profitability (150 SAR * 32.0 = 4800 BDT)
        total_profit = data_bdt["profitability"]["total_profit"]
        print(f"Total Profit: {total_profit} BDT")
        assert total_profit == 4800.0, f"Expected 4800.0 BDT, got {total_profit}"

        # Verification 4: Individual Lines (Should be 3200 BDT each)
        for t in data_bdt["transactions"]:
            report_amt = t.amount * rate_report
            print(f"Txn {t.transaction_id} (Stored Rate: {t.exchange_rate}): Base {t.amount} SAR -> Report {report_amt} BDT")
            assert report_amt == 3200.0, f"Expected 3200.0 BDT, got {report_amt}"

        print("\n✅ TEST PASSED: Currency logic and status filtering are verified.")

    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        # Cleanup
        print("\n--- Cleanup ---")
        # Try to delete if objects were flushed but not committed, or committed
        try:
            # Refresh to avoid detached session issues during cleanup
            db.expire_all()
            
            # Re-fetch or use existing refs if they are in session
            for t in [t1, t2, t3, t4, req, service]:
                try:
                    if t in db:
                        db.delete(t)
                except:
                    pass
            db.commit()
        except:
            db.rollback()
        db.close()

if __name__ == "__main__":
    test_currency_export()