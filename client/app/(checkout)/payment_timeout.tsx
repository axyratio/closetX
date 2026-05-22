import { useLocalSearchParams, useRouter } from "expo-router";
import { Box, Button, Text, VStack } from "native-base";

export default function PaymentTimeout() {
  const router = useRouter();
  const { order_id } = useLocalSearchParams<{ order_id?: string }>();

  return (
    <Box flex={1} alignItems="center" justifyContent="center" p={6} bg="coolGray.50">
      <VStack space={3} alignItems="center">
        <Text fontSize="xl" fontWeight="bold">หมดเวลาชำระเงิน</Text>
        <Text color="coolGray.600" textAlign="center">
          คำสั่งซื้อถูกยกเลิกอัตโนมัติ
        </Text>
        {order_id ? <Text fontSize="xs" color="coolGray.400">order_id: {order_id}</Text> : null}
        <Button onPress={() => router.replace("/(tabs)" as any)}>กลับหน้าหลัก</Button>
      </VStack>
    </Box>
  );
}
