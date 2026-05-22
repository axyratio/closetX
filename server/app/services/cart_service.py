# app/services/cart_service.py
from __future__ import annotations

from typing import List
from uuid import UUID

from sqlalchemy.orm import Session

from app.repositories import cart_repository
from app.schemas.cart import (
    CartItemOut,
    CartListResponse,
    CheckoutValidationResult,
    CheckoutItemStatus,
)
from app.utils.cart_utils import pick_main_image
from app.models.cart import CartItem
from app.models.product import ProductVariant, Product
from app.models.store import Store

def build_cart_item_out(item: CartItem) -> CartItemOut:
    variant: ProductVariant = item.variant
    product: Product = variant.product
    store: Store = product.store

    variant_images = getattr(variant, "images", []) or []
    image_url = pick_main_image(variant_images)

    # ← ดึงราคาปัจจุบันจาก variant แทน price_at_addition
    current_price = float(variant.price if variant.price is not None else product.base_price)
    subtotal = float(item.quantity) * current_price
    stock_available = int(variant.stock or 0)

    return CartItemOut(
        cart_item_id=item.cart_item_id,
        product_id=item.product_id,
        variant_id=item.variant_id,
        product_name=product.product_name,
        variant_sku=variant.sku,
        variant_name=variant.name_option,
        quantity=item.quantity,
        price_at_addition=current_price,  # ← ส่งราคาปัจจุบันแทน
        subtotal=subtotal,
        image_url=image_url,
        store={
            "store_id": store.store_id,
            "store_name": store.name,
        },
        stock_available=stock_available,
        
    )

def get_cart_for_user(db: Session, user_id: UUID) -> CartListResponse:
    cart, items = cart_repository.get_cart_with_items_with_relations(db, user_id)
    dto_items = [build_cart_item_out(i) for i in items]

    return CartListResponse(
        cart_id=str(cart.cart_id) if cart else None,
        items=dto_items
    )


def get_cart_item_detail(
    db: Session, user_id: UUID, cart_item_id: UUID
) -> CartItemOut | None:
    item = cart_repository.get_cart_item_by_id(db, user_id, cart_item_id)
    if not item:
        return None
    return build_cart_item_out(item)


def delete_cart_items_for_user(
    db: Session, user_id: UUID, item_ids: List[UUID]
) -> int:
    deleted = cart_repository.delete_cart_items(db, user_id, item_ids)
    db.flush()
    return deleted


def validate_checkout(
    db: Session,
    user_id: UUID,
    selected_ids: List[UUID],
) -> CheckoutValidationResult:
    """
    Check เฉพาะ cart_item ที่ถูกเลือก:
    - ยังอยู่ในตะกร้าของ user นี้ไหม
    - stock พอไหม
    - ราคาเปลี่ยนจากตอน add ไหม
    """
    items = cart_repository.get_items_by_ids_for_checkout(db, user_id, selected_ids)
    if not items:
        return CheckoutValidationResult(
            is_valid=False,
            grand_total=0.0,
            items=[],
        )

    dto_items: List[CheckoutItemStatus] = []
    grand_total = 0.0
    all_ok = True

    for item in items:
        variant: ProductVariant = item.variant
        product: Product = variant.product

        current_price = float(
            variant.price if variant.price is not None else product.base_price
        )
        stock_available = int(variant.stock or 0)
        in_stock = stock_available >= item.quantity
        price_changed = current_price != float(item.price_at_addition)

        if not in_stock or price_changed:
            all_ok = False

        line_total = current_price * item.quantity
        grand_total += line_total

        dto_items.append(
            CheckoutItemStatus(
                cart_item_id=item.cart_item_id,
                product_name=product.product_name,
                variant_name=variant.name_option,
                quantity=item.quantity,
                price_at_addition=float(item.price_at_addition),
                current_price=current_price,
                stock_available=stock_available,
                in_stock=in_stock,
                price_changed=price_changed,
            )
        )

    return CheckoutValidationResult(
        is_valid=all_ok,
        grand_total=grand_total,
        items=dto_items,
    )

# app/services/cart_service.py
from uuid import UUID
from typing import List

from sqlalchemy.orm import Session, joinedload

from app.models.cart import CartItem, Cart
from app.models.product import ProductVariant, Product
from app.schemas.cart import CartItemQuantityOut


def update_cart_item_quantity(
    db: Session,
    user_id: UUID,
    cart_item_id: UUID,
    new_quantity: int,
) -> CartItemQuantityOut:
    """
    ใช้อัปเดตจำนวนของ cart item หนึ่งตัว
    - เช็คว่า item นี้เป็นของ user คนนี้จริง
    - new_quantity ต้อง >= 1
    - เช็ค stock จาก variant
    """
    if new_quantity <= 0:
        raise ValueError("จำนวนต้องมากกว่า 0")

    # โหลด item + เช็คว่าอยู่ใน cart ของ user นี้
    item: CartItem | None = (
        db.query(CartItem)
        .join(Cart, Cart.cart_id == CartItem.cart_id)
        .options(
            joinedload(CartItem.variant)
            .joinedload(ProductVariant.product)
        )
        .filter(
            CartItem.cart_item_id == cart_item_id,
            Cart.user_id == user_id,
            Cart.is_active.is_(True),
        )
        .first()
    )

    if not item:
        raise ValueError("ไม่พบรายการในตะกร้า")

    variant: ProductVariant = item.variant
    product: Product = variant.product

    if not variant.is_active or not product.is_active:
        raise ValueError("สินค้า/ตัวเลือกนี้ไม่พร้อมขาย")

    stock_available = int(variant.stock or 0)
    if new_quantity > stock_available:
        raise ValueError("จำนวนที่ต้องการมากกว่าสินค้าคงเหลือ")

    # อัปเดต
    item.quantity = new_quantity
    db.flush()  # ให้ session อัปเดตค่า

    subtotal = float(item.quantity) * float(item.price_at_addition)

    return CartItemQuantityOut(
        cart_item_id=item.cart_item_id,
        quantity=item.quantity,
        subtotal=subtotal,
    )
