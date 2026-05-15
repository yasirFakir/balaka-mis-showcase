from sqlalchemy import Column, Integer, String, Boolean, Float, Text, DateTime, ForeignKey, JSON, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base

# Many-to-Many Association for Services and Vendors
service_vendors = Table(
    "service_vendors",
    Base.metadata,
    Column("service_id", Integer, ForeignKey("service_definition.id"), primary_key=True),
    Column("vendor_id", Integer, ForeignKey("vendors.id"), primary_key=True)
)

class ServiceDefinition(Base):
    __tablename__ = "service_definition"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    name_bn = Column(String, nullable=True) # Bengali Translation
    category = Column(String, index=True, nullable=True) # E.g. "Cargo Service", "Ticket Service", etc.
    code_prefix = Column(String(10), nullable=True) # E.g. TKT, CRG
    tags = Column(JSON, nullable=True) # List of tags: ["Ticket", "Visa"]
    description = Column(Text, nullable=True)
    description_bn = Column(Text, nullable=True) # Bengali Translation
    image_url = Column(String, nullable=True)
    base_price = Column(Float, default=0.0)
    currency = Column(String, default="SAR", nullable=False)
    is_active = Column(Boolean, default=True)
    is_public = Column(Boolean, default=True)
    is_available = Column(Boolean, default=True)
    
    # Use generic JSON type for compatibility with SQLite (testing) and Postgres (prod)
    form_schema = Column(JSON, nullable=True)
    pricing_strategy = Column(JSON, nullable=True)
    
    # Stores the "Template" of line items:
    # [{"key": "packaging", "label": "Packaging", "type": "EXPENSE", "default_source": "VENDOR"}]
    financial_schema = Column(JSON, nullable=True)

    # New: Service-specific coupon settings
    # {"enabled": true, "code": "SAVE10", "percentage": 10.0}
    coupon_config = Column(JSON, nullable=True)

    # Audit Trail
    created_by_id = Column(Integer, ForeignKey("user.id"), nullable=True)
    updated_by_id = Column(Integer, ForeignKey("user.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    created_by = relationship("User", foreign_keys=[created_by_id])
    updated_by = relationship("User", foreign_keys=[updated_by_id])
    variants = relationship("ServiceVariant", back_populates="service_definition", cascade="all, delete-orphan")
    
    # Relationship to staff assigned to this service (back-reference from User.allowed_services)
    assigned_staff = relationship("User", secondary="user_services", back_populates="allowed_services")

    # Relationship to vendors associated with this service
    vendors = relationship("Vendor", secondary=service_vendors, back_populates="services")

class ServiceVariant(Base):
    __tablename__ = "service_variants"

    id = Column(Integer, primary_key=True, index=True)
    service_def_id = Column(Integer, ForeignKey("service_definition.id"), nullable=False)
    
    name_en = Column(String, nullable=False)
    name_bn = Column(String, nullable=True)
    
    # FIXED (e.g. 23kg Box) or PER_UNIT (e.g. 12 SR/kg)
    price_model = Column(String, default="FIXED") 
    
    default_price = Column(Float, default=0.0) # Selling Price
    default_cost = Column(Float, default=0.0)  # Buying Price (Cost)
    
    default_vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    
    is_active = Column(Boolean, default=True)

    service_definition = relationship("ServiceDefinition", back_populates="variants")
    default_vendor = relationship("Vendor")