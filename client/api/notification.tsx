
import { DOMAIN } from "@/้host";
import axios from "axios";
import { AppState } from "react-native";

const WS_DOMAIN = DOMAIN.replace(/^http:/, "ws:").replace(/^https:/, "wss:");

// ================== TYPES ==================

export type NotificationType =
  | "ORDER_PAID"
  | "ORDER_PREPARING"
  | "ORDER_SHIPPED"
  | "ORDER_DELIVERED"
  | "ORDER_COMPLETED"
  | "ORDER_CANCELLED"
  | "RETURN_REQUEST"
  | "RETURN_APPROVED"
  | "RETURN_REJECTED"
  | "NEW_MESSAGE"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED";

export type Notification = {
  notification_id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  order_id?: string;
  store_id?: string;
  conversation_id?: string;
  image_url?: string;
  is_read: boolean;
  receiver_role?: string;
  created_at: string;
  read_at?: string;
};

export type NotificationListResponse = {
  notifications: Notification[];
  total: number;
  unread_count: number;
};

export type UnreadCountResponse = {
  unread_count: number;
};

export type BadgeCountResponse = {
  unread_count: number;
  buyer_unread: number;
  seller_unread: number;
};

export type WSNotificationEvent = {
  type: "notification";
  notification: Notification;
  unread_count: number;
};

// ================== REST API FUNCTIONS ==================

export async function fetchNotifications(
  token: string,
  limit: number = 50,
  offset: number = 0,
  role?: string,
): Promise<NotificationListResponse> {
  try {
    const res = await axios.get(`${DOMAIN}/notifications/me`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit, offset, ...(role ? { role } : {}) },
    });
    const responseData = res.data?.data || res.data;
    return {
      notifications: Array.isArray(responseData?.notifications)
        ? responseData.notifications
        : [],
      total: responseData?.total || 0,
      unread_count: responseData?.unread_count || 0,
    };
  } catch (error: any) {
    console.error(
      "❌ fetchNotifications:",
      error.response?.data || error.message,
    );
    return { notifications: [], total: 0, unread_count: 0 };
  }
}

export async function fetchUnreadCount(
  token: string,
  role?: string,
): Promise<number> {
  try {
    const res = await axios.get(`${DOMAIN}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${token}` },
      params: role ? { role } : {},
    });
    const responseData = res.data?.data || res.data;
    return responseData?.unread_count || 0;
  } catch (error: any) {
    console.error(
      "❌ fetchUnreadCount:",
      error.response?.data || error.message,
    );
    return 0;
  }
}

export async function fetchBadgeCount(
  token: string,
): Promise<BadgeCountResponse> {
  try {
    const res = await axios.get(`${DOMAIN}/notifications/badge-count`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const responseData = res.data?.data || res.data;
    return {
      unread_count: responseData?.unread_count || 0,
      buyer_unread: responseData?.buyer_unread || 0,
      seller_unread: responseData?.seller_unread || 0,
    };
  } catch (error: any) {
    console.error("❌ fetchBadgeCount:", error.response?.data || error.message);
    return { unread_count: 0, buyer_unread: 0, seller_unread: 0 };
  }
}

export async function markAsRead(
  token: string,
  notificationId: string,
): Promise<{ message: string }> {
  try {
    const res = await axios.post(
      `${DOMAIN}/notifications/${notificationId}/read`,
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return { message: res.data?.message || "Marked as read" };
  } catch (error: any) {
    console.error("❌ markAsRead:", error.response?.data || error.message);
    throw error;
  }
}

export async function markAllAsRead(
  token: string,
  role?: string,
): Promise<{ message: string }> {
  try {
    const res = await axios.post(
      `${DOMAIN}/notifications/read-all`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
        params: role ? { role } : {},
      },
    );
    return { message: res.data?.message || "Marked all as read" };
  } catch (error: any) {
    console.error("❌ markAllAsRead:", error.response?.data || error.message);
    throw error;
  }
}

export async function deleteNotification(
  token: string,
  notificationId: string,
): Promise<{ message: string }> {
  try {
    const res = await axios.delete(
      `${DOMAIN}/notifications/${notificationId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return { message: res.data?.message || "Notification deleted" };
  } catch (error: any) {
    console.error(
      "❌ deleteNotification:",
      error.response?.data || error.message,
    );
    throw error;
  }
}

// ================== WEBSOCKET ==================

let _ws: WebSocket | null = null;
let _onNotificationCb: ((e: WSNotificationEvent) => void) | null = null;
let _appStateSub: { remove: () => void } | null = null;
let _lastToken: string | null = null;

export function disconnectNotificationWS() {
  if (
    _ws?.readyState === WebSocket.OPEN ||
    _ws?.readyState === WebSocket.CONNECTING
  ) {
    _ws.close();
  }
  _ws = null;
  _onNotificationCb = null;
  _appStateSub?.remove();
  _appStateSub = null;
}

export function connectNotificationWS(
  token: string,
  onNotification: (event: WSNotificationEvent) => void,
): () => void {
  _onNotificationCb = onNotification;
  _lastToken = token;

  // ถ้ามี ws อยู่แล้วและยังเปิดอยู่ ไม่ต้องสร้างใหม่
  if (
    _ws &&
    (_ws.readyState === WebSocket.OPEN ||
      _ws.readyState === WebSocket.CONNECTING)
  ) {
    return () => {
      _onNotificationCb = null;
    };
  }

  const url = `${WS_DOMAIN}/ws/user/notifications?token=${token}`;
  _ws = new WebSocket(url);

  _appStateSub?.remove();
  _appStateSub = AppState.addEventListener("change", (nextState) => {
    if (nextState === "background" || nextState === "inactive") {
      disconnectNotificationWS();
    } else if (nextState === "active") {
      if (
        (!_ws || _ws.readyState === WebSocket.CLOSED) &&
        _lastToken &&
        _onNotificationCb
      ) {
        connectNotificationWS(_lastToken, _onNotificationCb);
      }
    }
  });

  _ws.onopen = () => {};

  _ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "notification") {
        _onNotificationCb?.(data as WSNotificationEvent);
      }
    } catch {}
  };

  _ws.onerror = () => {};

  _ws.onclose = () => {
    _ws = null;
  };

  return () => {
    _onNotificationCb = null;
  };
}
