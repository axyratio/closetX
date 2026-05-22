// api/wishlist.tsx
import { DOMAIN } from "@/้host";

const API = `${DOMAIN}/wishlist`;

// ─── Types ───
export type WishlistItem = {
  wishlist_id: string;
  product_id: string;
  title: string;
  price: number;
  rating: number;
  image_url?: string;
  image_id?: string;
  store_name?: string;
  added_at?: string;
};

// ─── Toggle (เพิ่ม/ลบ) ───
export async function toggleWishlist(
  token: string,
  productId: string
): Promise<{ status: "added" | "removed" }> {
  const res = await fetch(`${API}/toggle`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ product_id: productId }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to toggle wishlist");
  }
  const json = await res.json();
  return json.data;
}

// ─── ดึงรายการ bookmark ───
export async function fetchWishlist(
  token: string,
  limit = 50,
  offset = 0
): Promise<{ total: number; items: WishlistItem[] }> {
  const res = await fetch(`${API}/me?limit=${limit}&offset=${offset}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch wishlist");
  }
  const json = await res.json();
  return json.data;
}

// ─── เช็คว่าสินค้าอยู่ใน wishlist ไหม ───
export async function checkWishlist(
  token: string,
  productId: string
): Promise<boolean> {
  try {
    const res = await fetch(`${API}/check/${productId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;
    const json = await res.json();
    return json.data?.is_wishlisted ?? false;
  } catch (error) {
    console.error("Error checking wishlist:", error);
    return false;
  }
}