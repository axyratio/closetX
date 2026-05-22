# app/routes/review_router.py
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.db.database import get_db
from app.core.authz import authenticate_token
from app.models.user import User
from app.services.review_service import ReviewService
from app.schemas.review import (
    CreateReviewRequest,
    UpdateReviewRequest,
    ReviewResponse,
    UploadImageResponse
)
from app.utils.response_handler import success_response, error_response

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.get("/product/{product_id}", status_code=status.HTTP_200_OK)
async def get_reviews_by_product(
    product_id: UUID,
    db: Session = Depends(get_db),
):
    """
    ดึงรีวิวทั้งหมดของสินค้า
    """
    try:
        service = ReviewService(db)
        reviews = service.get_reviews_by_product(product_id)
        
        return success_response(
            message="ดึงรีวิวสำเร็จ",
            data={"reviews": reviews}
        )
    except Exception as e:
        return error_response(
            message=f"เกิดข้อผิดพลาด: {str(e)}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@router.get("/my-review", status_code=status.HTTP_200_OK)
async def get_my_review_for_order(
    orderId: UUID,
    productId: UUID,
    current_user: User = Depends(authenticate_token()),
    db: Session = Depends(get_db),
):
    """
    ดึงรีวิวของ user สำหรับ order และ product นั้นๆ
    """
    try:
        service = ReviewService(db)
        review = service.get_user_review_for_order(
            user_id=current_user.user_id,
            order_id=orderId,
            product_id=productId
        )
        
        if review:
            review["has_reviewed"] = True
        
        print(f"[REVIEW] res", review)
        
        return success_response(
            message="ดึงรีวิวสำเร็จ" if review else "ยังไม่มีรีวิว",
            data=review
        )
    except Exception as e:
        return error_response(
            message=f"เกิดข้อผิดพลาด: {str(e)}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@router.get("/{review_id}", status_code=status.HTTP_200_OK)
async def get_review_by_id(
    review_id: UUID,
    db: Session = Depends(get_db),
):
    """
    ดึงรีวิวตาม ID
    """
    try:
        service = ReviewService(db)
        review = service.get_review_by_id(review_id)
        
        if not review:
            return error_response(
                message="ไม่พบรีวิว",
                status_code=status.HTTP_404_NOT_FOUND
            )
        
        return success_response(
            message="ดึงรีวิวสำเร็จ",
            data=review
        )
    except Exception as e:
        return error_response(
            message=f"เกิดข้อผิดพลาด: {str(e)}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )



@router.post("/create", status_code=status.HTTP_201_CREATED)
async def create_review(
    payload: CreateReviewRequest,
    current_user: User = Depends(authenticate_token()),
    db: Session = Depends(get_db),
):
    """
    สร้างรีวิวใหม่
    """
    try:
        service = ReviewService(db)
        review = service.create_review(
            user_id=current_user.user_id,
            payload=payload
        )
        
        print(f"[Review] {payload}")
        
        return success_response(
            message="สร้างรีวิวสำเร็จ",
            data=review,
            status_code=status.HTTP_201_CREATED
        )
    except ValueError as e:
        return error_response(
            message=str(e),
            status_code=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return error_response(
            message=f"เกิดข้อผิดพลาด: {str(e)}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@router.patch("/{review_id}", status_code=status.HTTP_200_OK)
async def update_review(
    review_id: UUID,
    payload: UpdateReviewRequest,
    current_user: User = Depends(authenticate_token()),
    db: Session = Depends(get_db),
):
    """
    แก้ไขรีวิว
    """
    try:
        service = ReviewService(db)
        review = service.update_review(
            review_id=review_id,
            user_id=current_user.user_id,
            payload=payload
        )
        
        return success_response(
            message="แก้ไขรีวิวสำเร็จ",
            data=review
        )
    except PermissionError as e:
        return error_response(
            message=str(e),
            status_code=status.HTTP_403_FORBIDDEN
        )
    except ValueError as e:
        return error_response(
            message=str(e),
            status_code=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return error_response(
            message=f"เกิดข้อผิดพลาด: {str(e)}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@router.delete("/{review_id}", status_code=status.HTTP_200_OK)
async def delete_review(
    review_id: UUID,
    current_user: User = Depends(authenticate_token()),
    db: Session = Depends(get_db),
):
    """
    ลบรีวิว
    """
    try:
        service = ReviewService(db)
        service.delete_review(
            review_id=review_id,
            user_id=current_user.user_id
        )
        
        return success_response(
            message="ลบรีวิวสำเร็จ"
        )
    except PermissionError as e:
        return error_response(
            message=str(e),
            status_code=status.HTTP_403_FORBIDDEN
        )
    except ValueError as e:
        return error_response(
            message=str(e),
            status_code=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return error_response(
            message=f"เกิดข้อผิดพลาด: {str(e)}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@router.post("/images/upload", status_code=status.HTTP_201_CREATED)
async def upload_review_image(
    file: UploadFile = File(...),
    current_user: User = Depends(authenticate_token()),
    db: Session = Depends(get_db),
):
    """
    อัปโหลดรูปภาพสำหรับรีวิว (แยกจากการสร้างรีวิว)
    - รูปจะถูกเก็บบน cloud/disk ก่อน
    - ส่ง URL กลับไปให้ client เก็บไว้
    - เมื่อสร้างรีวิวจริง จะส่ง URL มาพร้อมกัน
    """
    try:
        # ตรวจสอบประเภทไฟล์
        if not file.content_type.startswith("image/"):
            return error_response(
                message="อนุญาตเฉพาะไฟล์รูปภาพเท่านั้น",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        service = ReviewService(db)
        result = service.upload_review_image(file)
        
        return success_response(
            message="อัปโหลดรูปภาพสำเร็จ",
            data=result,
            status_code=status.HTTP_201_CREATED
        )
    except Exception as e:
        return error_response(
            message=f"เกิดข้อผิดพลาด: {str(e)}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@router.delete("/images/{image_url:path}", status_code=status.HTTP_200_OK)
async def delete_review_image(
    image_url: str,
    current_user: User = Depends(authenticate_token()),
    db: Session = Depends(get_db),
):
    """
    ลบรูปภาพรีวิว (ทั้งจาก DB และ cloud/disk)
    - ใช้เมื่อผู้ใช้กดลบรูปจากหน้าบ้าน
    - จะลบทั้งไฟล์จริงและข้อมูลใน database
    """
    try:
        service = ReviewService(db)
        service.delete_review_image(
            image_url=image_url,
            user_id=current_user.user_id
        )
        
        return success_response(
            message="ลบรูปภาพสำเร็จ"
        )
    except PermissionError as e:
        return error_response(
            message=str(e),
            status_code=status.HTTP_403_FORBIDDEN
        )
    except ValueError as e:
        return error_response(
            message=str(e),
            status_code=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return error_response(
            message=f"เกิดข้อผิดพลาด: {str(e)}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )