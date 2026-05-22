# app/services/report_service.py
"""
Report Service - ระบบรายงาน
Updated: เพิ่มการเปลี่ยนสถานะอัตโนมัติเมื่อดูรายงาน
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc
from typing import Optional, Tuple, Dict, Any, List
from datetime import datetime

from app.models.report import Report, ReportTypeEnum, ReportStatusEnum
from app.models.user import User
from app.models.store import Store
from app.schemas.report import (
    CreateReportRequest,
    UpdateReportStatusRequest,
    ReportFilterParams,
    translate_reason,
    translate_status
)


# ==================== Helper Functions ====================

def format_report_for_list(report: Report, db: Session) -> Dict[str, Any]:
    """แปลง Report object เป็น dict สำหรับแสดงในรายการ"""
    # ข้อมูลผู้รายงาน
    reporter_username = report.reporter.username if report.reporter else "Unknown"
    
    # ข้อมูลผู้ถูกรายงาน
    if report.report_type == ReportTypeEnum.USER:
        reported_name = report.reported_user.username if report.reported_user else "Unknown"
        reported_id = str(report.reported_user_id) if report.reported_user_id else ""
    else:  # STORE
        reported_name = report.reported_store.name if report.reported_store else "Unknown"
        reported_id = str(report.reported_store_id) if report.reported_store_id else ""
    
    return {
        'report_id': str(report.report_id),
        'report_type': report.report_type.value,
        'reason': report.reason.value,
        'status': report.status.value,
        'created_at': report.created_at,
        'reporter_username': reporter_username,
        'reported_name': reported_name,
        'reported_id': reported_id,
        'image_count': len(report.image_urls) if report.image_urls else 0,
        'image_urls': report.image_urls or [],
        'description': report.description,
    }


def format_report_detail(report: Report, db: Session) -> Dict[str, Any]:
    """แปลง Report object เป็น dict แบบละเอียด"""
    # ข้อมูลผู้รายงาน
    reporter_info = None
    if report.reporter:
        reporter_info = {
            'user_id': str(report.reporter.user_id),
            'username': report.reporter.username,
            'email': report.reporter.email,
        }
    
    # ข้อมูลผู้ถูกรายงาน
    reported_user_info = None
    reported_store_info = None
    
    if report.report_type == ReportTypeEnum.USER and report.reported_user:
        reported_user_info = {
            'user_id': str(report.reported_user.user_id),
            'username': report.reported_user.username,
            'email': report.reported_user.email,
            'is_active': report.reported_user.is_active,
        }
    elif report.report_type == ReportTypeEnum.STORE and report.reported_store:
        reported_store_info = {
            'store_id': str(report.reported_store.store_id),
            'name': report.reported_store.name,
            'is_active': report.reported_store.is_active,
            'rating': report.reported_store.rating,
        }
    
    # Admin reviewer
    reviewed_by_username = None
    if report.reviewer:
        reviewed_by_username = report.reviewer.username
    
    return {
        'report_id': str(report.report_id),
        'report_type': report.report_type.value,
        'reason': report.reason.value,
        'description': report.description,
        'status': report.status.value,
        'image_urls': report.image_urls or [],
        'created_at': report.created_at,
        'updated_at': report.updated_at,
        'reporter': reporter_info,
        'reported_user': reported_user_info,
        'reported_store': reported_store_info,
        'admin_note': report.admin_note,
        'reviewed_by': reviewed_by_username,
        'reviewed_at': report.reviewed_at,
    }


# ==================== Main Service Functions ====================

def create_report_service(
    db: Session,
    reporter_id: str,
    data: CreateReportRequest
) -> Tuple[Optional[Dict], Optional[str]]:
    """
    สร้างรายงาน
    
    Returns:
        (report_data, error)
    """
    try:
        # ตรวจสอบว่าผู้ถูกรายงานมีอยู่จริง
        if data.report_type == "user":
            reported_user = db.query(User).filter(
                User.user_id == data.reported_id
            ).first()
            
            if not reported_user:
                return None, "ไม่พบผู้ใช้ที่ต้องการรายงาน"
            
            # ไม่ให้รายงานตัวเอง
            if str(reported_user.user_id) == reporter_id:
                return None, "ไม่สามารถรายงานตัวเองได้"
            
            reported_user_id = reported_user.user_id
            reported_store_id = None
            
        else:  # store
            reported_store = db.query(Store).filter(
                Store.store_id == data.reported_id
            ).first()
            
            if not reported_store:
                return None, "ไม่พบร้านค้าที่ต้องการรายงาน"
            
            # ไม่ให้รายงานร้านของตัวเอง
            if str(reported_store.user_id) == reporter_id:
                return None, "ไม่สามารถรายงานร้านค้าของตัวเองได้"
            
            reported_user_id = None
            reported_store_id = reported_store.store_id
        
        # สร้างรายงาน
        new_report = Report(
            report_type=ReportTypeEnum(data.report_type),
            reason=data.reason,
            description=data.description,
            image_urls=data.image_urls,
            reporter_id=reporter_id,
            reported_user_id=reported_user_id,
            reported_store_id=reported_store_id,
            status=ReportStatusEnum.PENDING
        )
        
        db.add(new_report)
        db.commit()
        db.refresh(new_report)
        
        report_data = format_report_detail(new_report, db)
        
        return report_data, None
        
    except Exception as e:
        db.rollback()
        print(f"❌ [create_report_service] Error: {e}")
        return None, f"เกิดข้อผิดพลาด: {str(e)}"


def get_all_reports_service(
    db: Session,
    params: ReportFilterParams
) -> Tuple[Optional[Dict], Optional[str]]:
    """
    ดึงรายการรายงานทั้งหมด (Admin)
    
    Returns:
        (data, error)
    """
    try:
        query = db.query(Report)
        
        # กรองตามประเภท
        if params.report_type:
            query = query.filter(Report.report_type == params.report_type)
        
        # กรองตามสถานะ
        if params.status:
            query = query.filter(Report.status == params.status)
        
        # กรองตามเหตุผล
        if params.reason:
            query = query.filter(Report.reason == params.reason)
        
        # นับจำนวนทั้งหมด
        total = query.count()
        
        # เรียงลำดับและ pagination
        reports = query.order_by(desc(Report.created_at))\
                       .offset(params.skip)\
                       .limit(params.limit)\
                       .all()
        
        # แปลงเป็น dict
        reports_list = [format_report_for_list(report, db) for report in reports]
        
        return {
            'reports': reports_list,
            'total': total,
            'skip': params.skip,
            'limit': params.limit,

        }, None
        
    except Exception as e:
        print(f"❌ [get_all_reports_service] Error: {e}")
        return None, f"เกิดข้อผิดพลาด: {str(e)}"


def get_report_detail_service(
    db: Session,
    report_id: str,
    admin_id: Optional[str] = None,
    auto_mark_reviewing: bool = False
) -> Tuple[Optional[Dict], Optional[str]]:
    """
    ดูรายละเอียดรายงาน
    
    Args:
        db: Database session
        report_id: ID ของรายงาน
        admin_id: ID ของ Admin (ถ้ามี)
        auto_mark_reviewing: เปลี่ยนสถานะเป็น reviewing อัตโนมัติ (เมื่อกดดูรูป)
    
    Returns:
        (report_data, error)
    """
    try:
        report = db.query(Report).filter(Report.report_id == report_id).first()
        
        if not report:
            return None, "ไม่พบรายงาน"
        
        # ✅ เปลี่ยนสถานะอัตโนมัติจาก pending -> reviewing เมื่อ admin ดูรายงาน
        if auto_mark_reviewing and admin_id:
            if report.status == ReportStatusEnum.PENDING:
                report.status = ReportStatusEnum.REVIEWING
                report.reviewed_by = admin_id
                report.reviewed_at = datetime.utcnow()
                report.updated_at = datetime.utcnow()
                db.commit()
                db.refresh(report)
                print(f"✅ [AUTO] Changed status to REVIEWING for report {report_id}")
        
        report_data = format_report_detail(report, db)
        
        return report_data, None
        
    except Exception as e:
        db.rollback()
        print(f"❌ [get_report_detail_service] Error: {e}")
        return None, f"เกิดข้อผิดพลาด: {str(e)}"


def update_report_status_service(
    db: Session,
    report_id: str,
    admin_id: str,
    data: UpdateReportStatusRequest
) -> Tuple[Optional[Dict], Optional[str]]:
    """
    อัปเดตสถานะรายงาน (Admin)
    
    Returns:
        (report_data, error)
    """
    try:
        report = db.query(Report).filter(Report.report_id == report_id).first()
        
        if not report:
            return None, "ไม่พบรายงาน"
        
        # อัปเดตสถานะ
        report.status = data.status
        report.admin_note = data.admin_note
        report.reviewed_by = admin_id
        report.reviewed_at = datetime.utcnow()
        report.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(report)
        
        report_data = format_report_detail(report, db)
        
        return report_data, None
        
    except Exception as e:
        db.rollback()
        print(f"❌ [update_report_status_service] Error: {e}")
        return None, f"เกิดข้อผิดพลาด: {str(e)}"


def get_report_statistics_service(db: Session) -> Tuple[Optional[Dict], Optional[str]]:
    """
    ดึงสถิติรายงาน
    
    Returns:
        (statistics, error)
    """
    try:
        # จำนวนรายงานทั้งหมด
        total_reports = db.query(func.count(Report.report_id)).scalar() or 0
        
        # จำนวนตามสถานะ
        pending_reports = db.query(func.count(Report.report_id)).filter(
            Report.status == ReportStatusEnum.PENDING
        ).scalar() or 0
        
        reviewing_reports = db.query(func.count(Report.report_id)).filter(
            Report.status == ReportStatusEnum.REVIEWING
        ).scalar() or 0
        
        resolved_reports = db.query(func.count(Report.report_id)).filter(
            Report.status == ReportStatusEnum.RESOLVED
        ).scalar() or 0
        
        rejected_reports = db.query(func.count(Report.report_id)).filter(
            Report.status == ReportStatusEnum.REJECTED
        ).scalar() or 0
        
        # จำนวนตามประเภท
        reports_by_type = {}
        for report_type in ReportTypeEnum:
            count = db.query(func.count(Report.report_id)).filter(
                Report.report_type == report_type
            ).scalar() or 0
            reports_by_type[report_type.value] = count
        
        # จำนวนตามเหตุผล
        reports_by_reason = {}
        for reason in ["spam", "harassment", "inappropriate", "scam", "fake", "copyright", "other"]:
            count = db.query(func.count(Report.report_id)).filter(
                Report.reason == reason
            ).scalar() or 0
            reports_by_reason[reason] = count
        
        return {
            'total_reports': total_reports,
            'pending_reports': pending_reports,
            'reviewing_reports': reviewing_reports,
            'resolved_reports': resolved_reports,
            'rejected_reports': rejected_reports,
            'reports_by_type': reports_by_type,
            'reports_by_reason': reports_by_reason,
        }, None
        
    except Exception as e:
        print(f"❌ [get_report_statistics_service] Error: {e}")
        return None, f"เกิดข้อผิดพลาด: {str(e)}"