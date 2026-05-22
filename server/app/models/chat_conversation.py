# app/models/chat_conversation.py
import uuid
from sqlalchemy import Column, DateTime, ForeignKey, String, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.database import Base
from app.utils.now_utc import now_utc

class ChatConversation(Base):
    __tablename__ = "chat_conversations"

    conversation_id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False, index=True)
    store_id = Column(UUID(as_uuid=True), ForeignKey("stores.store_id"), nullable=False, index=True)
    
    last_message = Column(String, nullable=True)
    last_message_at = Column(DateTime(timezone=True), nullable=True)

    # --- ส่วนที่ต้องเพิ่มใหม่ ---
    # เก็บว่าใครเป็นคนส่งข้อความล่าสุด ('USER' หรือ 'STORE')
    last_message_from = Column(String, nullable=True) 
    
    # เก็บจำนวนที่ยังไม่ได้อ่านแยกฝั่ง (ช่วยให้ Query Badge ได้เร็วมาก)
    user_unread_count = Column(Integer, default=0, nullable=False)
    store_unread_count = Column(Integer, default=0, nullable=False)
    # -----------------------
    
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    store = relationship("Store", foreign_keys=[store_id])
    messages = relationship("ChatMessage", back_populates="conversation", cascade="all, delete-orphan")