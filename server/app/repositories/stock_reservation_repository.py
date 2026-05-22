from typing import List, Optional
from uuid import UUID
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.stock_reservation import StockReservation


def get_reservation(db: Session, reservation_id: UUID) -> Optional[StockReservation]:
    return (
        db.query(StockReservation)
        .filter(StockReservation.reservation_id == reservation_id)
        .first()
    )


def get_reservations(db: Session, skip: int = 0, limit: int = 100) -> List[StockReservation]:
    return (
        db.query(StockReservation)
        .order_by(StockReservation.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def create_reservation(db: Session, data) -> StockReservation:
    reservation = StockReservation(**data.dict())
    db.add(reservation)
    db.commit()
    db.refresh(reservation)
    return reservation


def update_reservation(db: Session, reservation: StockReservation, data) -> StockReservation:
    update_data = data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(reservation, field, value)
    db.commit()
    db.refresh(reservation)
    return reservation


def delete_reservation(db: Session, reservation: StockReservation):
    db.delete(reservation)
    db.commit()


def get_active_reserved_quantity(db: Session, variant_id: UUID, now: datetime) -> int:
    """
    รวมจำนวนที่ถูก reserve อยู่ (ยังไม่หมดอายุ)
    """
    total = (
        db.query(func.coalesce(func.sum(StockReservation.quantity), 0))
        .filter(
            StockReservation.variant_id == variant_id,
            StockReservation.expires_at > now
        )
        .scalar()
    )
    return int(total or 0)
