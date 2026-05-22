import os
import uuid
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.product import ImageType, ProductImage
from app.utils.file_util import save_file, USE_CLOUDINARY, strip_domain_from_url
from app.utils.response_handler import success_response, error_response

router = APIRouter(prefix="/images", tags=["Images"])

# โฟลเดอร์ upload สำหรับโหมด DISK
UPLOAD_DIR = "app/uploads/product/images"


@router.get("/stream/{image_id}")
def stream_image(
    image_id: str,
    db: Session = Depends(get_db),
    # auth_user=Depends(authenticate_token())
):
    image = db.query(ProductImage).filter(ProductImage.image_id == image_id).first()
    if not image or not image.image_url:
        return error_response("ไม่พบรูปภาพ", {}, 404)

    # ✅ โหมด CLOUDINARY → redirect ไปที่ URL ของ Cloudinary เลย
    if USE_CLOUDINARY:
        return RedirectResponse(url=image.image_url)

    # ✅ โหมด DISK → อ่านไฟล์จากดิสก์ (รองรับกรณีเก็บเป็น full URL)
    # 1) ถ้า image_url เป็น full URL เช่น http://localhost:8000/uploads/...
    #    ให้ strip_domain_from_url ตัด domain ทิ้ง เหลือเฉพาะ path
    # 2) จาก path เช่น "/uploads/product/images/a.jpg"
    #    แปลงเป็น "app/uploads/product/images/a.jpg"
    rel_url_or_path = strip_domain_from_url(image.image_url).lstrip("/")
    file_path = os.path.join("app", rel_url_or_path)

    if not os.path.exists(file_path):
        return error_response("ไม่พบไฟล์ในระบบ", {"path": file_path}, 404)

    return FileResponse(path=file_path, media_type="image/jpeg")


@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    # auth_user=Depends(authenticate_token()),
    # auth_role=Depends(authorize_role(["user"])),
):
    try:
        # ✅ เช็คว่าเป็นไฟล์รูป
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="รองรับเฉพาะไฟล์รูปภาพเท่านั้น")

        original_name = file.filename or ""
        ext = os.path.splitext(original_name)[1] or ".jpg"

        unique_name = f"{uuid.uuid4().hex}{ext}"

        # ✅ อ่านข้อมูลไฟล์ก่อน (เพื่อจำกัดขนาด)
        content = await file.read()
        if len(content) > 5 * 1024 * 1024:  # 5 MB limit
            raise HTTPException(status_code=413, detail="ขนาดไฟล์ต้องไม่เกิน 5MB")

        # reset pointer ให้ save_file อ่านไฟล์ต่อได้
        file.file.seek(0)

        # ✅ ใช้ save_file จาก file_util (รองรับทั้ง DISK / CLOUDINARY)
        stored_path = save_file(UPLOAD_DIR, file, unique_name)

        # โหมด DISK: stored_path = "app/uploads/product/images/UUID.jpg"
        # โหมด CLOUD: stored_path = "https://res.cloudinary.com/..."
        if USE_CLOUDINARY:
            image_url = stored_path  # เก็บเป็น URL ของ Cloudinary
        else:
            # แปลงเป็น path relative จาก "app" แล้วนำหน้าด้วย "/"
            # เช่น "app/uploads/product/images/UUID.jpg" -> "/uploads/product/images/UUID.jpg"
            rel_path = os.path.relpath(stored_path, start="app").replace("\\", "/")
            image_url = "/" + rel_path

        image = ProductImage(
            product_id=None,
            variant_id=None,
            image_url=image_url,
            image_type=ImageType.NORMAL,
            display_order=0,
            is_main=False,
        )
        db.add(image)
        db.commit()
        db.refresh(image)

        return success_response(
            "อัปโหลดรูปภาพสำเร็จ",
            {
                "image_id": str(image.image_id),
                "url": image.image_url,  # frontend ใช้ BASE_URL + url นี้ (DISK) หรือใช้ตรง ๆ (CLOUDINARY)
            },
            201,
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        return error_response("อัปโหลดรูปภาพล้มเหลว", {"error": str(e)}, 500)
