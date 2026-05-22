# app/schemas/checkout.py
from datetime import datetime
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from uuid import UUID


class CheckoutItem(BaseModel):
    variant_id: UUID
    quantity: int = Field(gt=0)


class CheckoutType(str):
    CART = "CART"
    DIRECT = "DIRECT"


class CheckoutRequest(BaseModel):
    checkout_type: Literal["CART", "DIRECT"]
    cart_id: Optional[UUID] = None
    selected_cart_item_ids: Optional[List[UUID]] = None  # 👈 เพิ่มอันนี้
    items: Optional[List[CheckoutItem]] = None
    shipping_address_id: UUID

    class Config:
        schema_extra = {
            "examples": {
                "cart": {
                    "summary": "Checkout จากตะกร้า (หลายร้านได้)",
                    "value": {
                        "checkout_type": "CART",
                        "cart_id": "8f475b0b-b004-4e61-9c3e-8087c6ac9acb",
                        "shipping_address_id": "0f411608-0f19-4da7-a64a-127b67763dae"
                    }
                },
                "direct": {
                    "summary": "Checkout แบบซื้อเลย (DIRECT)",
                    "value": {
                        "checkout_type": "DIRECT",
                        "items": [
                            {
                                "variant_id": "f1323c22-6b24-4ac0-8265-e974b6649fdb",
                                "quantity": 1
                            }
                        ],
                        "shipping_address_id": "0f411608-0f19-4da7-a64a-127b67763dae"
                    }
                }
            }
        }


class CheckoutResponse(BaseModel):
    order_ids: List[UUID]
    stripe_session_id: str
    stripe_checkout_url: str
    expires_at: datetime

    class Config:
        orm_mode = True
