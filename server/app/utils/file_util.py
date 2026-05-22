# app/utils/file_util.py
import os
import shutil
from typing import List

from fastapi import UploadFile
from sqlalchemy.orm import Session
import uuid

# ===============================
# เลือกโหมดจาก ENV
# ===============================
STORAGE_MODE = os.getenv("FILE_STORAGE_MODE", "DISK").upper()
USE_CLOUDINARY = STORAGE_MODE == "CLOUDINARY"

if USE_CLOUDINARY:
    import cloudinary
    import cloudinary.uploader
    from urllib.parse import urlparse

    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET"),
        secure=True,
    )


# ===============================
# Helper: DISK MODE
# ===============================
def ensure_dir(path: str):
    if not USE_CLOUDINARY:
        os.makedirs(path, exist_ok=True)


# ===============================
# Helper: CLOUDINARY MODE
# ===============================
def _normalize_folder(upload_dir: str) -> str:
    """
    แปลง path เดิมประมาณ "app/uploads/store/logo"
    ให้เหลือ "store/logo" เอาไปใช้เป็น folder ของ Cloudinary
    """
    if not upload_dir:
        return ""
    path = upload_dir.replace("app/uploads/", "").strip("/")
    return path


def _extract_public_id_from_url_or_path(url_or_path: str) -> str | None:
    """
    รองรับทั้ง:
    - full URL: https://res.cloudinary.com/<cloud>/image/upload/v123/store/logo/abc.png
    - path อย่างเดียว: /image/upload/v123/store/logo/abc.png
    สิ่งที่ต้องการคือ public_id = "store/logo/abc"
    """
    try:
        from urllib.parse import urlparse as _urlparse

        # ถ้าเป็น full URL → ใช้ urlparse
        if url_or_path.startswith("http://") or url_or_path.startswith("https://"):
            parsed = _urlparse(url_or_path)
            path = parsed.path
        else:
            # ถ้าเป็น path อยู่แล้ว
            path = url_or_path

        parts = path.split("/")  # ['', 'image', 'upload', 'vxxx', 'store', 'logo', 'abc.png', ...]

        if "upload" in parts:
            idx = parts.index("upload")
            # ข้าม 'upload' กับ 'vxxxxx'
            public_parts = parts[idx + 2 :]
        else:
            public_parts = parts[1:]

        if not public_parts:
            return None

        public_path = "/".join(public_parts)
        public_id, _ = os.path.splitext(public_path)
        return public_id
    except Exception:
        return None


# ===============================
# Helper: ตัด domain ออกจาก URL (ใช้กับ DISK)
# ===============================
def strip_domain_from_url(url: str) -> str:
    """
    ใช้ตอนเก็บ path ฝั่งดิสก์ หรือใช้ค้นหาไฟล์บนดิสก์

    เช่น:
    "http://localhost:8000/app/uploads/store/logo/a.png"
        → "app/uploads/store/logo/a.png"

    ขั้นตอน:
    1) ใช้ urlparse แยกส่วนของ URL
    2) เอาเฉพาะ .path
    3) ตัด '/' ตัวแรกออก
    """
    try:
        from urllib.parse import urlparse as _urlparse

        parsed = _urlparse(url)
        # path จะเป็น "/app/uploads/store/logo/a.png"
        path = parsed.path
        # ลบ '/' ตัวหน้าสุด → "app/uploads/store/logo/a.png"
        return path.lstrip("/")
    except Exception:
        # ถ้า parse ไม่ได้ก็คืนค่าเดิม
        return url


# ===============================
# API หลักที่ service ใช้เรียก
# ===============================

def save_file(upload_dir: str, file: UploadFile, filename: str | None = None) -> str:
    """
    DISK MODE   → return เป็น relative path เช่น "app/uploads/store/logo/xxx.png"
    CLOUDINARY → return เป็น secure_url เช่น "https://res.cloudinary.com/..."
    """
    if USE_CLOUDINARY:
        folder = _normalize_folder(upload_dir)

        upload_result = cloudinary.uploader.upload(
            file.file,
            folder=folder,
            resource_type="image",
            # ถ้าอยาก fix ชื่อไฟล์จริง ๆ ก็ใส่ public_id=filename ได้
        )
        return upload_result.get("secure_url")

    # -------- DISK MODE --------
    ensure_dir(upload_dir)
    filename = filename or file.filename
    file_path = os.path.join(upload_dir, filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    # เก็บเป็น path แบบ unix
    return file_path.replace("\\", "/")


def save_multiple_files(upload_dir: str, files: List[UploadFile]) -> List[str]:
    """
    DISK MODE   → list ของ relative path
    CLOUDINARY → list ของ URL
    """
    if USE_CLOUDINARY:
        folder = _normalize_folder(upload_dir)
        urls: List[str] = []

        for file in files:
            upload_result = cloudinary.uploader.upload(
                file.file,
                folder=folder,
                resource_type="image",
            )
            urls.append(upload_result.get("secure_url"))

        return urls

    # -------- DISK MODE --------
    ensure_dir(upload_dir)
    saved_paths: List[str] = []

    for file in files:
        ext = os.path.splitext(file.filename)[1] or ".jpg"
        unique_name = f"{uuid.uuid4().hex}{ext}"
        save_path = os.path.join(upload_dir, unique_name)

        with open(save_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        saved_paths.append(save_path.replace("\\", "/"))

    return saved_paths


def delete_file(file_path: str):
    """
    - CLOUDINARY:
        ถ้าเป็น URL/ path ของ Cloudinary → destroy ที่ Cloudinary
        ถ้าไม่ใช่ → ลองลบจากดิสก์ (เผื่อมี case เก่า)
    - DISK:
        ถ้าเป็น URL ของ domain ตัวเอง → ตัด domain ทิ้ง เหลือ path แล้วค่อยลบไฟล์
    """
    if not file_path:
        return

    # ---------- กรณี CLOUDINARY ----------
    if USE_CLOUDINARY:
        # Cloudinary URL หรือ path
        if file_path.startswith("http://") or file_path.startswith("https://") or "/image/upload/" in file_path:
            public_id = _extract_public_id_from_url_or_path(file_path)
            if not public_id:
                print("Cannot extract public_id from:", file_path)
            else:
                try:
                    cloudinary.uploader.destroy(public_id, invalidate=True)
                except Exception as e:
                    print("Cloudinary delete failed:", e)
            # เผื่อไฟล์เคยเก็บลงดิสก์ด้วย (safe)
        # ลองลบบนดิสก์เผื่อมีไฟล์ local
        cleaned = strip_domain_from_url(file_path).strip("/")
        if os.path.exists(cleaned):
            try:
                os.remove(cleaned)
            except Exception as e:
                print("Local file delete failed:", e)
        return

    # ---------- กรณี DISK MODE ----------
    path = file_path
    # ถ้าเก็บมาเป็น full URL → ตัด domain เหลือ path
    if path.startswith("http://") or path.startswith("https://"):
        path = strip_domain_from_url(path)

    cleaned = path.strip("/")
    if os.path.exists(cleaned):
        try:
            os.remove(cleaned)
        except Exception as e:
            print("Local file delete failed:", e)


def update_file(old_path: str, upload_dir: str, file: UploadFile, filename: str | None = None) -> str:
    delete_file(old_path)
    return save_file(upload_dir, file, filename)


def rollback_and_cleanup(db: Session, file_paths: str | list[str] | None):
    try:
        db.rollback()
        if isinstance(file_paths, list):
            for path in file_paths:
                delete_file(path)
        elif isinstance(file_paths, str):
            delete_file(file_paths)
    except Exception as e:
        print("Rollback cleanup failed:", e)



# import os
# import shutil
# from typing import List
# import uuid
# from fastapi import Path, UploadFile
# from sqlalchemy.orm import Session

# # ✅ สร้างโฟลเดอร์ปลายทางถ้ายังไม่มี
# def ensure_dir(path: str):
#     os.makedirs(path, exist_ok=True)


# # ✅ บันทึกไฟล์ (1 ไฟล์)
# def save_file(upload_dir: str, file: UploadFile, filename: str = None) -> str:
#     ensure_dir(upload_dir)
#     filename = filename or file.filename
#     file_path = os.path.join(upload_dir, filename)
#     with open(file_path, "wb") as buffer:
#         shutil.copyfileobj(file.file, buffer)
#     return file_path.replace("\\", "/")

# # ✅ บันทึกไฟล์หลายไฟล์พร้อมกัน
# def save_multiple_files(upload_dir: str, files: List[UploadFile]) -> List[str]:
#     """บันทึกหลายไฟล์พร้อมเปลี่ยนชื่อเป็น UUID"""
#     os.makedirs(upload_dir, exist_ok=True)
#     saved_paths = []
#     for file in files:
#         ext = os.path.splitext(file.filename)[1] or ".jpg"
#         unique_name = f"{uuid.uuid4().hex}{ext}"
#         save_path = os.path.join(upload_dir, unique_name)

#         with open(save_path, "wb") as f:
#             f.write(file.file.read())

#         saved_paths.append(os.path.relpath(save_path, start="app"))
#     return saved_paths

# # ✅ อัปเดตไฟล์ (ลบของเก่า + บันทึกใหม่)
# def update_file(old_path: str, upload_dir: str, file: UploadFile, filename: str = None) -> str:
#     delete_file(old_path)
#     return save_file(upload_dir, file, filename)

# # ✅ ลบไฟล์ (ตรวจสอบก่อนว่ามี)
# def delete_file(file_path: str):
#     if file_path:
#         cleaned = file_path.strip("/")
#         if os.path.exists(cleaned):
#             os.remove(cleaned)

# # ✅ Rollback DB + ลบไฟล์ (เวลา error)
# def rollback_and_cleanup(db: Session, file_paths: str | list[str] | None):
#     try:
#         db.rollback()
#         if isinstance(file_paths, list):
#             for path in file_paths:
#                 delete_file(path)
#         elif isinstance(file_paths, str):
#             delete_file(file_paths)
#     except Exception as e:
#         print("Rollback cleanup failed:", e)
