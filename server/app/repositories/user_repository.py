
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.user import User
from uuid import UUID
from sqlalchemy import or_
from app.core.security import hash_password



def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()

def get_user_by_username(db: Session, username: str) -> User | None:
    return db.query(User).filter(User.username == username).first()

def get_user_id_by_username(db: Session, username: str) -> UUID | None:
    user = db.query(User).filter(User.username == username).first()
    return user if user else None

def get_user_by_user_id(db: Session, user_id: str):
    user = db.query(User).filter(User.user_id == user_id).first()
    return user if user else None

def get_by_identity(db: Session, identity: str) -> User | None:
    """
    คืน User โดยค้นจาก username หรือ email
    """
    print("identity in get_by_identity",identity)
    return db.query(User).filter(
        or_(User.username == identity, User.email == identity)
    ).first()

def create_user(db: Session, user_data: dict) -> User:
    if user_data.get("role_id") is None:
        user_data["role_id"] = 1
    user = User(**user_data)
    db.add(user)
    db.flush()
    db.refresh(user)
    return user

def update_is_active_status(db: Session, user_id: UUID, is_active: bool) -> User:
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return None
    user.is_active = is_active
    db.flush()
    db.refresh(user)
    return user

def update_status(db: Session, user_id: UUID, status: str) -> User:
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return None
    user.status = status
    db.flush()
    db.refresh(user)
    return user

def delete_account_by_user_id(db: Session, user_id: UUID) -> User:
    # ค้นหา user ก่อน
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # เก็บ log ก่อนลบ
    print(f"[DELETE ACCOUNT] User ID: {user.id}, Username: {user.username}, Email: {user.email}")
    
    # ลบออกจาก DB
    db.delete(user)
    db.flush()
    
    return True


from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
from app.models.user import User

class UserRepository:
    
    # ... ฟังก์ชันอื่นๆ ที่มีอยู่แล้ว ...
    
    @staticmethod
    def get_user_by_id(db: Session, user_id: UUID) -> Optional[User]:
        """ดึงข้อมูล user จาก user_id"""
        return db.query(User).filter(User.user_id == user_id).first()
    
    # ถ้ามีฟังก์ชันนี้อยู่แล้วก็ไม่ต้องเพิ่ม