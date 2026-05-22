# app/services/review_service.py
import os
import uuid
from typing import List, Optional
from uuid import UUID
from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.models.review import Review, ReviewImage
from app.models.product import Product
from app.models.order import Order
from app.models.user import User
from app.schemas.review import (
    CreateReviewRequest,
    UpdateReviewRequest,
    ReviewResponse,
    ReviewImageDto,
    UploadImageResponse
)
from app.utils.file_util import save_file, delete_file
from app.utils.now_utc import now_utc


class ReviewService:
    def __init__(self, db: Session):
        self.db = db
        self.review_image_dir = "app/uploads/review/images"

    def _get_review_response(self, review: Review) -> dict:
        """แปลง Review model เป็น dict response"""
        return {
            "review_id": str(review.review_id),
            "product_id": str(review.product_id),
            "order_id": str(review.order_id) if hasattr(review, 'order_id') else None,
            "variant_id": str(review.variant_id) if review.variant_id else None,
            "user_id": str(review.user_id),
            "user_display_name": review.user.username if review.user else "Unknown",
            "rating": review.rating,
            "comment": review.comment,
            "variant_name": None,  # TODO: เพิ่มถ้ามี variant relationship
            "images": [
                {
                    "image_id": str(img.review_image_id),
                    "image_url": img.image_url,
                    "display_order": 0  # TODO: เพิ่มถ้าต้องการ sorting
                }
                for img in review.images
            ] if review.images else [],
            "created_at": review.created_at.isoformat() if review.created_at else None,
            "updated_at": None  # TODO: เพิ่มถ้ามี updated_at field
        }

    def get_reviews_by_product(self, product_id: UUID) -> List[dict]:
        """ดึงรีวิวทั้งหมดของสินค้า"""
        reviews = (
            self.db.query(Review)
            .filter(Review.product_id == product_id)
            .order_by(Review.created_at.desc())
            .all()
        )
        
        review_ids = [r.review_id for r in reviews]
        images = (
            self.db.query(ReviewImage)
            .filter(ReviewImage.review_id.in_(review_ids))
            .all()
        )

        images_map = {}
        for img in images:
            rid = img.review_id
            if rid not in images_map:
                images_map[rid] = []
            images_map[rid].append(img)

        result = []
        for review in reviews:
            res = self._get_review_response(review)

            review_images = images_map.get(review.review_id, [])
            res["images"] = [
                {
                    "image_id": str(img.review_image_id),
                    "image_url": img.image_url,
                    "display_order": 0
                }
                for img in review_images
            ] if review_images else []

            result.append(res)

        return result

    def get_review_by_id(self, review_id: UUID) -> Optional[dict]:
        """ดึงรีวิวตาม ID"""
        review = self.db.query(Review).filter(Review.review_id == review_id).first()
        
        if not review:
            return None
        
        return self._get_review_response(review)

    def get_user_review_for_order(
        self,
        user_id: UUID,
        order_id: UUID,
        product_id: UUID
    ) -> Optional[dict]:
        """ดึงรีวิวของ user สำหรับ order และ product นั้นๆ"""
        # ตรวจสอบว่า Review model มี order_id field หรือไม่
        # ถ้าไม่มี ให้คอมเมนต์ส่วนนี้ออก
        review = (
            self.db.query(Review)
            .filter(
                Review.user_id == user_id,
                # Review.order_id == order_id,  # ถ้า model มี order_id
                Review.product_id == product_id
            )
            .first()
        )
        
        if not review:
            return None
        
        return self._get_review_response(review)

    def create_review(
        self,
        user_id: UUID,
        payload: CreateReviewRequest
    ) -> dict:
        """สร้างรีวิวใหม่"""
        # ตรวจสอบว่าสินค้ามีอยู่จริง
        product = self.db.query(Product).filter(
            Product.product_id == payload.productId
        ).first()
        
        if not product:
            raise ValueError("ไม่พบสินค้า")

        # ตรวจสอบว่า user ซื้อสินค้านี้จริง (ถ้าต้องการ)
        # TODO: เพิ่ม validation ตามต้องการ

        # ตรวจสอบว่าเคยรีวิวสินค้านี้แล้วหรือยัง
        existing_review = (
            self.db.query(Review)
            .filter(
                Review.user_id == user_id,
                Review.product_id == payload.productId
                # Review.order_id == payload.orderId  # ถ้า model มี order_id
            )
            .first()
        )
        
        if existing_review:
            raise ValueError("คุณได้รีวิวสินค้านี้แล้ว")

        # สร้างรีวิว
        new_review = Review(
            product_id=payload.productId,
            # order_id=payload.orderId,  # ถ้า model มี order_id
            user_id=user_id,
            rating=payload.rating,
            comment=payload.comment.strip() if payload.comment else None,
            variant_id=payload.variantId
        )
        
        self.db.add(new_review)
        self.db.flush()  # ได้ review_id

        # เพิ่มรูปภาพ (ถ้ามี)
        if payload.imageUrls:
            for image_url in payload.imageUrls:
                review_image = ReviewImage(
                    review_id=new_review.review_id,
                    image_url=image_url
                )
                self.db.add(review_image)

        self.db.commit()
        self.db.refresh(new_review)

        return self._get_review_response(new_review)

    def update_review(
        self,
        review_id: UUID,
        user_id: UUID,
        payload: UpdateReviewRequest
    ) -> dict:
        """แก้ไขรีวิว"""
        review = self.db.query(Review).filter(
            Review.review_id == review_id
        ).first()
        
        if not review:
            raise ValueError("ไม่พบรีวิว")
        
        # ตรวจสอบสิทธิ์
        if review.user_id != user_id:
            raise PermissionError("คุณไม่มีสิทธิ์แก้ไขรีวิวนี้")

        # อัปเดตข้อมูล
        if payload.rating is not None:
            review.rating = payload.rating
        
        if payload.comment is not None:
            review.comment = payload.comment.strip() if payload.comment else None

        # อัปเดตรูปภาพ (ถ้ามี)
        if payload.imageUrls is not None:
            # ลบรูปเก่าทั้งหมด
            old_images = self.db.query(ReviewImage).filter(
                ReviewImage.review_id == review_id
            ).all()
            
            for img in old_images:
                delete_file(img.image_url)
                self.db.delete(img)

            # เพิ่มรูปใหม่
            for image_url in payload.imageUrls:
                review_image = ReviewImage(
                    review_id=review.review_id,
                    image_url=image_url
                )
                self.db.add(review_image)

        self.db.commit()
        self.db.refresh(review)

        return self._get_review_response(review)

    def delete_review(self, review_id: UUID, user_id: UUID) -> None:
        """ลบรีวิว"""
        review = self.db.query(Review).filter(
            Review.review_id == review_id
        ).first()
        
        if not review:
            raise ValueError("ไม่พบรีวิว")
        
        # ตรวจสอบสิทธิ์
        if review.user_id != user_id:
            raise PermissionError("คุณไม่มีสิทธิ์ลบรีวิวนี้")

        # ลบรูปภาพทั้งหมดก่อน
        images = self.db.query(ReviewImage).filter(
            ReviewImage.review_id == review_id
        ).all()
        
        for img in images:
            delete_file(img.image_url)
            self.db.delete(img)

        # ลบรีวิว (cascade จะลบ ReviewImage อัตโนมัติ)
        self.db.delete(review)
        self.db.commit()

    def upload_review_image(self, file: UploadFile) -> dict:
        """
        อัปโหลดรูปภาพรีวิว (แยกจากการสร้างรีวิว)
        - ใช้ file_util ในการเก็บไฟล์ (รองรับทั้ง disk และ cloud)
        - ส่ง URL กลับไปให้ client เก็บไว้
        """
        # สร้างชื่อไฟล์ unique
        ext = os.path.splitext(file.filename)[1] or ".jpg"
        unique_filename = f"{uuid.uuid4().hex}{ext}"
        
        # บันทึกไฟล์ (ใช้ file_util ที่รองรับทั้ง disk และ cloud)
        file_path = save_file(
            upload_dir=self.review_image_dir,
            file=file,
            filename=unique_filename
        )
        
        return {
            "image_id": unique_filename.replace(ext, ""),
            "url": file_path
        }

    def delete_review_image(self, image_url: str, user_id: UUID) -> None:
        """
        ลบรูปภาพรีวิว
        - ตรวจสอบสิทธิ์ผู้ใช้
        - ลบไฟล์จาก cloud/disk
        - ลบข้อมูลจาก database
        """
        # หารูปภาพใน database
        review_image = self.db.query(ReviewImage).filter(
            ReviewImage.image_url == image_url
        ).first()
        
        if not review_image:
            raise ValueError("ไม่พบรูปภาพ")

        # ตรวจสอบสิทธิ์
        review = self.db.query(Review).filter(
            Review.review_id == review_image.review_id
        ).first()
        
        if not review or review.user_id != user_id:
            raise PermissionError("คุณไม่มีสิทธิ์ลบรูปภาพนี้")

        # ลบไฟล์จริง (ใช้ file_util ที่จะจัดการทั้ง disk และ cloud)
        delete_file(review_image.image_url)

        # ลบข้อมูลจาก database
        self.db.delete(review_image)
        self.db.commit()