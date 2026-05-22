# app/routes/seller_notification_ws.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.realtime.socket_manager import manager
from app.models.store import Store
from app.models.user import User
from jose import JWTError, jwt
from app.core.config import settings
import json

router = APIRouter(prefix="/ws/seller", tags=["WebSocket Seller"])


async def verify_token(token: str, db: Session) -> User | None:
    """
    ตรวจสอบ JWT token และคืนค่า User object
    
    Args:
        token: JWT token string
        db: Database session
        
    Returns:
        User object ถ้า token ถูกต้อง, None ถ้าไม่ถูกต้อง
    """
    try:
        # Decode JWT token
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
        
        # ดึง user_id จาก payload
        user_id: str | None = payload.get("sub")
        if not user_id:
            print(f"[Token Verify] No user_id in token payload")
            return None
        
        # ค้นหา user ในฐานข้อมูล
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            print(f"[Token Verify] User not found: {user_id}")
            return None
        
        # ตรวจสอบว่า user active หรือไม่
        if not user.is_active:
            print(f"[Token Verify] User inactive: {user_id}")
            return None
        
        print(f"[Token Verify] Success: {user.email} ({user.user_id})")
        return user
        
    except JWTError as e:
        print(f"[Token Verify] JWT Error: {str(e)}")
        return None
    except Exception as e:
        print(f"[Token Verify] Unexpected Error: {str(e)}")
        return None


@router.websocket("/notifications")
async def seller_notification_websocket(
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    WebSocket endpoint for seller real-time notifications
    
    URL: ws://domain/ws/seller/notifications?token=<JWT_TOKEN>
    
    Events sent to client:
    - ORDER_RECEIVED: เมื่อได้รับออเดอร์ใหม่
    - ORDER_COMPLETED: เมื่อออเดอร์เสร็จสมบูรณ์
    - RETURN_REQUEST: เมื่อมีคำขอคืนสินค้า
    - LOW_STOCK: เมื่อสินค้าเหลือน้อย
    """
    
    room = None  # เก็บไว้สำหรับ disconnect ใน except
    
    try:
        # ตรวจสอบ token และดึงข้อมูล user
        user = await verify_token(token, db)
        if not user:
            await websocket.close(code=4001, reason="Invalid token")
            return
        
        # ตรวจสอบว่ามีร้านค้าหรือไม่
        store = db.query(Store).filter(Store.user_id == user.user_id).first()
        if not store:
            await websocket.close(code=4003, reason="No store found")
            return
        
        # สร้าง room สำหรับร้านค้า
        room = f"seller:{store.store_id}"
        
        # เชื่อมต่อ WebSocket
        await manager.connect(room, websocket)
        
        print(f"[Seller WS] Connected: {user.email} | Store: {store.name} | Room: {room}")
        
        # ส่งข้อความยืนยันการเชื่อมต่อ
        await websocket.send_json({
            "type": "CONNECTED",
            "message": f"Connected to seller notifications for {store.name}",
            "store_id": str(store.store_id),
            "store_name": store.name,
            "user_email": user.email
        })
        
        # รอรับข้อความจาก client (สำหรับ heartbeat หรือ ping)
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # รองรับ ping-pong เพื่อเช็คว่า connection ยังมีชีวิตอยู่
                if message.get("type") == "ping":
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": message.get("timestamp")
                    })
                    
            except json.JSONDecodeError:
                # ถ้า decode JSON ไม่ได้ให้ข้ามไป
                continue
                
    except WebSocketDisconnect:
        print(f"[Seller WS] Disconnected: Room {room}")
        if room:
            manager.disconnect(room, websocket)
        
    except Exception as e:
        print(f"[Seller WS] Error: {str(e)}")
        if room:
            manager.disconnect(room, websocket)
        try:
            await websocket.close(code=1011, reason=str(e))
        except:
            pass