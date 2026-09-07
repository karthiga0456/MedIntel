from typing import List, Optional
from sqlalchemy.orm import Session
from app.db.models import Notification
from app.modules.notifications.schemas import NotificationCreate, NotificationListResponse, NotificationResponse


class NotificationService:
    def create_notification(self, db: Session, data: NotificationCreate) -> Notification:
        notif = Notification(
            title=data.title,
            message=data.message,
            category=data.category.upper(),
            user_id=data.user_id,
            is_read=False,
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)
        return notif

    def list_notifications(self, db: Session, user_id: Optional[str] = None) -> NotificationListResponse:
        q = db.query(Notification)
        if user_id:
            # notifications for this user or global system notifications (user_id is None)
            q = q.filter((Notification.user_id == user_id) | (Notification.user_id.is_(None)))
        items = q.order_by(Notification.created_at.desc()).all()
        unread = sum(1 for n in items if not n.is_read)
        return NotificationListResponse(
            notifications=[NotificationResponse.model_validate(n) for n in items],
            unread_count=unread,
        )

    def mark_as_read(self, db: Session, notif_id: str) -> None:
        notif = db.query(Notification).filter(Notification.id == notif_id).first()
        if notif:
            notif.is_read = True
            db.commit()

    def mark_all_as_read(self, db: Session, user_id: Optional[str] = None) -> int:
        q = db.query(Notification).filter(Notification.is_read == False)  # noqa: E712
        if user_id:
            q = q.filter((Notification.user_id == user_id) | (Notification.user_id.is_(None)))
        count = q.count()
        q.update({"is_read": True}, synchronize_session=False)
        db.commit()
        return count


notification_service = NotificationService()
