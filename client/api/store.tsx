import { getToken } from "@/utils/secure-store";
import { DOMAIN } from "@/้host";
import axios from "axios";

export type AppliedStoreType = {
  name: string;
  description: string;
  address?: string;
  image?: File;
};

// ✅ แก้ไข: ใช้ GET /store/me แทน POST /store
export const getMyStore = async () => {
  try {
    const token = await getToken();

    if (!token) {
      throw new Error("Token not found. Please log in again.");
    }

    // ✅ เปลี่ยนจาก POST เป็น GET
    const response = await axios.get(`${DOMAIN}/store/me`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      validateStatus: (status) => status < 500,
    });

    return response.data;
  } catch (error: any) {
    console.error("❌ Error get store:", error);
    throw error.response?.data || { message: "Unknown error" };
  }
};

export const updateStore = async (
  storeId: string,
  data: Partial<
    AppliedStoreType & {
      logo?: any;
      remove_logo?: boolean;
    }
  >,
) => {
  try {
    const token = await getToken();
    if (!token) {
      throw new Error("Token not found.");
    }

    const formData = new FormData();

    // เพิ่มข้อมูลแต่ละฟิลด์
    if (data.name !== undefined) {
      formData.append("name", data.name);
    }
    if (data.description !== undefined) {
      formData.append("description", data.description);
    }
    if (data.address !== undefined) {
      formData.append("address", data.address);
    }
    if (data.logo) {
      formData.append("logo", data.logo);
    }
    if (data.remove_logo) {
      formData.append("remove_logo", "true");
    }

    const response = await axios.patch(`${DOMAIN}/store/update`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${token}`,
        Connection: "close", // ← เพิ่ม
      },
      validateStatus: (status) => status < 500,
    });

    return response.data;
  } catch (error: any) {
    console.error("❌ Error updating store:", error);
    throw error.response?.data || { message: "Unknown error" };
  }
};

export const appliedStore = async (store: AppliedStoreType) => {
  try {
    const token = await getToken();

    if (!token) {
      throw new Error("Token not found. Please log in again.");
    }

    const formData = new FormData();
    formData.append("name", store.name);
    formData.append("description", store.description);
    formData.append("address", store.address || "");
    if (store.image) formData.append("image", store.image);

    const response = await axios.post(
      `${DOMAIN}/store/create-with-stripe`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
        validateStatus: (status) => status < 500,
      },
    );

    return response.data;
  } catch (error: any) {
    console.error("❌ Error creating store with Stripe:", error);
    throw error.response?.data || { message: "Unknown error" };
  }
};
