# app/services/chat_service.py
from sqlalchemy.orm import Session
from typing import Optional, List
from uuid import UUID
from fastapi import HTTPException, UploadFile
import os
import uuid as uuid_lib
from app.repositories.chat_repository import ChatRepository
from app.repositories.store_repository import StoreRepository
from app.models.chat_message import MessageType
from app.schemas.chat import ChatConversationResponse, ChatMessageResponse
from app.utils.now_utc import now_utc
from app.utils.file_util import save_file, delete_file, rollback_and_cleanup, USE_CLOUDINARY
from app.core.config import settings
import asyncio
from app.services.notification_service import NotificationService
from app.models.store import Store

def _make_full_url(path_or_url: str | None) -> str | None:
    """แปลง path หรือ URL ให้เป็น full URL"""
    if not path_or_url:
        return None
    
    if path_or_url.startswith("http://") or path_or_url.startswith("https://"):
        return path_or_url
    
    clean_path = path_or_url.lstrip("/")
    return f"{settings.BASE_URL}/{clean_path}"


class ChatService:
    
    @staticmethod
    def get_or_create_conversation(
        db: Session,
        user_id: UUID,
        store_id: UUID
    ):
        """ดึง conversation ที่มีอยู่แล้ว หรือสร้างใหม่"""
        store = StoreRepository.get_store_by_id(db, store_id)
        if not store:
            raise HTTPException(status_code=404, detail="Store not found")
        
        if store.user_id == user_id:
            raise HTTPException(
                status_code=400, 
                detail="ไม่สามารถสร้างบทสนทนากับร้านค้าของตัวเองได้"
            )
        
        conversation = ChatRepository.get_conversation_by_user_and_store(
            db, user_id, store_id
        )
        
        if not conversation:
            conversation = ChatRepository.create_conversation(
                db, user_id, store_id
            )
        
        return conversation
    
    @staticmethod
    def get_user_conversations(
        db: Session,
        user_id: UUID,
        skip: int = 0,
        limit: int = 20
    ) -> List[ChatConversationResponse]:
        """ดึงรายการ conversation ทั้งหมดของ user (ลูกค้า)"""
        conversations = ChatRepository.get_user_conversations(db, user_id, skip, limit)
        
        result = []
        for conv in conversations:
            messages = ChatRepository.get_messages_by_conversation(
                db, conv.conversation_id, skip=0, limit=5
            )
            
            unread_count = ChatRepository.get_unread_count(
                db, conv.conversation_id, user_id
            )
            
            store_logo_url = _make_full_url(conv.store.logo_path) if conv.store else None
            
            result.append(ChatConversationResponse(
                conversation_id=conv.conversation_id,
                user_id=conv.user_id,
                store_id=conv.store_id,
                last_message=conv.last_message,
                last_message_at=conv.last_message_at,
                created_at=conv.created_at,
                store_name=conv.store.name if conv.store else None,
                store_logo_path=store_logo_url,
                messages=[
                    ChatMessageResponse(
                        message_id=msg.message_id,
                        conversation_id=msg.conversation_id,
                        sender_id=msg.sender_id,
                        content=msg.content,
                        message_type=msg.message_type.value,
                        image_path=_make_full_url(msg.image_path),
                        is_read=msg.is_read,
                        created_at=msg.created_at,
                        sender_username=msg.sender.username if msg.sender else None,
                        sender_first_name=msg.sender.first_name if msg.sender else None,
                        sender_last_name=msg.sender.last_name if msg.sender else None
                    ) for msg in messages
                ],
                unread_count=unread_count
            ))
        
        return result
    
    @staticmethod
    def get_store_conversations(
        db: Session,
        store_id: UUID,
        skip: int = 0,
        limit: int = 20
    ) -> List[ChatConversationResponse]:
        """ดึงรายการ conversation ทั้งหมดของร้านค้า (สำหรับเจ้าของร้าน)"""
        conversations = ChatRepository.get_store_conversations(db, store_id, skip, limit)
        
        store = StoreRepository.get_store_by_id(db, store_id)
        store_owner_id = store.user_id if store else None
        
        result = []
        for conv in conversations:
            messages = ChatRepository.get_messages_by_conversation(
                db, conv.conversation_id, skip=0, limit=5
            )
            
            unread_count = ChatRepository.get_unread_count(
                db, conv.conversation_id, store_owner_id
            ) if store_owner_id else 0
            
            result.append(ChatConversationResponse(
                conversation_id=conv.conversation_id,
                user_id=conv.user_id,
                store_id=conv.store_id,
                last_message=conv.last_message,
                last_message_at=conv.last_message_at,
                created_at=conv.created_at,
                store_name=conv.store.name if conv.store else None,
                user_username=conv.user.username if conv.user else None,
                user_first_name=conv.user.first_name if conv.user else None,
                user_last_name=conv.user.last_name if conv.user else None,
                messages=[
                    ChatMessageResponse(
                        message_id=msg.message_id,
                        conversation_id=msg.conversation_id,
                        sender_id=msg.sender_id,
                        content=msg.content,
                        message_type=msg.message_type.value,
                        image_path=_make_full_url(msg.image_path),
                        is_read=msg.is_read,
                        created_at=msg.created_at,
                        sender_username=msg.sender.username if msg.sender else None,
                        sender_first_name=msg.sender.first_name if msg.sender else None,
                        sender_last_name=msg.sender.last_name if msg.sender else None
                    ) for msg in messages
                ],
                unread_count=unread_count
            ))
        
        return result
    
    @staticmethod
    def get_conversation_messages(
        db: Session,
        conversation_id: UUID,
        user_id: UUID,
        last_message_id: Optional[str] = None,
        limit: int = 20
    ) -> List[ChatMessageResponse]:
        """
        ดึงข้อความใน conversation แบบ cursor-based pagination
        
        Args:
            conversation_id: ID ของ conversation
            user_id: ID ของผู้ใช้
            last_message_id: ID ของข้อความเก่าที่สุดที่มีอยู่ในเครื่อง (สำหรับโหลดข้อความเก่ากว่า)
            limit: จำนวนข้อความที่ต้องการ (default 20)
        
        Returns:
            List ของข้อความเรียงจาก **ใหม่ไปเก่า** (DESC)
        """
        # Verify user has access
        conversation = ChatRepository.get_conversation_by_id(db, conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        has_access = False
        if conversation.user_id == user_id:
            has_access = True
        else:
            store = StoreRepository.get_store_by_id(db, conversation.store_id)
            if store and store.user_id == user_id:
                has_access = True
        
        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # ✅ ใช้ cursor-based pagination
        messages = ChatRepository.get_messages_before_id(
            db, conversation_id, last_message_id, limit
        )
        
        return [
            ChatMessageResponse(
                message_id=msg.message_id,
                conversation_id=msg.conversation_id,
                sender_id=msg.sender_id,
                content=msg.content,
                message_type=msg.message_type.value,
                image_path=_make_full_url(msg.image_path),
                is_read=msg.is_read,
                created_at=msg.created_at,
                sender_username=msg.sender.username if msg.sender else None,
                sender_first_name=msg.sender.first_name if msg.sender else None,
                sender_last_name=msg.sender.last_name if msg.sender else None
            ) for msg in messages
        ]
    
    @staticmethod
    def send_text_message(
        db: Session,
        conversation_id: UUID,
        sender_id: UUID,
        content: str
    ) -> ChatMessageResponse:
        """ส่งข้อความ"""
        conversation = ChatRepository.get_conversation_by_id(db, conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        has_access = False
        if conversation.user_id == sender_id:
            has_access = True
        else:
            store = StoreRepository.get_store_by_id(db, conversation.store_id)
            if store and store.user_id == sender_id:
                has_access = True
        
        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied")
        
        message = ChatRepository.create_message(
            db=db,
            conversation_id=conversation_id,
            sender_id=sender_id,
            content=content,
            message_type=MessageType.TEXT
        )
        
        # 🔔 แจ้งเตือนข้อความใหม่
        try:


            # หาผู้รับ: ถ้า sender=buyer → แจ้ง seller, ถ้า sender=seller → แจ้ง buyer
            if conversation.user_id == sender_id:
                # sender เป็น buyer → แจ้ง seller (เจ้าของร้าน)
                store = db.query(Store).filter(Store.store_id == conversation.store_id).first()
                recipient_id = store.user_id if store else None
            else:
                # sender เป็น seller → แจ้ง buyer
                recipient_id = conversation.user_id

            if recipient_id:
                sender_user = message.sender
                sender_name = sender_user.first_name or sender_user.username if sender_user else "ผู้ใช้"
                preview = (message.content or "ส่งรูปภาพ")[:80]

                asyncio.get_event_loop().run_until_complete(
                    NotificationService.notify(
                        db,
                        event="NEW_MESSAGE",
                        recipient_user_id=recipient_id,
                        sender_name=sender_name,
                        message_preview=preview,
                        conversation_id=conversation_id,
                    )
                )
        except Exception as e:
            print(f"⚠️ NEW_MESSAGE notification failed: {e}")
        
        return ChatMessageResponse(
            message_id=message.message_id,
            conversation_id=message.conversation_id,
            sender_id=message.sender_id,
            content=message.content,
            message_type=message.message_type.value,
            image_path=_make_full_url(message.image_path),
            is_read=message.is_read,
            created_at=message.created_at,
            sender_username=message.sender.username if message.sender else None,
            sender_first_name=message.sender.first_name if message.sender else None,
            sender_last_name=message.sender.last_name if message.sender else None
        )
    
    @staticmethod
    def send_image_message(
        db: Session,
        conversation_id: UUID,
        sender_id: UUID,
        image: UploadFile
    ) -> ChatMessageResponse:
        """ส่งรูปภาพ"""
        conversation = ChatRepository.get_conversation_by_id(db, conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        has_access = False
        if conversation.user_id == sender_id:
            has_access = True
        else:
            store = StoreRepository.get_store_by_id(db, conversation.store_id)
            if store and store.user_id == sender_id:
                has_access = True
        
        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied")
        
        if not image.content_type or not image.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        image_path = None
        try:
            upload_dir = "app/uploads/chat/images"
            ext = os.path.splitext(image.filename)[1] if image.filename else ".jpg"
            filename = f"chat_{uuid_lib.uuid4().hex}{ext}"
            
            image_path = save_file(upload_dir, image, filename)
            
            message = ChatRepository.create_message(
                db=db,
                conversation_id=conversation_id,
                sender_id=sender_id,
                image_path=image_path,
                message_type=MessageType.IMAGE
            )
            
            db.commit()
            db.refresh(message)
            
            return ChatMessageResponse(
                message_id=message.message_id,
                conversation_id=message.conversation_id,
                sender_id=message.sender_id,
                content=message.content,
                message_type=message.message_type.value,
                image_path=_make_full_url(message.image_path),
                is_read=message.is_read,
                created_at=message.created_at,
                sender_username=message.sender.username if message.sender else None,
                sender_first_name=message.sender.first_name if message.sender else None,
                sender_last_name=message.sender.last_name if message.sender else None
            )
            
        except Exception as e:
            rollback_and_cleanup(db, image_path)
            raise HTTPException(status_code=500, detail=f"Failed to send image: {str(e)}")
    
    @staticmethod
    def mark_as_read(
        db: Session,
        conversation_id: UUID,
        user_id: UUID
    ):
        """ทำเครื่องหมายว่าอ่านแล้ว"""
        ChatRepository.mark_messages_as_read(db, conversation_id, user_id)