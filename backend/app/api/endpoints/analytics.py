from typing import Any, Dict, List, Optional
from datetime import date, datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, cast, Date, desc, or_, String

from app.api import dependencies
from app import schemas, models
from app.core.finance import finance_service

router = APIRouter()

def _is_attributed_to_staff(request, staff_name: str) -> bool:
    if not request.form_data:
        return False
    for val in request.form_data.values():
        if isinstance(val, str) and (val == staff_name or val.startswith(f"{staff_name} (")):
            return True
    return False

@router.get("/summary", response_model=schemas.AnalyticsSummary)
def get_analytics_summary(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    staff_id: Optional[int] = None,
    service_id: Optional[int] = None,
    category: Optional[str] = None,
    is_public: Optional[bool] = None,
    db: Session = Depends(dependencies.get_db),
    current_user = Depends(dependencies.require_permission("analytics.view_dashboard")),
):
    """
    Unified Dashboard Summary: Aggregates revenue, costs, debt, and trends using FinanceService.
    Supports granular filtering by Staff, Service, and Category.
    """
    start_dt = datetime.combine(start_date, datetime.min.time()).replace(tzinfo=timezone.utc) if start_date else None
    end_dt = datetime.combine(end_date, datetime.max.time()).replace(tzinfo=timezone.utc) if end_date else None

    # 2. Base Query for Filtered Analytics (KPIs and Charts)
    active_statuses = ["Pending", "Approved", "Verifying Information", "Service on Hold", "Processing", "In Transit", "Received at Warehouse", "Out for Delivery", "Completed", "Payment Verified"]
    query = db.query(models.ServiceRequest).join(models.ServiceDefinition).filter(models.ServiceRequest.status.in_(active_statuses))
    
    if start_date:
        query = query.filter(models.ServiceRequest.created_at >= start_date)
    if end_date:
        query = query.filter(models.ServiceRequest.created_at < end_date + timedelta(days=1))
    
    if service_id:
        query = query.filter(models.ServiceRequest.service_def_id == service_id)
    if category:
        query = query.filter(models.ServiceDefinition.category == category)
    if is_public is not None:
        query = query.filter(models.ServiceDefinition.is_public == is_public)
        
    requests = query.all()

    # Base Query for Period-based Workload Stats
    period_query = db.query(models.ServiceRequest).join(models.ServiceDefinition).filter(models.ServiceRequest.status != "Cancelled")
    if start_date:
        period_query = period_query.filter(models.ServiceRequest.created_at >= start_date)
    if end_date:
        period_query = period_query.filter(models.ServiceRequest.created_at < end_date + timedelta(days=1))
    if service_id:
        period_query = period_query.filter(models.ServiceRequest.service_def_id == service_id)
    if category:
        period_query = period_query.filter(models.ServiceDefinition.category == category)
    if is_public is not None:
        period_query = period_query.filter(models.ServiceDefinition.is_public == is_public)
    
    period_reqs = period_query.all()

    # 2.1 Staff Filtering for cards and charts
    if staff_id:
        staff_user = db.query(models.User).filter(models.User.id == staff_id).first()
        if staff_user:
            staff_name = staff_user.full_name
            requests = [r for r in requests if _is_attributed_to_staff(r, staff_name)]
            period_reqs = [r for r in period_reqs if _is_attributed_to_staff(r, staff_name)]

    # 3. Calculate Core Stats based on filtered requests
    yield_statuses = ["Completed"]
    
    total_revenue = 0.0
    total_cost = 0.0
    net_profit = 0.0
    
    # 3.1 Loop through requests to attribute revenue/cost/profit accurately
    for r in requests:
        # A. Revenue from Transactions
        svc_rev = 0.0
        is_payout_service = False
        
        # Check if this service is a Payout type (Staff Settlement, Expenses)
        if r.financial_breakdown:
            for item in r.financial_breakdown:
                if isinstance(item, dict) and item.get("type") == "PAYMENT":
                    is_payout_service = True
                    break
        
        # Sum verified transactions
        verified_txns_sum = sum(t.amount for t in r.transactions if t.status == "Verified" and t.amount > 0)
        
        if is_payout_service:
            # For payout services (Expenses), verified transactions are actually OUTFLOW from Cash
            # We subtract them from revenue logic
            svc_rev = -verified_txns_sum
        else:
            svc_rev = verified_txns_sum
            
        total_revenue += svc_rev
        
        # B. Vendor Outflow (Specific Payments)
        ref_note = f"Service Request #{r.id}"
        outflow = db.query(func.sum(models.VendorTransaction.amount)).filter(
            models.VendorTransaction.transaction_type == "PAYMENT",
            models.VendorTransaction.notes.contains(ref_note)
        ).scalar() or 0.0
        total_cost += float(outflow)

        # C. Net Yield (Accrued Profit for completed requests only)
        if r.status in yield_statuses:
            net_profit += (r.profit or 0.0)

    # Only use global optimized SQL if NO filters are present
    if not service_id and not staff_id and not category and is_public is None:
        # (The existing optimized global logic for public/internal revenue goes here)
        # However, for simplicity and ensuring correctness during the overhaul, 
        # let's rely on the attribution loop above which is accurate for all cases.
        # If performance becomes an issue, we can re-enable specialized global queries.
        pass

    # Global Workload Metrics (Derived from period_reqs)
    # We remove the .is_public check here because the period_reqs is already filtered by is_public if requested
    pending_count = sum(1 for r in period_reqs if r.status == "Pending")
    approved_count = sum(1 for r in period_reqs if r.status == "Approved")
    processing_count = sum(1 for r in period_reqs if r.status in ["Processing", "In Transit", "Received at Warehouse", "Out for Delivery", "Service on Hold", "Verifying Information"])
    completed_count = sum(1 for r in period_reqs if r.status == "Completed")
    
    # Verifications (Transactions created in period awaiting approval)
    if service_id or staff_id or category or is_public is not None:
        verifications_count = 0
        for r in period_reqs:
            verifications_count += sum(1 for t in r.transactions if t.status == "Pending")
    else:
        v_query = db.query(models.Transaction).filter(models.Transaction.status == "Pending")
        if start_dt: v_query = v_query.filter(models.Transaction.created_at >= start_dt)
        if end_dt: v_query = v_query.filter(models.Transaction.created_at <= end_dt)
        verifications_count = v_query.count()

    # Debt is global (Vendor balance)
    total_debt = finance_service.get_total_debt(db)

    # 4. Service Stats (KPI Cards Data)
    # This query drives the Service Performance grid and Trends
    active_statuses = ["Pending", "Approved", "Verifying Information", "Service on Hold", "Processing", "In Transit", "Received at Warehouse", "Out for Delivery", "Completed", "Payment Verified"]
    query = db.query(models.ServiceRequest).filter(models.ServiceRequest.status.in_(active_statuses))
    
    if start_date:
        query = query.filter(models.ServiceRequest.created_at >= start_date)
    if end_date:
        query = query.filter(models.ServiceRequest.created_at < end_date + timedelta(days=1))
    
    if service_id:
        query = query.filter(models.ServiceRequest.service_def_id == service_id)
        
    requests = query.all()

    # Period-based Workload Stats for Service Cards
    period_query = db.query(models.ServiceRequest).filter(models.ServiceRequest.status != "Cancelled")
    if start_date:
        period_query = period_query.filter(models.ServiceRequest.created_at >= start_date)
    if end_date:
        period_query = period_query.filter(models.ServiceRequest.created_at < end_date + timedelta(days=1))
    if service_id:
        period_query = period_query.filter(models.ServiceRequest.service_def_id == service_id)
    
    period_reqs = period_query.all()

    # 2.1 Staff Filtering for cards and charts
    if staff_id:
        staff_user = db.query(models.User).filter(models.User.id == staff_id).first()
        if staff_user:
            staff_name = staff_user.full_name
            requests = [r for r in requests if _is_attributed_to_staff(r, staff_name)]
            period_reqs = [r for r in period_reqs if _is_attributed_to_staff(r, staff_name)]

    # 4. Service Stats (KPI Cards Data)
    all_services = db.query(models.ServiceDefinition).all()
    service_stats_map = {
        s.id: {
            "id": s.id, 
            "name": s.name, 
            "slug": s.slug,
            "category": s.category,
            "revenue": 0.0, 
            "profit": 0.0, 
            "total": 0,
            "pending": 0,
            "processing": 0,
            "completed": 0,
            "pending_weight": 0.0,
            "pending_cartons": 0,
            "completed_weight": 0.0,
            "staff": [u.full_name for u in s.assigned_staff],
            "is_active": s.is_active,
            "is_public": s.is_public,
            "is_available": s.is_available
        } for s in all_services
    }
    
    # Financials (Period-based)
    for r in requests:
        s_id = r.service_def_id
        if s_id in service_stats_map:
            # Service level revenue also follows verified transactions
            svc_revenue = sum(t.amount for t in r.transactions if t.status == "Verified" and t.amount > 0)
            service_stats_map[s_id]["revenue"] += svc_revenue
            # Profit only for yield statuses
            if r.status in yield_statuses:
                service_stats_map[s_id]["profit"] += (r.profit or 0.0)
            
            # Cargo Specific Metrics (Status Sensitive)
            if service_stats_map[s_id]["slug"] == "cargo-service" and r.form_data:
                if r.status == "Pending":
                    service_stats_map[s_id]["pending_weight"] += float(r.form_data.get("weight_kg") or 0)
                    service_stats_map[s_id]["pending_cartons"] += int(r.form_data.get("carton_count") or 0)
                elif r.status == "Completed":
                    service_stats_map[s_id]["completed_weight"] += float(r.form_data.get("weight_kg") or 0)
                
    # Workload Metrics (Period-based) for cards
    for r in period_reqs:
        s_id = r.service_def_id
        if s_id in service_stats_map:
            service_stats_map[s_id]["total"] += 1
            if r.status == "Pending":
                service_stats_map[s_id]["pending"] += 1
            elif r.status in ["Approved", "Verifying Information", "Processing", "In Transit", "Received at Warehouse", "Out for Delivery", "Service on Hold", "Payment Verified"]:
                service_stats_map[s_id]["processing"] += 1
            elif r.status == "Completed":
                service_stats_map[s_id]["completed"] += 1

    service_stats = [
        schemas.ServiceStat(
            service_id=v["id"],
            name=v["name"],
            category=v["category"],
            revenue=v["revenue"],
            profit=v["profit"],
            request_count=v["total"],
            pending_count=v["pending"],
            processing_count=v["processing"],
            completed_count=v["completed"],
            staff_in_charge=v["staff"],
            is_active=v["is_active"],
            is_public=v["is_public"],
            is_available=v["is_available"],
            pending_weight=v["pending_weight"],
            pending_cartons=v["pending_cartons"],
            completed_weight=v["completed_weight"]
        ) for v in service_stats_map.values()
    ]
    service_stats.sort(key=lambda x: x.request_count, reverse=True)

    # 5. Charts Logic
    revenue_by_service = [{"name": s.name, "value": s.revenue} for s in service_stats[:5]]

    debt_by_vendor = []
    if not staff_id and not service_id:
        debt_vendors = db.query(models.Vendor).filter(models.Vendor.current_balance != 0).order_by(desc(func.abs(models.Vendor.current_balance))).limit(5).all()
        debt_by_vendor = [{"name": v.name, "value": v.current_balance} for v in debt_vendors]

    trend_data = {}
    for r in requests:
        d_str = r.created_at.strftime("%Y-%m-%d")
        if d_str not in trend_data:
            trend_data[d_str] = {"revenue": 0.0, "cost": 0.0, "profit": 0.0}
        
        svc_rev = sum(t.amount for t in r.transactions if t.status == "Verified" and t.amount > 0)
        trend_data[d_str]["revenue"] += svc_rev
        trend_data[d_str]["cost"] += (r.cost_price or 0.0)
        if r.status in yield_statuses:
            trend_data[d_str]["profit"] += (r.profit or 0.0)

    revenue_trend = [
        {"date": k, "revenue": v["revenue"], "cost": v["cost"], "profit": v["profit"]}
        for k, v in sorted(trend_data.items())
    ]

    return {
        "total_revenue": total_revenue,
        "total_cost": total_cost,
        "net_profit": net_profit,
        "total_debt": total_debt,
        "total_requests_count": sum(v["total"] for v in service_stats_map.values()),
        "pending_requests_count": pending_count,
        "approved_requests_count": approved_count,
        "processing_requests_count": processing_count,
        "completed_requests_count": sum(v["completed"] for v in service_stats_map.values()),
        "pending_verifications_count": verifications_count,
        "revenue_trend": revenue_trend,
        "revenue_by_service": revenue_by_service,
        "debt_by_vendor": debt_by_vendor,
        "service_stats": service_stats
    }

@router.get("/report", response_model=schemas.CategorizedReport)
def get_categorized_report(
    month: str,
    year: str,
    db: Session = Depends(dependencies.get_db),
    current_user = Depends(dependencies.require_permission("analytics.view_dashboard")),
):
    """
    The Operational Brain: Generates a complete P&L and Staff Performance report for a specific period.
    """
    # 1. Parse Month and Year into a date range
    try:
        month_num = datetime.strptime(month, "%B").month
        start_date = date(int(year), month_num, 1)
        if month_num == 12:
            end_date = date(int(year) + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date(int(year), month_num + 1, 1) - timedelta(days=1)
        
        # Convert to UTC datetime for accurate DB comparison
        start_dt = datetime.combine(start_date, datetime.min.time()).replace(tzinfo=timezone.utc)
        end_dt = datetime.combine(end_date, datetime.max.time()).replace(tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid month or year format.")

    # 2. Fetch all requests for this period 
    active_statuses = ["Approved", "Verifying Information", "Service on Hold", "Processing", "In Transit", "Received at Warehouse", "Out for Delivery", "Completed"]
    query = db.query(models.ServiceRequest).filter(
        models.ServiceRequest.status.in_(active_statuses),
        models.ServiceRequest.created_at >= start_dt,
        models.ServiceRequest.created_at <= end_dt
    )
    requests = query.all()
    
    staff_performance = {}
    
    # Use FinanceService for period-specific numbers
    stats = finance_service.get_summary_stats(db, start_date=start_date, end_date=end_date)
    
    # Internal vs External PNL
    internal_pnl = 0.0
    external_pnl = 0.0
    
    # Initialize Staff Performance Map (Only active staff)
    staff_users = db.query(models.User).join(models.User.roles).filter(models.Role.name != "Client").all()
    for s in staff_users:
        staff_performance[s.id] = {
            "staff_id": s.id,
            "full_name": s.full_name,
            "staff_category": s.staff_category or "Staff",
            "work_office": s.work_office or "General",
            "revenue_generated": 0.0,
            "operational_profit": 0.0, # Temporary tracker
            "category_breakdown": {},
            "operation_count": 0,
            "travel_ticket_costs": 0.0,
            "fixed_costs": 0.0,
            "net_profit": 0.0
        }

    for req in requests:
        is_public = req.service_definition.is_public
        profit = req.profit or 0.0
        
        if is_public:
            external_pnl += profit
        else:
            internal_pnl += profit

        # Staff Attribution: Scan form_data for names
        if req.form_data:
            attributed_staff_ids = []
            for val in req.form_data.values():
                if isinstance(val, str):
                    # Improved attribution check
                    for s_id, perf in staff_performance.items():
                        # Direct match OR label format match
                        if val == perf["full_name"] or val.startswith(f"{perf['full_name']} ("):
                            if s_id not in attributed_staff_ids:
                                attributed_staff_ids.append(s_id)
                                
                                # 1. General Attribution (Revenue & Op Profit)
                                # Only attribute revenue/profit if it's NOT a settlement (settlements are costs)
                                if req.service_definition.slug != "staff-settlement":
                                    perf["revenue_generated"] += (req.selling_price or 0.0)
                                    perf["operational_profit"] += profit
                                    perf["operation_count"] += 1
                                    
                                    cat_name = req.service_definition.category or "General"
                                    perf["category_breakdown"][cat_name] = perf["category_breakdown"].get(cat_name, 0.0) + (req.selling_price or 0.0)

        # 2. Specific Logic for Trading (Ticket Costs)
        if req.service_definition.slug == "internal-trading" and req.financial_breakdown:
             # Find responsible agent again (safest way is to check attribution above, but we can re-scan)
             agent_label = req.form_data.get("agent")
             if agent_label:
                for s_id, perf in staff_performance.items():
                    if agent_label == perf["full_name"] or agent_label.startswith(f"{perf['full_name']} ("):
                        for item in req.financial_breakdown:
                            if item.get("key") == "ticket_cost":
                                perf["travel_ticket_costs"] += (float(item.get("amount", 0)) or 0.0)

        # 3. Specific Logic for Staff Settlement (Fixed Costs)
        if req.service_definition.slug == "staff-settlement" and req.financial_breakdown:
            # Look for sub_items in 'staff_fixed_costs'
            for item in req.financial_breakdown:
                if item.get("key") == "staff_fixed_costs" and item.get("sub_items"):
                    # Attributed to the staff in the form
                    agent_label = req.form_data.get("agent")
                    if agent_label:
                        for s_id, perf in staff_performance.items():
                            if agent_label == perf["full_name"] or agent_label.startswith(f"{perf['full_name']} ("):
                                # Sum all sub-items as Fixed Costs
                                total_fixed = sum((float(sub.get("amount", 0)) or 0.0) for sub in item["sub_items"])
                                perf["fixed_costs"] += total_fixed

    # Format category breakdowns for schema & Calculate Net Profit
    final_staff_perf = []
    for s_id, perf in staff_performance.items():
        # Net Profit = Operational Profit - Fixed Costs
        # (Note: Trading profit already subtracts ticket costs, so we don't subtract ticket costs again)
        perf["net_profit"] = perf["operational_profit"] - perf["fixed_costs"]

        # Only include staff who have activity or are registered
        perf["category_breakdown"] = [
            {"category": k, "revenue": v} for k, v in perf["category_breakdown"].items()
        ]
        # Remove temporary field
        del perf["operational_profit"]
        
        final_staff_perf.append(perf)

    return {
        "month": month,
        "year": year,
        "internal_affairs_pnl": internal_pnl,
        "external_affairs_pnl": external_pnl,
        "staff_performance": final_staff_perf,
        "global_stats": {
            "total_requests": len(requests),
            "net_revenue": stats["total_revenue"],
            "net_profit": stats["net_yield"]
        }
    }

@router.get("/stats", response_model=Dict[str, Any])
def get_analytics_stats(
    db: Session = Depends(dependencies.get_db),
    current_user = Depends(dependencies.require_permission("analytics.view_dashboard")),
):
    """
    Dashboard high-level metrics using unified FinanceService.
    """
    return {
        "total_revenue": finance_service.get_net_revenue(db),
        "pending_requests": db.query(models.ServiceRequest).filter(models.ServiceRequest.status == "Pending").count(),
        "total_staff": db.query(models.User).count()
    }

@router.get("/all-history", response_model=schemas.ListResponse[schemas.UnifiedTransaction])
def get_unified_transaction_history(
    db: Session = Depends(dependencies.get_db),
    skip: int = 0,
    limit: int = 100,
    q: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    transaction_type: Optional[str] = None, # INCOME or EXPENSE
    status: Optional[str] = None,
    payment_method: Optional[str] = None,
    current_user: models.User = Depends(dependencies.require_permission("finance.view_ledger")),
):
    """
    Consolidated history of both Client Payments (INCOME) and Vendor Payments (EXPENSE).
    Sorted by date descending. Excludes Pending client claims.
    """
    # 1. Fetch Client Transactions (Filter out Pending)
    client_query = db.query(models.Transaction).outerjoin(models.Transaction.user)
    
    if status:
        client_query = client_query.filter(models.Transaction.status == status)
    else:
        client_query = client_query.filter(models.Transaction.status.in_(["Verified", "Flagged"]))
    
    if payment_method:
        client_query = client_query.filter(models.Transaction.payment_method == payment_method)

    if start_date:
        client_query = client_query.filter(models.Transaction.created_at >= start_date)
    if end_date:
        client_query = client_query.filter(models.Transaction.created_at < end_date + timedelta(days=1))

    if q:
        search_term = f"%{q}%"
        
        client_conditions = [
            models.Transaction.transaction_id.ilike(search_term),
            models.User.full_name.ilike(search_term),
            models.User.email.ilike(search_term)
        ]
        
        try:
            # Clean up query
            clean_q = q.replace(",", "").strip()
            
            # Support USR- or # prefixes for User ID
            if clean_q.upper().startswith("USR-") or clean_q.startswith("#"):
                user_id_str = clean_q.upper().replace("USR-", "").replace("#", "").lstrip("0")
                if user_id_str.isdigit():
                    client_conditions.append(models.Transaction.user_id == int(user_id_str))
            
            # Support REQ- or # prefixes for Request ID
            if clean_q.upper().startswith("REQ-") or clean_q.startswith("#"):
                req_id_str = clean_q.upper().replace("REQ-", "").replace("#", "").lstrip("0")
                if req_id_str.isdigit():
                    client_conditions.append(models.Transaction.service_request_id == int(req_id_str))

            # Numeric matching for amounts and direct IDs
            num_check = clean_q.replace("#", "")
            if num_check.replace(".", "", 1).isdigit():
                numeric_val = float(num_check)
                
                client_conditions.append(models.Transaction.amount == numeric_val)
                client_conditions.append(models.Transaction.amount == -numeric_val)
                client_conditions.append(models.Transaction.claimed_amount == numeric_val)
                
                if num_check.isdigit():
                    val_int = int(num_check)
                    client_conditions.append(models.Transaction.id == val_int)
                    # ALSO match service_request_id for raw numbers (Fixes Service ID search)
                    client_conditions.append(models.Transaction.service_request_id == val_int)
        except ValueError:
            pass
            
        client_conditions.append(cast(models.Transaction.amount, String).ilike(search_term))
        client_conditions.append(cast(models.Transaction.claimed_amount, String).ilike(search_term))

        client_query = client_query.filter(or_(*client_conditions))

    # 2. Fetch Vendor Transactions (Only actual PAYMENTS)
    from sqlalchemy.orm import joinedload
    vendor_query = db.query(models.VendorTransaction).options(
        joinedload(models.VendorTransaction.vendor),
        joinedload(models.VendorTransaction.created_by)
    ).outerjoin(models.VendorTransaction.vendor).filter(models.VendorTransaction.transaction_type == "PAYMENT")

    # Filter Vendor Transactions by status (Implicitly "Verified")
    if status and status != "Verified":
        # If filtering for Pending/Flagged, exclude vendor transactions as they are always verified
        vendor_query = vendor_query.filter(models.VendorTransaction.id == -1)

    if payment_method:
        # Vendor transactions don't have a structured payment_method field in the same way,
        # but we can check notes or reference_id if needed. 
        # For now, if we filter by method, we might just exclude vendor txns or match "Cash"
        if payment_method == "Cash":
            vendor_query = vendor_query.filter(models.VendorTransaction.reference_id == None)
        else:
            vendor_query = vendor_query.filter(models.VendorTransaction.reference_id != None)

    if start_date:
        vendor_query = vendor_query.filter(models.VendorTransaction.created_at >= start_date)
    if end_date:
        vendor_query = vendor_query.filter(models.VendorTransaction.created_at < end_date + timedelta(days=1))

    if q:
        search_term = f"%{q}%"
        
        vendor_conditions = [
            models.VendorTransaction.transaction_id.ilike(search_term),
            models.Vendor.name.ilike(search_term),
            models.VendorTransaction.notes.ilike(search_term)
        ]
        
        try:
            clean_q = q.replace("#", "").replace(",", "").strip()
            numeric_val = float(clean_q)
            
            vendor_conditions.append(models.VendorTransaction.amount == abs(numeric_val))
            vendor_conditions.append(models.VendorTransaction.claimed_amount == abs(numeric_val))
            vendor_conditions.append(models.VendorTransaction.id == int(numeric_val))
        except ValueError:
            pass
            
        vendor_conditions.append(cast(models.VendorTransaction.amount, String).ilike(search_term))
        vendor_conditions.append(cast(models.VendorTransaction.claimed_amount, String).ilike(search_term))

        vendor_query = vendor_query.filter(or_(*vendor_conditions))

    # Apply type filtering
    client_txns = []
    vendor_txns = []
    
    total_client = 0
    total_vendor = 0
    filtered_client_amount = 0.0
    filtered_vendor_amount = 0.0

    if not transaction_type or transaction_type == "INCOME":
        client_txns = client_query.order_by(desc(models.Transaction.created_at)).limit(limit + skip).all()
        total_client = client_query.count()
        filtered_client_amount = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.id.in_(client_query.with_entities(models.Transaction.id)),
            models.Transaction.status == "Verified"
        ).scalar() or 0.0
        
    if not transaction_type or transaction_type == "EXPENSE":
        vendor_txns = vendor_query.order_by(desc(models.VendorTransaction.created_at)).limit(limit + skip).all()
        total_vendor = vendor_query.count()
        filtered_vendor_amount = db.query(func.sum(models.VendorTransaction.amount)).filter(
            models.VendorTransaction.id.in_(vendor_query.with_entities(models.VendorTransaction.id))
        ).scalar() or 0.0
    
    # 3. Normalize & Merge
    unified = []
    total = total_client + total_vendor
    
    for t in client_txns:
        txn_date = t.created_at
        if txn_date:
            if txn_date.tzinfo is None:
                txn_date = txn_date.replace(tzinfo=timezone.utc)
            else:
                txn_date = txn_date.astimezone(timezone.utc)
        else:
            txn_date = datetime(1970, 1, 1, tzinfo=timezone.utc)
            
        unified.append({
            "id": f"C-{t.id}",
            "date": txn_date,
            "type": "INCOME",
            "category": "Service Payment",
            "reference": t.transaction_id,
            "external_reference": t.client_reference_id,
            "amount": t.amount,
            "status": t.status,
            "claimed_amount": t.claimed_amount,
            "claimed_currency": t.claimed_currency,
            "exchange_rate": t.exchange_rate,
            "payment_method": t.payment_method,
            "actor_name": t.verified_by.full_name if t.verified_by else (t.created_by.full_name if t.created_by else None),
            "notes": t.notes,
            "service_request_id": t.service_request_id,
            "user_id": t.user_id
        })
        
    for vt in vendor_txns:
        t_type = "EXPENSE" if vt.transaction_type == "PAYMENT" else "LIABILITY"
        txn_date = vt.created_at
        if txn_date:
            if txn_date.tzinfo is None:
                txn_date = txn_date.replace(tzinfo=timezone.utc)
            else:
                txn_date = txn_date.astimezone(timezone.utc)
        else:
            txn_date = datetime(1970, 1, 1, tzinfo=timezone.utc)
            
        unified.append({
            "id": f"V-{vt.id}",
            "date": txn_date,
            "type": t_type,
            "category": f"Vendor: {vt.vendor.name if vt.vendor else 'N/A'}",
            "reference": vt.transaction_id or f"VND-{vt.id}",
            "external_reference": vt.reference_id,
            "amount": -vt.amount,
            "status": "Verified",
            "claimed_amount": vt.claimed_amount,
            "claimed_currency": vt.currency,
            "exchange_rate": vt.exchange_rate,
            "payment_method": "Cash" if not vt.reference_id else "Bank/Online", # Infer or leave generic if field missing
            "proof_url": vt.proof_url,
            "actor_name": vt.created_by.full_name if vt.created_by else None,
            "notes": vt.notes
        })
    
    unified.sort(key=lambda x: x["date"], reverse=True)
    
    # Return with summary for the filtered view
    return {
        "items": unified[skip : skip + limit],
        "total": total,
        "summary": {
            "net_profit": float(filtered_client_amount - filtered_vendor_amount)
        }
    }