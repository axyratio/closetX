# app/services/product_variant_service.py
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from app.models.product import (
    Product,
    ProductVariant,
    ProductImage,
    ImageType,
)
from app.repositories import product_variant_repository
from app.utils.response_handler import success_response, error_response


def build_variant_response_for_product(db: Session, product: Product):
    variants = product.variants

    options = []
    for v in variants:
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

        options.append(
            {
                "variant_id": str(v.variant_id),
                "name": name,
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
    return data


def get_variant_for_product_service(db: Session, product: Product):
    try:
        data = build_variant_response_for_product(db, product)
        return success_response("ดึงข้อมูลตัวเลือกสินค้าสำเร็จ", data)
    except Exception as e:
        return error_response("เกิดข้อผิดพลาดขณะดึงตัวเลือกสินค้า", {"error": str(e)}, 500)
