from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base

class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    contact_person = Column(String)
    phone = Column(String)
    email = Column(String)
    address = Column(Text)
    
    # EXTERNAL (Supplier/Airline) or INTERNAL (Petty Cash/Salary/Delivery)
    type = Column(String, default="EXTERNAL", nullable=False)

    # Running total of what we owe this vendor. 
    # Positive = We owe them. Negative = They owe us (rare).
    current_balance = Column(Float, default=0.0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    transactions = relationship("VendorTransaction", back_populates="vendor", cascade="all, delete-orphan")
    service_requests = relationship("ServiceRequest", back_populates="vendor")
    
    # Relationship to services associated with this vendor
    from app.models.service import service_vendors
    services = relationship("ServiceDefinition", secondary=service_vendors, back_populates="vendors")

class VendorTransaction(Base):
    __tablename__ = "vendor_transactions"

    id = Column(Integer, primary_key=True, index=True)
    # Human-readable ID: VND-YYYYMMDD-XXXX
    transaction_id = Column(String, unique=True, index=True, nullable=False)
    
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    
    # PURCHASE: We bought a service (Debt increases)
    # PAYMENT: We paid the vendor (Debt decreases)
    transaction_type = Column(String, nullable=False) 
    
    amount = Column(Float, nullable=False) # Base Currency (SAR)
    
    # Financial Tracking (Requirement #195)
    reference_id = Column(String, index=True) # External Ref (Bank/Wire ID)
    currency = Column(String, default="SAR")
    exchange_rate = Column(Float, default=1.0)
    claimed_amount = Column(Float, nullable=True) # Original entered amount
    proof_url = Column(String, nullable=True) # Uploaded receipt link
    
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Reference to who recorded this
    created_by_id = Column(Integer, ForeignKey("user.id"))

    vendor = relationship("Vendor", back_populates="transactions")
    created_by = relationship("User")