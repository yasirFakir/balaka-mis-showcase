from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict, Field, field_validator
from .role import Role
from app.core.validation_constants import (
    PHONE_REGEX, PASSPORT_REGEX, NID_REGEX, IQAMA_REGEX, NAME_REGEX,
    ACCEPTED_EMAIL_DOMAINS
)

# Minimal Service Schema for User Scope
class UserServiceScope(BaseModel):
    id: int
    name: str
    slug: str
    model_config = ConfigDict(from_attributes=True)

# Shared validator for email domain whitelist
def check_email_domain(v: Optional[str]) -> Optional[str]:
    if v and "@" in v:
        domain = v.split("@")[-1].lower()
        if domain not in ACCEPTED_EMAIL_DOMAINS:
            raise ValueError(f"Registration using '{domain}' is not allowed. Please use a trusted email provider.")
    return v

# Shared properties
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = Field(None, pattern=NAME_REGEX)
    
    validate_email = field_validator("email")(check_email_domain)

    phone_number: Optional[str] = Field(None, pattern=PHONE_REGEX)
    profile_picture: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    nid_number: Optional[str] = Field(None, pattern=NID_REGEX)
    
    passport_number: Optional[str] = Field(None, pattern=PASSPORT_REGEX)
    passport_expiry: Optional[str] = None
    visa_number: Optional[str] = None
    visa_expiry: Optional[str] = None
    iqama_number: Optional[str] = Field(None, pattern=IQAMA_REGEX)
    iqama_expiry: Optional[str] = None
    
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None

    # Staff Fields
    staff_category: Optional[str] = None # e.g. Management, Field Operations
    work_office: Optional[str] = None    # e.g. Riyadh (RUH), Dhaka (DAC)

# Properties to receive via API on creation
class UserCreate(UserBase):
    password: Optional[str] = None
    role_ids: Optional[List[int]] = None
    allowed_service_ids: Optional[List[int]] = None
    is_active: bool = False
    is_verified: bool = False
    is_superuser: bool = False
    must_change_password: bool = False

# Properties for self-registration
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str = Field(..., pattern=NAME_REGEX)
    phone_number: str = Field(..., pattern=PHONE_REGEX)
    
    validate_email = field_validator("email")(check_email_domain)

# Properties to receive via API on update (Admin)
class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, pattern=NAME_REGEX)
    password: Optional[str] = None
    role_ids: Optional[List[int]] = None
    allowed_service_ids: Optional[List[int]] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None
    must_change_password: Optional[bool] = None
    
    validate_email = field_validator("email")(check_email_domain)

    phone_number: Optional[str] = Field(None, pattern=PHONE_REGEX)
    profile_picture: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    nid_number: Optional[str] = Field(None, pattern=NID_REGEX)
    
    passport_number: Optional[str] = Field(None, pattern=PASSPORT_REGEX)
    passport_expiry: Optional[str] = None
    visa_number: Optional[str] = None
    visa_expiry: Optional[str] = None
    iqama_number: Optional[str] = Field(None, pattern=IQAMA_REGEX)
    iqama_expiry: Optional[str] = None

    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None

    # Staff Fields
    staff_category: Optional[str] = None
    work_office: Optional[str] = None

    # Support / Anti-Spam
    support_banned_until: Optional[datetime] = None
    is_support_banned_permanently: Optional[bool] = None
    support_violation_count: Optional[int] = None

# Properties for Self-Update
class UserUpdateMe(BaseModel):
    full_name: Optional[str] = Field(None, pattern=NAME_REGEX)
    email: Optional[EmailStr] = None
    
    password: Optional[str] = None
    current_password: Optional[str] = None
    
    validate_email = field_validator("email")(check_email_domain)

    phone_number: Optional[str] = Field(None, pattern=PHONE_REGEX)
    profile_picture: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    nid_number: Optional[str] = Field(None, pattern=NID_REGEX)
    
    passport_number: Optional[str] = Field(None, pattern=PASSPORT_REGEX)
    passport_expiry: Optional[str] = None
    visa_number: Optional[str] = None
    visa_expiry: Optional[str] = None
    iqama_number: Optional[str] = Field(None, pattern=IQAMA_REGEX)
    iqama_expiry: Optional[str] = None
    
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None

    # Staff Fields
    staff_category: Optional[str] = None
    work_office: Optional[str] = None

# Properties to return to client
class User(UserBase):
    id: int
    is_active: bool
    is_verified: bool
    is_superuser: bool
    must_change_password: bool = False
    roles: List[Role] = []
    allowed_services: List[UserServiceScope] = []
    
    # Support / Anti-Spam
    support_banned_until: Optional[datetime] = None
    is_support_banned_permanently: bool = False
    support_violation_count: int = 0
    
    @field_validator("is_active", "is_verified", "is_superuser", "must_change_password", "is_support_banned_permanently", mode="before")
    @classmethod
    def set_default_bool(cls, v):
        if v is None:
            return False
        return v

    @field_validator("support_violation_count", mode="before")
    @classmethod
    def set_default_count(cls, v):
        return v or 0

    model_config = ConfigDict(from_attributes=True)