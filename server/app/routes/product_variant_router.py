# app/routers/product_variant_router.py
from fastapi import APIRouter, Body, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.authz import authenticate_token
from app.models.product import Product
from app.services.product_variant_service import get_variant_for_product_service
from app.utils.response_handler import error_response

router = APIRouter(prefix="/products", tags=["Product Variant"])



@router.get("/{product_id}/variant")
def get_product_variant(
    product_id: str,
    db: Session = Depends(get_db),
    auth_user=Depends(authenticate_token()),
):
    product: Product | None = (
        db.query(Product).filter(Product.product_id == product_id).first()
    )
    if not product:
        return error_response("ไม่พบสินค้า", {}, 404)

    return get_variant_for_product_service(db, product)

# app/routers/product_router.py (เฉพาะส่วนที่เกี่ยว)

