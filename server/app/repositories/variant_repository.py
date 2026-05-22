import uuid
from sqlalchemy.orm import Session, joinedload
from app.models.product import ProductVariant, ProductImage

def get_all_variants(db: Session):
    return (
        db.query(ProductVariant)
        .options(
            joinedload(ProductVariant.images).joinedload(ProductImage.vton_meta),
        )
        .filter(ProductVariant.is_active.is_(True))
        .all()
    )


# ✅ ดึง variant ตาม id (พร้อม images + vton_meta)
def get_variant_by_id(db: Session, variant_id: str):
    try:
        # ✅ แปลงให้แน่ใจว่าเป็น UUID จริง
        variant_uuid = uuid.UUID(str(variant_id))

        variant = (
            db.query(ProductVariant)
            .options(
                joinedload(ProductVariant.images).joinedload(ProductImage.vton_meta)
            )
            .filter(ProductVariant.variant_id == variant_uuid)
            .first()
        )

        return variant
    except ValueError:
        # ถ้า id ไม่ใช่ UUID
        return None

def create_variant(db: Session, variant: ProductVariant):
    db.add(variant)
    db.commit()
    db.refresh(variant)
    return variant

def update_variant(db: Session, variant: ProductVariant):
    db.commit()
    db.refresh(variant)
    return variant

def delete_variant(db: Session, variant: ProductVariant):
    variant.is_active = False
    db.commit()
