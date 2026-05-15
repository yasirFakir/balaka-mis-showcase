from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime, timedelta, timezone
from typing import Optional, Dict, Any, List, Union
from app import models

import httpx
import json

# --- Financial Constants ---
FINANCIAL_ACTIVE_STATUSES = [
    "Payment Verified",
    "Service on Hold", 
    "Processing", 
    "In Transit", 
    "Received at Warehouse", 
    "Out for Delivery", 
    "Completed"
]

class FinanceService:
    """
    The Single Source of Truth for Balaka MIS Financials.
    Centralizes all calculation rules to ensure consistency between Dashboard, Ledger, and Reports.
    """

    async def get_exchange_rate(self, db: Session) -> float:
        """
        Fetches current SAR to BDT rate with multi-provider fallback and DB caching (1 hour).
        Supports manual overrides for stability during testing or volatility.
        """
        from app.models.system import SystemSetting
        
        # 0. Check Manual Override
        try:
            manual_enabled = db.query(SystemSetting).filter(SystemSetting.key == "currency_manual_enabled").first()
            if manual_enabled and manual_enabled.value_bool:
                manual_rate = db.query(SystemSetting).filter(SystemSetting.key == "currency_manual_rate").first()
                if manual_rate and manual_rate.value_float:
                    return manual_rate.value_float
        except Exception as e:
            print(f"Currency Manual Check Error: {e}")

        cache_key = "cached_currency_rate_sar_bdt"
        cache_time_key = "cached_currency_rate_last_sync"
        fallback_rate = 32.0

        # 1. Check Cache
        try:
            cached_rate = db.query(SystemSetting).filter(SystemSetting.key == cache_key).first()
            cached_time = db.query(SystemSetting).filter(SystemSetting.key == cache_time_key).first()

            if cached_rate and cached_time and cached_time.value_str:
                last_sync = datetime.fromisoformat(cached_time.value_str)
                # Check if cache is fresh (1 hour)
                if datetime.now(timezone.utc) - last_sync.replace(tzinfo=timezone.utc) < timedelta(hours=1):
                    if cached_rate.value_float and cached_rate.value_float > 1.0:
                        return cached_rate.value_float
        except Exception as e:
            print(f"Currency Cache Read Error: {e}")
            cached_rate = None
            cached_time = None

        # 2. Try Multiple Providers
        providers = [
            "https://open.er-api.com/v6/latest/SAR", # reliable
            "https://api.exchangerate-api.com/v4/latest/SAR",
            "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/sar.json"
        ]

        new_rate = None
        for url in providers:
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    response = await client.get(url)
                    if response.status_code == 200:
                        data = response.json()
                        # Extract rate based on provider format
                        if "rates" in data: # er-api and exchangerate-api
                            new_rate = data["rates"].get("BDT")
                        elif "sar" in data: # fawazahmed0
                            new_rate = data["sar"].get("bdt")
                        
                        if new_rate and new_rate > 1.0:
                            new_rate = round(new_rate, 2) # Enforce clean precision
                            print(f"Currency Synced: 1 SAR = {new_rate} BDT (via {url})")
                            break
            except Exception as e:
                print(f"Currency Provider Error ({url}): {e}")

        # 3. Update Cache if successful
        if new_rate:
            try:
                if not cached_rate:
                    cached_rate = SystemSetting(key=cache_key, value_float=new_rate)
                    db.add(cached_rate)
                else:
                    cached_rate.value_float = new_rate
                
                now_str = datetime.now(timezone.utc).isoformat()
                if not cached_time:
                    cached_time = SystemSetting(key=cache_time_key, value_str=now_str)
                    db.add(cached_time)
                else:
                    cached_time.value_str = now_str
                
                db.commit()
                return new_rate
            except Exception as e:
                print(f"Currency Cache Write Error: {e}")
                db.rollback()
                return new_rate

        # 4. Final Fallback to stale cache or hardcoded
        return cached_rate.value_float if cached_rate and cached_rate.value_float else fallback_rate

    def _ensure_aware(self, dt: Union[date, datetime, None], end_of_day: bool = False) -> Optional[datetime]:
        if dt is None:
            return None
        if isinstance(dt, date) and not isinstance(dt, datetime):
            if end_of_day:
                dt = datetime.combine(dt, datetime.max.time())
            else:
                dt = datetime.combine(dt, datetime.min.time())
        
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt

    def get_verified_revenue(self, db: Session, start_date: Optional[Union[date, datetime]] = None, end_date: Optional[Union[date, datetime]] = None) -> float:
        """Verified Income: Only transactions marked as 'Verified' and are positive."""
        start_dt = self._ensure_aware(start_date)
        end_dt = self._ensure_aware(end_date, end_of_day=True)

        query = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.status == "Verified",
            models.Transaction.amount > 0
        )
        if start_dt: query = query.filter(models.Transaction.created_at >= start_dt)
        if end_dt: query = query.filter(models.Transaction.created_at <= end_dt)
        return float(query.scalar() or 0.0)

    def get_pending_revenue(self, db: Session) -> float:
        """Unverified Income: Claims awaiting admin approval."""
        return float(db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.status == "Pending",
            models.Transaction.amount > 0
        ).scalar() or 0.0)

    def get_verified_refunds(self, db: Session, start_date: Optional[Union[date, datetime]] = None, end_date: Optional[Union[date, datetime]] = None) -> float:
        """Total reversals/refunds processed (Verified and negative)."""
        start_dt = self._ensure_aware(start_date)
        end_dt = self._ensure_aware(end_date, end_of_day=True)

        query = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.status == "Verified",
            models.Transaction.amount < 0
        )
        if start_dt: query = query.filter(models.Transaction.created_at >= start_dt)
        if end_dt: query = query.filter(models.Transaction.created_at <= end_dt)
        return abs(float(query.scalar() or 0.0))

    def get_net_revenue(self, db: Session, start_date: Optional[Union[date, datetime]] = None, end_date: Optional[Union[date, datetime]] = None) -> float:
        """Net Revenue: Verified Income minus Verified Refunds."""
        revenue = self.get_verified_revenue(db, start_date, end_date)
        refunds = self.get_verified_refunds(db, start_date, end_date)
        return revenue - refunds

    def get_operational_costs(self, db: Session, start_date: Optional[Union[date, datetime]] = None, end_date: Optional[Union[date, datetime]] = None) -> float:
        """COGS: Total cost_price incurred from active/completed service requests."""
        start_dt = self._ensure_aware(start_date)
        end_dt = self._ensure_aware(end_date, end_of_day=True)

        query = db.query(func.sum(models.ServiceRequest.cost_price)).filter(
            models.ServiceRequest.status.in_(FINANCIAL_ACTIVE_STATUSES)
        )
        if start_dt: query = query.filter(models.ServiceRequest.created_at >= start_dt)
        if end_dt: query = query.filter(models.ServiceRequest.created_at <= end_dt)
        return float(query.scalar() or 0.0)

    def get_total_debt(self, db: Session) -> float:
        """Outstanding Payables: Total balance across all vendors."""
        return float(db.query(func.sum(models.Vendor.current_balance)).scalar() or 0.0)

    def get_vendor_transaction_summary(self, db: Session) -> Dict[str, float]:
        """Calculates total purchases, payments, and net liability across all vendors."""
        total_purchase = db.query(func.sum(models.VendorTransaction.amount)).filter(models.VendorTransaction.transaction_type == "PURCHASE").scalar() or 0.0
        total_payment = db.query(func.sum(models.VendorTransaction.amount)).filter(models.VendorTransaction.transaction_type == "PAYMENT").scalar() or 0.0
        return {
            "total_purchase": float(total_purchase),
            "total_payment": float(total_payment),
            "net_liability": float(total_purchase - total_payment)
        }

    def get_revenue_by_category(self, db: Session) -> List[Dict[str, Any]]:
        """Breakdown of verified income by service category."""
        results = db.query(
            models.ServiceDefinition.category,
            func.sum(models.Transaction.amount).label("revenue")
        ).join(
            models.ServiceRequest, models.ServiceRequest.service_def_id == models.ServiceDefinition.id
        ).join(
            models.Transaction, models.Transaction.service_request_id == models.ServiceRequest.id
        ).filter(
            models.Transaction.status == "Verified"
        ).group_by(
            models.ServiceDefinition.category
        ).all()
        
        return [{"name": r.category or "Uncategorized", "value": float(r.revenue)} for r in results]

    def get_accrued_profit(self, db: Session, start_date: Optional[Union[date, datetime]] = None, end_date: Optional[Union[date, datetime]] = None) -> float:
        """Accrued Profit: Sum of (Selling Price - Cost Price) for active requests."""
        start_dt = self._ensure_aware(start_date)
        end_dt = self._ensure_aware(end_date, end_of_day=True)

        query = db.query(func.sum(models.ServiceRequest.profit)).filter(
            models.ServiceRequest.status.in_(FINANCIAL_ACTIVE_STATUSES)
        )
        if start_dt: query = query.filter(models.ServiceRequest.created_at >= start_dt)
        if end_dt: query = query.filter(models.ServiceRequest.created_at <= end_dt)
        return float(query.scalar() or 0.0)

    def get_summary_stats(self, db: Session, start_date: Optional[date] = None, end_date: Optional[date] = None) -> Dict[str, float]:
        """Returns a unified financial summary."""
        net_revenue = self.get_net_revenue(db, start_date, end_date)
        cost = self.get_operational_costs(db, start_date, end_date)
        debt = self.get_total_debt(db)
        accrued_profit = self.get_accrued_profit(db, start_date, end_date)
        
        return {
            "total_revenue": net_revenue,
            "total_cost": cost,
            "net_yield": accrued_profit,
            "total_debt": debt
        }

    def run_diagnostics(self, db: Session) -> str:
        """
        Technical CLI Output: Generates a human-readable financial health report.
        """
        revenue = self.get_verified_revenue(db)
        pending = self.get_pending_revenue(db)
        refunds = self.get_verified_refunds(db)
        cost = self.get_operational_costs(db)
        debt = self.get_total_debt(db)
        
        report = []
        report.append("="*50)
        report.append(f"GONIA FINANCIAL DIAGNOSTICS - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("="*50)
        report.append(f"VERIFIED REVENUE (IN)  : SR {revenue:12.2f}")
        report.append(f"VERIFIED REFUNDS (OUT) : SR {refunds:12.2f}")
        report.append(f"PENDING CLAIMS         : SR {pending:12.2f}")
        report.append("-" * 50)
        report.append(f"LIQUID CASH BALANCE    : SR {(revenue - refunds):12.2f}")
        report.append(f"OPERATIONAL COST (COGS): SR {cost:12.2f}")
        report.append(f"OUTSTANDING DEBT       : SR {debt:12.2f}")
        report.append("-" * 50)
        report.append(f"NET SYSTEM YIELD       : SR {(revenue - refunds - cost):12.2f}")
        report.append("="*50)
        
        return "\n".join(report)

finance_service = FinanceService()