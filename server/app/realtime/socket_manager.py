# app/realtime/socket_manager.py
from typing import Dict, List, Set, Any
from starlette.websockets import WebSocket, WebSocketState
import json


class ConnectionManager:
    """
    ✅ จัดการ WebSocket connections แบบ multi-room
    - แต่ละ room คือ conversation หรือ user
    - ใช้ broadcast ส่งข้อความไปยังทุก connection ในห้อง
    """
    
    def __init__(self):
        # room_key -> set of websockets
        self.rooms: Dict[str, Set[WebSocket]] = {}

    async def connect(self, room: str, ws: WebSocket):
        """
        เชื่อมต่อ WebSocket เข้า room
        
        ✅ IMPORTANT:
        - อย่า accept() ซ้ำ ถ้า accept แล้วจะ crash
        - ตรวจสอบ WebSocketState ก่อน accept
        - ใช้ได้กับหลาย room ต่อ 1 connection
        """
        try:
            # ✅ Starlette: accept แล้ว application_state จะเป็น CONNECTED
            # ตรวจสอบก่อนว่า accept ไปแล้วหรือยัง
            if getattr(ws, "application_state", None) != WebSocketState.CONNECTED:
                await ws.accept()
                print(f"[SocketManager] WebSocket accepted for room {room}")
        except RuntimeError as e:
            # ถ้า accept ไปแล้วจะโดน RuntimeError -> ignore
            print(f"[SocketManager] WebSocket already accepted: {e}")
            pass

        # เพิ่ม ws เข้า room
        if room not in self.rooms:
            self.rooms[room] = set()
        
        self.rooms[room].add(ws)
        print(f"[SocketManager] WebSocket added to room {room} (total: {len(self.rooms[room])})")

    def disconnect(self, room: str, ws: WebSocket):
        """
        ตัด WebSocket ออกจาก room
        
        ✅ ถ้าไม่มีใครในห้องแล้ว ลบห้องทิ้ง
        """
        if room in self.rooms:
            self.rooms[room].discard(ws)
            print(f"[SocketManager] WebSocket removed from room {room} (remaining: {len(self.rooms[room])})")
            
            # ลบห้องถ้าไม่มีใครแล้ว
            if not self.rooms[room]:
                del self.rooms[room]
                print(f"[SocketManager] Room {room} deleted (empty)")

    async def broadcast(self, room: str, message: Any):
        """
        ส่งข้อความไปยังทุก connection ในห้อง
        
        ✅ รองรับ dict/list (แปลงเป็น JSON อัตโนมัติ)
        ✅ ลบ connection ที่ส่งไม่ได้ (dead connections)
        """
        if room not in self.rooms:
            print(f"[SocketManager] Cannot broadcast to {room} (room not found)")
            return

        dead: Set[WebSocket] = set()
        success_count = 0
        
        # ส่งข้อความไปยังทุก WebSocket ในห้อง
        for ws in list(self.rooms[room]):
            try:
                # แปลง dict/list เป็น JSON string
                if isinstance(message, (dict, list)):
                    await ws.send_text(json.dumps(message))
                else:
                    await ws.send_text(str(message))
                
                success_count += 1
                
            except Exception as e:
                print(f"[SocketManager] Failed to send to WebSocket in {room}: {e}")
                dead.add(ws)

        # ✅ Cleanup dead connections
        for ws in dead:
            self.rooms[room].discard(ws)

        # ลบห้องถ้าไม่มีใครแล้ว
        if room in self.rooms and not self.rooms[room]:
            del self.rooms[room]
            print(f"[SocketManager] Room {room} deleted after cleanup")
        
        print(f"[SocketManager] Broadcast to {room}: {success_count} successful, {len(dead)} failed")

    def get_room_size(self, room: str) -> int:
        """ดูจำนวน connection ในห้อง"""
        return len(self.rooms.get(room, set()))
    
    def get_all_rooms(self) -> List[str]:
        """ดูรายชื่อห้องทั้งหมด"""
        return list(self.rooms.keys())


# ✅ Singleton instance
manager = ConnectionManager()