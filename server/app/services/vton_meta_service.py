from sqlalchemy.orm import Session
from app.repositories.vton_meta_repository import (
    create_vton_meta,
    get_all_vton_meta,
    get_vton_meta_by_id,
    update_vton_meta,
    delete_vton_meta,
)
from app.utils.response_handler import success_response, error_response
from app.utils.file_util import save_file, delete_file
import uuid
import os

UPLOAD_DIR = "app/static/vton_masks"

# Helper: handle both dict / pydantic object
def _to_dict(data):
    if hasattr(data, "dict"):
        return data.dict(exclude_unset=True)
    elif isinstance(data, dict):
        return data
    else:
        return {}

# ───────────────────────────────
# ✅ CREATE (รองรับทั้ง JSON และ form-data)
# ───────────────────────────────
def service_create_vton_meta(db: Session, data, mask_file=None):
    try:
        data_dict = _to_dict(data)

        # ✅ ถ้ามีไฟล์ภาพ mask
        if mask_file:
            ext = mask_file.filename.split(".")[-1]  # ดึงนามสกุลไฟล์
            filename = f"{uuid.uuid4().hex}.{ext}"
            print(filename)
            path = save_file(UPLOAD_DIR, mask_file, filename)
            data_dict["segmentation_mask_url"] = path

        vton = create_vton_meta(db, data_dict)
        return success_response("Created VTON metadata successfully", vton)

    except Exception as e:
        db.rollback()
        return error_response("Failed to create VTON metadata", {"error": str(e)})


# ───────────────────────────────
# ✅ READ ALL
# ───────────────────────────────
def service_get_all_vton_meta(db: Session):
    try:
        vtons = get_all_vton_meta(db)
        return success_response("Fetched all VTON metadata", vtons)
    except Exception as e:
        return error_response("Failed to fetch VTON metadata", {"error": str(e)})


# ───────────────────────────────
# ✅ READ BY ID
# ───────────────────────────────
def service_get_vton_meta_by_id(db: Session, vton_id):
    try:
        vton = get_vton_meta_by_id(db, vton_id)
        if not vton:
            return error_response("VTON metadata not found", status_code=404)
        return success_response("Fetched VTON metadata", vton)
    except Exception as e:
        return error_response("Failed to fetch VTON metadata", {"error": str(e)})


# ───────────────────────────────
# ✅ UPDATE (รองรับทั้ง JSON และ form-data)
# ───────────────────────────────
def service_update_vton_meta(db: Session, vton_id, data, mask_file=None):
    try:
        data_dict = _to_dict(data)

        vton = get_vton_meta_by_id(db, vton_id)
        if not vton:
            return error_response("VTON metadata not found", status_code=404)

        # ✅ ถ้ามีการอัปโหลด mask ใหม่
        if mask_file:
            # ลบไฟล์เก่าก่อน (ถ้ามี)
            if vton.segmentation_mask_url:
                delete_file(vton.segmentation_mask_url)
            ext = mask_file.filename.split(".")[-1]  # ดึงนามสกุลไฟล์
            filename = f"{uuid.uuid4().hex}.{ext}"
            path = save_file(UPLOAD_DIR, mask_file, filename)
            data_dict["segmentation_mask_url"] = path

        updated_vton = update_vton_meta(db, vton_id, data_dict)
        return success_response("Updated VTON metadata successfully", updated_vton)

    except Exception as e:
        db.rollback()
        return error_response("Failed to update VTON metadata", {"error": str(e)})


# ───────────────────────────────
# ✅ DELETE
# ───────────────────────────────
def service_delete_vton_meta(db: Session, vton_id):
    try:
        vton = get_vton_meta_by_id(db, vton_id)
        if not vton:
            return error_response("VTON metadata not found", status_code=404)

        # ✅ ลบไฟล์ mask จริงถ้ามี
        if vton.segmentation_mask_url:
            delete_file(vton.segmentation_mask_url)

        delete_vton_meta(db, vton_id)
        return success_response("Deleted VTON metadata successfully", {"vton_id": vton_id})

    except Exception as e:
        db.rollback()
        return error_response("Failed to delete VTON metadata", {"error": str(e)})
