from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base

class StatusHistory(Base):
    __tablename__ = "status_history"

    id = Column(Integer, primary_key=True, index=True)
    service_request_id = Column(Integer, ForeignKey("service_request.id", ondelete="CASCADE"), nullable=False)
    
    old_status = Column(String, nullable=True)
    new_status = Column(String, nullable=False)
    
    # Who performed the status change
    changed_by_id = Column(Integer, ForeignKey("user.id"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    service_request = relationship("ServiceRequest", back_populates="status_history")
    changed_by = relationship("User")
