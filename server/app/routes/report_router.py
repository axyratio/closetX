# app/routes/report_router.py
"""
Report Router - ระบบรายงาน
Enhanced with detailed debugging and auto status change
"""
from fastapi import APIRouter, Depends, Query, Form, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional, List
from uuid import UUID
import json
import traceback

from app.db.database import get_db
from app.core.authz import authenticate_token
from app.models.user import User
from app.schemas.report import (
    CreateReportRequest,
    UpdateReportStatusRequest,
    ReportFilterParams,
    ReportType,
    ReportReason,
    ReportStatus,
)
from app.services.report_service import (
    create_report_service,
    get_all_reports_service,
    get_report_detail_service,
    update_report_status_service,
    get_report_statistics_service,
)
from app.utils.response_handler import success_response, error_response


router = APIRouter(prefix="/reports", tags=["Reports"])


# ==================== Public Routes ====================

@router.post(
    "",
    summary="สร้างรายงาน",
    description="ผู้ใช้/ร้านค้า สร้างรายงาน"
)
def create_report(
    report_type: str = Form(..., description="user หรือ store"),
    reported_id: str = Form(..., description="ID ของผู้ถูกรายงาน"),
    reason: str = Form(..., description="เหตุผล"),
    description: str = Form("", description="รายละเอียด"),
    image_urls: str = Form("[]", description="JSON array ของ image URLs"),
    db: Session = Depends(get_db),
    auth_user: User = Depends(authenticate_token())
):
    """
    **สร้างรายงาน**
    
    - report_type: "user" หรือ "store"
    - reported_id: user_id หรือ store_id
    - reason: spam, harassment, inappropriate, scam, fake, copyright, other
    - description: รายละเอียด (optional)
    - image_urls: JSON array เช่น ["url1", "url2"]
    """
    print("=" * 80)
    print("🔵 [DEBUG] create_report - START")
    print("=" * 80)
    
    try:
        # 🔍 Debug: แสดงข้อมูลที่ได้รับ
        print(f"📥 [INPUT] report_type: {report_type}")
        print(f"📥 [INPUT] reported_id: {reported_id}")
        print(f"📥 [INPUT] reason: {reason}")
        print(f"📥 [INPUT] description length: {len(description)}")
        print(f"📥 [INPUT] description: '{description}'")
        print(f"📥 [INPUT] image_urls (raw): {image_urls}")
        print(f"📥 [INPUT] auth_user: {auth_user.user_id} ({auth_user.username})")
        
        # 🔍 Debug: Parse image_urls
        try:
            image_urls_list = json.loads(image_urls) if image_urls else []
            print(f"✅ [PARSE] image_urls_list: {image_urls_list} (count: {len(image_urls_list)})")
        except json.JSONDecodeError as je:
            print(f"❌ [PARSE ERROR] JSON decode failed: {je}")
            return error_response(f"รูปแบบ image_urls ไม่ถูกต้อง: {str(je)}", {}, 400)
        
        # 🔍 Debug: Validate report_type
        try:
            validated_report_type = ReportType(report_type)
            print(f"✅ [VALIDATE] report_type: {validated_report_type}")
        except ValueError as ve:
            print(f"❌ [VALIDATE ERROR] Invalid report_type: {ve}")
            return error_response(f"report_type ไม่ถูกต้อง ต้องเป็น 'user' หรือ 'store'", {}, 400)
        
        # 🔍 Debug: Validate reason
        try:
            validated_reason = ReportReason(reason)
            print(f"✅ [VALIDATE] reason: {validated_reason}")
        except ValueError as ve:
            print(f"❌ [VALIDATE ERROR] Invalid reason: {ve}")
            valid_reasons = [r.value for r in ReportReason]
            return error_response(f"reason ไม่ถูกต้อง ต้องเป็นหนึ่งใน: {valid_reasons}", {}, 400)
        
        # 🔍 Debug: Create request object
        print(f"🔨 [CREATE] Creating CreateReportRequest object...")
        try:
            data = CreateReportRequest(
                report_type=validated_report_type,
                reported_id=reported_id,
                reason=validated_reason,
                description=description if description else "",
                image_urls=image_urls_list
            )
            print(f"✅ [CREATE] CreateReportRequest created successfully")
            print(f"   - report_type: {data.report_type}")
            print(f"   - reported_id: {data.reported_id}")
            print(f"   - reason: {data.reason}")
            print(f"   - description: '{data.description}'")
            print(f"   - image_urls: {data.image_urls}")
        except ValueError as ve:
            print(f"❌ [CREATE ERROR] Validation failed: {ve}")
            return error_response(f"ข้อมูลไม่ถูกต้อง: {str(ve)}", {}, 400)
        except Exception as e:
            print(f"❌ [CREATE ERROR] Unexpected error: {e}")
            print(f"   Traceback: {traceback.format_exc()}")
            return error_response(f"เกิดข้อผิดพลาดในการสร้าง request: {str(e)}", {}, 400)
        
        # 🔍 Debug: Call service
        print(f"🔨 [SERVICE] Calling create_report_service...")
        result, error = create_report_service(
            db,
            str(auth_user.user_id),
            data
        )
        
        if error:
            print(f"❌ [SERVICE ERROR] {error}")
            return error_response(error, {}, 400)
        
        print(f"✅ [SERVICE] Report created successfully!")
        print(f"   - report_id: {result.get('report_id', 'N/A')}")
        print("=" * 80)
        print("🔵 [DEBUG] create_report - END (SUCCESS)")
        print("=" * 80)
        
        return success_response("สร้างรายงานสำเร็จ", result)
        
    except Exception as e:
        print(f"❌ [EXCEPTION] Unexpected error: {e}")
        print(f"   Traceback: {traceback.format_exc()}")
        print("=" * 80)
        print("🔵 [DEBUG] create_report - END (ERROR)")
        print("=" * 80)
        return error_response(f"เกิดข้อผิดพลาด: {str(e)}", {}, 500)


# ==================== Admin Routes ====================

@router.get(
    "",
    summary="ดึงรายการรายงานทั้งหมด (Admin)",
    description="Admin ดูรายการรายงานทั้งหมด"
)
def get_all_reports(
    report_type: Optional[str] = Query(None, description="user/store"),
    status: Optional[str] = Query(None, description="pending/reviewing/resolved/rejected"),
    reason: Optional[str] = Query(None, description="spam/harassment/..."),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    auth_user: User = Depends(authenticate_token())
):
    """
    **ดึงรายการรายงานทั้งหมด (Admin only)**
    
    - รองรับการกรองตามประเภท, สถานะ, เหตุผล
    - รองรับ pagination
    """
    print("🔵 [DEBUG] get_all_reports - START")
    
    try:
        # ตรวจสอบ admin
        if not auth_user.role or auth_user.role.role_name.upper() != "ADMIN":
            print(f"❌ [AUTH] User {auth_user.username} is not admin")
            return error_response("ไม่มีสิทธิ์เข้าถึง", {}, 403)
        
        print(f"✅ [AUTH] Admin user: {auth_user.username}")
        print(f"📥 [PARAMS] report_type={report_type}, status={status}, reason={reason}")
        print(f"📥 [PARAMS] skip={skip}, limit={limit}")
        
        params = ReportFilterParams(
            report_type=ReportType(report_type) if report_type else None,
            status=ReportStatus(status) if status else None,
            reason=ReportReason(reason) if reason else None,
            skip=skip,
            limit=limit
        )
        
        data, error = get_all_reports_service(db, params)
        
        if error:
            print(f"❌ [SERVICE ERROR] {error}")
            return error_response(error, {}, 400)
        
        print(f"✅ [SUCCESS] Found {data.get('total', 0)} reports")
        return success_response("ดึงรายการรายงานสำเร็จ", data)
        
    except Exception as e:
        print(f"❌ [EXCEPTION] {e}")
        print(f"   Traceback: {traceback.format_exc()}")
        return error_response(f"เกิดข้อผิดพลาด: {str(e)}", {}, 500)


@router.get(
    "/statistics",
    summary="สถิติรายงาน (Admin)",
    description="Admin ดูสถิติรายงาน"
)
def get_report_statistics(
    db: Session = Depends(get_db),
    auth_user: User = Depends(authenticate_token())
):
    """**สถิติรายงาน (Admin only)**"""
    print("🔵 [DEBUG] get_report_statistics - START")
    
    try:
        if not auth_user.role or auth_user.role.role_name.upper() != "ADMIN":
            print(f"❌ [AUTH] User {auth_user.username} is not admin")
            return error_response("ไม่มีสิทธิ์เข้าถึง", {}, 403)
        
        data, error = get_report_statistics_service(db)
        
        if error:
            print(f"❌ [SERVICE ERROR] {error}")
            return error_response(error, {}, 400)
        
        print(f"✅ [SUCCESS] Statistics retrieved")
        return success_response("ดึงสถิติสำเร็จ", data)
        
    except Exception as e:
        print(f"❌ [EXCEPTION] {e}")
        print(f"   Traceback: {traceback.format_exc()}")
        return error_response(f"เกิดข้อผิดพลาด: {str(e)}", {}, 500)


@router.get(
    "/{report_id}",
    summary="ดูรายละเอียดรายงาน (Admin)",
    description="Admin ดูรายละเอียดรายงาน พร้อมเปลี่ยนสถานะอัตโนมัติ"
)
def get_report_detail(
    report_id: str,
    auto_mark_reviewing: bool = Query(False, description="เปลี่ยนสถานะเป็น reviewing อัตโนมัติ"),
    db: Session = Depends(get_db),
    auth_user: User = Depends(authenticate_token())
):
    """
    **ดูรายละเอียดรายงาน (Admin only)**
    
    - auto_mark_reviewing=true: เปลี่ยนสถานะจาก pending -> reviewing อัตโนมัติ
    """
    print(f"🔵 [DEBUG] get_report_detail - START (report_id: {report_id}, auto_mark_reviewing: {auto_mark_reviewing})")
    
    try:
        if not auth_user.role or auth_user.role.role_name.upper() != "ADMIN":
            print(f"❌ [AUTH] User {auth_user.username} is not admin")
            return error_response("ไม่มีสิทธิ์เข้าถึง", {}, 403)
        
        data, error = get_report_detail_service(
            db, 
            report_id,
            admin_id=str(auth_user.user_id),
            auto_mark_reviewing=auto_mark_reviewing
        )
        
        if error:
            print(f"❌ [SERVICE ERROR] {error}")
            return error_response(error, {}, 404 if error == "ไม่พบรายงาน" else 400)
        
        print(f"✅ [SUCCESS] Report detail retrieved")
        return success_response("ดึงข้อมูลสำเร็จ", data)
        
    except Exception as e:
        print(f"❌ [EXCEPTION] {e}")
        print(f"   Traceback: {traceback.format_exc()}")
        return error_response(f"เกิดข้อผิดพลาด: {str(e)}", {}, 500)


@router.patch(
    "/{report_id}/status",
    summary="อัปเดตสถานะรายงาน (Admin)",
    description="Admin อัปเดตสถานะรายงาน"
)
def update_report_status(
    report_id: str,
    status: str = Form(..., description="pending/reviewing/resolved/rejected"),
    admin_note: Optional[str] = Form(None, description="หมายเหตุ"),
    db: Session = Depends(get_db),
    auth_user: User = Depends(authenticate_token())
):
    """
    **อัปเดตสถานะรายงาน (Admin only)**
    
    - status: pending, reviewing, resolved, rejected
    - admin_note: หมายเหตุจาก Admin (optional)
    """
    print(f"🔵 [DEBUG] update_report_status - START (report_id: {report_id})")
    
    try:
        if not auth_user.role or auth_user.role.role_name.upper() != "ADMIN":
            print(f"❌ [AUTH] User {auth_user.username} is not admin")
            return error_response("ไม่มีสิทธิ์เข้าถึง", {}, 403)
        
        print(f"📥 [INPUT] status: {status}")
        print(f"📥 [INPUT] admin_note: {admin_note}")
        
        data = UpdateReportStatusRequest(
            status=ReportStatus(status),
            admin_note=admin_note
        )
        
        result, error = update_report_status_service(
            db,
            report_id,
            str(auth_user.user_id),
            data
        )
        
        if error:
            print(f"❌ [SERVICE ERROR] {error}")
            return error_response(error, {}, 400)
        
        print(f"✅ [SUCCESS] Status updated")
        return success_response("อัปเดตสถานะสำเร็จ", result)
        
    except Exception as e:
        print(f"❌ [EXCEPTION] {e}")
        print(f"   Traceback: {traceback.format_exc()}")
        return error_response(f"เกิดข้อผิดพลาด: {str(e)}", {}, 500)