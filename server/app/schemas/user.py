# app/schemas/user.py
from uuid import UUID
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date

from pydantic import BaseModel, EmailStr, Field, validator
import re

from pydantic import BaseModel, EmailStr, Field, validator
from typing import List
import re

class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=20)
    email: str = Field(..., max_length=50)
    password: str
    first_name: str = Field(..., min_length=3, max_length=100)
    last_name: str = Field(..., min_length=3, max_length=100)
    phone_number: str = Field(..., min_length=10, max_length=10)

    @validator("username")
    def username_alphanumeric(cls, v):
        if not v.isalnum():
            raise ValueError("ชื่อผู้ใช้ต้องเป็นตัวอักษรหรือตัวเลขเท่านั้น")
        return v

    @validator("first_name", "last_name")
    def name_must_be_letters(cls, v):
        if not v.isalpha():
            raise ValueError("ชื่อและนามสกุลต้องเป็นตัวอักษรเท่านั้น")
        return v

    @validator("phone_number")
    def phone_number_must_be_digits(cls, v):
        if not v.isdigit():
            raise ValueError("เบอร์โทรศัพท์ต้องเป็นตัวเลขเท่านั้น")
        return v

    @validator("email")
    def email_valid(cls, v):
        # ตัวอย่างตรวจว่า email มี @ และ domain
        if "@" not in v:
            raise ValueError("อีเมลต้องมี @")
        # ตรวจ domain แบบง่าย (ตัวอย่าง)
        if not re.match(r"[^@]+@[^@]+\.[^@]+", v):
            raise ValueError("Email ต้องเป็นรูปแบบมาตรฐาน เช่น user@example.com")
        return v

    @validator("password")
    def password_strong(cls, v):
        errors = []
        if len(v) < 8 or len(v) > 20:
            errors.append("รหัสผ่านต้องมีความยาว 8 - 20 ตัวอักษร")
        if not re.search(r"[A-Z]", v):
            errors.append("ต้องมีตัวพิมพ์ใหญ่")
        if not re.search(r"[a-z]", v):
            errors.append("ต้องมีตัวพิมพ์เล็ก")
        if not re.search(r"\d", v):
            errors.append("ต้องมีตัวเลข")
        if not re.search(r"[!@#$%^&*]", v):
            errors.append("ต้องมีอักขระพิเศษ !@#$%^&*")
        if errors:
            raise AssertionError("; ".join(errors))  # 🚀 ไม่ติด prefix value_error
        return v



class UserResponseRegister(BaseModel):
    message: str
    username: str

class ErrorResponseRegister(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    message: Optional[str] = None

    class Config:
        orm_mode = True

class UserLogin(BaseModel):
    identity: str  # Username or Email
    password: str


class UserResponseLogin(BaseModel):
    message: str
    username: str
    access_token: str
    token_type: str = "bearer"
    user_role: str

    class Config:
        orm_mode = True

class ErrorResponseLogin(BaseModel):
    
    identity: Optional[str] = None  # Username or Email
    password: Optional[str] = None

    class Config:
        orm_mode = True










