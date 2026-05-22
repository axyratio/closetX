import { DOMAIN } from "@/้host";
import axios from "axios";

const USE_MOCK_DATA = false;

export type OrderStatus =
  | "UNPAID"
  | "PAID"
  | "PREPARING"
  | "SHIPPED"
  | "DELIVERED"
  | "COMPLETED"
  | "RETURNING"
  | "RETURNED"
  | "REJECTED"
  | "APPROVED"
  | "CANCELLED"
  | "FAILED";

export type ReturnReason =
  | "WRONG_ITEM"
  | "DAMAGED"
  | "NOT_AS_DESCRIBED"
  | "DEFECTIVE"
  | "SIZE_ISSUE"
  | "QUALITY_ISSUE"
  | "OTHER";

export type ReturnStatus = "PENDING" | "APPROVED" | "REJECTED" | "REFUNDED" | "CANCELLED";

export type ReturnOrder = {
  return_id: string;
  order_id: string;
  reason: ReturnReason;
  reason_detail?: string;
  image_urls: string[];
  status: ReturnStatus;
  status_text: string;
  refund_amount?: number;
  store_note?: string;
  created_at: string;
};

export type UploadImageResponse = {
  image_id: string;
  url: string;
};

export type OrderItem = {
  order_item_id: string;
  // product_id และ store_id อาจเป็น null ถ้าสินค้า/ร้านถูกลบ
  product_id: string | null;
  variant_id: string | null;
  product_name: string;   // มาจาก snapshot — ไม่มีวันว่าง
  variant_name: string | null;
  store_name: string | null; // snapshot ของร้านใน item นี้
  quantity: number;
  unit_price: number;
  image_url?: string | null;
};

export type Order = {
  order_id: string;
  // store_id อาจเป็น null ถ้าร้านถูกลบ
  store_id: string | null;
  store_name: string;      // fallback จาก snapshot ใน order_item — ไม่มีวันว่าง
  order_status: OrderStatus;
  order_text_status: string;
  customer_name: string;
  shipping_cost: number;
  tracking_number?: string;
  courier_name?: string;
  total_price: number;
  created_at: string;
  updated_at?: string;
  paid_at?: string;
  delivered_at?: string;
  completed_at?: string;
  order_items: OrderItem[];
  can_confirm_received: boolean;
  can_return: boolean;
  can_review: boolean;
  return_info?: ReturnOrder | null;
  stripe_checkout_url?: string | null;  // Issue #6: URL สำหรับ UNPAID orders
};

export type OrderListResponse = {
  orders: Order[];
  total: number;
};

// ================== API FUNCTIONS ==================
export async function fetchUserOrders(
  token: string,
  status?: OrderStatus | OrderStatus[],
  skip: number = 0,
  limit: number = 10
): Promise<OrderListResponse> {
  if (USE_MOCK_DATA) {
    return { orders: [], total: 0 };
  }

  try {
    const params = new URLSearchParams();
    
    if (status) {
      if (Array.isArray(status)) {
        status.forEach((s) => params.append("status", s));
      } else {
        params.append("status", status);
      }
    }
    
    params.append("skip", String(skip));
    params.append("limit", String(limit));

    const res = await axios.get(`${DOMAIN}/orders/me?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const responseData = res.data?.data || res.data;
    return {
      orders: Array.isArray(responseData?.orders) ? responseData.orders : [],
      total: responseData?.total || 0,
    };
  } catch (error: any) {
    console.error("❌ Error fetching orders:", error.response?.data || error.message);
    return { orders: [], total: 0 };
  }
}

export async function fetchOrderDetail(
  token: string,
  orderId: string
): Promise<Order | null> {
  try {
    const res = await axios.get(`${DOMAIN}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data?.data || res.data;
  } catch (error: any) {
    console.error("❌ Error fetching order detail:", error.response?.data || error.message);
    throw error;
  }
}

export async function confirmOrderReceived(
  token: string,
  orderId: string
): Promise<{ message: string; order: Order }> {
  try {
    const res = await axios.post(
      `${DOMAIN}/orders/${orderId}/confirm-received`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const responseData = res.data?.data || res.data;
    return {
      message: res.data?.message || "ยืนยันการรับสินค้าสำเร็จ",
      order: responseData,
    };
  } catch (error: any) {
    // ถ้า 400 และ order เป็น COMPLETED แล้ว (auto-confirm ไปก่อน) → ถือว่า success
    if (error.response?.status === 400) {
      const detail = error.response?.data?.detail || "";
      if (detail.includes("COMPLETED")) {
        return {
          message: "ระบบยืนยันการรับสินค้าอัตโนมัติแล้ว",
          order: { ...error.response.data?.data, order_status: "COMPLETED" } as Order,
        };
      }
    }
    console.error("❌ Error confirming order:", error.response?.data || error.message);
    throw error;
  }
}

export async function reorderItems(
  token: string,
  orderId: string
): Promise<{ message: string; cart_items_added: number }> {
  try {
    const res = await axios.post(
      `${DOMAIN}/orders/${orderId}/reorder`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const responseData = res.data?.data || res.data;
    return {
      message: res.data?.message || "เพิ่มสินค้าเข้าตะกร้าสำเร็จ",
      cart_items_added: responseData?.cart_items_added || 0,
    };
  } catch (error: any) {
    console.error("❌ Error reordering:", error.response?.data || error.message);
    throw error;
  }
}

export async function submitProductReview(
  token: string,
  productId: string,
  data: { rating: number; comment: string }
): Promise<{ message: string }> {
  try {
    const res = await axios.post(`${DOMAIN}/products/${productId}/review`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { message: res.data?.message || "ส่งรีวิวสำเร็จ" };
  } catch (error: any) {
    console.error("❌ Error submitting review:", error.response?.data || error.message);
    throw error;
  }
}

export async function uploadReturnImage(
  token: string,
  imageUri: string
): Promise<UploadImageResponse> {
  try {
    const formData = new FormData();
    const filename = imageUri.split("/").pop() || "image.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : "image/jpeg";
    formData.append("file", { uri: imageUri, name: filename, type } as any);

    const res = await axios.post(`${DOMAIN}/orders/return/upload-image`, formData, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
    });
    const responseData = res.data?.data || res.data;
    return { image_id: responseData?.image_id || "", url: responseData?.url || "" };
  } catch (error: any) {
    console.error("❌ Error uploading return image:", error.response?.data || error.message);
    throw error;
  }
}

export async function deleteReturnImage(
  token: string,
  imageId: string
): Promise<{ message: string }> {
  try {
    const res = await axios.delete(`${DOMAIN}/orders/return/images/${imageId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { message: res.data?.message || "ลบรูปภาพสำเร็จ" };
  } catch (error: any) {
    console.error("❌ Error deleting return image:", error.response?.data || error.message);
    throw error;
  }
}

export async function createReturnRequest(
  token: string,
  data: {
    order_id: string;
    reason: ReturnReason;
    reason_detail?: string;
    image_ids: string[];
  }
): Promise<{ message: string; return_id: string }> {
  try {
    const res = await axios.post(`${DOMAIN}/orders/return`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const responseData = res.data?.data || res.data;
    return {
      message: res.data?.message || "สร้างคำขอคืนสินค้าสำเร็จ",
      return_id: responseData?.return_id || "",
    };
  } catch (error: any) {
    console.error("❌ Error creating return request:", error.response?.data || error.message);
    throw error;
  }
}

export async function fetchReturnRequests(
  token: string,
  orderId?: string
): Promise<{ returns: ReturnOrder[] }> {
  try {
    const params = orderId ? { order_id: orderId } : {};
    const res = await axios.get(`${DOMAIN}/orders/returns/me`, {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });
    const responseData = res.data?.data || res.data;
    return {
      returns: Array.isArray(responseData?.returns) ? responseData.returns : [],
    };
  } catch (error: any) {
    console.error("❌ Error fetching return requests:", error.response?.data || error.message);
    return { returns: [] };
  }
}