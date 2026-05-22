from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.stock_reservation import StockReservation
from app.models.order import Order
from app.utils.now_utc import now_utc


scheduler = AsyncIOScheduler()


def cleanup_expired_orders():
    db: Session = SessionLocal()
    try:
        now = now_utc()
        expired_reservations = (
            db.query(StockReservation)
            .filter(StockReservation.expires_at < now)
            .all()
        ) 

        for res in expired_reservations:
            order = res.order
            if order and order.order_status == "PENDING":
                order.order_status = "CANCELLED"
            db.delete(res)

        db.commit()
    except Exception as e:
        db.rollback()
        print("cleanup_expired_orders error:", e)
    finally:
        db.close()


def start_scheduler():
    scheduler.add_job(cleanup_expired_orders, "interval", minutes=1)
    scheduler.start()
