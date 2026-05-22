// components/cart/CartStoreSection.tsx
import { CartItem } from "@/api/cart";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Box, Checkbox, Divider, HStack, Pressable, Text } from "native-base";
import React, { useMemo, useState } from "react";
import { CartItemCard } from "./cart-item-card";

type Props = {
  storeId: string;
  storeName: string;
  items: CartItem[];
  selectedIds: Set<string>;
  onToggleStore: (storeId: string) => void;
  onToggleItem: (id: string) => void;
  onChangeQuantity: (id: string, newQty: number) => void;
  onDeleteItem: (id: string) => Promise<void>;
};

export const CartStoreSection: React.FC<Props> = ({
  storeId,
  storeName,
  items,
  selectedIds,
  onToggleStore,
  onToggleItem,
  onChangeQuantity,
  onDeleteItem,
}) => {

  const router = useRouter();
  const [editMode, setEditMode] = useState(false);

  const allSelected = useMemo(
    () =>
      items.length > 0 && items.every((i) => selectedIds.has(i.cart_item_id)),
    [items, selectedIds]
  );

  const handlePressStore = () => {
    console.log("go to store:", storeId);
    // router.push(`/store/${storeId}` as any);
  };

  return (
    <Box bg="white" mb={2}>
      {/* header ร้าน */}
      <HStack
        px={3}
        py={2}
        alignItems="center"
        justifyContent="space-between"
        borderBottomWidth={1}
        borderColor="coolGray.100"
      >
        {/* 👇 ให้ทั้งฝั่งซ้าย (รวม padding) กดได้ */}
        <Pressable flex={1} onPress={handlePressStore}>
          <HStack space={1} alignItems="center">
            <Text fontSize="sm" fontWeight="medium" color="coolGray.800">
              {storeName}
            </Text>
            <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
          </HStack>
        </Pressable>

        <HStack space={4} alignItems="center">
          <Checkbox
            value="all"
            isChecked={allSelected}
            onChange={() => onToggleStore(storeId)}
            _checked={{
              bg: "violet.600",
              borderColor: "violet.600",
            }}
          >
            {/* 3) label เป็น children → กดตัวหนังสือแล้วติ๊กได้ */}
            <Text fontSize="xs" color="coolGray.700">
              ทั้งร้าน
            </Text>
          </Checkbox>

          <Pressable onPress={() => setEditMode((prev) => !prev)}>
            <Text fontSize="xs" color="coolGray.600">
              {editMode ? "ยกเลิก" : "แก้ไข"}
            </Text>
          </Pressable>
        </HStack>
      </HStack>

      <Divider />

      {/* สินค้าในร้าน */}
      {items.map((item) => (
        <CartItemCard
          key={item.cart_item_id}
          item={item}
          selected={selectedIds.has(item.cart_item_id)}
          onToggleSelected={() => onToggleItem(item.cart_item_id)}
          onIncrease={() =>
            onChangeQuantity(item.cart_item_id, item.quantity + 1)
          }
          onDecrease={() =>
            item.quantity > 1 &&
            onChangeQuantity(item.cart_item_id, item.quantity - 1)
          }
          isEditMode={editMode}
          onDelete={async () => {
            await onDeleteItem(item.cart_item_id);
          }}
          // 4) กดที่ card → ไปหน้า product detail
          onPressItem={() => {
            // แก้ path ตาม route ของมึงเอง
            router.push({
              pathname: "/(home)/product-detail",
              params: { productId: item.product_id },
            } as any);
          }}
        />
      ))}
    </Box>
  );
};
