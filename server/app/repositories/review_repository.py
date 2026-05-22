# app/repositories/review_repository.py
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session, joinedload

from app.models.review import Review, ReviewImage
from app.models.user import User


class ReviewRepository:
    """
    Repository สำหรับจัดการ Review และ ReviewImage
    (Optional - ใช้ถ้าต้องการแยก business logic ออกจาก service)
    """
    
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, review_id: UUID) -> Optional[Review]:
        """ดึงรีวิวตาม ID พร้อม eager load images และ user"""
        return (
            self.db.query(Review)
            .options(
                joinedload(Review.images),
                joinedload(Review.user)
            )
            .filter(Review.review_id == review_id)
            .first()
        )

    def get_by_product(self, product_id: UUID) -> List[Review]:
        """ดึงรีวิวทั้งหมดของสินค้า"""
        return (
            self.db.query(Review)
            .options(
                joinedload(Review.images),
                joinedload(Review.user)
            )
            .filter(Review.product_id == product_id)
            .order_by(Review.created_at.desc())
            .all()
        )

    def get_user_review_for_product(
        self,
        user_id: UUID,
        product_id: UUID,
        order_id: Optional[UUID] = None
    ) -> Optional[Review]:
        """ดึงรีวิวของ user สำหรับสินค้า (และ order ถ้ามี)"""
        query = (
            self.db.query(Review)
            .options(
                joinedload(Review.images),
                joinedload(Review.user)
            )
            .filter(
                Review.user_id == user_id,
                Review.product_id == product_id
            )
        )
        
        # ถ้า model มี order_id field
        # if order_id:
        #     query = query.filter(Review.order_id == order_id)
        
        return query.first()

    def create(self, review: Review) -> Review:
        """สร้างรีวิวใหม่"""
        self.db.add(review)
        self.db.flush()
        return review

    def update(self, review: Review) -> Review:
        """อัปเดตรีวิว"""
        self.db.flush()
        return review

    def delete(self, review: Review) -> None:
        """ลบรีวิว"""
        self.db.delete(review)

    def add_image(self, review_image: ReviewImage) -> ReviewImage:
        """เพิ่มรูปภาพรีวิว"""
        self.db.add(review_image)
        self.db.flush()
        return review_image

    def get_image_by_url(self, image_url: str) -> Optional[ReviewImage]:
        """ดึงรูปภาพตาม URL"""
        return (
            self.db.query(ReviewImage)
            .filter(ReviewImage.image_url == image_url)
            .first()
        )

    def get_images_by_review(self, review_id: UUID) -> List[ReviewImage]:
        """ดึงรูปภาพทั้งหมดของรีวิว"""
        return (
            self.db.query(ReviewImage)
            .filter(ReviewImage.review_id == review_id)
            .all()
        )

    def delete_image(self, review_image: ReviewImage) -> None:
        """ลบรูปภาพรีวิว"""
        self.db.delete(review_image)

    def delete_images_by_review(self, review_id: UUID) -> None:
        """ลบรูปภาพทั้งหมดของรีวิว"""
        images = self.get_images_by_review(review_id)
        for img in images:
            self.db.delete(img)

    def commit(self) -> None:
        """Commit transaction"""
        self.db.commit()

    def rollback(self) -> None:
        """Rollback transaction"""
        self.db.rollback()

    def refresh(self, instance) -> None:
        """Refresh instance"""
        self.db.refresh(instance)