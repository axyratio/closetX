import uuid
from sqlalchemy import TEXT, Boolean, Column, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.database import Base


class Store(Base):
    __tablename__ = 'stores'

    store_id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)

    name = Column(String, nullable=False)
    description = Column(TEXT, nullable=True)
    logo_path = Column(String, nullable=True)
    address = Column(TEXT, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    rating = Column(Float, nullable=True, default=0.0)
    stripe_account_id = Column(String, nullable=True)
    is_stripe_verified = Column(Boolean, nullable=False, default=False)

    user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id', ondelete='SET NULL'), nullable=True, unique=True)

    products = relationship("Product", back_populates="store", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="store")
    order_items = relationship("OrderItem", back_populates="store")