import enum
from sqlalchemy import Column, Integer, String, TEXT, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.db.database import Base
from app.utils.now_utc import now_utc
from sqlalchemy.dialects.postgresql import UUID
import uuid


class Review(Base):
    __tablename__ = "reviews"

    review_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.product_id", ondelete="SET NULL"), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    variant_id = Column(UUID(as_uuid=True), nullable=True)

    rating = Column(Integer, nullable=False)
    comment = Column(TEXT, nullable=True)
    created_at = Column(DateTime, default=now_utc)

    product = relationship("Product", back_populates="reviews")
    user = relationship("User", back_populates="reviews")
    images = relationship("ReviewImage", back_populates="review", cascade="all, delete-orphan")


class ReviewImage(Base):
    __tablename__ = "review_images"

    review_image_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    review_id = Column(UUID(as_uuid=True), ForeignKey("reviews.review_id"), nullable=False)
    image_url = Column(String, nullable=False)
    created_at = Column(DateTime, default=now_utc)

    review = relationship("Review", back_populates="images")