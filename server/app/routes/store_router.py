import uuid
import os
from fastapi import APIRouter, Form, File, UploadFile, Depends
from sqlalchemy.orm import Session
from fastapi.responses import FileResponse, RedirectResponse
from app.core.config import settings
import stripe
from app.models.store import Store
from app.schemas.store_schema import StoreCreate, StoreUpdate
from app.db.database import get_db
from app.core.authz import authenticate_token, authorize_role
from app.services.store_service import (
    create_store_and_connect_stripe,
    # create_store_service,
    create_stripe_onboarding_link,
    get_my_store_service,
    update_store_service,
    delete_store_service
)
from app.repositories import store_repository
from app.utils.file_util import USE_CLOUDINARY, strip_domain_from_url, update_file, delete_file
from app.utils.response_handler import error_response, success_response

router = APIRouter(prefix="/store", tags=["Store"])
UPLOAD_DIR = "app/uploads/store/logo"

if not USE_CLOUDINARY:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
@router.post("/create-with-stripe")
def create_store(
    name: str = Form(...),
    description: str = Form(...),
    address: str = Form(...),
    logo: UploadFile = File(None),  # ✅ optional: สามารถไม่อัปโหลดก็ได้
    db: Session = Depends(get_db),
    auth_current_user=Depends(authenticate_token()),
):
    """
    เมื่อร้านใหม่ถูกสร้าง:
    - ระบบจะสร้าง Stripe Connected Account (type=express)
    - คืนลิงก์ Onboarding ให้ร้านกรอกข้อมูลธนาคาร
    - รองรับการอัปโหลดโลโก้ร้าน (logo)
    """
    return create_store_and_connect_stripe(
        db=db,
        user_id=auth_current_user.user_id,
        name=name,
        description=description,
        address=address,
        logo=logo
    )


# ✅ สร้างร้านใหม่
# @router.post("/create")
# def create_store(
#     name: str = Form(...),
#     description: str = Form(None),
#     address: str = Form(None),
#     logo: UploadFile = File(None),
#     db: Session = Depends(get_db),
#     auth_current_user=Depends(authenticate_token()),
#     auth_role=Depends(authorize_role(["user"]))
# ):
#     data = StoreCreate(name=name, description=description, address=address).dict()
#     return create_store_service(db, auth_current_user, data, logo)


# ✅ ดึงร้านของฉัน
@router.get("/me")
def get_my_store(
    db: Session = Depends(get_db),
    auth_current_user=Depends(authenticate_token()),
    auth_role=Depends(authorize_role(["seller", "admin"])),
):
    return get_my_store_service(db, auth_current_user)


# ✅ อัปเดตร้าน
@router.patch("/update")
# app/routes/store_router.py - Update endpoint

# ✅ อัปเดตร้าน (แก้ไขให้รองรับ remove_logo)
@router.patch("/update")
def update_store(
    name: str = Form(None),
    description: str = Form(None),
    address: str = Form(None),
    logo: UploadFile = File(None),
    remove_logo: bool = Form(False),  # ✅ เพิ่ม parameter สำหรับลบโลโก้
    db: Session = Depends(get_db),
    auth_current_user=Depends(authenticate_token()),
    auth_role=Depends(authorize_role(["seller"])),
):
    """
    อัพเดทข้อมูลร้านค้า
    
    Form Data:
    - name: ชื่อร้าน (optional)
    - description: คำอธิบาย (optional)
    - address: ที่อยู่ (optional)
    - logo: ไฟล์โลโก้ใหม่ (optional)
    - remove_logo: true = ลบโลโก้ (optional)
    """
    return update_store_service(
        db, 
        auth_current_user, 
        name=name,
        description=description,
        address=address,
        logo=logo,
        remove_logo=remove_logo
    )

# ✅ ลบร้าน
@router.delete("/delete")
def delete_store(
    db: Session = Depends(get_db),
    auth_current_user=Depends(authenticate_token()),
    auth_role=Depends(authorize_role(["seller"])),
):
    return delete_store_service(db, auth_current_user)


# ✅ ดึงโลโก้ร้าน
@router.get("/{store_id}/logo")
def get_store_logo(store_id: str, db: Session = Depends(get_db)):
    store = store_repository.get_store_by_id(db, store_id)
    if not store or not store.logo_path:
        return error_response("ไม่พบโลโก้ของร้านนี้", {"logo": "ไม่พบไฟล์ในระบบ"}, 404)

    # CLOUDINARY → ให้ client ไปโหลดจาก Cloudinary โดยตรง (redirect)
    if USE_CLOUDINARY:
        return RedirectResponse(url=store.logo_path)

    # DISK MODE → ใช้ path บนเครื่อง
    # ถ้าใน DB บังเอิญเก็บเป็น full URL (มี domain) → ตัด domain ออก
    file_path = strip_domain_from_url(store.logo_path).strip("/")
    if not os.path.exists(file_path):
        return error_response("ไม่พบไฟล์โลโก้ในระบบ", {"logo": "ไฟล์หาย"}, 404)

    return FileResponse(file_path)


# ✅ อัปเดตโลโก้
@router.put("/{store_id}/logo")
def update_store_logo(
    store_id: str,
    logo: UploadFile = File(...),
    db: Session = Depends(get_db),
    auth_current_user=Depends(authenticate_token()),
):
    store = store_repository.get_store_by_id(db, store_id)
    if not store:
        return error_response("ไม่พบร้านค้า", {"store": "ไม่พบข้อมูลร้านค้า"}, 404)

    if store.user_id != auth_current_user.user_id:
        return error_response("คุณไม่มีสิทธิ์แก้ไขร้านนี้", {"auth": "Forbidden"}, 403)

    filename = f"{uuid.uuid4()}_{logo.filename}"
    new_logo_path = update_file(store.logo_path, UPLOAD_DIR, logo, filename)
    store.logo_path = new_logo_path
    db.commit()
    db.refresh(store)

    return success_response("อัปเดตโลโก้ร้านสำเร็จ", store)



# ✅ ลบโลโก้
@router.delete("/{store_id}/logo")
def delete_store_logo(
    store_id: str,
    db: Session = Depends(get_db),
    auth_current_user=Depends(authenticate_token()),
):
    store = store_repository.get_store_by_id(db, store_id)
    if not store:
        return error_response("ไม่พบร้านค้า", {"store": "ไม่พบข้อมูลร้านค้า"}, 404)

    if store.user_id != auth_current_user.user_id:
        return error_response("คุณไม่มีสิทธิ์ลบโลโก้ร้านนี้", {"auth": "Forbidden"}, 403)

    delete_file(store.logo_path)
    store.logo_path = None
    db.commit()
    db.refresh(store)
    return success_response("ลบโลโก้ร้านสำเร็จ", store)



# ----------------------------

@router.get("/connect/refresh-link")
def refresh_onboarding_link(
    db: Session = Depends(get_db),
    auth_current_user=Depends(authenticate_token())
):
    """
    สร้างลิงก์ Onboarding ใหม่ให้ร้าน (ใช้เมื่อยังไม่ได้กรอกข้อมูล KYC หรือหมดอายุ)
    โดยจะค้นหาร้านจากผู้ใช้ที่ล็อกอินอยู่
    """
    return create_stripe_onboarding_link(db, auth_current_user.user_id)

@router.get("/connect/refresh/{store_id}")
def stripe_connect_refresh(store_id: str, db: Session = Depends(get_db)):
    """
    Stripe จะเรียก endpoint นี้เมื่อผู้ใช้รีเฟรชหรือใช้ลิงก์หมดอายุระหว่าง onboarding.
    หน้าที่ของเราคือสร้าง AccountLink ใหม่ให้ร้านนี้ และ redirect ผู้ใช้กลับไปยัง Stripe.
    """
    try:
        store = db.query(Store).filter(Store.store_id == store_id).first()
        if not store or not store.stripe_account_id:
            return error_response("Store not found or missing Stripe account ID", status_code=404)

        onboarding_link = stripe.AccountLink.create(
            account=store.stripe_account_id,
            refresh_url=f"{settings.BASE_URL}/store/connect/refresh/{store.store_id}",
            return_url=f"{settings.BASE_URL}/store/connect/success/{store.store_id}",
            type="account_onboarding",
        )

        # redirect ผู้ใช้กลับไปหน้า Stripe
        return RedirectResponse(url=onboarding_link.url)

    except Exception as e:
        return error_response("Failed to refresh Stripe onboarding link", {"error": str(e)})

# print("[ROUTE] Registering /connect/success/{store_id}")
@router.get("/connect/success/{store_id}")
def stripe_connect_success(store_id: str, db: Session = Depends(get_db)):
    from fastapi.responses import HTMLResponse

    print("[ROUTE] stripe_connect_success called!")

    try:
        store = db.query(Store).filter(Store.store_id == store_id).first()
        if not store:
            return HTMLResponse(content="<h1>Store not found</h1>", status_code=404)

        store.is_active = True
        store.is_stripe_verified = True
        db.commit()

        print(f"[ROUTE] Store {store_id} activated successfully")

    except Exception as e:
        db.rollback()
        print(f"[ROUTE] Failed to activate store: {e}")

    html = """<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>สมัครสําเร็จ</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
      font-family: 'Segoe UI', sans-serif;
    }
    .card {
      background: white;
      border-radius: 24px;
      padding: 48px 40px;
      text-align: center;
      max-width: 380px;
      width: 90%;
      box-shadow: 0 8px 32px rgba(124, 58, 237, 0.12);
    }
    .icon-wrap {
      width: 88px;
      height: 88px;
      background: linear-gradient(135deg, #8b5cf6, #7c3aed);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    .icon-wrap svg {
      width: 44px;
      height: 44px;
      stroke: white;
      stroke-width: 2.5;
      fill: none;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 12px;
    }
    p {
      font-size: 14px;
      color: #6b7280;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-wrap">
      <svg viewBox="0 0 24 24">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </div>
    <h1>สมัครร้านค้าสําเร็จ</h1>
    <p>ขอบคุณที่สมัครร้านค้ากับเรา<br/>คุณสามารถปิดหน้านี้และกลับสู่แอปได้เลย</p>
  </div>
</body>
</html>"""
    return HTMLResponse(content=html)