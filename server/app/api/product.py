# app/api/product.py
from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.wishlist import Wishlist
from app.repositories import product_repository
from app.schemas.product import (
    ProductDetailOut,
    ProductImageOut,
    ProductVariantOut,
    VariantImageOut,
    StoreSummaryOut,
    ReviewOut,
)
from app.models.review import Review
from app.utils.response_handler import success_response, error_response  # ✅ ใช้ของเธอเอง

router = APIRouter(prefix="/products", tags=["products"])


def pick_best_review(reviews: list[Review]) -> Review | None:
    candidates = [r for r in reviews if r.comment] or list(reviews)
    if not candidates:
        return None
    candidates.sort(key=lambda r: (r.rating, r.created_at), reverse=True)
    return candidates[0]


def mask_name(name: str) -> str:
    if not name:
        return ""
    if len(name) <= 2:
        return name[0] + "***"
    return name[0] + "***" + name[-1]


# app/api/product.py
from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.models.product import Product, ProductImage, ProductVariant
from app.models.store import Store
from app.models.review import Review
from app.models.cart import Cart, CartItem      # 👈 ปรับชื่อ model ให้ตรงของจริง
from app.core.authz import authenticate_token, get_current_user_from_cookie
from app.schemas.product import (
    ProductDetailOut,
    ProductImageOut,
    ProductVariantOut,
    VariantImageOut,
    StoreSummaryOut,
    ReviewOut,
    CartSummaryOut,
)
from app.utils.response_handler import success_response, error_response

router = APIRouter(prefix="/products", tags=["products"])

@router.get("/{product_id}/detail")
def get_product_detail_api(
    product_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(authenticate_token()),   # ต้อง login ถึงจะรู้ cart
):
    product: Product | None = (
        db.query(Product)
        .filter(Product.product_id == product_id, Product.is_active == True)
        .first()
    )

    if not product:
        return error_response("ไม่พบสินค้า", status_code=404)

    # -------------------------
    # images (ของ product ตรง ๆ)
    # -------------------------
    images_data: list[ProductImageOut] = []
    for img in product.images:
        images_data.append(
            ProductImageOut(
                image_id=img.image_id,
                image_type=img.image_type,
                image_url=img.image_url,
                display_order=img.display_order or 0,
                is_main=bool(img.is_main),
            )
        )
    images_data.sort(key=lambda x: x.display_order)

    # -------------------------
    # variants
    # -------------------------
    variants_data: list[ProductVariantOut] = []
    for v in product.variants:
        variant_images: list[VariantImageOut] = []
        for img in v.images:
            variant_images.append(
                VariantImageOut(
                    image_id=img.image_id,
                    image_type=img.image_type,
                    image_url=img.image_url,
                )
            )

        variants_data.append(
            ProductVariantOut(
                variant_id=v.variant_id,
                variant_name=v.name_option,      # 👈 ใช้ name_option ตาม model ล่าสุด
                sku=v.sku,
                price=v.price,
                stock=v.stock or 0,
                images=variant_images,
            )
        )

    # -------------------------
    # store summary
    # -------------------------
    store: Store = product.store
    store_out = StoreSummaryOut(
        store_id=store.store_id,
        name=store.name,
        description=store.description,
        logo_path=store.logo_path,
        address=store.address,
        rating=store.rating,
    )

    # -------------------------
    # reviews + best review
    # -------------------------
    reviews_q = (
        db.query(Review)
        .filter(Review.product_id == product.product_id)
        .order_by(Review.created_at.desc())
    )
    reviews = reviews_q.all()

    reviews_out: list[ReviewOut] = []
    best_out: ReviewOut | None = None

    for rv in reviews:
        user_display_name = rv.user.username  # หรือ logic mask ชื่อ
        rv_out = ReviewOut(
            review_id=rv.review_id,
            user_display_name=user_display_name,
            rating=rv.rating,
            comment=rv.comment,
            variant_name=None,   # ถ้ามี field ผูก variant ค่อยเพิ่ม
            created_at=rv.created_at,
        )
        reviews_out.append(rv_out)

    if reviews_out:
        # สมมติ backend เลือก "best_review" มาให้แล้วใน reviews (rating สูงสุด + มี comment ฯลฯ)
        best_out = reviews_out[0]

    # -------------------------
    # cart summary ของ user
    # -------------------------
    cart_total_items = 0
    cart_product_quantity = 0
    is_wishlisted = False
    
    if current_user:

        is_wishlisted = (
        db.query(Wishlist)
        .filter(
            Wishlist.user_id == current_user.user_id,
            Wishlist.product_id == product.product_id,
        )
        .first() is not None
        )
        # ทั้งตะกร้า
        cart_total_items = (
            db.query(func.coalesce(func.sum(CartItem.quantity), 0))
            .join(Cart, Cart.cart_id == CartItem.cart_id)
            .filter(Cart.user_id == current_user.user_id)
            .scalar()
            or 0
        )
        


        # เฉพาะสินค้าตัวนี้
        cart_product_quantity = (
            db.query(func.coalesce(func.sum(CartItem.quantity), 0))
            .join(Cart, Cart.cart_id == CartItem.cart_id)
            .filter(
                Cart.user_id == current_user.user_id,
                CartItem.product_id == product.product_id,
            )
            .scalar()
            or 0
        )
    
    # variant_prices = [v.price for v in product.variants if v.price is not None and v.is_active]
    # lowest_price = min(variant_prices) if variant_prices else (product.base_price or 0.0)

    lowest_price = min(
    (v.price for v in product.variants if v.price is not None and v.is_active),
    default=product.base_price or 0.0
    )
    
    print(f"[WISHLIST ]", is_wishlisted)
    
    detail_out = ProductDetailOut(
        is_wishlisted=is_wishlisted,
        product_id=product.product_id,
        product_name=product.product_name,
        base_price=lowest_price,
        original_price=None,           # ยังไม่ใช้ก็ใส่ None ไปก่อน
        discount_percent=None,
        description=product.description,
        average_rating=product.average_rating or 0.0,
        review_count=len(reviews_out),
        images=images_data,
        variants=variants_data,
        store=store_out,
        best_review=best_out,
        reviews=reviews_out,
        cart_summary=CartSummaryOut(
            total_items=cart_total_items,
            product_quantity=cart_product_quantity,
        ),
    )
    
    print("[DETAIL_OUT]", detail_out.dict())

    return success_response(
        "ดึงข้อมูลสินค้าเรียบร้อย",
        detail_out.dict(),
    )


# ====== แท็บการขาย

from app.services.product_service import (
    close_sale_product_service,
    open_sale_product_service,
)


@router.patch("/{product_id}/close-sale")
def close_sale_api(
    product_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_from_cookie),
):
    if not current_user:
        return error_response("กรุณาเข้าสู่ระบบ", status_code=401)
    return close_sale_product_service(db, current_user, str(product_id))


@router.patch("/{product_id}/open-sale")
def open_sale_api(
    product_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_from_cookie),
):
    if not current_user:
        return error_response("กรุณาเข้าสู่ระบบ", status_code=401)
    return open_sale_product_service(db, current_user, str(product_id))
