import os
import uuid
from sqlalchemy.orm import Session
from fastapi import UploadFile
import stripe
from app.models import Store, Product, OrderItem
from app.models.role import Role
from app.models.user import User
from app.repositories import store_repository, user_repository
from app.utils.file_util import save_file, update_file, delete_file, rollback_and_cleanup
from app.utils.response_handler import success_response, error_response
from app.core.config import settings

UPLOAD_DIR = "app/uploads/store/logo"


def create_store_and_connect_stripe(
    db: Session,
    user_id: str,
    name: str,
    description: str,
    address: str,
    logo: UploadFile | None = None,
):
    try:
        # ไม่ต้อง os.makedirs ตรงนี้แล้ว ให้ file_util จัดการเอง (เฉพาะ DISK mode)

        existing_store = db.query(Store).filter(Store.user_id == user_id).first()
        if existing_store:
            return error_response("มีร้านค้าอยู่แล้ว", status_code=400)

        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            return error_response("ไม่พบผู้ใช้งาน", status_code=404)

        # ✅ สร้าง Stripe Connected Account
        account = stripe.Account.create(
            type="express",
            country="SG",
            email=user.email,
            capabilities={
                "card_payments": {"requested": True},
                "transfers": {"requested": True},
            },
        )

        # ✅ จัดการไฟล์โลโก้ผ่าน save_file (DISK/CLOUD เลือกตาม env)
        logo_path = None
        if logo:
            filename = f"{user_id}_{uuid.uuid4().hex}"
            logo_path = save_file(UPLOAD_DIR, logo, filename)

        # ✅ บันทึกข้อมูลร้าน
        store = Store(
            user_id=user_id,
            name=name,
            description=description,
            address=address,
            logo_path=logo_path,
            is_active=True,
            stripe_account_id=account.id,
        )
        # เปลี่ยนเป็น seller 
        user.role_id = 2

        db.add(store)
        db.commit()
        db.refresh(store)

        onboarding_link = stripe.AccountLink.create(
            account=account.id,
            refresh_url=f"{settings.BASE_URL}/store/connect/refresh/{store.store_id}",
            return_url=f"{settings.BASE_URL}/store/connect/success/{store.store_id}",
            type="account_onboarding",
        )

        return success_response(
            "Store created and Stripe connected",
            {
                "store_id": str(store.store_id),
                "stripe_account_id": account.id,
                "onboarding_link": onboarding_link.url,
                "logo_path": logo_path,
                "user_role": user.role.role_name,
            },
        )

    except Exception as e:
        db.rollback()
        return error_response(
            "Failed to create store with Stripe connect", {"error": str(e)}
        )

# ✅ ดึงร้านของผู้ใช้
def get_my_store_service(db: Session, user_data):
    store = store_repository.get_store_by_user(db, user_data.user_id)
    if not store:
        return error_response("ไม่พบร้านค้าของคุณ", {"store": "ไม่พบข้อมูลร้านค้า"}, status_code=404)
    return success_response("ดึงข้อมูลร้านค้าสำเร็จ", store)


# ✅ อัปเดตร้านค้า
def update_store_service(
    db: Session, 
    user_data, 
    name: str = None,
    description: str = None, 
    address: str = None,
    logo: UploadFile = None,
    remove_logo: bool = False
):
    """
    อัพเดทข้อมูลร้านค้า รองรับ:
    - แก้ไขชื่อ, คำอธิบาย, ที่อยู่
    - อัพโหลดโลโก้ใหม่
    - ลบโลโก้เดิม
    """
    store = store_repository.get_store_by_user(db, user_data.user_id)
    if not store:
        return error_response(
            "ไม่พบร้านค้าของคุณ", 
            {"store": "ไม่พบข้อมูลร้านค้า"}, 
            status_code=404
        )

    try:
        # เก็บ logo เดิมไว้เผื่อต้องลบ
        old_logo_path = store.logo_path

        # จัดการรูปภาพ
        if remove_logo:
            # ลบรูปภาพเดิม
            if old_logo_path:
                try:
                    delete_file(old_logo_path)
                except Exception as e:
                    print(f"⚠️ [update_store] Failed to delete old logo: {e}")
            store.logo_path = None
            
        elif logo and logo.filename:
            # อัพโหลดรูปใหม่
            try:
                filename = f"{uuid.uuid4()}_{logo.filename}"
                new_logo_path = save_file(UPLOAD_DIR, logo, filename)
                
                # ลบรูปเดิม (ถ้ามี)
                if old_logo_path:
                    try:
                        delete_file(old_logo_path)
                    except Exception as e:
                        print(f"⚠️ [update_store] Failed to delete old logo: {e}")
                
                store.logo_path = new_logo_path
            except Exception as e:
                print(f"❌ [update_store] Logo upload error: {e}")
                return error_response(
                    f"ไม่สามารถอัพโหลดโลโก้ได้: {str(e)}", 
                    {}, 
                    400
                )

        # อัพเดทข้อมูลอื่นๆ
        if name is not None:
            store.name = name
        if description is not None:
            store.description = description
        if address is not None:
            store.address = address

        db.commit()
        db.refresh(store)
        
        return success_response("อัปเดตร้านค้าสำเร็จ", {
            "store_id": str(store.store_id),
            "name": store.name,
            "description": store.description,
            "address": store.address,
            "logo_path": store.logo_path,
        })

    except Exception as e:
        db.rollback()
        print(f"❌ [update_store_service] Error: {e}")
        return error_response(
            "อัปเดตร้านค้าไม่สำเร็จ", 
            {"error": str(e)}, 
            status_code=500
        )

# ✅ ลบร้านค้า
def delete_store_service(db: Session, user_data):
    store = store_repository.get_store_by_user(db, user_data.user_id)
    if not store:
        return error_response("ไม่พบร้านค้าของคุณ", {"store": "ไม่พบข้อมูลร้านค้า"}, status_code=404)
    
    user = user_repository.get_user_by_user_id(db, user_data.user_id)
    if (not user):
        return error_response("ไม่เจอชื่อผู้ใช้งาน", {"user": "ไม่เจอชื่อผู้ใช้งาน"}, status_code=404)
        
    user.role_id = 1

    try:
        order_items = (
            db.query(OrderItem)
            .join(Product, OrderItem.product_id == Product.product_id) #ต้องเช็คสถานะด้วยว่า Complete หรือยัง ถ้าหากมีพวก pending แล้วแจ้งไปว่าปฏิเสธโดยร้านค้า และในตะกร้า ให้ไปลบมันออกเลย แล้วก็ลบใน connect ด้วย
            .filter(Product.store_id == store.store_id)
            .all()
        )

        if order_items:
            store.is_open = False
            db.commit()
            return error_response("ร้านนี้มีคำสั่งซื้ออยู่ จึงปิดร้านแทนการลบ",
                                  {"store": "ร้านถูกตั้งสถานะปิด"}, status_code=400)

        delete_file(store.logo_path)
        db.delete(store)
        db.commit()
        return success_response("ลบร้านค้าสำเร็จ")

    except Exception as e:
        db.rollback()
        return error_response("เกิดข้อผิดพลาดขณะลบร้านค้า", {"error": str(e)}, status_code=500)


# ------------------------------------------

def create_stripe_onboarding_link(db, user_id: str):
    """
    ใช้เมื่อร้านมี Stripe account อยู่แล้ว แต่ยังไม่ได้กรอก onboarding (KYC)
    ระบบจะสร้างลิงก์ onboarding ใหม่ให้ร้านกรอกข้อมูลอีกครั้ง
    """
    try:
        store = db.query(Store).filter(Store.user_id == user_id).first()
        if not store:
            return error_response("Store not found", status_code=404)

        if not store.stripe_account_id:
            return error_response("This store has no Stripe account ID yet", status_code=400)

        # ✅ สร้างลิงก์ onboarding ใหม่จาก Stripe account เดิม
        onboarding_link = stripe.AccountLink.create(
            account=store.stripe_account_id,
            refresh_url=f"{settings.BASE_URL}/store/connect/refresh/{store.store_id}",
            return_url=f"{settings.BASE_URL}/store/connect/success/{store.store_id}",
            type="account_onboarding",
        )

        return success_response("New Stripe onboarding link created", {
            "store_id": str(store.store_id),
            "stripe_account_id": store.stripe_account_id,
            "onboarding_link": onboarding_link.url
        })

    except Exception as e:
        return error_response("Failed to create onboarding link", {"error": str(e)})