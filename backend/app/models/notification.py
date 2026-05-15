from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.db.base_class import Base

class Notification(Base):
    __tablename__ = "notification"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    title = Column(String, nullable=False)
    title_bn = Column(String, nullable=True)
    message = Column(Text, nullable=False)
    message_bn = Column(Text, nullable=True)
    link = Column(String, nullable=True) 
    notification_type = Column(String, nullable=True) # e.g., 'request', 'transaction', 'ticket'
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", backref="notifications")
