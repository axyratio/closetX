# app/schemas/review.py
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class ReviewImageDto(BaseModel):
    """DTO สำหรับรูปภาพรีวิว"""
    image_id: str
    image_url: str
    display_order: int = 0

    class Config:
        from_attributes = True


class CreateReviewRequest(BaseModel):
    """Request สำหรับสร้างรีวิว"""
    productId: UUID = Field(..., description="Product ID")
    orderId: UUID = Field(..., description="Order ID")
    variantId: Optional[UUID] = Field(None, description="Variant ID (optional)")
    rating: int = Field(..., ge=1, le=5, description="Rating 1-5")
    comment: Optional[str] = Field(None, description="Review comment")
    imageUrls: Optional[List[str]] = Field(None, description="List of image URLs from upload")

    class Config:
        json_schema_extra = {
            "example": {
                "productId": "123e4567-e89b-12d3-a456-426614174000",
                "orderId": "123e4567-e89b-12d3-a456-426614174001",
                "variantId": "123e4567-e89b-12d3-a456-426614174002",
                "rating": 5,
                "comment": "สินค้าดีมาก ประทับใจ",
                "imageUrls": [
                    "app/uploads/review/images/abc123.jpg",
                    "app/uploads/review/images/def456.jpg"
                ]
            }
        }


class UpdateReviewRequest(BaseModel):
    """Request สำหรับแก้ไขรีวิว"""
    rating: Optional[int] = Field(None, ge=1, le=5, description="Rating 1-5")
    comment: Optional[str] = Field(None, description="Review comment")
    imageUrls: Optional[List[str]] = Field(None, description="List of image URLs")

    class Config:
        json_schema_extra = {
            "example": {
                "rating": 4,
                "comment": "แก้ไขคอมเมนต์",
                "imageUrls": ["app/uploads/review/images/new123.jpg"]
            }
        }


class ReviewResponse(BaseModel):
    """Response สำหรับรีวิว"""
    review_id: str
    product_id: str
    order_id: str
    variant_id: Optional[str] = None
    user_id: str
    user_display_name: str
    rating: int
    comment: Optional[str] = None
    variant_name: Optional[str] = None
    images: List[ReviewImageDto] = []
    created_at: str
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class UploadImageResponse(BaseModel):
    """Response สำหรับการอัปโหลดรูปภาพ"""
    image_id: str
    url: str

    class Config:
        json_schema_extra = {
            "example": {
                "image_id": "abc123def456",
                "url": "app/uploads/review/images/abc123def456.jpg"
            }
        }