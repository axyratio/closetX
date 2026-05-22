# app/repositories/cart_repository.py
from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.models.cart import Cart, CartItem
from app.models.product import ProductVariant, Product, ProductImage
from app.models.store import Store


def get_or_create_cart(db: Session, user_id: UUID) -> Cart:
    cart: Optional[Cart] = (
        db.query(Cart)
        .filter(Cart.user_id == user_id, Cart.is_active.is_(True))
        .first()
    )
    if cart is None:
        cart = Cart(user_id=user_id, is_active=True)
        db.add(cart)
        db.flush()  # ให้ได้ cart_id กลับมา
    return cart


from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session, joinedload
from app.models.product import ProductVariant, Product
from app.models.cart import Cart, CartItem  # ถ้าแยกไฟล์ก็ import ให้ถูก

def add_to_cart(
    db: Session,
    user_id: UUID,
    product_id: str,
    variant_id: str,
    quantity: int,
) -> CartItem:   # 👈 เปลี่ยนให้ return CartItem
    """
    - ไม่ลด stock ทันที (ลดตอน checkout)
    - แต่อย่าให้จำนวนในตะกร้า > stock ปัจจุบัน ของ variant
    - ถ้ามี item เดิมอยู่แล้ว → บวก quantity
    """
    import uuid

    if quantity <= 0:
        raise ValueError("quantity ต้องมากกว่า 0")

    try:
        product_uuid = uuid.UUID(product_id)
        variant_uuid = uuid.UUID(variant_id)
    except Exception:
        raise ValueError("product_id / variant_id ไม่ถูกต้อง")

    cart = get_or_create_cart(db, user_id)

    # โหลด variant + product
    variant: Optional[ProductVariant] = (
        db.query(ProductVariant)
        .options(
            joinedload(ProductVariant.product).joinedload(Product.store)
        )
        .filter(
            ProductVariant.variant_id == variant_uuid,
            ProductVariant.product_id == product_uuid,
        )
        .first()
    )

    if not variant:
        raise ValueError("ไม่พบ variant ของสินค้านี้")
    if not variant.is_active:
        raise ValueError("ตัวเลือกสินค้านี้ถูกปิดการขาย")
    product: Product = variant.product
    if not product or not product.is_active:
        raise ValueError("สินค้าไม่พร้อมขาย")

    # ตรวจ stock (แค่ validation ไม่ลด stock)
    if variant.stock is not None and variant.stock < quantity:
        raise ValueError("จำนวนที่เลือกมากกว่าสินค้าคงเหลือ")

    # หา item ที่ซ้ำ variant เดิมในตะกร้า
    existing_item: Optional[CartItem] = (
        db.query(CartItem)
        .filter(
            CartItem.cart_id == cart.cart_id,
            CartItem.variant_id == variant_uuid,
        )
        .first()
    )

    unit_price = variant.price if variant.price is not None else product.base_price

    if existing_item:
        new_qty = existing_item.quantity + quantity
        if variant.stock is not None and new_qty > variant.stock:
            raise ValueError("จำนวนรวมในตะกร้าเกิน stock คงเหลือ")

        existing_item.quantity = new_qty
        # ❗ ใช้ existing_item ตัวเดิม
        cart_item = existing_item
    else:
        cart_item = CartItem(
            cart_id=cart.cart_id,
            product_id=product_uuid,
            variant_id=variant_uuid,
            quantity=quantity,
            price_at_addition=unit_price,
        )
        db.add(cart_item)

    db.flush()  # ให้แน่ใจว่ามี cart_item_id แล้วใน session

    return cart_item



def get_total_items(db: Session, user_id: UUID) -> int:
    """
    total จำนวนชิ้น (sum quantity) ในตะกร้า active ของ user นี้
    """
    q = (
        db.query(func.coalesce(func.sum(CartItem.quantity), 0))
        .join(Cart, Cart.cart_id == CartItem.cart_id)
        .filter(Cart.user_id == user_id, Cart.is_active.is_(True))
    )
    total = q.scalar() or 0
    return int(total)


def get_cart_with_items_with_relations(db: Session, user_id: UUID) -> tuple[Optional[Cart], List[CartItem]]:
    cart: Optional[Cart] = (
        db.query(Cart)
        .filter(Cart.user_id == user_id, Cart.is_active.is_(True))
        .first()
    )
    if not cart:
        return None, []

    items: List[CartItem] = (
        db.query(CartItem)
        .options(
            joinedload(CartItem.variant)
            .joinedload(ProductVariant.product)
            .joinedload(Product.store),
            joinedload(CartItem.variant).joinedload(ProductVariant.images),
            joinedload(CartItem.cart),
        )
        .filter(CartItem.cart_id == cart.cart_id)
        .all()
    )
    return cart, items


def get_cart_item_by_id(
    db: Session, user_id: UUID, cart_item_id: UUID
) -> Optional[CartItem]:
    return (
        db.query(CartItem)
        .join(Cart, Cart.cart_id == CartItem.cart_id)
        .options(
            joinedload(CartItem.variant)
            .joinedload(ProductVariant.product)
            .joinedload(Product.store),
            joinedload(CartItem.variant).joinedload(ProductVariant.images),
        )
        .filter(
            CartItem.cart_item_id == cart_item_id,
            Cart.user_id == user_id,
            Cart.is_active.is_(True),
        )
        .first()
    )


def delete_cart_items(
    db: Session,
    user_id: UUID,
    item_ids: List[UUID],
) -> int:
    """
    ลบ cart_items แบบ batch
    - จำกัดเฉพาะ cart ของ user นี้เท่านั้น (กันยิง id มั่ว)
    """
    if not item_ids:
        return 0

    # subquery: หาเฉพาะ items ที่ belong กับ cart ของ user นี้
    sub_q = (
        db.query(CartItem.cart_item_id)
        .join(Cart, Cart.cart_id == CartItem.cart_id)
        .filter(
            Cart.user_id == user_id,
            CartItem.cart_item_id.in_(item_ids),
        )
        .subquery()
    )

    delete_count = (
        db.query(CartItem)
        .filter(CartItem.cart_item_id.in_(sub_q))
        .delete(synchronize_session=False)
    )
    # commit จะทำใน service / router
    return delete_count


def get_items_by_ids_for_checkout(
    db: Session,
    user_id: UUID,
    item_ids: List[UUID],
) -> List[CartItem]:
    """
    ใช้ตอน validate checkout
    """
    if not item_ids:
        return []

    items: List[CartItem] = (
        db.query(CartItem)
        .join(Cart, Cart.cart_id == CartItem.cart_id)
        .options(
            joinedload(CartItem.variant)
            .joinedload(ProductVariant.product)
            .joinedload(Product.store),
            joinedload(CartItem.variant).joinedload(ProductVariant.images),
        )
        .filter(
            Cart.user_id == user_id,
            Cart.is_active.is_(True),
            CartItem.cart_item_id.in_(item_ids),
        )
        .all()
    )
    return items
