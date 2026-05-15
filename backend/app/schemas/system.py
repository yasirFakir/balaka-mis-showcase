from typing import Optional, TypeVar, Generic, List
from pydantic import BaseModel, ConfigDict

T = TypeVar("T")

class ListResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    summary: Optional[dict] = None

class Msg(BaseModel):
    msg: str

class SystemActionConfirm(BaseModel):
    password: str

class SystemSettingBase(BaseModel):
    key: str
    value_str: Optional[str] = None
    value_bool: Optional[bool] = None
    value_float: Optional[float] = None
    description: Optional[str] = None

class SystemSettingCreate(SystemSettingBase):
    pass

class SystemSettingUpdate(BaseModel):
    value_str: Optional[str] = None
    value_bool: Optional[bool] = None
    value_float: Optional[float] = None

class SystemSetting(SystemSettingBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class CurrencySettingsUpdate(BaseModel):
    manual_enabled: bool
    manual_rate: float
