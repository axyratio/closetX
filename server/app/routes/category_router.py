# File: app/routes/category_router.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.category import Category
from app.services import category_service

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("")
def get_public_categories(db: Session = Depends(get_db)):
    """
    ดึงหมวดหมู่ทั้งหมด (สำหรับหน้าบ้าน - ไม่ต้อง auth)
    เฉพาะหมวดหมู่ที่ active เท่านั้น
    """
    return category_service.get_all_categories_service(db, active_only=True)


@router.get("/{category_id}")
def get_category_detail(
    category_id: str,
    db: Session = Depends(get_db)
):
    """
    ดึงข้อมูลหมวดหมู่ตาม ID (สำหรับหน้าบ้าน)
    """
    return category_service.get_category_by_id_service(db, category_id)

