# app/routes/wishlist_router.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.authz import authenticate_token
from app.models.user import User
from app.services.wishlist_service import WishlistService
from app.schemas.forgot_password import WishlistToggleRequest
from app.utils.response_handler import success_response, error_response

router = APIRouter(prefix="/wishlist", tags=["Wishlist"])


@router.post("/toggle")
def toggle_wishlist(
    payload: WishlistToggleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token()),
):
    """
    Toggle สินค้า: ถ้ามีอยู่ → ลบ, ถ้ายังไม่มี → เพิ่ม
    Response: { status: "added" | "removed" }
    """
    result = WishlistService.toggle_wishlist(
        db=db,
        user_id=current_user.user_id,
        product_id=payload.product_id,
    )

    if not result.get("success"):
        return error_response(result["message"])

    return success_response(result["message"], {"status": result["status"]})


@router.get("/me")
def get_my_wishlist(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token()),
):
    """
    ดึงรายการ wishlist ของ user
    """
    result = WishlistService.get_user_wishlist(
        db=db,
        user_id=current_user.user_id,
        limit=limit,
        offset=offset,
    )
    return success_response("ดึงรายการบันทึกสำเร็จ", result)


@router.get("/check/{product_id}")
def check_wishlist(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token()),
):
    """
    เช็คว่าสินค้านี้อยู่ใน wishlist หรือไม่
    """
    is_wishlisted = WishlistService.check_wishlist(
        db=db,
        user_id=current_user.user_id,
        product_id=product_id,
    )
    return success_response(
        "ตรวจสอบสำเร็จ",
        {"is_wishlisted": is_wishlisted}
    )