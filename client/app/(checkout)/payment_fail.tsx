// app/(checkout)/payment_failed.tsx
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Box, Button, HStack, Text, VStack } from "native-base";
import React from "react";

// ✅ แปล Stripe decline_code / error_code เป็นข้อความภาษาไทยที่เข้าใจง่าย
const DECLINE_REASONS: Record<string, { title: string; description: string }> = {
  insufficient_funds: {
    title: "ยอดเงินในบัตรไม่เพียงพอ",
    description: "บัตรของคุณมียอดเงินไม่พอสำหรับการชำระเงินนี้ กรุณาใช้บัตรใบอื่นหรือเติมเงินแล้วลองใหม่",
  },
  card_declined: {
    title: "บัตรถูกปฏิเสธ",
    description: "ธนาคารปฏิเสธการชำระเงิน กรุณาติดต่อธนาคารของคุณหรือใช้บัตรใบอื่น",
  },
  expired_card: {
    title: "บัตรหมดอายุ",
    description: "บัตรของคุณหมดอายุแล้ว กรุณาใช้บัตรใบใหม่",
  },
  incorrect_cvc: {
    title: "รหัส CVV ไม่ถูกต้อง",
    description: "รหัส CVV ที่กรอกไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่",
  },
  incorrect_number: {
    title: "หมายเลขบัตรไม่ถูกต้อง",
    description: "หมายเลขบัตรที่กรอกไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่",
  },
  processing_error: {
    title: "เกิดข้อผิดพลาดในการประมวลผล",
    description: "เกิดข้อผิดพลาดชั่วคราว กรุณาลองใหม่อีกครั้งในอีกสักครู่",
  },
  do_not_honor: {
    title: "ธนาคารไม่อนุมัติรายการ",
    description: "ธนาคารของคุณไม่อนุมัติรายการนี้ กรุณาติดต่อธนาคารของคุณ",
  },
  lost_card: {
    title: "บัตรถูกรายงานว่าสูญหาย",
    description: "บัตรนี้ถูกรายงานว่าสูญหาย กรุณาใช้บัตรใบอื่น",
  },
  stolen_card: {
    title: "บัตรถูกรายงานว่าถูกขโมย",
    description: "บัตรนี้ถูกรายงานว่าถูกขโมย กรุณาใช้บัตรใบอื่น",
  },
  // Stripe test card error codes
  generic_decline: {
    title: "บัตรถูกปฏิเสธ",
    description: "ธนาคารปฏิเสธการชำระเงินโดยไม่ระบุสาเหตุ กรุณาติดต่อธนาคารของคุณ",
  },
};

const DEFAULT_REASON = {
  title: "การชำระเงินไม่สำเร็จ",
  description: "เกิดปัญหาระหว่างการชำระเงิน กรุณาลองใหม่อีกครั้งหรือใช้บัตรใบอื่น",
};

export default function PaymentFailedScreen() {
  const router = useRouter();
  const { decline_code, error_message } = useLocalSearchParams<{
    decline_code?: string;   // Stripe decline_code เช่น "insufficient_funds"
    error_message?: string;  // ข้อความ error เพิ่มเติม (optional)
  }>();

  const reason = (decline_code && DECLINE_REASONS[decline_code]) || DEFAULT_REASON;

  return (
    <Box flex={1} bg="coolGray.50" px={6} justifyContent="center">
      <VStack space={5} alignItems="center">

        {/* ไอคอน X สีแดง */}
        <Box
          bg="red.100"
          w={20}
          h={20}
          borderRadius="full"
          alignItems="center"
          justifyContent="center"
        >
          <Ionicons name="close-circle" size={56} color="#dc2626" />
        </Box>

        {/* หัวข้อ */}
        <Text fontSize="2xl" fontWeight="bold" color="coolGray.800" textAlign="center">
          {reason.title}
        </Text>

        {/* คำอธิบาย */}
        <Box bg="white" p={4} borderRadius="xl" w="100%" shadow={1}>
          <Text fontSize="sm" color="coolGray.600" textAlign="center" lineHeight="lg">
            {reason.description}
          </Text>
        </Box>

        {/* แสดง error_message จาก backend ถ้ามี (สำหรับ debug หรืออธิบายเพิ่ม) */}
        {error_message ? (
          <Text fontSize="xs" color="coolGray.400" textAlign="center">
            รายละเอียด: {error_message}
          </Text>
        ) : null}

        {/* decline_code สำหรับ reference */}
        {decline_code ? (
          <Text fontSize="xs" color="coolGray.400">
            รหัสข้อผิดพลาด: {decline_code}
          </Text>
        ) : null}

        {/* ปุ่มกลับ */}
        <HStack space={3} w="100%" mt={2}>
          <Button
            flex={1}
            colorScheme="violet"
            borderRadius="full"
            onPress={() => router.back()}
          >
            ลองชำระเงินอีกครั้ง
          </Button>

          <Button
            flex={1}
            variant="outline"
            borderRadius="full"
            onPress={() => router.replace("/(tabs)" as any)}
          >
            กลับหน้าหลัก
          </Button>
        </HStack>

      </VStack>
    </Box>
  );
}