
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import UUID4

from app.db.database import get_db
from app.core.authz import authenticate_token
from app.models.user import User
from app.schemas.cart import CheckoutValidateIn
from app.services import cart_service
from app.utils.response_handler import success_response, error_response

router = APIRouter(prefix="/checkout", tags=["checkout"])


@router.post("/validate")
def validate_checkout_api(
    payload: CheckoutValidateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token()),
):
    """
    ตรวจสอบเฉพาะรายการ cart_item_id ที่ถูกเลือก
    - stock
    - price change
    """
    try:
        if not payload.selected_cart_item_ids:
            return error_response("กรุณาเลือกสินค้าก่อนชำระเงิน", {}, status_code=400)

        ids = [UUID(str(x)) for x in payload.selected_cart_item_ids]
        result = cart_service.validate_checkout(db, current_user.user_id, ids)

        print("========================")
        print("ids:", ids)
        print("result:", result)
        print("========================")
        # ไม่ commit อะไรที่นี่ แค่ตรวจสอบ
        msg = (
            "ตะกร้าพร้อมชำระเงิน"
            if result.is_valid
            else "ตรวจสอบตะกร้าแล้วพบปัญหาบางรายการ"
        )
        return success_response(msg, result.dict())
    except Exception as e:
        print("validate_checkout_api error:", e)
        return error_response(
            "ไม่สามารถตรวจสอบตะกร้า",
            {"error": str(e)},
            status_code=500,
        )
    

