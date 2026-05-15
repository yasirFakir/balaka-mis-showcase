from typing import List, Any, Optional
import secrets
import string
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from datetime import datetime

from app.api import dependencies
from app.core.security import verify_password, get_password_hash
from app.crud.user import user as user_crud
from app.schemas import user as user_schema
from app import schemas, models
from app.models import user as user_model

from app.models.role import Role
from app.crud.ticket import ticket as ticket_crud
from app.schemas.ticket import SupportTicketCreate
from app.core.notifications import notification_manager
from app.services.email_service import email_service

router = APIRouter()

@router.post("/register", response_model=user_schema.User)
def register_user(
    *,
    db: Session = Depends(dependencies.get_db),
    user_in: user_schema.UserRegister,
):
    """
    Public registration for new clients.
    Automatically assigns the 'Client' role.
    """
    user = user_crud.get_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    
    # Get Client Role
    client_role = db.query(Role).filter(Role.name == "Client").first()
    if not client_role:
        # Fallback if roles not seeded properly, though they should be
        client_role = Role(name="Client", description="Standard user")
        db.add(client_role)
        db.commit()
        db.refresh(client_role)

    # Convert UserRegister to UserCreate
    user_create = user_schema.UserCreate(
        email=user_in.email,
        password=user_in.password,
        full_name=user_in.full_name,
        phone_number=user_in.phone_number,
        role_ids=[client_role.id]
    )
    
    user = user_crud.create(db, obj_in=user_create)

    # Generate Activation Token
    import secrets
    from datetime import timedelta, timezone
    token = secrets.token_hex(32)
    user.activation_token = token
    user.activation_token_expires = datetime.now(timezone.utc) + timedelta(hours=24)
    user.is_active = False # Explicitly ensure inactive until verified
    user.is_verified = False
    db.add(user)
    db.commit()

    # Send Activation Email
    email_service.send_activation_email(
        email_to=user.email,
        name=user.full_name or "User",
        token=token
    )

    return user

@router.post("/staff", response_model=user_schema.User)
def create_staff(
    *,
    db: Session = Depends(dependencies.get_db),
    user_in: user_schema.UserCreate,
    current_user: models.User = Depends(dependencies.require_permission("users.manage")),
):
    """
    Create new staff user. Requires 'users.manage'.
    Automatically generates a temporary password and requires reset on first login.
    """
    user = user_crud.get_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    
    # Security Check: Prevent non-admins from assigning the Admin role
    if user_in.role_ids:
        admin_role = db.query(Role).filter(Role.name == "Admin").first()
        if admin_role and admin_role.id in user_in.role_ids:
            is_current_admin = current_user.is_superuser or any(role.name == "Admin" for role in current_user.roles)
            if not is_current_admin:
                raise HTTPException(
                    status_code=403,
                    detail="Only existing Administrators or Superusers can assign the Admin role."
                )
    
    # Generate temporary password
    alphabet = string.ascii_letters + string.digits
    temp_password = ''.join(secrets.choice(alphabet) for i in range(12))
    user_in.password = temp_password
    
    # Force state
    user_in.is_active = True
    user_in.is_verified = True
    user_in.must_change_password = True
    
    user = user_crud.create(db, obj_in=user_in)
    
    # Send credentials email
    try:
        email_service.send_new_staff_credentials_email(
            email_to=user.email,
            name=user.full_name or user.email,
            password=temp_password
        )
    except Exception as e:
        # Don't fail the request if email fails, but it will be logged by email_service
        pass

    return user

@router.post("/", response_model=user_schema.User)
def create_user(
    *,
    db: Session = Depends(dependencies.get_db),
    user_in: user_schema.UserCreate,
    current_user: models.User = Depends(dependencies.require_permission("users.manage")),
):
    """
    Create new user. Requires 'users.manage'.
    """
    user = user_crud.get_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    user = user_crud.create(db, obj_in=user_in)
    return user

@router.get("", response_model=schemas.ListResponse[user_schema.User])
@router.get("/", response_model=schemas.ListResponse[user_schema.User])
def read_users(
    db: Session = Depends(dependencies.get_db),
    skip: int = 0,
    limit: int = 100,
    q: Optional[str] = None,
    role: Optional[str] = None, # "Client" or "Staff"
    current_user: models.User = Depends(dependencies.require_permission("users.view")),
):
    """
    Retrieve users.
    Supports search (q) and role filter.
    """
    items, total = user_crud.get_multi_with_count(
        db, 
        skip=skip, 
        limit=limit,
        search_query=q,
        role_filter=role
    )
    
    # Calculate Stats
    stats = user_crud.get_status_counts(db)
    
    # PII Masking: If user doesn't have 'users.view_sensitive', mask sensitive fields
    has_sensitive_access = dependencies.check_permission(current_user, "users.view_sensitive")
    
    if not has_sensitive_access:
        masked_items = []
        for user in items:
            # We must be careful not to mutate the DB objects if they are tracked
            # We'll use model_validate and then modify the dict or similar
            # Since this is for response, we can just return a list of dicts or new objects
            user_data = user_schema.User.model_validate(user)
            
            # Masking logic
            mask = "[RESTRICTED]"
            user_data.nid_number = mask if user_data.nid_number else None
            user_data.passport_number = mask if user_data.passport_number else None
            user_data.visa_number = mask if user_data.visa_number else None
            user_data.iqama_number = mask if user_data.iqama_number else None
            
            # Partial mask for phone? Maybe not necessary for now, but let's be safe
            if user_data.phone_number and len(user_data.phone_number) > 5:
                user_data.phone_number = user_data.phone_number[:3] + "****" + user_data.phone_number[-2:]

            masked_items.append(user_data)
        items = masked_items

    return {
        "items": items,
        "total": total,
        "summary": { "stats": stats }
    }

@router.get("/staff-directory", response_model=schemas.ListResponse[user_schema.User])
def read_staff_directory(
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    """
    Public-safe directory of active staff members.
    Returns limited fields for use in dynamic forms.
    """
    query = (
        db.query(models.User)
        .join(models.User.roles)
        .filter(models.Role.name != "Client")
        .filter(models.User.is_active == True)
    )
    total = query.count()
    items = query.all()
    
    return {
        "items": items,
        "total": total
    }

@router.get("/me", response_model=user_schema.User)
def read_user_me(
    current_user: user_model.User = Depends(dependencies.get_current_active_user),
):
    """
    Get current user.
    """
    return current_user

@router.get("/{user_id}", response_model=user_schema.User)
def read_user_by_id(
    user_id: int,
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.require_permission("users.view")),
):
    """
    Get a specific user by id. Mask PII if requester lacks 'users.view_sensitive'.
    """
    user = user_crud.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # PII Masking: If not self and doesn't have sensitive access
    if not dependencies.check_permission(current_user, "users.view_sensitive") and current_user.id != user.id:
        user_data = user_schema.User.model_validate(user)
        mask = "[RESTRICTED]"
        user_data.nid_number = mask if user_data.nid_number else None
        user_data.passport_number = mask if user_data.passport_number else None
        user_data.visa_number = mask if user_data.visa_number else None
        user_data.iqama_number = mask if user_data.iqama_number else None
        
        if user_data.phone_number and len(user_data.phone_number) > 5:
            user_data.phone_number = user_data.phone_number[:3] + "****" + user_data.phone_number[-2:]
        return user_data
        
    return user

@router.put("/me", response_model=user_schema.User)
def update_user_me(
    *,
    db: Session = Depends(dependencies.get_db),
    user_in: user_schema.UserUpdateMe,
    current_user: user_model.User = Depends(dependencies.get_current_active_user),
):
    """
    Update own profile.
    """
    # Duplicate Check: Email
    if user_in.email and user_in.email != current_user.email:
        user = user_crud.get_by_email(db, email=user_in.email)
        if user:
            raise HTTPException(
                status_code=400,
                detail="The email address is already in use.",
            )
            
    # Duplicate Check: Phone (if needed, assume simple query here or skip if not indexed uniquely yet)
    # Ideally we'd have a get_by_phone in CRUD, but for now we can do a direct query
    if user_in.phone_number and user_in.phone_number != current_user.phone_number:
         existing_phone = db.query(user_model.User).filter(user_model.User.phone_number == user_in.phone_number).first()
         if existing_phone:
             raise HTTPException(
                status_code=400,
                detail="The phone number is already in use.",
            )

    # Handle Password Update
    update_data = user_in.model_dump(exclude_unset=True)
    if "password" in update_data:
        if not user_in.current_password:
            raise HTTPException(
                status_code=400,
                detail="Current password is required to set a new password.",
            )
        if not verify_password(user_in.current_password, current_user.hashed_password):
            raise HTTPException(
                status_code=400,
                detail="Incorrect current password.",
            )
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
        del update_data["current_password"]
        
        # If user is changing password, they've fulfilled the requirement
        update_data["must_change_password"] = False

    user = user_crud.update(db, db_obj=current_user, obj_in=update_data)
    return user

@router.put("/{user_id}", response_model=user_schema.User)
async def update_user(
    *,
    db: Session = Depends(dependencies.get_db),
    user_id: int,
    user_in: user_schema.UserUpdate,
    current_user: user_model.User = Depends(dependencies.require_permission("users.manage")),
):
    """
    Update a user (including roles). Requires 'users.manage'.
    """
    user = user_crud.get(db, id=user_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this id does not exist in the system",
        )
        
    # Security Check: Prevent non-superuser from editing superuser
    if user.is_superuser and not current_user.is_superuser:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to edit a Superuser.",
        )
    
    # Security Check: Prevent non-admins from editing existing Admins
    is_target_admin = any(role.name == "Admin" for role in user.roles)
    is_current_admin = current_user.is_superuser or any(role.name == "Admin" for role in current_user.roles)
    
    if is_target_admin and not is_current_admin:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to modify an Administrator account."
        )
        
    # Security Check: Prevent non-admins from assigning the Admin role
    if user_in.role_ids:
        admin_role = db.query(Role).filter(Role.name == "Admin").first()
        if admin_role and admin_role.id in user_in.role_ids:
            if not is_current_admin:
                raise HTTPException(
                    status_code=403,
                    detail="Only existing Administrators or Superusers can assign the Admin role."
                )

    # Audit: Detect changes
    changes = []
    update_data = user_in.model_dump(exclude_unset=True)
    for field, new_val in update_data.items():
        if field == "password": continue # Don't log passwords
        
        # Special handling for relationships
        if field == "role_ids":
            old_role_ids = sorted([r.id for r in user.roles])
            new_role_ids = sorted(new_val) if new_val else []
            if old_role_ids != new_role_ids:
                changes.append(f"- Roles updated")
            continue
            
        if field == "allowed_service_ids":
            old_service_ids = sorted([s.id for s in user.allowed_services])
            new_service_ids = sorted(new_val) if new_val else []
            if old_service_ids != new_service_ids:
                changes.append(f"- Service Scope updated")
            continue

        if hasattr(user, field):
            old_val = getattr(user, field)
            if old_val != new_val:
                label = field.replace("_", " ").title()
                changes.append(f"- {label}: '{old_val}' -> '{new_val}'")

    user = user_crud.update(db, db_obj=user, obj_in=user_in)

    # If admin changed a client's data, create audit ticket
    is_client = any(role.name == "Client" for role in user.roles)
    if changes and is_client and current_user.id != user.id:
        try:
            ticket_msg = f"Administrative profile update performed by {current_user.full_name}.\n\nChanges:\n" + "\n".join(changes)
            
            audit_ticket_in = SupportTicketCreate(
                subject=f"Profile Update: {user.full_name}",
                priority="Medium",
                category="General",
                initial_message=ticket_msg,
                user_id=user.id
            )
            
            ticket = ticket_crud.create_with_user(db, obj_in=audit_ticket_in, user_id=current_user.id)
            
            # Permanent Notification
            await notification_manager.create_notification(
                db,
                user_id=user.id,
                title="Profile Updated by Admin",
                message=f"Admin {current_user.full_name} has updated your profile details. A support ticket has been opened with the details.",
                link=f"/support/{ticket.id}",
                notification_type="profile_updated"
            )
        except Exception as e:
            print(f"AUDIT TICKET ERROR (User): {e}")

    return user

@router.delete("/{user_id}", response_model=user_schema.User)
def delete_user(
    user_id: int,
    db: Session = Depends(dependencies.get_db),
    current_user: user_model.User = Depends(dependencies.get_current_active_superuser),
):
    """
    Soft delete a user. Restricted to Superusers.
    """
    user = user_crud.get(db, id=user_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this id does not exist in the system",
        )
    if user.is_superuser:
        raise HTTPException(
            status_code=400,
            detail="Superusers cannot be deleted",
        )

    # Soft Delete Logic: Mutate email
    # Format: local.d.timestamp@domain.com
    # This keeps it a valid EmailStr.
    timestamp = int(datetime.utcnow().timestamp())
    email_parts = user.email.split("@")
    
    if len(email_parts) == 2:
        new_email = f"{email_parts[0]}.d.{timestamp}@{email_parts[1]}"
    else:
        # Fallback if email is weird (shouldn't happen with EmailStr)
        new_email = f"{user.email}.d.{timestamp}"

    user_update = {
        "email": new_email, 
        "is_active": False
    }
    user = user_crud.update(db, db_obj=user, obj_in=user_update)
    return user