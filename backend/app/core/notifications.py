from typing import List, Optional, Any
from sqlalchemy.orm import Session
from app import models, schemas
from app.crud.notification import notification as notification_crud
from app.core.events import event_broadcaster
from app.api.dependencies import check_permission
import json

class NotificationManager:
    """
    Centralized hub for creating and dispatching notifications dynamically.
    Handles database persistence and real-time SSE broadcasting.
    """
    
    async def create_notification(
        self,
        db: Session,
        *,
        user_id: int,
        title: str,
        message: str,
        title_bn: Optional[str] = None,
        message_bn: Optional[str] = None,
        link: Optional[str] = None,
        notification_type: str = "system"
    ):
        # 1. Create DB Record
        obj_in = schemas.NotificationCreate(
            user_id=user_id,
            title=title,
            title_bn=title_bn,
            message=message,
            message_bn=message_bn,
            link=link,
            notification_type=notification_type
        )
        notification = notification_crud.create(db, obj_in=obj_in)
        
        # 2. Broadcast via SSE
        await event_broadcaster.broadcast({
            "event": "new_notification",
            "data": {
                "id": notification.id,
                "user_id": user_id,
                "title": title,
                "title_bn": title_bn,
                "message": message,
                "message_bn": message_bn,
                "link": link,
                "type": notification_type,
                "created_at": str(notification.created_at)
            }
        })
        return notification

    async def notify_staff(
        self,
        db: Session,
        *,
        title: str,
        message: str,
        title_bn: Optional[str] = None,
        message_bn: Optional[str] = None,
        link: Optional[str] = None,
        required_permission: str = "requests.view_all",
        service_def_id: Optional[int] = None,
        notification_type: str = "staff_action"
    ):
        """
        Dynamically finds all staff members who should see this event.
        """
        staff_users = db.query(models.User).filter(models.User.is_active == True).all()
        
        notifications_to_broadcast = []

        for user in staff_users:
            should_notify = False
            
            if user.is_superuser or any(r.name == "Admin" for r in user.roles):
                should_notify = True
            elif check_permission(user, required_permission):
                if not user.allowed_services:
                    should_notify = True
                elif service_def_id and any(s.id == service_def_id for s in user.allowed_services):
                    should_notify = True
            
            if should_notify:
                obj_in = schemas.NotificationCreate(
                    user_id=user.id,
                    title=title,
                    title_bn=title_bn,
                    message=message,
                    message_bn=message_bn,
                    link=link,
                    notification_type=notification_type
                )
                notif = notification_crud.create_no_commit(db, obj_in=obj_in)
                notifications_to_broadcast.append((user.id, notif))

        if notifications_to_broadcast:
            db.commit() # Single commit for all staff notifications
            
            # Broadcast all after commit
            for user_id, notif in notifications_to_broadcast:
                db.refresh(notif)
                await event_broadcaster.broadcast({
                    "event": "new_notification",
                    "data": {
                        "id": notif.id,
                        "user_id": user_id,
                        "title": notif.title,
                        "title_bn": notif.title_bn,
                        "message": notif.message,
                        "message_bn": notif.message_bn,
                        "link": notif.link,
                        "type": notif.notification_type,
                        "created_at": str(notif.created_at)
                    }
                })

notification_manager = NotificationManager()