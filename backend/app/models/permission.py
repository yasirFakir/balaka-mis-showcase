from sqlalchemy import Column, Integer, String, Table, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base_class import Base

role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("role.id"), primary_key=True),
    Column("permission_id", Integer, ForeignKey("permission.id"), primary_key=True),
)

class Permission(Base):
    __tablename__ = "permission"
    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String, unique=True, index=True, nullable=False) # e.g. "finance.view"
    description = Column(String, nullable=True) # e.g. "Can view financial reports"
    module = Column(String, index=True, nullable=False) # e.g. "Finance", "Users"

    roles = relationship("Role", secondary=role_permissions, back_populates="permissions")
