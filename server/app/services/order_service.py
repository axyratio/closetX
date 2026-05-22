# =============================================================
# FILE: app/services/order_service.py
# PURPOSE: Service จัดการ Order ทั้งหมด
#          ส่วนที่เกี่ยวกับ notification อยู่ใน
#          update_order_status_with_notification()
#          ซึ่ง call NotificationService helper ตาม status ใหม่:
#            CANCELLED  → notify_order_cancelled_by_store
#            PREPARING  → notify_order_approved
#            DELIVERED  → notify_order_delivered
#          (notify_return_approved ถูก call จาก seller_router แทน)
# =============================================================

from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException
from uuid import UUID
from typing import Optional, List, Dict
from datetime import datetime

from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.models.cart import Cart, CartItem
from app.models.return_order import ReturnOrder
from app.models.product import Product, ProductVariant
from app.models.store import Store
from app.services.notification_service import NotificationService
from app.services.payout_service import PayoutService
from app.utils.now_utc import now_utc


class OrderService:

    # ─────────────────────────────────────────
    # Status text map (สถานะ → ภาษาไทย)
    # ─────────────────────────────────────────
    @staticmethod
    def get_status_text(status: str) -> str:
        status_map = {
            "UNPAID": "รอชำระเงิน",
            "PAID": "ชำระเงินแล้ว",
            "PREPARING": "กำลังเตรียมสินค้า",
            "SHIPPED": "จัดส่งแล้ว",
            "DELIVERED": "จัดส่งสำเร็จ",
            "COMPLETED": "ได้รับสินค้าแล้ว",
            "RETURNING": "กำลังคืนสินค้า",
            "RETURNED": "คืนสินค้าแล้ว",
            "REJECTED": "ปฏิเสธการคืนสินค้า",
            "APPROVED": "อนุมัติการคืนเงิน",
            "CANCELLED": "ยกเลิก",
            "FAILED": "ล้มเหลว"
        }
        return status_map.get(status, status)

    # ─────────────────────────────────────────
    # Permission checks
    # ─────────────────────────────────────────
    @staticmethod
    def can_confirm_received(order_status: str) -> bool:
        return order_status == "DELIVERED"

    @staticmethod
    def can_return(order_status: str) -> bool:
        return order_status == "DELIVERED"

    @staticmethod
    def can_review(order_status: str) -> bool:
        return order_status == "COMPLETED"

    # ─────────────────────────────────────────
    # Format helpers
    # ─────────────────────────────────────────
    @staticmethod
    def format_return_info(return_req) -> Optional[Dict]:
        if not return_req:
            return None
        return {
            "return_id": str(return_req.return_id),
            "reason": return_req.reason.value if hasattr(return_req.reason, 'value') else return_req.reason,
            "reason_detail": return_req.reason_detail,
            "image_urls": return_req.image_urls or [],
            "status": return_req.status.value if hasattr(return_req.status, 'value') else return_req.status,
            "status_text": return_req.status_text,
            "refund_amount": float(return_req.refund_amount) if return_req.refund_amount else 0.0,
            "store_note": return_req.store_note,
            "created_at": return_req.created_at.isoformat() if return_req.created_at else None,
            "updated_at": return_req.updated_at.isoformat() if return_req.updated_at else None
        }

    @staticmethod
    def _resolve_item(item: OrderItem) -> Dict:
        """
        สร้าง dict ของ order_item โดยอ่าน snapshot ก่อนเสมอ
        แล้วค่อย fallback ไปหา relationship ถ้า snapshot ว่าง
        กรณี product/store ถูกลบ จะยังแสดงชื่อจาก snapshot ได้
        """
        # product_name: snapshot → relationship → deleted fallback
        product_name = (
            item.product_name
            or (item.product.product_name if item.product else None)
            or "สินค้าถูกลบออกจากระบบ"
        )

        # variant_name: snapshot → relationship → None
        variant_name = (
            item.variant_name
            or (item.variant.name_option if item.variant else None)
        )

        # image_url: snapshot → relationship (main image ก่อน ถ้าไม่มีเอารูปแรก)
        image_url = item.product_image_url
        if not image_url and item.product and item.product.images:
            main_imgs = [img for img in item.product.images if img.is_main]
            img = main_imgs[0] if main_imgs else item.product.images[0]
            image_url = img.image_url

        return {
            "order_item_id": str(item.order_item_id),
            "product_id": str(item.product_id) if item.product_id else None,
            "variant_id": str(item.variant_id) if item.variant_id else None,
            "product_name": product_name,
            "variant_name": variant_name,
            "store_name": item.store_name,  # snapshot ของร้านใน item นี้
            "quantity": item.quantity,
            "unit_price": float(item.unit_price),
            "image_url": image_url,
        }

    @staticmethod
    def format_order_response(order: Order) -> Dict:
        latest_return = order.return_requests[0] if order.return_requests else None

        # store_name: relationship → snapshot จาก order_item แรก → deleted fallback
        if order.store:
            store_name = order.store.name
        elif order.order_items:
            store_name = order.order_items[0].store_name or "ร้านค้าถูกลบออกจากระบบ"
        else:
            store_name = "ร้านค้าถูกลบออกจากระบบ"

        return {
            "order_id": str(order.order_id),
            "store_id": str(order.store_id) if order.store_id else None,  # nullable หลัง SET NULL
            "store_name": store_name,
            "order_status": order.order_status,
            "order_text_status": OrderService.get_status_text(order.order_status),
            "customer_name": order.customer_name,
            "shipping_cost": float(order.shipping_cost),
            "tracking_number": order.tracking_number,
            "courier_name": order.courier_name,
            "total_price": float(order.total_price),
            "created_at": order.created_at.isoformat() if order.created_at else None,
            "updated_at": order.updated_at.isoformat() if order.updated_at else None,
            "paid_at": order.paid_at.isoformat() if order.paid_at else None,
            "delivered_at": order.delivered_at.isoformat() if order.delivered_at else None,
            "completed_at": order.completed_at.isoformat() if order.completed_at else None,
            "return_info": OrderService.format_return_info(latest_return),
            # ใช้ _resolve_item เพื่ออ่าน snapshot ก่อน fallback relationship
            "order_items": [OrderService._resolve_item(item) for item in order.order_items],
            "can_confirm_received": OrderService.can_confirm_received(order.order_status),
            "can_return": OrderService.can_return(order.order_status),
            "can_review": OrderService.can_review(order.order_status),
            # Issue #6: ส่ง stripe_checkout_url กลับมาเฉพาะ UNPAID เพื่อให้ user กลับไปจ่ายได้
            "stripe_checkout_url": (
                order.payment.stripe_checkout_url
                if order.order_status == "UNPAID" and order.payment and order.payment.stripe_checkout_url
                else None
            ),
        }

    # ─────────────────────────────────────────
    # CRUD
    # ─────────────────────────────────────────
    @staticmethod
    def get_user_orders(
        db: Session, 
        user_id: UUID, 
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 10
    ) -> List[Dict]:
        query = (
            db.query(Order)
            .options(
                joinedload(Order.store),
                joinedload(Order.order_items).joinedload(OrderItem.product),
                joinedload(Order.order_items).joinedload(OrderItem.variant),
                joinedload(Order.payment),
                joinedload(Order.return_requests),
            )
            .filter(Order.user_id == user_id)
        )
        if status:
            query = query.filter(Order.order_status == status)
        
        orders = query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
        return [OrderService.format_order_response(order) for order in orders]

    @staticmethod
    def get_user_orders(
        db: Session, 
        user_id: UUID, 
        status: Optional[List[str]] = None,  # ← เปลี่ยนเป็น List
        skip: int = 0,
        limit: int = 10
    ) -> List[Dict]:
        query = (
            db.query(Order)
            .options(
                joinedload(Order.store),
                joinedload(Order.order_items).joinedload(OrderItem.product),
                joinedload(Order.order_items).joinedload(OrderItem.variant),
                joinedload(Order.payment),
                joinedload(Order.return_requests),
            )
            .filter(Order.user_id == user_id)
        )
        
        if status:
            query = query.filter(Order.order_status.in_(status))  # ← ใช้ in_()
        
        orders = query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
        return [OrderService.format_order_response(order) for order in orders]
    
    @staticmethod
    def get_order_detail(db: Session, order_id: UUID, user_id: UUID) -> Optional[Dict]:
        order = (
            db.query(Order)
            .options(
                joinedload(Order.store),
                joinedload(Order.order_items).joinedload(OrderItem.product),
                joinedload(Order.order_items).joinedload(OrderItem.variant),
                joinedload(Order.payment),
                joinedload(Order.return_requests),
            )
            .filter(Order.order_id == order_id, Order.user_id == user_id)
            .first()
        )
        if not order:
            return None
        return OrderService.format_order_response(order)
    
    @staticmethod
    async def confirm_order_received(db: Session, order_id: UUID, user_id: UUID) -> Dict:
        """
        ยืนยันว่าได้รับสินค้าแล้ว
        
        Flow:
        1. ตรวจสอบสิทธิ์และสถานะออเดอร์
        2. โอนเงินให้ร้านค้าผ่าน Stripe Connect (รองรับหลายร้าน)
        3. อัปเดตสถานะเป็น COMPLETED
        4. ส่ง notification
        
        Args:
            db: Database session
            order_id: ID ของออเดอร์
            user_id: ID ของผู้ใช้
            
        Returns:
            Dict: ข้อมูลออเดอร์และผลการโอนเงิน
        """
        print(f"\n{'='*80}")
        print(f"[ORDER_SERVICE] 📦 confirm_order_received CALLED")
        print(f"[ORDER_SERVICE] order_id: {order_id}")
        print(f"[ORDER_SERVICE] user_id: {user_id}")
        print(f"{'='*80}\n")

        # 1. โหลดออเดอร์พร้อม relationships
        order = (
            db.query(Order)
            .options(
                joinedload(Order.store),
                joinedload(Order.order_items).joinedload(OrderItem.product),
                joinedload(Order.order_items).joinedload(OrderItem.variant),
                joinedload(Order.payment),  # ✅ ต้องมีบรรทัดนี้
            )
            .filter(Order.order_id == order_id, Order.user_id == user_id)
            .first()
        )

        if not order:
            print(f"[ORDER_SERVICE] ❌ Order not found")
            raise HTTPException(status_code=404, detail="ไม่พบคำสั่งซื้อ")

        print(f"[ORDER_SERVICE] Current order status: {order.order_status}")

        # 2. ตรวจสอบสถานะ
        if order.order_status != "DELIVERED":
            raise HTTPException(
                status_code=400,
                detail=f"ไม่สามารถยืนยันได้ เนื่องจากระบบยืนยันการรับสินค้าอัตโนมัติแล้ว (สถานะ: {order.order_status})"
            )

        # 3. โอนเงินให้ร้านค้า (รองรับหลายร้าน)
        print(f"\n[ORDER_SERVICE] 💰 Processing payout to stores...")
        
        payout_result = None
        try:
            payout_result = await PayoutService.process_payout_on_delivery_confirmation(
                db=db,
                order_id=order_id,
                platform_fee_rate=0.05  # 5% platform fee
            )
            print(f"[ORDER_SERVICE] ✅ Payout completed successfully")
            print(f"[ORDER_SERVICE] Stores paid: {payout_result['successful_transfers']}/{payout_result['total_stores']}")
            print(f"[ORDER_SERVICE] Total transferred: ${payout_result['total_amount_transferred']:.2f}")
            
        except Exception as e:
            print(f"[ORDER_SERVICE] ❌ Payout failed: {str(e)}")
            # ไม่ throw error เพื่อให้ order status ยังอัปเดตได้
            payout_result = {
                "error": str(e),
                "successful_transfers": 0,
                "failed_transfers": 0
            }

        # 4. Refresh order (PayoutService อาจจะอัปเดต order status แล้ว)
        db.refresh(order)
        
        # 5. ส่ง notification (ถ้าต้องการ)
        try:
            # อาจจะเพิ่ม notification ว่าได้รับเงินแล้ว
            # await NotificationService.notify_payout_completed(db, order, payout_result)
            pass
        except Exception as e:
            print(f"[ORDER_SERVICE] ⚠️ Notification failed: {str(e)}")

        # 6. สร้าง response
        response = OrderService.format_order_response(order)
        
        # เพิ่มข้อมูลการโอนเงิน
        response["payout_info"] = payout_result

        print(f"\n[ORDER_SERVICE] ✅ Order confirmed successfully")
        print(f"[ORDER_SERVICE] New status: {order.order_status}")
        print(f"{'='*80}\n")

        return response
    
    @staticmethod
    def reorder_items(db: Session, order_id: UUID, user_id: UUID) -> Dict:
        order = (
            db.query(Order)
            .options(joinedload(Order.order_items))
            .filter(Order.order_id == order_id, Order.user_id == user_id)
            .first()
        )
        if not order:
            raise HTTPException(status_code=404, detail="ไม่พบคำสั่งซื้อ")
        cart = db.query(Cart).filter(Cart.user_id == user_id).first()
        if not cart:
            cart = Cart(user_id=user_id)
            db.add(cart)
            db.flush()
            
        items_added = 0
        for order_item in order.order_items:
            # ถ้า product_id เป็น null (product ถูกลบ) ข้ามไป ไม่สามารถ reorder ได้
            if not order_item.product_id:
                continue
            product = db.query(Product).filter(Product.product_id == order_item.product_id).first()
            if not product or not product.is_active:
                continue
            variant = None
            
            # ถ้าพบ variant ใน order item
            if order_item.variant_id:
                variant = db.query(ProductVariant).filter(
                    ProductVariant.variant_id == order_item.variant_id
                ).first()
                if not variant or variant.stock <= 0:
                    continue
            existing = db.query(CartItem).filter(
                CartItem.cart_id == cart.cart_id,
                CartItem.product_id == order_item.product_id,
                CartItem.variant_id == order_item.variant_id
            ).first()
            
            # ถ้าพบว่ามีในตะกร้าจะเพิ่มจำนวน
            if existing:
                # เพิ่มตะกร้า +1
                existing.quantity += order_item.quantity
                existing.updated_at = now_utc()
            else:
                db.add(CartItem(
                    cart_id=cart.cart_id,
                    product_id=order_item.product_id,
                    variant_id=order_item.variant_id,
                    quantity=order_item.quantity,
                    price_at_addition=order_item.variant.price if order_item.variant else order_item.unit_price,
                ))
            items_added += 1
        db.commit()
        return {"cart_items_added": items_added, "message": f"เพิ่ม {items_added} รายการเข้าตะกร้าสำเร็จ"}

    # ============================================================
    # ⭐ อัปเดตสถานะ + ส่ง notification แบบ realtime
    # เมื่อ seller เปลี่ยน status ของ order
    # → method นี้จะเรียก NotificationService helper ที่เหมาะสม
    # ============================================================
    # =============================================================
# เพิ่ม method นี้ใน OrderService class
# ไฟล์: app/services/order_service.py
# =============================================================

    @staticmethod
    async def update_order_status_with_notification(
        db: Session,
        order_id: UUID,
        new_status: str,
        note: Optional[str] = None
    ) -> Dict:
        """
        อัปเดตสถานะออเดอร์ + ส่ง notification อัตโนมัติ
        
        ใช้โดย:
        - seller_router.approve_order() → PREPARING → notify_order_approved
        - seller_router.cancel_order() → CANCELLED → notify_order_cancelled_by_store
        - order_tasks.simulate_delivery() → DELIVERED → notify_order_delivered
        """
        print(f"\n{'='*80}")
        print(f"[ORDER_SERVICE] 🎯 update_order_status_with_notification CALLED")
        print(f"[ORDER_SERVICE] order_id: {order_id}")
        print(f"[ORDER_SERVICE] new_status: {new_status}")
        print(f"[ORDER_SERVICE] note: {note}")
        print(f"{'='*80}\n")
        
        from sqlalchemy.orm import joinedload
        from app.models.order_item import OrderItem
        from app.models.product import Product
        
        # 1. ค้นหา order พร้อม relationships
        print(f"[ORDER_SERVICE] 📦 Loading order with relationships...")
        
        try:
            order = (
                db.query(Order)
                .options(
                    joinedload(Order.order_items)
                    .joinedload(OrderItem.product)
                    .joinedload(Product.images)
                )
                .filter(Order.order_id == order_id)
                .first()
            )
            
            if not order:
                print(f"[ORDER_SERVICE] ❌ Order not found: {order_id}")
                raise HTTPException(status_code=404, detail="Order not found")
            
            print(f"[ORDER_SERVICE] ✅ Order loaded:")
            print(f"  - order_id: {order.order_id}")
            print(f"  - old status: {order.order_status}")
            print(f"  - user_id: {order.user_id}")
            print(f"  - store_id: {order.store_id}")
            print(f"  - order_items count: {len(order.order_items) if order.order_items else 0}")
            
        except Exception as e:
            print(f"[ORDER_SERVICE] ❌ Failed to load order: {e}")
            raise
        
        # 2. เปลี่ยน status
        print(f"\n[ORDER_SERVICE] 🔄 Updating order status...")
        old_status = order.order_status
        order.order_status = new_status
        order.order_text_status = OrderService.get_status_text(new_status)
        order.updated_at = now_utc()
        
        # อัปเดต timestamp ตาม status
        if new_status == "DELIVERED" and not order.delivered_at:
            order.delivered_at = now_utc()
            print(f"[ORDER_SERVICE] Set delivered_at: {order.delivered_at}")
        elif new_status == "COMPLETED" and not order.completed_at:
            order.completed_at = now_utc()
            print(f"[ORDER_SERVICE] Set completed_at: {order.completed_at}")
        
        try:
            db.commit()
            db.refresh(order)
            print(f"[ORDER_SERVICE] ✅ Order status updated in DB")
            print(f"  - old: {old_status} → new: {new_status}")
            print(f"  - text: {order.order_text_status}")
        except Exception as e:
            print(f"[ORDER_SERVICE] ❌ DB commit failed: {e}")
            db.rollback()
            raise
        
        # 3. ส่ง notification ตาม status (ใช้ generic notify)
        print(f"\n[ORDER_SERVICE] 📢 Sending notification for status: {new_status}")
        
        # Map: order status → notification event name
        STATUS_TO_EVENT = {
            "PREPARING": "ORDER_APPROVED",
            "CANCELLED": "ORDER_CANCELLED",
            "SHIPPED":   "ORDER_SHIPPED",
            "DELIVERED":  "ORDER_DELIVERED",
            "COMPLETED":  "ORDER_COMPLETED",
        }
        
        try:
            event = STATUS_TO_EVENT.get(new_status)
            if event:
                print(f"[ORDER_SERVICE] 🎯 Calling NotificationService.notify(event={event})...")
                await NotificationService.notify(db, event=event, order=order)
                print(f"[ORDER_SERVICE] ✅ notify(event={event}) completed")
            else:
                print(f"[ORDER_SERVICE] ⚠️ No notification event mapped for status: {new_status}")
                
        except Exception as e:
            print(f"[ORDER_SERVICE] ❌ Notification failed: {e}")
            print(f"[ORDER_SERVICE] Exception type: {type(e).__name__}")
            import traceback
            print(f"[ORDER_SERVICE] Traceback:\n{traceback.format_exc()}")
            # ไม่ rollback order update
        
        # 4. คืน response
        result = {
            "order_id": str(order.order_id),
            "old_status": old_status,
            "new_status": new_status,
            "new_status_text": order.order_text_status,
            "updated_at": order.updated_at.isoformat() if order.updated_at else None,
        }
        
        print(f"\n[ORDER_SERVICE] ✅ Returning result:")
        print(f"{result}")
        print(f"{'='*80}\n")
        
        return result