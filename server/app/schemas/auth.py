from typing import Optional
from pydantic import BaseModel
from uuid import UUID

class Authorize(BaseModel):

    user_id: UUID
    role: Optional[str] =None

class ResponseRegisterError(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
