from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime
import uuid

class UserTryOnImageBase(BaseModel):
    is_valid: Optional[bool] = True

class UserTryOnImageCreate(UserTryOnImageBase):
    user_id: uuid.UUID

class UserTryOnImageUpdate(UserTryOnImageBase):
    pass

class UserTryOnImageResponse(UserTryOnImageBase):
    user_image_id: uuid.UUID
    user_id: uuid.UUID
    image_url: HttpUrl
    uploaded_at: datetime

    class Config:
        orm_mode = True
