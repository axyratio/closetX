# app/utils/timezone_utils.py
from datetime import datetime, timezone, timedelta
import pytz

def now_utc():
    """คืนค่าเวลา UTC สำหรับเก็บ DB"""
    return datetime.now(timezone.utc)

def now_thai():
    """คืนค่าเวลาไทยปัจจุบัน (สำหรับแสดงผล)"""
    bangkok_tz = pytz.timezone('Asia/Bangkok')
    return datetime.now(bangkok_tz)

def to_thai_time(utc_dt: datetime) -> datetime:
    """แปลง UTC datetime จาก DB เป็นเวลาไทย"""
    if utc_dt is None:
        return None
    
    if utc_dt.tzinfo is None:
        utc_dt = utc_dt.replace(tzinfo=timezone.utc)
    
    bangkok_tz = pytz.timezone('Asia/Bangkok')
    return utc_dt.astimezone(bangkok_tz)

def format_thai_datetime(utc_dt: datetime, format_str: str = '%d/%m/%Y %H:%M:%S') -> str:
    """แปลงเป็นเวลาไทยและ format เป็น string"""
    if utc_dt is None:
        return None
    
    thai_time = to_thai_time(utc_dt)
    return thai_time.strftime(format_str)