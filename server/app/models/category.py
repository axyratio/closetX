# File: app/models/category.py
"""
Category Model - Updated with Image Support
"""
from sqlalchemy import Column, String, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
from app.db.database import Base
from app.utils.now_utc import now_utc
from sqlalchemy.dialects.postgresql import UUID
import uuid


class Category(Base):
    __tablename__ = "categories"
    
    category_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    name = Column(String(100), nullable=False, unique=True)
    slug = Column(String(100), nullable=False, unique=True, index=True)
    
    # ✅ เพิ่มฟิลด์รูปภาพ
    image = Column(String(500), nullable=True, comment="URL รูปภาพหมวดหมู่")
    description = Column(Text, nullable=True, comment="คำอธิบายหมวดหมู่")
    
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
    
    # Relationship
    products = relationship("Product", back_populates="category_rel")