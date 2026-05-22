# app/core/celery_app.py
from celery import Celery
from app.core.config import settings

# สร้าง Instance Celery
celery_app = Celery(
    "closetx_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

# ตั้งค่าพื้นฐาน
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Bangkok",
    enable_utc=True,

    # --- ส่วนที่เพิ่มเพื่อแก้ปัญหา Connection Reset ---
    broker_transport_options={
        'socket_keepalive': True,       # ส่งสัญญาณรักษาการเชื่อมต่อ TCP
        'socket_timeout': 30,           # ถ้าส่งข้อมูลไม่ได้ใน 30 วิ ให้ Timeout
        'socket_connect_timeout': 30,   # ระยะเวลาเชื่อมต่อตอนเริ่มต้น
        'visibility_timeout': 3600,
        'retry_on_timeout': True,
    },
    # ป้องกัน Worker ค้างตอนเริ่มถ้ายังต่อ Redis ไม่ได้
    broker_connection_retry_on_startup=True,
    # ตั้งค่า Redis Backend ให้มีความทนทานขึ้น
    redis_backend_health_check_interval=30,
    # ถ้าใช้ backend เป็น redis ให้ใส่ options เพิ่ม
    result_backend_transport_options={
        'retry_on_timeout': True,
    }
    # ---------------------------------------------
)

# บอกให้ Celery รู้ว่า Task อยู่ที่ไหน
celery_app.conf.imports = [
    "app.utils.order_task",
    "app.tasks.order_tasks",
]