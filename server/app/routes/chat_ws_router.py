# app/routes/chat_ws_router.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
from typing import Dict
import json
from uuid import UUID
import jwt
from datetime import datetime

from app.db.database import get_db
from app.realtime.socket_manager import manager
from app.services.chat_service import ChatService
from app.repositories.chat_repository import ChatRepository
from app.repositories.user_repository import UserRepository
from app.repositories.store_repository import StoreRepository
from app.core.config import settings

router = APIRouter(tags=["Chat WebSocket"])

active_connections: Dict[str, WebSocket] = {}


def verify_token(token: str, db: Session):
    """ตรวจสอบ JWT token และคืน user object"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        print("[TOKEN PAYLOAD]", payload)

        user_id: str = payload.get("sub")
        if not user_id:
            return None

        user = UserRepository.get_user_by_id(db, UUID(user_id))
        print("[USER] from token", getattr(user, "first_name", "UNKNOWN"))
        return user
    except Exception as e:
        print(f"[WS] Token verification error: {e}")
        return None


@router.websocket("/ws/chat")
async def chat_websocket(
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    """WebSocket endpoint สำหรับระบบแชท"""
    
    # ✅ ตรวจสอบ token
    user = verify_token(token, db)
    if not user:
        await websocket.close(code=1008, reason="Invalid token")
        return

    user_id = str(user.user_id)
    user_key = user_id

    # ✅ Accept WebSocket connection (ครั้งเดียวที่นี่)
    await websocket.accept()
    print(f"[WS] User {user_id} connected")

    # Store connection
    active_connections[user_key] = websocket

    # ✅ Join ห้องส่วนตัวของ user
    await manager.connect(f"user:{user_id}", websocket)

    joined_rooms = set()
    joined_rooms.add(f"user:{user_id}")

    try:
        # ส่งข้อความยืนยันการเชื่อมต่อ
        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "user_id": user_id
        })

        while True:
            # รับข้อความจาก client
            raw = await websocket.receive_text()
            message_data = json.loads(raw)

            action = message_data.get("action")
            conversation_id = message_data.get("conversation_id")

            # ========== JOIN CONVERSATION ==========
            if action == "join_conversation" and conversation_id:
                print(f"[WS] User {user_id} joining conversation {conversation_id}")
                
                # ✅ ตรวจสอบว่า user มีสิทธิ์เข้า conversation นี้
                conv = ChatRepository.get_conversation_by_id(db, UUID(conversation_id))
                if not conv:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Conversation not found"
                    })
                    continue
                
                # ตรวจสอบสิทธิ์
                has_access = False
                if conv.user_id == UUID(user_id):
                    has_access = True
                else:
                    # เรียก user_id จาก store_id เพื่อเช็คไม่ให้ใครที่ไหนเข้ามาก็ได้
                    store = StoreRepository.get_store_by_id(db, conv.store_id)
                    if store and store.user_id == UUID(user_id):
                        has_access = True
                
                if not has_access:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Access denied"
                    })
                    continue
                
                # Join room
                room_key = f"conversation:{conversation_id}"
                await manager.connect(room_key, websocket)
                joined_rooms.add(room_key)

                await websocket.send_json({
                    "type": "joined",
                    "conversation_id": conversation_id
                })
                print(f"[WS] User {user_id} joined room {room_key}")
                continue

            # ========== SEND MESSAGE ==========
            if action == "send_message" and conversation_id:
                content = (message_data.get("content") or "").strip()
                if not content:
                    await websocket.send_json({
                        "type": "error", 
                        "message": "Content is required"
                    })
                    continue

                print(f"[WS] User {user_id} sending message to {conversation_id}")
                
                try:
                    # ✅ บันทึกข้อความผ่าน Service (มีการตรวจสอบสิทธิ์)
                    message_response = ChatService.send_text_message(
                        db=db,
                        conversation_id=UUID(conversation_id),
                        sender_id=UUID(user_id),
                        content=content
                    )

                    # ✅ Broadcast ไปยังทุกคนในห้อง conversation
                    room_key = f"conversation:{conversation_id}"
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
                    print(f"[WS] Broadcast message to room {room_key}")

                    # ✅ ส่ง notification + update unread ไปยังคู่สนทนา
                    conversation = ChatRepository.get_conversation_by_id(db, UUID(conversation_id))
                    if conversation:
                        other_user_id = None

                        if str(conversation.user_id) != user_id:
                            other_user_id = str(conversation.user_id)
                        else:
                            store = StoreRepository.get_store_by_id(db, conversation.store_id)
                            if store:
                                other_user_id = str(store.user_id)

                        if other_user_id:
                            # ✅ นับ unread ใหม่สำหรับคู่สนทนา
                            unread_count = ChatRepository.get_unread_count(
                                db, UUID(conversation_id), UUID(other_user_id)
                            )
                            
                            await manager.broadcast(f"user:{other_user_id}", {
                                "type": "unread_update",
                                "conversation_id": str(conversation_id),
                                "unread_count": unread_count,
                                "last_message": content[:50] + ("..." if len(content) > 50 else ""),
                                "last_message_at": message_response.created_at.isoformat()
                                if isinstance(message_response.created_at, datetime)
                                else message_response.created_at
                            })
                            print(f"[WS] Sent unread update to user {other_user_id}")
                
                except Exception as e:
                    print(f"[WS] Error sending message: {e}")
                    await websocket.send_json({
                        "type": "error",
                        "message": str(e)
                    })
                
                continue

            # ========== MARK AS READ ==========
            if action == "mark_read" and conversation_id:
                print(f"[WS] User {user_id} marking conversation {conversation_id} as read")
                
                try:
                    ChatService.mark_as_read(
                        db=db,
                        conversation_id=UUID(conversation_id),
                        user_id=UUID(user_id)
                    )
                    
                    # ✅ Broadcast ให้คู่สนทนารู้ว่าข้อความถูกอ่านแล้ว
                    room_key = f"conversation:{conversation_id}"
                    await manager.broadcast(room_key, {
                        "type": "messages_read",
                        "conversation_id": conversation_id,
                        "reader_id": user_id
                    })
                    
                    # ✅ อัพเดท unread count ให้ผู้อ่าน
                    await websocket.send_json({
                        "type": "unread_update",
                        "conversation_id": conversation_id,
                        "unread_count": 0
                    })
                except Exception as e:
                    print(f"[WS] Error marking as read: {e}")
                
                continue

            # ========== TYPING INDICATOR ==========
            if action == "typing" and conversation_id:
                room_key = f"conversation:{conversation_id}"
                await manager.broadcast(room_key, {
                    "type": "typing",
                    "conversation_id": conversation_id,
                    "user_id": user_id,
                    "is_typing": message_data.get("is_typing", False)
                })
                continue

            # ========== UNKNOWN ACTION ==========
            await websocket.send_json({
                "type": "error",
                "message": f"Unknown/invalid action: {action}"
            })

    except WebSocketDisconnect:
        print(f"[WS] User {user_id} disconnected from chat")

    except Exception as e:
        print(f"[WS] WebSocket error: {str(e)}")
        import traceback
        traceback.print_exc()
        try:
            await websocket.close(code=1011, reason="Server error")
        except:
            pass

    finally:
        # ✅ Cleanup
        if user_key in active_connections:
            del active_connections[user_key]

        # ออกจากทุกห้องที่เคย join
        for room in list(joined_rooms):
            manager.disconnect(room, websocket)
        
        print(f"[WS] Cleaned up user {user_id}")