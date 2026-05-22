# File: app/db/seed_admin.py

from sqlalchemy.orm import Session
from app.models.user import User
from app.models.role import Role
from passlib.context import CryptContext
import uuid

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def seed_admin(db: Session):
    # หา role admin
    admin_role = db.query(Role).filter(Role.role_name == "admin").first()
    if not admin_role:
        print("❌ Role 'admin' not found, please seed roles first")
        return

    # เช็คว่ามี admin อยู่แล้วไหม
    existing = db.query(User).filter(User.username == "admin1").first()
    if not existing:
        admin = User(
            user_id=uuid.uuid4(),
            username="admin1",
            
            email="admin1@example.com",
            password=pwd_context.hash("Admin@123"),
            first_name="Admin",
            last_name="System",
            phone_number="0000000000",
            is_active=True,
            role_id=admin_role.role_id,
        )
        db.add(admin)
        db.commit()
        print("✅ Seeded admin successfully")
    else:
        print("ℹ️ Admin already exists, skipping")