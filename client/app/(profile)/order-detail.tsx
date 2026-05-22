// app/(profile)/order-detail.tsx
import {
  confirmOrderReceived,
  fetchOrderDetail,
  Order,
  OrderItem,
  reorderItems,
} from "@/api/order";
import { Colors } from "@/constants/theme";
import { formatDateTimeTH } from "@/utils/datetime";
import { getToken } from "@/utils/secure-store";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Badge,
  Box,
  Button,
  Center,
  Divider,
  HStack,
  Image,
  Pressable,
  ScrollView,
  Spinner,
  Text,
  useToast,
  VStack,
} from "native-base";
import React, { useEffect, useState } from "react";
import { BackHandler, useColorScheme } from "react-native";

function OrderItemDetailRow({
  item,
  storeId,
  storeName,
  router,
}: {
  item: OrderItem;
  storeId: string;
  storeName: string;
  router: any;
}) {
  return (
    <HStack
      space={3}
      py={3}
      borderBottomWidth={1}
      borderBottomColor="coolGray.100"
    >
      <Box
        width="80px"
        height="80px"
        bg="coolGray.100"
        borderRadius={8}
        overflow="hidden"
      >
        {item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            alt={item.product_name}
            width="100%"
            height="100%"
            resizeMode="cover"
          />
        ) : (
          <Center width="100%" height="100%">
            <Ionicons name="image-outline" size={32} color="#9ca3af" />
          </Center>
        )}
      </Box>

      <VStack flex={1} justifyContent="space-between">
        <Text fontSize="sm" fontWeight="medium" numberOfLines={2}>
          {item.product_name}
        </Text>
        <Text fontSize="xs" color="gray.500">
          {item.variant_name}
        </Text>
        <HStack justifyContent="space-between" alignItems="center">
          <Text fontSize="sm" color="violet.600" fontWeight="bold">
            ฿{item.unit_price.toFixed(0)}
          </Text>
          <Text fontSize="xs" color="gray.500">
            x {item.quantity}
          </Text>
        </HStack>

      </VStack>
    </HStack>
  );
}

function getStatusBadgeColor(status: string): string {
  switch (status) {
    case "UNPAID":
      return "error";
    case "PENDING":
      return "warning";
    case "SHIPPED":
      return "info";
    case "DELIVERED":
      return "success";
    case "RECEIVED":
      return "success";
    case "RETURNING":
      return "muted";
    case "FAILED":
      return "error";
    default:
      return "gray";
  }
}

export default function OrderDetailScreen() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? "light"];
  const router = useRouter();
  const toast = useToast();
  const { orderId, from } = useLocalSearchParams<{ 
  orderId: string;
  from?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
  const backAction = () => {
    if (from === "notification") {
      router.navigate("/(tabs)/notification" as any);
    } else {
      router.back(); // ← กลับไป orders ปกติ
    }
    return true;
  };

  const backHandler = BackHandler.addEventListener(
    "hardwareBackPress",
    backAction,
  );

  return () => backHandler.remove();
}, [from]);

  // ----------------
  // Load order detail
  // ----------------
  useEffect(() => {
    const loadOrderDetail = async () => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token || !orderId) {
          router.replace("/login");
          return;
        }

        const data = await fetchOrderDetail(token, orderId);
        setOrder(data);
      } catch (error) {
        console.error("Error loading order detail:", error);
        toast.show({
          description: "ไม่สามารถโหลดข้อมูลได้",
          duration: 2000,
          bg: "red.500",
        });
      } finally {
        setLoading(false);
      }
    };

    loadOrderDetail();
  }, [orderId, router, toast]);

  // ----------------
  // Handle confirm received
  // ----------------
  const handleConfirmReceived = async () => {
    if (!order) return;

    try {
      setActionLoading(true);
      const token = await getToken();
      if (!token) return;

      const result = await confirmOrderReceived(token, order.order_id);

      toast.show({
        description: result.message,
        duration: 2000,
        bg: "green.500",
      });

      setOrder(result.order);
    } catch (error) {
      console.error("Error confirming order:", error);
      toast.show({
        description: "เกิดข้อผิดพลาด กรุณาลองใหม่",
        duration: 2000,
        bg: "red.500",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // ----------------
  // Handle reorder
  // ----------------
  const handleReorder = async () => {
    if (!order) return;

    try {
      setActionLoading(true);
      const token = await getToken();
      if (!token) return;

      const result = await reorderItems(token, order.order_id);

      toast.show({
        description: result.message,
        duration: 2000,
        bg: "green.500",
      });

      router.push("/(cart)/cart");
    } catch (error) {
      console.error("Error reordering:", error);
      toast.show({
        description: "เกิดข้อผิดพลาด กรุณาลองใหม่",
        duration: 2000,
        bg: "red.500",
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Box flex={1} bg="coolGray.50">
        <Center flex={1}>
          <Spinner size="lg" color="violet.600" />
        </Center>
      </Box>
    );
  }

  if (!order) {
    return (
      <Box flex={1} bg="coolGray.50">
        <Center flex={1}>
          <Text>ไม่พบข้อมูลคำสั่งซื้อ</Text>
        </Center>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="coolGray.50">
      <Box safeAreaTop bg="violet.600" />

      {/* Header */}
      <Box bg="violet.600" px={4} py={3}>
        <HStack alignItems="center" space={3}>
          <Pressable
            onPress={() => {
              if (from === "notification") {
                router.navigate("/(tabs)/notification" as any);
              } else {
                router.back();
              }
            }}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <Text fontSize="lg" fontWeight="bold" color="white">
            รายละเอียดคำสั่งซื้อ
          </Text>
        </HStack>
      </Box>

      <ScrollView>
        {/* Status Section */}
        <Box bg="white" p={4} mb={2}>
          <HStack justifyContent="space-between" alignItems="center">
            <VStack>
              <Text fontSize="xs" color="gray.500">
                สถานะ
              </Text>
              <Text fontSize="md" fontWeight="bold" mt={1}>
                {order.order_text_status}
              </Text>
            </VStack>
            <Badge
              colorScheme={getStatusBadgeColor(order.order_status)}
              variant="subtle"
              rounded="md"
            >
              {order.order_status}
            </Badge>
          </HStack>
        </Box>

        {/* Store Info */}
        <Box bg="white" p={4} mb={2}>
          <HStack alignItems="center" justifyContent="space-between">
            <HStack alignItems="center" space={2}>
              <Ionicons name="storefront-outline" size={20} color="#7c3aed" />
              <Text fontSize="md" fontWeight="bold">
                {order.store_name}
              </Text>
            </HStack>

            {/* ✅ เพิ่มส่วนนี้ - ปุ่มดูร้านค้า */}
            <Pressable
              onPress={() =>
                router.push(
                  `/(home)/store-detail?storeId=${order.store_id}` as any,
                )
              }
            >
              <HStack
                space={1}
                alignItems="center"
                px={3}
                py={1.5}
                borderRadius={20}
                borderWidth={1}
                borderColor="violet.600"
              >
                <Text fontSize="xs" color="violet.600" fontWeight="medium">
                  ดูร้านค้า
                </Text>
                <Ionicons name="chevron-forward" size={14} color="#7c3aed" />
              </HStack>
            </Pressable>
            {/* จบส่วนที่เพิ่ม */}
          </HStack>
        </Box>

        {/* Tracking Info */}
        {order.tracking_number && (
          <Box bg="white" p={4} mb={2}>
            <VStack space={2}>
              <Text fontSize="sm" fontWeight="bold">
                ข้อมูลการจัดส่ง
              </Text>
              <HStack justifyContent="space-between">
                <Text fontSize="xs" color="gray.600">
                  เลขพัสดุ
                </Text>
                <Text fontSize="xs" fontWeight="medium">
                  {order.tracking_number}
                </Text>
              </HStack>
              {order.courier_name && (
                <HStack justifyContent="space-between">
                  <Text fontSize="xs" color="gray.600">
                    ขนส่ง
                  </Text>
                  <Text fontSize="xs" fontWeight="medium">
                    {order.courier_name}
                  </Text>
                </HStack>
              )}
            </VStack>
          </Box>
        )}

        {/* Time Section */}
        <Box bg="white" p={4} mb={2}>
          <Text fontSize="sm" fontWeight="bold" mb={2}>
            ข้อมูลเวลา
          </Text>

          <VStack space={2}>
            <HStack justifyContent="space-between">
              <Text fontSize="xs" color="gray.600">
                ชำระเงิน
              </Text>
              <Text fontSize="xs" fontWeight="medium">
                {formatDateTimeTH(order.paid_at)}
              </Text>
            </HStack>

            <HStack justifyContent="space-between">
              <Text fontSize="xs" color="gray.600">
                จัดส่งสำเร็จ
              </Text>
              <Text fontSize="xs" fontWeight="medium">
                {formatDateTimeTH(order.delivered_at)}
              </Text>
            </HStack>

            <HStack justifyContent="space-between">
              <Text fontSize="xs" color="gray.600">
                ยืนยันรับสินค้า
              </Text>
              <Text fontSize="xs" fontWeight="medium">
                {formatDateTimeTH(order.completed_at)}
              </Text>
            </HStack>
          </VStack>
        </Box>

        {/* Order Items */}
        <Box bg="white" p={4} mb={2}>
          <Text fontSize="sm" fontWeight="bold" mb={2}>
            รายการสินค้า
          </Text>
          {order.order_items.map((item) => (
            <OrderItemDetailRow
              key={item.order_item_id}
              item={item}
              storeId={order.store_id || ""}
              storeName={order.store_name}
              router={router}
            />
          ))}
        </Box>

        {/* Price Summary */}
        <Box bg="white" p={4} mb={2}>
          <VStack space={2}>
            <HStack justifyContent="space-between">
              <Text fontSize="sm" color="gray.600">
                ยอดรวมสินค้า
              </Text>
              <Text fontSize="sm">
                ฿{(order.total_price - order.shipping_cost).toFixed(0)}
              </Text>
            </HStack>
            <HStack justifyContent="space-between">
              <Text fontSize="sm" color="gray.600">
                ค่าจัดส่ง
              </Text>
              <Text fontSize="sm">฿{order.shipping_cost.toFixed(0)}</Text>
            </HStack>
            <Divider />
            <HStack justifyContent="space-between">
              <Text fontSize="md" fontWeight="bold">
                ยอดรวมทั้งหมด
              </Text>
              <Text fontSize="lg" fontWeight="bold" color="violet.600">
                ฿{order.total_price.toFixed(0)}
              </Text>
            </HStack>
          </VStack>
        </Box>

        {/* Action Buttons */}
        <Box bg="white" p={4} mb={4}>
          <VStack space={3}>
            {/* ✅ ปุ่ม ได้รับสินค้าแล้ว เฉพาะตอน “จัดส่งสำเร็จ” */}
            {order.order_status === "DELIVERED" &&
              order.can_confirm_received && (
                <Button
                  colorScheme="violet"
                  onPress={handleConfirmReceived}
                  isLoading={actionLoading}
                  isLoadingText="กำลังยืนยัน..."
                >
                  ได้รับสินค้าแล้ว
                </Button>
              )}

            {/* ✅ ซื้ออีกครั้ง + ให้คะแนน เฉพาะตอน “รับสินค้าแล้ว” */}
            {order.order_status === "COMPLETED" && (
              <HStack space={3}>
                <Button
                  flex={1}
                  variant="outline"
                  colorScheme="violet"
                  onPress={handleReorder}
                  isLoading={actionLoading}
                >
                  ซื้ออีกครั้ง
                </Button>

                {order.can_review && (
                  <Button
                    flex={1}
                    colorScheme="violet"
                    onPress={() => {
                      const firstProduct = order.order_items[0];
                      if (firstProduct) {
                        router.push(
                          `/(home)/review-detail?productId=${firstProduct.product_id}&orderId=${order.order_id}` as any,
                        );
                      }
                    }}
                  >
                    ให้คะแนน
                  </Button>
                )}
              </HStack>
            )}
          </VStack>
        </Box>
      </ScrollView>
    </Box>
  );
}
