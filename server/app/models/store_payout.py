# =============================================================
# FILE: app/models/store_payout.py
# PURPOSE: Model สำหรับบันทึกประวัติการโอนเงินให้ร้านค้า
# NOTE: ไม่มี payment_id เพราะสามารถเข้าถึงได้ผ่าน order.payment
# =============================================================

import uuid
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, TEXT
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.database import Base
from app.utils.now_utc import now_utc


class StorePayout(Base):
    """
    บันทึกประวัติการโอนเงินให้ร้านค้า
    
    Relationships:
    - StorePayout → Order → Payment (เข้าถึง payment ผ่าน payout.order.payment)
    - StorePayout → Store
    
    Fields:
    - เชื่อมโยงกับ Store และ Order
    - บันทึก transfer_id จาก Stripe
    - บันทึกยอดเงิน, ค่าธรรมเนียม, และสถานะ
    """
    __tablename__ = 'store_payouts'

    payout_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign Keys
    store_id = Column(UUID(as_uuid=True), ForeignKey('stores.store_id'), nullable=False, index=True)
    order_id = Column(UUID(as_uuid=True), ForeignKey('orders.order_id'), nullable=False, index=True)
    
    # Stripe Transfer Info
    transfer_id = Column(String, nullable=True, unique=True, index=True)  # Stripe Transfer ID
    transfer_group = Column(String, nullable=True, index=True)  # เช่น "order_xxx"
    
    # Amount Details
    amount = Column(Float, nullable=False)  # ยอดรวมของร้าน (ก่อนหักค่าธรรมเนียม)
    platform_fee = Column(Float, nullable=False, default=0.0)  # ค่าธรรมเนียมของเราเอง
    net_amount = Column(Float, nullable=False)  # ยอดโอนจริง (หลังหักค่าธรรมเนียม)
    
    # Status
    status = Column(String, nullable=False, default="pending")  # pending, completed, failed
    error_message = Column(TEXT, nullable=True)  # ข้อความ error (ถ้ามี)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    transferred_at = Column(DateTime(timezone=True), nullable=True)  # เวลาที่โอนสำเร็จ
    
    # Relationships
    store = relationship("Store", backref="payouts")
    order = relationship("Order", backref="payouts")
    
    # Property สำหรับเข้าถึง payment (convenience method)
    @property
    def payment(self):
        """เข้าถึง Payment record ผ่าน Order"""
        return self.order.payment if self.order else None
    
    @property
    def payment_intent_id(self):
        """เข้าถึง Stripe Payment Intent ID"""
        return self.payment.payment_intent_id if self.payment else None