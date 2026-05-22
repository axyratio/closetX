# app/repositories/product_repository.py - UPDATED VERSION
"""
แก้ไขให้สินค้าจากร้านค้าที่ถูกปิด (is_active=False) ไม่แสดงในหน้าหลัก
"""
from typing import Optional
import uuid
from sqlalchemy import UUID, and_
from sqlalchemy.orm import Session, joinedload
from app.models.product import Product, ProductVariant, ProductImage, VTONMeta, VTONSession
from app.models.store import Store

def create_draft_product(db, store_id):
    new_product = Product(
        product_id=uuid.uuid4(),
        store_id=store_id,
        product_name="",
        base_price=0.0,
        category="uncategorized",
        description="",
        is_draft=True,
        is_active=False,
    )

    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product


def get_all_products(db: Session):
    """
    ดึงสินค้าทั้งหมดสำหรับแสดงในหน้าหลัก
    
    เงื่อนไข:
    - Product.is_active = True (สินค้าเปิดขาย)
    - Store.is_active = True (ร้านค้าเปิดทำการ) ← ✅ เพิ่มเงื่อนไขนี้
    """
    return (
        db.query(Product)
        .join(Store, Product.store_id == Store.store_id)  # ✅ Join กับ Store
        .options(
            joinedload(Product.images).joinedload(ProductImage.vton_meta),
            joinedload(Product.variants).joinedload(ProductVariant.images).joinedload(ProductImage.vton_meta),
            joinedload(Product.store)  # ✅ โหลด store data ด้วย
        )
        .filter(
            and_(
                Product.is_active.is_(True),   # ✅ สินค้าต้องเปิดขาย
                Store.is_active.is_(True)       # ✅ ร้านค้าต้องเปิดทำการ
            )
        )
        .all()
    )


def get_product_by_id(db: Session, product_id):
    """
    ดึงสินค้าตาม ID โดยไม่สนใจสถานะร้านค้า
    (ใช้สำหรับ admin, seller, หรือการแก้ไขสินค้า)
    """
    return (
        db.query(Product)
        .options(
            joinedload(Product.images).joinedload(ProductImage.vton_meta),
            joinedload(Product.variants).joinedload(ProductVariant.images).joinedload(ProductImage.vton_meta),
            joinedload(Product.store)  # ✅ เพิ่ม store info
        )
        .filter(Product.product_id == product_id)
        .first()
    )


def get_product_detail(db: Session, product_id: UUID) -> Optional[Product]:
    """
    ดึงรายละเอียดสินค้าสำหรับหน้า product detail
    
    เงื่อนไข:
    - Product.is_active = True (สินค้าเปิดขาย)
    - Store.is_active = True (ร้านค้าเปิดทำการ) ← ✅ เพิ่มเงื่อนไขนี้
    """
    return (
        db.query(Product)
        .join(Store, Product.store_id == Store.store_id)  # ✅ Join กับ Store
        .options(
            joinedload(Product.images),
            joinedload(Product.variants).joinedload(ProductVariant.images),
            joinedload(Product.reviews),
            joinedload(Product.store),
        )
        .filter(
            and_(
                Product.product_id == product_id,
                Product.is_active == True,      # ✅ สินค้าต้องเปิดขาย
                Store.is_active == True          # ✅ ร้านค้าต้องเปิดทำการ
            )
        )
        .first()
    )


def get_products_by_store(db: Session, store_id: UUID, include_inactive: bool = False):
    """
    ดึงสินค้าทั้งหมดของร้านค้า
    
    Args:
        store_id: ID ของร้านค้า
        include_inactive: ถ้า True จะดึงสินค้าที่ปิดขายด้วย (สำหรับ seller)
    """
    query = (
        db.query(Product)
        .options(
            joinedload(Product.images).joinedload(ProductImage.vton_meta),
            joinedload(Product.variants).joinedload(ProductVariant.images).joinedload(ProductImage.vton_meta)
        )
        .filter(Product.store_id == store_id)
    )
    
    if not include_inactive:
        query = query.filter(Product.is_active.is_(True))
    
    return query.all()


def create_product(db: Session, product: Product):
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def update_product(db: Session, product: Product):
    db.commit()
    db.refresh(product)
    return product


def delete_product(db: Session, product: Product):
    product.is_active = False
    db.commit()