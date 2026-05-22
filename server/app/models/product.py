import enum
from app.db.database import Base
from sqlalchemy import Column, Float, Integer, String, TEXT, ForeignKey, Boolean, Date, DateTime
from sqlalchemy.orm import relationship
from app.utils.now_utc import now_utc
from sqlalchemy.dialects.postgresql import UUID
import uuid
from sqlalchemy import Enum


from sqlalchemy import ForeignKey

# แก้ไข Product class - เปลี่ยนจาก String เป็น UUID
class Product(Base):
    __tablename__ = 'products'
    product_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_id = Column(
        UUID(as_uuid=True),
        ForeignKey("stores.store_id", ondelete="CASCADE"),
        nullable=False
    )
    
    # ✅ เปลี่ยนเป็น Foreign Key
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.category_id"))
    
    # เก็บ category แบบเก่าไว้ก่อน สำหรับ backward compatibility
    category = Column(String, nullable=True)
    
    variant_name = Column(String(50), nullable=True) #ไม่ได้เก็บนะ
    product_name = Column(String, nullable=False)
    base_price = Column(Float, nullable=False)
    description = Column(TEXT, nullable=True)
    is_active = Column(Boolean, default=True)
    is_draft = Column(Boolean, default=True)
    average_rating = Column(Float, nullable=True, default=0.0)
    closed_by = Column(String(20), nullable=True)
    
    deleted_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    created_at = Column(DateTime, default=now_utc)
    updated_at = Column(DateTime, default=now_utc, onupdate=now_utc)

    # Relationships
    images = relationship(
        "ProductImage",
        primaryjoin="and_(Product.product_id == ProductImage.product_id, "
                    "ProductImage.variant_id == None)",
        lazy="joined",
        cascade="all, delete-orphan",
        back_populates="product"
    )
    store = relationship("Store", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")
    tryon_sessions = relationship("VTONSession", back_populates="product", cascade="all, delete-orphan")
    wishlists = relationship("Wishlist", back_populates="product", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="product", cascade="all, delete-orphan")
    
    # ✅ เพิ่ม relationship กับ Category
    category_rel = relationship("Category", back_populates="products")



class ProductVariant(Base):
    __tablename__ = "product_variants"

    variant_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # ✅ เพิ่ม ondelete="CASCADE": ลบ product → variant ถูกลบตามใน DB ด้วย
    # (SQLAlchemy relationship มี cascade="all, delete-orphan" อยู่แล้ว
    #  แต่ ondelete="CASCADE" จำเป็นสำหรับ DB-level constraint เช่น migration SQL ตรงๆ)
    product_id = Column(
        UUID(as_uuid=True),
        ForeignKey("products.product_id", ondelete="CASCADE"),
        nullable=False
    )

    color = Column(String(50), nullable=True)   # เช่น "ดำ", "ขาว"
    size = Column(String(20), nullable=True)    # เช่น "S", "M", "L"
    name_option = Column(String(100), nullable=False)
    sku = Column(String(100), nullable=False)
    price = Column(Float, nullable=False)
    stock = Column(Integer, default=0)
    weight_grams = Column(Integer, nullable=True, default=500)
    is_active = Column(Boolean, default=True)
    # ควรจะมี variant name หรือ variant option เพื่อบอกว่ามันคือ ไซส์หรือสีแทนที่จะเป็น color กับ size นะ

    images = relationship(
        "ProductImage",
        primaryjoin="ProductVariant.variant_id == ProductImage.variant_id",
        lazy="joined",
        cascade="all, delete-orphan",
        back_populates="variant"
    )
    product = relationship("Product", back_populates="variants")
    tryon_sessions = relationship("VTONSession", back_populates="variant", cascade="all, delete-orphan")

# ─────────────────────────────
# ENUM: ประเภทของภาพสินค้า
# ─────────────────────────────
class ImageType(enum.Enum):
    NORMAL = "NORMAL"
    VTON = "VTON"


# ─────────────────────────────
# ตารางหลัก: สินค้า
# ─────────────────────────────
# class Product(Base):
#     __tablename__ = "products"

#     product_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
#     store_id = Column(UUID(as_uuid=True), ForeignKey("stores.store_id"), nullable=False)

#     name = Column(String(200), nullable=False)
#     description = Column(TEXT, nullable=True)
#     category = Column(String(100), nullable=True)
#     price = Column(Float, nullable=False)
#     stock = Column(Integer, nullable=False, default=0)
#     is_active = Column(Boolean, default=True)



# # ─────────────────────────────
# # ตารางเก็บรูปภาพสินค้า
# # ─────────────────────────────
class ProductImage(Base):
    __tablename__ = "product_images"

    image_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("products.product_id", ondelete="CASCADE"), # เพิ่มตรงนี้
        nullable=True
    )

    # ✅ เพิ่ม ondelete="CASCADE": ลบ variant → รูปของ variant ถูกลบตามใน DB ด้วย
    # variant image ไม่มีความหมายถ้า variant หายไปแล้ว
    variant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("product_variants.variant_id", ondelete="CASCADE"),
        nullable=True
    )

    image_url = Column(String(255), nullable=False)   # URL ของรูปภาพ
    image_type = Column(Enum(ImageType, name="image_type_enum"), nullable=False, default=ImageType.NORMAL)
    display_order = Column(Integer, default=0)        # ลำดับการแสดงผล (สำหรับ gallery)

    uploaded_at = Column(DateTime, default=now_utc)
    is_main = Column(Boolean, default=False)          # ใช้ระบุว่าเป็นรูปหลักไหม

    product = relationship("Product", back_populates="images")
    variant = relationship("ProductVariant", back_populates="images")
    vton_meta = relationship("VTONMeta", back_populates="image", uselist=False, cascade="all, delete-orphan")
    


# ─────────────────────────────
# ตารางเสริม: metadata ของ VTON
# ─────────────────────────────
class VTONMeta(Base):
    __tablename__ = "vton_metadata"

    vton_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    image_id = Column(UUID(as_uuid=True), ForeignKey("product_images.image_id"), nullable=False, unique=True) #id สินค้าของ Product เพื่อ query

    pose_angle = Column(String(50), nullable=True)       # มุมถ่ายภาพ เช่น 'front', 'side'
    clothing_type = Column(String(50), nullable=True)    # ประเภทเสื้อผ้า เช่น 'tshirt', 'dress'
    segmentation_mask_url = Column(String(255), nullable=True)  # ไฟล์ mask สำหรับ AI
    model_used = Column(String(100), nullable=True)      # เช่น 'TryOn-GAN', 'VTON-HD'

    created_at = Column(DateTime, default=now_utc)

    image = relationship("ProductImage", back_populates="vton_meta")
    


class UserTryOnImage(Base):
    __tablename__ = "user_tryon_images"

    user_image_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)

    image_url = Column(String(255), nullable=False)  # path ของรูปผู้ใช้ที่อัปโหลด
    uploaded_at = Column(DateTime, default=now_utc)
    is_valid = Column(Boolean, default=True)         # true = ใช้งานได้ (ผ่านตรวจสอบ AI)

    user = relationship("User", back_populates="tryon_images")
    sessions = relationship("VTONSession", back_populates="user_image")


class VTONSession(Base):
    __tablename__ = "vton_sessions"

    session_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    
    # 🔗 เชื่อมกับสินค้า: ลบสินค้า/Variant -> ลบ Session นี้ทิ้งทันที (CASCADE)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.product_id", ondelete="CASCADE"), nullable=True)
    variant_id = Column(UUID(as_uuid=True), ForeignKey("product_variants.variant_id", ondelete="CASCADE"), nullable=True)

    # 🔗 เชื่อมกับรูปคน/ชุด/พื้นหลัง: ลบตัวแม่ -> Session ยังอยู่แต่เปลี่ยน ID เป็น NULL (SET NULL)
    user_image_id = Column(UUID(as_uuid=True), ForeignKey("user_tryon_images.user_image_id", ondelete="SET NULL"), nullable=True)
    garment_id = Column(UUID(as_uuid=True), ForeignKey("garment_images.garment_id", ondelete="SET NULL"), nullable=True)
    background_id = Column(UUID(as_uuid=True), ForeignKey("vton_backgrounds.background_id", ondelete="SET NULL"), nullable=True)

    result_image_url = Column(String(255), nullable=True)
    model_used = Column(String(100), nullable=True)
    generated_at = Column(DateTime, default=now_utc)

    # Relationships
    user = relationship("User", back_populates="tryon_sessions")
    product = relationship("Product", back_populates="tryon_sessions")
    variant = relationship("ProductVariant", back_populates="tryon_sessions")
    user_image = relationship("UserTryOnImage", back_populates="sessions")
    garment = relationship("GarmentImage", back_populates="vton_sessions")
    background = relationship("VTONBackground", back_populates="sessions")
    # reviews = relationship("Review", back_populates="product", cascade="all, delete-orphan")