from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.stock_reservation import (
    StockReservationRead,
    StockReservationCreate,
    StockReservationUpdate,
)
from app.repositories.stock_reservation_repository import (
    get_reservation,
    get_reservations,
    create_reservation,
    update_reservation,
    delete_reservation,
)
from app.core.authz import authenticate_token
from app.utils.response_handler import success_response, error_response

router = APIRouter(
    prefix="/api/v1/stock-reservations",
    tags=["Stock Reservations (CRUD)"],
)


@router.get("/", dependencies=[Depends(authenticate_token())])
def list_reservations(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
):
    reservations = get_reservations(db, skip=skip, limit=limit)
    return success_response("ดึงรายการจองสำเร็จ", reservations)


@router.get("/{reservation_id}", dependencies=[Depends(authenticate_token())])
def get_reservation_by_id(
    reservation_id: UUID,
    db: Session = Depends(get_db),
):
    reservation = get_reservation(db, reservation_id)
    if not reservation:
        return error_response("ไม่พบรายการจอง", status_code=404)
    return success_response("ดึงรายการจองสำเร็จ", reservation)


@router.post("/", dependencies=[Depends(authenticate_token())])
def create_reservation_api(
    payload: StockReservationCreate,
    db: Session = Depends(get_db),
):
    reservation = create_reservation(db, payload)
    return success_response("สร้างรายการจองสำเร็จ", reservation, status_code=201)


@router.put("/{reservation_id}", dependencies=[Depends(authenticate_token())])
def update_reservation_api(
    reservation_id: UUID,
    payload: StockReservationUpdate,
    db: Session = Depends(get_db),
):
    reservation = get_reservation(db, reservation_id)
    if not reservation:
        return error_response("ไม่พบรายการจอง", status_code=404)

    reservation = update_reservation(db, reservation, payload)
    return success_response("อัปเดตรายการจองสำเร็จ", reservation)


@router.delete("/{reservation_id}", dependencies=[Depends(authenticate_token())])
def delete_reservation_api(
    reservation_id: UUID,
    db: Session = Depends(get_db),
):
    reservation = get_reservation(db, reservation_id)
    if not reservation:
        return error_response("ไม่พบรายการจอง", status_code=404)

    delete_reservation(db, reservation)
    return success_response("ลบรายการจองสำเร็จ", {})
