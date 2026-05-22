# app/repositories/chat_repository.py
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import Optional, List
from uuid import UUID
from app.models.chat_conversation import ChatConversation
from app.models.chat_message import ChatMessage, MessageType
from app.utils.now_utc import now_utc

class ChatRepository:
    
    @staticmethod
    def create_conversation(
        db: Session,
        user_id: UUID,
        store_id: UUID
    ) -> ChatConversation:
        """สร้าง conversation ใหม่"""
        conversation = ChatConversation(
            user_id=user_id,
            store_id=store_id,
            user_unread_count=0,
            store_unread_count=0
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        return conversation
    
    @staticmethod
    def get_conversation_by_id(db: Session, conversation_id: UUID) -> Optional[ChatConversation]:
        """ดึง conversation จาก ID"""
        return db.query(ChatConversation).filter(
            ChatConversation.conversation_id == conversation_id
        ).first()
    
    @staticmethod
    def get_conversation_by_user_and_store(
        db: Session,
        user_id: UUID,
        store_id: UUID
    ) -> Optional[ChatConversation]:
        """ดึง conversation จาก user_id และ store_id"""
        return db.query(ChatConversation).filter(
            and_(
                ChatConversation.user_id == user_id,
                ChatConversation.store_id == store_id
            )
        ).first()
    
    @staticmethod
    def get_user_conversations(
        db: Session,
        user_id: UUID,
        skip: int = 0,
        limit: int = 20
    ) -> List[ChatConversation]:
        """ดึงรายการ conversation ทั้งหมดของ user"""
        return db.query(ChatConversation).filter(
            ChatConversation.user_id == user_id
        ).order_by(
            ChatConversation.last_message_at.desc().nullslast()
        ).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_store_conversations(
        db: Session,
        store_id: UUID,
        skip: int = 0,
        limit: int = 20
    ) -> List[ChatConversation]:
        """ดึงรายการ conversation ทั้งหมดของร้านค้า"""
        return db.query(ChatConversation).filter(
            ChatConversation.store_id == store_id
        ).order_by(
            ChatConversation.last_message_at.desc().nullslast()
        ).offset(skip).limit(limit).all()
    
    @staticmethod
    def create_message(
        db: Session,
        conversation_id: UUID,
        sender_id: UUID,
        content: Optional[str] = None,
        image_path: Optional[str] = None,
        message_type: MessageType = MessageType.TEXT
    ) -> ChatMessage:
        """สร้างข้อความใหม่"""
        message = ChatMessage(
            conversation_id=conversation_id,
            sender_id=sender_id,
            content=content,
            image_path=image_path,
            message_type=message_type,
            is_read=False
        )
        db.add(message)
        
        # อัปเดต conversation
        conversation = db.query(ChatConversation).filter(
            ChatConversation.conversation_id == conversation_id
        ).first()
        
        if conversation:
            if message_type == MessageType.TEXT:
                conversation.last_message = content
            else:
                conversation.last_message = "📷 รูปภาพ"
            
            conversation.last_message_at = now_utc()
            
            from app.repositories.store_repository import StoreRepository
            store = StoreRepository.get_store_by_id(db, conversation.store_id)
            
            if store and store.user_id == sender_id:
                conversation.last_message_from = 'STORE'
                conversation.user_unread_count += 1
            else:
                conversation.last_message_from = 'USER'
                conversation.store_unread_count += 1
            
            conversation.updated_at = now_utc()
        
        db.commit()
        db.refresh(message)
        return message
    
    @staticmethod
    def get_messages_by_conversation(
        db: Session,
        conversation_id: UUID,
        skip: int = 0,
        limit: int = 50
    ) -> List[ChatMessage]:
        """ดึงข้อความทั้งหมดใน conversation (เรียง DESC)"""
        return db.query(ChatMessage).filter(
            ChatMessage.conversation_id == conversation_id
        ).order_by(
            ChatMessage.created_at.desc()
        ).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_messages_before_id(
        db: Session,
        conversation_id: UUID,
        last_message_id: Optional[str] = None,
        limit: int = 20
    ) -> List[ChatMessage]:
        """
        ✅ Cursor-based pagination: ดึงข้อความที่เก่ากว่า last_message_id
        
        Args:
            conversation_id: ID ของ conversation
            last_message_id: ID ของข้อความเก่าที่สุดที่มีในเครื่อง (None = ครั้งแรก)
            limit: จำนวนข้อความที่ต้องการ
        
        Returns:
            List ของข้อความเรียงจาก **ใหม่ไปเก่า** (DESC)
            
        ตัวอย่าง:
            - ครั้งแรก: last_message_id = None → return [ID:20, ID:19, ..., ID:1]
            - ครั้งที่ 2: last_message_id = "1" → return [ID:0, ID:-1, ..., ID:-19]
        """
        query = db.query(ChatMessage).filter(
            ChatMessage.conversation_id == conversation_id
        )
        
        # ✅ ถ้ามี last_message_id → ดึงเฉพาะข้อความที่เก่ากว่า
        if last_message_id:
            # หา created_at ของ last_message_id
            last_message = db.query(ChatMessage).filter(
                ChatMessage.message_id == last_message_id
            ).first()
            
            if last_message:
                # ดึงข้อความที่ created_at < last_message.created_at
                query = query.filter(
                    ChatMessage.created_at < last_message.created_at
                )
        
        # ✅ เรียงจากใหม่ไปเก่า (DESC) เพื่อให้ได้ข้อความล่าสุดก่อน
        return query.order_by(
            ChatMessage.created_at.desc()
        ).limit(limit).all()
    
    @staticmethod
    def get_unread_count(
        db: Session,
        conversation_id: UUID,
        user_id: UUID
    ) -> int:
        """นับข้อความที่ยังไม่อ่าน"""
        return db.query(func.count(ChatMessage.message_id)).filter(
            ChatMessage.conversation_id == conversation_id,
            ChatMessage.sender_id != user_id,
            ChatMessage.is_read == False
        ).scalar() or 0
    
    @staticmethod
    def mark_messages_as_read(
        db: Session,
        conversation_id: UUID,
        user_id: UUID
    ):
        """ทำเครื่องหมายข้อความว่าอ่านแล้ว"""
        db.query(ChatMessage).filter(
            ChatMessage.conversation_id == conversation_id,
            ChatMessage.sender_id != user_id,
            ChatMessage.is_read == False
        ).update({"is_read": True})
        
        conversation = db.query(ChatConversation).filter(
            ChatConversation.conversation_id == conversation_id
        ).first()
        
        if conversation:
            from app.repositories.store_repository import StoreRepository
            store = StoreRepository.get_store_by_id(db, conversation.store_id)
            
            if store and store.user_id == user_id:
                conversation.store_unread_count = 0
            else:
                conversation.user_unread_count = 0
            
            conversation.updated_at = now_utc()
        
        db.commit()