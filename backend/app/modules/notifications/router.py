from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_token_payload
from app.modules.notifications import schemas, service

router = APIRouter()


@router.get("", response_model=schemas.NotificationListResponse)
def get_notifications(
    token_payload: Optional[dict] = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    """Retrieve all notifications and unread badge count."""
    user_id = token_payload.get("user_id") if token_payload else None
    return service.notification_service.list_notifications(db, user_id)


@router.post("/{notif_id}/read")
def mark_notification_read(
    notif_id: str,
    db: Session = Depends(get_db),
):
    """Mark an individual notification as read."""
    service.notification_service.mark_as_read(db, notif_id)
    return {"status": "marked_read"}


@router.post("/read-all")
def mark_all_notifications_read(
    token_payload: Optional[dict] = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    """Mark all notifications as read."""
    user_id = token_payload.get("user_id") if token_payload else None
    count = service.notification_service.mark_all_as_read(db, user_id)
    return {"status": "all_read", "count": count}
