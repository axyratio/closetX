# models/user.py
from sqlalchemy import Column, Date, DateTime, String, Boolean, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.database import Base
import uuid
from datetime import datetime, timezone, date

def now_utc():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    user_id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    gender = Column(String)
    phone_number = Column(String, nullable=False)

    # ถ้าจะเก็บเป็น Date ให้ใช้ date.today ไม่ใช่ datetime
    birth_date = Column(Date, nullable=True)

    # ✅ เพิ่มฟิลด์รูปโปรไฟล์
    profile_picture = Column(String(500), nullable=True, comment="URL รูปโปรไฟล์ของผู้ใช้")

    is_active = Column(Boolean, default=False)
    pending_email = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    role_id = Column(Integer, ForeignKey("roles.role_id"), nullable=False)
    role = relationship("Role", back_populates="users")
    cart = relationship("Cart", back_populates="user", uselist=False)
    # store_applications = relationship("StoreApplication", back_populates="users")
    tryon_images = relationship("UserTryOnImage", back_populates="user", cascade="all, delete-orphan")
    tryon_sessions = relationship("VTONSession", back_populates="user", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="user", cascade="all, delete-orphan")
    wishlists = relationship("Wishlist", back_populates="user", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="user", cascade="all, delete-orphan")
    shipping_addresses = relationship("ShippingAddress", back_populates="user", cascade="all, delete-orphan")
    uploaded_backgrounds = relationship("VTONBackground", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    # User — เพิ่ม cascade ใน backref หรือกำหนด relationship ใน User โดยตรง
    garment_images = relationship("GarmentImage", back_populates="user", cascade="all, delete-orphan")