from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class NotificationCreate(BaseModel):
    title: str
    message: str
    category: str = "SYSTEM"  # EMERGENCY, OUTBREAK, REMINDER, SYSTEM
    user_id: Optional[str] = None


class NotificationResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    title: str
    message: str
    category: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse] = []
    unread_count: int = 0
