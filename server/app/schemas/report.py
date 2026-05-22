# app/schemas/report.py
"""
Schemas สำหรับระบบรายงาน (Report System)
Updated: ลบข้อจำกัดตัวอักษรขั้นต่ำ
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum


class ReportType(str, Enum):
    """ประเภทรายงาน"""
    USER = "user"           # ร้านค้ารายงานผู้ใช้
    STORE = "store"         # ผู้ใช้รายงานร้านค้า


class ReportReason(str, Enum):
    """เหตุผลในการรายงาน"""
    SPAM = "spam"                       # สแปม
    HARASSMENT = "harassment"           # การล่วงละเมิด
    INAPPROPRIATE = "inappropriate"     # เนื้อหาไม่เหมาะสม
    SCAM = "scam"                      # การหลอกลวง
    FAKE = "fake"                      # สินค้าปลอม/ร้านปลอม
    COPYRIGHT = "copyright"            # ละเมิดลิขสิทธิ์
    OTHER = "other"                    # อื่นๆ


class ReportStatus(str, Enum):
    """สถานะรายงาน"""
    PENDING = "pending"         # รอตรวจสอบ
    REVIEWING = "reviewing"     # กำลังตรวจสอบ
    RESOLVED = "resolved"       # แก้ไขแล้ว
    REJECTED = "rejected"       # ปฏิเสธ


# ==================== Request Schemas ====================

class CreateReportRequest(BaseModel):
    """สร้างรายงาน"""
    report_type: ReportType = Field(..., description="ประเภทรายงาน (user/store)")
    reported_id: str = Field(..., description="ID ของผู้ถูกรายงาน (user_id หรือ store_id)")
    reason: ReportReason = Field(..., description="เหตุผลในการรายงาน")
    description: str = Field(default="", max_length=1000, description="รายละเอียดการรายงาน (optional)")  # ✅ เปลี่ยนจาก min_length=10
    image_urls: List[str] = Field(default=[], description="URL รูปภาพหลักฐาน (สูงสุด 5 รูป)")
    
    @validator('image_urls')
    def validate_image_urls(cls, v):
        if len(v) > 5:
            raise ValueError('สามารถอัปโหลดรูปได้สูงสุด 5 รูป')
        return v
    
    @validator('description')
    def validate_description(cls, v):
        # ✅ อนุญาตให้ส่ง empty string ได้
        if v is None:
            return ""
        return v.strip()


class UpdateReportStatusRequest(BaseModel):
    """อัปเดตสถานะรายงาน (Admin)"""
    status: ReportStatus = Field(..., description="สถานะใหม่")
    admin_note: Optional[str] = Field(None, max_length=500, description="หมายเหตุจาก Admin")


class ReportFilterParams(BaseModel):
    """Query parameters สำหรับกรองรายงาน"""
    report_type: Optional[ReportType] = Field(None, description="ประเภทรายงาน")
    status: Optional[ReportStatus] = Field(None, description="สถานะรายงาน")
    reason: Optional[ReportReason] = Field(None, description="เหตุผล")
    skip: int = Field(0, ge=0)
    limit: int = Field(20, ge=1, le=100)


# ==================== Response Schemas ====================

class ReporterInfo(BaseModel):
    """ข้อมูลผู้รายงาน"""
    user_id: UUID
    username: str
    email: str
    
    class Config:
        from_attributes = True


class ReportedUserInfo(BaseModel):
    """ข้อมูลผู้ใช้ที่ถูกรายงาน"""
    user_id: UUID
    username: str
    email: str
    is_active: bool
    
    class Config:
        from_attributes = True


class ReportedStoreInfo(BaseModel):
    """ข้อมูลร้านค้าที่ถูกรายงาน"""
    store_id: UUID
    name: str
    is_active: bool
    rating: float
    
    class Config:
        from_attributes = True


class ReportListItem(BaseModel):
    """รายการรายงาน (สำหรับแสดงในตาราง)"""
    report_id: UUID
    report_type: str
    reason: str
    status: str
    created_at: datetime
    
    # ข้อมูลผู้รายงาน
    reporter_username: str
    
    # ข้อมูลผู้ถูกรายงาน
    reported_name: str  # username หรือ store name
    reported_id: str    # user_id หรือ store_id
    
    # สถิติ
    image_count: int = 0
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None,
        }


class ReportDetailResponse(BaseModel):
    """รายละเอียดรายงานแบบเต็ม"""
    report_id: UUID
    report_type: str
    reason: str
    description: str
    status: str
    image_urls: List[str]
    created_at: datetime
    updated_at: Optional[datetime]
    
    # ข้อมูลผู้รายงาน
    reporter: ReporterInfo
    
    # ข้อมูลผู้ถูกรายงาน (user หรือ store)
    reported_user: Optional[ReportedUserInfo] = None
    reported_store: Optional[ReportedStoreInfo] = None
    
    # Admin
    admin_note: Optional[str] = None
    reviewed_by: Optional[str] = None  # admin username
    reviewed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None,
        }


class ReportListResponse(BaseModel):
    """Response สำหรับรายการรายงาน"""
    reports: List[ReportListItem]
    total: int
    skip: int
    limit: int


class ReportStatistics(BaseModel):
    """สถิติรายงาน"""
    total_reports: int
    pending_reports: int
    reviewing_reports: int
    resolved_reports: int
    rejected_reports: int
    
    reports_by_type: dict = Field(default_factory=dict)
    reports_by_reason: dict = Field(default_factory=dict)


# ==================== Helper Functions ====================

REASON_TRANSLATION = {
    "spam": "สแปม",
    "harassment": "การล่วงละเมิด",
    "inappropriate": "เนื้อหาไม่เหมาะสม",
    "scam": "การหลอกลวง",
    "fake": "สินค้าปลอม/ร้านปลอม",
    "copyright": "ละเมิดลิขสิทธิ์",
    "other": "อื่นๆ",
}

STATUS_TRANSLATION = {
    "pending": "รอตรวจสอบ",
    "reviewing": "กำลังตรวจสอบ",
    "resolved": "แก้ไขแล้ว",
    "rejected": "ปฏิเสธ",
}

def translate_reason(reason: str) -> str:
    """แปลเหตุผลเป็นภาษาไทย"""
    return REASON_TRANSLATION.get(reason.lower(), reason)

def translate_status(status: str) -> str:
    """แปลสถานะเป็นภาษาไทย"""
    return STATUS_TRANSLATION.get(status.lower(), status)