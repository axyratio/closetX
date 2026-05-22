from sqlalchemy import Boolean, Column, Float, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.database import Base
from app.utils.now_utc import now_utc
import uuid
from enum import Enum as PyEnum


class OrderStatus(str, PyEnum):
    UNPAID = "UNPAID"
    PAID = "PAID"
    PREPARING = "PREPARING"
    SHIPPED = "SHIPPED"
    DELIVERED = "DELIVERED"
    COMPLETED = "COMPLETED"
    RETURNING = "RETURNING"
    RETURNED = "RETURNED"
    CANCELLED = "CANCELLED"
    FAILED = "FAILED"


class Order(Base):
    __tablename__ = 'orders'

    order_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id', ondelete='SET NULL'), nullable=True)
    ship_addr_id = Column(UUID(as_uuid=True), ForeignKey('shipping_addresses.ship_addr_id', ondelete='SET NULL'), nullable=True)
    store_id = Column(UUID(as_uuid=True), ForeignKey('stores.store_id', ondelete='SET NULL'), nullable=True)
    payment_id = Column(UUID(as_uuid=True), ForeignKey('payments.payment_id', ondelete='SET NULL'), nullable=True)

    is_locked = Column(Boolean, default=False)

    order_status = Column(String, nullable=False, default='UNPAID')
    order_text_status = Column(String, nullable=False, default="รอชำระเงิน")

    customer_name = Column(String, nullable=False)
    shipping_cost = Column(Float, nullable=False, default=0.00)
    tracking_number = Column(String, nullable=True)
    courier_name = Column(String, nullable=True)
    total_price = Column(Float, nullable=False)

    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), onupdate=now_utc, nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    store = relationship("Store", back_populates="orders")
    user = relationship('User', back_populates='orders')
    order_items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payment = relationship("Payment", back_populates="orders")
    shipping_address = relationship("ShippingAddress", back_populates="orders")