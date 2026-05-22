# app/schemas/seller_schema.py
from pydantic import BaseModel, UUID4
from typing import List, Optional
from datetime import datetime


# ================== Dashboard Schemas ==================

class SalesStats(BaseModel):
    today: float
    week: float
    month: float
    change_today: float
    change_week: float
    change_month: float


class TopProduct(BaseModel):
    product_id: str
    product_name: str
    image_url: Optional[str]
    sold_count: int
    revenue: float
    category: str


class SalesChartData(BaseModel):
    date: str
    sales: float


class OrderStatusCount(BaseModel):
    preparing: int
    shipped: int
    delivered: int
    completed: int


class DashboardResponse(BaseModel):
    sales_stats: SalesStats
    top_products: List[TopProduct]
    sales_chart: List[SalesChartData]
    order_status_count: OrderStatusCount
    total_customers: int
    pending_returns: int


# ================== Order Schemas ==================

class OrderItemDetail(BaseModel):
    order_item_id: str
    product_id: str
    product_name: str
    variant_name: str
    quantity: int
    unit_price: float
    image_url: Optional[str]


class ShippingAddressDetail(BaseModel):
    name: str
    phone: str
    address: str
    subdistrict: str
    district: str
    province: str
    postal_code: str


class SellerOrderDetail(BaseModel):
    order_id: str
    customer_name: str
    customer_phone: Optional[str]
    order_status: str
    order_text_status: str
    total_price: float
    shipping_cost: float
    tracking_number: Optional[str]
    courier_name: Optional[str]
    created_at: datetime
    paid_at: Optional[datetime]
    order_items: List[OrderItemDetail]
    shipping_address: Optional[ShippingAddressDetail]


class ConfirmShipmentRequest(BaseModel):
    tracking_number: str
    courier_name: str


# ================== Return Order Schemas ==================

class ReturnOrderItem(BaseModel):
    product_name: str
    variant_name: str
    quantity: int
    unit_price: float


class ReturnRequestDetail(BaseModel):
    return_id: str
    order_id: str
    customer_name: str
    reason: str
    reason_detail: Optional[str]
    image_urls: List[str]
    status: str
    status_text: str
    refund_amount: float
    created_at: datetime
    order_items: List[ReturnOrderItem]


class HandleReturnRequest(BaseModel):
    action: str  # "APPROVE" หรือ "REJECT"
    note: Optional[str]

class RejectOrderRequest(BaseModel):
    reason: Optional[str] = None

# ================== Notification Schemas ==================

class SellerNotificationDetail(BaseModel):
    notification_id: str
    type: str
    title: str
    message: str
    order_id: Optional[str]
    is_read: bool
    created_at: datetime
    
    