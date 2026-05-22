import uuid
from pydantic import BaseModel
from typing import Optional


class RequestStoreApplication(BaseModel):
    first_name: str
    last_name: str
    status: str
    card_id: str
    phone_number: str
    birth_date: str
    store_address: str
    bank_account_name: str
    bank_account_number: str
    bank_name: str

class ApprovedStoreApplication(BaseModel):
    store_application_id: uuid.UUID
    

class UpdateStoreApplication(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    card_is_verified: Optional[bool] = None
    phone_number: Optional[str] = None
    birth_date: Optional[str] = None
    store_address: Optional[str] = None

class ResponseStoreApplication(BaseModel):
    message: str

    class Config:
        orm_mode = True
    

class ResponseUpdateStoreApplication(BaseModel):
    message: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    card_is_verified: Optional[bool] = None
    phone_number: Optional[str] = None
    birth_date: Optional[str] = None
    store_address: Optional[str] = None

    class Config:
        orm_mode = True


