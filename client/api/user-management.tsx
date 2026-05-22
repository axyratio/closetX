// client/api/user-management.tsx
/**
 * API Functions สำหรับระบบจัดการผู้ใช้ (Admin)
 */

import { DOMAIN } from "@/้host";
import { getToken } from "@/utils/secure-store";

// ==================== Types ====================

export interface UserListItem {
  user_id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  is_active: boolean;
  role_name: string;
  created_at: string;
  total_orders: number;
  has_store: boolean;
}

export interface UserDetail {
  user_id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  gender?: string;
  birth_date?: string;
  is_active: boolean;
  pending_email?: string;
  created_at: string;
  updated_at?: string;
  role: {
    role_id: number;
    role_name: string;
  };
  statistics: {
    total_orders: number;
    total_reviews: number;
    total_spent: number;
    has_store: boolean;
  };
  store?: {
    store_id: string;
    name: string;
    description?: string;
    logo_path?: string;
    is_active: boolean;
    rating: number;
  };
}

export interface UserOrder {
  order_id: string;
  order_status: string;
  order_text_status: string;
  total_price: number;
  created_at: string;
  paid_at?: string;
  store_name?: string;
  item_count: number;
}

export interface UserReview {
  review_id: string;
  product_id: string;
  product_name: string;
  rating: number;
  comment?: string;
  created_at: string;
  images: string[];
}

export interface UserStatistics {
  total_users: number;
  active_users: number;
  inactive_users: number;
  total_admins: number;
  total_sellers: number;
  new_users_this_month: number;
  users_by_role: {
    [key: string]: number;
  };
}

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

// ==================== API Functions ====================

/**
 * ดึงรายการผู้ใช้ทั้งหมด
 */
export const getAllUsers = async (params?: {
  search?: string;
  role?: "user" | "admin";
  is_active?: boolean;
  skip?: number;
  limit?: number;
}): Promise<
  ApiResponse<{
    users: UserListItem[];
    total: number;
    skip: number;
    limit: number;
  }>
> => {
  try {
    const token = await getToken();
    const queryParams = new URLSearchParams();

    if (params?.search) queryParams.append("search", params.search);
    if (params?.role) queryParams.append("role", params.role);
    if (params?.is_active !== undefined)
      queryParams.append("is_active", params.is_active.toString());
    if (params?.skip !== undefined)
      queryParams.append("skip", params.skip.toString());
    if (params?.limit !== undefined)
      queryParams.append("limit", params.limit.toString());

    const url = `${DOMAIN}/admin/users?${queryParams.toString()}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

/**
 * ดูรายละเอียดผู้ใช้
 */
export const getUserDetail = async (
  userId: string
): Promise<ApiResponse<UserDetail>> => {
  try {
    const token = await getToken();
    const response = await fetch(`${DOMAIN}/admin/users/${userId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching user detail:", error);
    throw error;
  }
};

/**
 * แก้ไขข้อมูลผู้ใช้
 */
export const updateUser = async (
  userId: string,
  updates: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone_number?: string;
    gender?: string;
    birth_date?: string;
  }
): Promise<ApiResponse<UserDetail>> => {
  try {
    const token = await getToken();
    const formData = new FormData();

    if (updates.first_name) formData.append("first_name", updates.first_name);
    if (updates.last_name) formData.append("last_name", updates.last_name);
    if (updates.email) formData.append("email", updates.email);
    if (updates.phone_number)
      formData.append("phone_number", updates.phone_number);
    if (updates.gender) formData.append("gender", updates.gender);
    if (updates.birth_date) formData.append("birth_date", updates.birth_date);

    const response = await fetch(`${DOMAIN}/admin/users/${userId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
};

/**
 * เปิด/ปิดบัญชีผู้ใช้
 */
export const toggleUserStatus = async (
  userId: string,
  isActive: boolean
): Promise<
  ApiResponse<{
    user_id: string;
    username: string;
    is_active: boolean;
    message: string;
  }>
> => {
  try {
    const token = await getToken();
    const formData = new FormData();
    formData.append("is_active", isActive.toString());

    const response = await fetch(`${DOMAIN}/admin/users/${userId}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error toggling user status:", error);
    throw error;
  }
};

/**
 * เปลี่ยน Role ผู้ใช้
 */
export const changeUserRole = async (
  userId: string,
  roleName: "user" | "admin"
): Promise<
  ApiResponse<{
    user_id: string;
    username: string;
    old_role: string;
    new_role: string;
    message: string;
  }>
> => {
  try {
    const token = await getToken();
    const formData = new FormData();
    formData.append("role_name", roleName);

    const response = await fetch(`${DOMAIN}/admin/users/${userId}/role`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error changing user role:", error);
    throw error;
  }
};

/**
 * ดึงสถิติผู้ใช้
 */
export const getUserStatistics =
  async (): Promise<ApiResponse<UserStatistics>> => {
    try {
      const token = await getToken();
      const response = await fetch(`${DOMAIN}/admin/users/statistics`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching user statistics:", error);
      throw error;
    }
  };

/**
 * ดูรายการสั่งซื้อของผู้ใช้
 */
export const getUserOrders = async (
  userId: string,
  skip: number = 0,
  limit: number = 20
): Promise<
  ApiResponse<{
    orders: UserOrder[];
    total: number;
    skip: number;
    limit: number;
  }>
> => {
  try {
    const token = await getToken();
    const queryParams = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });

    const url = `${DOMAIN}/admin/users/${userId}/orders?${queryParams.toString()}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching user orders:", error);
    throw error;
  }
};

/**
 * ดูรีวิวของผู้ใช้
 */
export const getUserReviews = async (
  userId: string,
  skip: number = 0,
  limit: number = 20
): Promise<
  ApiResponse<{
    reviews: UserReview[];
    total: number;
    skip: number;
    limit: number;
  }>
> => {
  try {
    const token = await getToken();
    const queryParams = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });

    const url = `${DOMAIN}/admin/users/${userId}/reviews?${queryParams.toString()}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching user reviews:", error);
    throw error;
  }
};

// ==================== Helper Functions ====================

/**
 * Format ชื่อ-นามสกุล
 */
export const formatFullName = (user: UserListItem | UserDetail): string => {
  return `${user.first_name} ${user.last_name}`.trim();
};

/**
 * Format สถานะเป็นภาษาไทย
 */
export const formatUserStatus = (isActive: boolean): string => {
  return isActive ? "ใช้งานอยู่" : "ระงับบัญชี";
};

/**
 * Get status color
 */
export const getUserStatusColor = (isActive: boolean): string => {
  return isActive ? "#16a34a" : "#dc2626";
};

/**
 * Get status background color
 */
export const getUserStatusBgColor = (isActive: boolean): string => {
  return isActive ? "#dcfce7" : "#fee2e2";
};

/**
 * Format role เป็นภาษาไทย
 */
export const formatRole = (roleName: string): string => {
  const roleMap: { [key: string]: string } = {
    user: "ผู้ใช้",
    admin: "ผู้ดูแลระบบ",
  };
  return roleMap[roleName.toLowerCase()] || roleName;
};

/**
 * Get role color
 */
export const getRoleColor = (roleName: string): string => {
  const colorMap: { [key: string]: string } = {
    admin: "#dc2626",
    user: "#3b82f6",
  };
  return colorMap[roleName.toLowerCase()] || "#6b7280";
};

/**
 * Get role background color
 */
export const getRoleBgColor = (roleName: string): string => {
  const colorMap: { [key: string]: string } = {
    admin: "#fee2e2",
    user: "#dbeafe",
  };
  return colorMap[roleName.toLowerCase()] || "#f3f4f6";
};

/**
 * Format วันที่
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/**
 * Format วันที่และเวลา
 */
export const formatDateTime = (dateString: string): string => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Format เงิน
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
  }).format(amount);
};

// ==================== Admin Order Detail ====================

export interface AdminOrderItem {
  order_item_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  store_name: string | null;
  quantity: number;
  unit_price: number;
  image_url: string | null;
}

export interface AdminOrderDetail {
  order_id: string;
  store_id: string | null;
  store_name: string;
  order_status: string;
  order_text_status: string;
  customer_name: string;
  shipping_cost: number;
  tracking_number: string | null;
  courier_name: string | null;
  total_price: number;
  created_at: string;
  updated_at: string | null;
  paid_at: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  order_items: AdminOrderItem[];
  shipping_address: {
    full_name: string;
    phone_number: string;
    address_line: string;
    sub_district: string;
    district: string;
    province: string;
    postal_code: string;
  } | null;
  user_info: {
    user_id: string;
    username: string;
    email: string;
  } | null;
  return_info: any | null;
}

export const getAdminOrderDetail = async (
  orderId: string
): Promise<ApiResponse<AdminOrderDetail>> => {
  try {
    const token = await getToken();
    const response = await fetch(`${DOMAIN}/admin/users/orders/${orderId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const json = await response.json();

    if (!response.ok) {
      return { success: false, message: json.message || "เกิดข้อผิดพลาด", data: null as any };
    }

    return { success: true, message: "สำเร็จ", data: json.data };
  } catch (error: any) {
    console.error("getAdminOrderDetail error:", error);
    return { success: false, message: error.message || "เกิดข้อผิดพลาด", data: null as any };
  }
};