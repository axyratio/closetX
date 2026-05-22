# app/services/forgot_password_service.py
import uuid
from datetime import timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.user import User
from app.models.password_reset_token import PasswordResetToken
from app.core.security import hash_password
from app.core.config import settings
from app.utils.now_utc import now_utc
from app.services.email_service import send_password_reset_email


# ─── Rate Limit Config ───
MAX_REQUESTS_PER_HOUR = 3
TOKEN_EXPIRE_MINUTES = 30


def request_password_reset(db: Session, email: str) -> dict:
    """
    ขอ reset link
    1. ตรวจ email ว่ามีจริง
    2. Rate limit 3 ครั้ง/ชม.
    3. สร้าง token UUID v4 + expire 30 นาที
    4. ส่งอีเมลจริง
    """
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # ตอบ success เสมอเพื่อกัน email enumeration
        return {
            "success": True,
            "message": "หากอีเมลนี้มีอยู่ในระบบ เราจะส่งลิงก์รีเซ็ตรหัสผ่านให้"
        }

    # Rate limit: นับ token ที่สร้างภายใน 1 ชม.
    one_hour_ago = now_utc() - timedelta(hours=0)
    recent_count = db.query(func.count(PasswordResetToken.token_id)).filter(
        PasswordResetToken.user_id == user.user_id,
        PasswordResetToken.created_at >= one_hour_ago
    ).scalar() or 0

    if recent_count >= MAX_REQUESTS_PER_HOUR:
        return {
            "success": False,
            "message": "คุณขอรีเซ็ตรหัสผ่านเกินจำนวน กรุณารอ 1 ชั่วโมง"
        }

    # สร้าง token
    reset_token = str(uuid.uuid4())
    expires_at = now_utc() + timedelta(minutes=TOKEN_EXPIRE_MINUTES)

    token_record = PasswordResetToken(
        user_id=user.user_id,
        token=reset_token,
        is_used=False,
        expires_at=expires_at
    )
    db.add(token_record)
    db.commit()

    # สร้าง reset URL
    reset_url = f"{settings.BASE_URL}/auth/reset-password?token={reset_token}"

    # ─── ส่งอีเมลจริง ───
    user_name = user.first_name or user.username or ""
    email_sent = send_password_reset_email(
        to_email=email,
        reset_url=reset_url,
        user_name=user_name,
    )

    if email_sent:
        print(f"✅ Reset email sent to {email}")
    else:
        print(f"⚠️ Reset email failed for {email} — token: {reset_token}")

    return {
        "success": True,
        "message": "หากอีเมลนี้มีอยู่ในระบบ เราจะส่งลิงก์รีเซ็ตรหัสผ่านให้",
        "email_sent": email_sent,
    }


def validate_reset_token(db: Session, token: str) -> dict:
    """
    ตรวจ token ว่า valid, ไม่หมดอายุ, ยังไม่ถูกใช้
    """
    record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == token
    ).first()

    if not record:
        return {"valid": False, "error": "ลิงก์ไม่ถูกต้อง"}

    if record.is_used:
        return {"valid": False, "error": "ลิงก์นี้ถูกใช้ไปแล้ว"}

    if now_utc() > record.expires_at:
        return {"valid": False, "error": "ลิงก์หมดอายุแล้ว กรุณาขอใหม่"}

    return {"valid": True, "user_id": str(record.user_id)}


def reset_password(db: Session, token: str, new_password: str) -> dict:
    """
    อัปเดตรหัสผ่านใหม่
    1. ตรวจ token valid
    2. hash password ใหม่
    3. mark token as used (single use)
    """
    record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == token
    ).first()

    if not record:
        return {"success": False, "message": "ลิงก์ไม่ถูกต้อง"}

    if record.is_used:
        return {"success": False, "message": "ลิงก์นี้ถูกใช้ไปแล้ว"}

    if now_utc() > record.expires_at:
        return {"success": False, "message": "ลิงก์หมดอายุแล้ว กรุณาขอใหม่"}

    # หา user
    user = db.query(User).filter(User.user_id == record.user_id).first()
    if not user:
        return {"success": False, "message": "ไม่พบผู้ใช้"}

    # อัปเดต password
    user.password = hash_password(new_password)
    user.updated_at = now_utc()

    # Mark token as used (single use)
    record.is_used = True

    db.commit()

    return {"success": True, "message": "เปลี่ยนรหัสผ่านสำเร็จ"}