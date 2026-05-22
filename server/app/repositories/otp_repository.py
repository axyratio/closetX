# app/repositories/otp_repository.py
from datetime import datetime, timedelta, timezone
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.otp import Otp
from app.models.user import User
from sqlalchemy import and_, desc
from app.utils.now_utc import now_utc


def ensure_can_request(
    db: Session,
    user_id,
    purpose: str,
    window_minutes: int = 10,
    max_requests: int = 5
) -> None:
    """
    ตรวจสิทธิ์การขอ OTP ซ้ำในช่วงเวลา window
    - ถ้าเกิน max_requests ภายใน window_minutes → raise Exception
    - กลไกอย่างง่าย: นับจาก record ล่าสุดที่ยังอยู่ใน window
    """
    window_start = now_utc() - timedelta(minutes=window_minutes)
    q = (
        db.query(Otp)
        .filter(
            and_(
                Otp.user_id == user_id,
                Otp.purpose == purpose,
                Otp.created_at >= window_start,
            )
        )
    )
    # นับแบบเร็ว ๆ
    if q.count() >= max_requests:
        raise Exception("Too many OTP requests. Please try again later.")

def get_otp_by_user_id(db: Session, user_id: UUID):
    otp_id = db.query(Otp).filter(
            Otp.user_id == user_id,
            Otp.expires_at > datetime.utcnow()
    ).first()
    
    return otp_id

def get_latest_by_user_purpose(db: Session, user_id, purpose: str) -> Otp | None:
    """
    คืน OTP ล่าสุดของผู้ใช้สำหรับ purpose นั้น ๆ
    """
    return (
        db.query(Otp)
        .filter(and_(Otp.user_id == user_id, Otp.purpose == purpose))
        .order_by(desc(Otp.created_at))
        .first()
    )

def get_otp_by_id_for_update(db: Session, otp_id) -> Otp | None:
    """
    ดึงแถว Otp พร้อม lock (ต้องใช้บน DB ที่รองรับ เช่น PostgreSQL)
    ใช้กัน race condition ตอน verify
    """
    return (
        db.query(Otp)
        .filter(Otp.otp_id == otp_id)
        .with_for_update()  # ถ้าใช้ SQLite จะไม่รองรับ ให้ตัดบรรทัดนี้ออก
        .first()
    )

def bump_failed_attempt(db: Session, otp_id) -> None:
    """
    เพิ่มตัวนับ failed_attempts 1 ครั้ง
    """
    row = db.query(Otp).filter(Otp.otp_id == otp_id).first()
    if row:
        row.failed_attempts = (row.failed_attempts or 0) + 1
        db.flush()

def create_otp(db: Session, user_id: UUID, otp_code: str, purpose: str, expires_at: datetime):
    otp = Otp(
        user_id=user_id,
        otp_code=otp_code,
        purpose=purpose,
        created_at=datetime.utcnow(),
        expires_at=expires_at
    )
    db.add(otp)
    db.flush()
    db.refresh(otp)
    return otp

def get_otp_for_verified(db: Session, user_id: UUID, otp_code: str, purpose: str):
    print(user_id, otp_code, purpose)
    otp = db.query(Otp).filter(
        Otp.user_id == user_id,
        Otp.purpose == purpose,
        # Otp.expires_at > datetime.utcnow()  # ยังไม่หมดอายุ
    ).first()

    
    db.flush()
    db.refresh(otp)
    return otp

def update_otp(
    db: Session,
    otp_id,
    *,
    otp_code: str | None = None,
    expires_at: datetime | None = None,
    verified_at: datetime | None = None,
    bump_sent: bool = False
) -> Otp | None:
    """
    อัปเดตฟิลด์ของ Otp ตามที่ส่งมา
    """
    row = db.query(Otp).filter(Otp.otp_id == otp_id).first()
    if not row:
        return None
    if otp_code is not None:
        row.otp_code = otp_code
    if expires_at is not None:
        row.expires_at = expires_at
    if verified_at is not None:
        row.verified_at = verified_at
    if bump_sent:
        row.sent_count = (row.sent_count or 0) + 1
        row.last_sent_at = now_utc()
    db.flush()
    return row

def delete_row_by_user_id(db: Session, user_id: UUID):
    # ดึงข้อมูลก่อน (ถ้าต้องการตรวจสอบ)

    print(f"user is none for delete {user_id} ")
    otp_record = db.query(Otp).filter(Otp.user_id == user_id).first()

    print("otp record from db =======", otp_record)
    
    if otp_record:
        print(f"from db delete {otp_record.user_id}")  # อันนี้ใช้ได้เพราะ otp_record เป็น object
        otp_record.is_delete = True
        return True
    
    print(f"ไม่พบข้อมูล OTP ของ user_id {user_id}")
    return False

def delete_others_by_user_purpose(db: Session, user_id, purpose: str, keep_id) -> int:
    """
    ลบ OTP อื่น ๆ ของผู้ใช้สำหรับ purpose เดียวกัน ยกเว้น keep_id
    คืนจำนวนแถวที่ลบ
    """
    q = db.query(Otp).filter(
        and_(Otp.user_id == user_id, Otp.purpose == purpose, Otp.otp_id != keep_id)
    )
    deleted = q.delete(synchronize_session=False)
    return deleted

