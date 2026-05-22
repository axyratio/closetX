# app/api/cart.py
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.authz import authenticate_token
from app.models.user import User
from app.repositories import cart_repository
from app.utils.response_handler import success_response, error_response

router = APIRouter(prefix="/cart", tags=["cart"])


class AddToCartIn(BaseModel):
    product_id: str
    variant_id: str  # ❗ ตรงกับ model ที่ variant_id nullable=False
    quantity: int = 1


@router.post("/items")
def add_to_cart_api(
    payload: AddToCartIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token()),
):
    try:
        cart_item = cart_repository.add_to_cart(
            db=db,
            user_id=current_user.user_id,
            product_id=payload.product_id,
            variant_id=payload.variant_id,
            quantity=payload.quantity,
        )
        db.commit()
        return success_response("เพิ่มสินค้าลงตะกร้าแล้ว", 
                                {
                "cart_item_id": str(cart_item.cart_item_id),
                "quantity": cart_item.quantity,  # แถมให้รู้ว่า merge แล้วเหลือเท่าไหร่
            },)
    except Exception as e:
        db.rollback()
        print("add_to_cart_api error:", e)
        return error_response(
            "ไม่สามารถเพิ่มสินค้าลงตะกร้า",
            {"error": str(e)},
            status_code=500,
        )


@router.get("/summary")
def cart_summary_api(
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token()),
):
    try:
        count = cart_repository.get_total_items(db, user_id=current_user.user_id)
        return success_response("cart summary", {"item_count": count})
    except Exception as e:
        print("cart_summary_api error:", e)
        return error_response(
            "ไม่สามารถโหลดข้อมูลตะกร้า",
            {"error": str(e)},
            status_code=500,
        )


# app/api/cart_items.py
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import UUID4

from app.db.database import get_db
from app.core.authz import authenticate_token
from app.models.user import User
from app.schemas.cart import (
    CartListResponse,
    CartItemDetailResponse,
    BatchDeleteIn,
    UpdateCartItemQuantityIn,
)
from app.services import cart_service
from app.utils.response_handler import success_response, error_response

# router = APIRouter(prefix="/cart", tags=["cart"])


@router.get("/items/full")
def get_cart_items_api(
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token()),
):
    """
    Get All cart items (ของ user ปัจจุบัน) + store info
    """
    try:
        cart_dto: CartListResponse = cart_service.get_cart_for_user(
            db, current_user.user_id
        )
        return success_response("โหลดรายการตะกร้าสำเร็จ", cart_dto.dict())
    except Exception as e:
        print("get_cart_items_api error:", e)
        return error_response(
            "ไม่สามารถโหลดรายการตะกร้า",
            {"error": str(e)},
            status_code=500,
        )


@router.get("/items/{cart_item_id}")
def get_cart_item_by_id_api(
    cart_item_id: UUID4,
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token()),
):
    """
    Get by id (ของ user ปัจจุบัน)
    """
    try:
        item_dto = cart_service.get_cart_item_detail(
            db, current_user.user_id, UUID(str(cart_item_id))
        )
        if not item_dto:
            return error_response("ไม่พบรายการในตะกร้า", {}, status_code=404)
        return success_response(
            "โหลดข้อมูลรายการตะกร้าสำเร็จ",
            CartItemDetailResponse(item=item_dto).dict(),
        )
    except Exception as e:
        print("get_cart_item_by_id_api error:", e)
        return error_response(
            "ไม่สามารถโหลดข้อมูลรายการตะกร้า",
            {"error": str(e)},
            status_code=500,
        )


@router.delete("/items")
def delete_cart_items_api(
    payload: BatchDeleteIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token()),
):
    """
    Batch Delete cart_items
    body:
    {
        "cart_item_ids": ["uuid-1", "uuid-2"]
    }
    """
    try:
        if not payload.cart_item_ids:
            return error_response("กรุณาเลือกรายการที่จะลบ", {}, status_code=400)

        ids = [UUID(str(x)) for x in payload.cart_item_ids]
        deleted = cart_service.delete_cart_items_for_user(
            db, current_user.user_id, ids
        )
        db.commit()
        return success_response(
            "ลบรายการตะกร้าแล้ว",
            {"deleted_count": deleted},
        )
    except Exception as e:
        db.rollback()
        print("delete_cart_items_api error:", e)
        return error_response(
            "ไม่สามารถลบรายการตะกร้า",
            {"error": str(e)},
            status_code=500,
        )

@router.patch("/items/{cart_item_id}/quantity")
def update_cart_item_quantity_api(
    cart_item_id: UUID4,
    payload: UpdateCartItemQuantityIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token()),
):
    """
    อัปเดตจำนวนของ cart item หนึ่งตัว
    body:
    {
      "quantity": 3
    }
    """
    try:
        if payload.quantity <= 0:
            return error_response("จำนวนต้องมากกว่า 0", {}, status_code=400)

        updated = cart_service.update_cart_item_quantity(
            db=db,
            user_id=current_user.user_id,
            cart_item_id=UUID(str(cart_item_id)),
            new_quantity=payload.quantity,
        )
        db.commit()

        return success_response(
            "อัปเดตจำนวนสินค้าในตะกร้าแล้ว",
            updated.dict(),
        )
    except ValueError as ve:
        db.rollback()
        return error_response(str(ve), {}, status_code=400)
    except Exception as e:
        db.rollback()
        print("update_cart_item_quantity_api error:", e)
        return error_response(
            "ไม่สามารถอัปเดตจำนวนสินค้าในตะกร้า",
            {"error": str(e)},
            status_code=500,
        )