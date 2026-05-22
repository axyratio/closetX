# =============================================================
# FILE: app/routes/user_notification_ws.py
# PURPOSE: WebSocket endpoint สำหรับ real-time notification ของผู้ใช้
#          ผู้ใช้เชื่อมต่อ WebSocket เมื่อเปิดแอป
#          พอเกิด event (เช่น จัดส่งสำเร็จ, ยกเลิกออเดอร์)
#          backend broadcast ผ่าน room "user:<user_id>"
#          client รับเรียลไตม์ ไม่ต้องใช้ push notification
# =============================================================

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from app.core.config import settings
from app.db.database import get_db
from app.models.user import User
from app.realtime.socket_manager import manager
import json

router = APIRouter(prefix="/ws/user", tags=["WebSocket User Notification"])


# ─────────────────────────────────────────────
# Helper: ตรวจสอบ JWT token จาก query string
# (เดียวกับ pattern ใน seller_notification_ws.py)
# ─────────────────────────────────────────────
async def _verify_token(token: str, db: Session) -> User | None:
    """
    Decode JWT → ค้นหา User → คืน User object
    คืน None ถ้า token ผิดหรือ user ไม่พบ
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str | None = payload.get("sub")
        if not user_id:
            return None

        user = db.query(User).filter(User.user_id == user_id).first()
        if not user or not user.is_active:
            return None

        return user
    except (JWTError, Exception) as e:
        print(f"[UserWS] Token verify error: {e}")
        return None


# ─────────────────────────────────────────────
# Main WebSocket endpoint
# URL: ws://<host>/ws/user/notifications?token=<JWT>
# ─────────────────────────────────────────────
@router.websocket("/notifications")
async def user_notification_websocket(
    websocket: WebSocket,
    token: str = Query(...),              # JWT ส่งผ่าน query param
    db: Session = Depends(get_db),
):
    """
    เปิด WebSocket connection สำหรับผู้ใช้
    room key = "user:<user_id>"

    Events ที่ client จะรับ:
      { type: "notification", notification: {...}, unread_count: N }
      (ถูก broadcast จาก NotificationService.create_notification)

    Ping/Pong:
      client ส่ง { type: "ping" } → server คืน { type: "pong" }
    """
    room: str | None = None

    try:
        # 1. ตรวจสอบ token
        user = await _verify_token(token, db)
        if not user:
            await websocket.close(code=4001, reason="Invalid token")
            return

        # 2. เชื่อมต่อ room
        room = f"user:{user.user_id}"
        await manager.connect(room, websocket)

        print(f"[UserWS] Connected → {user.email} | room={room}")

        # 3. ส่ง CONNECTED event ให้ client รู้ว่า ws พร้อม
        await websocket.send_json({
            "type": "CONNECTED",
            "message": f"Connected to notifications",
            "user_id": str(user.user_id),
        })

        # 4. Loop รอรับข้อความ (ping / keep-alive)
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
                if msg.get("type") == "ping":
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": msg.get("timestamp"),
                    })
            except json.JSONDecodeError:
                continue

    except WebSocketDisconnect:
        print(f"[UserWS] Disconnected → room={room}")
    except Exception as e:
        print(f"[UserWS] Error: {e}")
    finally:
        if room:
            manager.disconnect(room, websocket)