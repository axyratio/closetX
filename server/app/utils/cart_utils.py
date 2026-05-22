# app/utils/cart_utils.py
from typing import Optional
from app.models.cart import CartItem
from app.models.product import ProductImage


def pick_main_image(images: list[ProductImage]) -> Optional[str]:
    """
    เลือกรูปภาพหลักของ variant / product
    - ถ้ามี is_main = True ใช้อันนั้น
    - ถ้าไม่มี ใช้อันแรก
    """
    if not images:
        return None

    for img in images:
        if getattr(img, "is_main", False):
            return img.image_url

    return images[0].image_url
