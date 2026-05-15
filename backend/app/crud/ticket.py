from typing import List, Optional, Tuple, Union, Dict
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, cast, String, func
from app.crud.base import CRUDBase
from app.models.ticket import SupportTicket, TicketMessage
from app.models.user import User
from app.schemas.ticket import SupportTicketCreate, SupportTicketUpdate, TicketMessageCreate
from app.core.security import encrypt_message, decrypt_message

class CRUDSupportTicket(CRUDBase[SupportTicket, SupportTicketCreate, SupportTicketUpdate]):
    def create_with_user(
        self, db: Session, *, obj_in: SupportTicketCreate, user_id: Optional[int] = None
    ) -> SupportTicket:
        # Determine Owner: If admin provided a user_id, use it. Otherwise, creator is owner.
        # If user_id is None, it's a guest session.
        owner_id = obj_in.user_id if obj_in.user_id else user_id
        
        # Create Ticket
        db_obj = SupportTicket(
            user_id=owner_id,
            guest_session_id=obj_in.guest_session_id,
            created_by_id=user_id, # Could be None for guest
            subject=obj_in.subject,
            category=obj_in.category,
            priority=obj_in.priority,
            service_request_id=obj_in.service_request_id,
            status="Open"
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        
        # Create Initial Message
        if obj_in.initial_message:
            msg = TicketMessage(
                ticket_id=db_obj.id,
                sender_id=user_id, # Could be None for guest
                message=encrypt_message(obj_in.initial_message)
            )
            db.add(msg)
            db.commit()
        
        return db_obj

    def get_by_user(self, db: Session, *, user_id: int, skip: int = 0, limit: int = 100) -> List[SupportTicket]:
        return db.query(SupportTicket).filter(SupportTicket.user_id == user_id).offset(skip).limit(limit).all()

    def get_by_guest_session(self, db: Session, *, session_id: str) -> Optional[SupportTicket]:
        return db.query(SupportTicket).filter(
            SupportTicket.guest_session_id == session_id,
            SupportTicket.status.in_(["Open", "In Progress"])
        ).order_by(SupportTicket.created_at.desc()).first()

    def get_multi_with_count(
        self, 
        db: Session, 
        *, 
        skip: int = 0, 
        limit: int = 100, 
        current_user: Optional[User] = None,
        search_query: Optional[str] = None,
        status_filter: Optional[Union[str, List[str]]] = None
    ) -> Tuple[List[SupportTicket], int]:
        from sqlalchemy.orm import aliased
        
        query = db.query(SupportTicket)

        # Permission Scope: "tickets.view_all" sees all. Others see own or participated.
        is_view_all = False
        if current_user:
             is_view_all = current_user.is_superuser or any(
                 any(p.slug == "tickets.view_all" for p in r.permissions) 
                 for r in current_user.roles
             )

        if not is_view_all and current_user:
             participant_user = aliased(User)
             query = query.outerjoin(participant_user, SupportTicket.participants).filter(
                or_(
                    SupportTicket.user_id == current_user.id,
                    participant_user.id == current_user.id
                )
            )
        
        # Search Filtering
        if search_query:
            # Join for user search
            owner_user = aliased(User)
            query = query.outerjoin(owner_user, SupportTicket.user)
            search_term = f"%{search_query}%"
            query = query.filter(
                or_(
                    cast(SupportTicket.id, String).ilike(search_term),
                    SupportTicket.subject.ilike(search_term),
                    SupportTicket.guest_session_id.ilike(search_term),
                    owner_user.full_name.ilike(search_term),
                    owner_user.email.ilike(search_term)
                )
            )

        # Status Filtering
        if status_filter:
            if isinstance(status_filter, list):
                query = query.filter(SupportTicket.status.in_(status_filter))
            else:
                query = query.filter(SupportTicket.status == status_filter)

        total = query.count()
        
        items = query.options(
            joinedload(SupportTicket.user),
            joinedload(SupportTicket.created_by),
            joinedload(SupportTicket.updated_by)
        ).order_by(SupportTicket.id.desc()).offset(skip).limit(limit).all()
        
        return items, total

    def get_status_counts(self, db: Session, *, current_user: Optional[User] = None) -> dict:
        from sqlalchemy.orm import aliased
        query = db.query(SupportTicket.status, func.count(SupportTicket.id))
        
        # Permission Scope: "tickets.view_all" sees all. Others see own or participated.
        is_view_all = False
        if current_user:
             is_view_all = current_user.is_superuser or any(
                 any(p.slug == "tickets.view_all" for p in r.permissions) 
                 for r in current_user.roles
             )

        if not is_view_all and current_user:
             participant_user = aliased(User)
             query = query.outerjoin(participant_user, SupportTicket.participants).filter(
                or_(
                    SupportTicket.user_id == current_user.id,
                    participant_user.id == current_user.id
                )
            )
            
        result = query.group_by(SupportTicket.status).all()
        return dict(result)

class CRUDTicketMessage(CRUDBase[TicketMessage, TicketMessageCreate, TicketMessageCreate]):
    def create_with_sender(
        self, db: Session, *, obj_in: TicketMessageCreate, ticket_id: int, sender_id: Optional[int] = None
    ) -> TicketMessage:
        import json
        attachments_str = json.dumps(obj_in.attachments) if obj_in.attachments else None
        
        db_obj = TicketMessage(
            ticket_id=ticket_id,
            sender_id=sender_id,
            message=encrypt_message(obj_in.message),
            attachments=attachments_str
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        
        # Return decrypted version in the object for response
        db_obj.message = obj_in.message 
        return db_obj
        
    def get_by_ticket(self, db: Session, *, ticket_id: int) -> List[TicketMessage]:
        messages = db.query(TicketMessage).filter(TicketMessage.ticket_id == ticket_id).order_by(TicketMessage.created_at).all()
        for msg in messages:
            msg.message = decrypt_message(msg.message)
        return messages

ticket = CRUDSupportTicket(SupportTicket)
message = CRUDTicketMessage(TicketMessage)
