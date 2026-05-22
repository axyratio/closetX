# app/schemas/shipping_address.py
from pydantic import BaseModel
from typing import Optional
import uuid


class ShippingAddressBase(BaseModel):
    full_name: str
    phone_number: str
    address_line: str
    sub_district: Optional[str] = None
    district: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    is_default: Optional[bool] = False


class ShippingAddressCreate(ShippingAddressBase):
    pass


class ShippingAddressUpdate(ShippingAddressBase):
    # ถ้าอยากให้ update เป็น partial:
    # full_name: Optional[str] = None
    # ...
    # แต่ตอนนี้เอาแบบ required ทั้งก้อนตามโค้ดมึงก่อน
    pass


class ShippingAddressResponse(ShippingAddressBase):
    ship_addr_id: uuid.UUID
    user_id: uuid.UUID

    class Config:
        orm_mode = True
