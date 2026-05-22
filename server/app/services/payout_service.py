# =============================================================
# FILE: app/services/payout_service_enhanced.py
# PURPOSE: บริการโอนเงินให้ร้านค้าผ่าน Stripe Connect
#          รองรับหลายร้านในออเดอร์เดียว (multi-vendor)
# =============================================================

import stripe
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, List, Optional
from uuid import UUID
from datetime import datetime
from decimal import Decimal

from app.core.stripe_client import stripe
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.models.payment import Payment, PaymentStatus
from app.models.store import Store
from app.models.store_payout import StorePayout
from app.utils.now_utc import now_utc
from fastapi import HTTPException


class PayoutService:
    """
    บริการจัดการการโอนเงินให้ร้านค้า
    - รองรับหลายร้านในออเดอร์เดียว
    - ใช้ transfer_group จาก PaymentIntent
    - หักค่าธรรมเนียมแพลตฟอร์ม
    - บันทึกประวัติการโอนเงิน
    """

    # ค่าธรรมเนียมแพลตฟอร์ม (5%)
    DEFAULT_PLATFORM_FEE_RATE = 0.05

    @staticmethod
    def calculate_store_amounts(
        db: Session,
        order_id: UUID,
        platform_fee_rate: float = DEFAULT_PLATFORM_FEE_RATE
    ) -> List[Dict]:
        """
        คำนวณยอดเงินที่แต่ละร้านควรได้รับ
        
        Returns:
            List[Dict]: รายการร้านและยอดเงิน
            [
                {
                    "store_id": UUID,
                    "store_name": str,
                    "stripe_account_id": str,
                    "subtotal": Decimal,
                    "platform_fee": Decimal,
                    "transfer_amount": Decimal,
                    "items": List[OrderItem]
                }
            ]
        """
        # ดึง order items แยกตามร้าน
        store_groups = (
            db.query(
                OrderItem.store_id,
                func.sum(OrderItem.quantity * OrderItem.unit_price).label("subtotal")
            )
            .filter(OrderItem.order_id == order_id)
            .group_by(OrderItem.store_id)
            .all()
        )

        result = []
        for store_id, subtotal in store_groups:
            # ✅ ถ้า store_id เป็น NULL (ร้านถูกลบ) ให้ข้ามไป ไม่ต้องโอนเงิน
            if store_id is None:
                print(f"[PAYOUT] ⚠️ Skipping items with deleted store (store_id=NULL), subtotal={subtotal}")
                continue

            # ดึงข้อมูลร้าน
            store = db.query(Store).filter(Store.store_id == store_id).first()

            if not store:
                # ร้านถูกลบออกจาก DB แล้ว (ไม่ใช่แค่ SET NULL) → skip เหมือนกัน
                print(f"[PAYOUT] ⚠️ Store {store_id} not found in DB, skipping payout")
                continue

            if not store.stripe_account_id:
                raise HTTPException(
                    status_code=400,
                    detail=f"ร้าน '{store.name}' ยังไม่เชื่อมต่อกับ Stripe Connect"
                )
            
            # คำนวณค่าธรรมเนียมและยอดโอน
            platform_fee = Decimal(str(subtotal)) * Decimal(str(platform_fee_rate))
            transfer_amount = Decimal(str(subtotal)) - platform_fee

            # ดึงรายการสินค้าของร้านนี้
            items = (
                db.query(OrderItem)
                .filter(
                    OrderItem.order_id == order_id,
                    OrderItem.store_id == store_id
                )
                .all()
            )

            result.append({
                "store_id": store_id,
                "store_name": store.name,
                "stripe_account_id": store.stripe_account_id,
                "subtotal": subtotal,
                "platform_fee": platform_fee,
                "transfer_amount": transfer_amount,
                "items": items
            })

        return result

    @staticmethod
    async def process_payout_on_delivery_confirmation(
        db: Session,
        order_id: UUID,
        platform_fee_rate: float = DEFAULT_PLATFORM_FEE_RATE
    ) -> Dict:
        """
        โอนเงินให้ร้านค้าเมื่อลูกค้ากดยืนยันรับสินค้า
        
        Flow:
        1. ตรวจสอบ order status = DELIVERED
        2. ตรวจสอบ payment status = SUCCESS
        3. คำนวณยอดเงินแต่ละร้าน
        4. โอนเงินผ่าน Stripe Transfer (ใช้ transfer_group)
        5. บันทึกประวัติการโอน
        6. อัปเดต order status -> COMPLETED
        
        Args:
            db: Database session
            order_id: ID ของออเดอร์
            platform_fee_rate: อัตราค่าธรรมเนียม (default 5%)
            
        Returns:
            Dict: ผลลัพธ์การโอนเงิน
        """
        print(f"\n{'='*80}")
        print(f"[PAYOUT_SERVICE] 💰 Starting payout process")
        print(f"[PAYOUT_SERVICE] Order ID: {order_id}")
        print(f"[PAYOUT_SERVICE] Platform Fee Rate: {platform_fee_rate * 100}%")
        print(f"{'='*80}\n")

        # 1. ตรวจสอบออเดอร์
        order = (
            db.query(Order)
            .filter(Order.order_id == order_id)
            .first()
        )
        
        if not order:
            raise HTTPException(status_code=404, detail="ไม่พบออเดอร์")
        
        print(f"[PAYOUT_SERVICE] Order Status: {order.order_status}")
        
        if order.order_status != "DELIVERED":
            raise HTTPException(
                status_code=400,
                detail=f"ไม่สามารถโอนเงินได้ สถานะออเดอร์: {order.order_status}"
            )

        # 2. ตรวจสอบการชำระเงิน
# แทนที่บรรทัด 166
        payment = db.query(Payment).filter(
            Payment.payment_id == order.payment_id  # ✅ ถูกแล้ว แต่ต้อง load order พร้อม payment_id ก่อน
        ).first()

        # เพิ่ม print เพื่อ debug
        print(f"[PAYOUT] order.payment_id = {order.payment_id}")
        print(f"[PAYOUT] payment found = {payment}")
        print(f"[PAYOUT] payment.status = {payment.status if payment else 'NOT FOUND'}")
        
        if not payment or payment.status != PaymentStatus.SUCCESS:
            raise HTTPException(
                status_code=400,
                detail="ออเดอร์นี้ยังไม่ได้ชำระเงิน"
            )
        
        # ✅ ถูก
        print(f"[PAYOUT_SERVICE] Payment Intent ID: {payment.payment_intent_id}")
        print(f"[PAYOUT_SERVICE] Total Amount: ${order.total_price:.2f}")

        # 3. คำนวณยอดเงินแต่ละร้าน
        store_amounts = PayoutService.calculate_store_amounts(
            db, order_id, platform_fee_rate
        )
        
        print(f"\n[PAYOUT_SERVICE] 🏪 Found {len(store_amounts)} store(s)")
        for idx, store_data in enumerate(store_amounts, 1):
            print(f"\n  Store {idx}: {store_data['store_name']}")
            print(f"    - Subtotal: ${store_data['subtotal']:.2f}")
            print(f"    - Platform Fee: ${store_data['platform_fee']:.2f}")
            print(f"    - Transfer Amount: ${store_data['transfer_amount']:.2f}")
            print(f"    - Stripe Account: {store_data['stripe_account_id']}")

        # 4. ดึง transfer_group จาก PaymentIntent
        transfer_group = f"payment_{payment.payment_id}"  # ✅ ตรงกับที่ checkout ตั้งไว้
        print(f"\n[PAYOUT_SERVICE] 📦 Transfer Group: {transfer_group}")

        # 5. โอนเงินให้แต่ละร้าน
        transfer_results = []
        
        for store_data in store_amounts:
            try:
                print(f"\n[PAYOUT_SERVICE] 💸 Creating transfer for: {store_data['store_name']}")
                
                # แปลงเป็นสตางค์ (cents)
                amount_cents = int(float(store_data['transfer_amount']) * 100)
                
                # สร้าง Stripe Transfer
                transfer_params = {
                    "amount": amount_cents,
                    "currency": "sgd",  # ✅ ใช้ currency เดียวกับที่ checkout ตั้ง
                    "destination": store_data['stripe_account_id'],
                    "transfer_group": transfer_group,
                    "description": f"Payout for Order {order_id} - {store_data['store_name']}",
                    "metadata": {
                        "order_id": str(order_id),
                        "store_id": str(store_data['store_id']),
                        "store_name": store_data['store_name'],
                        "platform_fee": str(store_data['platform_fee'])
                    }
                }
                # ✅ ใส่ source_transaction เพื่อให้ Stripe ดึงเงินจาก charge นั้นโดยตรง
                if payment.stripe_charge_id:
                    transfer_params["source_transaction"] = payment.stripe_charge_id
                transfer = stripe.Transfer.create(**transfer_params)
                
                print(f"[PAYOUT_SERVICE] ✅ Transfer created: {transfer.id}")
                
                # บันทึกประวัติการโอนเงิน
                payout_record = StorePayout(
                    store_id=store_data['store_id'],
                    order_id=order_id,
                    transfer_id=transfer.id,
                    transfer_group=transfer_group,
                    amount=store_data['subtotal'],
                    platform_fee=store_data['platform_fee'],
                    net_amount=store_data['transfer_amount'],
                    status="completed",
                    transferred_at=now_utc()
                )
                db.add(payout_record)
                
                transfer_results.append({
                    "store_id": str(store_data['store_id']),
                    "store_name": store_data['store_name'],
                    "transfer_id": transfer.id,
                    "amount": float(store_data['transfer_amount']),
                    "platform_fee": float(store_data['platform_fee']),
                    "status": "success"
                })
                
            except Exception as e:
                import traceback
                print(f"[PAYOUT_SERVICE] ❌ Transfer error type: {type(e).__name__}")
                print(f"[PAYOUT_SERVICE] ❌ Transfer error: {repr(e)}")
                print(f"[PAYOUT_SERVICE] ❌ Traceback:\n{traceback.format_exc()}")
                
                # บันทึกความล้มเหลว
                payout_record = StorePayout(
                    store_id=store_data['store_id'],
                    order_id=order_id,
                    transfer_group=transfer_group,
                    amount=store_data['subtotal'],
                    platform_fee=store_data['platform_fee'],
                    net_amount=store_data['transfer_amount'],
                    status="failed",
                    error_message=str(e)
                )
                db.add(payout_record)
                
                transfer_results.append({
                    "store_id": str(store_data['store_id']),
                    "store_name": store_data['store_name'],
                    "transfer_id": None,
                    "amount": float(store_data['transfer_amount']),
                    "platform_fee": float(store_data['platform_fee']),
                    "status": "failed",
                    "error": str(e)
                })

        # 6. อัปเดตสถานะออเดอร์เป็น COMPLETED
        order.order_status = "COMPLETED"
        order.order_text_status = "ได้รับสินค้าแล้ว"
        order.completed_at = now_utc()
        order.updated_at = now_utc()
        
        db.commit()
        
        print(f"\n[PAYOUT_SERVICE] ✅ Payout process completed")
        print(f"[PAYOUT_SERVICE] Order Status: {order.order_status}")
        print(f"{'='*80}\n")

        # สรุปผลลัพธ์
        successful_transfers = [r for r in transfer_results if r["status"] == "success"]
        failed_transfers = [r for r in transfer_results if r["status"] == "failed"]
        
        total_transferred = sum(r["amount"] for r in successful_transfers)
        total_platform_fee = sum(r["platform_fee"] for r in successful_transfers)

        return {
            "order_id": str(order_id),
            "order_status": order.order_status,
            "completed_at": order.completed_at.isoformat() if order.completed_at else None,
            "transfer_group": transfer_group,
            "total_stores": len(store_amounts),
            "successful_transfers": len(successful_transfers),
            "failed_transfers": len(failed_transfers),
            "total_amount_transferred": total_transferred,
            "total_platform_fee": total_platform_fee,
            "transfers": transfer_results
        }

    @staticmethod
    def get_payout_history(
        db: Session,
        store_id: Optional[UUID] = None,
        order_id: Optional[UUID] = None
    ) -> List[Dict]:
        """
        ดึงประวัติการโอนเงิน
        
        Args:
            db: Database session
            store_id: กรองตามร้าน (optional)
            order_id: กรองตามออเดอร์ (optional)
        """
        query = db.query(StorePayout)
        
        if store_id:
            query = query.filter(StorePayout.store_id == store_id)
        
        if order_id:
            query = query.filter(StorePayout.order_id == order_id)
        
        payouts = query.order_by(StorePayout.created_at.desc()).all()
        
        return [
            {
                "payout_id": str(payout.payout_id),
                "store_id": str(payout.store_id),
                "order_id": str(payout.order_id),
                "transfer_id": payout.transfer_id,
                "transfer_group": payout.transfer_group,
                "amount": float(payout.amount),
                "platform_fee": float(payout.platform_fee),
                "net_amount": float(payout.net_amount),
                "status": payout.status,
                "error_message": payout.error_message,
                "transferred_at": payout.transferred_at.isoformat() if payout.transferred_at else None,
                "created_at": payout.created_at.isoformat() if payout.created_at else None
            }
            for payout in payouts
        ]