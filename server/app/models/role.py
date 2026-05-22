# models/role.py
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.db.database import Base

class Role(Base):
    __tablename__ = "roles"
    role_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    role_name = Column(String, unique=True, nullable=False, default="user")
    users = relationship("User", back_populates="role")
