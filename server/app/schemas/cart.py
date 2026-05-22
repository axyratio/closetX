# app/schemas/cart.py
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, UUID4


class StoreInfo(BaseModel):
    store_id: UUID4
    store_name: str
    

class CartItemOut(BaseModel):
    cart_item_id: UUID4
    product_id: UUID4
    variant_id: UUID4

    product_name: str
    variant_sku: Optional[str] = None
    variant_name: Optional[str] = None

    quantity: int
    price_at_addition: float
    subtotal: float

    image_url: Optional[str] = None

    store: StoreInfo
    stock_available: int

    class Config:
        orm_mode = True


class CartListResponse(BaseModel):
    cart_id: Optional[str] = None
    items: List[CartItemOut]


class CartItemDetailResponse(BaseModel):
    item: CartItemOut


class BatchDeleteIn(BaseModel):
    cart_item_ids: List[UUID4]


class CheckoutValidateIn(BaseModel):
    selected_cart_item_ids: List[UUID4]


class CheckoutItemStatus(BaseModel):
    cart_item_id: UUID4
    product_name: str
    variant_name: Optional[str]
    quantity: int

    price_at_addition: float
    current_price: float
    stock_available: int

    in_stock: bool
    price_changed: bool


class CheckoutValidationResult(BaseModel):
    is_valid: bool
    grand_total: float
    items: List[CheckoutItemStatus]


class UpdateCartItemQuantityIn(BaseModel):
    quantity: int  # จำนวนใหม่ที่อยากให้เป็น (>=1)


class CartItemQuantityOut(BaseModel):
    cart_item_id: UUID4
    quantity: int
    subtotal: float

    class Config:
        orm_mode = True