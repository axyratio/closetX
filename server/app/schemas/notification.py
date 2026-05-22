# app/schemas/notification.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class NotificationResponse(BaseModel):
    notification_id: UUID
    notification_type: str
    title: str
    message: str
    order_id: Optional[UUID] = None
    store_id: Optional[UUID] = None
    conversation_id: Optional[UUID] = None
    image_url: Optional[str] = None
    is_read: bool
    receiver_role: Optional[str] = "buyer"
    created_at: datetime
    read_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    notifications: list[NotificationResponse]
    total: int
    unread_count: int


class UnreadCountResponse(BaseModel):
    unread_count: int