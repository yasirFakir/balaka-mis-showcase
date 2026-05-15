from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime
from app.db.base_class import Base

class SystemSetting(Base):
    __tablename__ = "system_setting"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False)
    value_str = Column(String, nullable=True)
    value_bool = Column(Boolean, nullable=True)
    value_float = Column(Float, nullable=True)
    description = Column(String, nullable=True)

class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    value = Column(Float, nullable=False)
    is_percentage = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    usage_limit = Column(Integer, nullable=True)
    used_count = Column(Integer, default=0)
    expiry_date = Column(DateTime(timezone=True), nullable=True)

