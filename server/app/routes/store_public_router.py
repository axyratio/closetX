# app/routes/store_public_router.py
"""
Public Store Router - API สำหรับดูหน้าร้านค้าสาธารณะ
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.db.database import get_db
from app.services.store_public_service import (
    get_public_store_detail_service,
    get_store_products_service,
    get_store_products_by_category_service,
    get_store_categories_service
)
from app.utils.response_handler import success_response, error_response

router = APIRouter(prefix="/public/stores", tags=["Public Store"])


@router.get("/{store_id}")
def get_public_store_detail(
    store_id: str,
    db: Session = Depends(get_db)
):
    """
    ดูข้อมูลร้านค้าสาธารณะ
    
    Returns:
        - store_id, name, description, address, logo
        - rating, total_reviews, total_products
        - is_active, created_at
    """
    try:
        data, error = get_public_store_detail_service(db, store_id)
        
        if error:
            return error_response(error, {}, 404 if "ไม่พบร้านค้า" in error else 400)
        
        return success_response("ดึงข้อมูลร้านค้าสำเร็จ", data)
        
    except Exception as e:
        print(f"❌ [get_public_store_detail] Error: {e}")
        return error_response(f"เกิดข้อผิดพลาด: {str(e)}", {}, 500)


@router.get("/{store_id}/products")
def get_store_products(
    store_id: str,
    category_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),  # ← default 10
    db: Session = Depends(get_db)
):
    """
    ดูสินค้าในร้านค้า (รองรับการกรองตามหมวดหมู่)
    
    Query Parameters:
        - category_id: กรองตามหมวดหมู่ (optional)
        - skip: pagination offset
        - limit: จำนวนสินค้าต่อหน้า
    
    Returns:
        - products: รายการสินค้า
        - total: จำนวนสินค้าทั้งหมด
        - skip, limit
    """
    if category_id:
        data, error = get_store_products_by_category_service(
            db, store_id, category_id, skip, limit
        )
    else:
        data, error = get_store_products_service(
            db, store_id, skip, limit
        )

    if error:
        return error_response(error, {}, 400)

    return success_response("ดึงสินค้าสำเร็จ", data)

@router.get("/{store_id}/categories")
def get_store_categories(
    store_id: str,
    db: Session = Depends(get_db)
):
    """
    ดูหมวดหมู่สินค้าในร้านค้า (พร้อมจำนวนสินค้าในแต่ละหมวดหมู่)
    
    Returns:
        - categories: รายการหมวดหมู่
          - category_id, category_name, category_image
          - product_count: จำนวนสินค้าในหมวดหมู่
    """
    try:
        data, error = get_store_categories_service(db, store_id)
        
        if error:
            return error_response(error, {}, 400)
        
        return success_response("ดึงหมวดหมู่สำเร็จ", data)
        
    except Exception as e:
        print(f"❌ [get_store_categories] Error: {e}")
        return error_response(f"เกิดข้อผิดพลาด: {str(e)}", {}, 500)