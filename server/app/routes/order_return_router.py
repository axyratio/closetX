# app/routes/order_return_router.py
"""
Router สำหรับการคืนสินค้า

📝 NOTE: ไฟล์ใหม่ - ต้องสร้างในโฟลเดอร์ routes
        และ import ใน main.py: app.include_router(order_return_router.router)
"""
from fastapi import APIRouter, Depends, Body, File, UploadFile
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.db.database import get_db
from app.core.authz import authenticate_token
from app.models.user import User
from app.services.order_return_service import OrderReturnService
from app.models.return_order import ReturnReason
from pydantic import BaseModel


router = APIRouter(prefix="/orders", tags=["Order Returns"])


# ============================================
# Pydantic Schemas
# ============================================

class CreateReturnRequest(BaseModel):
    """Schema สำหรับสร้างคำขอคืนสินค้า"""
    order_id: UUID
    reason: ReturnReason
    reason_detail: Optional[str] = None
    image_ids: Optional[List[str]] = []  # ✅ รับเป็น string แล้วแปลงเป็น UUID ใน service


class ConfirmReceivedRequest(BaseModel):
    """Schema สำหรับยืนยันรับสินค้า"""
    order_id: UUID


# ============================================
# Endpoints
# ============================================

# ✅ 1. อัปโหลดรูปก่อนสร้าง Return Request
@router.post("/return/upload-image")
async def upload_return_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token())
):
    """
    API สำหรับอัปโหลดรูปหลักฐานการคืนสินค้าทีละรูป
    
    - **file**: ไฟล์รูปภาพ (jpg, png)
    - **Return**: { image_id, url } สำหรับเก็บไว้อ้างอิง
    
    📝 ใช้ก่อนสร้าง Return Request จริง
    """
    return await OrderReturnService.upload_return_image_temp(
        db=db,
        user=current_user,
        file=file
    )


# ✅ 2. สร้างคำขอคืนสินค้า (ใช้ image_ids ที่อัปโหลดไว้แล้ว)
@router.post("/return")
def create_return_request(
    data: CreateReturnRequest,
    db: Session = Depends(get_db),
    auth_user = Depends(authenticate_token())
):
    """
    สร้างคำขอคืนสินค้า
    
    - **order_id**: ID ของคำสั่งซื้อ
    - **reason**: เหตุผลการคืน (WRONG_ITEM, DAMAGED, etc.)
    - **reason_detail**: รายละเอียดเพิ่มเติม
    - **image_ids**: รายการ image_id ที่อัปโหลดไว้ก่อนหน้า
    """
    return OrderReturnService.create_return_request(
        db=db,
        user=auth_user,
        order_id=data.order_id,
        reason=data.reason,
        reason_detail=data.reason_detail,
        image_ids=data.image_ids
    )


# ✅ 3. ดูรายการรูปที่อัปโหลดไว้แล้ว (Optional: สำหรับ debug)
@router.get("/return/my-images")
def get_my_uploaded_images(
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token())
):
    """ดูรายการรูปที่อัปโหลดแต่ยังไม่ได้สร้าง Return Request"""
    return OrderReturnService.get_temp_images(db=db, user=current_user)


# ✅ 4. ลบรูปที่อัปโหลดชั่วคราว
@router.delete("/return/images/{image_id}")
def delete_uploaded_image(
    image_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token())
):
    """ลบรูปภาพที่อัปโหลดไว้ก่อนสร้าง Return Request"""
    return OrderReturnService.delete_temp_image(
        db=db,
        user=current_user,
        image_id=image_id
    )


@router.get("/returns/me")
def get_my_returns(
    order_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    auth_user = Depends(authenticate_token())
):
    """
    ดึงรายการคำขอคืนสินค้าของฉัน
    
    - **order_id** (optional): กรองตาม order_id
    """
    return OrderReturnService.get_return_requests(
        db=db,
        user=auth_user,
        order_id=order_id
    )


@router.get("/returns/{return_id}")
def get_return_detail(
    return_id: UUID,
    db: Session = Depends(get_db),
    auth_user = Depends(authenticate_token())
):
    """
    ดูรายละเอียดคำขอคืนสินค้า
    
    - **return_id**: ID ของคำขอคืนสินค้า
    """
    from app.models.return_order import ReturnOrder
    
    return_order = (
        db.query(ReturnOrder)
        .filter(
            ReturnOrder.return_id == return_id,
            ReturnOrder.user_id == auth_user.user_id
        )
        .first()
    )
    
    if not return_order:
        from app.utils.response_handler import error_response
        return error_response("ไม่พบข้อมูล", {}, 404)
    
    from app.utils.response_handler import success_response
    return success_response(
        "ดึงข้อมูลสำเร็จ",
        {
            "return_id": str(return_order.return_id),
            "order_id": str(return_order.order_id),
            "reason": return_order.reason.value,
            "reason_detail": return_order.reason_detail,
            "image_urls": return_order.image_urls,
            "status": return_order.status.value,
            "status_text": return_order.status_text,
            "refund_amount": return_order.refund_amount,
            "store_note": return_order.store_note,
            "created_at": return_order.created_at.isoformat() if return_order.created_at else None,
            "updated_at": return_order.updated_at.isoformat() if return_order.updated_at else None,
        }
    )