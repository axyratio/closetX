# app/services/user_management_service.py
"""
Service สำหรับจัดการผู้ใช้ (Admin)
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc
from typing import Optional, Tuple, Dict, Any, List
from datetime import datetime, timedelta

from app.models.user import User
from app.models.role import Role
from app.models.store import Store
from app.models.order import Order
from app.models.review import Review
from app.schemas.user_management import (
    UserFilterParams,
    UpdateUserByAdmin,
    ToggleUserStatus,
    ChangeUserRole
)


# ==================== Helper Functions ====================

def get_user_statistics(db: Session, user_id) -> Dict[str, Any]:
    """คำนวณสถิติของผู้ใช้"""
    try:
        # นับจำนวน order
        total_orders = db.query(func.count(Order.order_id)).filter(
            Order.user_id == user_id
        ).scalar() or 0
        
        # นับจำนวนรีวิว
        total_reviews = db.query(func.count(Review.review_id)).filter(
            Review.user_id == user_id
        ).scalar() or 0
        
        # ยอดเงินที่ใช้ไป (เฉพาะ order ที่ชำระแล้ว)
        total_spent = db.query(func.sum(Order.total_price)).filter(
            Order.user_id == user_id,
            Order.order_status != 'UNPAID'
        ).scalar() or 0.0
        
        # ตรวจสอบว่ามีร้านค้าหรือไม่
        has_store = db.query(Store).filter(
            Store.user_id == user_id
        ).first() is not None
        
        return {
            'total_orders': total_orders,
            'total_reviews': total_reviews,
            'total_spent': float(total_spent),
            'has_store': has_store
        }
    except Exception as e:
        print(f"❌ Error getting user statistics: {e}")
        return {
            'total_orders': 0,
            'total_reviews': 0,
            'total_spent': 0.0,
            'has_store': False
        }


def format_user_for_list(user: User, db: Session) -> Dict[str, Any]:
    """แปลง User object เป็น dict สำหรับแสดงในรายการ"""
    # นับจำนวน order
    total_orders = db.query(func.count(Order.order_id)).filter(
        Order.user_id == user.user_id
    ).scalar() or 0
    
    # ตรวจสอบว่ามีร้านค้าหรือไม่
    has_store = db.query(Store).filter(
        Store.user_id == user.user_id
    ).first() is not None
    
    return {
        'user_id': str(user.user_id),
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'phone_number': user.phone_number,
        'is_active': user.is_active,
        'role_name': user.role.role_name if user.role else 'user',
        'created_at': user.created_at,
        'total_orders': total_orders,
        'has_store': has_store
    }


def format_user_detail(user: User, db: Session) -> Dict[str, Any]:
    """แปลง User object เป็น dict แบบละเอียด"""
    # สถิติ
    statistics = get_user_statistics(db, user.user_id)
    
    # ข้อมูลร้านค้า (ถ้ามี)
    store_data = None
    store = db.query(Store).filter(Store.user_id == user.user_id).first()
    if store:
        store_data = {
            'store_id': str(store.store_id),
            'name': store.name,
            'description': store.description,
            'logo_path': store.logo_path,
            'is_active': store.is_active,
            'rating': store.rating
        }
    
    return {
        'user_id': str(user.user_id),
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'phone_number': user.phone_number,
        'gender': user.gender,
        'birth_date': user.birth_date,
        'is_active': user.is_active,
        'pending_email': user.pending_email,
        'created_at': user.created_at,
        'updated_at': user.updated_at,
        'role': {
            'role_id': user.role.role_id,
            'role_name': user.role.role_name
        } if user.role else {'role_id': 1, 'role_name': 'user'},
        'statistics': statistics,
        'store': store_data
    }


# ==================== Main Service Functions ====================

def get_all_users_service(
    db: Session,
    params: UserFilterParams
) -> Tuple[Optional[Dict], Optional[str]]:
    """
    ดึงรายการผู้ใช้ทั้งหมดพร้อมกรอง
    
    Returns:
        (data, error)
        - data: {'users': [...], 'total': int, 'skip': int, 'limit': int}
        - error: ข้อความ error (ถ้ามี)
    """
    try:
        # Query พื้นฐาน
        query = db.query(User)
        
        # กรองตามคำค้นหา
        if params.search:
            search_term = f"%{params.search}%"
            query = query.filter(
                or_(
                    User.username.ilike(search_term),
                    User.email.ilike(search_term),
                    User.first_name.ilike(search_term),
                    User.last_name.ilike(search_term),
                    User.phone_number.ilike(search_term)
                )
            )
        
        # กรองตาม role
        if params.role:
            query = query.join(Role).filter(
                Role.role_name == params.role.lower()
            )
        
        # กรองตาม is_active
        if params.is_active is not None:
            query = query.filter(User.is_active == params.is_active)
        
        # นับจำนวนทั้งหมด
        total = query.count()
        
        # เรียงลำดับและ pagination
        users = query.order_by(desc(User.created_at))\
                     .offset(params.skip)\
                     .limit(params.limit)\
                     .all()
        
        # แปลงเป็น dict
        users_list = [format_user_for_list(user, db) for user in users]
        
        return {
            'users': users_list,
            'total': total,
            'skip': params.skip,
            'limit': params.limit
        }, None
        
    except Exception as e:
        print(f"❌ [get_all_users_service] Error: {e}")
        return None, f"เกิดข้อผิดพลาด: {str(e)}"


def get_user_detail_service(
    db: Session,
    user_id: str
) -> Tuple[Optional[Dict], Optional[str]]:
    """
    ดูรายละเอียดผู้ใช้
    
    Returns:
        (user_data, error)
    """
    try:
        # ค้นหาผู้ใช้
        user = db.query(User).filter(User.user_id == user_id).first()
        
        if not user:
            return None, "ไม่พบผู้ใช้"
        
        # แปลงเป็น dict
        user_data = format_user_detail(user, db)
        
        return user_data, None
        
    except Exception as e:
        print(f"❌ [get_user_detail_service] Error: {e}")
        return None, f"เกิดข้อผิดพลาด: {str(e)}"


def update_user_by_admin_service(
    db: Session,
    user_id: str,
    updates: UpdateUserByAdmin
) -> Tuple[Optional[Dict], Optional[str]]:
    """
    แก้ไขข้อมูลผู้ใช้โดย Admin
    
    Returns:
        (updated_user, error)
    """
    try:
        # ค้นหาผู้ใช้
        user = db.query(User).filter(User.user_id == user_id).first()
        
        if not user:
            return None, "ไม่พบผู้ใช้"
        
        # ตรวจสอบ email ซ้ำ
        if updates.email and updates.email != user.email:
            existing_email = db.query(User).filter(
                User.email == updates.email,
                User.user_id != user_id
            ).first()
            
            if existing_email:
                return None, "Email นี้ถูกใช้งานแล้ว"
        
        # อัปเดตข้อมูล
        update_data = updates.dict(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                setattr(user, field, value)
        
        user.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(user)
        
        # แปลงเป็น dict
        user_data = format_user_detail(user, db)
        
        return user_data, None
        
    except Exception as e:
        db.rollback()
        print(f"❌ [update_user_by_admin_service] Error: {e}")
        return None, f"เกิดข้อผิดพลาด: {str(e)}"


def toggle_user_status_service(
    db: Session,
    user_id: str,
    status_data: ToggleUserStatus
) -> Tuple[Optional[Dict], Optional[str]]:
    """
    เปิด/ปิดการใช้งานบัญชี
    
    Returns:
        (result, error)
    """
    try:
        # ค้นหาผู้ใช้
        user = db.query(User).filter(User.user_id == user_id).first()
        
        if not user:
            return None, "ไม่พบผู้ใช้"
        
        # อัปเดตสถานะ
        user.is_active = status_data.is_active
        user.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(user)
        
        status_text = "เปิดใช้งาน" if status_data.is_active else "ระงับบัญชี"
        
        return {
            'user_id': str(user.user_id),
            'username': user.username,
            'is_active': user.is_active,
            'message': f'{status_text}บัญชีสำเร็จ'
        }, None
        
    except Exception as e:
        db.rollback()
        print(f"❌ [toggle_user_status_service] Error: {e}")
        return None, f"เกิดข้อผิดพลาด: {str(e)}"


def change_user_role_service(
    db: Session,
    user_id: str,
    role_data: ChangeUserRole
) -> Tuple[Optional[Dict], Optional[str]]:
    """
    เปลี่ยน role ของผู้ใช้
    
    Returns:
        (result, error)
    """
    try:
        # ค้นหาผู้ใช้
        user = db.query(User).filter(User.user_id == user_id).first()
        
        if not user:
            return None, "ไม่พบผู้ใช้"
        
        # ค้นหา role
        new_role = db.query(Role).filter(
            Role.role_name == role_data.role_name
        ).first()
        
        if not new_role:
            return None, f"ไม่พบ role: {role_data.role_name}"
        
        # อัปเดต role
        old_role_name = user.role.role_name if user.role else 'user'
        user.role_id = new_role.role_id
        user.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(user)
        
        return {
            'user_id': str(user.user_id),
            'username': user.username,
            'old_role': old_role_name,
            'new_role': role_data.role_name,
            'message': f'เปลี่ยน role จาก {old_role_name} เป็น {role_data.role_name} สำเร็จ'
        }, None
        
    except Exception as e:
        db.rollback()
        print(f"❌ [change_user_role_service] Error: {e}")
        return None, f"เกิดข้อผิดพลาด: {str(e)}"


def get_user_statistics_service(db: Session) -> Tuple[Optional[Dict], Optional[str]]:
    """
    ดึงสถิติผู้ใช้ทั้งหมด
    
    Returns:
        (statistics, error)
    """
    try:
        # จำนวนผู้ใช้ทั้งหมด
        total_users = db.query(func.count(User.user_id)).scalar() or 0
        
        # จำนวนผู้ใช้ที่ active
        active_users = db.query(func.count(User.user_id)).filter(
            User.is_active == True
        ).scalar() or 0
        
        # จำนวนผู้ใช้ที่ inactive
        inactive_users = total_users - active_users
        
        # จำนวน admin
        total_admins = db.query(func.count(User.user_id)).join(Role).filter(
            Role.role_name == 'admin'
        ).scalar() or 0
        
        # จำนวนผู้ขาย (มี store)
        total_sellers = db.query(func.count(Store.store_id)).scalar() or 0
        
        # ผู้ใช้ใหม่เดือนนี้
        start_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0)
        new_users_this_month = db.query(func.count(User.user_id)).filter(
            User.created_at >= start_of_month
        ).scalar() or 0
        
        # จำนวนผู้ใช้แต่ละ role
        users_by_role = {}
        roles = db.query(Role).all()
        for role in roles:
            count = db.query(func.count(User.user_id)).filter(
                User.role_id == role.role_id
            ).scalar() or 0
            users_by_role[role.role_name] = count
        
        return {
            'total_users': total_users,
            'active_users': active_users,
            'inactive_users': inactive_users,
            'total_admins': total_admins,
            'total_sellers': total_sellers,
            'new_users_this_month': new_users_this_month,
            'users_by_role': users_by_role
        }, None
        
    except Exception as e:
        print(f"❌ [get_user_statistics_service] Error: {e}")
        return None, f"เกิดข้อผิดพลาด: {str(e)}"


def get_user_orders_service(
    db: Session,
    user_id: str,
    skip: int = 0,
    limit: int = 20
) -> Tuple[Optional[Dict], Optional[str]]:
    """
    ดูรายการสั่งซื้อของผู้ใช้
    
    Returns:
        (orders_data, error)
    """
    try:
        # ตรวจสอบว่ามีผู้ใช้
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            return None, "ไม่พบผู้ใช้"
        
        # ดึง orders
        query = db.query(Order).filter(Order.user_id == user_id)
        total = query.count()
        
        orders = query.order_by(desc(Order.created_at))\
                      .offset(skip)\
                      .limit(limit)\
                      .all()
        
        # แปลงเป็น list
        orders_list = []
        for order in orders:
            # นับจำนวนสินค้า
            item_count = len(order.order_items) if order.order_items else 0
            
            # ชื่อร้านค้า
            store_name = order.store.name if order.store else None
            
            orders_list.append({
                'order_id': str(order.order_id),
                'order_status': order.order_status,
                'order_text_status': order.order_text_status,
                'total_price': float(order.total_price),
                'created_at': order.created_at,
                'paid_at': order.paid_at,
                'store_name': store_name,
                'item_count': item_count
            })
        
        return {
            'orders': orders_list,
            'total': total,
            'skip': skip,
            'limit': limit
        }, None
        
    except Exception as e:
        print(f"❌ [get_user_orders_service] Error: {e}")
        return None, f"เกิดข้อผิดพลาด: {str(e)}"


def get_user_reviews_service(
    db: Session,
    user_id: str,
    skip: int = 0,
    limit: int = 20
) -> Tuple[Optional[Dict], Optional[str]]:
    """
    ดูรีวิวของผู้ใช้
    
    Returns:
        (reviews_data, error)
    """
    try:
        # ตรวจสอบว่ามีผู้ใช้
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            return None, "ไม่พบผู้ใช้"
        
        # ดึง reviews
        query = db.query(Review).filter(Review.user_id == user_id)
        total = query.count()
        
        reviews = query.order_by(desc(Review.created_at))\
                       .offset(skip)\
                       .limit(limit)\
                       .all()
        
        # แปลงเป็น list
        reviews_list = []
        for review in reviews:
            # รูปภาพรีวิว
            image_urls = [img.image_url for img in review.images] if review.images else []
            
            reviews_list.append({
                'review_id': str(review.review_id),
                'product_id': str(review.product_id),
                'product_name': review.product.product_name if review.product else 'Unknown',
                'rating': review.rating,
                'comment': review.comment,
                'created_at': review.created_at,
                'images': image_urls
            })
        
        return {
            'reviews': reviews_list,
            'total': total,
            'skip': skip,
            'limit': limit
        }, None
        
    except Exception as e:
        print(f"❌ [get_user_reviews_service] Error: {e}")
        return None, f"เกิดข้อผิดพลาด: {str(e)}"

def get_order_detail_service(
    db: Session,
    order_id: str
) -> Tuple[Optional[Dict], Optional[str]]:
    """
    ดูรายละเอียด order แบบละเอียด (Admin only)
    - ไม่จำกัดแค่ user_id → admin ดูได้ทุก order
    - reuse OrderService.format_order_response เพื่อ format เหมือน user endpoint

    Returns:
        (order_data, error)
    """
    try:
        from uuid import UUID
        from sqlalchemy.orm import joinedload
        from app.models.order import Order
        from app.models.order_item import OrderItem
        from app.services.order_service import OrderService

        try:
            order_uuid = UUID(order_id)
        except ValueError:
            return None, "order_id ไม่ถูกต้อง"

        order = (
            db.query(Order)
            .options(
                joinedload(Order.store),
                joinedload(Order.order_items).joinedload(OrderItem.product),
                joinedload(Order.order_items).joinedload(OrderItem.variant),
                joinedload(Order.payment),
                joinedload(Order.shipping_address),
                joinedload(Order.return_requests),
                joinedload(Order.user),
            )
            .filter(Order.order_id == order_uuid)
            .first()
        )

        if not order:
            return None, "ไม่พบ order"

        data = OrderService.format_order_response(order)

        # เพิ่มข้อมูล shipping_address และ user ที่ admin ควรเห็น
        if order.shipping_address:
            sa = order.shipping_address
            data["shipping_address"] = {
                "full_name": sa.full_name,
                "phone_number": sa.phone_number,
                "address_line": sa.address_line,
                "sub_district": sa.sub_district,
                "district": sa.district,
                "province": sa.province,
                "postal_code": sa.postal_code,
            }
        else:
            data["shipping_address"] = None

        if order.user:
            data["user_info"] = {
                "user_id": str(order.user.user_id),
                "username": order.user.username,
                "email": order.user.email,
            }
        else:
            data["user_info"] = None

        return data, None

    except Exception as e:
        print(f"❌ [get_order_detail_service] Error: {e}")
        return None, f"เกิดข้อผิดพลาด: {str(e)}"