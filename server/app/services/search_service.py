# app/services/search_service.py
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import Optional
from uuid import UUID

from app.models.product import Product, ProductImage, ImageType, ProductVariant
from app.models.store import Store


class SearchService:

    @staticmethod
    def search_products(
        db: Session,
        query: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
        exclude_store_id: Optional[UUID] = None,
    ) -> dict:
        """
        ค้นหาสินค้า - ค้นหาเฉพาะชื่อสินค้าเท่านั้น
        """
        base_query = (
            db.query(Product, ProductImage, Store)
            .join(Store, Product.store_id == Store.store_id)
            .join(                                              # เพิ่ม
                ProductVariant,
                and_(
                    ProductVariant.product_id == Product.product_id,
                    ProductVariant.is_active == True,
                    ProductVariant.stock > 0,
                )
            )
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
                Product.is_active == True,
                Product.is_draft == False,
                Store.is_active == True,
            )
            .group_by(Product.product_id, ProductImage.image_id, Store.store_id)  # เพิ่ม
        )

        # กรอง store ของ user ตัวเองออก
        if exclude_store_id:
            base_query = base_query.filter(Product.store_id != exclude_store_id)

        # ค้นหาด้วยชื่อสินค้าเท่านั้น
        if query and query.strip():
            search_term = f"%{query.strip()}%"
            base_query = base_query.filter(
                Product.product_name.ilike(search_term)
            )

        # นับจำนวนทั้งหมด (ก่อน limit/offset)
        total = base_query.count()

        # เรียงลำดับตามความใหม่
        base_query = base_query.order_by(Product.created_at.desc())

        # Pagination
        rows = base_query.limit(limit).offset(offset).all()

        products = []
        for p, img, store in rows:
            products.append({
                "id": str(p.product_id),
                "title": p.product_name,
                "price": float(
                    db.query(func.min(ProductVariant.price))
                    .filter(ProductVariant.product_id == p.product_id, ProductVariant.is_active == True)
                    .scalar() or 0
                ),
                "rating": p.average_rating or 0,
                "image_url": img.image_url if img else None,
                "image_id": str(img.image_id) if img else None,
                "store_name": store.name if store else None,
                "category_id": str(p.category_id) if p.category_id else None,
            })

        has_more = (offset + limit) < total

        return {
            "total": total,
            "products": products,
            "has_more": has_more,
            "limit": limit,
            "offset": offset,
        }