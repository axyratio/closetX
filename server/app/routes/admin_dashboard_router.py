from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, case, extract
from datetime import datetime, timedelta
from typing import Optional

from app.db.database import get_db
from app.core.authz import authenticate_token
from app.models.store import Store
from app.models.product import Product, ProductVariant, VTONSession
from app.models.order import Order, OrderStatus
from app.models.user import User
from app.models.payment import Payment, PaymentStatus
from app.models.category import Category
from app.models.review import Review
from app.models.order_item import OrderItem
from app.models.vton_background import VTONBackground
from app.utils.response_handler import success_response, error_response

router = APIRouter(prefix="/admin/dashboard", tags=["Admin Dashboard"])


def check_admin(auth_user):
    """ตรวจสอบว่าผู้ใช้เป็น Admin หรือไม่"""
    if auth_user.role.role_name.upper() != "ADMIN":
        raise ValueError("Unauthorized: Admin access only")


@router.get("/overview")
def get_dashboard_overview(
    db: Session = Depends(get_db),
    auth_user=Depends(authenticate_token()),
):
    """
    ภาพรวม Dashboard:
    - จำนวนร้านค้าทั้งหมดและที่เปิดอยู่
    - จำนวนสินค้าทั้งหมด
    - จำนวนคำสั่งซื้อทั้งหมด
    - จำนวนผู้ใช้งานทั้งหมด
    """
    try:
        check_admin(auth_user)

        # ร้านค้าทั้งหมด
        all_stores = db.query(func.count(Store.store_id)).scalar()
        
        # ร้านค้าที่เปิดอยู่
        active_stores = db.query(func.count(Store.store_id)).filter(
            Store.is_active == True
        ).scalar()

        # สินค้าทั้งหมด (นับทั้งหมดรวม draft)
        all_products = db.query(func.count(Product.product_id)).scalar()
        
        # สินค้าที่กำลังขาย (active และไม่ใช่ draft)
        active_products = db.query(func.count(Product.product_id)).filter(
            and_(
                Product.is_active == True,
                Product.is_draft == False
            )
        ).scalar()

        # คำสั่งซื้อทั้งหมด (นับทุกสถานะ)
        all_orders = db.query(func.count(Order.order_id)).scalar()
        
        # คำสั่งซื้อที่ชำระแล้ว (ไม่นับ UNPAID)
        paid_orders = db.query(func.count(Order.order_id)).filter(
            Order.order_status != OrderStatus.UNPAID.value
        ).scalar()

        # ผู้ใช้งานทั้งหมด
        all_users = db.query(func.count(User.user_id)).scalar()
        
        # ผู้ใช้งานที่ active
        active_users = db.query(func.count(User.user_id)).filter(
            User.is_active == True
        ).scalar()

        payload = {
            "stores": {
                "total": all_stores or 0,
                "active": active_stores or 0,
                "inactive": (all_stores or 0) - (active_stores or 0)
            },
            "products": {
                "total": all_products or 0,
                "active": active_products or 0,
                "draft": all_products - active_products if all_products else 0
            },
            "orders": {
                "total": all_orders or 0,
                "paid": paid_orders or 0,
                "unpaid": (all_orders or 0) - (paid_orders or 0)
            },
            "users": {
                "total": all_users or 0,
                "active": active_users or 0,
                "inactive": (all_users or 0) - (active_users or 0)
            }
        }

        return success_response("ดึงข้อมูลภาพรวมสำเร็จ", payload)

    except ValueError as ve:
        print(f"❌ [Overview] ValueError: {ve}")
        return error_response(str(ve), {}, 403)
    except Exception as e:
        print(f"❌ [Overview] Error: {e}")
        return error_response(f"เกิดข้อผิดพลาด: {str(e)}", {}, 500)


@router.get("/products-by-category")
def get_products_by_category(
    db: Session = Depends(get_db),
    auth_user=Depends(authenticate_token()),
):
    """จำนวนสินค้าแต่ละหมวดหมู่"""
    try:
        check_admin(auth_user)

        results = (
            db.query(
                Category.name,
                func.count(Product.product_id).label("count")
            )
            .join(Product, Product.category_id == Category.category_id)
            .filter(
                and_(
                    Product.is_active == True,
                    Product.is_draft == False
                )
            )
            .group_by(Category.name)
            .all()
        )

        data = [{"category": r.name, "count": r.count} for r in results]

        return success_response("ดึงข้อมูลสินค้าแต่ละหมวดหมู่สำเร็จ", {"categories": data})

    except ValueError as ve:
        print(f"❌ [Products-by-Category] ValueError: {ve}")
        return error_response(str(ve), {}, 403)
    except Exception as e:
        print(f"❌ [Products-by-Category] Error: {e}")
        return error_response(f"เกิดข้อผิดพลาด: {str(e)}", {}, 500)


@router.get("/sales")
def get_sales_statistics(
    period: str = Query("daily", regex="^(daily|weekly|monthly)$"),
    db: Session = Depends(get_db),
    auth_user=Depends(authenticate_token()),
):
    """
    ยอดขาย:
    - daily: 7 วันล่าสุด
    - weekly: 4 สัปดาห์ล่าสุด
    - monthly: 6 เดือนล่าสุด
    """
    try:
        check_admin(auth_user)

        now = datetime.utcnow()

        if period == "daily":
            # 7 วันล่าสุด
            start_date = now - timedelta(days=7)
            
            results = (
                db.query(
                    func.date(Order.paid_at).label("date"),
                    func.sum(Order.total_price).label("total")
                )
                .filter(
                    and_(
                        Order.order_status != OrderStatus.UNPAID.value,
                        Order.order_status != OrderStatus.CANCELLED.value,
                        Order.paid_at >= start_date
                    )
                )
                .group_by(func.date(Order.paid_at))
                .order_by(func.date(Order.paid_at))
                .all()
            )

            data = [
                {
                    "label": r.date.strftime("%d/%m") if r.date else "",
                    "value": float(r.total or 0)
                }
                for r in results
            ]

        elif period == "weekly":
            # 4 สัปดาห์ล่าสุด
            start_date = now - timedelta(weeks=4)
            
            results = (
                db.query(
                    extract('year', Order.paid_at).label("year"),
                    extract('week', Order.paid_at).label("week"),
                    func.sum(Order.total_price).label("total")
                )
                .filter(
                    and_(
                        Order.order_status != OrderStatus.UNPAID.value,
                        Order.order_status != OrderStatus.CANCELLED.value,
                        Order.paid_at >= start_date
                    )
                )
                .group_by(
                    extract('year', Order.paid_at),
                    extract('week', Order.paid_at)
                )
                .order_by(
                    extract('year', Order.paid_at),
                    extract('week', Order.paid_at)
                )
                .all()
            )

            data = [
                {
                    "label": f"W{int(r.week)}/{int(r.year)}",
                    "value": float(r.total or 0)
                }
                for r in results
            ]

        else:  # monthly
            # 6 เดือนล่าสุด
            start_date = now - timedelta(days=180)
            
            results = (
                db.query(
                    extract('year', Order.paid_at).label("year"),
                    extract('month', Order.paid_at).label("month"),
                    func.sum(Order.total_price).label("total")
                )
                .filter(
                    and_(
                        Order.order_status != OrderStatus.UNPAID.value,
                        Order.order_status != OrderStatus.CANCELLED.value,
                        Order.paid_at >= start_date
                    )
                )
                .group_by(
                    extract('year', Order.paid_at),
                    extract('month', Order.paid_at)
                )
                .order_by(
                    extract('year', Order.paid_at),
                    extract('month', Order.paid_at)
                )
                .all()
            )

            data = [
                {
                    "label": f"{int(r.month)}/{int(r.year)}",
                    "value": float(r.total or 0)
                }
                for r in results
            ]

        return success_response(f"ดึงข้อมูลยอดขาย ({period}) สำเร็จ", {
            "period": period,
            "data": data
        })

    except ValueError as ve:
        print(f"❌ [Sales] ValueError: {ve}")
        return error_response(str(ve), {}, 403)
    except Exception as e:
        print(f"❌ [Sales] Error: {e}")
        return error_response(f"เกิดข้อผิดพลาด: {str(e)}", {}, 500)


@router.get("/payment-methods")
def get_payment_method_distribution(
    db: Session = Depends(get_db),
    auth_user=Depends(authenticate_token()),
):
    """สัดส่วนช่องทางการชำระเงิน"""
    try:
        check_admin(auth_user)

        results = (
            db.query(
                Payment.method_code,
                func.count(Payment.payment_id).label("count")
            )
            .filter(Payment.status == PaymentStatus.SUCCESS)
            .group_by(Payment.method_code)
            .all()
        )

        total = sum(r.count for r in results)
        data = [
            {
                "method": r.method_code or "Unknown",
                "count": r.count,
                "percentage": round((r.count / total * 100), 2) if total > 0 else 0
            }
            for r in results
        ]

        return success_response("ดึงข้อมูลช่องทางการชำระเงินสำเร็จ", {"methods": data})

    except ValueError as ve:
        print(f"❌ [Payment-Methods] ValueError: {ve}")
        return error_response(str(ve), {}, 403)
    except Exception as e:
        print(f"❌ [Payment-Methods] Error: {e}")
        return error_response(f"เกิดข้อผิดพลาด: {str(e)}", {}, 500)


@router.get("/order-status")
def get_order_status_distribution(
    db: Session = Depends(get_db),
    auth_user=Depends(authenticate_token()),
):
    """
    จำนวนออเดอร์แต่ละสถานะ (เฉพาะที่มีการใช้งานจริง)
    ตรวจสอบว่าสถานะไหนมีข้อมูลในระบบ ถึงจะแสดง
    """
    try:
        check_admin(auth_user)

        # Query เฉพาะสถานะที่มีข้อมูลจริงๆ ในระบบ
        results = (
            db.query(
                Order.order_status,
                func.count(Order.order_id).label("count")
            )
            .group_by(Order.order_status)
            .having(func.count(Order.order_id) > 0)  # เฉพาะที่มีข้อมูล
            .all()
        )

        # แปลงเป็น dict เพื่อดึงข้อมูลง่าย
        status_map = {
            'UNPAID': 'รอชำระเงิน',
            'PAID': 'ชำระเงินแล้ว',
            'PREPARING': 'กำลังเตรียมสินค้า',
            'SHIPPED': 'จัดส่งแล้ว',
            'DELIVERED': 'จัดส่งสำเร็จ',
            'COMPLETED': 'สำเร็จ',
            'RETURNING': 'กำลังคืนสินค้า',
            'RETURNED': 'คืนสินค้าแล้ว',
            'REJECTED' : 'ปฏิเสธการคืนสินค้า',
            'CANCELLED': 'ยกเลิก',
            'FAILED': 'ล้มเหลว'
        }

        # จำนวนรวมทั้งหมด
        total_orders = sum(r.count for r in results)

        data = [
            {
                "status": r.order_status,
                "status_th": status_map.get(r.order_status, r.order_status),
                "count": r.count,
                "percentage": round((r.count / total_orders * 100), 2) if total_orders > 0 else 0
            }
            for r in results
        ]

        # เรียงตามจำนวนมากไปน้อย
        data.sort(key=lambda x: x['count'], reverse=True)

        return success_response("ดึงข้อมูลสถานะออเดอร์สำเร็จ", {
            "statuses": data,
            "total_orders": total_orders,
            "total_status_types": len(data)  # จำนวนสถานะที่ใช้งานจริง
        })

    except ValueError as ve:
        print(f"❌ [Order-Status] ValueError: {ve}")
        return error_response(str(ve), {}, 403)
    except Exception as e:
        print(f"❌ [Order-Status] Error: {e}")
        return error_response(f"เกิดข้อผิดพลาด: {str(e)}", {}, 500)


@router.get("/vton-usage")
def get_vton_usage(
    db: Session = Depends(get_db),
    auth_user=Depends(authenticate_token()),
):
    """จำนวนการใช้งาน VTON"""
    try:
        check_admin(auth_user)

        # นับทั้งหมด
        total_usage = db.query(func.count(VTONSession.session_id)).scalar()

        # นับแยกตาม model
        by_model = (
            db.query(
                VTONSession.model_used,
                func.count(VTONSession.session_id).label("count")
            )
            .group_by(VTONSession.model_used)
            .all()
        )

        model_data = [
            {
                "model": r.model_used or "Unknown",
                "count": r.count
            }
            for r in by_model
        ]

        return success_response("ดึงข้อมูลการใช้งาน VTON สำเร็จ", {
            "total_usage": total_usage or 0,
            "by_model": model_data
        })

    except ValueError as ve:
        print(f"❌ [VTON-Usage] ValueError: {ve}")
        return error_response(str(ve), {}, 403)
    except Exception as e:
        print(f"❌ [VTON-Usage] Error: {e}")
        return error_response(f"เกิดข้อผิดพลาด: {str(e)}", {}, 500)


@router.get("/low-stock-products")
def get_low_stock_products(
    threshold: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    auth_user=Depends(authenticate_token()),
):
    """สินค้าที่เหลือน้อยกว่า threshold (default: 10)"""
    try:
        check_admin(auth_user)

        # ✅ ดึงเฉพาะ Variant ที่ stock < threshold (stock จริงอยู่ที่ variant)
        low_stock_variants = (
            db.query(
                ProductVariant.variant_id,
                ProductVariant.name_option,
                ProductVariant.stock,
                Product.product_name,
                Store.name.label("store_name")
            )
            .join(Product, ProductVariant.product_id == Product.product_id)
            .outerjoin(Store, Product.store_id == Store.store_id)
            .filter(
                and_(
                    Product.is_active == True,
                    Product.is_draft == False,
                    ProductVariant.is_active == True,
                    ProductVariant.stock < threshold
                )
            )
            .order_by(ProductVariant.stock.asc())
            .all()
        )

        variants_data = [
            {
                "type": "variant",
                "id": str(v.variant_id),
                "name": f"{v.product_name} - {v.name_option}",
                "stock": v.stock,
                "store_name": v.store_name or "ร้านค้าถูกลบออกจากระบบ"
            }
            for v in low_stock_variants
        ]

        return success_response("ดึงข้อมูลสินค้าเหลือน้อยสำเร็จ", {
            "threshold": threshold,
            "variants": variants_data,
            "total_count": len(variants_data)
        })

    except ValueError as ve:
        print(f"❌ [Low-Stock-Products] ValueError: {ve}")
        return error_response(str(ve), {}, 403)
    except Exception as e:
        print(f"❌ [Low-Stock-Products] Error: {e}")
        return error_response(f"เกิดข้อผิดพลาด: {str(e)}", {}, 500)


@router.get("/ratings")
def get_ratings_overview(
    db: Session = Depends(get_db),
    auth_user=Depends(authenticate_token()),
):
    """ภาพรวมเรทติ้ง"""
    try:
        check_admin(auth_user)

        # เรทติ้งเฉลี่ยทั้งหมด
        avg_rating = db.query(func.avg(Review.rating)).scalar()

        # นับจำนวนรีวิวแต่ละระดับ
        rating_distribution = (
            db.query(
                Review.rating,
                func.count(Review.review_id).label("count")
            )
            .group_by(Review.rating)
            .order_by(Review.rating.desc())
            .all()
        )

        total_reviews = db.query(func.count(Review.review_id)).scalar()

        distribution_data = [
            {
                "rating": r.rating,
                "count": r.count,
                "percentage": round((r.count / total_reviews * 100), 2) if total_reviews > 0 else 0
            }
            for r in rating_distribution
        ]

        return success_response("ดึงข้อมูลเรทติ้งสำเร็จ", {
            "average_rating": round(float(avg_rating or 0), 2),
            "total_reviews": total_reviews or 0,
            "distribution": distribution_data
        })

    except ValueError as ve:
        print(f"❌ [Ratings] ValueError: {ve}")
        return error_response(str(ve), {}, 403)
    except Exception as e:
        print(f"❌ [Ratings] Error: {e}")
        return error_response(f"เกิดข้อผิดพลาด: {str(e)}", {}, 500)


@router.get("/order-items-stats")
def get_order_items_stats(
    db: Session = Depends(get_db),
    auth_user=Depends(authenticate_token()),
):
    """
    สถิติ order items ที่ product หรือ store ถูกลบไปแล้ว
    แสดงให้ admin เห็นว่ามี orphan items เท่าไหร่ในระบบ
    """
    try:
        check_admin(auth_user)

        total_items = db.query(func.count(OrderItem.order_item_id)).scalar() or 0

        # นับ items ที่ product ถูกลบ (product_id เป็น NULL หลัง SET NULL)
        deleted_product_items = db.query(func.count(OrderItem.order_item_id)).filter(
            OrderItem.product_id == None
        ).scalar() or 0

        # นับ items ที่ store ถูกลบ (store_id เป็น NULL หลัง SET NULL)
        deleted_store_items = db.query(func.count(OrderItem.order_item_id)).filter(
            OrderItem.store_id == None
        ).scalar() or 0

        return success_response("ดึงสถิติ order items สำเร็จ", {
            "total_order_items": total_items,
            "items_with_deleted_product": deleted_product_items,
            "items_with_deleted_store": deleted_store_items,
        })

    except ValueError as ve:
        print(f"❌ [Order-Items-Stats] ValueError: {ve}")
        return error_response(str(ve), {}, 403)
    except Exception as e:
        print(f"❌ [Order-Items-Stats] Error: {e}")
        return error_response(f"เกิดข้อผิดพลาด: {str(e)}", {}, 500)