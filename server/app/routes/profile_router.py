from fastapi import APIRouter, Depends, HTTPException, Response, File, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.profile import (
    ChangePasswordRequest, 
    DeleteProfile, 
    ResponseChangeProfile, 
    ChangeProfile, 
    ResponseDeleteProfile, 
    ResponseMyProfile,
    ChangeEmailRequest,  # ✅ เพิ่ม
    ChangeEmailResponse,  # ✅ เพิ่ม
    CheckUsernameRequest,  # ✅ เพิ่ม
    CheckUsernameResponse,  # ✅ เพิ่ม
    UploadProfilePictureResponse,  # ✅ เพิ่ม
    DeleteProfilePictureResponse  # ✅ เพิ่ม
)
from app.services import profile_service
from app.core.authz import authenticate_token

router = APIRouter(prefix="/profile", tags=["Profile"])

@router.get(
    "/me",
    response_model=ResponseMyProfile,
)
def getProfile(
    auth_current_user: str = Depends(authenticate_token()),
    db: Session = Depends(get_db)
):
    """
    ดึงข้อมูลโปรไฟล์ของตัวเอง
    """
    print("token", auth_current_user)
    myProfile, error = profile_service.my_profile_user_service(db, auth_current_user)
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    return myProfile

@router.patch(
    "/change",
    response_model=ResponseChangeProfile,
    summary="Change User Profile",
)
def changeProfile(
    data: ChangeProfile,
    auth_current_user: str = Depends(authenticate_token()),
    db: Session = Depends(get_db)
):
    """
    แก้ไขข้อมูลโปรไฟล์
    - ตรวจสอบ username ซ้ำอัตโนมัติ
    """
    profileRes, error = profile_service.update_profile_user_service(db, auth_current_user, data)
    print(error)
    
    if error:
        # ✅ ถ้า error เป็น dict (มี field และ message) → return JSON
        if isinstance(error, dict):
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": error}
            )
        raise HTTPException(status_code=400, detail=error)
    
    if profileRes is None:
        # ไม่มีข้อมูลเปลี่ยนแปลง
        return JSONResponse(
            content={
                "message": "No content",
                "success": True,
                "updated": None,
            },
            status_code=200
        )
    
    return {
        "message": "change profile successfully",
        "updated": profileRes,
        "success": True
    }

@router.patch(
    "/delete",
    response_model=ResponseDeleteProfile
)
def deleteProfile(
    data: DeleteProfile,
    auth_current_user: str = Depends(authenticate_token()),
    db: Session = Depends(get_db)
):
    """
    ลบโปรไฟล์ (ต้องกรอกรหัสผ่านยืนยัน)
    """
    print("user_id in delete router", auth_current_user.user_id)

    deleteRes, error = profile_service.delete_profile_user_service(
        db, auth_current_user, data.password
    )

    if error:
        if isinstance(error, dict):
            return JSONResponse(status_code=200, content=error)
        raise HTTPException(status_code=400, detail=error)
    
    print("deleteRes in router", deleteRes)

    return {
        "success": True,
        "message": "Profile deleted successfully",
        "deleted_user_id": deleteRes.get("deleted_user_id")
    }


@router.patch("/password-change")
def change_password(
    request: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user = Depends(authenticate_token())
):
    """
    เปลี่ยนรหัสผ่าน
    """
    result, error = profile_service.change_password_service(
        db=db,
        auth_current_user=current_user,
        old_password=request.old_password,
        new_password=request.new_password
    )
    if error:
        return JSONResponse(status_code=200, content=error)
    return result


# ✅ Endpoint ใหม่: เปลี่ยนอีเมล
@router.patch(
    "/email-change",
    response_model=ChangeEmailResponse,
    summary="Change Email"
)
def change_email(
    request: ChangeEmailRequest,
    db: Session = Depends(get_db),
    current_user = Depends(authenticate_token())
):
    """
    เปลี่ยนอีเมล
    
    **ต้องกรอก:**
    - new_email: อีเมลใหม่
    - password: รหัสผ่านเพื่อยืนยันตัวตน
    
    **ตรวจสอบ:**
    - รหัสผ่านถูกต้องหรือไม่
    - อีเมลซ้ำกับคนอื่นหรือไม่
    - อีเมลใหม่ต้องไม่เหมือนอีเมลเดิม
    """
    result, error = profile_service.change_email_service(
        db=db,
        auth_current_user=current_user,
        new_email=request.new_email,
        password=request.password
    )
    
    if error:
        # ✅ ถ้า error เป็น dict → return JSON พร้อม field
        if isinstance(error, dict):
            return JSONResponse(
                status_code=400,
                content=error
            )
        raise HTTPException(status_code=400, detail=error)
    
    return result


# ✅ Endpoint ใหม่: ตรวจสอบ username ซ้ำ
@router.post(
    "/check-username",
    response_model=CheckUsernameResponse,
    summary="Check Username Availability"
)
def check_username(
    request: CheckUsernameRequest,
    db: Session = Depends(get_db),
    current_user = Depends(authenticate_token())
):
    """
    ตรวจสอบว่า username ว่างหรือไม่
    
    **Response:**
    - available: true = ใช้งานได้, false = ถูกใช้งานแล้ว
    - message: ข้อความอธิบาย
    
    **สำหรับแสดง real-time validation ใน frontend**
    """
    result, error = profile_service.check_username_available_service(
        db=db,
        username=request.username,
        current_user_id=str(current_user.user_id)
    )
    
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    return result


# ✅ Endpoint ใหม่: อัปโหลดรูปโปรไฟล์
@router.post(
    "/profile-picture",
    response_model=UploadProfilePictureResponse,
    summary="Upload Profile Picture"
)
async def upload_profile_picture(
    file: UploadFile = File(..., description="รูปโปรไฟล์ (JPG, PNG, GIF, WebP)"),
    db: Session = Depends(get_db),
    current_user = Depends(authenticate_token())
):
    """
    อัปโหลดรูปโปรไฟล์
    
    **รองรับ:**
    - JPG, JPEG, PNG, GIF, WebP
    - ขนาดไฟล์แนะนำไม่เกิน 5MB
    
    **หมายเหตุ:**
    - ถ้ามีรูปเก่าจะถูกลบและแทนที่ด้วยรูปใหม่
    """
    result, error = profile_service.upload_profile_picture_service(
        db=db,
        auth_current_user=current_user,
        file=file
    )
    
    if error:
        if isinstance(error, dict):
            return JSONResponse(status_code=400, content=error)
        raise HTTPException(status_code=400, detail=error)
    
    return result


# ✅ Endpoint ใหม่: ลบรูปโปรไฟล์
@router.delete(
    "/profile-picture",
    response_model=DeleteProfilePictureResponse,
    summary="Delete Profile Picture"
)
def delete_profile_picture(
    db: Session = Depends(get_db),
    current_user = Depends(authenticate_token())
):
    """
    ลบรูปโปรไฟล์
    
    **หมายเหตุ:**
    - รูปโปรไฟล์จะถูกลบทั้งจากฐานข้อมูลและ storage
    - ถ้าไม่มีรูปโปรไฟล์จะ return error
    """
    result, error = profile_service.delete_profile_picture_service(
        db=db,
        auth_current_user=current_user
    )
    
    if error:
        if isinstance(error, dict):
            return JSONResponse(status_code=400, content=error)
        raise HTTPException(status_code=400, detail=error)
    
    return result