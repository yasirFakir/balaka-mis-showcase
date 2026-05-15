from typing import Any, Dict, Optional, List
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from .service import ServiceDefinition
from .user import User
from .status_history import StatusHistory

class SubItem(BaseModel):
    label: str
    amount: float = Field(ge=0)

class FinancialBreakdownItem(BaseModel):
    label: str
    amount: float = Field(ge=0)
    type: str # INCOME, EXPENSE, DISCOUNT, or PAYMENT
    source: Optional[str] = None
    vendor_id: Optional[int] = None
    sub_items: Optional[List[SubItem]] = None
    key: Optional[str] = None

# Shared properties
class ServiceRequestBase(BaseModel):
    service_def_id: int
    form_data: Dict[str, Any]
    quantity: int = 1
    variant_id: Optional[int] = None

# Properties to receive on creation
class ServiceRequestCreate(ServiceRequestBase):
    # Administrative Overrides (Optional, used by Staff/Admins for walk-ins)
    user_id: Optional[int] = None
    status: Optional[str] = "Pending"
    cost_price: Optional[float] = Field(None, ge=0)
    selling_price: Optional[float] = Field(None, ge=0)
    vendor_id: Optional[int] = None
    financial_breakdown: Optional[List[FinancialBreakdownItem]] = None
    currency: Optional[str] = None
    exchange_rate: Optional[float] = None
    
    # Direct Payment Recording (Optional)
    payment_amount: Optional[float] = None
    payment_method: Optional[str] = None
    payment_reference: Optional[str] = None

# Properties to receive on update (e.g. status change)
class ServiceRequestUpdate(BaseModel):
    status: Optional[str] = None
    form_data: Optional[Dict[str, Any]] = None
    rejection_reason: Optional[str] = None
    
    # Financial fields for Admin updates
    vendor_id: Optional[int] = None
    cost_price: Optional[float] = Field(None, ge=0)
    selling_price: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = None
    exchange_rate: Optional[float] = Field(None, ge=0)
    financial_breakdown: Optional[List[FinancialBreakdownItem]] = None

# Specific schema for processing a request (assigning vendor/cost)
class ServiceRequestProcess(BaseModel):
    vendor_id: int
    cost_price: float = Field(ge=0)
    status: str = "Processing"

# Properties to return to client
class ServiceRequest(ServiceRequestBase):
    id: int
    readable_id: Optional[str] = None
    user_id: int
    status: str
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Financials
    vendor_id: Optional[int] = None
    cost_price: float = 0.0
    selling_price: float = 0.0
    profit: float = 0.0
    
    # Paid and Due (Calculated fields for UI)
    paid_amount: float = 0.0
    balance_due: float = 0.0
    
    currency: str = "SAR"
    exchange_rate: float = 1.0
    financial_breakdown: Optional[List[Dict[str, Any]]] = None
    
    service_definition: Optional[ServiceDefinition] = None
    user: Optional[User] = None
    created_by: Optional[User] = None
    updated_by: Optional[User] = None
    status_history: List[StatusHistory] = []

    model_config = ConfigDict(from_attributes=True)