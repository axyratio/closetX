// components/cart/cart-memo.tsx
import {
  CartItem,
  deleteCartItems,
  getFullCart,
  updateCartItemQuantity,
  validateCheckout,
} from "@/api/cart";
import { create } from "zustand";

const DEBOUNCE = 1200;
const timers: Record<string, any> = {};

type CartState = {
  cartId: string | null;
  cartItems: CartItem[];
  selectedIds: Set<string>;
  loading: boolean;
  loadedOnce: boolean;
  lastSync: number | null;

  fetchCartFirstTime: () => Promise<void>;
  backgroundSync: () => Promise<void>;
  toggleItem: (id: string) => void;
  toggleStore: (storeId: string) => void;
  toggleAll: () => void;
  deleteSelected: () => Promise<void>;
  changeQuantity: (id: string, newQty: number) => void;
  getSelectedTotal: () => number;
  getTotalQuantity: () => number; // ✅ เพิ่มฟังก์ชันนับจำนวนสินค้า
  validateSelected: () => Promise<{
    is_valid: boolean;
    grand_total: number;
  }>;
};

export const useCartStore = create<CartState>((set, get) => ({
  cartId: null,
  cartItems: [],
  selectedIds: new Set(),
  loading: false,
  loadedOnce: false,
  lastSync: null,

  async fetchCartFirstTime() {
    if (get().loadedOnce) return;
    set({ loading: true });
    try {
      const data = await getFullCart();
      set({
        cartId: data.cart_id ?? null,
        cartItems: data.items,
        loadedOnce: true,
        lastSync: Date.now(),
      });
    } finally {
      set({ loading: false });
    }
  },

  async backgroundSync() {
    const { lastSync } = get();
    if (lastSync && Date.now() - lastSync < 3000) return;
    try {
      const fresh = await getFullCart();
      set({
        cartId: fresh.cart_id ?? get().cartId ?? null,
        cartItems: fresh.items,
        lastSync: Date.now(),
      });
    } catch (e) {
      console.log("background sync fail:", e);
    }
  },

  toggleItem(id) {
    const next = new Set(get().selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    set({ selectedIds: next });
  },

  toggleStore(storeId) {
    const { cartItems, selectedIds } = get();
    const storeItems = cartItems.filter((i) => i.store.store_id === storeId);
    const allSelected = storeItems.every((i) => selectedIds.has(i.cart_item_id));
    const next = new Set(selectedIds);
    storeItems.forEach((i) => {
      allSelected ? next.delete(i.cart_item_id) : next.add(i.cart_item_id);
    });
    set({ selectedIds: next });
  },

  toggleAll() {
    const { cartItems, selectedIds } = get();
    if (selectedIds.size === cartItems.length) {
      set({ selectedIds: new Set() });
    } else {
      set({ selectedIds: new Set(cartItems.map((i) => i.cart_item_id)) });
    }
  },

  async deleteSelected() {
    const ids = Array.from(get().selectedIds);
    if (!ids.length) return;
    set((prev) => ({
      cartItems: prev.cartItems.filter((i) => !ids.includes(i.cart_item_id)),
      selectedIds: new Set(),
    }));
    try {
      await deleteCartItems(ids);
      await get().backgroundSync();
    } catch (e) {
      console.log("delete error:", e);
      await get().backgroundSync();
    }
  },

  // ✅ แก้ไข: ห้ามแตะ price_at_addition - คำนวณ subtotal = price × quantity เท่านั้น
  changeQuantity(id, newQty) {
    const item = get().cartItems.find((i) => i.cart_item_id === id);
    if (!item) return;

    const maxStock = item.stock_available ?? Infinity;
    const safeQty = Math.min(newQty, maxStock);
    if (safeQty <= 0) return;

    // ✅ Optimistic update - คำนวณ subtotal ใหม่โดยไม่แตะ price_at_addition
    set((prev) => ({
      cartItems: prev.cartItems.map((i) =>
        i.cart_item_id === id
          ? {
              ...i,
              quantity: safeQty,
              // ✅ สูตรที่ถูกต้อง: subtotal = ราคาต่อหน่วยคงที่ × จำนวนใหม่
              subtotal: i.price_at_addition * safeQty,
            }
          : i
      ),
    }));

    if (timers[id]) clearTimeout(timers[id]);

    timers[id] = setTimeout(async () => {
      try {
        const res = await updateCartItemQuantity(id, safeQty);
        // ✅ อัพเดทจาก Backend (Backend คำนวณให้แล้ว)
        set((prev) => ({
          cartItems: prev.cartItems.map((i) =>
            i.cart_item_id === id
              ? { ...i, quantity: res.quantity, subtotal: res.subtotal }
              : i
          ),
        }));
      } catch {
        await get().backgroundSync();
      }
    }, DEBOUNCE);
  },

  getSelectedTotal() {
    return get().cartItems
      .filter((i) => get().selectedIds.has(i.cart_item_id))
      .reduce((sum, i) => sum + i.subtotal, 0);
  },

  // ✅ เพิ่มฟังก์ชันนับจำนวนสินค้าทั้งหมด
  getTotalQuantity() {
    return get().cartItems.reduce((sum, i) => sum + i.quantity, 0);
  },

  async validateSelected() {
    const ids = Array.from(get().selectedIds);
    if (!ids.length) return { is_valid: false, grand_total: 0 };
    try {
      const result = await validateCheckout(ids);
      await get().backgroundSync();
      return { is_valid: result.is_valid, grand_total: result.grand_total };
    } catch (e) {
      console.log("validate error:", e);
      return { is_valid: false, grand_total: 0 };
    }
  },
}));