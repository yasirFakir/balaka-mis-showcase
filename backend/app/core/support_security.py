from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app import models
from typing import Optional

def check_support_ban(user: Optional[models.User]):
    """
    Checks if a user is banned from the support system.
    Raises HTTPException 403 if banned.
    """
    if not user:
        return # Guests are handled by IP rate limiting separately
        
    if user.is_support_banned_permanently:
        raise HTTPException(
            status_code=403, 
            detail="Your access to support has been permanently revoked due to repeated violations."
        )
    
    if user.support_banned_until:
        now = datetime.now(timezone.utc)
        # Ensure comparison is timezone-aware
        banned_until = user.support_banned_until
        if banned_until.tzinfo is None:
            banned_until = banned_until.replace(tzinfo=timezone.utc)
            
        if banned_until > now:
            remaining = (banned_until - now).total_seconds()
            minutes = int(remaining // 60)
            seconds = int(remaining % 60)
            raise HTTPException(
                status_code=403, 
                detail=f"Support access is temporarily restricted due to excessive activity. Please try again in {minutes}m {seconds}s."
            )

def is_spamming(db: Session, user_id: Optional[int], ticket_id: int) -> bool:
    """
    Checks if the user/guest is sending messages too quickly.
    Threshold: 30 messages in 20 seconds.
    """
    LIMIT_SECONDS = 20
    MAX_MESSAGES = 30
    
    now = datetime.now(timezone.utc)
    since = now - timedelta(seconds=LIMIT_SECONDS)
    
    query = db.query(models.TicketMessage).filter(
        models.TicketMessage.ticket_id == ticket_id,
        models.TicketMessage.created_at >= since
    )
    
    if user_id:
        query = query.filter(models.TicketMessage.sender_id == user_id)
    else:
        # For guests, sender_id is None. 
        # We check messages by None sender in this specific ticket.
        query = query.filter(models.TicketMessage.sender_id == None)
        
    count = query.count()
    return count >= MAX_MESSAGES

def handle_support_violation(db: Session, user: Optional[models.User]):
    """
    Increments violation count and applies tiered punishment.
    Phase 1: 5-minute cooldown.
    Phase 2 (after 3 violations): Permanent ban.
    """
    if not user:
        # Guests are currently only handled by the 429 rate limiter and the is_spamming check
        # which will block the message, but we don't have a permanent record to ban them.
        return 
        
    user.support_violation_count += 1
    
    if user.support_violation_count >= 3:
        user.is_support_banned_permanently = True
        user.support_banned_until = None
    else:
        # Phase 1: 5 minute ban
        user.support_banned_until = datetime.now(timezone.utc) + timedelta(minutes=5)
    
    db.add(user)
    db.commit()
    db.refresh(user)

def check_attachment_limit(db: Session, ticket_id: int, new_attachments_count: int):
    """
    Ensures a ticket doesn't exceed the total attachment limit (e.g., 20 files).
    """
    LIMIT = 20
    import json
    
    messages = db.query(models.TicketMessage).filter(
        models.TicketMessage.ticket_id == ticket_id,
        models.TicketMessage.attachments != None
    ).all()
    
    total_existing = 0
    for m in messages:
        try:
            atts = json.loads(m.attachments)
            if isinstance(atts, list):
                total_existing += len(atts)
        except:
            continue
            
    if total_existing + new_attachments_count > LIMIT:
        raise HTTPException(
            status_code=400,
            detail=f"Attachment limit reached for this ticket (Max {LIMIT} files). Please remove some or contact support via other channels."
        )
