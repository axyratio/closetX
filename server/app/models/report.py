# app/models/report.py
"""
Report Model - ระบบรายงาน
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.db.database import Base


class ReportTypeEnum(str, enum.Enum):
    """ประเภทรายงาน"""
    USER = "user"
    STORE = "store"


class ReportReasonEnum(str, enum.Enum):
    """เหตุผลในการรายงาน"""
    SPAM = "spam"
    HARASSMENT = "harassment"
    INAPPROPRIATE = "inappropriate"
    SCAM = "scam"
    FAKE = "fake"
    COPYRIGHT = "copyright"
    OTHER = "other"


class ReportStatusEnum(str, enum.Enum):
    """สถานะรายงาน"""
    PENDING = "pending"
    REVIEWING = "reviewing"
    RESOLVED = "resolved"
    REJECTED = "rejected"


class Report(Base):
    """
    ตารางรายงาน
    - ร้านค้าสามารถรายงานผู้ใช้ได้
    - ผู้ใช้สามารถรายงานร้านค้าได้
    """
    __tablename__ = "reports"
    
    report_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # ประเภทและเหตุผล
    report_type = Column(
        SQLEnum(ReportTypeEnum, name="report_type_enum"),
        nullable=False,
        comment="ประเภทรายงาน (user/store)"
    )
    reason = Column(
        SQLEnum(ReportReasonEnum, name="report_reason_enum"),
        nullable=False,
        comment="เหตุผลในการรายงาน"
    )
    description = Column(Text, nullable=False, comment="รายละเอียดการรายงาน")
    
    # รูปภาพหลักฐาน (เก็บเป็น array ของ URLs)
    image_urls = Column(ARRAY(String), default=[], comment="URLs รูปภาพหลักฐาน")
    
    # สถานะ
    status = Column(
        SQLEnum(ReportStatusEnum, name="report_status_enum"),
        default=ReportStatusEnum.PENDING,
        nullable=False,
        comment="สถานะรายงาน"
    )
    
    # ผู้รายงาน (reporter)
    reporter_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        comment="ผู้รายงาน"
    )
    
    # ผู้ถูกรายงาน (reported)
    # ถ้า report_type = "user" → reported_user_id จะมีค่า
    # ถ้า report_type = "store" → reported_store_id จะมีค่า
    reported_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=True,
        comment="ผู้ใช้ที่ถูกรายงาน"
    )
    reported_store_id = Column(
        UUID(as_uuid=True),
        ForeignKey("stores.store_id", ondelete="CASCADE"),
        nullable=True,
        comment="ร้านค้าที่ถูกรายงาน"
    )
    
    # Admin review
    admin_note = Column(Text, nullable=True, comment="หมายเหตุจาก Admin")
    reviewed_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
        comment="Admin ที่ตรวจสอบ"
    )
    reviewed_at = Column(DateTime, nullable=True, comment="เวลาที่ตรวจสอบ")
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    reporter = relationship(
        "User",
        foreign_keys=[reporter_id],
        backref="reports_made"
    )
    reported_user = relationship(
        "User",
        foreign_keys=[reported_user_id],
        backref="reports_received"
    )
    reported_store = relationship(
        "Store",
        foreign_keys=[reported_store_id],
        backref="reports_received"
    )
    reviewer = relationship(
        "User",
        foreign_keys=[reviewed_by],
        backref="reports_reviewed"
    )
    
    def __repr__(self):
        return f"<Report {self.report_id} - {self.report_type}: {self.reason}>"