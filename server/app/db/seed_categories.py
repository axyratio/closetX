# File: app/db/seed_categories.py

from sqlalchemy.orm import Session
from app.models.category import Category
import uuid

def seed_categories(db: Session):
    categories = [
        {
            "name": "เสื้อยืด",
            "slug": "tshirt",
        },
        {
            "name": "เสื้อเชิ้ต",
            "slug": "shirt",
        },
        {
            "name": "เสื้อทางการ",
            "slug": "formal",
        },
        {
            "name": "เสื้อน่ารัก",
            "slug": "cute",
        },
        {
            "name": "เสื้อกีฬา",
            "slug": "sport",
        }
    ]
    
    for cat_data in categories:
        existing = db.query(Category).filter(Category.slug == cat_data["slug"]).first()
        if not existing:
            category = Category(**cat_data)
            db.add(category)
    
    db.commit()
    print("✅ Seeded categories successfully")