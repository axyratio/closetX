// src/api/product_api_service.ts

import { getToken } from "@/utils/secure-store";
import { DOMAIN } from "@/้host";

const API_BASE_URL = `${DOMAIN}`;
const PRODUCT_API_BASE = `${API_BASE_URL}/products`;
const STORE_API_BASE = `${API_BASE_URL}/stores`;

type FullPayload = {
  product_name: string;
  description: string;
  base_price: number;
  stock_quantity: number;
  category: string;
  images: Array<{
    image_id: string;
    is_main: boolean;
    display_order: number;
    image_type: "NORMAL";
  }>;
  variant: {
    variant_name: string;
    enable_vton: boolean;
    options: Array<{
      variant_id: string | null;
      name: string;
      price_delta: number;
      stock: number;
      images: Array<{
        image_id: string;
        image_type: "NORMAL" | "VTON";
        is_main: boolean;
        display_order: number;
      }>;
    }>;
  } | null;
};

type APIResponse<T = any> = {
  success: boolean;
  message: string;
  data?: T;
};

// ✅ type สำหรับรายการสินค้าในหน้า store (ใช้กับ tab ปิดการขายได้เลย)
export type StoreProductItem = {
  product_id: string;
  title: string;
  price: number;
  star: number;
  image_id?: string | null;
  image_url?: string | null;
  category?: string | null;
  is_active?: boolean; // เผื่อ backend ส่งมา
  closed_by?: "admin" | "seller" | null;   // ✅ เพิ่ม
};

export type StoreDashboardData = {
  store: {
    store_id: string;
    name: string;
    logo_url?: string | null;
    rating: number;
    is_stripe_verified: boolean;
  };
  products: StoreProductItem[];
  closed_products: StoreProductItem[];
};

// ✅ helper ยิง request แบบมี token ให้เสถียร ไม่ต้องเขียนซ้ำ
async function authFetch(url: string, options: RequestInit = {}) {
  const token = await getToken();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
    Authorization: token ? `Bearer ${token}` : "",
  };

  return fetch(url, { ...options, headers });
}

export const ProductAPIService = {
  /**
   * ส่ง Payload เต็มรูปแบบ (Product + Variant) ไปยัง Backend
   * @param productId ถ้ามี = แก้ไข (PUT), ถ้าไม่มี = สร้างใหม่ (POST)
   * @param payload ข้อมูล Product และ Variant
   * @param token Auth Token
   */
  postFullPayload: async (
    productId: string | undefined,
    payload: FullPayload,
    token: string
  ): Promise<APIResponse> => {
    const method = productId ? "PATCH" : "POST";
    const url = productId
      ? `${PRODUCT_API_BASE}/${productId}/update`
      : `${PRODUCT_API_BASE}/create_full`;

    try {
      const res = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        return { success: false, message: json.message || "บันทึกข้อมูลไม่สำเร็จ" };
      }

      return { success: true, message: json.message, data: json.data };
    } catch (error) {
      console.error("ProductAPI Post Error:", error);
      return { success: false, message: "Server ไม่ตอบสนอง" };
    }
  },

  // ✅ (เพิ่มตามที่มึงขอ) ปิดการขายสินค้า
  getMyStoreDashboard: async (): Promise<APIResponse<StoreDashboardData>> => {
    try {
      const res = await authFetch(`${STORE_API_BASE}/me/dashboard`, { method: "GET" });
      const json = await res.json();

      if (!res.ok || !json.success) {
        return { success: false, message: json.message || "ดึงข้อมูลร้านไม่สำเร็จ" };
      }

      return { success: true, message: json.message || "ดึงข้อมูลร้านสำเร็จ", data: json.data };
    } catch (e) {
      console.log("getMyStoreDashboard error:", e);
      return { success: false, message: "Server ไม่ตอบสนอง" };
    }
  },

  // ✅ ปิดการขาย (ตรงกับ backend: /close-sale)
  closeProduct: async (productId: string): Promise<APIResponse> => {
    try {
      const res = await authFetch(`${PRODUCT_API_BASE}/${productId}/close-sale`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, message: json.message || "ปิดการขายไม่สำเร็จ" };
      }

      return { success: true, message: json.message || "ปิดการขายสำเร็จ", data: json.data };
    } catch (e) {
      console.log("closeProduct error:", e);
      return { success: false, message: "Server ไม่ตอบสนอง" };
    }
  },

  // ✅ เปิดการขาย (ตรงกับ backend: /open-sale)
  openProduct: async (productId: string): Promise<APIResponse> => {
    try {
      const res = await authFetch(`${PRODUCT_API_BASE}/${productId}/open-sale`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, message: json.message || "เปิดการขายไม่สำเร็จ" };
      }

      return { success: true, message: json.message || "เปิดการขายสำเร็จ", data: json.data };
    } catch (e) {
      console.log("openProduct error:", e);
      return { success: false, message: "Server ไม่ตอบสนอง" };
    }
  },
};

// --------------------
// Product Detail (เดิม)
// --------------------

export type ImageType = "NORMAL" | "VTON";

export type ProductImageDto = {
  imageId: string;
  imageUrl: string;
  imageType: ImageType;
  displayOrder: number;
  isMain: boolean;
};

export type VariantImageDto = {
  imageId: string;
  imageUrl: string;
  imageType: ImageType;
};

export type ProductVariantDto = {
  variantId: string;
  variantName: string;
  sku: string;
  price: number;
  stock: number;
  images: VariantImageDto[];
};

export type StoreSummaryDto = {
  storeId: string;
  name: string;
  description?: string;
  logoPath?: string;
  address?: string;
  rating?: number;
};

export type ReviewDto = {
  reviewId: string;
  userDisplayName: string;
  rating: number;
  comment?: string;
  variantName?: string;
  createdAt: string;
};

export type ProductDetailDto = {
  isWishlisted?: boolean;
  productId: string;
  productName: string;
  basePrice: number;
  originalPrice?: number;
  discountPercent?: number;
  description?: string;
  averageRating: number;
  reviewCount: number;

  images: ProductImageDto[];
  variants: ProductVariantDto[];
  store: StoreSummaryDto;

  bestReview?: ReviewDto;
  reviews?: ReviewDto[];

  cartTotalItems: number;
  cartProductQuantity: number;
};

export async function getProductDetail(productId: string): Promise<ProductDetailDto> {
  const token = await getToken();

  const res = await fetch(`${PRODUCT_API_BASE}/${productId}/detail`, {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.log("getProductDetail error:", res.status, text);
    throw new Error("Failed to load product detail");
  }

  const json = await res.json();
  const d = json.data;

  const detail: ProductDetailDto = {
    isWishlisted: d.is_wishlisted ?? false,
    productId: d.product_id,
    productName: d.product_name,
    basePrice: d.base_price,
    originalPrice: d.original_price ?? undefined,
    discountPercent: d.discount_percent ?? undefined,
    description: d.description ?? "",
    averageRating: d.average_rating ?? 0,
    reviewCount: d.review_count ?? 0,

    images: (d.images ?? []).map((img: any) => ({
      imageId: img.image_id,
      imageUrl: `${API_BASE_URL}/images/stream/${img.image_id}`,
      imageType: img.image_type,
      displayOrder: img.display_order ?? 0,
      isMain: !!img.is_main,
    })),

    variants: (d.variants ?? []).map((v: any) => ({
      variantId: v.variant_id,
      variantName: v.variant_name,
      sku: v.sku,
      price: v.price,
      stock: v.stock,
      images: (v.images ?? []).map((img: any) => ({
        imageId: img.image_id,
        imageUrl: `${API_BASE_URL}/images/stream/${img.image_id}`,
        imageType: img.image_type,
      })),
    })),

    store: {
      storeId: d.store.store_id,
      name: d.store.name,
      description: d.store.description ?? undefined,
      logoPath: d.store.logo_path ?? undefined,
      address: d.store.address ?? undefined,
      rating: d.store.rating ?? undefined,
    },

    bestReview: d.best_review
      ? {
          reviewId: d.best_review.review_id,
          userDisplayName: d.best_review.user_display_name,
          rating: d.best_review.rating,
          comment: d.best_review.comment ?? "",
          variantName: d.best_review.variant_name ?? "",
          createdAt: d.best_review.created_at,
        }
      : undefined,

    reviews: (d.reviews ?? []).map((rv: any) => ({
      reviewId: rv.review_id,
      userDisplayName: rv.user_display_name,
      rating: rv.rating,
      comment: rv.comment ?? "",
      variantName: rv.variant_name ?? "",
      createdAt: rv.created_at,
    })),

    cartTotalItems: d.cart_summary?.total_items ?? 0,
    cartProductQuantity: d.cart_summary?.product_quantity ?? 0,
  };

  return detail;
}
