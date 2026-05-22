# app/services/profile_service.py
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from fastapi import UploadFile
from typing import Optional
import os
import uuid

from app.repositories import user_repository, profile_repository
from app.core.security import verify_password
from app.core.config import settings
from app.utils.now_utc import now_utc
from app.schemas.user import UserLogin
from app.schemas.auth import Authorize

# ✅ Import file_util
from app.utils.file_util import (
    save_file,
    delete_file,
    USE_CLOUDINARY,
    strip_domain_from_url
)

# ตั้งค่าโฟลเดอร์สำหรับรูปโปรไฟล์
PROFILE_UPLOAD_DIR = "app/uploads/profiles"

# สร้างโฟลเดอร์ถ้ายังไม่มี (สำหรับ local storage)
if not USE_CLOUDINARY:
    os.makedirs(PROFILE_UPLOAD_DIR, exist_ok=True)

# รูปแบบไฟล์ที่รองรับ
ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
ALLOWED_MIME_TYPES = {'image/jpeg', 'image/png', 'image/gif', 'image/webp'}


def validate_profile_image(file: UploadFile) -> bool:
    """ตรวจสอบว่าไฟล์เป็นรูปภาพที่รองรับหรือไม่"""
    if file.filename:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            return False
    
    if file.content_type:
        if file.content_type not in ALLOWED_MIME_TYPES:
            return False
    
    return True


def update_profile_user_service(db: Session, auth_current_user, data):
    try:
        get_user = user_repository.get_user_by_user_id(db=db, user_id=auth_current_user.user_id)

        print(f"duplicate get_user, data: {get_user.first_name}, {data.first_name}")
        print(f"current user in service: {auth_current_user.user_id}")

        update_data = {}

        if data.first_name is not None and data.first_name != get_user.first_name: 
            update_data["first_name"] = data.first_name
        if data.last_name is not None and data.last_name != get_user.last_name: 
            update_data["last_name"] = data.last_name
        
        # ✅ ตรวจสอบ username ซ้ำ
        if data.username is not None and data.username != get_user.username:
            # ตรวจสอบว่า username ใหม่ซ้ำกับคนอื่นไหม
            existing_user = user_repository.get_user_by_username(db, data.username)
            if existing_user and existing_user.user_id != auth_current_user.user_id:
                return None, {"field": "username", "message": "Username นี้ถูกใช้งานแล้ว"}
            update_data["username"] = data.username
        
        if data.birth_date is not None and data.birth_date != get_user.birth_date: 
            update_data["birth_date"] = data.birth_date

        print(f"type of birth date in service {data.birth_date} {get_user.birth_date}")
        print("dict in service test", update_data)

        if not update_data:
            return None, None

        changeUser = profile_repository.update_user(
            db=db,
            user_id=auth_current_user.user_id,
            update_data=update_data
        )

        print(f"changeUser in service: {changeUser.user_id}")

        if not changeUser:
            return None, "User not found"

        print("commit start")
        db.commit()
        print("commit complete")
        db.refresh(changeUser)

        return update_data, None

    except Exception as e:
        db.rollback()
        return None, str(e)


def delete_profile_user_service(db: Session, auth_current_user, password):
    try:
        print(f"current user in service: {auth_current_user.user_id}")

        # ดึง user ขึ้นมาก่อน
        user = user_repository.get_user_by_user_id(db, auth_current_user.user_id)

        if not user:
            return None, "User not found"
        
        # ตรวจสอบรหัสผ่านก่อน
        if not verify_password(password, user.password):
            return None, {"password": "รหัสผ่านไม่ถูกต้อง", "success": False}

        # ✅ ลบรูปโปรไฟล์ถ้ามี
        if user.profile_picture:
            try:
                delete_file(user.profile_picture)
                print(f"🗑️ Deleted profile picture: {user.profile_picture}")
            except Exception as e:
                print(f"⚠️ Failed to delete profile picture: {e}")

        # ลบ user หลังจากรหัสผ่านถูกต้อง
        profile_repository.delete_user(db=db, user_id=auth_current_user.user_id)

        db.commit()

        return {"deleted_user_id": str(auth_current_user.user_id)}, None

    except Exception as e:
        db.rollback()
        return None, str(e)

    
def my_profile_user_service(db: Session, auth_current_user):
    try:
        my_profile = profile_repository.get_my_profile(
            db=db,
            user_id=auth_current_user.user_id
        )

        if my_profile is None:
            return None, {"message": "ไม่พบโปรไฟล์"}

        # ✅ เพิ่ม profile_picture
        profile_data = {
            "first_name": my_profile.first_name,
            "last_name": my_profile.last_name,
            "username": my_profile.username,
            "email": my_profile.email,
            "birth_date": my_profile.birth_date,
            "phone_number": my_profile.phone_number,
            "user_role": getattr(getattr(my_profile, "role", None), "role_name", None),
            "profile_picture": my_profile.profile_picture
        }

        return profile_data, None
    
    except Exception as e:
        db.rollback()
        return None, str(e)

    
def change_password_service(db: Session, auth_current_user, old_password: str, new_password: str):
    try:
        # ดึง user
        user = user_repository.get_user_by_user_id(db=db, user_id=auth_current_user.user_id)
        if not user:
            return None, "User not found"

        # ตรวจสอบรหัสผ่านเก่า
        if not verify_password(old_password, user.password):
            return None, {"password": "รหัสผ่านเก่าไม่ถูกต้อง", "success": False}

        # เปลี่ยนรหัสผ่าน
        updated_user = profile_repository.change_user_password(
            db=db,
            user_id=auth_current_user.user_id,
            new_password=new_password
        )
        if not updated_user:
            return None, "User not found"

        db.commit()
        db.refresh(updated_user)
        return {"message": "เปลี่ยนรหัสผ่านสำเร็จ", "success": True}, None
    except Exception as e:
        db.rollback()
        return None, str(e)


# ✅ ฟังก์ชันใหม่: เปลี่ยนอีเมล
def change_email_service(db: Session, auth_current_user, new_email: str, password: str):
    """
    เปลี่ยนอีเมลพร้อมตรวจสอบรหัสผ่านและอีเมลซ้ำ
    """
    try:
        # ดึง user
        user = user_repository.get_user_by_user_id(db=db, user_id=auth_current_user.user_id)
        if not user:
            return None, "User not found"

        # ตรวจสอบรหัสผ่าน
        if not verify_password(password, user.password):
            return None, {"field": "password", "message": "รหัสผ่านไม่ถูกต้อง", "success": False}

        # ตรวจสอบว่าอีเมลใหม่ซ้ำกับคนอื่นไหม
        existing_user = user_repository.get_user_by_email(db, new_email)
        if existing_user and existing_user.user_id != auth_current_user.user_id:
            return None, {"field": "email", "message": "อีเมลนี้ถูกใช้งานแล้ว", "success": False}

        # ตรวจสอบว่าอีเมลใหม่เหมือนอีเมลเดิมไหม
        if user.email == new_email:
            return None, {"field": "email", "message": "อีเมลใหม่ต้องไม่เหมือนอีเมลเดิม", "success": False}

        # อัปเดทอีเมล
        updated_user = profile_repository.update_user(
            db=db,
            user_id=auth_current_user.user_id,
            update_data={"email": new_email}
        )

        if not updated_user:
            return None, "Failed to update email"

        db.commit()
        db.refresh(updated_user)

        return {
            "message": "เปลี่ยนอีเมลสำเร็จ",
            "success": True,
            "new_email": new_email
        }, None

    except Exception as e:
        db.rollback()
        print(f"❌ Error in change_email_service: {e}")
        return None, str(e)


# ✅ ฟังก์ชันใหม่: ตรวจสอบ username ซ้ำ
def check_username_available_service(db: Session, username: str, current_user_id: str = None):
    """
    ตรวจสอบว่า username ว่างหรือไม่
    """
    try:
        existing_user = user_repository.get_user_by_username(db, username)
        
        # ถ้าไม่มีคนใช้ username นี้ → available
        if not existing_user:
            return {"available": True, "message": "Username นี้ใช้งานได้"}, None
        
        # ถ้าเป็น username ของตัวเอง → available
        if current_user_id and str(existing_user.user_id) == str(current_user_id):
            return {"available": True, "message": "Username ปัจจุบันของคุณ"}, None
        
        # ถ้ามีคนอื่นใช้แล้ว → not available
        return {"available": False, "message": "Username นี้ถูกใช้งานแล้ว"}, None

    except Exception as e:
        print(f"❌ Error in check_username_available_service: {e}")
        return None, str(e)


# ✅ ฟังก์ชันใหม่: อัปโหลดรูปโปรไฟล์
# ✅ ฟังก์ชันใหม่: อัปโหลดรูปโปรไฟล์
def upload_profile_picture_service(db: Session, auth_current_user, file: UploadFile):
    """
    อัปโหลดรูปโปรไฟล์
    """
    print(f"\n{'='*80}")
    print(f"📸 [SERVICE] upload_profile_picture_service called")
    print(f"{'='*80}")
    print(f"👤 [SERVICE] user_id: {auth_current_user.user_id}")
    print(f"📁 [SERVICE] filename: {file.filename}")
    print(f"📄 [SERVICE] content_type: {file.content_type}")
    print(f"{'='*80}\n")
    
    try:
        # ตรวจสอบไฟล์
        if not validate_profile_image(file):
            print(f"❌ [SERVICE] File validation failed!")
            return None, {
                "success": False,
                "message": f"ไฟล์ไม่ถูกต้อง: รองรับเฉพาะ {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
            }
        
        print(f"✅ [SERVICE] File validation passed")

        # ดึง user
        user = user_repository.get_user_by_user_id(db=db, user_id=auth_current_user.user_id)
        if not user:
            print(f"❌ [SERVICE] User not found!")
            return None, {"success": False, "message": "User not found"}

        print(f"✅ [SERVICE] User found: {user.username}")
        
        # เก็บ URL รูปเดิมไว้
        old_profile_picture = user.profile_picture
        print(f"🖼️  [SERVICE] Old profile picture: {old_profile_picture}")

        # อัปโหลดรูปใหม่
        try:
            ext = os.path.splitext(file.filename)[1].lower()
            unique_filename = f"profile_{uuid.uuid4().hex}{ext}"
            print(f"📝 [SERVICE] Generating unique filename: {unique_filename}")
            
            new_image_url = save_file(PROFILE_UPLOAD_DIR, file, unique_filename)
            
            print(f"✅ [SERVICE] File uploaded successfully!")
            print(f"🔗 [SERVICE] New image URL: {new_image_url}")

            # อัปเดทในฐานข้อมูล
            print(f"\n💾 [SERVICE] Calling repository to update DB...")
            updated_user = profile_repository.update_user(
                db=db,
                user_id=auth_current_user.user_id,
                update_data={"profile_picture": new_image_url}
            )

            if not updated_user:
                print(f"❌ [SERVICE] Failed to update user in DB!")
                # ถ้าอัปเดท DB ไม่สำเร็จ ลบไฟล์ที่อัปโหลดไปแล้ว
                try:
                    delete_file(new_image_url)
                    print(f"🗑️  [SERVICE] Rolled back uploaded file")
                except:
                    pass
                return None, {"success": False, "message": "Failed to update profile picture"}

            print(f"✅ [SERVICE] User updated in DB successfully!")
            print(f"🖼️  [SERVICE] Updated profile_picture in user object: {updated_user.profile_picture}")
            
            print(f"\n💾 [SERVICE] Committing transaction...")
            db.commit()
            print(f"✅ [SERVICE] Transaction committed!")
            
            print(f"🔄 [SERVICE] Refreshing user object...")
            db.refresh(updated_user)
            print(f"✅ [SERVICE] User refreshed!")
            print(f"🖼️  [SERVICE] Final profile_picture value: {updated_user.profile_picture}")

            # ลบรูปเดิม (ถ้ามี)
            if old_profile_picture:
                try:
                    delete_file(old_profile_picture)
                    print(f"🗑️  [SERVICE] Deleted old profile picture: {old_profile_picture}")
                except Exception as e:
                    print(f"⚠️  [SERVICE] Failed to delete old profile picture: {e}")

            print(f"\n✅ [SERVICE] Upload profile picture completed successfully!")
            print(f"{'='*80}\n")
            
            return {
                "success": True,
                "message": "อัปโหลดรูปโปรไฟล์สำเร็จ",
                "profile_picture_url": new_image_url
            }, None

        except Exception as e:
            print(f"❌ [SERVICE] Error uploading file: {e}")
            import traceback
            traceback.print_exc()
            return None, {"success": False, "message": f"ไม่สามารถอัปโหลดรูปภาพได้: {str(e)}"}

    except Exception as e:
        db.rollback()
        print(f"❌ [SERVICE] Critical error in upload_profile_picture_service: {e}")
        import traceback
        traceback.print_exc()
        return None, str(e)

# ✅ ฟังก์ชันใหม่: ลบรูปโปรไฟล์
def delete_profile_picture_service(db: Session, auth_current_user):
    """
    ลบรูปโปรไฟล์
    """
    try:
        # ดึง user
        user = user_repository.get_user_by_user_id(db=db, user_id=auth_current_user.user_id)
        if not user:
            return None, {"success": False, "message": "User not found"}

        # ตรวจสอบว่ามีรูปโปรไฟล์อยู่ไหม
        if not user.profile_picture:
            return None, {"success": False, "message": "ไม่มีรูปโปรไฟล์ที่จะลบ"}

        old_profile_picture = user.profile_picture

        # อัปเดทในฐานข้อมูล (ลบ URL)
        updated_user = profile_repository.update_user(
            db=db,
            user_id=auth_current_user.user_id,
            update_data={"profile_picture": None}
        )

        if not updated_user:
            return None, {"success": False, "message": "Failed to delete profile picture"}

        db.commit()
        db.refresh(updated_user)

        # ลบไฟล์
        try:
            delete_file(old_profile_picture)
            print(f"🗑️ Deleted profile picture: {old_profile_picture}")
        except Exception as e:
            print(f"⚠️ Failed to delete profile picture file: {e}")

        return {
            "success": True,
            "message": "ลบรูปโปรไฟล์สำเร็จ"
        }, None

    except Exception as e:
        db.rollback()
        print(f"❌ Error in delete_profile_picture_service: {e}")
        return None, str(e)