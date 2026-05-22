from sqlalchemy.orm import Session
from app.models.product import UserTryOnImage
import uuid

def create_user_image(db: Session, data: dict):
    image = UserTryOnImage(**data)
    db.add(image)
    db.commit()
    db.refresh(image)
    return image

def get_all_user_images(db: Session):
    return db.query(UserTryOnImage).all()

def get_user_image_by_id(db: Session, user_image_id: uuid.UUID):
    return db.query(UserTryOnImage).filter(UserTryOnImage.user_image_id == user_image_id).first()

def update_user_image(db: Session, user_image_id: uuid.UUID, data: dict):
    image = db.query(UserTryOnImage).filter(UserTryOnImage.user_image_id == user_image_id).first()
    if not image:
        return None
    for key, value in data.items():
        setattr(image, key, value)
    db.commit()
    db.refresh(image)
    return image

def delete_user_image(db: Session, user_image_id: uuid.UUID):
    image = db.query(UserTryOnImage).filter(UserTryOnImage.user_image_id == user_image_id).first()
    if not image:
        return None
    db.delete(image)
    db.commit()
    return image
