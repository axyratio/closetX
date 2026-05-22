# app/routes/admin_user_router.py
"""
API Routes สำหรับระบบจัดการผู้ใช้ (Admin)
"""
from fastapi import APIRouter, Depends, Query, Form
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from app.db.database import get_db
from app.core.authz import authenticate_token
from app.models.user import User
from app.schemas.user_management import (
    UserFilterParams,
    UserListResponse,
    UserDetailResponse,
    UpdateUserByAdmin,
    ToggleUserStatus,
    ChangeUserRole,
    UserStatisticsResponse,
    SuccessResponse,
    ErrorResponse
)
from app.services.user_management_service import (
    get_all_users_service,
    get_user_detail_service,
    update_user_by_admin_service,
    toggle_user_status_service,
    change_user_role_service,
    get_user_statistics_service,
    get_user_orders_service,
    get_user_reviews_service,
    get_order_detail_service
)
from app.utils.response_handler import success_response, error_response


router = APIRouter(prefix="/admin/users", tags=["Admin - User Management"])


def check_admin(auth_user: User):
    """ตรวจสอบว่าผู้ใช้เป็น Admin หรือไม่"""
    if not auth_user or not auth_user.role:
        raise ValueError("Unauthorized: Authentication required")
    
    if auth_user.role.role_name.upper() != "ADMIN":
        raise ValueError("Unauthorized: Admin access only")


# ==================== User Management Routes ====================

@router.get(
    "",
    summary="ดึงรายการผู้ใช้ทั้งหมด",
    description="ดึงรายการผู้ใช้พร้อมกรองและค้นหา (Admin only)"
)
def get_all_users(
    search: Optional[str] = Query(None, description="ค้นหาจาก username, email, ชื่อ"),
    role: Optional[str] = Query(None, description="กรองตาม role (user, admin)"),
    is_active: Optional[bool] = Query(None, description="กรองตามสถานะ active"),
    skip: int = Query(0, ge=0, description="จำนวนที่ข้าม"),
    limit: int = Query(20, ge=1, le=100, description="จำนวนต่อหน้า"),
    db: Session = Depends(get_db),
    auth_user: User = Depends(authenticate_token())
):
    """
    **ดึงรายการผู้ใช้ทั้งหมด**
    
    - ค้นหาจาก username, email, ชื่อ-นามสกุล
    - กรองตาม role และสถานะ
    - รองรับ pagination
    """
    try:
        check_admin(auth_user)
        
        params = UserFilterParams(
            search=search,
            role=role,
            is_active=is_active,
            skip=skip,
            limit=limit
        )
        
        data, error = get_all_users_service(db, params)
        
        if error:
            return error_response(error, {}, 400)
        
        return success_response("ดึงรายการผู้ใช้สำเร็จ", data)
        
    except ValueError as ve:
        return error_response(str(ve), {}, 403)
    except Exception as e:
        print(f"❌ [get_all_users] Error: {e}")
        return error_response(f"เกิดข้อผิดพลาด: {str(e)}", {}, 500)


@router.get(
    "/statistics",
    summary="สถิติผู้ใช้ทั้งหมด",
    description="ดึงสถิติผู้ใช้ในระบบ (Admin only)"
)
def get_user_statistics(
    db: Session = Depends(get_db),
    auth_user: User = Depends(authenticate_token())
):
    """
    **สถิติผู้ใช้ทั้งหมด**
    
    - จำนวนผู้ใช้ทั้งหมด
    - จำนวน active/inactive
    - จำนวน admin และ seller
    - ผู้ใช้ใหม่เดือนนี้
    """
    try:
        check_admin(auth_user)
        
        data, error = get_user_statistics_service(db)
        
        if error:
            return error_response(error, {}, 400)
        
        return success_response("ดึงสถิติสำเร็จ", data)
        
    except ValueError as ve:
        return error_response(str(ve), {}, 403)
    except Exception as e:
        print(f"❌ [get_user_statistics] Error: {e}")
        return error_response(f"เกิดข้อผิดพลาด: {str(e)}", {}, 500)


@router.get(
    "/{user_id}",
    summary="ดูรายละเอียดผู้ใช้",
    description="ดูข้อมูลผู้ใช้แบบละเอียด (Admin only)"
)
def get_user_detail(
    user_id: str,
    db: Session = Depends(get_db),
    auth_user: User = Depends(authenticate_token())
):
    """
    **ดูรายละเอียดผู้ใช้**
    
    - ข้อมูลส่วนตัว
    - role และสถานะ
    - สถิติการใช้งาน
    - ข้อมูลร้านค้า (ถ้ามี)
    """
    try:
        check_admin(auth_user)
        
        data, error = get_user_detail_service(db, user_id)
        
        if error:
            return error_response(error, {}, 404 if error == "ไม่พบผู้ใช้" else 400)
        
        return success_response("ดึงข้อมูลสำเร็จ", data)
        
    except ValueError as ve:
        return error_response(str(ve), {}, 403)
    except Exception as e:
        print(f"❌ [get_user_detail] Error: {e}")
        return error_response(f"เกิดข้อผิดพลาด: {str(e)}", {}, 500)


@router.patch(
    "/{user_id}",
    summary="แก้ไขข้อมูลผู้ใช้",
    description="แก้ไขข้อมูลผู้ใช้โดย Admin"
)
def update_user(
    user_id: str,
    first_name: Optional[str] = Form(None),
    last_name: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    phone_number: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    birth_date: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    auth_user: User = Depends(authenticate_token())
):
    """
    **แก้ไขข้อมูลผู้ใช้**
    
    - แก้ไขชื่อ, email, เบอร์โทร
    - แก้ไขเพศ, วันเกิด
    """
    try:
        check_admin(auth_user)
        
        # สร้าง update object
        from datetime import date
        updates = UpdateUserByAdmin(
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone_number=phone_number,
            gender=gender,
            birth_date=date.fromisoformat(birth_date) if birth_date else None
        )
        
        data, error = update_user_by_admin_service(db, user_id, updates)
        
        if error:
            return error_response(error, {}, 400)
        
        return success_response("แก้ไขข้อมูลสำเร็จ", data)
        
    except ValueError as ve:
        return error_response(str(ve), {}, 403)
    except Exception as e:
        print(f"❌ [update_user] Error: {e}")
        return error_response(f"เกิดข้อผิดพลาด: {str(e)}", {}, 500)


@router.patch(
    "/{user_id}/status",
    summary="เปิด/ปิดบัญชีผู้ใช้",
    description="เปิดหรือระงับบัญชีผู้ใช้ (Admin only)"
)
def toggle_user_status(
    user_id: str,
    is_active: bool = Form(..., description="true = เปิด, false = ระงับ"),
    db: Session = Depends(get_db),
    auth_user: User = Depends(authenticate_token())
):
    """
    **เปิด/ปิดบัญชีผู้ใช้**
    
    - true = เปิดใช้งาน
    - false = ระงับบัญชี
    """
    try:
        check_admin(auth_user)
        
        status_data = ToggleUserStatus(is_active=is_active)
        
        data, error = toggle_user_status_service(db, user_id, status_data)
        
        if error:
            return error_response(error, {}, 400)
        
        return success_response(data.get('message', 'อัปเดตสถานะสำเร็จ'), data)
        
    except ValueError as ve:
        return error_response(str(ve), {}, 403)
    except Exception as e:
        print(f"❌ [toggle_user_status] Error: {e}")
        return error_response(f"เกิดข้อผิดพลาด: {str(e)}", {}, 500)


@router.patch(
    "/{user_id}/role",
    summary="เปลี่ยน Role ผู้ใช้",
    description="เปลี่ยน role ของผู้ใช้ (Admin only)"
)
def change_user_role(
    user_id: str,
    role_name: str = Form(..., description="user หรือ admin"),
    db: Session = Depends(get_db),
    auth_user: User = Depends(authenticate_token())
):
    """
    **เปลี่ยน Role ผู้ใช้**
    
    - user = ผู้ใช้ทั่วไป
    - admin = ผู้ดูแลระบบ
    """
    try:
        check_admin(auth_user)
        
        role_data = ChangeUserRole(role_name=role_name)
        
        data, error = change_user_role_service(db, user_id, role_data)
        
        if error:
            return error_response(error, {}, 400)
        
        return success_response(data.get('message', 'เปลี่ยน role สำเร็จ'), data)
        
    except ValueError as ve:
        return error_response(str(ve), {}, 403)
    except Exception as e:
        print(f"❌ [change_user_role] Error: {e}")
        return error_response(f"เกิดข้อผิดพลาด: {str(e)}", {}, 500)


@router.get(
    "/{user_id}/orders",
    summary="ดูรายการสั่งซื้อของผู้ใช้",
    description="ดูประวัติการสั่งซื้อทั้งหมดของผู้ใช้ (Admin only)"
)
def get_user_orders(
    user_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    auth_user: User = Depends(authenticate_token())
):
    """
    **ดูรายการสั่งซื้อของผู้ใช้**
    
    - แสดงประวัติการสั่งซื้อทั้งหมด
    - รองรับ pagination
    """
    try:
        check_admin(auth_user)
        
        data, error = get_user_orders_service(db, user_id, skip, limit)
        
        if error:
            return error_response(error, {}, 400)
        
        return success_response("ดึงรายการสั่งซื้อสำเร็จ", data)
        
    except ValueError as ve:
        return error_response(str(ve), {}, 403)
    except Exception as e:
        print(f"❌ [get_user_orders] Error: {e}")
        return error_response(f"เกิดข้อผิดพลาด: {str(e)}", {}, 500)


@router.get(
    "/{user_id}/reviews",
    summary="ดูรีวิวของผู้ใช้",
    description="ดูรีวิวทั้งหมดที่ผู้ใช้เขียน (Admin only)"
)
def get_user_reviews(
    user_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    auth_user: User = Depends(authenticate_token())
):
    """
    **ดูรีวิวของผู้ใช้**
    
    - แสดงรีวิวทั้งหมดที่เขียน
    - พร้อมรูปภาพรีวิว
    """
    try:
        check_admin(auth_user)
        
        data, error = get_user_reviews_service(db, user_id, skip, limit)
        
        if error:
            return error_response(error, {}, 400)
        
        return success_response("ดึงรายการรีวิวสำเร็จ", data)
        
    except ValueError as ve:
        return error_response(str(ve), {}, 403)
    except Exception as e:
        print(f"❌ [get_user_reviews] Error: {e}")
        return error_response(f"เกิดข้อผิดพลาด: {str(e)}", {}, 500)

@router.get(
    "/orders/{order_id}",
    summary="ดูรายละเอียด Order (Admin)",
    description="Admin ดูรายละเอียด order ได้ทุก order โดยไม่จำกัด user"
)
def get_order_detail(
    order_id: str,
    db: Session = Depends(get_db),
    auth_user: User = Depends(authenticate_token())
):
    """
    **ดูรายละเอียด Order**

    - Admin เข้าถึงได้ทุก order
    - แสดง order_items, shipping_address, user_info ครบ
    """
    try:
        check_admin(auth_user)

        data, error = get_order_detail_service(db, order_id)

        if error:
            status_code = 404 if "ไม่พบ" in error else 400
            return error_response(error, {}, status_code)

        return success_response("ดึงรายละเอียด order สำเร็จ", data)

    except ValueError as ve:
        return error_response(str(ve), {}, 403)
    except Exception as e:
        print(f"❌ [get_order_detail] Error: {e}")
        return error_response(f"เกิดข้อผิดพลาด: {str(e)}", {}, 500)