import enum
from sqlalchemy import Column, Numeric, String, ForeignKey, DateTime, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from app.db.database import Base
from app.utils.now_utc import now_utc
import uuid


class ReturnStatus(enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    REFUNDED = "REFUNDED"
    CANCELLED = "CANCELLED"


class ReturnReason(enum.Enum):
    WRONG_ITEM = "WRONG_ITEM"
    DAMAGED = "DAMAGED"
    NOT_AS_DESCRIBED = "NOT_AS_DESCRIBED"
    DEFECTIVE = "DEFECTIVE"
    SIZE_ISSUE = "SIZE_ISSUE"
    QUALITY_ISSUE = "QUALITY_ISSUE"
    OTHER = "OTHER"


class ReturnOrder(Base):
    __tablename__ = 'return_orders'

    return_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey('orders.order_id', ondelete='SET NULL'), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id', ondelete='SET NULL'), nullable=True)

    reason = Column(Enum(ReturnReason, name="return_reason_enum"), nullable=False)
    reason_detail = Column(Text, nullable=True)
    image_urls = Column(ARRAY(String), nullable=True)

    status = Column(Enum(ReturnStatus, name="return_status_enum"), default=ReturnStatus.PENDING)
    status_text = Column(String, default="รอร้านค้าตรวจสอบ")

    refund_amount = Column(Numeric(precision=10, scale=2), nullable=True)
    store_note = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), onupdate=now_utc, nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    rejected_at = Column(DateTime(timezone=True), nullable=True)
    refunded_at = Column(DateTime(timezone=True), nullable=True)

    order = relationship("Order", backref="return_requests")
    user = relationship("User", backref="return_requests")


class ReturnImage(Base):
    __tablename__ = 'return_images'

    image_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    return_id = Column(UUID(as_uuid=True), ForeignKey('return_orders.return_id'), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id', ondelete='SET NULL'), nullable=True)

    image_url = Column(String(500), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), default=now_utc)

    user = relationship("User", backref="return_images")
    return_order = relationship("ReturnOrder", backref="temp_images", foreign_keys=[return_id])