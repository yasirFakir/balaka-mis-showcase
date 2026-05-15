from typing import Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from .user import User

class StatusHistoryBase(BaseModel):
    old_status: Optional[str] = None
    new_status: str

class StatusHistory(StatusHistoryBase):
    id: int
    service_request_id: int
    changed_by_id: Optional[int] = None
    created_at: datetime
    
    changed_by: Optional[User] = None

    model_config = ConfigDict(from_attributes=True)
