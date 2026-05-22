# app/models/notification.py
from sqlalchemy import Boolean, Column, String, ForeignKey, DateTime, Text, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.database import Base
from app.utils.now_utc import now_utc
import uuid
import enum


class NotificationType(str, enum.Enum):
    ORDER_PAID = "ORDER_PAID"                   # ชำระเงินแล้ว
    ORDER_PREPARING = "ORDER_PREPARING"         # กำลังเตรียมสินค้า
    ORDER_SHIPPED = "ORDER_SHIPPED"             # จัดส่งแล้ว
    ORDER_DELIVERED = "ORDER_DELIVERED"         # จัดส่งสำเร็จ ⭐ ส่งการแจ้งเตือนสำหรับข้อนี้
    ORDER_COMPLETED = "ORDER_COMPLETED"         # ยืนยันรับสินค้าแล้ว
    ORDER_CANCELLED = "ORDER_CANCELLED"         # ยกเลิก
    RETURN_REQUEST = "RETURN_REQUEST"           # มีคำขอคืนสินค้า (สำหรับผู้ขาย)
    RETURN_APPROVED = "RETURN_APPROVED"         # อนุมัติคืนสินค้า
    RETURN_REJECTED = "RETURN_REJECTED"         # ปฏิเสธคืนสินค้า
    NEW_MESSAGE = "NEW_MESSAGE"                 # ข้อความใหม่
    PAYMENT_SUCCESS = "PAYMENT_SUCCESS"         # ชำระเงินสำเร็จ
    PAYMENT_FAILED = "PAYMENT_FAILED"           # ชำระเงินล้มเหลว


class Notification(Base):
    __tablename__ = "notifications"

    notification_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    
    notification_type = Column(
        Enum(NotificationType, name="notification_type_enum"),
        nullable=False
    )
    receiver_role = Column(String(50), nullable=True)  # เช่น "customer", "seller", "admin"
    
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    
    # ข้อมูลเพิ่มเติม (เก็บเป็น JSON-like)
    order_id = Column(UUID(as_uuid=True), nullable=True)
    store_id = Column(UUID(as_uuid=True), nullable=True)
    conversation_id = Column(UUID(as_uuid=True), nullable=True)
    
    # Image URL สำหรับแสดงใน notification (เช่น รูปสินค้า)
    image_url = Column(String, nullable=True)
    
    # สถานะ
    is_read = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="notifications")


# ✅ เพิ่ม relationship ใน User model ด้วย
# ใน models/user.py ให้เพิ่ม:
# notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")