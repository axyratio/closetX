from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime
import uuid


class VTONMetaBase(BaseModel):
    pose_angle: Optional[str] = None
    clothing_type: Optional[str] = None
    segmentation_mask_url: Optional[HttpUrl] = None
    model_used: Optional[str] = None


class VTONMetaCreate(VTONMetaBase):
    image_id: uuid.UUID


class VTONMetaUpdate(VTONMetaBase):
    pass


class VTONMetaResponse(VTONMetaBase):
    vton_id: uuid.UUID
    image_id: uuid.UUID
    created_at: datetime

    class Config:
        orm_mode = True
