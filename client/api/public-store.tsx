// client/api/public-store.tsx
import { DOMAIN } from "@/้host";
import { getToken } from "@/utils/secure-store";

export interface StoreDetail {
  store_id: string;
  name: string;
  description: string;
  address: string;
  logo: string;
  rating: number;
  total_reviews: number;
  total_products: number;
  is_active: boolean;
  created_at: string;
}

export interface StoreProduct {
  product_id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category_id: string | null;
  category_name: string | null;
  stock: number;
  rating: number;
  review_count: number;
  created_at: string;
}

export interface StoreCategory {
  category_id: string;
  category_name: string;
  category_image: string;
  product_count: number;
}

/**
 * ดึงข้อมูลร้านค้าสาธารณะ
 */
export async function getPublicStoreDetail(storeId: string) {
  try {
    const response = await fetch(`${DOMAIN}/public/stores/${storeId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return await response.json();
  } catch (error) {
    console.error("❌ Error fetching store detail:", error);
    throw error;
  }
}

/**
 * ดึงสินค้าในร้านค้า (รองรับการกรองตามหมวดหมู่)
 */
export async function getStoreProducts(params: {
  storeId: string;
  categoryId?: string;
  skip?: number;
  limit?: number;
}) {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.categoryId) queryParams.append("category_id", params.categoryId);
    if (params.skip !== undefined) queryParams.append("skip", params.skip.toString());
    if (params.limit !== undefined) queryParams.append("limit", params.limit.toString());

    const url = `${DOMAIN}/public/stores/${params.storeId}/products${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return await response.json();
  } catch (error) {
    console.error("❌ Error fetching store products:", error);
    throw error;
  }
}

/**
 * ดึงหมวดหมู่ในร้านค้า
 */
export async function getStoreCategories(storeId: string) {
  try {
    const response = await fetch(`${DOMAIN}/public/stores/${storeId}/categories`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return await response.json();
  } catch (error) {
    console.error("❌ Error fetching store categories:", error);
    throw error;
  }
}