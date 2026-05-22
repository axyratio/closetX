# File: app/services/category_service.py
"""
Category Service - Updated with SVG Image Upload Support
"""
from sqlalchemy.orm import Session
from fastapi import UploadFile, HTTPException
from typing import Optional
import os
import uuid

from app.models.category import Category
from app.models.product import Product
from app.repositories import category_repository
from app.utils.response_handler import success_response, error_response
from app.utils.file_util import (
    save_file, 
    delete_file, 
    USE_CLOUDINARY,
    strip_domain_from_url
)


UPLOAD_DIR = "app/uploads/categories"

# สร้างโฟลเดอร์ถ้ายังไม่มี
if not USE_CLOUDINARY:
    os.makedirs(UPLOAD_DIR, exist_ok=True)

# ✅ รองรับไฟล์รูปภาพทั้งหมด รวม SVG
ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'}
ALLOWED_MIME_TYPES = {
    'image/jpeg', 
    'image/png', 
    'image/gif', 
    'image/webp', 
    'image/svg+xml',  # ✅ MIME type สำหรับ SVG
    'image/svg'       # ✅ บาง browser ใช้แบบนี้
}


def validate_image_file(file: UploadFile) -> bool:
    """
    ตรวจสอบว่าไฟล์เป็นรูปภาพที่รองรับหรือไม่ (รวม SVG)
    """
    # ตรวจสอบ extension
    if file.filename:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            return False
    
    # ตรวจสอบ MIME type (ถ้ามี)
    if file.content_type:
        if file.content_type not in ALLOWED_MIME_TYPES:
            return False
    
    return True


def create_category_service(
    db: Session,
    name: str,
    slug: str,
    description: Optional[str] = None,
    image: Optional[UploadFile] = None
):
    """
    สร้างหมวดหมู่ใหม่พร้อมรูปภาพ (รองรับ SVG)
    """
    try:
        # ตรวจสอบ slug ซ้ำ
        existing = category_repository.get_category_by_slug(db, slug)
        if existing:
            return error_response("Slug นี้มีอยู่แล้ว", {}, 400)
        
        # อัพโหลดรูปภาพ (ถ้ามี)
        image_url = None
        if image and image.filename:
            # ✅ ตรวจสอบประเภทไฟล์
            if not validate_image_file(image):
                return error_response(
                    f"ไฟล์ไม่ถูกต้อง: รองรับเฉพาะ {', '.join(ALLOWED_IMAGE_EXTENSIONS)}", 
                    {}, 
                    400
                )
            
            try:
                # สร้างชื่อไฟล์ unique พร้อม extension เดิม
                ext = os.path.splitext(image.filename)[1].lower()
                unique_filename = f"category_{uuid.uuid4().hex}{ext}"
                image_url = save_file(UPLOAD_DIR, image, unique_filename)
                print(f"✅ Category image uploaded: {image_url}")
            except Exception as e:
                print(f"❌ [create_category] Image upload error: {e}")
                return error_response(f"ไม่สามารถอัพโหลดรูปภาพได้: {str(e)}", {}, 400)
        
        # สร้างหมวดหมู่
        category = Category(
            name=name,
            slug=slug,
            description=description,
            image=image_url,
            is_active=True
        )
        
        category = category_repository.create_category(db, category)
        
        return success_response(
            "สร้างหมวดหมู่สำเร็จ",
            {
                "category_id": str(category.category_id),
                "name": category.name,
                "slug": category.slug,
                "description": category.description,
                "image": category.image,
                "is_active": category.is_active,
            },
            201
        )
    except Exception as e:
        db.rollback()
        print(f"❌ [create_category_service] Error: {e}")
        return error_response("เกิดข้อผิดพลาดขณะสร้างหมวดหมู่", {"error": str(e)}, 500)


def get_all_categories_service(db: Session, active_only: bool = True):
    """
    ดึงหมวดหมู่ทั้งหมด
    """
    try:
        categories = category_repository.get_all_categories(
            db, 
            active_only=active_only
        )
        
        result = []
        for cat in categories:
            # นับจำนวนสินค้าในแต่ละหมวดหมู่
            product_count = db.query(Product).filter(
                Product.category_id == cat.category_id,
                Product.is_active == True
            ).count()
            
            result.append({
                "category_id": str(cat.category_id),
                "name": cat.name,
                "slug": cat.slug,
                "description": cat.description,
                "image": cat.image,
                "is_active": cat.is_active,
                "product_count": product_count,
                "created_at": cat.created_at.isoformat() if cat.created_at else None,
                "updated_at": cat.updated_at.isoformat() if cat.updated_at else None
            })
        
        return success_response("ดึงหมวดหมู่ทั้งหมดสำเร็จ", result)
    except Exception as e:
        print(f"❌ [get_all_categories_service] Error: {e}")
        return error_response("เกิดข้อผิดพลาดขณะดึงหมวดหมู่", {"error": str(e)}, 500)


def get_category_by_id_service(db: Session, category_id: str):
    """
    ดึงข้อมูลหมวดหมู่ตาม ID
    """
    try:
        category = category_repository.get_category_by_id(db, category_id)
        if not category:
            return error_response("ไม่พบหมวดหมู่", {}, 404)
        
        product_count = db.query(Product).filter(
            Product.category_id == category.category_id,
            Product.is_active == True
        ).count()
        
        return success_response("ดึงข้อมูลหมวดหมู่สำเร็จ", {
            "category_id": str(category.category_id),
            "name": category.name,
            "slug": category.slug,
            "description": category.description,
            "image": category.image,
            "is_active": category.is_active,
            "product_count": product_count,
            "created_at": category.created_at.isoformat() if category.created_at else None,
            "updated_at": category.updated_at.isoformat() if category.updated_at else None
        })
    except Exception as e:
        print(f"❌ [get_category_by_id_service] Error: {e}")
        return error_response("เกิดข้อผิดพลาดขณะดึงหมวดหมู่", {"error": str(e)}, 500)


def update_category_service(
    db: Session,
    category_id: str,
    name: Optional[str] = None,
    slug: Optional[str] = None,
    description: Optional[str] = None,
    is_active: Optional[bool] = None,
    image: Optional[UploadFile] = None,
    remove_image: bool = False
):
    """
    อัพเดทหมวดหมู่ รองรับการเปลี่ยนรูปภาพ (รวม SVG)
    """
    try:
        category = category_repository.get_category_by_id(db, category_id)
        if not category:
            return error_response("ไม่พบหมวดหมู่", {}, 404)
        
        # ตรวจสอบ slug ซ้ำ (ถ้ามีการเปลี่ยน)
        if slug and slug != category.slug:
            existing = category_repository.get_category_by_slug(db, slug)
            if existing:
                return error_response("Slug นี้มีอยู่แล้ว", {}, 400)
        
        # เก็บ URL รูปเดิมไว้เผื่อต้องลบ
        old_image_url = category.image
        
        # จัดการรูปภาพ
        if remove_image:
            # ลบรูปภาพเดิม
            if old_image_url:
                try:
                    delete_file(old_image_url)
                    print(f"🗑️ Deleted old category image: {old_image_url}")
                except Exception as e:
                    print(f"⚠️ [update_category] Failed to delete old image: {e}")
            category.image = None
        elif image and image.filename:
            # ✅ ตรวจสอบประเภทไฟล์
            if not validate_image_file(image):
                return error_response(
                    f"ไฟล์ไม่ถูกต้อง: รองรับเฉพาะ {', '.join(ALLOWED_IMAGE_EXTENSIONS)}", 
                    {}, 
                    400
                )
            
            # อัพโหลดรูปใหม่
            try:
                ext = os.path.splitext(image.filename)[1].lower()
                unique_filename = f"category_{uuid.uuid4().hex}{ext}"
                new_image_url = save_file(UPLOAD_DIR, image, unique_filename)
                
                # ลบรูปเดิม (ถ้ามี)
                if old_image_url:
                    try:
                        delete_file(old_image_url)
                        print(f"🗑️ Deleted old category image: {old_image_url}")
                    except Exception as e:
                        print(f"⚠️ [update_category] Failed to delete old image: {e}")
                
                category.image = new_image_url
                print(f"✅ Category image updated: {new_image_url}")
            except Exception as e:
                print(f"❌ [update_category] Image upload error: {e}")
                return error_response(f"ไม่สามารถอัพโหลดรูปภาพได้: {str(e)}", {}, 400)
        
        # อัพเดทข้อมูลอื่นๆ
        if name is not None:
            category.name = name
        if slug is not None:
            category.slug = slug
        if description is not None:
            category.description = description
        if is_active is not None:
            category.is_active = is_active
        
        category = category_repository.update_category(db, category)
        
        return success_response("อัพเดทหมวดหมู่สำเร็จ", {
            "category_id": str(category.category_id),
            "name": category.name,
            "slug": category.slug,
            "description": category.description,
            "image": category.image,
            "is_active": category.is_active,
        })
    except Exception as e:
        db.rollback()
        print(f"❌ [update_category_service] Error: {e}")
        return error_response("เกิดข้อผิดพลาดขณะอัพเดทหมวดหมู่", {"error": str(e)}, 500)


def delete_category_service(db: Session, category_id: str, hard_delete: bool = False):
    """
    ลบหมวดหมู่ (soft delete หรือ hard delete)
    """
    try:
        category = category_repository.get_category_by_id(db, category_id)
        if not category:
            return error_response("ไม่พบหมวดหมู่", {}, 404)
        
        # ตรวจสอบจำนวนสินค้า
        product_count = db.query(Product).filter(
            Product.category_id == category.category_id,
            Product.is_active == True
        ).count()
        
        if product_count > 0 and hard_delete:
            return error_response(
                f"ไม่สามารถลบได้ มีสินค้า {product_count} รายการใช้หมวดหมู่นี้อยู่",
                {"product_count": product_count},
                400
            )
        
        if hard_delete:
            # ลบรูปภาพ (ถ้ามี)
            if category.image:
                try:
                    delete_file(category.image)
                    print(f"🗑️ Deleted category image: {category.image}")
                except Exception as e:
                    print(f"⚠️ [delete_category] Failed to delete image: {e}")
            
            category_repository.hard_delete_category(db, category)
            message = "ลบหมวดหมู่ถาวรสำเร็จ"
        else:
            category_repository.delete_category(db, category)
            message = "ปิดการใช้งานหมวดหมู่สำเร็จ"
        
        return success_response(message, {"category_id": str(category_id)})
    except Exception as e:
        db.rollback()
        print(f"❌ [delete_category_service] Error: {e}")
        return error_response("เกิดข้อผิดพลาดขณะลบหมวดหมู่", {"error": str(e)}, 500)