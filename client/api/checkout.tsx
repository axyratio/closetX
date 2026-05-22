import { getToken } from "@/utils/secure-store";
import { DOMAIN } from "@/้host";

// api/checkout.ts
export type CheckoutType = "CART" | "DIRECT";

export type CheckoutItemDirect = {
  variant_id: string;
  quantity: number;
};

export type CheckoutRequestPayload = {
  checkout_type: CheckoutType;
  cart_id?: string;
  selected_cart_item_ids?: string[];
  items?: CheckoutItemDirect[];
  shipping_address_id: string;
};

export type CheckoutResponse = {
  order_ids: string[];
  stripe_session_id: string;
  stripe_checkout_url: string;
  expires_at: string;
};

type ApiResponse<T> = {
  data: T;
  message?: string;
  success?: boolean;
};

const BASE_URL = `${DOMAIN}/api/v1/checkout`;

export async function checkoutCart(
  payload: CheckoutRequestPayload,
): Promise<CheckoutResponse> {
  const res = await fetch(`${BASE_URL}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${await getToken()}`,
    },
    body: JSON.stringify(payload),
  });

  const json = (await res.json()) as ApiResponse<CheckoutResponse> | any;

  if (!res.ok) {
    const errMsg = json?.message || json?.detail || JSON.stringify(json) || "Checkout failed";
    throw new Error(errMsg);
  }

  // Backend returns { data: {...} }
  if (json && typeof json === "object" && "data" in json) {
    return json.data as CheckoutResponse;
  }

  // Fallback: if backend returns the raw object (edge case), return it as data
  return json as CheckoutResponse;
}


// api/checkout.ts

const API_BASE_URL = `${DOMAIN}`;
const CHECKOUT_API_BASE = `${API_BASE_URL}/api/v1`;

export async function cancelCheckoutReservation(orderId: string): Promise<void> {
  const token = await getToken();
  const res = await fetch(`${CHECKOUT_API_BASE}/checkout/cancel/${orderId}`, {
    method: "POST",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.log("cancelCheckoutReservation error:", res.status, text);
    // ไม่ต้อง throw ก็ได้ เพราะ cancel เป็น best-effort
  }
}
