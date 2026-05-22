# app/models/vton_background.py

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.database import Base
from app.utils.now_utc import now_utc
import uuid

class VTONBackground(Base):
    __tablename__ = "vton_backgrounds"

    background_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # ชื่อเรียกพื้นหลัง (เช่น "Beach Sunset", "Studio White")
    name = Column(String(100), nullable=False)
    
    # URL ของรูปภาพพื้นหลัง
    image_url = Column(String(255), nullable=False)
    
    # หมวดหมู่ เพื่อใช้กรองในหน้าเว็บ (เช่น "Solid Color", "Nature", "Luxury", "Street")
    category = Column(String(50), nullable=True) 

    # เป็นพื้นหลังของระบบหรือไม่? (True = ทุกคนใช้ได้, False = เฉพาะ User เจ้าของ)
    is_system = Column(Boolean, default=True)

    # ถ้า is_system = False ต้องระบุว่าใครเป็นเจ้าของ (Optional)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=now_utc)

    # Relationships
    user = relationship("User", back_populates="uploaded_backgrounds")
    sessions = relationship("VTONSession", back_populates="background")