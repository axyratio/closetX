# app/repositories/shipping_address_repository.py
from sqlalchemy.orm import Session
from app.models.shipping_address import ShippingAddress
from app.schemas.shipping_address import (
    ShippingAddressCreate,
    ShippingAddressUpdate,
)


def create_shipping_address_repo(db: Session, user_id: str, data: ShippingAddressCreate):
    try:
        # ถ้าอันใหม่ถูกตั้งเป็น default → เคลียร์ของเก่าทั้งหมดของ user ให้เป็น False ก่อน
        if data.is_default:
            db.query(ShippingAddress).filter(
                ShippingAddress.user_id == user_id,
                ShippingAddress.is_default == True,
            ).update({ShippingAddress.is_default: False})

        new_addr = ShippingAddress(user_id=user_id, **data.dict())
        db.add(new_addr)
        db.commit()
        db.refresh(new_addr)
        return new_addr
    except Exception as e:
        db.rollback()
        raise e


def get_shipping_address_by_id_repo(db: Session, ship_addr_id: str):
    try:
        return (
            db.query(ShippingAddress)
            .filter(ShippingAddress.ship_addr_id == ship_addr_id)
            .first()
        )
    except Exception as e:
        raise e


def get_all_shipping_addresses_repo(db: Session, user_id: str):
    try:
        # ดึงทั้งหมดของ user โดยเรียง default ก่อน
        return (
            db.query(ShippingAddress)
            .filter(ShippingAddress.user_id == user_id)
            .order_by(
                ShippingAddress.is_default.desc(),  # default=true ขึ้นก่อน
                ShippingAddress.created_at.desc(),  # ที่เหลือใช้ created_at ซ้อน
            )
            .all()
        )
    except Exception as e:
        raise e


def get_default_shipping_address_repo(db: Session, user_id: str):
    try:
        return (
            db.query(ShippingAddress)
            .filter(
                ShippingAddress.user_id == user_id,
                ShippingAddress.is_default == True,
            )
            .first()
        )
    except Exception as e:
        raise e


def update_shipping_address_repo(
    db: Session, ship_addr_id: str, data: ShippingAddressUpdate
):
    try:
        addr = (
            db.query(ShippingAddress)
            .filter(ShippingAddress.ship_addr_id == ship_addr_id)
            .first()
        )
        if not addr:
            return None

        payload = data.dict()

        # ถ้า request นี้ตั้ง is_default=True → เคลียร์ของ address อื่นใน user เดียวกัน
        if payload.get("is_default"):
            db.query(ShippingAddress).filter(
                ShippingAddress.user_id == addr.user_id,
                ShippingAddress.ship_addr_id != ship_addr_id,
            ).update({ShippingAddress.is_default: False})

        for key, value in payload.items():
            setattr(addr, key, value)

        db.commit()
        db.refresh(addr)
        return addr
    except Exception as e:
        db.rollback()
        raise e


def delete_shipping_address_repo(db: Session, ship_addr_id: str):
    try:
        addr = (
            db.query(ShippingAddress)
            .filter(ShippingAddress.ship_addr_id == ship_addr_id)
            .first()
        )
        if not addr:
            return None

        db.delete(addr)
        db.commit()
        return addr
    except Exception as e:
        db.rollback()
        raise e
