// File: api/category.tsx

import { getToken } from "@/utils/secure-store";
import { DOMAIN } from "@/้host";

const API_BASE = `${DOMAIN}/categories`;
const ADMIN_API_BASE = `${DOMAIN}/admin/categories`;

export type Category = {
  category_id: string;
  name: string;
  slug: string;
  is_active: boolean;
  product_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type CategoryCreatePayload = {
  name: string;
  slug: string;
};

export type CategoryUpdatePayload = {
  name?: string;
  slug?: string;
  is_active?: boolean;
};

// ==========================================
// PUBLIC APIs (ไม่ต้อง admin)
// ==========================================

export async function fetchPublicCategories(): Promise<Category[]> {
  const res = await fetch(`${API_BASE}`);
  if (!res.ok) throw new Error("Failed to fetch categories");
  const json = await res.json();
  return json.data || [];
}

export async function fetchCategoryById(categoryId: string): Promise<Category> {
  const res = await fetch(`${API_BASE}/${categoryId}`);
  if (!res.ok) throw new Error("Failed to fetch category");
  const json = await res.json();
  return json.data;
}

// ==========================================
// ADMIN APIs (ต้องมี admin role)
// ==========================================

export async function fetchAdminCategories(
  activeOnly: boolean = true,
): Promise<Category[]> {
  const token = await getToken();
  if (!token) throw new Error("No token found in storage");

  const res = await fetch(`${ADMIN_API_BASE}?active_only=${activeOnly}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    // เพิ่มการอ่าน Error จาก Server เพื่อดูสาเหตุที่แท้จริง
    const errorJson = await res.json().catch(() => ({}));
    console.log("Server Error Status:", res.status);
    console.log("Server Error Detail:", errorJson);
    throw new Error(
      errorJson.message ||
        `Error ${res.status}: Failed to fetch admin categories`,
    );
  }

  const json = await res.json();
  return json.data || [];
}

export async function createCategory(
  payload: CategoryCreatePayload,
): Promise<Category> {
  const token = await getToken();
  if (!token) throw new Error("No token");

  const res = await fetch(ADMIN_API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.message || "Failed to create category");
  }

  const json = await res.json();
  return json.data;
}

export async function updateCategory(
  categoryId: string,
  payload: CategoryUpdatePayload,
): Promise<Category> {
  const token = await getToken();
  if (!token) throw new Error("No token");

  const res = await fetch(`${ADMIN_API_BASE}/${categoryId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.message || "Failed to update category");
  }

  const json = await res.json();
  return json.data;
}

export async function deleteCategory(
  categoryId: string,
  hardDelete: boolean = false,
): Promise<void> {
  const token = await getToken();
  if (!token) throw new Error("No token");

  const res = await fetch(
    `${ADMIN_API_BASE}/${categoryId}?hard_delete=${hardDelete}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.message || "Failed to delete category");
  }
}
