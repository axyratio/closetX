from pydantic import BaseModel

class RoleBase(BaseModel):
    role_name: str

class RoleOut(RoleBase):
    role_id: int

    class Config:
        orm_mode = True
