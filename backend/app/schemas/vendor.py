from typing import Optional, List
from pydantic import BaseModel, ConfigDict, field_validator
from datetime import datetime
from app.core.validation_constants import ACCEPTED_EMAIL_DOMAINS

# Import User schema for nested relationships
from app.schemas.user import User

# Vendor Schemas (Defined first to use in Transaction)
class VendorBase(BaseModel):
    name: str
    type: str = "EXTERNAL"
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email_domain(cls, v: Optional[str]) -> Optional[str]:
        if v and "@" in v:
            domain = v.split("@")[-1].lower()
            if domain not in ACCEPTED_EMAIL_DOMAINS:
                raise ValueError(f"Email domain '{domain}' is not allowed. Please use a trusted provider.")
        return v

class VendorCreate(VendorBase):
    pass

class VendorUpdate(VendorBase):
    name: Optional[str] = None
    type: Optional[str] = None

class Vendor(VendorBase):
    id: int
    current_balance: float
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# Vendor Transaction Schemas
class VendorTransactionBase(BaseModel):
    amount: float
    transaction_type: str # PURCHASE, PAYMENT
    reference_id: Optional[str] = None
    currency: str = "SAR"
    exchange_rate: float = 1.0
    claimed_amount: Optional[float] = None
    proof_url: Optional[str] = None
    notes: Optional[str] = None

class VendorPaymentRequest(BaseModel):
    amount: float
    reference_id: str # Mandatory for payments
    currency: str = "SAR"
    exchange_rate: float = 1.0
    proof_url: Optional[str] = None
    notes: Optional[str] = None

class VendorTransactionCreate(VendorTransactionBase):
    vendor_id: int

class VendorTransaction(VendorTransactionBase):
    id: int
    transaction_id: str
    vendor_id: int
    created_at: Optional[datetime] = None
    created_by_id: Optional[int] = None
    created_by: Optional[User] = None

    model_config = ConfigDict(from_attributes=True)

class VendorTransactionWithVendor(VendorTransaction):
    vendor: Optional[Vendor] = None

class VendorWithHistory(Vendor):
    transactions: List[VendorTransaction] = []

class VendorTransactionSummary(BaseModel):
    total_purchase: float
    total_payment: float
    net_liability: float

class VendorTransactionListResponse(BaseModel):
    items: List[VendorTransactionWithVendor]
    total: int
    summary: VendorTransactionSummary
