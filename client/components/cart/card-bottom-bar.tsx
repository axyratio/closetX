// components/cart/CartBottomBar.tsx
import {
  Box,
  Button,
  Checkbox,
  HStack,
  Text,
} from "native-base";
import React, { useMemo } from "react";

type Props = {
  allSelected: boolean;
  onToggleAll: () => void;
  totalPrice: number;
  onPressOrder: () => void;
  disabled?: boolean;
};



export const CartBottomBar: React.FC<Props> = ({
  
  allSelected,
  onToggleAll,
  totalPrice,
  onPressOrder,
  disabled,
}) => {
  // ✅ วิธีที่ 1: useMemo
  
  return (
    <Box
      position="absolute"
      left={0}
      right={0}
      bottom={0}
      bg="white"
      px={4}
      py={2}
      borderTopWidth={1}
      borderColor="coolGray.200"
      shadow={3}
    >
      <HStack alignItems="center" justifyContent="space-between" space={3}>
        {/* 👇 label เป็น children ของ Checkbox */}
        <Checkbox
          value="all"
          isChecked={allSelected}
          onChange={onToggleAll}
          accessibilityLabel="เลือกทั้งหมด"
          _checked={{
            bg: "violet.600",
            borderColor: "violet.600",
          }}
        >
          <Text fontSize="sm" color="coolGray.800">
            ทั้งหมด
          </Text>
        </Checkbox>

        <Text flex={1} textAlign="center" fontSize="xs" color="coolGray.700">
          รวมยอดสั่งซื้อ ฿{totalPrice}
        </Text>

        <Button
          borderRadius={999}
          px={6}
          bg="violet.600"
          _pressed={{ bg: "violet.700" }}
          onPress={onPressOrder}
          isDisabled={disabled}
        >
          <Text color="white" fontSize="sm">
            สั่งซื้อ
          </Text>
        </Button>
      </HStack>
    </Box>
  );
};
// function getSelectedTotal(): any {
//   throw new Error("Function not implemented.");
// }

