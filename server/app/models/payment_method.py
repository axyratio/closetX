from sqlalchemy import Column, Float, Integer, String, TEXT, ForeignKey, Boolean, Date, DateTime
from sqlalchemy.orm import relationship
from app.db.database import Base
from app.utils.now_utc import now_utc
from sqlalchemy.dialects.postgresql import UUID
import uuid

class PaymentMethodMeta(Base):
    __tablename__ = "payment_methods"

    method_code = Column(String(50), primary_key=True)  # เช่น "CREDIT_CARD", "BANK_TRANSFER"
    display_name = Column(String(100), nullable=False)  # ชื่อที่แสดงในหน้าเว็บ เช่น "บัตรเครดิต"
    logo_url = Column(String(255), nullable=True)       # โลโก้ของช่องทาง
    fee_percent = Column(Float, default=0.00)            # ค่าธรรมเนียม (%) ถ้ามี
    is_active = Column(Boolean, default=True)           # เปิดให้ใช้งานหรือไม่
    description = Column(String, nullable=True)

    payments = relationship("Payment", back_populates="payment_method")