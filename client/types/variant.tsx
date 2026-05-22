// types/variant.ts
export type VariantOption = {
  id: string;
  name: string;
  // รูปโชว์ตัวเลือกบนหน้าสินค้า
  displayImageUri?: string;
  // รูปสำหรับลองเสื้อ (VTON) ต่อ 1 ตัวเลือก
  tryOnImageUri?: string;
};

// ✅ เพิ่ม ShippingTier สำหรับแสดงตาราง tier ใน UI
export type ShippingTier = {
  label: string;       // เช่น "0 – 500 กรัม"
  max_grams: number;   // -1 = ไม่มีขีดจำกัด
  fee: number;         // ค่าส่ง (บาท)
};