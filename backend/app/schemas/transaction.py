from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from .user import User

# Minimal schemas for nested display
class ServiceDefinitionSummary(BaseModel):
    name: str
    model_config = ConfigDict(from_attributes=True)

class ServiceRequestSummary(BaseModel):
    id: int
    user_id: int
    service_definition: Optional[ServiceDefinitionSummary] = None
    user: Optional[User] = None
    model_config = ConfigDict(from_attributes=True)

# Shared properties
class TransactionBase(BaseModel):
    payment_method: str = "Cash"
    notes: Optional[str] = None
    discount: float = Field(0.0, ge=0)
    client_reference_id: Optional[str] = None
    claimed_currency: str = "SAR"
    coupon_code: Optional[str] = None

# Properties to receive on creation
class TransactionCreate(TransactionBase):
    service_request_id: int
    amount: float = Field(0.0, ge=0) # This is the RAW amount in claimed_currency
    exchange_rate: Optional[float] = None # Fallback to request rate if None

# Properties for internal reconciliation update
class TransactionReconcile(BaseModel):
    internal_reference_id: Optional[str] = None
    exchange_rate: Optional[float] = None
    amount: Optional[float] = None # New amount in claimed_currency
    claimed_currency: Optional[str] = None

# Properties to receive on client claim
class TransactionClaim(BaseModel):
    service_request_id: int
    payment_method: str
    client_reference_id: Optional[str] = None
    notes: Optional[str] = None
    amount: Optional[float] = Field(None, ge=0)
    currency: str = "SAR"
    exchange_rate: float = 1.0
    coupon_code: Optional[str] = None

class TransactionRefund(BaseModel):
    service_request_id: int
    amount: float = Field(..., ge=0)
    reason: str
    method: str = "Cash"
    currency: str = "SAR"
    exchange_rate: float = 1.0

class TransactionFlag(BaseModel):
    reason: str

# Properties to return to client
class Transaction(TransactionBase):
    id: int
    transaction_id: str
    service_request_id: int
    base_price: float
    amount: float # The converted amount in SAR
    claimed_amount: Optional[float] = None
    exchange_rate: float
    transaction_type: str
    status: str
    coupon_code: Optional[str] = None
    created_at: datetime
    verified_at: Optional[datetime] = None
    internal_reference_id: Optional[str] = None
    
    user_id: Optional[int] = None
    user: Optional[User] = None
    
    created_by: Optional[User] = None
    verified_by: Optional[User] = None
    updated_by: Optional[User] = None
    
    # Include Service Details for Revenue Table
    service_request: Optional[ServiceRequestSummary] = None

    model_config = ConfigDict(from_attributes=True)

class TransactionSummary(BaseModel):
    verified_total: float
    pending_total: float
    refund_total: float
    count_stats: Optional[dict] = None

class TransactionListResponse(BaseModel):
    items: List[Transaction]
    total: int
    summary: TransactionSummary

class TransactionExportRequest(BaseModel):
    start_date: datetime
    end_date: datetime
    format: str = "excel"
    currency: str = "SAR"
    components: List[str] = ["all"]
    scope: str = "both" # "internal", "public", "both"
    service_ids: Optional[List[int]] = None
    sort_order: str = "desc" # "asc" or "desc"