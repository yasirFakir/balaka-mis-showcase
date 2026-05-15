from sqlalchemy import Boolean, Column, String, Integer, Table, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.db.base_class import Base
from app.db.types import EncryptedString
from app.models.role import user_roles  # Import the association table

# Many-to-Many for Service Scoping
user_services = Table(
    'user_services', Base.metadata,
    Column('user_id', Integer, ForeignKey('user.id'), primary_key=True),
    Column('service_def_id', Integer, ForeignKey('service_definition.id'), primary_key=True)
)

class User(Base):
    __tablename__ = "user"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean(), default=False)
    is_verified = Column(Boolean(), default=False)
    is_superuser = Column(Boolean(), default=False)
    must_change_password = Column(Boolean(), default=False)
    
    # Profile Fields
    phone_number = Column(String, nullable=True)
    profile_picture = Column(String, nullable=True)
    date_of_birth = Column(String, nullable=True) # Storing as ISO String YYYY-MM-DD for simplicity across DBs
    gender = Column(String, nullable=True)
    nationality = Column(String, nullable=True)
    nid_number = Column(EncryptedString, nullable=True)
    
    # Passport / Visa / Iqama
    passport_number = Column(EncryptedString, nullable=True)
    passport_expiry = Column(String, nullable=True)
    visa_number = Column(EncryptedString, nullable=True)
    visa_expiry = Column(String, nullable=True)
    iqama_number = Column(EncryptedString, nullable=True)
    iqama_expiry = Column(String, nullable=True)

    # Address
    address_line1 = Column(String, nullable=True)
    address_line2 = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    zip_code = Column(String, nullable=True)
    country = Column(String, nullable=True)

    # Staff Specific Fields
    staff_category = Column(String, nullable=True) # e.g. Management, Field Operations
    work_office = Column(String, nullable=True)    # e.g. Riyadh (RUH), Dhaka (DAC)

    # Support / Anti-Spam Fields
    support_banned_until = Column(DateTime(timezone=True), nullable=True)
    is_support_banned_permanently = Column(Boolean(), default=False)
    support_violation_count = Column(Integer, default=0)

    # Account Activation & Recovery
    activation_token = Column(String, index=True, nullable=True)
    activation_token_expires = Column(DateTime(timezone=True), nullable=True)
    password_reset_token = Column(String, index=True, nullable=True)
    password_reset_expires = Column(DateTime(timezone=True), nullable=True)

    # Account Security
    failed_login_attempts = Column(Integer, default=0)
    last_failed_login = Column(DateTime(timezone=True), nullable=True)
    account_locked_until = Column(DateTime(timezone=True), nullable=True)

    roles = relationship("Role", secondary=user_roles, back_populates="users")
    tickets = relationship("SupportTicket", back_populates="user", foreign_keys="SupportTicket.user_id")
    
    # Scopes: If empty, user has no specific restrictions (or no access, depending on policy).
    # We will treat "Empty" + "Staff Role" as "Access to Nothing" or "All" depending on implementing logic.
    # Logic plan: If is_superuser -> All. Else if roles include Admin -> All. Else -> Only allowed_services.
    allowed_services = relationship("ServiceDefinition", secondary=user_services, back_populates="assigned_staff")
