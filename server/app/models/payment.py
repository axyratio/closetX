import enum
from sqlalchemy import Column, Float, String, DateTime, ForeignKey
from sqlalchemy import Enum
from sqlalchemy.orm import relationship
from app.db.database import Base
from app.utils.now_utc import now_utc
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid


class PaymentStatus(enum.Enum):
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    PROCESSING = "PROCESSING"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"
    CANCELLED = "CANCELLED"


class Payment(Base):
    __tablename__ = "payments"

    payment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    method_code = Column(String(50), ForeignKey("payment_methods.method_code"))
    amount = Column(Float, nullable=False)
    status = Column(Enum(PaymentStatus, name="payment_status_enum"), default=PaymentStatus.PENDING)
    decline_code = Column(String(50), nullable=True)  # เพิ่มฟิลด์นี้สำหรับเก็บสาเหตุที่จ่ายไม่สำเร็จ

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    selected_cart_item_ids = Column(JSONB, nullable=True)

    payment_intent_id = Column(String(100), nullable=True, unique=True)
    stripe_charge_id = Column(String(100), nullable=True)  # charge ID สำหรับ source_transaction ตอนโอนเงิน
    stripe_checkout_url = Column(String(500), nullable=True)
    stripe_session_id = Column(String(100), nullable=True, unique=True)

    transaction_ref = Column(String(100), nullable=True)
    bank_name = Column(String(50), nullable=True)
    slip_url = Column(String(255), nullable=True)
    card_brand = Column(String(20), nullable=True)
    masked_card_number = Column(String(20), nullable=True)
    paid_at = Column(DateTime, default=None)

    orders = relationship("Order", back_populates="payment")
    payment_method = relationship("PaymentMethodMeta", back_populates="payments")