from sqlalchemy.orm import Session
from app.models.product import VTONMeta
import uuid

# ───────────────────────────────
# ✅ CREATE
# ───────────────────────────────
def create_vton_meta(db: Session, data: dict):
    vton = VTONMeta(**data)   # ✅ ใช้ dict ตรง ๆ
    db.add(vton)
    db.commit()
    db.refresh(vton)
    return vton


# ───────────────────────────────
# ✅ READ ALL
# ───────────────────────────────
def get_all_vton_meta(db: Session):
    return db.query(VTONMeta).all()


# ───────────────────────────────
# ✅ READ BY ID
# ───────────────────────────────
def get_vton_meta_by_id(db: Session, vton_id: uuid.UUID):
    return db.query(VTONMeta).filter(VTONMeta.vton_id == vton_id).first()


# ───────────────────────────────
# ✅ UPDATE
# ───────────────────────────────
def update_vton_meta(db: Session, vton_id: uuid.UUID, data: dict):
    vton = db.query(VTONMeta).filter(VTONMeta.vton_id == vton_id).first()
    if not vton:
        return None
    for key, value in data.items():
        setattr(vton, key, value)
    db.commit()
    db.refresh(vton)
    return vton


# ───────────────────────────────
# ✅ DELETE
# ───────────────────────────────
def delete_vton_meta(db: Session, vton_id: uuid.UUID):
    vton = db.query(VTONMeta).filter(VTONMeta.vton_id == vton_id).first()
    if not vton:
        return None
    db.delete(vton)
    db.commit()
    return vton
