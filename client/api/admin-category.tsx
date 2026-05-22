
// client/api/admin-category.tsx
import { DOMAIN } from "@/้host";
import { getToken } from "@/utils/secure-store";

export interface Category {
  category_id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  is_active: boolean;
  product_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * ดึงหมวดหมู่ทั้งหมด (Admin)
 */
export async function getAllCategories(activeOnly: boolean = true) {
  try {
    const token = await getToken();
    const response = await fetch(
      `${DOMAIN}/admin/categories?active_only=${activeOnly}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return await response.json();
  } catch (error) {
    console.error("❌ Error fetching categories:", error);
    throw error;
  }
}

/**
 * ดึงข้อมูลหมวดหมู่ตาม ID (Admin)
 */
export async function getCategoryById(categoryId: string) {
  try {
    const token = await getToken();
    const response = await fetch(`${DOMAIN}/admin/categories/${categoryId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    return await response.json();
  } catch (error) {
    console.error("❌ Error fetching category:", error);
    throw error;
  }
}

/**
 * สร้างหมวดหมู่ใหม่พร้อมรูปภาพ (Admin)
 */
export async function createCategory(data: {
  name: string;
  slug: string;
  description?: string;
  image?: any; // File object
}) {
  try {
    const token = await getToken();
    const formData = new FormData();

    formData.append("name", data.name);
    formData.append("slug", data.slug);
    
    if (data.description) {
      formData.append("description", data.description);
    }
    
    if (data.image) {
      formData.append("image", data.image);
    }

    const response = await fetch(`${DOMAIN}/admin/categories`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    return await response.json();
  } catch (error) {
    console.error("❌ Error creating category:", error);
    throw error;
  }
}

/**
 * อัพเดทหมวดหมู่ (Admin)
 */
export async function updateCategory(
  categoryId: string,
  data: {
    name?: string;
    slug?: string;
    description?: string;
    is_active?: boolean;
    image?: any; // File object
    remove_image?: boolean;
  }
) {
  try {
    const token = await getToken();
    const formData = new FormData();

    if (data.name !== undefined) {
      formData.append("name", data.name);
    }
    if (data.slug !== undefined) {
      formData.append("slug", data.slug);
    }
    if (data.description !== undefined) {
      formData.append("description", data.description);
    }
    if (data.is_active !== undefined) {
      formData.append("is_active", String(data.is_active));
    }
    if (data.image) {
      formData.append("image", data.image);
    }
    if (data.remove_image) {
      formData.append("remove_image", "true");
    }

    const response = await fetch(`${DOMAIN}/admin/categories/${categoryId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    return await response.json();
  } catch (error) {
    console.error("❌ Error updating category:", error);
    throw error;
  }
}

/**
 * ลบหมวดหมู่ (Admin)
 */
export async function deleteCategory(
  categoryId: string,
  hardDelete: boolean = false
) {
  try {
    const token = await getToken();
    const response = await fetch(
      `${DOMAIN}/admin/categories/${categoryId}?hard_delete=${hardDelete}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return await response.json();
  } catch (error) {
    console.error("❌ Error deleting category:", error);
    throw error;
  }
}