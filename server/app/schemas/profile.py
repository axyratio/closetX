from pydantic import BaseModel, ConfigDict, Field, EmailStr
from typing import Optional
from datetime import date

class ResponseMyProfile(BaseModel):
    first_name: str
    last_name: str
    username: str
    email: str
    birth_date: Optional[date] = None
    phone_number: str
    user_role: Optional[str] = None
    profile_picture: Optional[str] = None  # ✅ เพิ่มรูปโปรไฟล์
    
    class Config:
        orm_mode = True

class ChangeProfile(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    username: Optional[str] = None
    birth_date: Optional[date] = None

    class Config:
        orm_mode = True

class ResponseChangeProfile(BaseModel):
    message: Optional[str] = None  # แก้ typo: messagae → message
    success: bool = True
    updated: Optional[dict] = None

    class Config:
        orm_mode = True

class DeleteProfile(BaseModel):
    password: str

class ResponseDeleteProfile(BaseModel):
    success: bool
    message: str
    deleted_user_id: str | None = None  # แก้เป็น str เพราะเป็น UUID
    
    class Config:
        orm_mode = True

class ChangePasswordRequest(BaseModel):
    old_password: str = Field(..., min_length=8)
    new_password: str = Field(..., min_length=8)

# ✅ เพิ่ม schema สำหรับเปลี่ยนอีเมล
class ChangeEmailRequest(BaseModel):
    """Request สำหรับเปลี่ยนอีเมล"""
    new_email: EmailStr = Field(..., description="อีเมลใหม่")
    password: str = Field(..., min_length=8, description="รหัสผ่านเพื่อยืนยันตัวตน")

class ChangeEmailResponse(BaseModel):
    """Response หลังเปลี่ยนอีเมลสำเร็จ"""
    success: bool
    message: str
    new_email: Optional[str] = None

# ✅ เพิ่ม schema สำหรับตรวจสอบ username ซ้ำ
class CheckUsernameRequest(BaseModel):
    """Request สำหรับตรวจสอบ username ซ้ำ"""
    username: str = Field(..., min_length=3, max_length=50)

class CheckUsernameResponse(BaseModel):
    """Response หลังตรวจสอบ username"""
    available: bool
    message: str

# ✅ เพิ่ม schema สำหรับอัปโหลดรูปโปรไฟล์
class UploadProfilePictureResponse(BaseModel):
    """Response หลังอัปโหลดรูปโปรไฟล์"""
    success: bool
    message: str
    profile_picture_url: Optional[str] = None

class DeleteProfilePictureResponse(BaseModel):
    """Response หลังลบรูปโปรไฟล์"""
    success: bool
    message: str