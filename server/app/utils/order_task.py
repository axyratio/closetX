from celery.utils.log import get_task_logger
from sqlalchemy.orm import Session
from uuid import UUID
import stripe

from app.core.stripe_client import stripe
from app.core.celery import celery_app
from app.db.database import SessionLocal
from app.models.order import Order
from app.models.payment import Payment, PaymentStatus
from app.models.stock_reservation import StockReservation
from app.utils.now_utc import now_utc

logger = get_task_logger(__name__)

@celery_app.task(bind=True, max_retries=3)
def check_order_timeout(self, order_id_str: str):
    db: Session = SessionLocal()
    try:
        order_id = UUID(order_id_str)
        # ✅ 1. Lock row ออเดอร์เพื่อป้องกัน Webhook เข้ามาแก้ไขพร้อมกัน
        order = (
            db.query(Order)
            .filter(Order.order_id == order_id)
            .with_for_update()
            .first()
        )

        if not order:
            logger.error(f"[TIMEOUT TASK] Order {order_id_str} not found")
            return

        current_status = str(order.order_status).upper()
        logger.info(f"[TIMEOUT TASK] Checking Order: {order_id}, Status: {current_status}")

        # ✅ 2. ถ้าสถานะไม่ใช่ UNPAID (เช่น เป็น PAID หรือ CANCELLED ไปแล้ว) ให้หยุดทำงาน
        if current_status != "UNPAID":
            logger.info(f"[TIMEOUT TASK] Order {order_id} is already {current_status}. Skipping.")
            return

        payment = None
        if order.payment_id:
            payment = (
                db.query(Payment)
                .filter(Payment.payment_id == order.payment_id)
                .first()
            )

        # ✅ 3. Double Check: ตรวจสอบสถานะจริงจาก Stripe API 
        # เพื่อกันกรณี Webhook ยังไม่มา แต่เงินเข้า Stripe ไปแล้ว
        if payment and payment.stripe_session_id:
            try:
                session = stripe.checkout.Session.retrieve(payment.stripe_session_id)
                stripe_payment_status = session.get("payment_status") # 'paid', 'unpaid'
                
                if stripe_payment_status == "paid":
                    logger.info(f"[TIMEOUT TASK] Stripe says PAID for order {order_id}. Syncing DB...")
                    # อัปเดตข้อมูลให้เป็นชำระเงินสำเร็จ
                    payment.status = PaymentStatus.SUCCESS
                    payment.paid_at = now_utc()
                    order.order_status = "PREPARING"
                    order.order_text_status = "กำลังจัดเตรียมสินค้า"
                    db.commit()
                    return

                # ✅ 4. เพิ่มความปลอดภัย: สั่ง Expire Stripe Session ทันที
                # เพื่อป้องกันลูกค้ายัดไส้จ่ายเงินเข้ามาหลังจากที่เรากดยกเลิกออเดอร์ใน DB ไปแล้ว
                if session.get("status") == "open":
                    try:
                        stripe.checkout.Session.expire(payment.stripe_session_id)
                        logger.info(f"[TIMEOUT TASK] Stripe Session expired for order {order_id}")
                    except Exception as ex:
                        logger.warning(f"[TIMEOUT TASK] Could not expire Stripe session: {ex}")

            except Exception as e:
                logger.error(f"[TIMEOUT TASK] Stripe check error: {e}")
                # หากเชื่อมต่อ Stripe ไม่ได้ ให้ retry ใหม่ (ป้องกันเน็ตหลุด)
                raise self.retry(exc=e, countdown=30)

        # ✅ 5. --- กระบวนการยกเลิก (CANCEL) ---
        # มาถึงตรงนี้แสดงว่า เช็คใน DB แล้วยังไม่จ่าย และเช็คใน Stripe แล้วก็ยังไม่จ่าย
        logger.info(f"[TIMEOUT TASK] !!! CANCELING ORDER {order_id} !!!")
        
        order.order_status = "CANCELLED"
        order.order_text_status = "ยกเลิกอัตโนมัติ (หมดเวลาชำระเงิน)"

        # คืน Stock ทันที
        db.query(StockReservation).filter(
            StockReservation.order_id == order_id
        ).delete(synchronize_session=False)

        if payment and payment.status == PaymentStatus.PENDING:
            payment.status = PaymentStatus.FAILED

        db.commit()
        logger.info(f"[TIMEOUT TASK] Order {order_id} cancelled and stock released.")

    except Exception as e:
        db.rollback()
        # ถ้าเป็น Exception ของ Celery Retry ไม่ต้อง Log Error ซ้ำ
        if not isinstance(e, self.Retry):
            logger.error(f"[TIMEOUT TASK] Fatal Error: {str(e)}", exc_info=True)
    finally:
        db.close()