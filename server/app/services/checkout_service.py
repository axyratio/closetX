from datetime import datetime, timedelta
from typing import List, Optional, Tuple, Dict
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.stripe_client import stripe

from app.models.cart import Cart, CartItem
from app.models.product import ProductVariant, Product
from app.models.order_item import OrderItem
from app.models.order import Order
from app.models.payment import Payment, PaymentStatus
from app.models.shipping_address import ShippingAddress
from app.models.store import Store
from app.models.stock_reservation import StockReservation
from app.models.user import User

from app.schemas.checkout import CheckoutRequest, CheckoutItem, CheckoutResponse
from app.repositories.stock_reservation_repository import get_active_reserved_quantity
from app.utils.now_utc import now_utc
from app.core.config import settings
from app.utils.order_task import check_order_timeout


RESERVATION_MINUTES = 1


def _calc_shipping_fee(total_weight_grams: int) -> float:
    if total_weight_grams <= 500:
        return 38.0
    elif total_weight_grams <= 1000:
        return 50.0
    elif total_weight_grams <= 2000:
        return 60.0
    elif total_weight_grams <= 5000:
        return 80.0
    elif total_weight_grams <= 10000:
        return 120.0
    else:
        return 160.0


class CheckoutService:

    @staticmethod
    def _build_items_from_cart(
        db: Session,
        user: User,
        cart_id: UUID,
        selected_cart_item_ids: Optional[list[UUID]],
    ) -> Tuple[List[dict], bool, UUID]:
        cart = (
            db.query(Cart)
            .filter(Cart.cart_id == cart_id, Cart.user_id == user.user_id)
            .first()
        )
        if not cart:
            raise HTTPException(status_code=404, detail="ไม่พบตะกร้าหรือไม่ใช่ของผู้ใช้นี้")

        if not cart.items:
            raise HTTPException(status_code=400, detail="Cart ว่างเปล่า")

        if selected_cart_item_ids:
            selected_set = set(selected_cart_item_ids)
            cart_items: List[CartItem] = [
                ci for ci in cart.items if ci.cart_item_id in selected_set
            ]
        else:
            cart_items = list(cart.items)

        if not cart_items:
            raise HTTPException(status_code=400, detail="ยังไม่ได้เลือกสินค้าในตะกร้า")

        items: List[dict] = []
        for item in cart_items:
            variant: ProductVariant = item.variant
            product: Product = variant.product
            store: Store = product.store

            product_image_url = None
            if product.images:
                main_imgs = [img for img in product.images if img.is_main]
                product_image_url = (main_imgs[0] if main_imgs else product.images[0]).image_url

            items.append(
                {
                    "variant": variant,
                    "product": product,
                    "store": store,
                    "quantity": item.quantity,
                    "unit_price": item.price_at_addition,
                    "cart_item_id": item.cart_item_id,
                    "snapshot_product_name": product.product_name,
                    "snapshot_variant_name": variant.name_option,
                    "snapshot_store_name": store.name,
                    "snapshot_product_image_url": product_image_url,
                }
            )

        return items, True, cart.cart_id

    @staticmethod
    def _build_items_from_direct(
        db: Session,
        payload_items: List[CheckoutItem],
    ) -> Tuple[List[dict], bool, None]:
        if not payload_items:
            raise HTTPException(status_code=400, detail="items ห้ามว่างเมื่อ checkout_type=DIRECT")

        items: List[dict] = []
        for item in payload_items:
            variant: ProductVariant = (
                db.query(ProductVariant)
                .filter(
                    ProductVariant.variant_id == item.variant_id,
                    ProductVariant.is_active == True,
                )
                .first()
            )
            if not variant:
                raise HTTPException(status_code=404, detail=f"Variant {item.variant_id} ไม่พบ")

            product: Product = variant.product
            store: Store = product.store

            unit_price = variant.price or product.base_price

            product_image_url = None
            if product.images:
                main_imgs = [img for img in product.images if img.is_main]
                product_image_url = (main_imgs[0] if main_imgs else product.images[0]).image_url

            items.append(
                {
                    "variant": variant,
                    "product": product,
                    "store": store,
                    "quantity": item.quantity,
                    "unit_price": unit_price,
                    "snapshot_product_name": product.product_name,
                    "snapshot_variant_name": variant.name_option,
                    "snapshot_store_name": store.name,
                    "snapshot_product_image_url": product_image_url,
                }
            )

        return items, False, None

    @staticmethod
    def _validate_stock_only(db: Session, items: List[dict]) -> None:
        now = now_utc()
        for item in items:
            variant: ProductVariant = item["variant"]
            qty = item["quantity"]

            print(f"\n[STOCK_VALIDATE] Checking variant_id: {variant.variant_id}")
            print(f"[STOCK_VALIDATE] Requested qty: {qty}")

            try:
                locked_variant = (
                    db.query(ProductVariant)
                    .filter(ProductVariant.variant_id == variant.variant_id)
                    .with_for_update(of=ProductVariant)  # ← lock เฉพาะ table นี้
                    .first()
                )
                print(f"[STOCK_VALIDATE] Locked variant: {locked_variant.variant_id}")
                print(f"[STOCK_VALIDATE] Current stock: {locked_variant.stock}")
            except Exception as e:
                print(f"[STOCK_VALIDATE] ❌ Failed to lock variant: {e}")
                raise

            try:
                reserved_qty = get_active_reserved_quantity(db, locked_variant.variant_id, now)
                print(f"[STOCK_VALIDATE] Reserved qty: {reserved_qty}")
            except Exception as e:
                print(f"[STOCK_VALIDATE] ❌ Failed to get reserved qty: {e}")
                raise

            available = (locked_variant.stock or 0) - reserved_qty
            print(f"[STOCK_VALIDATE] Available: {locked_variant.stock} - {reserved_qty} = {available}")

            if available < qty:
                print(f"[STOCK_VALIDATE] ❌ Not enough stock: available={available}, requested={qty}")
                raise HTTPException(
                    status_code=400,
                    detail=f"สินค้า {locked_variant.sku} คงเหลือไม่พอ (available={available}, requested={qty})",
                )

            print(f"[STOCK_VALIDATE] ✅ Stock OK for variant {locked_variant.variant_id}")
            item["variant"] = locked_variant

    @staticmethod
    def _create_reservations(db: Session, items: List[dict], expires_at: datetime) -> None:
        for item in items:
            variant: ProductVariant = item["variant"]
            qty = item["quantity"]
            order: Order = item["order"]

            reservation = StockReservation(
                order_id=order.order_id,
                variant_id=variant.variant_id,
                quantity=qty,
                expires_at=expires_at,
            )
            db.add(reservation)

    @staticmethod
    def checkout(db: Session, user: User, payload: CheckoutRequest) -> CheckoutResponse:
        now = now_utc()
        expires_at = now + timedelta(minutes=RESERVATION_MINUTES)

        if payload.checkout_type == "CART":
            items, is_from_cart, cart_id = CheckoutService._build_items_from_cart(
                db, user, payload.cart_id, payload.selected_cart_item_ids,
            )
        elif payload.checkout_type == "DIRECT":
            items, is_from_cart, cart_id = CheckoutService._build_items_from_direct(
                db, payload.items
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid checkout_type")

        shipping_address = db.query(ShippingAddress).filter(
            ShippingAddress.ship_addr_id == payload.shipping_address_id,
            ShippingAddress.user_id == user.user_id
        ).first()

        if not shipping_address:
            raise HTTPException(status_code=404, detail="Shipping address not found")

        try:
            CheckoutService._validate_stock_only(db, items)

            items_by_store: Dict[UUID, List[dict]] = {}
            for it in items:
                store_id: UUID = it["store"].store_id
                items_by_store.setdefault(store_id, []).append(it)

            orders: List[Order] = []
            grand_total = 0.0

            for store_id, store_items in items_by_store.items():
                order_total = sum(i["unit_price"] * i["quantity"] for i in store_items)
                total_weight = sum((i["variant"].weight_grams or 500) * i["quantity"] for i in store_items)
                shipping_fee = _calc_shipping_fee(total_weight)
                order_total += shipping_fee
                order = Order(
                    user_id=user.user_id,
                    store_id=store_id,
                    ship_addr_id=payload.shipping_address_id,
                    order_status="UNPAID",
                    order_text_status="ยังไม่ได้ชำระเงิน",
                    customer_name=shipping_address.full_name,
                    total_price=order_total,
                )
                db.add(order)
                db.flush()

                for i in store_items:
                    order_item = OrderItem(
                        order_id=order.order_id,
                        store_id=store_id,
                        product_id=i["product"].product_id,
                        variant_id=i["variant"].variant_id,
                        quantity=i["quantity"],
                        unit_price=i["unit_price"],
                        product_name=i["snapshot_product_name"],
                        variant_name=i["snapshot_variant_name"],
                        store_name=i["snapshot_store_name"],
                        product_image_url=i["snapshot_product_image_url"],
                    )
                    db.add(order_item)
                    i["order"] = order

                orders.append(order)
                grand_total += order_total

            payment = Payment(
                user_id=user.user_id,
                amount=grand_total,
                status=PaymentStatus.PENDING,
                method_code="STRIPE_CARD",
                selected_cart_item_ids=[str(x) for x in payload.selected_cart_item_ids] if payload.selected_cart_item_ids else []
            )
            db.add(payment)
            db.flush()

            CheckoutService._create_reservations(db, items, expires_at)

            for order in orders:
                order.payment_id = payment.payment_id

            db.commit()

            line_items = []
            for item in items:
                actual_price = item["variant"].price if item["variant"].price is not None else item["product"].base_price
                line_items.append({
                    "price_data": {
                        "currency": "thb",
                        "unit_amount": int(actual_price * 100),
                        "product_data": {"name": f"{item['product'].product_name} - {item['variant'].name_option}"},
                    },
                    "quantity": item["quantity"],
                })

            for store_id, store_items in items_by_store.items():
                store_name = store_items[0]["store"].name
                total_weight = sum((i["variant"].weight_grams or 500) * i["quantity"] for i in store_items)
                shipping_fee = _calc_shipping_fee(total_weight)
                line_items.append({
                    "price_data": {
                        "currency": "thb",
                        "unit_amount": int(shipping_fee * 100),
                        "product_data": {"name": f"ค่าจัดส่ง ({store_name})"},
                    },
                    "quantity": 1,
                })

            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                mode="payment",
                line_items=line_items,
                success_url=f"{settings.BASE_URL}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{settings.BASE_URL}/payment/cancel?session_id={{CHECKOUT_SESSION_ID}}",
                payment_intent_data={"transfer_group": f"payment_{payment.payment_id}"},  # ✅ ตรงกับ payout_service
                metadata={"app_payment_id": str(payment.payment_id)},
            )
            

            
            payment.stripe_session_id = session.id
            payment.stripe_checkout_url = session.url  # Issue #6
            db.commit()

            timeout_seconds = RESERVATION_MINUTES * 60
            for order in orders:
                check_order_timeout.apply_async(args=[str(order.order_id)], countdown=timeout_seconds)

            return CheckoutResponse(
                order_ids=[o.order_id for o in orders],
                stripe_session_id=session.id,
                stripe_checkout_url=session.url,
                expires_at=expires_at
            )

        except Exception as e:
            db.rollback()
            if isinstance(e, HTTPException): raise e
            raise HTTPException(status_code=500, detail=f"Checkout failed: {str(e)}")