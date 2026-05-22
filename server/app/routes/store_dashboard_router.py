# app/routers/store_dashboard_router.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.db.database import get_db
from app.core.authz import authenticate_token
from app.models.store import Store
from app.models.product import Product, ProductImage, ProductVariant
from app.utils.response_handler import success_response, error_response

router = APIRouter(prefix="/stores", tags=["Store Dashboard"])


def _get_lowest_variant_price(db: Session, product_id) -> float:
    """Issue #8: ดึงราคา variant ต่ำสุดของสินค้า"""
    result = db.query(func.min(ProductVariant.price)).filter(
        ProductVariant.product_id == product_id,
        ProductVariant.is_active == True,
    ).scalar()
    return float(result) if result is not None else 0.0


def _map_product_row(product: Product, image: ProductImage | None, db: Session):
    image_id = str(image.image_id) if image else None
    image_url = image.image_url if image else None
    return {
        "product_id": str(product.product_id),
        "title": product.product_name,
        "price": _get_lowest_variant_price(db, product.product_id),  # Issue #8
        "star": float(product.average_rating or 0.0),
        "category": product.category,
        "image_id": image_id,
        "image_url": image_url,
        "is_active": bool(product.is_active),
        "closed_by": product.closed_by,  # "admin" | "seller" | None
    }


@router.get("/me/dashboard")
def get_my_store_dashboard(
    db: Session = Depends(get_db),
    auth_user=Depends(authenticate_token()),
):
    """
    ดึงข้อมูลหน้าร้านของ seller:
    - ข้อมูลร้าน
    - รายการสินค้า (is_active=True) + main image + rating
    - รายการสินค้าปิดการขาย (is_active=False) + main image
    """
    try:
        store: Store | None = (
            db.query(Store).filter(Store.user_id == auth_user.user_id).first()
        )
        if not store:
            return error_response("ไม่พบร้านค้าของคุณ", {}, 404)

        # ====== PRODUCTS (กำลังขาย)
        active_rows = (
            db.query(Product, ProductImage)
            .outerjoin(
                ProductImage,
                and_(
                    ProductImage.product_id == Product.product_id,
                    ProductImage.is_main == True,
                    ProductImage.variant_id == None,
                    ProductImage.image_type == "NORMAL",
                ),
            )
            .filter(
                Product.store_id == store.store_id,
                Product.is_active == True,
                Product.is_draft == False,
            )
            .order_by(Product.created_at.desc())
            .all()
        )

        products_data = []
        rating_sum = 0.0
        rating_count = 0

        for product, image in active_rows:
            star = float(product.average_rating or 0.0)
            if star > 0:
                rating_sum += star
                rating_count += 1

            products_data.append(_map_product_row(product, image, db))

        # ====== CLOSED PRODUCTS (ปิดการขาย)
        closed_rows = (
            db.query(Product, ProductImage)
            .outerjoin(
                ProductImage,
                and_(
                    ProductImage.product_id == Product.product_id,
                    ProductImage.is_main == True,
                    ProductImage.variant_id == None,
                    ProductImage.image_type == "NORMAL",
                ),
            )
            .filter(
                Product.store_id == store.store_id,
                Product.is_active == False,
                Product.is_draft == False,
            )
            .order_by(Product.created_at.desc())
            .all()
        )

        closed_products_data = []
        for product, image in closed_rows:
            closed_products_data.append(_map_product_row(product, image, db))

        # rating ร้าน (เฉลี่ยจากสินค้าที่กำลังขาย)
        store_rating = rating_sum / rating_count if rating_count > 0 else 0.0
        store.rating = store_rating
        db.commit()

        logo_url = f"/store/{store.store_id}/logo" if store.logo_path else None

        store_data = {
            "store_id": str(store.store_id),
            "name": store.name,
            "logo_url": logo_url,
            "rating": store_rating,
            "is_stripe_verified": store.is_stripe_verified,
        }

        payload = {
            "store": store_data,
            "products": products_data,
            "closed_products": closed_products_data,
        }

        return success_response("ดึงข้อมูลหน้าร้านสำเร็จ", payload)

    except Exception as e:
        db.rollback()
        return error_response(
            "เกิดข้อผิดพลาดขณะดึงข้อมูลหน้าร้าน", {"error": str(e)}, 500
        )