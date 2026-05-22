# app/services/stripe_webhook_service.py
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.stripe_client import stripe


from app.models.order import Order
from app.models.payment import Payment, PaymentStatus
from app.models.stock_reservation import StockReservation
from app.models.product import ProductVariant
from app.models.cart import Cart, CartItem
from app.utils.now_utc import now_utc


class StripeWebhookService:
    @staticmethod
    def handle_checkout_session_completed(db: Session, event):
        session = event["data"]["object"]

        metadata = session.get("metadata", {}) or {}

        order_ids_raw = metadata.get("order_ids") or metadata.get("order_id")
        is_from_cart = metadata.get("is_from_cart") == "true"
        user_id = metadata.get("user_id")
        cart_id = metadata.get("cart_id")

        if not order_ids_raw:
            raise HTTPException(status_code=400, detail="order_ids ไม่อยู่ใน Stripe metadata")

        if "," in order_ids_raw:
            order_ids = [oid.strip() for oid in order_ids_raw.split(",") if oid.strip()]
        else:
            order_ids = [order_ids_raw]

        orders = (
            db.query(Order)
            .filter(Order.order_id.in_(order_ids))
            .with_for_update()
            .all()
        )

        if not orders:
            raise HTTPException(status_code=404, detail="Orders not found")

        payment = db.query(Payment).filter(
            Payment.payment_id == orders[0].payment_id
        ).first()

        all_paid = all(o.status == "PAID" for o in orders)
        if all_paid:
            return

        now = now_utc()

        if payment:
            payment.status = PaymentStatus.SUCCESS
            payment.paid_at = now
            if not payment.payment_intent_id and session.get("payment_intent"):
                payment.payment_intent_id = session["payment_intent"]
            if session.get("payment_intent"):
                try:
                    pi = stripe.PaymentIntent.retrieve(session["payment_intent"])
                    if pi.get("latest_charge"):
                        payment.stripe_charge_id = pi["latest_charge"]
                except Exception as e:
                    print(f"[WEBHOOK] ⚠️ Could not retrieve charge_id: {e}")

        for order in orders:
            if order.status == "PAID":
                continue

            order.status = "PAID"
            order.updated_at = now

            for item in order.order_items:
                variant_id = getattr(item, "variant_id", None)
                if not variant_id:
                    continue

                variant = (
                    db.query(ProductVariant)
                    .filter(ProductVariant.variant_id == variant_id)
                    .first()
                )
                if variant:
                    variant.stock = (variant.stock or 0) - item.quantity
                    if variant.stock < 0:
                        variant.stock = 0

            db.query(StockReservation).filter(
                StockReservation.order_id == order.order_id
            ).delete(synchronize_session=False)

        if is_from_cart and cart_id and user_id:
            cart = (
                db.query(Cart)
                .filter(Cart.cart_id == cart_id, Cart.user_id == user_id)
                .first()
            )
            if cart:
                db.query(CartItem).filter(
                    CartItem.cart_id == cart.cart_id
                ).delete(synchronize_session=False)

        db.commit()
        

    @staticmethod
    def handle_payment_intent_failed(db: Session, event):
        """
        Issue #5: รับ event payment_intent.payment_failed
        บันทึกสถานะ payment เป็น FAILED พร้อมเก็บ decline_code ไว้ใน DB
        """
        payment_intent = event["data"]["object"]
        payment_intent_id = payment_intent.get("id")

        payment = db.query(Payment).filter(
            Payment.payment_intent_id == payment_intent_id
        ).first()

        if not payment:
            print(f"[WEBHOOK] payment_intent.payment_failed: ไม่พบ payment สำหรับ {payment_intent_id}")
            return

        last_error = payment_intent.get("last_payment_error", {}) or {}
        decline_code = last_error.get("decline_code") or last_error.get("code") or "generic_decline"

        payment.status = PaymentStatus.FAILED
        payment.decline_code = decline_code
        db.commit()

        print(f"[WEBHOOK] payment failed: payment_id={payment.payment_id}, decline_code={decline_code}")