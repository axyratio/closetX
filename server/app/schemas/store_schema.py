from pydantic import BaseModel
from typing import Optional
from uuid import UUID


# ✅ Base schema (ใช้สำหรับ Response)
class StoreBase(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    logo_path: Optional[str] = None


# ✅ Request สำหรับสร้างร้านใหม่
class StoreCreate(BaseModel):
    name: str
    description: Optional[str] = None
    address: Optional[str] = None
    logo_path: Optional[str] = None  # ✅ เพิ่ม default = None ป้องกัน error




# ✅ Request สำหรับอัปเดตร้าน
class StoreUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    logo_path: Optional[str] = None


# ✅ Response schema
class StoreResponse(StoreBase):
    store_id: UUID
    user_id: UUID

    class Config:
        orm_mode = True

class StoreCreateResponse(BaseModel):
    message: str
    data: StoreResponse
