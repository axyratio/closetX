from pydantic import BaseModel
from typing import Optional

class VariantBase(BaseModel):
    color: Optional[str]
    size: Optional[str]
    sku: Optional[str]
    price: Optional[float]
    stock: Optional[int]
    is_active: Optional[bool]

class VariantCreate(VariantBase):
    pass

class VariantUpdate(VariantBase):
    pass
