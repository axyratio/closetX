// api/review.tsx
import { getToken } from "@/utils/secure-store";
import { DOMAIN } from "@/้host";

const API_BASE_URL = `${DOMAIN}`;
const REVIEW_API_BASE = `${API_BASE_URL}/reviews`;

export type ReviewImageDto = {
  imageId: string;
  imageUrl: string;
  displayOrder: number;
};

export type ReviewDto = {
  reviewId: string;
  productId: string;
  orderId: string;
  variantId?: string;
  userId: string;
  userDisplayName: string;
  rating: number;
  comment?: string;
  variantName?: string;
  images?: ReviewImageDto[];
  createdAt: string;
  updatedAt?: string;
};

export type CreateReviewPayload = {
  productId: string;
  orderId: string;
  variantId?: string;
  rating: number;
  comment?: string;
  imageUrls?: string[]; // URLs ที่ได้จากการอัพโหลดก่อนหน้า
};

export type UpdateReviewPayload = {
  rating?: number;
  comment?: string;
  imageUrls?: string[];
};

type APIResponse<T = any> = {
  success: boolean;
  message: string;
  data?: T;
};

async function authFetch(url: string, options: RequestInit = {}) {
  const token = await getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
    Authorization: token ? `Bearer ${token}` : "",
  };
  return fetch(url, { ...options, headers });
}

export const ReviewAPI = {
  /**
   * ดึงรีวิวทั้งหมดของสินค้า
   */
  getAllByProduct: async (productId: string): Promise<APIResponse<ReviewDto[]>> => {
    try {
      const res = await authFetch(`${REVIEW_API_BASE}/product/${productId}`, {
        method: "GET",
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        return {
          success: false,
          message: json.message || "ดึงรีวิวไม่สำเร็จ",
        };
      }

      console.log("[REVIEW API] raw data", JSON.stringify(json.data?.reviews || []))

      // แปลงข้อมูลจาก backend
      const reviews: ReviewDto[] = (json.data?.reviews || []).map((r: any) => ({
        reviewId: r.review_id,
        productId: r.product_id,
        orderId: r.order_id,
        variantId: r.variant_id,
        userId: r.user_id,
        userDisplayName: r.user_display_name,
        rating: r.rating,
        comment: r.comment,
        variantName: r.variant_name,
        images: (r.images || []).map((img: any) => ({
          imageId: img.image_id,
          imageUrl: img.image_url,
          displayOrder: img.display_order || 0,
        })),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));

      return {
        success: true,
        message: json.message || "ดึงรีวิวสำเร็จ",
        data: reviews,
      };
    } catch (error) {
      console.error("ReviewAPI getAllByProduct error:", error);
      return { success: false, message: "เกิดข้อผิดพลาดในการเชื่อมต่อ" };
    }
  },

  /**
   * ดึงรีวิวเดียวตาม ID
   */
  getById: async (reviewId: string): Promise<APIResponse<ReviewDto>> => {
    try {
      const res = await authFetch(`${REVIEW_API_BASE}/${reviewId}`, {
        method: "GET",
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        return {
          success: false,
          message: json.message || "ดึงรีวิวไม่สำเร็จ",
        };
      }

      const r = json.data;
      const review: ReviewDto = {
        reviewId: r.review_id,
        productId: r.product_id,
        orderId: r.order_id,
        variantId: r.variant_id,
        userId: r.user_id,
        userDisplayName: r.user_display_name,
        rating: r.rating,
        comment: r.comment,
        variantName: r.variant_name,
        images: (r.images || []).map((img: any) => ({
          imageId: img.image_id,
          imageUrl: img.image_url,
          displayOrder: img.display_order || 0,
        })),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };

      return {
        success: true,
        message: json.message || "ดึงรีวิวสำเร็จ",
        data: review,
      };
    } catch (error) {
      console.error("ReviewAPI getById error:", error);
      return { success: false, message: "เกิดข้อผิดพลาดในการเชื่อมต่อ" };
    }
  },

  /**
   * สร้างรีวิวใหม่
   */
  create: async (payload: CreateReviewPayload): Promise<APIResponse<ReviewDto>> => {
    try {
        console.log("[Review] ", payload)
      const res = await authFetch(`${REVIEW_API_BASE}/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        return {
          success: false,
          message: json.message || "สร้างรีวิวไม่สำเร็จ",
        };
      }

      const r = json.data;
      const review: ReviewDto = {
        reviewId: r.review_id,
        productId: r.product_id,
        orderId: r.order_id,
        variantId: r.variant_id,
        userId: r.user_id,
        userDisplayName: r.user_display_name,
        rating: r.rating,
        comment: r.comment,
        variantName: r.variant_name,
        images: (r.images || []).map((img: any) => ({
          imageId: img.image_id,
          imageUrl: img.image_url,
          displayOrder: img.display_order || 0,
        })),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };

      return {
        success: true,
        message: json.message || "สร้างรีวิวสำเร็จ",
        data: review,
      };
    } catch (error) {
      console.error("ReviewAPI create error:", error);
      return { success: false, message: "เกิดข้อผิดพลาดในการเชื่อมต่อ" };
    }
  },

  /**
   * แก้ไขรีวิว
   */
  update: async (
    reviewId: string,
    payload: UpdateReviewPayload
  ): Promise<APIResponse<ReviewDto>> => {
    try {
      const res = await authFetch(`${REVIEW_API_BASE}/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        return {
          success: false,
          message: json.message || "แก้ไขรีวิวไม่สำเร็จ",
        };
      }

      const r = json.data;
      const review: ReviewDto = {
        reviewId: r.review_id,
        productId: r.product_id,
        orderId: r.order_id,
        variantId: r.variant_id,
        userId: r.user_id,
        userDisplayName: r.user_display_name,
        rating: r.rating,
        comment: r.comment,
        variantName: r.variant_name,
        images: (r.images || []).map((img: any) => ({
          imageId: img.image_id,
          imageUrl: img.image_url,
          displayOrder: img.display_order || 0,
        })),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };

      return {
        success: true,
        message: json.message || "แก้ไขรีวิวสำเร็จ",
        data: review,
      };
    } catch (error) {
      console.error("ReviewAPI update error:", error);
      return { success: false, message: "เกิดข้อผิดพลาดในการเชื่อมต่อ" };
    }
  },

  /**
   * ลบรีวิว
   */
  delete: async (reviewId: string): Promise<APIResponse> => {
    try {
      const res = await authFetch(`${REVIEW_API_BASE}/${reviewId}`, {
        method: "DELETE",
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        return {
          success: false,
          message: json.message || "ลบรีวิวไม่สำเร็จ",
        };
      }

      return {
        success: true,
        message: json.message || "ลบรีวิวสำเร็จ",
      };
    } catch (error) {
      console.error("ReviewAPI delete error:", error);
      return { success: false, message: "เกิดข้อผิดพลาดในการเชื่อมต่อ" };
    }
  },

  /**
   * ดึงรีวิวของ user สำหรับ order และ product นั้นๆ
   */
  getMyReviewForOrder: async (
    orderId: string,
    productId: string
  ): Promise<APIResponse<ReviewDto | null>> => {
    try {
      const res = await authFetch(
        `${REVIEW_API_BASE}/my-review?orderId=${orderId}&productId=${productId}`,
        { method: "GET" }
      );

      const json = await res.json();

      if (!res.ok || !json.success) {
        return {
          success: false,
          message: json.message || "ดึงรีวิวไม่สำเร็จ",
        };
      }

      if (!json.data) {
        return { success: true, message: "ยังไม่มีรีวิว", data: null };
      }

      const r = json.data;

      console.log("[REVIEW] raw data", JSON.stringify(r))
      
      const review: ReviewDto = {
        reviewId: r.review_id,
        productId: r.product_id,
        orderId: r.order_id,
        variantId: r.variant_id,
        userId: r.user_id,
        userDisplayName: r.user_display_name,
        rating: r.rating,
        comment: r.comment,
        variantName: r.variant_name,
        images: (r.images || []).map((img: any) => ({
          imageId: img.image_id,
          imageUrl: img.image_url,
          displayOrder: img.display_order || 0,
        })),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };

      console.log("[REVIEW API]", review)

      return {
        success: true,
        message: json.message || "ดึงรีวิวสำเร็จ",
        data: review,
      };
    } catch (error) {
      console.error("ReviewAPI getMyReviewForOrder error:", error);
      return { success: false, message: "เกิดข้อผิดพลาดในการเชื่อมต่อ" };
    }
  },
};