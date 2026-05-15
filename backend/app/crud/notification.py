from typing import List, Tuple
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.notification import Notification
from app.schemas.notification import NotificationCreate, NotificationUpdate

class CRUDNotification(CRUDBase[Notification, NotificationCreate, NotificationUpdate]):
    def get_multi_by_owner(
        self, db: Session, *, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[Notification]:
        return (
            db.query(self.model)
            .filter(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_multi_by_owner_with_count(
        self, db: Session, *, user_id: int, skip: int = 0, limit: int = 100
    ) -> Tuple[List[Notification], int]:
        query = db.query(self.model).filter(Notification.user_id == user_id)
        total = query.count()
        items = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()
        return items, total

    def mark_as_read(self, db: Session, *, db_obj: Notification) -> Notification:
        db_obj.is_read = True
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def mark_all_as_read(self, db: Session, *, user_id: int) -> int:
        rows = db.query(self.model).filter(
            Notification.user_id == user_id, 
            Notification.is_read == False
        ).update({"is_read": True})
        db.commit()
        return rows

    def create_no_commit(self, db: Session, *, obj_in: NotificationCreate) -> Notification:
        db_obj = Notification(
            user_id=obj_in.user_id,
            title=obj_in.title,
            message=obj_in.message,
            link=obj_in.link,
            notification_type=obj_in.notification_type
        )
        db.add(db_obj)
        return db_obj

notification = CRUDNotification(Notification)
