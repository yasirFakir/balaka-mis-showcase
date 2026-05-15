import pytest
from sqlalchemy.orm import Session
from app import models
from datetime import datetime, timedelta, timezone, date

def test_analytics_dashboard_full_consistency(client, db: Session, admin_token_headers):
    """
    Comprehensive test for /analytics/summary:
    1. Verifies workload counts (Pending, Approved, Processing, Processed).
    2. Verifies financial accuracy (Revenue, Yield, Outflow).
    3. Verifies time-range filtering.
    4. Verifies service-specific filtering.
    """
    # --- 1. SETUP ---
    # Create test services
    s1 = models.ServiceDefinition(name="Dashboard Test S1", slug="s-dash-1", is_public=True, is_active=True, is_available=True)
    s2 = models.ServiceDefinition(name="Dashboard Test S2", slug="s-dash-2", is_public=True, is_active=True, is_available=True)
    db.add_all([s1, s2])
    
    # Create a vendor for outflow
    vendor = models.Vendor(name="Dashboard Test Vendor", current_balance=0)
    db.add(vendor)
    db.commit()
    db.refresh(s1)
    db.refresh(s2)
    db.refresh(vendor)

    now = datetime.now(timezone.utc)
    in_range_dt = now - timedelta(days=2)
    out_of_range_dt = now - timedelta(days=40)

    # Helper: Request + Payment + Vendor Outflow
    def create_scenario(created_at, service_id, status, price, profit, txn_id, outflow_amt=0):
        req = models.ServiceRequest(
            user_id=1, service_def_id=service_id, status=status, 
            form_data={}, selling_price=price, profit=profit,
            cost_price=price - profit,
            created_at=created_at
        )
        db.add(req)
        db.flush()
        
        # Add client payment
        if price > 0:
            db.add(models.Transaction(
                transaction_id=txn_id, service_request_id=req.id, user_id=1,
                base_price=price, amount=price, status="Verified", payment_method="Cash",
                created_by_id=1, created_at=created_at
            ))
            
        # Add vendor outflow (Payment)
        if outflow_amt > 0:
            db.add(models.VendorTransaction(
                transaction_id=f"VND-{txn_id}", vendor_id=vendor.id,
                amount=outflow_amt, transaction_type="PAYMENT",
                notes=f"Service Request #{req.id}",
                created_by_id=1, created_at=created_at
            ))
        return req

    # --- 2. POPULATE SCENARIOS ---
    
    # In-Range (Last 7 days):
    # S1: 1 Pending (0 Rev, 0 Profit)
    # S1: 1 Approved (500 Rev, 100 Profit, 50 Outflow)
    # S1: 1 Completed (3000 Rev, 600 Profit, 200 Outflow)
    # S2: 1 Processing (1000 Rev, 200 Profit, 100 Outflow)
    create_scenario(in_range_dt, s1.id, "Pending", 0, 0, "T-IN-1")
    create_scenario(in_range_dt, s1.id, "Approved", 500, 100, "T-IN-2", 50)
    create_scenario(in_range_dt, s1.id, "Completed", 3000, 600, "T-IN-3", 200)
    create_scenario(in_range_dt, s2.id, "Processing", 1000, 200, "T-IN-4", 100)

    # Out-of-Range (Older):
    create_scenario(out_of_range_dt, s1.id, "Completed", 5000, 1000, "T-OUT-1", 500)

    db.commit()

    # --- 3. VERIFY GLOBAL FILTERED ANALYTICS ---
    start_date = (date.today() - timedelta(days=7)).isoformat()
    end_date = date.today().isoformat()
    
    response = client.get(f"/api/v1/analytics/summary?start_date={start_date}&end_date={end_date}", headers=admin_token_headers)
    assert response.status_code == 200
    data = response.json()

    # Row 1 Financials (In-Range only)
    # Revenue: 500 + 3000 + 1000 = 4500
    # Outflow: 50 + 200 + 100 = 350
    # Yield: Strictly 600 (Only S1 Completed)
    assert data["total_revenue"] == 4500.0
    assert data["total_cost"] == 350.0
    assert data["net_profit"] == 600.0

    # Row 2 Workload (In-Range only)
    assert data["pending_requests_count"] == 1
    assert data["approved_requests_count"] == 1
    assert data["processing_requests_count"] == 1 # Just S2-Processing
    assert data["completed_requests_count"] == 1  # Just S1-Completed

    # --- 4. VERIFY SERVICE-SPECIFIC FILTERING ---
    # Filter by S1 only
    response = client.get(f"/api/v1/analytics/summary?start_date={start_date}&end_date={end_date}&service_id={s1.id}", headers=admin_token_headers)
    data = response.json()

    # Financials (S1 + In-Range)
    # Revenue: 500 + 3000 = 3500
    # Outflow: 50 + 200 = 250
    # Yield: 600 (Only S1 Completed)
    assert data["total_revenue"] == 3500.0
    assert data["total_cost"] == 250.0
    assert data["net_profit"] == 600.0
    
    # Workload (S1 + In-Range)
    assert data["total_requests_count"] == 3 # Total in-range for S1: Pending, Approved, Completed
    assert data["completed_requests_count"] == 1

    # --- 5. VERIFY SERVICE PERFORMANCE GRID DATA ---
    s1_stat = next(s for s in data["service_stats"] if s["service_id"] == s1.id)
    assert s1_stat["revenue"] == 3500.0
    assert s1_stat["profit"] == 600.0
    assert s1_stat["request_count"] == 3
    assert s1_stat["pending_count"] == 1
    assert s1_stat["completed_count"] == 1
