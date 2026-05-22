# app/models/stripe_event.py
from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from app.db.database import Base  # ถ้าของคุณ Base อยู่ที่อื่น ให้ปรับ import

class StripeEvent(Base):
    __tablename__ = "stripe_events"

    event_id = Column(String(255), primary_key=True, index=True)  # Stripe event.id
    event_type = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
