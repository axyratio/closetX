# app/schemas/stock_reservation.py
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel
from typing import Optional


class StockReservationBase(BaseModel):
    order_id: UUID
    variant_id: UUID
    quantity: int
    expires_at: datetime


class StockReservationCreate(StockReservationBase):
    pass


class StockReservationUpdate(BaseModel):
    quantity: Optional[int] = None
    expires_at: Optional[datetime] = None


class StockReservationRead(StockReservationBase):
    reservation_id: UUID
    created_at: datetime

    class Config:
        orm_mode = True
