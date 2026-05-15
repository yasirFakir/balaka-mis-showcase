from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app import schemas, models
from app.api import dependencies
from app.core import security
from app.core.config import settings
from app.crud.user import user as user_crud
from app.core.rate_limiter import limiter
from app.core.lab import lab_service
from app.services.email_service import email_service

router = APIRouter()

@router.post("/login/access-token", response_model=schemas.Token)
@limiter.limit("5/minute")
async def login_access_token(
    request: Request,
    db: Session = Depends(dependencies.get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    user = user_crud.authenticate(
        db, email=form_data.username, password=form_data.password
    )
    if not user:
        await lab_service.log_event("WARNING", "AUTH", f"Failed login attempt for: {form_data.username}")
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    if not user.is_verified:
        raise HTTPException(
            status_code=403, 
            detail="Account not verified. Please check your email for the activation link."
        )

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    await lab_service.log_event("INFO", "AUTH", f"Successful login: {user.email}")
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
        "must_change_password": user.must_change_password
    }

@router.post("/activate-account", response_model=schemas.system.Msg)
async def activate_account(
    token: str = Body(..., embed=True),
    db: Session = Depends(dependencies.get_db),
):
    """
    Activate account using the verification token.
    """
    user = db.query(models.User).filter(
        models.User.activation_token == token,
        models.User.activation_token_expires > datetime.now(timezone.utc)
    ).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired activation token.")
    
    user.is_active = True
    user.is_verified = True
    user.activation_token = None
    user.activation_token_expires = None
    
    db.add(user)
    db.commit()
    
    await lab_service.log_event("INFO", "AUTH", f"Account activated successfully for user ID: {user.id}")
    return {"msg": "Account activated successfully. You can now log in."}

@router.post("/resend-activation", response_model=schemas.system.Msg)
async def resend_activation(
    email: str = Body(..., embed=True),
    db: Session = Depends(dependencies.get_db),
):
    """
    Resend account activation email.
    Includes a 2-minute cooldown check.
    """
    user = user_crud.get_by_email(db, email=email)
    if not user:
        # User enumeration protection
        return {"msg": "If the account exists and is not verified, a new link has been sent."}
    
    if user.is_verified:
        return {"msg": "Account is already verified. Please log in."}

    # Cooldown check: prevent resending if the last token was generated less than 2 minutes ago
    # We use activation_token_expires (set to 24h from creation) to infer creation time
    if user.activation_token_expires:
        creation_time = user.activation_token_expires - timedelta(hours=24)
        if datetime.now(timezone.utc) < creation_time + timedelta(minutes=2):
            seconds_left = int(((creation_time + timedelta(minutes=2)) - datetime.now(timezone.utc)).total_seconds())
            raise HTTPException(
                status_code=429, 
                detail=f"Please wait {seconds_left} seconds before requesting another link."
            )

    # Generate new token
    import secrets
    token = secrets.token_hex(32)
    user.activation_token = token
    user.activation_token_expires = datetime.now(timezone.utc) + timedelta(hours=24)
    
    db.add(user)
    db.commit()

    email_service.send_activation_email(
        email_to=user.email,
        name=user.full_name or "User",
        token=token
    )

    return {"msg": "A new activation link has been sent to your email."}

@router.post("/password-recovery/{email}", response_model=schemas.system.Msg)
async def recover_password(
    request: Request,
    email: str,
    db: Session = Depends(dependencies.get_db),
):
    """
    Password Recovery. Generates a unique hex token and sends an email.
    """
    user = user_crud.get_by_email(db, email=email)

    if not user:
        # Prevent user enumeration
        return {"msg": "If an account exists for this email, you will receive recovery instructions."}

    # Generate high-entropy hex token
    import secrets
    token = secrets.token_hex(32)
    
    # Store in DB with 30 minute expiry
    user.password_reset_token = token
    user.password_reset_expires = datetime.now(timezone.utc) + timedelta(minutes=30)
    db.add(user)
    db.commit()

    is_admin = any(role.name != "Client" for role in user.roles) or user.is_superuser

    email_service.send_password_reset_email(
        email_to=user.email, name=user.full_name or "USER", token=token, is_admin=is_admin
    )
    
    await lab_service.log_event("INFO", "AUTH", f"Password recovery token generated for: {email}")
    return {"msg": "Recovery email sent."}

@router.post("/reset-password/", response_model=schemas.system.Msg)
async def reset_password(
    request: Request,
    token: str = Body(...),
    new_password: str = Body(...),
    db: Session = Depends(dependencies.get_db),
):
    """
    Reset password using the recovery token stored in DB.
    """
    user = db.query(models.User).filter(
        models.User.password_reset_token == token,
        models.User.password_reset_expires > datetime.now(timezone.utc)
    ).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired recovery token.")
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    hashed_password = security.get_password_hash(new_password)
    user.hashed_password = hashed_password
    
    # Clear token after single use
    user.password_reset_token = None
    user.password_reset_expires = None
    
    db.add(user)
    db.commit()
    
    await lab_service.log_event("INFO", "AUTH", f"Password reset successful for user ID: {user.id}")
    return {"msg": "Password updated successfully."}