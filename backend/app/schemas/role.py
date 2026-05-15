from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from .permission import Permission

# Shared properties
class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None

class RoleCreate(RoleBase):
    permission_ids: List[int] = []

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permission_ids: Optional[List[int]] = None

class Role(RoleBase):
    id: int
    permissions: List[Permission] = []

    model_config = ConfigDict(from_attributes=True)

