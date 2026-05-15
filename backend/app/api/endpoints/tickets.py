from typing import Any, List, Optional
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session, joinedload

from app import schemas, models
from app.api import dependencies
from app.crud.ticket import ticket as ticket_crud, message as message_crud
from app.crud.service_request import service_request as service_request_crud
from app.core.events import event_broadcaster
from app.core.rate_limiter import limiter
import json

router = APIRouter()

@router.post("", response_model=schemas.SupportTicket)
@router.post("/", response_model=schemas.SupportTicket)
async def create_ticket(
    request: Request,
    *,
    db: Session = Depends(dependencies.get_db),
    ticket_in: schemas.SupportTicketCreate,
    current_user: Optional[models.User] = Depends(dependencies.get_current_user_optional),
):
    """
    Create a new support ticket (Authenticated or Guest).
    """
    # 1. Identify User
    user_id = current_user.id if current_user else None
    
    # 2. Context Validation & Permission
    target_user_id = user_id
    if ticket_in.user_id and ticket_in.user_id != user_id:
        # Only admins can create on behalf of others
        if not current_user or (not dependencies.check_permission(current_user, "tickets.manage") and not current_user.is_superuser):
             raise HTTPException(status_code=403, detail="Not authorized to create tickets for other users.")
        target_user_id = ticket_in.user_id

    if ticket_in.service_request_id:
        req = service_request_crud.get(db, id=ticket_in.service_request_id)
        if not req or (target_user_id and req.user_id != target_user_id):
             raise HTTPException(status_code=400, detail="Invalid Service Request ID or it belongs to another user")

    # Anti-Spam Check
    if current_user:
        from app.core import support_security
        support_security.check_support_ban(current_user)

    ticket = ticket_crud.create_with_user(
        db, obj_in=ticket_in, user_id=user_id
    )
    
    await event_broadcaster.broadcast({
        "event": "ticket_created",
        "data": {
            "id": ticket.id,
            "subject": ticket.subject,
            "status": ticket.status,
            "category": ticket.category,
            "service_request_id": ticket.service_request_id,
            "user_id": ticket.user_id,
            "guest_session_id": ticket.guest_session_id
        }
    })
    
    return ticket

@router.post("/auto-create", response_model=schemas.SupportTicket)
async def auto_create_ticket(
    *,
    db: Session = Depends(dependencies.get_db),
    service_request_id: int,
    current_user: models.User = Depends(dependencies.require_permission("tickets.manage")),
):
    """
    Finds or creates a support ticket linked to a service request.
    Smartly identifies agents from form_data and adds them as participants.
    """
    # 1. Check for existing ticket
    existing = db.query(models.SupportTicket).filter(
        models.SupportTicket.service_request_id == service_request_id
    ).first()
    
    if existing:
        return existing

    # 2. Fetch context
    req = service_request_crud.get(db, id=service_request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Service Request not found")

    # 3. Identify involved Staff from form data
    participants = [current_user] # Always include the admin who opened it
    
    if req.service_definition.form_schema:
        # Get all fields that are staff selectors
        staff_field_keys = []
        for section in req.service_definition.form_schema.get("sections", []):
            for field in section.get("fields", []):
                if field.get("source") == "staff":
                    staff_field_keys.append(field.get("key"))
        
        # Look for these keys in form_data
        for key in staff_field_keys:
            agent_label = req.form_data.get(key) # Format: "Full Name (Category - Office)"
            if agent_label and isinstance(agent_label, str):
                # Extract full name (everything before the first parenthesis)
                name_part = agent_label.split("(")[0].strip()
                # Find this staff in DB
                staff_member = db.query(models.User).filter(models.User.full_name == name_part).first()
                if staff_member and staff_member not in participants:
                    participants.append(staff_member)

    # 4. Create new ticket
    ticket_in = schemas.SupportTicketCreate(
        subject=f"Audit Thread: {req.service_definition.name} (ID: #{service_request_id})",
        priority="Medium",
        category="Order",
        initial_message="System initialized coordination thread. Involved agents have been automatically added.",
        service_request_id=service_request_id,
        user_id=req.user_id 
    )

    ticket = ticket_crud.create_with_user(
        db, obj_in=ticket_in, user_id=current_user.id
    )
    
    # Link participants
    ticket.participants = participants
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    
    # Notify
    await event_broadcaster.broadcast({
        "event": "ticket_created",
        "data": {
            "id": ticket.id,
            "subject": ticket.subject,
            "user_id": ticket.user_id,
            "participant_ids": [p.id for p in participants]
        }
    })
    
    return ticket

@router.get("", response_model=schemas.ListResponse[schemas.SupportTicket])
@router.get("/", response_model=schemas.ListResponse[schemas.SupportTicket])
def read_tickets(
    db: Session = Depends(dependencies.get_db),
    skip: int = 0,
    limit: int = 100,
    q: Optional[str] = None,
    status: Optional[List[str]] = Query(None),
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    """
    List tickets.
    - Staff with 'tickets.view_all' see ALL.
    - Regular users/staff see tickets they OWN or are PARTICIPANTS in.
    Supports search (q) and status filter.
    """
    status_filter = status
    if status and len(status) > 0:
        if "Active" in status:
            active_statuses = ["Open", "In Progress", "Escalated"]
            status_filter = [s for s in status if s != "Active"]
            status_filter.extend(active_statuses)
            status_filter = list(set(status_filter))

    items, total = ticket_crud.get_multi_with_count(
        db,
        skip=skip,
        limit=limit,
        current_user=current_user,
        search_query=q,
        status_filter=status_filter
    )
    
    # Calculate Stats
    raw_counts = ticket_crud.get_status_counts(db, current_user=current_user)
    
    stats = {
        "all": sum(raw_counts.values()),
        "open": raw_counts.get("Open", 0),
        "in_progress": raw_counts.get("In Progress", 0),
        "escalated": raw_counts.get("Escalated", 0),
        "resolved": raw_counts.get("Resolved", 0),
        "closed": raw_counts.get("Closed", 0),
    }
    
    # Active = Open + In Progress + Escalated
    active_keys = ["Open", "In Progress", "Escalated"]
    stats["active"] = sum(count for st, count in raw_counts.items() if st in active_keys)

    return {
        "items": items,
        "total": total,
        "summary": { "stats": stats }
    }

@router.get("/active-session", response_model=Optional[schemas.SupportTicket])
def get_active_support_session(
    db: Session = Depends(dependencies.get_db),
    guest_session_id: Optional[str] = Query(None),
    current_user: Optional[models.User] = Depends(dependencies.get_current_user_optional),
):
    """
    Finds the latest 'Open' or 'In Progress' live support ticket for the user or guest.
    Used for 'Quick Chat' session persistence.
    """
    active_statuses = ["Open", "In Progress"]
    session_subjects = ["Live Support Inquiry", "General Support Inquiry (Quick Chat)"]
    
    query = db.query(models.SupportTicket).options(
        joinedload(models.SupportTicket.user),
        joinedload(models.SupportTicket.created_by)
    ).filter(
        models.SupportTicket.status.in_(active_statuses),
        models.SupportTicket.subject.in_(session_subjects)
    )

    if current_user:
        query = query.filter(models.SupportTicket.user_id == current_user.id)
    elif guest_session_id:
        query = query.filter(models.SupportTicket.guest_session_id == guest_session_id)
    else:
        return None

    ticket = query.order_by(models.SupportTicket.created_at.desc()).first()
    return ticket

@router.get("/{ticket_id}", response_model=schemas.SupportTicket)
def read_ticket(
    *,
    db: Session = Depends(dependencies.get_db),
    ticket_id: int,
    guest_session_id: Optional[str] = Query(None),
    current_user: Optional[models.User] = Depends(dependencies.get_current_user_optional),
):
    """
    Get ticket details. Supports guest verification via session_id.
    """
    from sqlalchemy.orm import joinedload
    ticket = db.query(models.SupportTicket).options(
        joinedload(models.SupportTicket.user),
        joinedload(models.SupportTicket.created_by),
        joinedload(models.SupportTicket.updated_by)
    ).filter(models.SupportTicket.id == ticket_id).first()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    # Permission logic
    if current_user:
        is_staff = dependencies.check_permission(current_user, "tickets.view_all")
        if not is_staff and ticket.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    elif guest_session_id:
        if ticket.guest_session_id != guest_session_id:
            raise HTTPException(status_code=403, detail="Not authorized to view this guest session")
    else:
        raise HTTPException(status_code=401, detail="Authentication required or guest session ID missing")
        
    return ticket

@router.get("/{ticket_id}/messages", response_model=schemas.ListResponse[schemas.TicketMessage])
def read_ticket_messages(
    *,
    db: Session = Depends(dependencies.get_db),
    ticket_id: int,
    guest_session_id: Optional[str] = Query(None),
    current_user: Optional[models.User] = Depends(dependencies.get_current_user_optional),
):
    """
    Get messages for a ticket. Supports guest verification.
    """
    # Verify access (reuse same logic as read_ticket)
    read_ticket(db=db, ticket_id=ticket_id, guest_session_id=guest_session_id, current_user=current_user)

    items = message_crud.get_by_ticket(db, ticket_id=ticket_id)
    return {
        "items": items,
        "total": len(items)
    }

@router.post("/{ticket_id}/messages", response_model=schemas.TicketMessage)
async def create_reply(
    *,
    db: Session = Depends(dependencies.get_db),
    ticket_id: int,
    message_in: schemas.TicketMessageCreate,
    guest_session_id: Optional[str] = Query(None),
    current_user: Optional[models.User] = Depends(dependencies.get_current_user_optional),
):
    """
    Reply to a ticket. Supports guests.
    """
    ticket = ticket_crud.get(db, id=ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if ticket.status == "Closed":
        raise HTTPException(status_code=400, detail="This ticket is closed. Please create a new one.")
        
    # Verify access
    user_id = None
    if current_user:
        user_id = current_user.id
        is_staff = dependencies.check_permission(current_user, "tickets.view_all")
        if not is_staff and ticket.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Anti-Spam Check (Authenticated)
        from app.core import support_security
        support_security.check_support_ban(current_user)
        
        if support_security.is_spamming(db, user_id, ticket_id):
            support_security.handle_support_violation(db, current_user)
            # Re-check ban to raise the error immediately
            support_security.check_support_ban(current_user)

    elif guest_session_id:
        if ticket.guest_session_id != guest_session_id:
            raise HTTPException(status_code=403, detail="Not authorized to reply to this guest session")
        
        # Anti-Spam Check (Guest)
        from app.core import support_security
        if support_security.is_spamming(db, None, ticket_id):
            raise HTTPException(status_code=429, detail="Too many messages. Please wait a moment.")
    else:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Attachment Limit Check
    if message_in.attachments:
        from app.core import support_security
        support_security.check_attachment_limit(db, ticket_id, len(message_in.attachments))

    message = message_crud.create_with_sender(
        db, obj_in=message_in, ticket_id=ticket_id, sender_id=user_id
    )
    
    # NEW: Real-time Notifications Hub
    from app.core.notifications import notification_manager
    
    # Determine routing logic
    is_staff_reply = current_user and (current_user.is_superuser or any(r.name in ["Admin", "Manager", "Support"] for r in current_user.roles))
    
    if is_staff_reply:
        # Notify the client (owner of the ticket)
        if ticket.user_id:
            await notification_manager.create_notification(
                db,
                user_id=ticket.user_id,
                title="Support Response Received",
                message=f"Agent: {message.message[:60]}...",
                link=f"/support/{ticket.id}",
                notification_type="support_message"
            )
    else:
        # Client or Guest replied -> Notify relevant staff
        sender_name = current_user.full_name if current_user else "Guest"
        await notification_manager.notify_staff(
            db,
            title=f"Chat: {sender_name}",
            message=f"{message.message[:60]}...",
            link=f"/support/{ticket.id}",
            required_permission="tickets.view_all",
            notification_type="support_message"
        )

    await event_broadcaster.broadcast({
        "event": "ticket_message_created",
        "data": {
            "ticket_id": ticket_id,
            "message_id": message.id,
            "sender_id": message.sender_id
        }
    })
    
    return message

@router.put("/{ticket_id}/status", response_model=schemas.SupportTicket)
async def update_ticket_status(
    *,
    db: Session = Depends(dependencies.get_db),
    ticket_id: int,
    status_in: schemas.SupportTicketUpdate,
    current_user: models.User = Depends(dependencies.require_permission("tickets.manage")),
):
    """
    Update ticket status/priority. Staff only.
    """
    ticket = ticket_crud.get(db, id=ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    ticket = ticket_crud.update(db, db_obj=ticket, obj_in=status_in, updated_by_id=current_user.id)
    
    await event_broadcaster.broadcast({
        "event": "ticket_updated",
        "data": {
            "id": ticket.id,
            "status": ticket.status,
            "priority": ticket.priority
        }
    })
    
    return ticket

@router.get("/admin/banned-users", response_model=schemas.ListResponse[schemas.User])
def get_banned_users(
    db: Session = Depends(dependencies.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(dependencies.require_permission("tickets.manage")),
):
    """
    List users with active support bans or high violation counts.
    """
    now = datetime.now(timezone.utc)
    query = db.query(models.User).filter(
        (models.User.is_support_banned_permanently == True) |
        (models.User.support_banned_until > now) |
        (models.User.support_violation_count > 0)
    )
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return {"items": items, "total": total}

@router.post("/admin/lift-ban/{user_id}", response_model=schemas.User)
def lift_support_ban(
    user_id: int,
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.require_permission("tickets.manage")),
):
    """
    Manually lift a support ban for a user.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_support_banned_permanently = False
    user.support_banned_until = None
    user.support_violation_count = 0
    db.add(user)
    db.commit()
    db.refresh(user)
    return user