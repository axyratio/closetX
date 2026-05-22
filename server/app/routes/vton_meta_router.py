from fastapi import APIRouter, Depends, UploadFile, File, Form, Body
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.vton_meta import VTONMetaCreate, VTONMetaUpdate
from app.services.vton_meta_service import (
    service_create_vton_meta,
    service_get_all_vton_meta,
    service_get_vton_meta_by_id,
    service_update_vton_meta,
    service_delete_vton_meta,
)
from app.core.authz import authenticate_token, authorize_role
import uuid

router = APIRouter(prefix="/vton-meta", tags=["VTON Meta"])

# ───────────────────────────────
# ✅ 1. CREATE (form-data) — ใช้ตอนอัปโหลดภาพ mask
# ───────────────────────────────
@router.post(
    "/upload",
    # dependencies=[Depends(authenticate_token()), Depends(authorize_role(["admin", "store_owner"]))],
)
def create_vton_meta_with_file(
    image_id: uuid.UUID = Form(...),
    pose_angle: str = Form(None),
    clothing_type: str = Form(None),
    model_used: str = Form(None),
    segmentation_mask: UploadFile = File(...),  # ✅ ต้องมีไฟล์
    db: Session = Depends(get_db),
):
    data = VTONMetaCreate(
        image_id=image_id,
        pose_angle=pose_angle,
        clothing_type=clothing_type,
        model_used=model_used,
    )
    return service_create_vton_meta(db, data, mask_file=segmentation_mask)


# ───────────────────────────────
# ✅ 2. CREATE (JSON only) — สำหรับระบบภายใน
# ───────────────────────────────
@router.post(
    "/",
    dependencies=[Depends(authenticate_token()), Depends(authorize_role(["admin", "store_owner"]))],
)
def create_vton_meta_json(data: VTONMetaCreate = Body(...), db: Session = Depends(get_db)):
    return service_create_vton_meta(db, data)


# ───────────────────────────────
# ✅ 3. READ ALL
# ───────────────────────────────
@router.get("/", dependencies=[Depends(authenticate_token())])
def get_all_vton_meta(db: Session = Depends(get_db)):
    return service_get_all_vton_meta(db)


# ───────────────────────────────
# ✅ 4. READ BY ID
# ───────────────────────────────
@router.get("/{vton_id}", dependencies=[Depends(authenticate_token())])
def get_vton_meta(vton_id: str, db: Session = Depends(get_db)):
    return service_get_vton_meta_by_id(db, vton_id)


# ───────────────────────────────
# ✅ 5. UPDATE (form-data)
# ───────────────────────────────
@router.patch(
    "/{vton_id}/upload",
    # dependencies=[Depends(authenticate_token()), Depends(authorize_role(["admin", "store_owner"]))],
)
def update_vton_meta_with_file(
    vton_id: str,
    pose_angle: str = Form(None),
    clothing_type: str = Form(None),
    model_used: str = Form(None),
    segmentation_mask: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    data = VTONMetaUpdate(
        pose_angle=pose_angle,
        clothing_type=clothing_type,
        model_used=model_used,
    )
    return service_update_vton_meta(db, vton_id, data, mask_file=segmentation_mask)


# ───────────────────────────────
# ✅ 6. UPDATE (JSON)
# ───────────────────────────────
@router.patch(
    "/{vton_id}",
    dependencies=[Depends(authenticate_token()), Depends(authorize_role(["admin", "store_owner"]))],
)
def update_vton_meta_json(vton_id: str, data: VTONMetaUpdate = Body(...), db: Session = Depends(get_db)):
    return service_update_vton_meta(db, vton_id, data)


# ───────────────────────────────
# ✅ 7. DELETE
# ───────────────────────────────
@router.delete(
    "/{vton_id}",
    # dependencies=[Depends(authenticate_token()), Depends(authorize_role(["admin", "store_owner"]))],
)
def delete_vton_meta(vton_id: str, db: Session = Depends(get_db)):
    return service_delete_vton_meta(db, vton_id)
