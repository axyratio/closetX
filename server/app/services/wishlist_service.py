# app/services/wishlist_service.py
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from uuid import UUID
from typing import Optional

from app.models.wishlist import Wishlist
from app.models.product import Product, ProductImage, ImageType, ProductVariant
from app.models.store import Store


class WishlistService:

    @staticmethod
    def toggle_wishlist(db: Session, user_id: UUID, product_id: str) -> dict:
        """
        Toggle: ถ้ามีอยู่แล้ว → ลบ, ถ้ายังไม่มี → เพิ่ม
        """
        # ตรวจว่าสินค้ามีจริง
        product = db.query(Product).filter(Product.product_id == product_id).first()
        if not product:
            return {"success": False, "message": "ไม่พบสินค้า", "status": None}

        existing = db.query(Wishlist).filter(
            Wishlist.user_id == user_id,
            Wishlist.product_id == product_id
        ).first()

        if existing:
            db.delete(existing)
            db.commit()
            return {"success": True, "message": "ลบออกจากรายการบันทึกแล้ว", "status": "removed"}
        else:
            new_item = Wishlist(user_id=user_id, product_id=product_id)
            db.add(new_item)
            db.commit()
            return {"success": True, "message": "เพิ่มในรายการบันทึกแล้ว", "status": "added"}

    @staticmethod
    def get_user_wishlist(db: Session, user_id: UUID, limit: int = 50, offset: int = 0) -> dict:
        query = (
            db.query(
                Wishlist, Product, ProductImage, Store,
                func.min(ProductVariant.price).label("min_price")  # เพิ่ม
            )
            .join(Product, Wishlist.product_id == Product.product_id)
            .join(Store, Product.store_id == Store.store_id)
            .outerjoin(ProductVariant, and_(                        # เพิ่ม
                ProductVariant.product_id == Product.product_id,
                ProductVariant.is_active == True,
            ))
            .outerjoin(
                ProductImage,
                and_(
                    Product.product_id == ProductImage.product_id,
                    ProductImage.variant_id == None,
                    ProductImage.is_main == True,
                    ProductImage.image_type == ImageType.NORMAL,
                ),
            )
            .filter(
                Wishlist.user_id == user_id,
                Product.is_active == True,
                Product.is_draft == False,
            )
            .group_by(                                              # เพิ่ม
                Wishlist.wishlist_id,
                Product.product_id,
                ProductImage.image_id,
                Store.store_id,
            )
            .order_by(Wishlist.added_at.desc())
        )

        total = query.count()
        rows = query.limit(limit).offset(offset).all()

        items = []
        for wish, product, img, store, min_price in rows:          # แก้ unpack
            items.append({
                "wishlist_id": str(wish.wishlist_id),
                "product_id": str(product.product_id),
                "title": product.product_name,
                "price": float(min_price or product.base_price or 0),  # แก้
                "rating": product.average_rating or 0,
                "image_url": img.image_url if img else None,
                "image_id": str(img.image_id) if img else None,
                "store_name": store.name if store else None,
                "added_at": wish.added_at.isoformat() if wish.added_at else None,
            })

        return {"total": total, "items": items}

    @staticmethod
    def check_wishlist(db: Session, user_id: UUID, product_id: str) -> bool:
        """
        เช็คว่าสินค้านี้อยู่ใน wishlist ของ user หรือไม่
        """
        exists = db.query(Wishlist).filter(
            Wishlist.user_id == user_id,
            Wishlist.product_id == product_id
        ).first()
        return exists is not None