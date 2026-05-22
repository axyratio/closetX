# app/services/stock_service.py
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.orm import noload
from app.models.stock_reservation import StockReservation
from app.models.product import ProductVariant

def commit_stock_for_order(db: Session, order_id: UUID) -> None:
    """
    ลด stock จริงตาม reservation ของ order นี้ แล้วลบ reservation
    ต้องทำหลัง payment SUCCESS เท่านั้น
    """
    # ดึง reservations ของ order
    reservations = (
        db.query(StockReservation)
        .filter(StockReservation.order_id == order_id)
        .all()
    )
    if not reservations:
        return

    # รวมจำนวนต่อ variant_id กัน loop ซ้ำ
    qty_by_variant: dict[UUID, int] = {}
    for r in reservations:
        qty_by_variant[r.variant_id] = qty_by_variant.get(r.variant_id, 0) + int(r.quantity)

    # lock แถว variant กัน race (Postgres)
    variants = (
        db.query(ProductVariant)
        .options(noload('*'))
        .filter(ProductVariant.variant_id.in_(list(qty_by_variant.keys())))
        .with_for_update()
        .all()
    )
    variant_map = {v.variant_id: v for v in variants}

    # หัก stock จริง
    for variant_id, qty in qty_by_variant.items():
        v = variant_map.get(variant_id)
        if not v:
            continue

        current = int(v.stock or 0)
        new_stock = current - qty

        if new_stock < 0:
            # ในอุดมคติไม่ควรเกิด ถ้า reserve/check ถูกต้อง
            # จะ raise หรือ clamp ก็เลือกเอา
            raise ValueError(f"Stock negative for variant {variant_id}: {current} - {qty}")

        v.stock = new_stock

    # ลบ reservation ของ order นี้ทิ้ง
    (
        db.query(StockReservation)
        .filter(StockReservation.order_id == order_id)
        .delete(synchronize_session=False)
    )
