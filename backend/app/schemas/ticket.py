from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict, field_validator
from datetime import datetime
import json
from .user import User

# --- Ticket Message Schemas ---
class TicketMessageBase(BaseModel):
    message: str
    attachments: Optional[List[str]] = None

class TicketMessageCreate(TicketMessageBase):
    pass

class TicketMessage(TicketMessageBase):
    id: int
    ticket_id: int
    sender_id: Optional[int] = None
    created_at: datetime
    sender: Optional[User] = None # To show who sent it

    @field_validator("attachments", mode="before")
    @classmethod
    def decode_attachments(cls, v: Any) -> Optional[List[str]]:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except:
                return []
        return v

    model_config = ConfigDict(from_attributes=True)

# --- Support Ticket Schemas ---
class SupportTicketBase(BaseModel):
    subject: str
    priority: str = "Medium"
    category: str = "General"
    service_request_id: Optional[int] = None
    guest_session_id: Optional[str] = None

class SupportTicketCreate(SupportTicketBase):
    # Initial message to start the thread
    initial_message: str
    user_id: Optional[int] = None # For Admin to create on behalf of user

class SupportTicketUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None

class SupportTicket(SupportTicketBase):
    id: int
    user_id: Optional[int] = None
    status: str
    category: str # In case it's overridden in Base, but explicit here is fine too. Actually Base has it.
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # We might want to embed messages or fetch separate. Embedding last message is useful for list view.
    # For detail view, we fetch list of messages.
    # Let's keep it simple.
    
    user: Optional[User] = None
    created_by: Optional[User] = None
    updated_by: Optional[User] = None
    participants: List[User] = []

    model_config = ConfigDict(from_attributes=True)
