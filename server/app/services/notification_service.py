# app/services/notification_service.py
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
from app.models.notification import Notification, NotificationType
from app.models.order import Order
from app.realtime.socket_manager import manager
from app.utils.now_utc import now_utc


class NotificationService:

    # ─────────────────────────────────────────
    # Serializer: แปลง ORM → dict (JSON-safe)
    # ─────────────────────────────────────────
    @staticmethod
    def _serialize_notification(notification: Notification) -> dict:
        notification_type = notification.notification_type
        if hasattr(notification_type, "value"):
            notification_type = notification_type.value
        return {
            "notification_id": str(notification.notification_id),
            "notification_type": notification_type,
            "title": notification.title,
            "message": notification.message,
            "order_id": str(notification.order_id) if notification.order_id else None,
            "store_id": str(notification.store_id) if notification.store_id else None,
            "conversation_id": str(notification.conversation_id) if notification.conversation_id else None,
            "image_url": notification.image_url,
            "is_read": notification.is_read,
            "receiver_role": notification.receiver_role or "buyer",
            "created_at": notification.created_at.isoformat() if notification.created_at else None,
            "read_at": notification.read_at.isoformat() if notification.read_at else None,
        }

    # ─────────────────────────────────────────
    # Helper: ดึง product name + image จาก order item แรก
    # ─────────────────────────────────────────
    @staticmethod
    def _get_order_item_preview(order: Order) -> tuple[str, Optional[str]]:
        product_name = "สินค้า"
        image_url = None
        if order.order_items and len(order.order_items) > 0:
            item = order.order_items[0]
            item_product = getattr(item, "product", None)
            if getattr(item, "product_name", None):
                product_name = item.product_name
            elif item_product and getattr(item_product, "product_name", None):
                product_name = item_product.product_name
            image_url = getattr(item, "image_url", None)
            if not image_url and item_product and getattr(item_product, "images", None):
                image_url = item_product.images[0].image_url if item_product.images else None
        return product_name, image_url

    # ─────────────────────────────────────────
    # CORE: สร้าง notification + broadcast realtime
    # ─────────────────────────────────────────
    @staticmethod
    async def create_notification(
        db: Session,
        user_id: UUID,
        notification_type: NotificationType,
        title: str,
        message: str,
        order_id: Optional[UUID] = None,
        store_id: Optional[UUID] = None,
        conversation_id: Optional[UUID] = None,
        image_url: Optional[str] = None,
        receiver_role: str = "buyer"
    ) -> Notification:
        """
        สร้าง Notification record → บันทึก DB
        → broadcast ผ่าน WebSocket room "user:<user_id>"
        """
        print(f"\n{'='*80}")
        print(f"[NOTIFICATION_SERVICE] 🎯 create_notification CALLED")
        print(f"[NOTIFICATION_SERVICE] Parameters:")
        print(f"  - user_id: {user_id}")
        print(f"  - type: {notification_type}")
        print(f"  - title: {title}")
        print(f"  - message: {message}")
        print(f"  - order_id: {order_id}")
        print(f"  - store_id: {store_id}")
        print(f"  - conversation_id: {conversation_id}")
        print(f"  - image_url: {image_url}")
        print(f"{'='*80}\n")
        
        # 1. บันทึกลง DB
        print(f"[NOTIFICATION_SERVICE] 💾 Creating notification record in DB...")
        
        try:
            notification = Notification(
                user_id=user_id,
                notification_type=notification_type,
                title=title,
                message=message,
                order_id=order_id,
                store_id=store_id,
                conversation_id=conversation_id,
                image_url=image_url,
                receiver_role=receiver_role,
                is_read=False
            )
            db.add(notification)
            db.commit()
            db.refresh(notification)
            
            print(f"[NOTIFICATION_SERVICE] ✅ Notification saved to DB")
            print(f"  - notification_id: {notification.notification_id}")
            print(f"  - created_at: {notification.created_at}")
            
        except Exception as e:
            print(f"[NOTIFICATION_SERVICE] ❌ DB save failed: {e}")
            print(f"[NOTIFICATION_SERVICE] Exception type: {type(e).__name__}")
            import traceback
            print(f"[NOTIFICATION_SERVICE] Traceback:\n{traceback.format_exc()}")
            db.rollback()
            raise

        # 2. Broadcast ผ่าน WebSocket
        print(f"\n[NOTIFICATION_SERVICE] 📡 Broadcasting via WebSocket...")
        print(f"[NOTIFICATION_SERVICE] Target room: user:{user_id}")
        
        try:
            unread_count = await NotificationService.get_unread_count(db=db, user_id=user_id)
            print(f"[NOTIFICATION_SERVICE] Current unread_count: {unread_count}")
            
            serialized = NotificationService._serialize_notification(notification)
            print(f"[NOTIFICATION_SERVICE] Serialized notification:")
            print(f"{serialized}")
            
            payload = {
                "type": "notification",
                "notification": serialized,
                "unread_count": unread_count
            }
            
            print(f"\n[NOTIFICATION_SERVICE] 🚀 Calling manager.broadcast...")
            print(f"[NOTIFICATION_SERVICE] Room: user:{user_id}")
            print(f"[NOTIFICATION_SERVICE] Payload keys: {payload.keys()}")
            
            await manager.broadcast(
                f"user:{user_id}",
                payload
            )
            
            print(f"[NOTIFICATION_SERVICE] ✅ WebSocket broadcast completed")
            
        except Exception as e:
            print(f"[NOTIFICATION_SERVICE] ⚠️ WebSocket broadcast failed: {e}")
            print(f"[NOTIFICATION_SERVICE] Exception type: {type(e).__name__}")
            import traceback
            print(f"[NOTIFICATION_SERVICE] Traceback:\n{traceback.format_exc()}")
            # ไม่ให้ realtime error ทำให้สร้าง notification ล้ม
        
        print(f"\n[NOTIFICATION_SERVICE] ✅ create_notification completed")
        print(f"{'='*80}\n")
        
        return notification

    # ─────────────────────────────────────────
    # READ: ดึงรายการ / นับ unread
    # ─────────────────────────────────────────
    @staticmethod
    async def get_user_notifications(
        db: Session,
        user_id: UUID,
        limit: int = 50,
        offset: int = 0,
        receiver_role: Optional[str] = None
    ) -> tuple[list[Notification], int]:
        """ดึงการแจ้งเตือนของผู้ใช้ (เรียงล่าสุดก่อน)"""
        query = db.query(Notification).filter(
            Notification.user_id == user_id
        )
        if receiver_role:
            query = query.filter(Notification.receiver_role == receiver_role)
        query = query.order_by(Notification.created_at.desc())

        total = query.count()
        notifications = query.limit(limit).offset(offset).all()
        return notifications, total

    @staticmethod
    async def get_unread_count(db: Session, user_id: UUID, receiver_role: Optional[str] = None) -> int:
        """นับจำนวน notification ที่ยังไม่อ่าน"""
        query = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        )
        if receiver_role:
            query = query.filter(Notification.receiver_role == receiver_role)
        return query.count()

    # ─────────────────────────────────────────
    # UPDATE: อ่านแล้ว / อ่านทั้งหมด
    # ─────────────────────────────────────────
    @staticmethod
    async def mark_as_read(db: Session, notification_id: UUID, user_id: UUID) -> bool:
        notification = db.query(Notification).filter(
            Notification.notification_id == notification_id,
            Notification.user_id == user_id
        ).first()
        if not notification:
            return False
        notification.is_read = True
        notification.read_at = now_utc()
        db.commit()
        return True

    @staticmethod
    async def mark_all_as_read(db: Session, user_id: UUID, receiver_role: Optional[str] = None) -> int:
        query = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        )
        if receiver_role:
            query = query.filter(Notification.receiver_role == receiver_role)
        updated = query.update({"is_read": True, "read_at": now_utc()})
        db.commit()
        return updated

    # ─────────────────────────────────────────
    # DELETE
    # ─────────────────────────────────────────
    @staticmethod
    async def delete_notification(db: Session, notification_id: UUID, user_id: UUID) -> bool:
        notification = db.query(Notification).filter(
            Notification.notification_id == notification_id,
            Notification.user_id == user_id
        ).first()
        if not notification:
            return False
        db.delete(notification)
        db.commit()
        return True

    # ============================================================
    # 🔔 GENERIC NOTIFY — ฟังก์ชันเดียวแจ้งเตือนได้ทุก Event
    # ============================================================
    #
    # วิธีใช้:
    #   await NotificationService.notify(db, event="ORDER_SHIPPED", order=order)
    #   await NotificationService.notify(db, event="RETURN_REJECTED", order=order, store_note="สินค้าไม่ตรงเงื่อนไข")
    #   await NotificationService.notify(db, event="NEW_MESSAGE", recipient_user_id=uid, sender_name="ร้าน ABC", message_preview="สวัสดีครับ...")
    #

    # ─── Event Config Map (10 events) ───
    # target: "buyer"  = แจ้งลูกค้า (order.user_id)
    #         "seller" = แจ้งเจ้าของร้าน (Store.user_id จาก order.store_id)
    #         "custom" = ระบุ recipient_user_id เอง
    #
    # อยากเพิ่ม event ใหม่ → เพิ่ม row ในนี้แค่นั้น ไม่ต้องสร้างฟังก์ชันใหม่
    EVENT_CONFIG = {
        # ─── Order events (6) ───
        "ORDER_CREATED": {
            "target": "seller",
            "notification_type": NotificationType.ORDER_PAID,
            "title": " มีออเดอร์ใหม่!",
            "message": "คุณได้รับคำสั่งซื้อ {product_name} กรุณาตรวจสอบและอนุมัติ",
        },
        "ORDER_APPROVED": {
            "target": "buyer",
            "notification_type": NotificationType.ORDER_PREPARING,
            "title": " ร้านค้าอนุมัติออเดอร์",
            "message": "ร้านค้าอนุมัติคำสั่งซื้อ {product_name} แล้ว กำลังเตรียมจัดส่ง",
        },
        "ORDER_SHIPPED": {
            "target": "buyer",
            "notification_type": NotificationType.ORDER_SHIPPED,
            "title": " สินค้าถูกจัดส่งแล้ว!",
            "message": "คำสั่งซื้อ {product_name} ถูกจัดส่งแล้ว{tracking_info}",
        },
        "ORDER_DELIVERED": {
            "target": "buyer",
            "notification_type": NotificationType.ORDER_DELIVERED,
            "title": " จัดส่งสำเร็จ!",
            "message": "คำสั่งซื้อ {product_name} ถูกจัดส่งสำเร็จแล้ว กรุณายืนยันการรับสินค้า",
        },
        "ORDER_COMPLETED": {
            "target": "seller",
            "notification_type": NotificationType.ORDER_COMPLETED,
            "title": " ลูกค้ายืนยันรับสินค้าแล้ว",
            "message": "ลูกค้ายืนยันรับสินค้า {product_name} เรียบร้อยแล้ว",
        },
        "ORDER_CANCELLED": {
            "target": "buyer",
            "notification_type": NotificationType.ORDER_CANCELLED,
            "title": " ร้านค้ายกเลิกออเดอร์",
            "message": "คำสั่งซื้อ {product_name} ถูกร้านค้ายกเลิก หากมีข้อสงสัยกรุณาติดต่อร้านค้า",
        },
        # ─── Return events (3) ───
        "RETURN_REQUESTED": {
            "target": "seller",
            "notification_type": NotificationType.RETURN_REQUEST,
            "title": " มีคำขอคืนสินค้า",
            "message": "ลูกค้าขอคืนสินค้า {product_name} กรุณาตรวจสอบและดำเนินการ",
        },
        "RETURN_APPROVED": {
            "target": "buyer",
            "notification_type": NotificationType.RETURN_APPROVED,
            "title": " อนุมัติการคืนสินค้า",
            "message": "ร้านค้าอนุมัติการคืนสินค้า {product_name} แล้ว กรุณาดำเนินการตามขั้นตอน",
        },
        "RETURN_REJECTED": {
            "target": "buyer",
            "notification_type": NotificationType.RETURN_REJECTED,
            "title": " ปฏิเสธการคืนสินค้า",
            "message": "ร้านค้าปฏิเสธการคืนสินค้า {product_name}{store_note_text}",
        },
        # ─── Chat events (1) ───
        "NEW_MESSAGE": {
            "target": "custom",
            "notification_type": NotificationType.NEW_MESSAGE,
            "title": " ข้อความจาก {sender_name}",
            "message": "{message_preview}",
        },
    }

    @staticmethod
    async def notify(
        db: Session,
        event: str,
        order: Optional[Order] = None,
        store_note: Optional[str] = None,
        recipient_user_id: Optional[UUID] = None,
        sender_name: Optional[str] = None,
        message_preview: Optional[str] = None,
        conversation_id: Optional[UUID] = None,
        extra_store_id: Optional[UUID] = None,
    ):
        """
        ฟังก์ชันแจ้งเตือนรวม — ยัด event เข้ามาเป็น parameter ก็แจ้งเตือนได้ทุกประเภท

        ตัวอย่าง:
            await NotificationService.notify(db, event="ORDER_SHIPPED", order=order)
            await NotificationService.notify(db, event="RETURN_REJECTED", order=order, store_note="เหตุผล...")
            await NotificationService.notify(db, event="NEW_MESSAGE", recipient_user_id=uid, sender_name="ร้าน A", message_preview="สวัสดี...")
        """

        # 1. หา config จาก EVENT_CONFIG
        config = NotificationService.EVENT_CONFIG.get(event)
        if not config:
            print(f"[NOTIFICATION_SERVICE] ⚠️ Unknown event: {event} — skipped")
            return

        target = config["target"]
        notification_type = config["notification_type"]

        # 2. หา user_id ของผู้รับตาม target
        user_id = None
        order_id = None
        store_id = extra_store_id

        if target == "buyer" and order:
            # แจ้งลูกค้า → ใช้ order.user_id
            user_id = order.user_id
            order_id = order.order_id
            store_id = order.store_id

        elif target == "seller" and order:
            # แจ้งเจ้าของร้าน → หา Store.user_id จาก order.store_id
            from app.models.store import Store
            store = db.query(Store).filter(Store.store_id == order.store_id).first()
            if not store or not store.user_id:
                print(f"[NOTIFICATION_SERVICE] ⚠️ Store not found for order {order.order_id} — skipped")
                return
            user_id = store.user_id
            order_id = order.order_id
            store_id = order.store_id

        elif target == "custom":
            # กำหนดเอง → ใช้ recipient_user_id
            user_id = recipient_user_id
            if not user_id:
                print(f"[NOTIFICATION_SERVICE] ⚠️ {event}: recipient_user_id is required — skipped")
                return

        if not user_id:
            print(f"[NOTIFICATION_SERVICE] ⚠️ Cannot resolve user_id for event={event} — skipped")
            return

        # 3. สร้าง title + message จาก template
        product_name = "สินค้า"
        image_url = None
        if order:
            product_name, image_url = NotificationService._get_order_item_preview(order)

        tracking_info = ""
        if order and getattr(order, "tracking_number", None) and getattr(order, "courier_name", None):
            tracking_info = f" ({order.courier_name}: {order.tracking_number})"

        store_note_text = ""
        if store_note:
            store_note_text = f" เหตุผล: {store_note}"

        safe_message_preview = message_preview or ""
        if len(safe_message_preview) > 80:
            safe_message_preview = safe_message_preview[:80] + "..."

        fmt = {
            "product_name": product_name,
            "tracking_info": tracking_info,
            "store_note_text": store_note_text,
            "sender_name": sender_name or "ผู้ใช้",
            "message_preview": safe_message_preview,
        }

        title = config["title"].format(**fmt)
        message = config["message"].format(**fmt)

        # 4. Map target → receiver_role
        receiver_role = "buyer"
        if target == "seller":
            receiver_role = "seller"
        elif target == "custom":
            receiver_role = "buyer"  # default, สามารถเพิ่ม param ได้ในอนาคต

        # 5. Log + เรียก create_notification
        print(f"\n[NOTIFICATION_SERVICE] 🔔 notify(event={event})")
        print(f"  → target={target}, user_id={user_id}, receiver_role={receiver_role}")
        print(f"  → title={title}")
        print(f"  → message={message}")

        try:
            await NotificationService.create_notification(
                db=db,
                user_id=user_id,
                notification_type=notification_type,
                title=title,
                message=message,
                order_id=order_id,
                store_id=store_id,
                conversation_id=conversation_id,
                image_url=image_url,
                receiver_role=receiver_role,
            )
        except Exception as e:
            print(f"[NOTIFICATION_SERVICE] ❌ notify(event={event}) failed: {e}")
            import traceback
            print(traceback.format_exc())

    # ============================================================
    # BACKWARD-COMPATIBLE HELPERS
    # เพื่อให้โค้ดเดิมที่เรียก notify_order_approved() ฯลฯ ยังใช้ได้
    # ภายในจะเรียก notify() อีกที
    # ============================================================

    @staticmethod
    async def notify_order_delivered(db: Session, order: Order):
        await NotificationService.notify(db, event="ORDER_DELIVERED", order=order)

    @staticmethod
    async def notify_order_cancelled_by_store(db: Session, order: Order):
        await NotificationService.notify(db, event="ORDER_CANCELLED", order=order)

    @staticmethod
    async def notify_order_approved(db: Session, order: Order):
        await NotificationService.notify(db, event="ORDER_APPROVED", order=order)

    @staticmethod
    async def notify_return_approved(db: Session, order: Order):
        await NotificationService.notify(db, event="RETURN_APPROVED", order=order)