# app/schemas/user_management.py
"""
Schemas สำหรับระบบจัดการผู้ใช้ (Admin)
"""
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID


# ==================== Request Schemas ====================

class UserFilterParams(BaseModel):
    """Query parameters สำหรับค้นหาผู้ใช้"""
    search: Optional[str] = Field(None, description="ค้นหาจาก username, email, ชื่อ")
    role: Optional[str] = Field(None, description="กรองตาม role (user, admin)")
    is_active: Optional[bool] = Field(None, description="กรองตามสถานะ active")
    skip: int = Field(0, ge=0, description="จำนวนที่ข้าม (pagination)")
    limit: int = Field(20, ge=1, le=100, description="จำนวนต่อหน้า")


class UpdateUserByAdmin(BaseModel):
    """แก้ไขข้อมูลผู้ใช้โดย Admin"""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = Field(None, min_length=10, max_length=15)
    gender: Optional[str] = Field(None, description="male/female/other")
    birth_date: Optional[date] = None
    
    @validator('gender')
    def validate_gender(cls, v):
        if v and v not in ['male', 'female', 'other']:
            raise ValueError('gender ต้องเป็น male, female, หรือ other')
        return v


class ToggleUserStatus(BaseModel):
    """เปิด/ปิดการใช้งานบัญชี"""
    is_active: bool = Field(..., description="true = เปิดใช้งาน, false = ระงับบัญชี")


class ChangeUserRole(BaseModel):
    """เปลี่ยน role ผู้ใช้"""
    role_name: str = Field(..., description="user หรือ admin")
    
    @validator('role_name')
    def validate_role(cls, v):
        if v not in ['user', 'admin']:
            raise ValueError('role_name ต้องเป็น user หรือ admin')
        return v.lower()


# ==================== Response Schemas ====================

class UserListItem(BaseModel):
    """ข้อมูลผู้ใช้ในรายการ (สำหรับแสดงในตาราง)"""
    user_id: UUID
    username: str
    email: str
    first_name: str
    last_name: str
    phone_number: str
    is_active: bool
    role_name: str
    created_at: datetime
    
    # สถิติเพิ่มเติม
    total_orders: Optional[int] = 0
    has_store: Optional[bool] = False
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None,
        }


class UserDetailResponse(BaseModel):
    """ข้อมูลผู้ใช้แบบละเอียด"""
    user_id: UUID
    username: str
    email: str
    first_name: str
    last_name: str
    phone_number: str
    gender: Optional[str]
    birth_date: Optional[date]
    is_active: bool
    pending_email: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    
    # ข้อมูล role
    role: dict = Field(
        ...,
        description="{'role_id': int, 'role_name': str}"
    )
    
    # สถิติ
    statistics: dict = Field(
        default_factory=dict,
        description="{total_orders, total_reviews, total_spent, has_store}"
    )
    
    # ร้านค้า (ถ้ามี)
    store: Optional[dict] = Field(
        None,
        description="{store_id, name, is_active, ...}"
    )
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None,
            date: lambda v: v.isoformat() if v else None,
        }


class UserOrderItem(BaseModel):
    """รายการสั่งซื้อของผู้ใช้"""
    order_id: UUID
    order_status: str
    order_text_status: str
    total_price: float
    created_at: datetime
    paid_at: Optional[datetime]
    
    # ชื่อร้านค้า
    store_name: Optional[str]
    
    # จำนวนสินค้า
    item_count: int
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None,
        }


class UserReviewItem(BaseModel):
    """รีวิวของผู้ใช้"""
    review_id: UUID
    product_id: UUID
    product_name: str
    rating: int
    comment: Optional[str]
    created_at: datetime
    
    # รูปภาพรีวิว
    images: List[str] = []
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None,
        }


class UserListResponse(BaseModel):
    """Response สำหรับรายการผู้ใช้"""
    users: List[UserListItem]
    total: int
    skip: int
    limit: int


class UserStatisticsResponse(BaseModel):
    """สถิติผู้ใช้ทั้งหมด"""
    total_users: int
    active_users: int
    inactive_users: int
    total_admins: int
    total_sellers: int
    new_users_this_month: int
    
    # แยกตาม role
    users_by_role: dict = Field(
        default_factory=dict,
        description="{'user': count, 'admin': count}"
    )


# ==================== Generic Response ====================

class SuccessResponse(BaseModel):
    """Response สำเร็จ"""
    success: bool = True
    message: str
    data: Optional[dict] = None


class ErrorResponse(BaseModel):
    """Response ผิดพลาด"""
    success: bool = False
    message: str
    error: Optional[str] = None
    data: Optional[dict] = None