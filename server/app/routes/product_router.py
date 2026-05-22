# app/routers/product_router.py (เฉพาะส่วนที่เพิ่ม/แก้)
import os, json
from typing import List
from fastapi import APIRouter, Body, Form, File, UploadFile, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.authz import authenticate_token, authorize_role
from app.models.product import ProductImage, Product, ProductVariant, ImageType
from app.services.product_service import (
    create_product_with_variants_service,
    get_all_products_service,
    get_product_by_id_service,
    update_product_service,
    delete_product_service,
)
from app.utils.file_util import USE_CLOUDINARY
from app.utils.response_handler import error_response, success_response

router = APIRouter(prefix="/products", tags=["Product"])
UPLOAD_DIR = "app/uploads/product/images"


if not USE_CLOUDINARY:
    os.makedirs(UPLOAD_DIR, exist_ok=True)


# ---------- NEW: สร้างสินค้าพร้อม variant ทีเดียว ----------
@router.post("")
def create_product(
    data: dict = Body(...),
    db: Session = Depends(get_db),
    auth_user=Depends(authenticate_token()),
    auth_role=Depends(authorize_role(["user", "seller"])),
):
    print("body data of create", data)
    
    return create_product_with_variants_service(db, auth_user, data)


@router.get("/")
def get_all_products(db: Session = Depends(get_db)):
    return get_all_products_service(db)


@router.get("/{product_id}")
def get_product_by_id(product_id: str, db: Session = Depends(get_db)):
    return get_product_by_id_service(db, product_id)


@router.get("/{product_id}/variant")
def get_product_variant(
    product_id: str,
    db: Session = Depends(get_db),
    auth_user=Depends(authenticate_token()),
):
    try:
        product: Product = (
            db.query(Product)
            .filter(Product.product_id == product_id)
            .first()
        )
        if not product:
            return error_response("ไม่พบสินค้า", {}, 404)

        variants: list[ProductVariant] = product.variants

        options = []
        for v in variants:
            # หารูป NORMAL / VTON
            display_image = None
            tryon_image = None
            for img in v.images:
                if img.image_type == ImageType.NORMAL and display_image is None:
                    display_image = {
                        "image_id": str(img.image_id),
                        "url": img.image_url,
                    }
                elif img.image_type == ImageType.VTON and tryon_image is None:
                    tryon_image = {
                        "image_id": str(img.image_id),
                        "url": img.image_url,
                    }

            name = v.size or v.color or v.sku or "ตัวเลือก"
            base_price = product.base_price or 0
            price_delta = (v.price or 0)

            options.append(
                {
                    "variant_id": str(v.variant_id),
                    "name": name,
                    "price_delta": price_delta,
                    "stock": v.stock,
                    "display_image": display_image,
                    "tryon_image": tryon_image,
                }
            )

        enable_vton = any(opt.get("tryon_image") for opt in options)

        data = {
            "variant_name": getattr(product, "variant_name", None) or "ตัวเลือก",
            "enable_vton": enable_vton,
            "options": options,
        }
        return success_response("ดึงข้อมูลตัวเลือกสินค้าสำเร็จ", data)

    except Exception as e:
        return error_response("เกิดข้อผิดพลาดขณะดึงตัวเลือกสินค้า", {"error": str(e)}, 500)


# ---------- PATCH: อัปเดตสินค้า (รับ JSON ไม่ใช้ Form แล้ว) ----------
@router.patch("/{product_id}/update")
def update_product(
    product_id: str,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    auth_user=Depends(authenticate_token()),
    auth_role=Depends(authorize_role(["user", "seller"])),
):
    print("body data of update", data)
    return update_product_service(db, auth_user, product_id, data)


