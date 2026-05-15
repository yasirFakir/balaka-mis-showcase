from typing import Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class NotificationBase(BaseModel):
    title: str
    title_bn: Optional[str] = None
    message: str
    message_bn: Optional[str] = None
    link: Optional[str] = None
    notification_type: Optional[str] = None

class NotificationCreate(NotificationBase):
    user_id: int

class NotificationUpdate(BaseModel):
    is_read: bool

class Notification(NotificationBase):
    id: int
    user_id: int
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
