// app/store/onboarding-success.tsx
import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Box, Button, Text, VStack, HStack, Spinner } from "native-base";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";

export default function StoreOnboardingSuccessScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate checking onboarding status
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <Box flex={1} bg="white" justifyContent="center" alignItems="center">
        <VStack space={4} alignItems="center">
          <Spinner size="lg" color="#8b0ff8" />
          <Text fontSize="md" color="gray.600">
            กำลังตรวจสอบข้อมูล...
          </Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="white" px={6} justifyContent="center">
      <VStack space={6} alignItems="center">
        {/* Success Icon */}
        <Box
          bg="emerald.100"
          w={24}
          h={24}
          borderRadius="full"
          alignItems="center"
          justifyContent="center"
        >
          <MaterialIcons name="check-circle" size={72} color="#059669" />
        </Box>

        {/* Title */}
        <VStack space={2} alignItems="center">
          <Text fontSize="2xl" fontWeight="bold" color="gray.800">
            สมัครร้านค้าสำเร็จ!
          </Text>
          <Text fontSize="md" color="gray.600" textAlign="center">
            ยินดีต้อนรับสู่ระบบร้านค้า
          </Text>
        </VStack>

        {/* Info Cards */}
        <VStack space={3} w="100%">
          {/* Card 1: Store Setup */}
          <Box bg="purple.50" p={4} borderRadius="lg" borderWidth={1} borderColor="purple.200">
            <HStack space={3} alignItems="center">
              <Box bg="purple.100" p={2} borderRadius="full">
                <Ionicons name="storefront" size={20} color="#8b0ff8" />
              </Box>
              <VStack flex={1}>
                <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                  ร้านค้าของคุณพร้อมใช้งาน
                </Text>
                <Text fontSize="xs" color="gray.600">
                  เริ่มเพิ่มสินค้าและจัดการร้านได้ทันที
                </Text>
              </VStack>
            </HStack>
          </Box>

          {/* Card 2: Stripe Connected */}
          <Box bg="green.50" p={4} borderRadius="lg" borderWidth={1} borderColor="green.200">
            <HStack space={3} alignItems="center">
              <Box bg="green.100" p={2} borderRadius="full">
                <MaterialIcons name="account-balance" size={20} color="#059669" />
              </Box>
              <VStack flex={1}>
                <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                  เชื่อมต่อ Stripe สำเร็จ
                </Text>
                <Text fontSize="xs" color="gray.600">
                  พร้อมรับเงินจากการขายสินค้า
                </Text>
              </VStack>
            </HStack>
          </Box>

          {/* Card 3: Next Steps */}
          <Box bg="blue.50" p={4} borderRadius="lg" borderWidth={1} borderColor="blue.200">
            <HStack space={3} alignItems="flex-start">
              <Box bg="blue.100" p={2} borderRadius="full">
                <Ionicons name="information-circle" size={20} color="#3B82F6" />
              </Box>
              <VStack flex={1} space={1}>
                <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                  ขั้นตอนต่อไป
                </Text>
                <VStack space={1}>
                  <HStack space={2} alignItems="center">
                    <MaterialIcons name="fiber-manual-record" size={6} color="#6B7280" />
                    <Text fontSize="xs" color="gray.600">
                      เพิ่มสินค้าแรกของคุณ
                    </Text>
                  </HStack>
                  <HStack space={2} alignItems="center">
                    <MaterialIcons name="fiber-manual-record" size={6} color="#6B7280" />
                    <Text fontSize="xs" color="gray.600">
                      ตั้งค่าข้อมูลร้านค้า
                    </Text>
                  </HStack>
                  <HStack space={2} alignItems="center">
                    <MaterialIcons name="fiber-manual-record" size={6} color="#6B7280" />
                    <Text fontSize="xs" color="gray.600">
                      เริ่มรับออเดอร์แรก
                    </Text>
                  </HStack>
                </VStack>
              </VStack>
            </HStack>
          </Box>
        </VStack>

        {/* Action Buttons */}
        <VStack space={3} w="100%" mt={4}>
          <Button
            py={3}
            bg="#8b0ff8"
            _pressed={{ bg: "#7209d4" }}
            borderRadius="full"
            onPress={() => router.replace("/store/mystore")}
          >
            <HStack space={2} alignItems="center">
              <Ionicons name="storefront" size={18} color="white" />
              <Text fontSize="md" color="white" fontWeight="medium">
                ไปที่ร้านค้าของฉัน
              </Text>
            </HStack>
          </Button>

          <Button
            py={3}
            variant="outline"
            borderRadius="full"
            borderColor="#8b0ff8"
            onPress={() => router.replace("/store/add-product")}
          >
            <HStack space={2} alignItems="center">
              <Ionicons name="add-circle-outline" size={18} color="#8b0ff8" />
              <Text fontSize="md" color="#8b0ff8" fontWeight="medium">
                เพิ่มสินค้าแรก
              </Text>
            </HStack>
          </Button>
        </VStack>
      </VStack>
    </Box>
  );
}