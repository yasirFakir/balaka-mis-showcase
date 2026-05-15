from typing import Generator, Optional, List
from fastapi import Depends, HTTPException, status, Request, Query
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.crud.user import user as user_crud
from app import models, schemas
from app.core import security
from app.core.config import settings
from app.db.session import SessionLocal

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"/api/v1/login/access-token"
)

def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        try:
            db.close()
        except Exception:
            # Handle cases where connection is already closed/killed
            pass

from sqlalchemy.orm import Session, joinedload

# ...

def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(reusable_oauth2)
) -> models.User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = schemas.TokenPayload(**payload)
    except (jwt.JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    if not token_data.sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
    
    # Eagerly load roles, permissions and allowed services
    user = (
        db.query(models.User)
        .options(
            joinedload(models.User.roles).joinedload(models.Role.permissions),
            joinedload(models.User.allowed_services)
        )
        .filter(models.User.id == token_data.sub)
        .first()
    )
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def get_current_user_sse(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Special dependency for SSE (EventSource).
    Manually parses Request to avoid FastAPI 422 validation errors on optional headers/query params.
    """
    token = None
    
    # 1. Try Header
    auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    
    # 2. Try Query Param
    if not token:
        token = request.query_params.get("token")
        
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required",
        )
        
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = schemas.TokenPayload(**payload)
    except (jwt.JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
        
    user = db.query(models.User).filter(models.User.id == token_data.sub).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def get_current_user_sse_manual(db: Session, token: str) -> models.User:
    """Manual version of SSE auth that doesn't rely on FastAPI dependency injection."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = schemas.TokenPayload(**payload)
    except (jwt.JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
        
    user = db.query(models.User).filter(models.User.id == token_data.sub).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def get_current_user_optional(
    db: Session = Depends(get_db), 
    token: Optional[str] = Depends(OAuth2PasswordBearer(tokenUrl="/api/v1/login/access-token", auto_error=False))
) -> Optional[models.User]:
    """
    Returns the current user if authenticated, otherwise returns None.
    Does NOT raise 401 errors, allowing guest access.
    """
    if not token:
        return None
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = schemas.TokenPayload(**payload)
        if not token_data.sub:
            return None
        
        user = (
            db.query(models.User)
            .options(
                joinedload(models.User.roles).joinedload(models.Role.permissions),
                joinedload(models.User.allowed_services)
            )
            .filter(models.User.id == token_data.sub)
            .first()
        )
        return user
    except (jwt.JWTError, ValidationError):
        return None

def get_current_user_flexible(
    request: Request,
    db: Session = Depends(get_db),
) -> Optional[models.User]:
    """
    Flexible authentication: checks Authorization header FIRST, then 'token' query param.
    Returns None if no valid authentication is found (allows guests).
    """
    token = None
    
    # 1. Try Header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    
    # 2. Try Query Param
    if not token:
        token = request.query_params.get("token")
        
    if not token:
        return None
        
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = schemas.TokenPayload(**payload)
        if not token_data.sub:
            return None
            
        user = (
            db.query(models.User)
            .options(
                joinedload(models.User.roles).joinedload(models.Role.permissions),
                joinedload(models.User.allowed_services)
            )
            .filter(models.User.id == token_data.sub)
            .first()
        )
        return user
    except (jwt.JWTError, ValidationError):
        return None

async def get_current_active_user(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def get_current_active_superuser(
    current_user: models.User = Depends(get_current_active_user),
) -> models.User:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="The user doesn't have enough privileges"
        )
    return current_user

def require_root(
    current_user: models.User = Depends(get_current_active_superuser),
) -> models.User:
    """
    Restrict access to the root superuser only.
    Identified by settings.ROOT_EMAIL.
    """
    if not settings.ROOT_EMAIL or current_user.email != settings.ROOT_EMAIL:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="This action is restricted to the Root Superuser only."
        )
    return current_user

# --- Permission Based Access Control (PBAC) ---

def check_permission(user: models.User, required_permission: str) -> bool:
    """
    Core logic to check if a user has a specific permission.
    Superusers and Admin role holders have all permissions.
    """
    if user.is_superuser:
        return True
    
    is_admin = any(role.name == "Admin" for role in user.roles)
    if is_admin:
        return True
        
    for role in user.roles:
        for perm in role.permissions:
            if perm.slug == required_permission:
                return True
    return False

def require_any_permission(permission_slugs: List[str]):
    """
    Dependency factory that checks if a user has AT LEAST ONE of the provided permissions.
    Usage: Depends(require_any_permission(["finance.view_ledger", "requests.process_technical"]))
    """
    def any_permission_checker(
        current_user: models.User = Depends(get_current_active_user),
    ):
        for slug in permission_slugs:
            if check_permission(current_user, slug):
                return current_user
                
        raise HTTPException(
            status_code=403, 
            detail=f"Not enough privileges. Requires one of: {', '.join(permission_slugs)}"
        )
    return any_permission_checker

def require_service_permission(permission_slug: str):
    """
    Dependency factory for route protection that also considers Service Scoping.
    Usage: Depends(require_service_permission("requests.view"))
    """
    def service_permission_checker(
        current_user: models.User = Depends(get_current_active_user),
        service_id: Optional[int] = None # Optionally check if specific service is allowed
    ):
        # 1. Check Global Permission
        if not check_permission(current_user, permission_slug):
             raise HTTPException(
                status_code=403, 
                detail=f"Not enough privileges. Required: {permission_slug}"
            )
        
        # 2. Check Service Scope (if applicable)
        # If user is Admin/Superuser, bypass scoping
        if current_user.is_superuser or any(r.name == "Admin" for r in current_user.roles):
            return current_user
            
        # If specific service_id is provided, check if it's in allowed_services
        if service_id and current_user.allowed_services:
            allowed_ids = [s.id for s in current_user.allowed_services]
            if service_id not in allowed_ids:
                raise HTTPException(
                    status_code=403,
                    detail="Access denied for this specific service."
                )
                
        return current_user
    return service_permission_checker

# Alias for backward compatibility
require_permission = require_service_permission

# Legacy/Helper for Admin role specifically (can be deprecated or kept for simplicity)
def get_current_admin(
    current_user: models.User = Depends(get_current_active_user),
) -> models.User:
    if current_user.is_superuser:
        return current_user
        
    for role in current_user.roles:
        if role.name == "Admin":
            return current_user
            
    raise HTTPException(
        status_code=403, detail="The user doesn't have enough privileges"
    )
