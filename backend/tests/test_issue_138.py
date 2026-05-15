import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

from app import models, schemas
from app.core import support_security

def test_support_ban_logic(db: Session):
    # Create a test user
    user = models.User(
        email="test_spam@example.com",
        hashed_password="...",
        full_name="Spammer",
        is_active=True,
        support_violation_count=0
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # 1. First violation -> Cooldown
    support_security.handle_support_violation(db, user)
    assert user.support_violation_count == 1
    assert user.support_banned_until is not None
    assert user.is_support_banned_permanently is False

    # 2. Check ban
    with pytest.raises(Exception) as excinfo:
        support_security.check_support_ban(user)
    assert "temporarily restricted" in str(excinfo.value.detail)

    # 3. Third violation -> Permanent
    support_security.handle_support_violation(db, user) # 2nd
    support_security.handle_support_violation(db, user) # 3rd
    assert user.support_violation_count == 3
    assert user.is_support_banned_permanently is True

    with pytest.raises(Exception) as excinfo:
        support_security.check_support_ban(user)
    assert "permanently revoked" in str(excinfo.value.detail)

def test_spam_detection(db: Session):
    # Create ticket and messages
    user = db.query(models.User).filter(models.User.email == "test_spam@example.com").first()
    ticket = models.SupportTicket(subject="Test", user_id=user.id)
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    # Add 30 messages in quick succession (matches threshold)
    for i in range(30):
        msg = models.TicketMessage(ticket_id=ticket.id, sender_id=user.id, message=f"Spam {i}")
        db.add(msg)
    db.commit()

    # Should be spamming now
    assert support_security.is_spamming(db, user.id, ticket.id) is True

def test_attachment_limit(db: Session):
    user = db.query(models.User).filter(models.User.email == "test_spam@example.com").first()
    ticket = models.SupportTicket(subject="Test Attach", user_id=user.id)
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    # Add 15 attachments
    import json
    msg = models.TicketMessage(
        ticket_id=ticket.id, 
        sender_id=user.id, 
        message="Files", 
        attachments=json.dumps(["url"] * 15)
    )
    db.add(msg)
    db.commit()

    # Try to add 6 more (Total 21 > 20)
    with pytest.raises(Exception) as excinfo:
        support_security.check_attachment_limit(db, ticket.id, 6)
    assert "Attachment limit reached" in str(excinfo.value.detail)
