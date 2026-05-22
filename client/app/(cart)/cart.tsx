import {
  Box,
  ScrollView,
  Spinner,
  Text,
  useToast,
} from "native-base";
import React, { useEffect, useMemo } from "react";
import { SafeAreaView } from "react-native";

import { deleteCartItems } from "@/api/cart";
import { CartBottomBar } from "@/components/cart/card-bottom-bar";
import { CartStoreSection } from "@/components/cart/card-store-section";
import { useCartStore } from "@/components/cart/cart-memo";
import { AppBarNoCheck } from "@/components/navbar";
import { router } from "expo-router";

const CartScreen: React.FC = () => {
  const toast = useToast();

  const {
    cartItems,
    selectedIds,
    loading,
    fetchCartFirstTime,
    toggleItem,
    toggleStore,
    toggleAll,
    changeQuantity,
    validateSelected,
    backgroundSync,
  } = useCartStore();

  // ----------- โหลดข้อมูลครั้งแรก -----------
useEffect(() => {
  useCartStore.setState({ lastSync: null, loadedOnce: false });
  fetchCartFirstTime();
}, []);

  // ✅ 1. จัดกลุ่มสินค้าตามร้านค้า (จะคำนวณใหม่เมื่อ cartItems เปลี่ยนเท่านั้น)
  const stores = useMemo(() => {
    const m = new Map();
    cartItems.forEach((item) => {
      const id = item.store.store_id;
      if (!m.has(id)) {
        m.set(id, {
          store_id: id,
          store_name: item.store.store_name,
          items: [],
        });
      }
      m.get(id).items.push(item);
    });
    return Array.from(m.values());
  }, [cartItems]);

  // ✅ 2. คำนวณราคารวม (คำนวณใหม่ทันทีที่เปลี่ยนจำนวน หรือ ติ๊กเลือกสินค้า)
  const total = useMemo(() => {
    return cartItems
      .filter((item) => selectedIds.has(item.cart_item_id)) // กรองเอาเฉพาะชิ้นที่ถูกเลือก
      .reduce((sum, item) => {
        const price = item.price_at_addition || 0;
        return sum + price * item.quantity;
      }, 0);
  }, [cartItems, selectedIds]); // เฝ้าดูทั้งรายการสินค้าและสถานะการเลือก

  // ✅ 3. ตรวจสอบสถานะการเลือกทั้งหมด
  const allSelected =
    cartItems.length > 0 && selectedIds.size === cartItems.length;

  // ----------- Handlers -----------
  const handleDeleteOne = async (id: string) => {
    try {
      await deleteCartItems([id]);
      // หลังจากลบสำเร็จ ให้สั่ง sync ข้อมูลใน store ใหม่
      useCartStore.getState().backgroundSync();
      toast.show({ description: "ลบสินค้าออกจากตะกร้าแล้ว" });
    } catch (e) {
      toast.show({ description: "ลบสินค้าไม่สำเร็จ" });
    }
  };

  const handlePressOrder = async () => {
    if (selectedIds.size === 0) {
      toast.show({ description: "กรุณาเลือกสินค้าที่ต้องการสั่งซื้อ" });
      return;
    }

    try {
      const result = await validateSelected();
      if (!result.is_valid) {
        toast.show({
          description: "สินค้าบางรายการมีสต็อกไม่พอหรือราคามีการเปลี่ยนแปลง",
        });
        return;
      }
      
      // เมื่อ Validate ผ่านแล้วจึงไปหน้า checkout
      router.push('/checkout' as any);
      
    } catch (e) {
      toast.show({ description: "ตรวจสอบตะกร้าไม่สำเร็จ" });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      <AppBarNoCheck title="รถเข็น" />

      <Box flex={1} bg="coolGray.100" pb={16}>
        {loading ? (
          <Box flex={1} justifyContent="center" alignItems="center">
            <Spinner color="violet.600" size="lg" />
          </Box>
        ) : cartItems.length === 0 ? (
          <Box flex={1} justifyContent="center" alignItems="center">
            <Text color="coolGray.500" fontSize="md">ยังไม่มีสินค้าในรถเข็น</Text>
          </Box>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {stores.map((store: any) => (
              <CartStoreSection
                key={store.store_id}
                storeId={store.store_id}
                storeName={store.store_name}
                items={store.items}
                selectedIds={selectedIds}
                onToggleStore={toggleStore}
                onToggleItem={toggleItem}
                onChangeQuantity={changeQuantity}
                onDeleteItem={handleDeleteOne}
              />
            ))}
            {/* เผื่อพื้นที่ด้านล่าง Scroll ไม่ให้โดน BottomBar บัง */}
            <Box h={10} />
          </ScrollView>
        )}

        {/* ✅ ส่งค่าที่คำนวณได้จาก useMemo ไปที่ BottomBar */}
        <CartBottomBar
          allSelected={allSelected}
          onToggleAll={toggleAll}
          totalPrice={total}
          onPressOrder={handlePressOrder}
          disabled={cartItems.length === 0 || selectedIds.size === 0}
        />
      </Box>
    </SafeAreaView>
  );
};

export default CartScreen;