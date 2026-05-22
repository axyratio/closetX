# app/models/garment_image.py
"""
Model สำหรับเก็บรูปเสื้อผ้าที่ผู้ใช้อัปโหลดเอง (Outfit)
- ใช้สำหรับลองเสื้อโดยไม่ต้องมี Product ID
"""
from sqlalchemy import Column, String, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.database import Base
from app.utils.now_utc import now_utc
import uuid

class GarmentImage(Base):
    """
    ตารางเก็บรูปเสื้อผ้าที่ผู้ใช้นำเข้าเอง (Outfit)
    - ไม่เกี่ยวกับ Product
    - ใช้สำหรับลองเสื้อแบบอิสระ
    """
    __tablename__ = "garment_images"

    garment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # ❌ ไม่ใส่ ondelete="CASCADE" ตามที่พี่ต้องการครับ
    # GarmentImage
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String(200), nullable=True)  # ชื่อที่ผู้ใช้ตั้ง เช่น "เสื้อยืดสีดำ"
    image_url = Column(String(500), nullable=False)
    
    is_valid = Column(Boolean, default=True)  # ผ่านการตรวจสอบจาก AI หรือไม่
    uploaded_at = Column(DateTime(timezone=True), default=now_utc)
    
    # Relationships
    user = relationship("User", back_populates="garment_images")  # เอา backref ออก
    vton_sessions = relationship("VTONSession", back_populates="garment", passive_deletes=True)
    
    
# app/models/user_product_garment.py
"""
Model/Table สำหรับเก็บความสัมพันธ์ User <-> ProductVariant (Product Garments)
"""
from sqlalchemy import Column, ForeignKey, DateTime, Table
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

from app.db.database import Base
from app.utils.now_utc import now_utc

# ตารางเชื่อม User กับ Product Variant (Many-to-Many)
user_product_garments = Table(
    "user_product_garments",
    Base.metadata,
    
    # ❌ ฝั่ง User: ไม่ใส่ ondelete="CASCADE"
    Column("user_id", PG_UUID(as_uuid=True), ForeignKey("users.user_id"), primary_key=True),
    
    # ✅ ฝั่ง Variant: ใส่ ondelete="CASCADE" (เพื่อให้เวลาลบ Product/Variant แล้วมันลบตัวเองทิ้งตาม)
    Column("variant_id", PG_UUID(as_uuid=True), ForeignKey("product_variants.variant_id", ondelete="CASCADE"), primary_key=True),
    
    Column("added_at", DateTime(timezone=True), default=now_utc),
)
