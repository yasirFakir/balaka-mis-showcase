from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import dependencies
from app import schemas
from app.models.role import Role
from app.models.permission import Permission
from app.schemas.role import Role as RoleSchema, RoleCreate, RoleUpdate
from app.schemas.permission import Permission as PermissionSchema

router = APIRouter()

@router.get("", response_model=schemas.ListResponse[RoleSchema])
@router.get("/", response_model=schemas.ListResponse[RoleSchema])
def read_roles(
    db: Session = Depends(dependencies.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user = Depends(dependencies.require_permission("roles.view")),
):
    """
    Retrieve roles.
    """
    query = db.query(Role)
    total = query.count()
    roles = query.offset(skip).limit(limit).all()
    return {
        "items": roles,
        "total": total
    }

@router.post("/", response_model=RoleSchema)
def create_role(
    *,
    db: Session = Depends(dependencies.get_db),
    role_in: RoleCreate,
    current_user = Depends(dependencies.require_permission("roles.manage")),
):
    """
    Create a new role with permissions.
    """
    role = Role(name=role_in.name, description=role_in.description)
    if role_in.permission_ids:
        perms = db.query(Permission).filter(Permission.id.in_(role_in.permission_ids)).all()
        role.permissions = perms
    
    db.add(role)
    db.commit()
    db.refresh(role)
    return role

@router.put("/{role_id}", response_model=RoleSchema)
def update_role(
    *,
    db: Session = Depends(dependencies.get_db),
    role_id: int,
    role_in: RoleUpdate,
    current_user = Depends(dependencies.require_permission("roles.manage")),
):
    """
    Update a role's permissions.
    """
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
        
    if role_in.name:
        role.name = role_in.name
    if role_in.description:
        role.description = role_in.description
        
    if role_in.permission_ids is not None:
        perms = db.query(Permission).filter(Permission.id.in_(role_in.permission_ids)).all()
        role.permissions = perms
        
    db.add(role)
    db.commit()
    db.refresh(role)
    return role

@router.get("/permissions", response_model=schemas.ListResponse[PermissionSchema])

def read_permissions(

    db: Session = Depends(dependencies.get_db),

    skip: int = 0,

    limit: int = 100,

    current_user = Depends(dependencies.get_current_active_superuser),

):

    """

    Retrieve all available system permissions.

    """

    query = db.query(Permission)

    total = query.count()

    permissions = query.offset(skip).limit(limit).all()

    return {

        "items": permissions,

        "total": total

    }
