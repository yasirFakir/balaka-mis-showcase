from typing import Optional, List, Any, Dict
from pydantic import BaseModel, ConfigDict, field_validator, Field
from datetime import datetime
from .user import User
import re

# Variant Schemas
class ServiceVariantBase(BaseModel):
    name_en: str
    name_bn: Optional[str] = None
    price_model: str = "FIXED" # FIXED or PER_UNIT
    default_price: float = Field(0.0, ge=0)
    default_cost: float = Field(0.0, ge=0)
    default_vendor_id: Optional[int] = None
    is_active: bool = True

class ServiceVariantCreate(ServiceVariantBase):
    id: Optional[int] = None # Allow ID for updates

class ServiceVariantUpdate(ServiceVariantBase):
    name_en: Optional[str] = None

class ServiceVariant(ServiceVariantBase):
    id: int
    service_def_id: int

    model_config = ConfigDict(from_attributes=True)

# Service Definition Schemas
class ServiceDefinitionBase(BaseModel):
    name: str
    name_bn: Optional[str] = None
    slug: str
    category: Optional[str] = None
    code_prefix: Optional[str] = None
    tags: Optional[List[str]] = None
    description: Optional[str] = None
    description_bn: Optional[str] = None
    image_url: Optional[str] = None
    base_price: float = Field(0.0, ge=0)
    currency: str = "SAR"
    is_active: Optional[bool] = True
    is_public: Optional[bool] = True
    is_available: Optional[bool] = True
    form_schema: Optional[Dict[str, Any]] = None
    pricing_strategy: Optional[Dict[str, Any]] = None
    financial_schema: Optional[List[Dict[str, Any]]] = None
    coupon_config: Optional[Dict[str, Any]] = None

def _validate_form_schema_logic(v: Any) -> Any:
    """
    Enforce that every dynamic form field has a valid, unique system 'key' and a mandatory 'label'.
    """
    if v is None:
        return v
    
    if not isinstance(v, dict):
        return v
        
    sections = v.get("sections", [])
    if not isinstance(sections, list):
        return v
        
    seen_keys = set()
    for section in sections:
        fields = section.get("fields", [])
        if not isinstance(fields, list):
            continue
            
        for field in fields:
            key = field.get("key")
            label = field.get("label")
            
            if not key:
                raise ValueError(f"System Key is missing for field with label: '{label or 'UNKNOWN'}'")
            
            # Enforce Label
            if not label or not str(label).strip():
                raise ValueError(f"Label is required for field with key '{key}'")
            
            # Check format: lowercase alphanumeric and underscores only
            if not re.match(r"^[a-z0-9_]+$", key):
                raise ValueError(f"System Key '{key}' must be lowercase alphanumeric with underscores only (no spaces or special chars)")
            
            # Check uniqueness
            if key in seen_keys:
                raise ValueError(f"System Key '{key}' is duplicated in the form. Every field must have a unique key.")
            
            seen_keys.add(key)
            
    return v

class UserSummary(BaseModel):
    id: int
    full_name: Optional[str] = None
    email: str
    profile_picture: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class VendorSummary(BaseModel):
    id: int
    name: str
    type: str
    current_balance: float
    
    model_config = ConfigDict(from_attributes=True)

class ServiceDefinitionCreate(ServiceDefinitionBase):
    variants: List[ServiceVariantCreate] = []
    vendor_ids: List[int] = []

    @field_validator("form_schema")
    @classmethod
    def validate_form_schema(cls, v: Any) -> Any:
        return _validate_form_schema_logic(v)

class ServiceDefinitionUpdate(ServiceDefinitionBase):
    name: Optional[str] = None
    slug: Optional[str] = None
    variants: Optional[List[ServiceVariantCreate]] = None
    financial_schema: Optional[List[Dict[str, Any]]] = None
    assigned_staff_ids: Optional[List[int]] = None
    vendor_ids: Optional[List[int]] = None

    @field_validator("form_schema")
    @classmethod
    def validate_form_schema(cls, v: Any) -> Any:
        return _validate_form_schema_logic(v)

class ServiceDefinition(ServiceDefinitionBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    created_by: Optional[User] = None
    updated_by: Optional[User] = None
    
    variants: List[ServiceVariant] = []
    assigned_staff: List[UserSummary] = []
    vendors: List[VendorSummary] = []

    model_config = ConfigDict(from_attributes=True)
