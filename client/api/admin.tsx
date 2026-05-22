// api/admin.tsx
/**
 * API Functions สำหรับ Admin จัดการร้านค้า
 * ใช้ร่วมกับ Backend Admin Store Management API
 */

import { DOMAIN } from "@/้host";
import { getToken } from "@/utils/secure-store";

// ==================== Types ====================

export interface StoreListItem {
  store_id: string;
  name: string;
  description?: string;
  logo_path?: string;
  address?: string;
  is_active: boolean;
  rating: number;
  owner_name: string;
  owner_email: string;
  product_count: number;
}

export interface StoreDetail {
  store_id: string;
  name: string;
  description?: string;
  logo_path?: string;
  address?: string;
  is_active: boolean;
  rating: number;
  stripe_account_id?: string;
  is_stripe_verified: boolean;
  owner: {
    user_id: string;
    username: string;
    email: string;
    role: string;
  };
  statistics: {
    total_products: number;
    active_products: number;
    draft_products: number;
  };
}

export interface ProductInStore {
  product_id: string;
  product_name: string;
  base_price: number;
  stock_quantity: number;
  category: string;
  is_active: boolean;
  is_draft: boolean;
  image_url?: string;
}

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

// ==================== API Functions ====================

/**
 * ดึงรายการร้านค้าทั้งหมด
 */
export const getAllStoresAdmin = async (params?: {
  search?: string;
  status?: "active" | "inactive";
  skip?: number;
  limit?: number;
}): Promise<
  ApiResponse<{
    stores: StoreListItem[];
    total: number;
    skip: number;
    limit: number;
  }>
> => {
  try {
    const token = await getToken();
    const queryParams = new URLSearchParams();

    if (params?.search) queryParams.append("search", params.search);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.skip !== undefined)
      queryParams.append("skip", params.skip.toString());
    if (params?.limit !== undefined)
      queryParams.append("limit", params.limit.toString());

    const url = `${DOMAIN}/admin/stores?${queryParams.toString()}`;
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
    console.error("Error fetching stores:", error);
    throw error;
  }
};

/**
 * ดูรายละเอียดร้านค้า
 */
export const getStoreDetailAdmin = async (
  storeId: string
): Promise<ApiResponse<StoreDetail>> => {
  try {
    const token = await getToken();
    const response = await fetch(`${DOMAIN}/admin/stores/${storeId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching store detail:", error);
    throw error;
  }
};

/**
 * เปิด/ปิดร้านค้า
 */
export const toggleStoreStatus = async (
  storeId: string,
  isActive: boolean
): Promise<
  ApiResponse<{
    store_id: string;
    name: string;
    is_active: boolean;
  }>
> => {
  try {
    const token = await getToken();
    const formData = new FormData();
    formData.append("is_active", isActive.toString());

    const response = await fetch(`${DOMAIN}/admin/stores/${storeId}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error toggling store status:", error);
    throw error;
  }
};

/**
 * แก้ไขข้อมูลร้านค้าโดย Admin
 */
export const updateStoreAdmin = async (
  storeId: string,
  updates: {
    name?: string;
    description?: string;
    address?: string;
    logo?: any; // File or URI
  }
): Promise<ApiResponse<any>> => {
  try {
    const token = await getToken();
    const formData = new FormData();

    if (updates.name) formData.append("name", updates.name);
    if (updates.description)
      formData.append("description", updates.description);
    if (updates.address) formData.append("address", updates.address);
    if (updates.logo) {
      formData.append("logo", {
        uri: updates.logo.uri,
        type: updates.logo.type || "image/jpeg",
        name: updates.logo.name || "logo.jpg",
      } as any);
    }

    const response = await fetch(`${DOMAIN}/admin/stores/${storeId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error updating store:", error);
    throw error;
  }
};

/**
 * ดูรายการสินค้าในร้าน
 */
export const getStoreProductsAdmin = async (
  storeId: string,
  params?: {
    status?: "active" | "inactive" | "draft";
    skip?: number;
    limit?: number;
  }
): Promise<
  ApiResponse<{
    store: {
      store_id: string;
      name: string;
    };
    products: ProductInStore[];
    total: number;
    skip: number;
    limit: number;
  }>
> => {
  try {
    const token = await getToken();
    const queryParams = new URLSearchParams();

    if (params?.status) queryParams.append("status", params.status);
    if (params?.skip !== undefined)
      queryParams.append("skip", params.skip.toString());
    if (params?.limit !== undefined)
      queryParams.append("limit", params.limit.toString());

    const url = `${DOMAIN}/admin/stores/${storeId}/products?${queryParams.toString()}`;
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
    console.error("Error fetching store products:", error);
    throw error;
  }
};

/**
 * เปิด/ปิดสินค้า
 */
export const toggleProductStatus = async (
  storeId: string,
  productId: string,
  isActive: boolean
): Promise<
  ApiResponse<{
    product_id: string;
    product_name: string;
    is_active: boolean;
  }>
> => {
  try {
    const token = await getToken();
    const formData = new FormData();
    formData.append("is_active", isActive.toString());

    const response = await fetch(
      `${DOMAIN}/admin/stores/${storeId}/products/${productId}/status`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error toggling product status:", error);
    throw error;
  }
};

// ==================== Helper Functions ====================

/**
 * ตรวจสอบว่า user เป็น admin หรือไม่
 */
export const isUserAdmin = (user: any): boolean => {
  return user?.role?.role_name === "admin" || user?.role === "admin";
};

/**
 * นำทางไปหน้าแก้ไขร้านในฐานะ admin
 */
export const navigateToEditStoreAsAdmin = (
  router: any,
  store: StoreListItem | StoreDetail
) => {
  router.push({
    pathname: "/(store)/edit-store",
    params: {
      storeId: store.store_id,
      storeName: store.name,
      logoUrl: store.logo_path || "",
      isAdminMode: "true",
    },
  });
};

/**
 * นำทางไปหน้าแก้ไขสินค้าในฐานะ admin
 */
export const navigateToEditProductAsAdmin = (
  router: any,
  productId: string,
  storeId: string
) => {
  router.push({
    pathname: "/(store)/edit-product",
    params: {
      productId: productId,
      storeId: storeId,
      isAdminMode: "true",
    },
  });
};

/**
 * Format status เป็นภาษาไทย
 */
export const formatStoreStatus = (isActive: boolean): string => {
  return isActive ? "เปิด" : "ปิด";
};

/**
 * Get status color
 */
export const getStatusColor = (isActive: boolean): string => {
  return isActive ? "#16a34a" : "#dc2626";
};

/**
 * Get status background color
 */
export const getStatusBgColor = (isActive: boolean): string => {
  return isActive ? "#dcfce7" : "#fee2e2";
};