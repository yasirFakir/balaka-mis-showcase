from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict
from datetime import date, datetime

# Backward compatibility aliases
class ChartPoint(BaseModel):
    name: str
    value: float

class TimeSeriesPoint(BaseModel):
    date: str
    revenue: float
    cost: float
    profit: float

class ServiceStat(BaseModel):
    service_id: int
    name: str
    category: Optional[str] = None
    revenue: float
    profit: float
    request_count: int
    pending_count: int
    processing_count: int
    completed_count: int
    staff_in_charge: List[str]
    is_active: bool = True
    is_public: bool = True
    is_available: bool = True
    pending_weight: Optional[float] = 0.0
    pending_cartons: Optional[int] = 0
    completed_weight: Optional[float] = 0.0

class RevenueTrend(TimeSeriesPoint): # Keep internal consistency
    pass

class CategoryStat(ChartPoint): # Keep internal consistency
    pass

class AnalyticsSummary(BaseModel):
    total_revenue: float
    total_cost: float
    net_profit: float
    total_debt: float
    # Workload Stats
    total_requests_count: int
    pending_requests_count: int
    approved_requests_count: int
    processing_requests_count: int
    completed_requests_count: int
    pending_verifications_count: int
    # Charts
    revenue_trend: List[TimeSeriesPoint]
    revenue_by_service: List[ChartPoint]
    debt_by_vendor: List[ChartPoint]
    # Detailed Stats
    service_stats: List[ServiceStat]

class UnifiedTransaction(BaseModel):
    id: str
    date: datetime
    type: str # INCOME / EXPENSE / LIABILITY
    category: str
    reference: str
    external_reference: Optional[str] = None
    amount: float
    status: str
    
    # Detail fields for Deep Dive Modal
    payment_method: Optional[str] = None
    claimed_amount: Optional[float] = None
    claimed_currency: Optional[str] = None
    exchange_rate: Optional[float] = None
    proof_url: Optional[str] = None
    actor_name: Optional[str] = None
    notes: Optional[str] = None
    service_request_id: Optional[int] = None
    user_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

# --- NEW: Categorized Performance Schemas ---

class StaffCategoryRevenue(BaseModel):
    category: str
    revenue: float

class StaffPerformanceReport(BaseModel):
    staff_id: int
    full_name: str
    staff_category: str
    work_office: str
    revenue_generated: float
    category_breakdown: List[StaffCategoryRevenue]
    operation_count: int
    travel_ticket_costs: float
    fixed_costs: float
    net_profit: float 

class CategorizedReport(BaseModel):
    month: str
    year: str
    internal_affairs_pnl: float
    external_affairs_pnl: float
    staff_performance: List[StaffPerformanceReport]
    global_stats: Dict[str, Any]