# app/services/admin_store_service.py
"""
Service สำหรับ Admin จัดการร้านค้า
ใช้ร่วมกับ store_service และ product_service ที่มีอยู่
"""

from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import Optional, List, Dict, Any

from app.models.store import Store
from app.models.product import Product, ProductImage
from app.models.user import User
from app.repositories import store_repository, product_repository
from app.utils.response_handler import success_response, error_response


def get_all_stores_admin(
    db: Session,
    search: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> Dict[str, Any]:
    """
    ดึงรายการร้านค้าทั้งหมดพร้อมข้อมูลสถิติ (สำหรับ Admin)
    """
    try:
        query = db.query(Store).join(User, Store.user_id == User.user_id)
        
        # ค้นหา
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    Store.name.ilike(search_pattern),
                    User.username.ilike(search_pattern),
                    User.email.ilike(search_pattern)
                )
            )
        
        # กรองสถานะ
        if status:
            is_active = status.lower() == "active"
            query = query.filter(Store.is_active == is_active)
        
        total = query.count()
        stores = query.order_by(Store.name).offset(skip).limit(limit).all()
        
        result = []
        for store in stores:
            owner = db.query(User).filter(User.user_id == store.user_id).first()
            
            # สถิติสินค้า
            product_stats = db.query(
                func.count(Product.product_id).label('total'),
                func.count(Product.product_id).filter(Product.is_active == True).label('active'),
                func.count(Product.product_id).filter(Product.is_draft == True).label('draft')
            ).filter(Product.store_id == store.store_id).first()
            
            result.append({
                "store_id": str(store.store_id),
                "name": store.name,
                "description": store.description,
                "logo_path": store.logo_path,
                "address": store.address,
                "is_active": store.is_active,
                "rating": store.rating or 0.0,
                "stripe_account_id": store.stripe_account_id,
                "is_stripe_verified": store.is_stripe_verified,
                "owner": {
                    "user_id": str(owner.user_id) if owner else None,
                    "username": owner.username if owner else "Unknown",
                    "email": owner.email if owner else "Unknown"
                },
                "statistics": {
                    "total_products": product_stats.total if product_stats else 0,
                    "active_products": product_stats.active if product_stats else 0,
                    "draft_products": product_stats.draft if product_stats else 0
                }
            })
        
        return {
            "success": True,
            "data": {
                "stores": result,
                "total": total,
                "skip": skip,
                "limit": limit
            }
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": f"เกิดข้อผิดพลาด: {str(e)}"
        }


def get_store_detail_admin(db: Session, store_id: str) -> Dict[str, Any]:
    """
    ดูรายละเอียดร้านค้าแบบครบถ้วน (สำหรับ Admin)
    """
    try:
        store = store_repository.get_store_by_id(db, store_id)
        if not store:
            return {
                "success": False,
                "message": "ไม่พบร้านค้า",
                "status_code": 404
            }
        
        owner = db.query(User).filter(User.user_id == store.user_id).first()
        
        # สถิติสินค้าแบบละเอียด
        total_products = db.query(func.count(Product.product_id)).filter(
            Product.store_id == store.store_id
        ).scalar()
        
        active_products = db.query(func.count(Product.product_id)).filter(
            Product.store_id == store.store_id,
            Product.is_active == True,
            Product.is_draft == False
        ).scalar()
        
        inactive_products = db.query(func.count(Product.product_id)).filter(
            Product.store_id == store.store_id,
            Product.is_active == False
        ).scalar()
        
        draft_products = db.query(func.count(Product.product_id)).filter(
            Product.store_id == store.store_id,
            Product.is_draft == True
        ).scalar()
        
        # รายการสินค้าล่าสุด 5 รายการ
        recent_products = db.query(Product).filter(
            Product.store_id == store.store_id
        ).order_by(Product.created_at.desc()).limit(5).all()
        
        recent_products_list = []
        for product in recent_products:
            main_image = next(
                (img for img in product.images if img.is_main and img.variant_id is None),
                product.images[0] if product.images else None
            )
            
            recent_products_list.append({
                "product_id": str(product.product_id),
                "product_name": product.product_name,
                "base_price": product.base_price,
                "is_active": product.is_active,
                "is_draft": product.is_draft,
                "image_url": main_image.image_url if main_image else None
            })
        
        return {
            "success": True,
            "data": {
                "store_id": str(store.store_id),
                "name": store.name,
                "description": store.description,
                "logo_path": store.logo_path,
                "address": store.address,
                "is_active": store.is_active,
                "rating": store.rating or 0.0,
                "stripe_account_id": store.stripe_account_id,
                "is_stripe_verified": store.is_stripe_verified,
                "owner": {
                    "user_id": str(owner.user_id) if owner else None,
                    "username": owner.username if owner else "Unknown",
                    "email": owner.email if owner else "Unknown",
                    "role": owner.role.role_name if owner and owner.role else "user"
                },
                "statistics": {
                    "total_products": total_products or 0,
                    "active_products": active_products or 0,
                    "inactive_products": inactive_products or 0,
                    "draft_products": draft_products or 0
                },
                "recent_products": recent_products_list
            }
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": f"เกิดข้อผิดพลาด: {str(e)}",
            "status_code": 500
        }


def toggle_store_status_admin(
    db: Session,
    store_id: str,
    is_active: bool
) -> Dict[str, Any]:
    """
    เปิด/ปิดร้านค้าโดย Admin
    """
    try:
        store = store_repository.get_store_by_id(db, store_id)
        if not store:
            return {
                "success": False,
                "message": "ไม่พบร้านค้า",
                "status_code": 404
            }
        
        old_status = store.is_active
        store.is_active = is_active
        db.commit()
        db.refresh(store)
        
        status_text = "เปิด" if is_active else "ปิด"
        action_text = "เปิด" if is_active else "ปิด"
        
        return {
            "success": True,
            "message": f"{action_text}ร้านค้าสำเร็จ",
            "data": {
                "store_id": str(store.store_id),
                "name": store.name,
                "old_status": old_status,
                "new_status": is_active
            }
        }
        
    except Exception as e:
        db.rollback()
        return {
            "success": False,
            "message": f"เกิดข้อผิดพลาด: {str(e)}",
            "status_code": 500
        }


def get_store_products_admin(
    db: Session,
    store_id: str,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> Dict[str, Any]:
    """
    ดูรายการสินค้าในร้าน (สำหรับ Admin)
    """
    try:
        store = store_repository.get_store_by_id(db, store_id)
        if not store:
            return {
                "success": False,
                "message": "ไม่พบร้านค้า",
                "status_code": 404
            }
        
        query = db.query(Product).filter(Product.store_id == store_id)
        
        # กรองตามสถานะ
        if status == "active":
            query = query.filter(Product.is_active == True, Product.is_draft == False)
        elif status == "inactive":
            query = query.filter(Product.is_active == False)
        elif status == "draft":
            query = query.filter(Product.is_draft == True)
        
        total = query.count()
        products = query.order_by(Product.created_at.desc()).offset(skip).limit(limit).all()
        
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
                "variant_count": len(product.variants) if product.variants else 0
            })
        
        return {
            "success": True,
            "data": {
                "store": {
                    "store_id": str(store.store_id),
                    "name": store.name,
                    "is_active": store.is_active
                },
                "products": result,
                "total": total,
                "skip": skip,
                "limit": limit
            }
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": f"เกิดข้อผิดพลาด: {str(e)}",
            "status_code": 500
        }


def toggle_product_status_admin(
    db: Session,
    store_id: str,
    product_id: str,
    is_active: bool
) -> Dict[str, Any]:
    """
    เปิด/ปิดสินค้าโดย Admin
    """
    try:
        store = store_repository.get_store_by_id(db, store_id)
        if not store:
            return {
                "success": False,
                "message": "ไม่พบร้านค้า",
                "status_code": 404
            }
        
        product = db.query(Product).filter(
            Product.product_id == product_id,
            Product.store_id == store_id
        ).first()
        
        if not product:
            return {
                "success": False,
                "message": "ไม่พบสินค้าในร้านนี้",
                "status_code": 404
            }
        
        old_status = product.is_active
        product.is_active = is_active
        db.commit()
        db.refresh(product)
        
        status_text = "เปิดขาย" if is_active else "ปิดขาย"
        
        return {
            "success": True,
            "message": f"{status_text}สินค้าสำเร็จ",
            "data": {
                "product_id": str(product.product_id),
                "product_name": product.product_name,
                "old_status": old_status,
                "new_status": is_active,
                "store": {
                    "store_id": str(store.store_id),
                    "name": store.name
                }
            }
        }
        
    except Exception as e:
        db.rollback()
        return {
            "success": False,
            "message": f"เกิดข้อผิดพลาด: {str(e)}",
            "status_code": 500
        }