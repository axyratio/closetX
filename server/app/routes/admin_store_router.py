# app/routes/admin_store_router.py
"""
Router สำหรับ Admin จัดการร้านค้า
- ค้นหาร้านค้า
- ดูรายละเอียดร้านค้า
- ปิด/เปิดร้านค้า
- แก้ไขข้อมูลร้านค้า (ใช้ UI เดิมของ seller)
- จัดการสินค้าในร้าน (ใช้ UI เดิมของ seller)
"""

import os
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Form, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
import stripe

from app.db.database import get_db
from app.core.authz import authorize_role
from app.core.config import settings
from app.models.store import Store
from app.models.product import Product
from app.models.user import User
from app.utils.response_handler import success_response, error_response
from app.services.store_service import update_store_service
from app.services.product_service import update_product_service

router = APIRouter(prefix="/admin/stores", tags=["Admin Store Management"])


@router.get("/")
def get_all_stores(
    search: Optional[str] = Query(None, description="ค้นหาชื่อร้านหรือเจ้าของ"),
    status: Optional[str] = Query(None, description="กรองตามสถานะ: active, inactive"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    auth_admin=Depends(authorize_role(["admin"])),
):
    """
    ดึงรายการร้านค้าทั้งหมด (สำหรับ Admin)
    - รองรับการค้นหาตามชื่อร้านหรือเจ้าของ
    - กรองตามสถานะ active/inactive
    """
    try:
        query = db.query(Store).join(User, Store.user_id == User.user_id)
        
        # ค้นหาตามชื่อร้านหรือเจ้าของ
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    Store.name.ilike(search_pattern),
                    User.username.ilike(search_pattern),
                    User.email.ilike(search_pattern)
                )
            )
        
        # กรองตามสถานะ
        if status:
            is_active = status.lower() == "active"
            query = query.filter(Store.is_active == is_active)
        
        # นับจำนวนทั้งหมด
        total = query.count()
        
        # ดึงข้อมูลพร้อม pagination
        stores = query.offset(skip).limit(limit).all()
        
        # จัดรูปแบบข้อมูล
        result = []
        for store in stores:
            owner = db.query(User).filter(User.user_id == store.user_id).first()
            product_count = db.query(func.count(Product.product_id)).filter(
                Product.store_id == store.store_id
            ).scalar()
            
            result.append({
                "store_id": str(store.store_id),
                "name": store.name,
                "description": store.description,
                "logo_path": store.logo_path,
                "address": store.address,
                "is_active": store.is_active,
                "rating": store.rating,
                "owner_id": str(store.user_id),
                "owner_name": owner.username if owner else "ไม่ระบุ",
                "owner_email": owner.email if owner else "ไม่ระบุ",
                "product_count": product_count,
            })
        
        return success_response(
            "ดึงรายการร้านค้าสำเร็จ",
            {
                "stores": result,
                "total": total,
                "skip": skip,
                "limit": limit
            }
        )
        
    except Exception as e:
        return error_response(
            "เกิดข้อผิดพลาดขณะดึงรายการร้านค้า",
            {"error": str(e)},
            500
        )


@router.get("/{store_id}")
def get_store_detail(
    store_id: str,
    db: Session = Depends(get_db),
    auth_admin=Depends(authorize_role(["admin"])),
):
    """
    ดูรายละเอียดร้านค้า (สำหรับ Admin)
    - ข้อมูลร้าน
    - ข้อมูลเจ้าของ
    - สถิติสินค้า
    """
    try:
        store = db.query(Store).filter(Store.store_id == store_id).first()
        if not store:
            return error_response("ไม่พบร้านค้า", {}, 404)
        
        owner = db.query(User).filter(User.user_id == store.user_id).first()
        
        # นับสินค้า
        product_count = db.query(func.count(Product.product_id)).filter(
            Product.store_id == store.store_id
        ).scalar()
        
        active_product_count = db.query(func.count(Product.product_id)).filter(
            Product.store_id == store.store_id,
            Product.is_active == True
        ).scalar()
        
        draft_product_count = db.query(func.count(Product.product_id)).filter(
            Product.store_id == store.store_id,
            Product.is_draft == True
        ).scalar()
        
        result = {
            "store_id": str(store.store_id),
            "name": store.name,
            "description": store.description,
            "logo_path": store.logo_path,
            "address": store.address,
            "is_active": store.is_active,
            "rating": store.rating,
            "stripe_account_id": store.stripe_account_id,
            "is_stripe_verified": store.is_stripe_verified,
            "owner": {
                "user_id": str(owner.user_id) if owner else None,
                "username": owner.username if owner else "ไม่ระบุ",
                "email": owner.email if owner else "ไม่ระบุ",
                "role": owner.role.role_name if owner and owner.role else "user"
            },
            "statistics": {
                "total_products": product_count,
                "active_products": active_product_count,
                "draft_products": draft_product_count,
            }
        }
        
        return success_response("ดึงรายละเอียดร้านค้าสำเร็จ", result)
        
    except Exception as e:
        return error_response(
            "เกิดข้อผิดพลาดขณะดึงรายละเอียดร้านค้า",
            {"error": str(e)},
            500
        )


@router.patch("/{store_id}/status")
def toggle_store_status(
    store_id: str,
    is_active: bool = Form(...),
    db: Session = Depends(get_db),
    auth_admin=Depends(authorize_role(["admin"])),
):
    """
    เปลี่ยนสถานะร้านค้า (เปิด/ปิด) โดย Admin
    """
    try:
        store = db.query(Store).filter(Store.store_id == store_id).first()
        if not store:
            return error_response("ไม่พบร้านค้า", {}, 404)

        store.is_active = is_active
        
        db.commit()
        db.refresh(store)

        # ✅ Sync Stripe capability ตาม is_active
        # if store.stripe_account_id:
        #     try:
        #         print(f"[ADMIN STORE] store status {is_active}")
        #         if is_active:
        #             # เปิดร้าน
        #             stripe.Account.modify(
        #                 store.stripe_account_id,
        #                 capabilities={
        #                     "transfers": {"requested": True},
        #                     "card_payments": {"requested": True}
        #                 }
        #             )
        #         else:
        #             # ปิดร้าน
        #             stripe.Account.modify(
        #                 store.stripe_account_id,
        #                 capabilities={
        #                     "transfers": {"requested": False},
        #                     "card_payments": {"requested": False}
        #                 }
        #             )
        #     except Exception as stripe_err:
        #         print(f"[ADMIN] ⚠️ Stripe capability sync failed: {stripe_err}")

        status_text = "เปิด" if is_active else "ปิด"
        return success_response(
            f"{status_text}ร้านค้าสำเร็จ",
            {
                "store_id": str(store.store_id),
                "name": store.name,
                "is_active": store.is_active
            }
        )

    except Exception as e:
        db.rollback()
        return error_response(
            "เกิดข้อผิดพลาดขณะเปลี่ยนสถานะร้านค้า",
            {"error": str(e)},
            500
        )

    except Exception as e:
        db.rollback()
        return error_response(
            "เกิดข้อผิดพลาดขณะเปลี่ยนสถานะร้านค้า",
            {"error": str(e)},
            500
        )

# แก้ไขข้อมูลร้านค้า
@router.patch("/{store_id}")
def update_store_as_admin(
    store_id: str,
    name: str = Form(None),
    description: str = Form(None),
    address: str = Form(None),
    logo: UploadFile = File(None),
    db: Session = Depends(get_db),
    auth_admin=Depends(authorize_role(["admin"])),
):
    """
    แก้ไขข้อมูลร้านค้าโดย Admin
    ใช้ service เดียวกับที่ seller ใช้ แต่ไม่ต้องตรวจสอบเจ้าของ
    """
    try:
        store = db.query(Store).filter(Store.store_id == store_id).first()
        if not store:
            return error_response("ไม่พบร้านค้า", {}, 404)
        
        # สร้าง fake user object สำหรับ service
        # (เพราะ service ต้องการ auth_current_user)
        owner = db.query(User).filter(User.user_id == store.user_id).first()
        
        data = {}
        if name: data["name"] = name
        if description: data["description"] = description
        if address: data["address"] = address
        
        # เรียกใช้ service เดิม
        return update_store_service(db, owner, data, logo)
        
    except Exception as e:
        return error_response(
            "เกิดข้อผิดพลาดขณะแก้ไขร้านค้า",
            {"error": str(e)},
            500
        )


@router.get("/{store_id}/products")
def get_store_products(
    store_id: str,
    status: Optional[str] = Query(None, description="active, inactive, draft"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    auth_admin=Depends(authorize_role(["admin"])),
):
    """
    ดูรายการสินค้าในร้าน (สำหรับ Admin)
    """
    try:
        store = db.query(Store).filter(Store.store_id == store_id).first()
        if not store:
            return error_response("ไม่พบร้านค้า", {}, 404)
        
        query = db.query(Product).filter(Product.store_id == store_id)
        
        # กรองตามสถานะ
        if status == "active":
            query = query.filter(Product.is_active == True, Product.is_draft == False)
        elif status == "inactive":
            query = query.filter(Product.is_active == False)
        elif status == "draft":
            query = query.filter(Product.is_draft == True)
        
        total = query.count()
        products = query.offset(skip).limit(limit).all()
        
        result = []
        for product in products:
            # หารูปหลัก
            main_image = next(
                (img for img in product.images if img.is_main and img.variant_id is None),
                product.images[0] if product.images else None
            )
            
            result.append({
                "product_id": str(product.product_id),
                "product_name": product.product_name,
                "base_price": product.base_price,
                "stock_quantity": sum(v.stock for v in product.variants if v.is_active),
                "category": product.category,
                "is_active": product.is_active,
                "is_draft": product.is_draft,
                "image_url": main_image.image_url if main_image else None,
            })
        
        return success_response(
            "ดึงรายการสินค้าสำเร็จ",
            {
                "store": {
                    "store_id": str(store.store_id),
                    "name": store.name
                },
                "products": result,
                "total": total,
                "skip": skip,
                "limit": limit
            }
        )
        
    except Exception as e:
        return error_response(
            "เกิดข้อผิดพลาดขณะดึงรายการสินค้า",
            {"error": str(e)},
            500
        )


@router.patch("/{store_id}/products/{product_id}/status")
def toggle_product_status(
    store_id: str,
    product_id: str,
    is_active: bool = Form(...),
    db: Session = Depends(get_db),
    auth_admin=Depends(authorize_role(["admin"])),
):
    try:
        store = db.query(Store).filter(Store.store_id == store_id).first()
        if not store:
            return error_response("ไม่พบร้านค้า", {}, 404)
        
        product = db.query(Product).filter(
            Product.product_id == product_id,
            Product.store_id == store_id
        ).first()
        
        if not product:
            return error_response("ไม่พบสินค้าในร้านนี้", {}, 404)
        
        product.is_active = is_active
        # ✅ Issue #2: บันทึกว่า admin เป็นคนปิด / เมื่อเปิดคืน ล้าง closed_by
        if not is_active:
            product.closed_by = "admin"
        else:
            product.closed_by = None

        db.commit()
        db.refresh(product)
        
        status_text = "เปิดขาย" if is_active else "ปิดขาย"
        return success_response(
            f"{status_text}สินค้าสำเร็จ",
            {
                "product_id": str(product.product_id),
                "product_name": product.product_name,
                "is_active": product.is_active,
                "closed_by": product.closed_by    # ✅ ส่งกลับมาด้วย
            }
        )
        
    except Exception as e:
        db.rollback()
        return error_response(
            "เกิดข้อผิดพลาดขณะเปลี่ยนสถานะสินค้า",
            {"error": str(e)},
            500
        )