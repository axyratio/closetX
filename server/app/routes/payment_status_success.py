# app/routes/payment_status_router.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.payment import Payment

router = APIRouter(prefix="/api/payment", tags=["Payment Status"])


@router.get("/status-by-session/{session_id}")
def status_by_session(session_id: str, db: Session = Depends(get_db)):
    payment = db.query(Payment).filter(Payment.stripe_session_id == session_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="payment not found")

    return {
        "payment_id": str(payment.payment_id),
        "status": payment.status,
        "paid_at": payment.paid_at,
        "payment_intent_id": payment.payment_intent_id,
        "decline_code": payment.decline_code,  # Issue #5: ส่ง decline_code กลับมาให้ frontend
    }