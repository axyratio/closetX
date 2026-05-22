# app/repositories/product_variant_repository.py
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.product import Product, ProductVariant, ProductImage, ImageType


def get_variants_by_product(db: Session, product_id: str) -> List[ProductVariant]:
  return (
      db.query(ProductVariant)
      .filter(ProductVariant.product_id == product_id)
      .all()
  )


def delete_variants_by_product(db: Session, product_id: str):
  variants = get_variants_by_product(db, product_id)
  for v in variants:
      for img in v.images:
          db.delete(img)
      db.delete(v)
  db.commit()


def get_product_variant_images(db: Session, variant_id: str) -> List[ProductImage]:
  return (
      db.query(ProductImage)
      .filter(ProductImage.variant_id == variant_id)
      .all()
  )
