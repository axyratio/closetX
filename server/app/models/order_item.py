from sqlalchemy import Column, Float, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base
from sqlalchemy.dialects.postgresql import UUID
import uuid


class OrderItem(Base):
    __tablename__ = 'order_items'

    order_item_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey('orders.order_id'), nullable=False)
    store_id = Column(UUID(as_uuid=True), ForeignKey('stores.store_id', ondelete='SET NULL'), nullable=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey('products.product_id', ondelete='SET NULL'), nullable=True)
    variant_id = Column(UUID(as_uuid=True), ForeignKey('product_variants.variant_id', ondelete='SET NULL'), nullable=True)

    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)

    product_name = Column(String, nullable=True)
    variant_name = Column(String, nullable=True)
    store_name = Column(String, nullable=True)
    product_image_url = Column(String, nullable=True)

    store = relationship("Store", back_populates="order_items")
    order = relationship("Order", back_populates="order_items")
    product = relationship("Product", back_populates="order_items")
    variant = relationship("ProductVariant")