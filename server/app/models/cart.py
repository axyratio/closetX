from app.db.database import Base
from sqlalchemy import (
    Column, Float, Integer, String, ForeignKey, DateTime, Boolean
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.utils.now_utc import now_utc
import uuid

# ─────────────────────────────
# ตารางหลัก: ตะกร้าสินค้าของผู้ใช้
# ─────────────────────────────
class Cart(Base):
    __tablename__ = "carts"

    cart_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # ✅ เพิ่ม ondelete="CASCADE" (ถ้า User โดนลบ ตะกร้าของ User คนนั้นจะหายไปเลย)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)

    created_at = Column(DateTime, default=now_utc)
    updated_at = Column(DateTime, default=now_utc, onupdate=now_utc)
    is_active = Column(Boolean, default=True)

    user = relationship("User", back_populates="cart")
    items = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")


# ─────────────────────────────
# ตารางย่อย: รายการสินค้าในตะกร้า
# ─────────────────────────────
class CartItem(Base):
    __tablename__ = "cart_items"

    cart_item_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # ✅ เพิ่ม ondelete="CASCADE" (ถ้าตะกร้าหลักโดนลบ Item พวกนี้ก็ปลิวตาม)
    cart_id = Column(UUID(as_uuid=True), ForeignKey("carts.cart_id", ondelete="CASCADE"), nullable=False)
    
    # ✅ เพิ่ม ondelete="CASCADE" (ถ้าแม่ค้าลบสินค้า Item นี้จะถูกดึงออกจากตะกร้าลูกค้าอัตโนมัติ)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.product_id", ondelete="CASCADE"), nullable=False)
    
    # ✅ เพิ่ม ondelete="CASCADE" (ถ้าแม่ค้าลบรุ่นสินค้านั้นๆ ออก Item นี้ก็ปลิวเหมือนกัน)
    variant_id = Column(UUID(as_uuid=True), ForeignKey("product_variants.variant_id", ondelete="CASCADE"), nullable=False)

    quantity = Column(Integer, nullable=False, default=1)
    added_at = Column(DateTime, default=now_utc)
    price_at_addition = Column(Float, nullable=False)

    cart = relationship("Cart", back_populates="items")
    variant = relationship("ProductVariant")

    @property
    def total_price(self):
        return self.quantity * self.price_at_addition