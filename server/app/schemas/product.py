from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
from typing import Optional

class ProductBase(BaseModel):
    product_name: Optional[str]
    base_price: Optional[float]
    category: Optional[str]
    description: Optional[str]
    is_active: Optional[bool]

class ProductCreate(ProductBase):
    pass

class ProductUpdate(ProductBase):
    pass

# app/schemas/product.py
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict

from app.models.product import ImageType

class ProductImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    image_id: UUID
    image_type: ImageType
    display_order: int
    is_main: bool


class VariantImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    image_id: UUID
    image_type: ImageType


class ProductVariantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    variant_id: UUID
    variant_name: str      # 👈 ชื่อที่ frontend จะใช้
    sku: str
    price: float
    stock: int
    images: List[VariantImageOut] = []   # ✅ ไม่มี name_option แล้ว


class StoreSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    store_id: UUID
    name: str
    description: Optional[str] = None
    logo_path: Optional[str] = None
    address: Optional[str] = None
    rating: Optional[float] = None


class ReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    review_id: UUID
    user_display_name: str
    rating: int
    comment: Optional[str] = None
    variant_name: Optional[str] = None
    created_at: datetime

class CartSummaryOut(BaseModel):
    total_items: int          # จำนวน item ทั้งหมดในตะกร้า user
    product_quantity: int     # จำนวนของสินค้าตัวนี้ในตะกร้า

class ProductDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    is_wishlisted: bool = False
    product_id: UUID
    product_name: str
    base_price: float
    original_price: Optional[float] = None
    discount_percent: Optional[int] = None
    description: Optional[str] = None
    category: Optional[str] = None
    average_rating: float
    review_count: int

    images: List[ProductImageOut]
    variants: List[ProductVariantOut]
    store: StoreSummaryOut

    best_review: Optional[ReviewOut] = None
    reviews: List[ReviewOut] = []

    cart_summary: Optional[CartSummaryOut] = None  # ✅ เพิ่มมา