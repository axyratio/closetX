# app/routes/chat_router.py
from fastapi import APIRouter, Depends, UploadFile, File, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.db.database import get_db
from app.core.authz import authenticate_token
from app.models.user import User
from app.services.chat_service import ChatService
from app.repositories.store_repository import StoreRepository
from app.repositories.chat_repository import ChatRepository
from app.schemas.chat import (
    ChatConversationCreate,
    ChatConversationResponse,
    ChatMessageResponse
)
from app.realtime.socket_manager import manager

router = APIRouter(prefix="/api/chat", tags=["Chat"])

# ========== Conversation Endpoints ==========

@router.post("/conversations", response_model=ChatConversationResponse)
def create_or_get_conversation(
    data: ChatConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token())
):
    """สร้างหรือดึง conversation ระหว่าง user กับร้านค้า"""
    conversation = ChatService.get_or_create_conversation(
        db=db,
        user_id=current_user.user_id,
        store_id=data.store_id
    )
    
    return ChatConversationResponse(
        conversation_id=conversation.conversation_id,
        user_id=conversation.user_id,
        store_id=conversation.store_id,
        last_message=conversation.last_message,
        last_message_at=conversation.last_message_at,
        created_at=conversation.created_at,
        store_name=conversation.store.name if conversation.store else None,
        store_logo_path=conversation.store.logo_path if conversation.store else None,
        messages=[],
        unread_count=0
    )

@router.get("/conversations/user", response_model=List[ChatConversationResponse])
def get_user_conversations(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token())
):
    """ดึงรายการ conversation ทั้งหมดของ user"""
    return ChatService.get_user_conversations(
        db=db,
        user_id=current_user.user_id,
        skip=skip,
        limit=limit
    )

@router.get("/conversations/store/{store_id}", response_model=List[ChatConversationResponse])
def get_store_conversations(
    store_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token())
):
    """ดึงรายการ conversation ทั้งหมดของร้านค้า"""
    store = StoreRepository.get_store_by_id(db, store_id)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    if store.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="You don't own this store")
    
    return ChatService.get_store_conversations(
        db=db,
        store_id=store_id,
        skip=skip,
        limit=limit
    )

# ========== Message Endpoints ==========

@router.get("/conversations/{conversation_id}/messages", response_model=List[ChatMessageResponse])
def get_conversation_messages(
    conversation_id: UUID,
    last_message_id: Optional[str] = Query(None, description="ID ของข้อความเก่าที่สุดในเครื่อง (สำหรับโหลดเพิ่ม)"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token())
):
    """
    ดึงข้อความใน conversation แบบ cursor-based pagination
    
    - **ครั้งแรก**: ไม่ส่ง last_message_id → ได้ข้อความล่าสุด 20 ข้อความ
    - **Load More**: ส่ง last_message_id = ID ของข้อความเก่าที่สุดในเครื่อง → ได้ข้อความเก่ากว่านั้นอีก 20
    
    Response: เรียงจาก **ใหม่ไปเก่า** (DESC) เพื่อให้ Frontend reverse ได้ง่าย
    """
    return ChatService.get_conversation_messages(
        db=db,
        conversation_id=conversation_id,
        user_id=current_user.user_id,
        last_message_id=last_message_id,
        limit=limit
    )

@router.post("/conversations/{conversation_id}/messages/image", response_model=ChatMessageResponse)
async def send_image_message(
    conversation_id: UUID,
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token())
):
    """ส่งรูปภาพใน conversation พร้อม broadcast แบบ realtime"""
    # ส่งรูปภาพ
    message_response = ChatService.send_image_message(
        db=db,
        conversation_id=conversation_id,
        sender_id=current_user.user_id,
        image=image
    )
    
    # ✅ Broadcast ผ่าน WebSocket แบบ realtime
    try:
        room_key = f"conversation:{str(conversation_id)}"
        await manager.broadcast(room_key, {
            "type": "new_message",
            "message": {
                "message_id": str(message_response.message_id),
                "conversation_id": str(message_response.conversation_id),
                "sender_id": str(message_response.sender_id),
                "content": message_response.content,
                "message_type": message_response.message_type,
                "image_path": message_response.image_path,
                "is_read": message_response.is_read,
                "created_at": message_response.created_at.isoformat()
                if isinstance(message_response.created_at, datetime)
                else message_response.created_at,
                "sender_username": message_response.sender_username,
                "sender_first_name": message_response.sender_first_name,
                "sender_last_name": message_response.sender_last_name,
            }
        })
        print(f"[ImageMessage] Broadcast to room {room_key}")
        
        # ส่ง notification + update unread
        conversation = ChatRepository.get_conversation_by_id(db, conversation_id)
        if conversation:
            other_user_id = None
            
            if str(conversation.user_id) != str(current_user.user_id):
                other_user_id = str(conversation.user_id)
            else:
                store = StoreRepository.get_store_by_id(db, conversation.store_id)
                if store:
                    other_user_id = str(store.user_id)
            
            if other_user_id:
                unread_count = ChatRepository.get_unread_count(
                    db, conversation_id, UUID(other_user_id)
                )
                
                await manager.broadcast(f"user:{other_user_id}", {
                    "type": "unread_update",
                    "conversation_id": str(conversation_id),
                    "unread_count": unread_count,
                    "last_message": "📷 ภาพ",
                    "last_message_at": message_response.created_at.isoformat()
                    if isinstance(message_response.created_at, datetime)
                    else message_response.created_at
                })
                print(f"[ImageMessage] Sent unread update to user {other_user_id}")
    
    except Exception as e:
        print(f"[ImageMessage] Broadcast error: {e}")
    
    return message_response

@router.post("/conversations/{conversation_id}/read")
def mark_conversation_as_read(
    conversation_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(authenticate_token())
):
    """ทำเครื่องหมายว่าอ่านข้อความใน conversation แล้ว"""
    ChatService.mark_as_read(
        db=db,
        conversation_id=conversation_id,
        user_id=current_user.user_id
    )
    return {"message": "Marked as read"}