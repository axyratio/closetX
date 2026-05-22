# app/routes/notification_router.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from app.db.database import get_db
from app.core.authz import authenticate_token
from app.models.user import User
from app.schemas.notification import (
    NotificationListResponse,
    NotificationResponse,
    UnreadCountResponse
)
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/me", response_model=NotificationListResponse)
async def get_my_notifications(
    limit: int = 50,
    offset: int = 0,
    role: Optional[str] = Query(None, description="Filter by receiver_role: buyer or seller"),
    current_user: User = Depends(authenticate_token()),
    db: Session = Depends(get_db)
):
    """ดึงการแจ้งเตือนของฉัน (แยกตาม role ได้)"""
    notifications, total = await NotificationService.get_user_notifications(
        db=db,
        user_id=current_user.user_id,
        limit=limit,
        offset=offset,
        receiver_role=role
    )
    
    unread_count = await NotificationService.get_unread_count(
        db=db,
        user_id=current_user.user_id,
        receiver_role=role
    )
    
    return {
        "notifications": notifications,
        "total": total,
        "unread_count": unread_count
    }


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    role: Optional[str] = Query(None, description="Filter by receiver_role: buyer or seller"),
    current_user: User = Depends(authenticate_token()),
    db: Session = Depends(get_db)
):
    """นับจำนวนการแจ้งเตือนที่ยังไม่อ่าน"""
    unread_count = await NotificationService.get_unread_count(
        db=db,
        user_id=current_user.user_id,
        receiver_role=role
    )
    
    return {"unread_count": unread_count}


@router.get("/badge-count")
async def get_badge_count(
    current_user: User = Depends(authenticate_token()),
    db: Session = Depends(get_db)
):
    """ดึง badge count แยกตาม role (buyer + seller)"""
    buyer_count = await NotificationService.get_unread_count(
        db=db,
        user_id=current_user.user_id,
        receiver_role="buyer"
    )
    seller_count = await NotificationService.get_unread_count(
        db=db,
        user_id=current_user.user_id,
        receiver_role="seller"
    )
    
    return {
        "unread_count": buyer_count + seller_count,
        "buyer_unread": buyer_count,
        "seller_unread": seller_count
    }


@router.post("/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: UUID,
    current_user: User = Depends(authenticate_token()),
    db: Session = Depends(get_db)
):
    """ทำเครื่องหมายว่าอ่านแล้ว"""
    success = await NotificationService.mark_as_read(
        db=db,
        notification_id=notification_id,
        user_id=current_user.user_id
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Marked as read"}


@router.post("/read-all")
async def mark_all_as_read(
    role: Optional[str] = Query(None, description="Filter by receiver_role: buyer or seller"),
    current_user: User = Depends(authenticate_token()),
    db: Session = Depends(get_db)
):
    """ทำเครื่องหมายทั้งหมดว่าอ่านแล้ว (แยกตาม role ได้)"""
    updated = await NotificationService.mark_all_as_read(
        db=db,
        user_id=current_user.user_id,
        receiver_role=role
    )
    
    return {"message": f"Marked {updated} notifications as read"}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: UUID,
    current_user: User = Depends(authenticate_token()),
    db: Session = Depends(get_db)
):
    """ลบการแจ้งเตือน"""
    success = await NotificationService.delete_notification(
        db=db,
        notification_id=notification_id,
        user_id=current_user.user_id
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification deleted"}