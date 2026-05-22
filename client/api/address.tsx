// api/address.ts
import { getToken } from "@/utils/secure-store"; // 👈 ใช้ helper ที่มึงเขียน
import { DOMAIN } from "@/้host"; // แก้ให้ตรงของมึง

const BASE_URL = `${DOMAIN}/shipping-address`;

export type ShippingAddress = {
  ship_addr_id: string;
  user_id: string;

  full_name: string;
  phone_number: string;
  address_line: string;

  sub_district?: string;
  district?: string;
  province?: string;
  postal_code?: string;

  is_default?: boolean;
};

export type ShippingAddressPayload = {
  full_name: string;
  phone_number: string;
  address_line: string;
  sub_district?: string;
  district?: string;
  province?: string;
  postal_code?: string;
  is_default?: boolean;
};

// ดึง token จาก getToken() แล้วสร้าง headers
async function buildHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  try {
    const token = await getToken(); // 👈 ใช้ของมึง
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    console.log("read token error:", e);
  }

  return headers;
}

// GET /shipping-address/
export async function fetchAddresses(): Promise<ShippingAddress[]> {
  const token = await getToken();

  const res = await fetch(`${BASE_URL}/`, {
    headers: await buildHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Cannot load addresses");
  }

  const json = await res.json();

  // รองรับทั้ง 2 แบบ:
  // 1) backend ส่งเป็น array ตรง ๆ
  // 2) backend ห่อเป็น { success, message, data: [...] }
  const data = Array.isArray(json) ? json : json.data;

  if (!Array.isArray(data)) {
    console.log("Invalid address response shape:", json);
    throw new Error("Invalid address response");
  }

  return data as ShippingAddress[];
}

// GET /shipping-address/default (ถ้ามี endpoint นี้)
export async function fetchDefaultAddress(): Promise<ShippingAddress | null> {
  const headers = await buildHeaders();

  const res = await fetch(`${BASE_URL}/default`, {
    headers,
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Cannot load default address");
  }

  return res.json();
}

// POST /shipping-address/
export async function createAddress(
  payload: ShippingAddressPayload
): Promise<ShippingAddress> {
  const headers = await buildHeaders();

  const res = await fetch(`${BASE_URL}/`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Cannot create address");
  }

  return res.json();
}

// PUT /shipping-address/{id}
export async function updateAddress(
  id: string,
  payload: ShippingAddressPayload
): Promise<ShippingAddress> {
  const headers = await buildHeaders();

  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Cannot update address");
  }

  return res.json();
}

// DELETE /shipping-address/{id}
export async function deleteAddress(id: string): Promise<void> {
  const headers = await buildHeaders();

  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Cannot delete address");
  }
}
