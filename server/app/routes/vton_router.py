# app/routes/vton_routes.py
"""
API Routes สำหรับระบบ Virtual Try-On (VTON)
"""
from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.services import vton_service
from app.core.authz import authenticate_token

router = APIRouter(prefix="/vton", tags=["Virtual Try-On"])


# ==================== USER TRYON IMAGES ====================

@router.post("/user-images")
async def upload_user_tryon_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(authenticate_token())
):
    """
    อัปโหลดรูปโมเดลของผู้ใช้
    - อัปโหลดทันทีและได้ user_image_id กลับมา
    """
    return await vton_service.upload_user_tryon_image(db, user, file)


@router.get("/user-images")
def get_user_tryon_images(
    db: Session = Depends(get_db),
    user: User = Depends(authenticate_token())
):
    """ดึงรูปโมเดลทั้งหมดของผู้ใช้"""
    return vton_service.get_user_tryon_images(db, user)


@router.delete("/user-images/{user_image_id}")
def delete_user_tryon_image(
    user_image_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(authenticate_token())
):
    """ลบรูปโมเดล"""
    return vton_service.delete_user_tryon_image(db, user, user_image_id)


# ==================== GARMENT IMAGES (OUTFIT) ====================

@router.post("/garments")
async def upload_garment_image(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(authenticate_token())
):
    """
    อัปโหลดรูปเสื้อผ้า (Outfit)
    - อัปโหลดทันทีและได้ garment_id กลับมา
    - ใช้สำหรับลองเสื้อโดยไม่ต้องมี Product
    """
    return await vton_service.upload_garment_image(db, user, file, name)


@router.get("/garments")
def get_garment_images(
    db: Session = Depends(get_db),
    user: User = Depends(authenticate_token())
):
    """ดึงรูปเสื้อผ้าทั้งหมดของผู้ใช้"""
    return vton_service.get_garment_images(db, user)


@router.delete("/garments/{garment_id}")
def delete_garment_image(
    garment_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(authenticate_token())
):
    """ลบรูปเสื้อผ้า"""
    return vton_service.delete_garment_image(db, user, garment_id)


# ==================== PRODUCT GARMENTS (เสื้อจากสินค้า) ====================

@router.post("/product-garments")
def add_product_garment(
    product_id: UUID = Form(...),
    variant_id: UUID = Form(...),
    db: Session = Depends(get_db),
    user: User = Depends(authenticate_token())
):
    """
    เพิ่มสินค้าเข้า "เสื้อจากสินค้า"
    - เก็บเป็น reference ไว้ใช้ลองชุด
    """
    return vton_service.add_product_garment(db, user, product_id, variant_id)


@router.get("/product-garments")
def get_product_garments(
    db: Session = Depends(get_db),
    user: User = Depends(authenticate_token())
):
    """ดึงรายการเสื้อจากสินค้าทั้งหมด"""
    return vton_service.get_product_garments(db, user)


@router.delete("/product-garments/{variant_id}")
def delete_product_garment(
    variant_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(authenticate_token())
):
    """ลบเสื้อจากสินค้า"""
    return vton_service.delete_product_garment(db, user, variant_id)


# ==================== VTON BACKGROUNDS ====================

@router.post("/backgrounds")
async def upload_vton_background(
    file: UploadFile = File(...),
    name: str = Form(...),
    category: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(authenticate_token())
):
    """
    อัปโหลดพื้นหลังส่วนตัว
    - อัปโหลดทันทีและได้ background_id กลับมา
    """
    return await vton_service.upload_vton_background(db, user, file, name, category)


@router.get("/backgrounds")
def get_vton_backgrounds(
    db: Session = Depends(get_db),
    user: User = Depends(authenticate_token())
):
    """
    ดึงพื้นหลังทั้งหมด
    - System backgrounds (เป็นของระบบ)
    - User backgrounds (ผู้ใช้อัปโหลดเอง)
    """
    return vton_service.get_vton_backgrounds(db, user)


@router.delete("/backgrounds/{background_id}")
def delete_vton_background(
    background_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(authenticate_token())
):
    """ลบพื้นหลัง (เฉพาะที่ผู้ใช้สร้างเอง)"""
    return vton_service.delete_vton_background(db, user, background_id)


# ==================== VTON SESSION ====================

@router.post("/sessions")
def create_vton_session(
    user_image_id: UUID = Form(...),
    background_id: Optional[UUID] = Form(None),
    product_id: Optional[UUID] = Form(None),  # ✅ Optional
    variant_id: Optional[UUID] = Form(None),
    garment_id: Optional[UUID] = Form(None),  # ✅ เพิ่ม garment_id
    db: Session = Depends(get_db),
    user: User = Depends(authenticate_token())
):
    """
    สร้าง VTON Session (ลองเสื้อ)
    
    Parameters:
    - user_image_id: ID ของรูปโมเดลผู้ใช้ (Required)
    - background_id (optional): ID ของพื้นหลัง
    - product_id (optional): ID ของสินค้า (ใช้กับ variant_id)
    - variant_id (optional): ID ของ variant
    - garment_id (optional): ID ของรูปเสื้อที่อัปโหลดเอง
    
    Note: ต้องมี product_id หรือ garment_id อย่างใดอย่างหนึ่ง
    """
    print(f"[VTON ROUTE] Create VTON Session with product_id: {product_id}, garment_id: {garment_id}")
    return vton_service.create_vton_session(
        db, user, user_image_id, background_id,
        product_id, variant_id, garment_id
    )


@router.post("/sessions/{session_id}/change-background")
def change_background_from_session(
    session_id: UUID,
    new_background_id: Optional[UUID] = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(authenticate_token())
):
    """
    เปลี่ยนพื้นหลังจากผลลัพธ์เดิม
    - ใช้ผลลัพธ์จาก session_id ที่เลือก
    - เปลี่ยนแค่พื้นหลัง
    """
    return vton_service.change_background_from_session(
        db, user, session_id, new_background_id
    )


@router.get("/sessions")
def get_vton_sessions(
    limit: int = 20,
    db: Session = Depends(get_db),
    user: User = Depends(authenticate_token())
):
    """ดึงประวัติการลองเสื้อ"""
    return vton_service.get_vton_sessions(db, user, limit)

@router.delete("/sessions/{session_id}")
def delete_vton_session(
    session_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(authenticate_token())
):
    """ลบ VTON Session (ผลลัพธ์การลองชุด)"""
    return vton_service.delete_vton_session(db, user, session_id)