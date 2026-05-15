from typing import Optional
from pydantic import BaseModel, ConfigDict

class PermissionBase(BaseModel):
    slug: str
    description: Optional[str] = None
    module: str

class Permission(PermissionBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
