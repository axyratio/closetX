from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.db.database import Base
from app.utils.now_utc import now_utc

class StockReservation(Base):
    __tablename__ = 'stock_reservations'

    reservation_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # ถ้าออเดอร์หาย การจองต้องหายตาม
    order_id = Column(
        UUID(as_uuid=True), 
        ForeignKey('orders.order_id', ondelete="CASCADE"), 
        nullable=False
    )
    
    # ถ้ารุ่นสินค้าหาย การจองต้องหายตาม
    variant_id = Column(
        UUID(as_uuid=True), 
        ForeignKey('product_variants.variant_id', ondelete="CASCADE"), 
        nullable=False
    )

    quantity = Column(Integer, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc)