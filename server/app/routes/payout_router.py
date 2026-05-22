# =============================================================
# FILE: app/routes/payout_router.py
# PURPOSE: API endpoints สำหรับดูประวัติการโอนเงิน
# =============================================================

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from app.db.database import get_db
from app.core.authz import authenticate_token
from app.models.user import User
from app.services.payout_service import PayoutService
from app.utils.response_handler import success_response

router = APIRouter(
    prefix="/payouts",
    tags=["Payouts"],
)


@router.get("/")
def get_payout_history(
    store_id: Optional[UUID] = None,
    order_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token()),
):
    """
    ดึงประวัติการโอนเงิน
    
    Query Parameters:
    - store_id: กรองตามร้าน (optional)
    - order_id: กรองตามออเดอร์ (optional)
    
    สำหรับ:
    - Admin: ดูทุกร้าน
    - Seller: ดูเฉพาะร้านของตัวเอง
    """
    # ถ้าเป็น seller ให้กรองเฉพาะร้านของตัวเอง
    if "seller" in [role.role_name for role in current_user.roles]:
        # ดึง store_id ของผู้ใช้
        from app.models.store import Store
        user_store = db.query(Store).filter(Store.user_id == current_user.user_id).first()
        if user_store:
            store_id = user_store.store_id
    
    payouts = PayoutService.get_payout_history(
        db=db,
        store_id=store_id,
        order_id=order_id
    )
    
    return success_response(
        message="ดึงประวัติการโอนเงินสำเร็จ",
        data={
            "payouts": payouts,
            "total": len(payouts)
        }
    )


@router.get("/stats")
def get_payout_stats(
    store_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token()),
):
    """
    สถิติการโอนเงิน
    
    Returns:
    - ยอดรวมที่โอนแล้ว
    - ค่าธรรมเนียมรวม
    - จำนวนการโอนสำเร็จ/ล้มเหลว
    """
    from app.models.store_payout import StorePayout
    from sqlalchemy import func
    
    # ถ้าเป็น seller ให้ดูเฉพาะร้านของตัวเอง
    if "seller" in [role.role_name for role in current_user.roles]:
        from app.models.store import Store
        user_store = db.query(Store).filter(Store.user_id == current_user.user_id).first()
        if user_store:
            store_id = user_store.store_id
    
    query = db.query(
        func.count(StorePayout.payout_id).label("total_count"),
        func.sum(StorePayout.net_amount).label("total_transferred"),
        func.sum(StorePayout.platform_fee).label("total_fees"),
        func.count(
            func.nullif(StorePayout.status == "completed", False)
        ).label("successful_count"),
        func.count(
            func.nullif(StorePayout.status == "failed", False)
        ).label("failed_count")
    )
    
    if store_id:
        query = query.filter(StorePayout.store_id == store_id)
    
    result = query.first()
    
    return success_response(
        message="ดึงสถิติสำเร็จ",
        data={
            "total_payouts": result.total_count or 0,
            "total_amount_transferred": float(result.total_transferred or 0),
            "total_platform_fees": float(result.total_fees or 0),
            "successful_payouts": result.successful_count or 0,
            "failed_payouts": result.failed_count or 0
        }
    )


@router.get("/{payout_id}")
def get_payout_detail(
    payout_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token()),
):
    """
    ดูรายละเอียดการโอนเงิน
    """
    from app.models.store_payout import StorePayout
    from app.models.store import Store
    
    payout = (
        db.query(StorePayout)
        .filter(StorePayout.payout_id == payout_id)
        .first()
    )
    
    if not payout:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูลการโอนเงิน")
    
    # ตรวจสอบสิทธิ์ (seller ดูได้เฉพาะร้านตัวเอง)
    if "seller" in [role.role_name for role in current_user.roles]:
        user_store = db.query(Store).filter(Store.user_id == current_user.user_id).first()
        if not user_store or user_store.store_id != payout.store_id:
            raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์เข้าถึงข้อมูลนี้")
    
    return success_response(
        message="ดึงรายละเอียดสำเร็จ",
        data={
            "payout_id": str(payout.payout_id),
            "store_id": str(payout.store_id),
            "store_name": payout.store.name if payout.store else None,
            "order_id": str(payout.order_id),
            "transfer_id": payout.transfer_id,
            "transfer_group": payout.transfer_group,
            "amount": float(payout.amount),
            "platform_fee": float(payout.platform_fee),
            "net_amount": float(payout.net_amount),
            "status": payout.status,
            "error_message": payout.error_message,
            "transferred_at": payout.transferred_at.isoformat() if payout.transferred_at else None,
            "created_at": payout.created_at.isoformat() if payout.created_at else None
        }
    )