# app/models/password_reset_token.py
import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.db.database import Base
from app.utils.now_utc import now_utc


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    token_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    token = Column(String(36), unique=True, nullable=False, index=True)  # UUID v4
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=now_utc)
    expires_at = Column(DateTime(timezone=True), nullable=False)