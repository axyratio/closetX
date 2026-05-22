# app/utils/shipping_fee.py
"""
คำนวณค่าจัดส่งตามน้ำหนักสินค้า (กรัม)

ตารางค่าส่ง:
| น้ำหนัก (กรัม)      | ค่าส่ง (บาท) |
|----------------------|--------------|
| 0 – 500              | 38           |
| 501 – 1,000          | 50           |
| 1,001 – 2,000        | 60           |
| 2,001 – 5,000        | 80           |
| 5,001 – 10,000       | 120          |
| 10,001 ขึ้นไป        | 160          |
"""

from typing import NamedTuple


class ShippingTier(NamedTuple):
    max_grams: int    # น้ำหนักสูงสุด (inclusive); -1 = ไม่มีขีดจำกัด
    fee: float        # ค่าส่ง (บาท)


# ตารางค่าส่ง – เรียงจากน้อยไปมาก
SHIPPING_TIERS: list[ShippingTier] = [
    ShippingTier(max_grams=500,    fee=38),
    ShippingTier(max_grams=1000,   fee=50),
    ShippingTier(max_grams=2000,   fee=60),
    ShippingTier(max_grams=5000,   fee=80),
    ShippingTier(max_grams=10000,  fee=120),
    ShippingTier(max_grams=-1,     fee=160),   # 10,001 ขึ้นไป
]


def calculate_shipping_fee(total_weight_grams: int) -> float:
    """
    คำนวณค่าส่งจากน้ำหนักรวม (กรัม)

    Args:
        total_weight_grams: น้ำหนักรวมทุกชิ้นในออเดอร์เดียว (กรัม)

    Returns:
        ค่าส่ง (บาท)

    Examples:
        >>> calculate_shipping_fee(300)   # → 38
        >>> calculate_shipping_fee(750)   # → 50
        >>> calculate_shipping_fee(15000) # → 160
    """
    if total_weight_grams <= 0:
        return SHIPPING_TIERS[0].fee

    for tier in SHIPPING_TIERS:
        if tier.max_grams == -1 or total_weight_grams <= tier.max_grams:
            return tier.fee

    # fallback (ไม่ควรถึงตรงนี้)
    return SHIPPING_TIERS[-1].fee


def get_shipping_tiers_info() -> list[dict]:
    """
    ส่งข้อมูลตาราง tier ทั้งหมด ใช้สำหรับ frontend แสดงผล
    """
    result = []
    prev_max = 0
    for tier in SHIPPING_TIERS:
        if tier.max_grams == -1:
            label = f"{prev_max + 1} กรัม ขึ้นไป"
        else:
            label = f"{prev_max + 1} – {tier.max_grams} กรัม"
        result.append({
            "label": label,
            "max_grams": tier.max_grams,
            "fee": tier.fee,
        })
        prev_max = tier.max_grams if tier.max_grams != -1 else prev_max
    return result