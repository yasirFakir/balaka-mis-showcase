from typing import Any, Dict, Optional, Union, List, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, cast, String, func
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException

from app.core.security import get_password_hash, verify_password
from app.crud.base import CRUDBase
from app.models.user import User
from app.models.role import Role
from app.schemas.user import UserCreate, UserUpdate

class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    def get_by_email(self, db: Session, *, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email).first()

    def create(self, db: Session, *, obj_in: UserCreate, roles: list[Role] = []) -> User:
        if not roles and obj_in.role_ids:
            roles = db.query(Role).filter(Role.id.in_(obj_in.role_ids)).all()

        db_obj = User(
            email=obj_in.email,
            hashed_password=get_password_hash(obj_in.password),
            full_name=obj_in.full_name,
            phone_number=obj_in.phone_number,
            nid_number=obj_in.nid_number,
            profile_picture=obj_in.profile_picture,
            is_active=obj_in.is_active,
            is_verified=obj_in.is_verified,
            is_superuser=obj_in.is_superuser,
            must_change_password=obj_in.must_change_password,
            staff_category=obj_in.staff_category,
            work_office=obj_in.work_office,
            roles=roles,
            # Initialize lockout fields
            failed_login_attempts=0
        )
        if obj_in.allowed_service_ids:
             from app.models.service import ServiceDefinition
             services = db.query(ServiceDefinition).filter(ServiceDefinition.id.in_(obj_in.allowed_service_ids)).all()
             db_obj.allowed_services = services
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(
        self, db: Session, *, db_obj: User, obj_in: Union[UserUpdate, Dict[str, Any]]
    ) -> User:
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)
            
        if update_data.get("password"):
            hashed_password = get_password_hash(update_data["password"])
            del update_data["password"]
            update_data["hashed_password"] = hashed_password
            
        # Handle Roles update (if role_ids passed)
        if "role_ids" in update_data:
            role_ids = update_data.pop("role_ids")
            if role_ids is not None:
                new_roles = db.query(Role).filter(Role.id.in_(role_ids)).all()
                db_obj.roles = new_roles
                
        # Handle Scope update (if allowed_service_ids passed)
        if "allowed_service_ids" in update_data:
            service_ids = update_data.pop("allowed_service_ids")
            if service_ids is not None:
                from app.models.service import ServiceDefinition
                new_services = db.query(ServiceDefinition).filter(ServiceDefinition.id.in_(service_ids)).all()
                db_obj.allowed_services = new_services
            
        return super().update(db, db_obj=db_obj, obj_in=update_data)

    def is_active(self, user: User) -> bool:
        return user.is_active

    def is_superuser(self, user: User) -> bool:
        return user.is_superuser

    def authenticate(
        self, db: Session, *, email: str, password: str
    ) -> Optional[User]:
        user = self.get_by_email(db, email=email)
        if not user:
            return None
            
        # Check Lockout
        if user.account_locked_until:
            now = datetime.now(timezone.utc)
            locked_until = user.account_locked_until
            if locked_until.tzinfo is None:
                locked_until = locked_until.replace(tzinfo=timezone.utc)
            
            if locked_until > now:
                # Calculate remaining minutes
                remaining = int((locked_until - now).total_seconds() / 60)
                if remaining < 1: remaining = 1
                raise HTTPException(
                    status_code=403,
                    detail=f"Account locked due to too many failed attempts. Please try again in {remaining} minutes."
                )

        if not verify_password(password, user.hashed_password):
            # Increment failure
            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
            user.last_failed_login = datetime.now(timezone.utc)
            
            if user.failed_login_attempts >= 5:
                user.account_locked_until = datetime.now(timezone.utc) + timedelta(minutes=5)
                db.add(user)
                db.commit()
                raise HTTPException(
                    status_code=403,
                    detail="Too many failed attempts. Account locked for 5 minutes."
                )
            
            db.add(user)
            db.commit()
            return None
            
        # Success - Reset counters
        if (user.failed_login_attempts or 0) > 0 or user.account_locked_until:
            user.failed_login_attempts = 0
            user.account_locked_until = None
            user.last_failed_login = None
            db.add(user)
            db.commit()
            
        return user

    def get_multi_with_count(
        self, 
        db: Session, 
        *, 
        skip: int = 0, 
        limit: int = 100, 
        search_query: Optional[str] = None,
        role_filter: Optional[Union[str, List[str]]] = None
    ) -> Tuple[List[User], int]:
        
        query = db.query(User)
        
        # Join Roles early if we need to filter by them
        if role_filter:
            query = query.join(User.roles)

        # Search Filtering
        if search_query:
            tokens = search_query.split()
            for token in tokens:
                search_term = f"%{token}%"
                token_conditions = [
                    User.full_name.ilike(search_term),
                    User.email.ilike(search_term),
                    User.phone_number.ilike(search_term),
                    User.staff_category.ilike(search_term),
                    User.work_office.ilike(search_term),
                    User.city.ilike(search_term)
                ]
                
                # Numeric ID match for this token
                if token.replace("#", "").isdigit():
                    token_conditions.append(User.id == int(token.replace("#", "")))
                    
                query = query.filter(or_(*token_conditions))
        
        total = query.count()

        # Role Filtering
        if role_filter:
            if isinstance(role_filter, list):
                if "Staff" in role_filter:
                    # Staff = Any role except "Client" OR superuser
                    pass 
                
                # If specific role names are passed
                query = query.filter(Role.name.in_(role_filter))
            else:
                if role_filter == "Client":
                    query = query.filter(Role.name == "Client")
                elif role_filter == "Staff":
                    query = query.filter(Role.name != "Client")
                else:
                    query = query.filter(Role.name == role_filter)

        # Ensure distinct because of Role join
        query = query.distinct()

        total = query.count()
        
        items = query.options(joinedload(User.roles)).order_by(User.id.desc()).offset(skip).limit(limit).all()
        
        return items, total

    def get_status_counts(self, db: Session) -> dict:
        total = db.query(User).count()
        clients = db.query(User).join(User.roles).filter(Role.name == "Client").count()
        staff = db.query(User).outerjoin(User.roles).filter(
            or_(
                User.is_superuser == True,
                Role.name != "Client"
            )
        ).distinct().count()
        
        return {
            "all": total,
            "clients": clients,
            "staff": staff
        }

user = CRUDUser(User)