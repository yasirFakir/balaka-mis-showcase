from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Table, func
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base_class import Base

# Association table for ticket participants (Staff/Admin group chat)
ticket_participants = Table(
    "ticket_participants",
    Base.metadata,
    Column("ticket_id", Integer, ForeignKey("support_ticket.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", Integer, ForeignKey("user.id", ondelete="CASCADE"), primary_key=True),
)

class SupportTicket(Base):
    __tablename__ = "support_ticket"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=True)
    guest_session_id = Column(String, index=True, nullable=True)
    
    subject = Column(String, nullable=False)
    status = Column(String, default="Open") # Open, In Progress, Resolved, Closed
    priority = Column(String, default="Medium") # Low, Medium, High, Urgent
    category = Column(String, default="General") # General, Technical, Billing, Order
    
    service_request_id = Column(Integer, ForeignKey("service_request.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("user.id"), nullable=True)
    updated_by_id = Column(Integer, ForeignKey("user.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", foreign_keys=[user_id], back_populates="tickets")
    created_by = relationship("User", foreign_keys=[created_by_id])
    updated_by = relationship("User", foreign_keys=[updated_by_id])
    messages = relationship("TicketMessage", back_populates="ticket", cascade="all, delete-orphan")
    service_request = relationship("ServiceRequest")
    participants = relationship("User", secondary=ticket_participants)

class TicketMessage(Base):
    __tablename__ = "ticket_message"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("support_ticket.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("user.id"), nullable=True)
    
    message = Column(Text, nullable=False)
    attachments = Column(Text, nullable=True) # JSON string of URLs
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    ticket = relationship("SupportTicket", back_populates="messages")
    sender = relationship("User")