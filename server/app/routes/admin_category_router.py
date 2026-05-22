# File: app/routes/admin_category_router.py
"""
Admin Category Router - Updated with Image Upload Support
"""
from fastapi import APIRouter, Depends, Body, Form, File, UploadFile
from sqlalchemy.orm import Session
from typing import Optional
from app.db.database import get_db
from app.core.authz import authenticate_token, authorize_role
from app.services import category_service

router = APIRouter(prefix="/admin/categories", tags=["Admin - Categories"])


@router.post("")
def create_category(
    name: str = Form(...),
    slug: str = Form(...),
    description: str = Form(None),
    image: UploadFile = File(None),
    db: Session = Depends(get_db),
    auth_user=Depends(authenticate_token()),
    auth_role=Depends(authorize_role(["admin"]))
):
    """
    สร้างหมวดหมู่ใหม่ พร้อมรูปภาพ (เฉพาะ Admin)
    
    Form Data:
    - name: ชื่อหมวดหมู่ (required)
    - slug: slug สำหรับ URL (required)
    - description: คำอธิบาย (optional)
    - image: ไฟล์รูปภาพ (optional)
    """
    return category_service.create_category_service(
        db, 
        name=name,
        slug=slug,
        description=description,
        image=image
    )


@router.get("")
def get_all_categories(
    active_only: bool = True,
    db: Session = Depends(get_db),
    auth_user=Depends(authenticate_token()),
    auth_role=Depends(authorize_role(["admin"]))
):
    """
    ดึงหมวดหมู่ทั้งหมด (เฉพาะ Admin)
    
    Query Params:
    - active_only: true = เฉพาะที่ active, false = ทั้งหมด
    """
    return category_service.get_all_categories_service(db, active_only)


@router.get("/{category_id}")
def get_category_by_id(
    category_id: str,
    db: Session = Depends(get_db),
    auth_user=Depends(authenticate_token()),
    auth_role=Depends(authorize_role(["admin"]))
):
    """
    ดึงข้อมูลหมวดหมู่ตาม ID (เฉพาะ Admin)
    """
    return category_service.get_category_by_id_service(db, category_id)


@router.patch("/{category_id}")
def update_category(
    category_id: str,
    name: str = Form(None),
    slug: str = Form(None),
    description: str = Form(None),
    is_active: bool = Form(None),
    image: UploadFile = File(None),
    remove_image: bool = Form(False),
    db: Session = Depends(get_db),
    auth_user=Depends(authenticate_token()),
    auth_role=Depends(authorize_role(["admin"]))
):
    """
    อัพเดทหมวดหมู่ (เฉพาะ Admin)
    
    Form Data (ส่งเฉพาะที่ต้องการแก้):
    - name: ชื่อหมวดหมู่
    - slug: slug
    - description: คำอธิบาย
    - is_active: สถานะการใช้งาน
    - image: ไฟล์รูปภาพใหม่
    - remove_image: true = ลบรูปภาพ
    """
    return category_service.update_category_service(
        db, 
        category_id,
        name=name,
        slug=slug,
        description=description,
        is_active=is_active,
        image=image,
        remove_image=remove_image
    )


@router.delete("/{category_id}")
def delete_category(
    category_id: str,
    hard_delete: bool = False,
    db: Session = Depends(get_db),
    auth_user=Depends(authenticate_token()),
    auth_role=Depends(authorize_role(["admin"]))
):
    """
    ลบหมวดหมู่ (เฉพาะ Admin)
    
    Query Params:
    - hard_delete: true = ลบถาวร, false = soft delete (ปิดการใช้งาน)
    """
    return category_service.delete_category_service(db, category_id, hard_delete)