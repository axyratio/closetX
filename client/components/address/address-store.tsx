// stores/address-store.ts
import { fetchAddresses, ShippingAddress } from "@/api/address";
import { create } from "zustand";

type AddressState = {
  addresses: ShippingAddress[];
  selected?: ShippingAddress;
  loading: boolean;

  fetchAll: () => Promise<void>;
  selectById: (id: string) => void;
};

export const useAddressStore = create<AddressState>((set, get) => ({
  addresses: [],
  selected: undefined,
  loading: false,

  async fetchAll() {
    if (get().loading) return;
    set({ loading: true });

    try {
      const data = await fetchAddresses();
      console.log("addresses from API >>>", data);

      const currentSelected = get().selected;
      let selected: ShippingAddress | undefined;

      if (!currentSelected) {
        // ครั้งแรกยังไม่เคยเลือกเอง → ใช้ default / อันแรก
        selected =
          data.find((a) => a.is_default) ??
          (data.length > 0 ? data[0] : undefined);
      } else {
        // เคยเลือกเองแล้ว → หาตัวเดิมจาก list ใหม่
        selected = data.find(
          (a) => a.ship_addr_id === currentSelected.ship_addr_id
        );

        // ถ้าโดนลบไปแล้ว ค่อย fallback
        if (!selected) {
          selected =
            data.find((a) => a.is_default) ??
            (data.length > 0 ? data[0] : undefined);
        }
      }

      set({ addresses: data, selected });
    } catch (e) {
      console.log("load address error:", e);
    } finally {
      set({ loading: false });
    }
  },

  selectById(id: string) {
    const addr = get().addresses.find((a) => a.ship_addr_id === id);
    if (addr) {
      set({ selected: addr });
    }
  },
}));
