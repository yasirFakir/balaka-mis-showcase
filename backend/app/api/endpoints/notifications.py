from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import schemas, models
from app.crud.notification import notification as notification_crud
from app.api import dependencies

router = APIRouter()

@router.get("", response_model=schemas.ListResponse[schemas.Notification])
@router.get("/", response_model=schemas.ListResponse[schemas.Notification])
def read_notifications(
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
    skip: int = 0,
    limit: int = 50,
):
    """
    Retrieve current user's notifications.
    """
    items, total = notification_crud.get_multi_by_owner_with_count(
        db, user_id=current_user.id, skip=skip, limit=limit
    )
    return {
        "items": items,
        "total": total
    }

@router.put("/{id}/read", response_model=schemas.Notification)
def mark_notification_read(
    *,
    db: Session = Depends(dependencies.get_db),
    id: int,
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    """
    Mark a specific notification as read.
    """
    notification = notification_crud.get(db, id=id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    if notification.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return notification_crud.mark_as_read(db, db_obj=notification)

@router.put("/read-all", response_model=int)
def mark_all_read(
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    """
    Mark all unread notifications for current user as read.
    """
    return notification_crud.mark_all_as_read(db, user_id=current_user.id)
