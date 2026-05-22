# app/api/checkout.py
from duckdb import HTTPException
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.database import get_db
from app.schemas.checkout import CheckoutRequest, CheckoutResponse
from app.services.checkout_service import CheckoutService
from app.core.authz import authenticate_token
from app.models.user import User
from app.utils.response_handler import success_response

from app.models.order import Order
from app.models.payment import Payment, PaymentStatus
from app.models.stock_reservation import StockReservation
from app.models.user import User

router = APIRouter(
    prefix="/api/v1",
    tags=["Checkout"],
)


@router.post("/checkout", response_model=CheckoutResponse)
def checkout(
    payload: CheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token()),
):
    result = CheckoutService.checkout(db, current_user, payload)
    return success_response("สร้างคำสั่งซื้อและ Stripe session สำเร็จ", result, status_code=201)

@router.post("/checkout/cancel/{order_id}")
def cancel_reservation(
    order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token()),
):
    """
    ยกเลิก reservation เมื่อ user ออกจากหน้าชำระเงินก่อนเวลาหมด
    """
    order = db.query(Order).filter(
        Order.order_id == order_id,
        Order.user_id == current_user.user_id
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.order_status != "PENDING":
        return success_response("Order already processed", {"status": order.order_status})
    
    order.order_status = "CANCELLED"
    order.order_text_status = "ยกเลิกโดยผู้ใช้"
    
    db.query(StockReservation).filter(
        StockReservation.order_id == order_id
    ).delete(synchronize_session=False)
    
    if order.payment_id:
        payment = db.query(Payment).filter(
            Payment.payment_id == order.payment_id
        ).first()
        if payment and payment.status == PaymentStatus.PENDING:
            payment.status = PaymentStatus.FAILED
    
    db.commit()
    
    return success_response("ยกเลิกการจองสำเร็จ", {"order_id": str(order_id)})

# ========================================================
# เพิ่มต่อท้าย checkout_router.py (หลัง cancel_reservation)
# ========================================================

@router.post("/checkout/preview")
def checkout_preview(
    payload: CheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token()),
):
    """
    คำนวณค่าส่งจากน้ำหนักจริง — ไม่สร้าง order / ไม่จอง stock
    ใช้แสดง preview ก่อนกดชำระเงิน
    """
    from app.services.checkout_service import _calc_shipping_fee

    # ดึงข้อมูลสินค้าเหมือน checkout จริง แต่ไม่สร้างอะไรเลย
    if payload.checkout_type == "CART":
        items, _, _ = CheckoutService._build_items_from_cart(
            db, current_user, payload.cart_id, payload.selected_cart_item_ids,
        )
    elif payload.checkout_type == "DIRECT":
        items, _, _ = CheckoutService._build_items_from_direct(db, payload.items)
    else:
        raise HTTPException(status_code=400, detail="Invalid checkout_type")

    # group by store
    items_by_store = {}
    for it in items:
        sid = str(it["store"].store_id)
        items_by_store.setdefault(sid, []).append(it)

    shipping_fees = {}
    items_total = 0.0

    for sid, store_items in items_by_store.items():
        total_weight = sum(
            (i["variant"].weight_grams or 500) * i["quantity"]
            for i in store_items
        )
        shipping_fees[sid] = _calc_shipping_fee(total_weight)
        items_total += sum(i["unit_price"] * i["quantity"] for i in store_items)

    shipping_total = sum(shipping_fees.values())

    return success_response("Preview", {
        "shipping_fees": shipping_fees,
        "items_total": items_total,
        "shipping_total": shipping_total,
        "grand_total": items_total + shipping_total,
    })