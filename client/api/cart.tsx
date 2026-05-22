// api/cart.tsx
import { DOMAIN } from "@/้host";
import { getToken } from "@/utils/secure-store";

const API_BASE_URL = `${DOMAIN}`;
const CART_API_BASE = `${API_BASE_URL}/cart`;

export type AddToCartPayload = {
  productId: string;
  variantId: string;   // ❗ ต้องส่ง variantId เสมอ เพราะ DB บังคับ not null
  quantity: number;
};

export type CartSummary = {
  itemCount: number;
};

export async function addToCart(payload: AddToCartPayload): Promise<void> {
  const token = await getToken();

  const res = await fetch(`${CART_API_BASE}/items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify({
      product_id: payload.productId,
      variant_id: payload.variantId,
      quantity: payload.quantity,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.log("addToCart error:", res.status, text);
    throw new Error("เพิ่มสินค้าลงตะกร้าไม่สำเร็จ");
  }
}

export async function getCartSummary(): Promise<CartSummary> {
  const token = await getToken();

  const res = await fetch(`${CART_API_BASE}/summary`, {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  if (!res.ok) {
    console.log("getCartSummary error:", res.status);
    return { itemCount: 0 };
  }

  const json = await res.json();
  const itemCount = json?.data?.item_count ?? 0;
  return { itemCount };
}
// api/cart.ts

const CHECKOUT_API_BASE = `${API_BASE_URL}/checkout`;

// ------------ types ------------
export type StoreInfo = {
  store_id: string;
  store_name: string;
};

export type CartItem = {
  cart_item_id: string;
  product_id: string;
  variant_id: string;
  product_name: string;
  variant_sku: string;
  variant_name: string;
  quantity: number;
  price_at_addition: number;
  subtotal: number;
  image_url?: string | null;
  store: StoreInfo;

  stock_available?: number;
};

export type CartFullResponse = {
  cart_id?: string | null;
  items: CartItem[];
};

export type CheckoutItemStatus = {
  cart_item_id: string;
  product_name: string;
  variant_name: string;
  quantity: number;
  price_at_addition: number;
  current_price: number;
  stock_available: number;
  in_stock: boolean;
  price_changed: boolean;
};

export type CheckoutValidateResult = {
  is_valid: boolean;
  grand_total: number;
  items: CheckoutItemStatus[];
};

// ------------ helpers ------------
async function authHeaders() {
  const token = await getToken();
  return {
    Authorization: token ? `Bearer ${token}` : "",
    "Content-Type": "application/json",
  };
}

// ------------ API ------------
export async function getFullCart(): Promise<CartFullResponse> {
  const headers = await authHeaders();
  const res = await fetch(`${CART_API_BASE}/items/full`, {
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    console.log("getFullCart error:", res.status, text);
    return { items: [] };
  }

  const json = await res.json();
  return json.data as CartFullResponse;
}

export async function deleteCartItems(ids: string[]): Promise<void> {
  if (!ids.length) return;

  const headers = await authHeaders();
  const res = await fetch(`${CART_API_BASE}/items`, {
    method: "DELETE",
    headers,
    body: JSON.stringify({ cart_item_ids: ids }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.log("deleteCartItems error:", res.status, text);
    throw new Error("ลบรายการไม่สำเร็จ");
  }
}


export async function updateCartItemQuantity(
  cartItemId: string,
  quantity: number
): Promise<{ cart_item_id: string; quantity: number; subtotal: number }> {
  const headers = await authHeaders();
  const res = await fetch(`${CART_API_BASE}/items/${cartItemId}/quantity`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ quantity }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    console.log("updateCartItemQuantity error:", res.status, json);
    throw new Error(json?.message || "อัปเดตจำนวนไม่สำเร็จ");
  }

  return json.data;
}

export async function validateCheckout(
  ids: string[]
): Promise<CheckoutValidateResult> {
  const headers = await authHeaders();
  const res = await fetch(`${CHECKOUT_API_BASE}/validate`, {
    method: "POST",
    headers,
    body: JSON.stringify({ selected_cart_item_ids: ids }), //ยังไม่ได้ input price
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    console.log("validateCheckout error:", res.status, json);
    throw new Error(json?.message || "ตรวจสอบตะกร้าไม่สำเร็จ");
  }

  return json.data as CheckoutValidateResult;
}