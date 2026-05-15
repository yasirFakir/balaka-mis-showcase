from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base

class ServiceRequest(Base):
    __tablename__ = "service_request"

    id = Column(Integer, primary_key=True, index=True)
    readable_id = Column(String, unique=True, index=True, nullable=True) # E.g. TKT-0001
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    service_def_id = Column(Integer, ForeignKey("service_definition.id"), nullable=False)
    
    # Financial fields for Commerce/ERP tracking
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    variant_id = Column(Integer, ForeignKey("service_variants.id"), nullable=True)
    cost_price = Column(Float, default=0.0) # What we pay vendor
    selling_price = Column(Float, default=0.0) # What user pays us (at time of purchase)
    profit = Column(Float, default=0.0)
    coupon_code = Column(String, nullable=True)
    currency = Column(String, default="SAR", nullable=False)
    exchange_rate = Column(Float, default=1.0, nullable=False)
    
    # Stores the Actuals:
    # [{"label": "Packaging", "type": "EXPENSE", "amount": 50, "vendor_id": 2}]
    financial_breakdown = Column(JSON, nullable=True)
    
    # New: Tracking Quantity/Units
    quantity = Column(Integer, default=1)

    # Status of the application (e.g., Pending, Processing, Approved, Rejected)
    status = Column(String, default="Pending", index=True)
    rejection_reason = Column(String, nullable=True)
    
    # The actual data filled by the user, validating against ServiceDefinition.form_schema
    form_data = Column(JSON, nullable=False)
    
    # Audit Trail
    created_by_id = Column(Integer, ForeignKey("user.id"), nullable=True)
    updated_by_id = Column(Integer, ForeignKey("user.id"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", foreign_keys=[user_id], backref="service_requests")
    created_by = relationship("User", foreign_keys=[created_by_id])
    updated_by = relationship("User", foreign_keys=[updated_by_id])
    service_definition = relationship("ServiceDefinition")
    variant = relationship("ServiceVariant")
    vendor = relationship("Vendor", back_populates="service_requests")
    status_history = relationship("StatusHistory", back_populates="service_request", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="service_request", cascade="all, delete-orphan")