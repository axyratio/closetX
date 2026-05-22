# app/services/auth_service.py
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status, Response
from sqlalchemy.orm import Session
from app.repositories import user_repository
from app.core.security import verify_password, create_access_token, decode_access_token, hash_password
from app.core.config import settings
# from app.utils.generate_numeric_otp import generate_numeric_otp
from app.utils.now_utc import now_utc
from app.schemas.user import UserLogin
# from app.services.notification_service import send_register_otp_notification

# OTP_EXPIRE_MINUTES = settings.OTP_TOKEN_EXPIRE_MINUTES


def register_service(db: Session, user_data):
    try:
        # 1) ตรวจ username
        user_data_username = user_repository.get_user_by_username(db, user_data.username)

        
        if user_data_username:
            if user_data_username.is_active:
                return None, {"username": "ชื่อผู้ใช้ถูกใช้ไปแล้ว", "ok": False}
            else:
                return None, {"username": "ชื่อผู้ใช้ถูกใช้ไปแล้ว", "ok": False}
            

        user_data_email = user_repository.get_user_by_email(db, user_data.email)
        if user_data_email:
            return None, {"email": "อีเมลนี้ถูกใช้ไปแล้ว", "ok": False}
            # ถ้า pending ให้ reuse account เดิม
        else:
            # ถ้าไม่มี user นี้เลย → สร้างใหม่
            
            user_data.password = hash_password(user_data.password)

            target_user = user_repository.create_user(
                db, {**user_data.dict(), "is_active": True}
            )
            db.flush()


        db.commit()

        return {
            "message": "Registration Successful",
            "username": target_user.username
            # "otp_token": otp_token,
            # "otp_code": otp_code,
            # "send_meta": send_meta
        }, None

    except Exception as e:
        db.rollback()
        return None, str(e)
    

def login_service(db: Session,  user_data):
    try:
        identity = user_data.identity
        password = user_data.password

        print(f"service login identity: {identity}, password: {password}")

        user = user_repository.get_by_identity(db, identity)
        
        # print(f"password from db: {user.password}")

        # print(f"service get user: {user.username} {user.user_id}")


        if not user:
            return None, {"identity": "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"}

        if not verify_password(password, user.password):
            return None, {"password": "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"}
        
        print(f"service user role: {user.role.role_name}")

        # สร้าง access token
        access_token = create_access_token(
            data={"sub": str(user.user_id), "username": user.username, "user_role": user.role.role_name}
        )

        # print(f"user is active in service: {user.is_active}")
        user.is_active = True
        # print(f"user is active ture in service: {user.is_active}")

        # print(f"service access_token: {access_token}")
        

        db.commit()
        db.refresh(user)
        return {
            "access_token": access_token,
            "user_role": user.role.role_name,
            "token_type": "bearer",
            "username": user.username
        }, None

    except Exception as e:
        db.rollback()
        return None, str(e)
