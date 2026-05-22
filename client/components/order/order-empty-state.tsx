// components/profile/order-empty-state.tsx
import { Ionicons } from "@expo/vector-icons";
import { Box, Center, Text, VStack } from "native-base";
import React from "react";

export function OrderEmptyState({ message }: { message?: string }) {
  return (
    <Center flex={1} px={6}>
      <VStack space={3} alignItems="center">
        <Box>
          <Ionicons name="receipt-outline" size={72} color="#cbd5e1" />
        </Box>
        <Text fontSize="md" fontWeight="bold">
          {message || "ยังไม่มีรายการ"}
        </Text>
        <Text fontSize="sm" color="gray.500" textAlign="center">
          เมื่อมีการสั่งซื้อ รายการจะมาแสดงที่นี่
        </Text>
      </VStack>
    </Center>
  );
}
