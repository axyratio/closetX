// app/payment-success.tsx
import React, { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Box, Button, Text, VStack, HStack } from "native-base";
import { MaterialIcons } from "@expo/vector-icons";

export default function PaymentSuccessScreen() {
  const router = useRouter();

  const { order_ids, payment_id } = useLocalSearchParams<{
    order_ids?: string;   // ส่งมาเป็น "id1,id2"
    payment_id?: string;
  }>();

  const orderList = (order_ids || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  useEffect(() => {
    // กันคนเข้าตรง ๆ แบบไม่มีอะไรเลย (แล้วแต่จะเอาออก)
    // ถ้าไม่อยากกันก็ลบทั้ง useEffect ได้
  }, []);

  return (
    <Box flex={1} bg="coolGray.50" px={6} justifyContent="center">
      <VStack space={4} alignItems="center">
        <Box
          bg="emerald.100"
          w={20}
          h={20}
          borderRadius="full"
          alignItems="center"
          justifyContent="center"
        >
          <MaterialIcons name="check-circle" size={56} color="#059669" />
        </Box>

        <Text fontSize="2xl" fontWeight="bold" color="coolGray.800">
          ชำระเงินสำเร็จ
        </Text>

        <Text fontSize="sm" color="coolGray.600" textAlign="center">
          ระบบได้รับการชำระเงินแล้ว และกำลังยืนยันคำสั่งซื้อของคุณ
        </Text>

        {/* แสดงข้อมูลเผื่อ debug/อ้างอิง */}
        {payment_id ? (
          <Text fontSize="xs" color="coolGray.500">
            payment_id: {payment_id}
          </Text>
        ) : null}

        {orderList.length ? (
          <VStack space={1} w="100%" mt={2}>
            <Text fontSize="xs" color="coolGray.500">
              Order IDs:
            </Text>
            <Box bg="white" p={3} borderRadius="lg">
              {orderList.map((id) => (
                <Text key={id} fontSize="xs" color="coolGray.700">
                  • {id}
                </Text>
              ))}
            </Box>
          </VStack>
        ) : null}

        <HStack space={3} mt={4} w="100%">
          <Button
            flex={1}
            colorScheme="violet"
            borderRadius="full"
            onPress={() => router.replace("/(tabs)" as any)}
          >
            กลับหน้าหลัก
          </Button>

          <Button
            flex={1}
            variant="outline"
            borderRadius="full"
            onPress={() => router.push("/(profile)/orders" as any)} // ปรับ path หน้ามึงเอง
          >
            ดูออเดอร์
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}
