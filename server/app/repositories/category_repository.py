# File: app/repositories/category_repository.py

from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.category import Category
from app.models.product import Product


def create_category(db: Session, category: Category) -> Category:
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def get_all_categories(
    db: Session, 
    active_only: bool = True,
    include_count: bool = False
) -> List[Category]:
    query = db.query(Category)
    
    if active_only:
        query = query.filter(Category.is_active == True)
    
    query = query.order_by(Category.name.asc())
    
    categories = query.all()
    
    if include_count:
        for cat in categories:
            cat.product_count = db.query(Product).filter(
                Product.category_id == cat.category_id,
                Product.is_active == True
            ).count()
    
    return categories


def get_category_by_id(db: Session, category_id: str) -> Optional[Category]:
    return db.query(Category).filter(Category.category_id == category_id).first()


def get_category_by_slug(db: Session, slug: str) -> Optional[Category]:
    return db.query(Category).filter(Category.slug == slug).first()


def update_category(db: Session, category: Category) -> Category:
    db.commit()
    db.refresh(category)
    return category


# ตัวอย่างที่ควรจะเป็นใน category_repository.py
def delete_category(db: Session, category: Category):
    category.is_active = False  # นี่คือการทำ Soft Delete
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def hard_delete_category(db: Session, category: Category) -> None:
    # Hard delete - ระวังใช้!
    db.delete(category)
    db.commit()