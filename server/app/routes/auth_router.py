from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.user import UserRegister, UserResponseRegister, ErrorResponseRegister, UserLogin, UserResponseLogin, ErrorResponseLogin
from app.services.auth_service import (
    register_service,
    login_service
)
from app.core.authz import set_auth_cookies
from app.services import auth_service
from typing import Union

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post(
    "/register",
    response_model=UserResponseRegister,
    responses={400: {"model": ErrorResponseRegister}},
    summary="สมัครสมาชิกใหม่และส่งรหัส OTP",
)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    print(f"router username: {payload.username}, email: {payload.email}, password: {payload.password}")
    res, err = register_service(db, payload)
    print(res, err)
    if err:
        # ถ้า err เป็น dict → ส่งออกไปเลย
        if isinstance(err, dict):
            return JSONResponse(status_code=400, content=err)
        # fallback กรณีเป็น string ธรรมดา
        raise HTTPException(status_code=400, detail=err)
        # ถ้ามี error (ซึ่งตอนนี้เป็น dict) ให้ส่งกลับไปเป็น JSONResponse โดยตรง
        return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content=err)
    return UserResponseRegister(
        message=res.get("message"),
        username=res.get("username"),
        # otp_token=res.get("otp_token"),
        # otp_code=res.get("otp_code"),  # จะมีเฉพาะตอน DEBUG=True
    )

@router.post(
    "/login",
    response_model=UserResponseLogin,
    responses={400: {"model": ErrorResponseLogin}},
    summary="เข้าสู่ระบบด้วย Username หรือ Email",
)
def login(payload: UserLogin, response: Response, db: Session = Depends(get_db)):
    print(f"router username: {payload.identity}, password: {payload.password}")
    res, err = login_service(db, payload)
    
    if err:
        if isinstance(err, dict):
            return JSONResponse(status_code=400, content=err)
        raise HTTPException(status_code=400, detail=err)
    
    # ✅ เปลี่ยนมาใช้ฟังก์ชันกลาง (รองรับทั้ง Localhost และ Vercel/Production)
    set_auth_cookies(
        response=response, 
        access_token=res.get("access_token")
    )
    
    # ✅ 2. เพิ่มส่วนนี้เพื่อเช็ค: ปรินต์ Header ออกมาดูเลยว่ามี Set-Cookie ไหม
    print("--------------------------------------------------")
    print("🔍 CHECKING RESPONSE HEADERS:")
    print(response.headers) 
    # คุณควรมองหาคำว่า 'set-cookie': 'access_token=...' ใน log
    print("--------------------------------------------------")
   

    
    return UserResponseLogin(
        message="Login Successful",
        username=res.get("username"),
        access_token=res.get("access_token"),
        token_type=res.get("token_type"),
        user_role=res.get("user_role")
    )

