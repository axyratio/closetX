# app/services/order_return_service.py
"""
Service สำหรับจัดการการคืนสินค้า

📝 NOTE: ไฟล์ใหม่ - ต้องสร้างในโฟลเดอร์ services
"""
from datetime import datetime, timedelta
import os
from typing import List, Optional
from uuid import UUID
import uuid

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.models.order import Order, OrderStatus
from app.models.return_order import ReturnOrder, ReturnImage, ReturnStatus, ReturnReason
from app.models.user import User
from app.utils.file_util import rollback_and_cleanup, save_file, delete_file
from app.utils.now_utc import now_utc
from app.utils.response_handler import success_response, error_response
from sqlalchemy.orm.attributes import flag_modified
# เพิ่มใน imports ด้านบน
# import stripe
from app.core.stripe_client import stripe
from app.models.payment import Payment, PaymentStatus

class OrderReturnService:
    """Service สำหรับจัดการการคืนสินค้า"""

    @staticmethod
    async def upload_return_image_temp(
        db: Session,
        user: User,
        file: UploadFile
    ):
        """
        ✅ อัปโหลดรูปภาพชั่วคราว (ก่อนสร้าง Return Request จริง)
        
        - บันทึกลง disk/cloudinary
        - สร้าง record ใน return_images
        - Return: { image_id, url }
        """
        saved_path = None
        try:
            # 1. ตรวจสอบไฟล์
            if not file.content_type or not file.content_type.startswith("image/"):
                return error_response("รองรับเฉพาะไฟล์รูปภาพเท่านั้น", {}, 400)

            content = await file.read()
            if len(content) > 5 * 1024 * 1024:  # 5MB
                return error_response("ขนาดไฟล์ต้องไม่เกิน 5MB", {}, 413)
            
            # Reset file pointer
            file.file.seek(0)

            # 2. บันทึกไฟล์
            upload_dir = "app/uploads/returns"
            ext = os.path.splitext(file.filename or "")[1] or ".jpg"
            unique_name = f"{uuid.uuid4().hex}{ext}"
            
            saved_path = save_file(upload_dir, file, unique_name)

            # 3. สร้าง Record ใน Database
            new_image = ReturnImage(
                return_id=None,  # ยังไม่ได้ผูกกับ Return Order
                user_id=user.user_id,
                image_url=saved_path
            )
            
            db.add(new_image)
            db.commit()
            db.refresh(new_image)

            return success_response(
                "อัปโหลดรูปสำเร็จ",
                {
                    "image_id": str(new_image.image_id),
                    "url": new_image.image_url
                },
                201
            )

        except Exception as e:
            if saved_path:
                rollback_and_cleanup(db, saved_path)
            else:
                db.rollback()
            
            print(f"❌ Error uploading return image: {e}")
            return error_response(
                "อัปโหลดรูปภาพล้มเหลว",
                {"error": str(e)},
                500
            )

    @staticmethod
    def get_temp_images(db: Session, user: User):
        """ดึงรายการรูปที่อัปโหลดแต่ยังไม่ได้สร้าง Return Request"""
        try:
            images = (
                db.query(ReturnImage)
                .filter(
                    ReturnImage.user_id == user.user_id,
                    ReturnImage.return_id.is_(None)  # ยังไม่ผูกกับ Return Order
                )
                .order_by(ReturnImage.uploaded_at.desc())
                .all()
            )
            
            return success_response(
                "ดึงข้อมูลสำเร็จ",
                {
                    "images": [
                        {
                            "image_id": str(img.image_id),
                            "url": img.image_url,
                            "uploaded_at": img.uploaded_at.isoformat() if img.uploaded_at else None
                        }
                        for img in images
                    ]
                }
            )
        except Exception as e:
            return error_response("เกิดข้อผิดพลาด", {"error": str(e)}, 500)

    @staticmethod
    def delete_temp_image(db: Session, user: User, image_id: UUID):
        """ลบรูปภาพที่อัปโหลดชั่วคราว"""
        try:
            image = (
                db.query(ReturnImage)
                .filter(
                    ReturnImage.image_id == image_id,
                    ReturnImage.user_id == user.user_id,
                    ReturnImage.return_id.is_(None)  # เฉพาะที่ยังไม่ผูก Return Order
                )
                .first()
            )
            
            if not image:
                return error_response("ไม่พบรูปภาพ", {}, 404)
            
            # ลบไฟล์จริง
            delete_file(image.image_url)
            
            # ลบ record
            db.delete(image)
            db.commit()
            
            return success_response("ลบรูปภาพสำเร็จ", {})
            
        except Exception as e:
            db.rollback()
            return error_response("เกิดข้อผิดพลาดในการลบรูปภาพ", {"error": str(e)}, 500)

    @staticmethod
    def create_return_request(
        db: Session,
        user: User,
        order_id: UUID,
        reason: ReturnReason,
        reason_detail: Optional[str],
        image_ids: Optional[List[UUID]]  # ✅ เปลี่ยนจาก image_urls
    ):
        """
        สร้างคำขอคืนสินค้า (ใช้ image_ids ที่อัปโหลดไว้แล้ว)
        - สถานะต้องเป็น DELIVERED เท่านั้น
        """
        try:
            order: Order = (
                db.query(Order)
                .filter(
                    Order.order_id == order_id,
                    Order.user_id == user.user_id
                )
                .first()
            )
            
            if not order:
                return error_response("ไม่พบคำสั่งซื้อ", {}, 404)
            
            # ✅ ตรวจสอบสถานะ (ต้องเป็น DELIVERED)
            if order.order_status != OrderStatus.DELIVERED:
                return error_response(
                    "ไม่สามารถคืนสินค้าได้ สถานะคำสั่งซื้อไม่ถูกต้อง",
                    {
                        "current_status": order.order_status.value,
                        "required_status": "DELIVERED"
                    },
                    400
                )
            
            # ตรวจสอบว่ามีคำขอคืนอยู่แล้วหรือไม่
            existing_return = (
                db.query(ReturnOrder)
                .filter(
                    ReturnOrder.order_id == order_id,
                    ReturnOrder.status.in_([
                        ReturnStatus.PENDING,
                        ReturnStatus.APPROVED
                    ])
                )
                .first()
            )
            
            if existing_return:
                return error_response(
                    "มีคำขอคืนสินค้าอยู่แล้ว",
                    {"return_id": str(existing_return.return_id)},
                    400
                )
            
            # ตรวจสอบระยะเวลาการคืน (ภายใน 7 วัน)
            if order.delivered_at:
                days_since_delivery = (now_utc() - order.delivered_at).days
                if days_since_delivery > 7:
                    return error_response(
                        "เกินกำหนดระยะเวลาคืนสินค้า (7 วัน)",
                        {"days_since_delivery": days_since_delivery},
                        400
                    )
            
            # ✅ ดึง URLs จาก ReturnImage
            image_urls = []
            if image_ids:
                images = (
                    db.query(ReturnImage)
                    .filter(
                        ReturnImage.image_id.in_(image_ids),
                        ReturnImage.user_id == user.user_id,
                        ReturnImage.return_id.is_(None)
                    )
                    .all()
                )
                image_urls = [img.image_url for img in images]
            
            # สร้างคำขอคืนสินค้า
            return_order = ReturnOrder(
                order_id=order_id,
                user_id=user.user_id,
                reason=reason,
                reason_detail=reason_detail,
                image_urls=image_urls,
                status=ReturnStatus.PENDING,
                status_text="รอร้านค้าตรวจสอบ",
                # refund_amount=order.total_price
                refund_amount = float(order.total_price) - float(order.shipping_cost) 
            )
            
            db.add(return_order)
            db.flush()  # ✅ เพิ่มบรรทัดนี้! เพื่อให้ได้ return_id ก่อน

            # ✅ ผูก ReturnImage กับ ReturnOrder
            if image_ids:
                db.query(ReturnImage).filter(
                    ReturnImage.image_id.in_(image_ids),
                    ReturnImage.user_id == user.user_id,  # เพิ่ม security check
                    ReturnImage.return_id.is_(None)
                ).update({"return_id": return_order.return_id}, synchronize_session=False)
            
            # ✅ อัปเดตสถานะ order เป็น RETURNING
            order.order_status = OrderStatus.RETURNING
            db.commit()
            
            db.refresh(return_order)

            # 🔔 แจ้งเตือนร้านค้าว่ามีคำขอคืนสินค้า (RETURN_REQUESTED)
            try:
                import asyncio
                from app.services.notification_service import NotificationService
                from sqlalchemy.orm import joinedload
                from app.models.order_item import OrderItem
                from app.models.product import Product

                # reload order พร้อม relationships สำหรับ notification
                notif_order = (
                    db.query(Order).options(
                        joinedload(Order.order_items)
                        .joinedload(OrderItem.product)
                        .joinedload(Product.images)
                    ).filter(Order.order_id == order_id).first()
                )
                if notif_order:
                    try:
                        loop = asyncio.get_running_loop()
                        loop.create_task(
                            NotificationService.notify(db, event="RETURN_REQUESTED", order=notif_order)
                        )
                    except RuntimeError:
                        asyncio.run(
                            NotificationService.notify(db, event="RETURN_REQUESTED", order=notif_order)
                        )
                    print(f"✅ RETURN_REQUESTED notification sent for order {order_id}", flush=True)
            except Exception as e:
                print(f"⚠️ RETURN_REQUESTED notification failed: {e}", flush=True)
            
            return success_response(
                "สร้างคำขอคืนสินค้าสำเร็จ",
                {
                    "return_id": str(return_order.return_id),
                    "order_id": str(order_id),
                    "status": return_order.status.value,
                    "image_urls": return_order.image_urls
                },
                201
            )
            
        except Exception as e:
            db.rollback()
            print(f"❌ Error creating return request: {e}")
            return error_response(
                "เกิดข้อผิดพลาดในการสร้างคำขอคืนสินค้า",
                {"error": str(e)},
                500
            )

    @staticmethod
    def confirm_order_received(
        db: Session,
        user: User,
        order_id: UUID
    ):
        """
        ยืนยันว่าได้รับสินค้าแล้ว
        - เปลี่ยนสถานะจาก DELIVERED → COMPLETED
        """
        try:
            order: Order = (
                db.query(Order)
                .filter(
                    Order.order_id == order_id,
                    Order.user_id == user.user_id
                )
                .first()
            )
            
            if not order:
                return error_response("ไม่พบคำสั่งซื้อ", {}, 404)
            
            # ✅ ต้องเป็นสถานะ DELIVERED
            if order.order_status != OrderStatus.DELIVERED:
                return error_response(
                    "ไม่สามารถยืนยันได้ สถานะคำสั่งซื้อไม่ถูกต้อง",
                    {
                        "current_status": order.order_status.value,
                        "required_status": "DELIVERED"
                    },
                    400
                )
            
            # ✅ เปลี่ยนสถานะเป็น COMPLETED (รับสินค้าแล้ว)
            order.order_status = OrderStatus.COMPLETED
            order.completed_at = now_utc()
            db.commit()
            
            db.refresh(order)
            
            return success_response(
                "ยืนยันรับสินค้าสำเร็จ",
                {
                    "order_id": str(order_id),
                    "status": order.order_status.value,
                    "status_text": order.order_text_status,
                    "completed_at": order.completed_at.isoformat() if order.completed_at else None
                }
            )
            
        except Exception as e:
            db.rollback()
            return error_response(
                "เกิดข้อผิดพลาดในการยืนยันรับสินค้า",
                {"error": str(e)},
                500
            )

    @staticmethod
    def get_return_requests(
        db: Session,
        user: User,
        order_id: Optional[UUID] = None
    ):
        """ดึงรายการคำขอคืนสินค้า"""
        try:
            query = db.query(ReturnOrder).filter(ReturnOrder.user_id == user.user_id)
            
            if order_id:
                query = query.filter(ReturnOrder.order_id == order_id)
            
            returns = query.order_by(ReturnOrder.created_at.desc()).all()
            
            return success_response(
                "ดึงข้อมูลสำเร็จ",
                {
                    "returns": [
                        {
                            "return_id": str(r.return_id),
                            "order_id": str(r.order_id),
                            "reason": r.reason.value,
                            "reason_detail": r.reason_detail,
                            "image_urls": r.image_urls,
                            "status": r.status.value,
                            "status_text": r.status_text,
                            "refund_amount": r.refund_amount,
                            "store_note": r.store_note,
                            "created_at": r.created_at.isoformat() if r.created_at else None,
                        }
                        for r in returns
                    ]
                }
            )
            
        except Exception as e:
            return error_response(
                "เกิดข้อผิดพลาด",
                {"error": str(e)},
                500
            )