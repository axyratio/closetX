# app/schemas/forgot_password.py
from pydantic import BaseModel, EmailStr, Field, validator
import re


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., max_length=100)

    @validator("email")
    def email_valid(cls, v):
        if "@" not in v:
            raise ValueError("อีเมลต้องมี @")
        if not re.match(r"[^@]+@[^@]+\.[^@]+", v):
            raise ValueError("รูปแบบอีเมลไม่ถูกต้อง")
        return v


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @validator("new_password")
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
            raise AssertionError("; ".join(errors))
        return v


class WishlistToggleRequest(BaseModel):
    product_id: str