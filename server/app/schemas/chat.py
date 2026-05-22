# app/schemas/chat.py
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID

# Message Schemas
class ChatMessageBase(BaseModel):
    content: Optional[str] = None
    message_type: str = "text"  # "text" or "image"

class ChatMessageCreate(ChatMessageBase):
    conversation_id: UUID

class ChatMessageResponse(ChatMessageBase):
    message_id: UUID
    conversation_id: UUID
    sender_id: UUID
    image_path: Optional[str] = None
    is_read: bool
    created_at: datetime
    
    # Sender info
    sender_username: Optional[str] = None
    sender_first_name: Optional[str] = None
    sender_last_name: Optional[str] = None

    class Config:
        from_attributes = True

# Conversation Schemas
class ChatConversationBase(BaseModel):
    store_id: UUID

class ChatConversationCreate(ChatConversationBase):
    pass

class ChatConversationResponse(BaseModel):
    conversation_id: UUID
    user_id: UUID
    store_id: UUID
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    created_at: datetime
    
    # Store info
    store_name: Optional[str] = None
    store_logo_path: Optional[str] = None
    
    # User info
    user_username: Optional[str] = None
    user_first_name: Optional[str] = None
    user_last_name: Optional[str] = None
    
    # Latest messages
    messages: List[ChatMessageResponse] = []
    
    # Unread count
    unread_count: int = 0

    class Config:
        from_attributes = True

# WebSocket Message Schema
class WSMessagePayload(BaseModel):
    action: str  # "send_message", "send_image", "mark_read"
    conversation_id: Optional[UUID] = None
    content: Optional[str] = None
    message_type: Optional[str] = "text"