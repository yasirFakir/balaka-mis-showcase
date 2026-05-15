from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base
from app.db.types import EncryptedString

class Transaction(Base):
    __tablename__ = "transaction"

    id = Column(Integer, primary_key=True, index=True)
    # The unique, human-readable receipt ID (e.g., TXN-20250101-0001)
    transaction_id = Column(String, unique=True, index=True, nullable=False)
    
    service_request_id = Column(Integer, ForeignKey("service_request.id"), nullable=False)
    
    # Financials
    base_price = Column(Float, nullable=False)
    discount = Column(Float, default=0.0)
    amount = Column(Float, nullable=False) # Final amount = base_price - discount
    
    # Multi-Currency Support
    exchange_rate = Column(Float, default=1.0, nullable=False)
    claimed_amount = Column(Float, nullable=True) # The raw amount entered by the user (SAR or BDT)
    claimed_currency = Column(String, default="SAR", nullable=False)
    
    # "Cash", "Bank Transfer", "Online" (Future Gateway)
    payment_method = Column(String, nullable=False)
    
    # Reference IDs for reconciliation
    client_reference_id = Column(EncryptedString, nullable=True, index=True)
    internal_reference_id = Column(EncryptedString, nullable=True, index=True)
    
    # Track coupon used in this transaction
    coupon_code = Column(String, nullable=True)
    
    # "Payment", "Refund", "Adjustment"
    transaction_type = Column(String, default="Payment", nullable=False)
    
    # Ownership
    user_id = Column(Integer, ForeignKey("user.id"), nullable=True) # Direct link to customer
    
    # "Pending", "Verified", "Rejected"
    status = Column(String, default="Pending", index=True)
    
    notes = Column(EncryptedString, nullable=True)
    
    # Audit Trail
    created_by_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    verified_by_id = Column(Integer, ForeignKey("user.id"), nullable=True)
    updated_by_id = Column(Integer, ForeignKey("user.id"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    verified_at = Column(DateTime(timezone=True), nullable=True)

    service_request = relationship("ServiceRequest", back_populates="transactions")
    user = relationship("User", foreign_keys=[user_id], backref="transactions")
    created_by = relationship("User", foreign_keys=[created_by_id])
    verified_by = relationship("User", foreign_keys=[verified_by_id])
    updated_by = relationship("User", foreign_keys=[updated_by_id])