// app/(seller)/orders.tsx
import {
  confirmOrderShipped,
  fetchSellerOrders,
  rejectOrder,
  SellerOrder,
} from "@/api/seller";
import { formatDateTimeTH } from "@/utils/datetime";
import { getToken } from "@/utils/secure-store";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  Box,
  Button,
  Center,
  HStack,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Select,
  Spinner,
  StatusBar,
  Text,
  useToast,
  VStack,
} from "native-base";
import React, { useCallback, useEffect, useState } from "react";
import { BackHandler, FlatList, RefreshControl, TextInput } from "react-native";

type TabType = "PREPARING" | "CANCELLED" | "SHIPPED" | "ALL";

const TABS: { key: TabType; label: string }[] = [
  { key: "PREPARING", label: "กำลังเตรียม" },
  { key: "CANCELLED", label: "ปฏิเสธ" },
  { key: "SHIPPED", label: "กำลังจัดส่ง" },
  { key: "ALL", label: "ทั้งหมด" },
];

const COURIERS = [
  { label: "Kerry Express", value: "KERRY" },
  { label: "Flash Express", value: "FLASH" },
  { label: "Thailand Post", value: "THAILAND_POST" },
  { label: "J&T Express", value: "JNT" },
  { label: "SCG Express", value: "SCG" },
];

export default function SellerOrdersScreen() {
  const router = useRouter();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<TabType>("PREPARING");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<SellerOrder[]>([]);

  // Modal for shipping confirmation
  const [showShipModal, setShowShipModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SellerOrder | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [courierName, setCourierName] = useState("KERRY");
  const [submitting, setSubmitting] = useState(false);
  // Modal for reject
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const { from } = useLocalSearchParams<{ from?: string }>();

  useEffect(() => {
    const backAction = () => {
      if (from === "notification_seller") {
        router.navigate({
          pathname: "/(tabs)/notification",
          params: { initialTab: "seller" },
        } as any);
      } else {
        router.back();
      }
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );

    return () => backHandler.remove();
  }, [from]);

  useEffect(() => {
    loadOrders();
  }, [activeTab]);

  const loadOrders = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      const token = await getToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      let data: SellerOrder[];

      if (activeTab === "SHIPPED") {
        const [shipped, delivered] = await Promise.all([
          fetchSellerOrders(token, "SHIPPED"),
          fetchSellerOrders(token, "DELIVERED"),
        ]);
        data = [...shipped, ...delivered].sort(
          (a, b) =>
            new Date(b.paid_at ?? 0).getTime() -
            new Date(a.paid_at ?? 0).getTime(),
        );
      } else {
        const status = activeTab === "ALL" ? undefined : activeTab;
        data = await fetchSellerOrders(token, status);
      }

      console.log("[SellerOrdersScreen] loaded orders:", data);
      setOrders(data);
    } catch (error) {
      console.error("Error loading orders:", error);
      toast.show({
        description: "ไม่สามารถโหลดข้อมูลได้",
        duration: 2000,
        bg: "red.500",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrders(false);
  }, [activeTab]);

  const handleShipOrder = (order: SellerOrder) => {
    setSelectedOrder(order);
    setTrackingNumber("");
    setCourierName("KERRY");
    setShowShipModal(true);
  };

  const confirmShipment = async () => {
    if (!selectedOrder) return;
    if (!trackingNumber.trim()) {
      toast.show({
        description: "กรุณากรอกหมายเลข Tracking",
        duration: 2000,
        bg: "orange.500",
      });
      return;
    }

    try {
      setSubmitting(true);
      const token = await getToken();
      if (!token) return;

      const courierLabel =
        COURIERS.find((c) => c.value === courierName)?.label || courierName;

      await confirmOrderShipped(
        token,
        selectedOrder.order_id,
        trackingNumber,
        courierLabel,
      );

      toast.show({
        description: "ยืนยันการจัดส่งสำเร็จ",
        duration: 2000,
        bg: "green.500",
      });

      setShowShipModal(false);
      loadOrders(false);
    } catch (error) {
      toast.show({
        description: "เกิดข้อผิดพลาด กรุณาลองใหม่",
        duration: 2000,
        bg: "red.500",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectOrder = (order: SellerOrder) => {
    setSelectedOrder(order);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!selectedOrder) return;
    if (!rejectReason.trim()) {
      toast.show({
        description: "กรุณาระบุเหตุผล",
        duration: 2000,
        bg: "orange.500",
      });
      return;
    }

    try {
      setRejecting(true);
      const token = await getToken();
      if (!token) return;

      await rejectOrder(token, selectedOrder.order_id, rejectReason);

      toast.show({
        description: "ปฏิเสธออเดอร์สำเร็จ",
        duration: 2000,
        bg: "green.500",
      });

      setShowRejectModal(false);
      loadOrders(false);
    } catch (error) {
      toast.show({
        description: "เกิดข้อผิดพลาด กรุณาลองใหม่",
        duration: 2000,
        bg: "red.500",
      });
    } finally {
      setRejecting(false);
    }
  };

  const renderOrderCard = ({ item }: { item: SellerOrder }) => (
    <Box bg="white" rounded="lg" p={4} mb={3} shadow={1}>
      {/* Header */}
      <HStack justifyContent="space-between" alignItems="center" mb={3}>
        <VStack flex={1}>
          {/* <Text fontSize="xs" color="gray.500">
            Order ID: {item.order_id.substring(0, 8)}...
          </Text> */}
          <Text fontSize="sm" fontWeight="bold" color="gray.800">
            {item.customer_name}
          </Text>
        </VStack>
        <Box
          bg={
            item.order_status === "PREPARING"
              ? "orange.100"
              : item.order_status === "SHIPPED"
                ? "blue.100"
                : "green.100"
          }
          px={3}
          py={1}
          rounded="full"
        >
          <Text
            fontSize="xs"
            fontWeight="bold"
            color={
              item.order_status === "PREPARING"
                ? "orange.600"
                : item.order_status === "SHIPPED"
                  ? "blue.600"
                  : "green.600"
            }
          >
            {item.order_text_status}
          </Text>
        </Box>
      </HStack>

      {/* Time Info */}
      <Box bg="coolGray.50" p={3} rounded="md" mt={2} mb={3}>
        <VStack space={1}>
          <HStack justifyContent="space-between">
            <Text fontSize="xs" color="gray.600">
              ชำระเงิน
            </Text>
            <Text fontSize="xs" fontWeight="medium">
              {formatDateTimeTH(item.paid_at)}
            </Text>
          </HStack>

          <HStack justifyContent="space-between">
            <Text fontSize="xs" color="gray.600">
              จัดส่งสำเร็จ
            </Text>
            <Text fontSize="xs" fontWeight="medium">
              {formatDateTimeTH(item.delivered_at)}
            </Text>
          </HStack>

          <HStack justifyContent="space-between">
            <Text fontSize="xs" color="gray.600">
              ลูกค้ายืนยันรับ
            </Text>
            <Text fontSize="xs" fontWeight="medium">
              {formatDateTimeTH(item.completed_at)}
            </Text>
          </HStack>
        </VStack>
      </Box>

      {/* Items */}
      {item.order_items.map((orderItem) => (
        <HStack key={orderItem.order_item_id} space={3} mb={2}>
          <Image
            source={{
              uri: orderItem.image_url || "https://via.placeholder.com/60",
            }}
            alt={orderItem.product_name}
            size="60px"
            rounded="md"
          />
          <VStack flex={1}>
            <Text fontSize="sm" color="gray.800" numberOfLines={2}>
              {orderItem.product_name}
            </Text>
            <Text fontSize="xs" color="gray.500">
              {orderItem.variant_name}
            </Text>
            <Text fontSize="xs" color="gray.500">
              ฿{orderItem.unit_price.toLocaleString()} x {orderItem.quantity}
            </Text>
          </VStack>
        </HStack>
      ))}

      {/* Shipping Address */}
      {item.shipping_address && (
        <Box bg="coolGray.50" p={3} rounded="md" mt={2} mb={3}>
          <HStack space={2} alignItems="flex-start">
            <Ionicons name="location" size={16} color="#6b7280" />
            <VStack flex={1}>
              <Text fontSize="xs" fontWeight="bold" color="gray.700">
                ที่อยู่จัดส่ง
              </Text>
              <Text fontSize="xs" color="gray.600">
                {item.shipping_address.full_name} -{" "}
                {item.shipping_address.phone_number}
              </Text>
              <Text fontSize="xs" color="gray.600">
                {item.shipping_address.address_line},{" "}
                {item.shipping_address.sub_district},{" "}
                {item.shipping_address.district},{" "}
                {item.shipping_address.province}{" "}
                {item.shipping_address.postal_code}
              </Text>
            </VStack>
          </HStack>
        </Box>
      )}

      {/* Tracking Info */}
      {item.tracking_number && (
        <Box bg="blue.50" p={2} rounded="md" mb={3}>
          <Text fontSize="xs" color="blue.700">
            <Text fontWeight="bold">Tracking: </Text>
            {item.tracking_number} ({item.courier_name})
          </Text>
        </Box>
      )}

      {/* Footer */}

      <HStack
        justifyContent="space-between"
        alignItems="center"
        pt={2}
        borderTopWidth={1}
        borderTopColor="coolGray.200"
      >
        <Text fontSize="md" fontWeight="bold" color="violet.600">
          ฿{item.total_price.toLocaleString()}
        </Text>

        {item.order_status === "PREPARING" && (
          <HStack space={2}>
            <Button
              size="sm"
              bg="red.500"
              _pressed={{ bg: "red.600" }}
              onPress={() => handleRejectOrder(item)}
              leftIcon={
                <Ionicons name="close-circle" size={16} color="white" />
              }
            >
              ปฏิเสธ
            </Button>
            <Button
              size="sm"
              bg="violet.600"
              _pressed={{ bg: "violet.700" }}
              onPress={() => handleShipOrder(item)}
              leftIcon={<Ionicons name="send" size={16} color="white" />}
            >
              จัดส่งสินค้า
            </Button>
          </HStack>
        )}
      </HStack>
    </Box>
  );

  return (
    <Box flex={1} bg="coolGray.50">
      <StatusBar backgroundColor="#7c3aed" barStyle="light-content" />
      <Box safeAreaTop bg="violet.600" />

      {/* Header */}
      <Box bg="violet.600" px={4} py={3}>
        <HStack alignItems="center" space={3}>
          <Pressable
            onPress={() => {
              if (from === "notification_seller") {
                router.navigate({
                  pathname: "/(tabs)/notification",
                  params: { initialTab: "seller" },
                } as any);
              } else {
                router.back();
              }
            }}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <Text fontSize="lg" fontWeight="bold" color="white">
            การสั่งซื้อ
          </Text>
        </HStack>
      </Box>

      {/* Tabs */}
      <Box bg="white" borderBottomWidth={1} borderBottomColor="coolGray.200">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <HStack>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  px={4}
                  py={3}
                  borderBottomWidth={2}
                  borderBottomColor={isActive ? "violet.600" : "transparent"}
                >
                  <Text
                    fontSize="sm"
                    fontWeight={isActive ? "bold" : "normal"}
                    color={isActive ? "violet.600" : "gray.500"}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </HStack>
        </ScrollView>
      </Box>

      {/* Content */}
      {loading ? (
        <Center flex={1}>
          <Spinner size="lg" color="violet.600" />
        </Center>
      ) : orders.length === 0 ? (
        <Center flex={1}>
          <Ionicons name="receipt-outline" size={64} color="#d1d5db" />
          <Text mt={4} color="gray.500">
            ไม่มีออเดอร์
          </Text>
        </Center>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.order_id}
          renderItem={renderOrderCard}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#7c3aed"]}
            />
          }
        />
      )}

      {/* Shipping Modal */}
      <Modal isOpen={showShipModal} onClose={() => setShowShipModal(false)}>
        <Modal.Content maxWidth="400px">
          {submitting && (
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              bg="rgba(0,0,0,0.35)"
              zIndex={999}
              justifyContent="center"
              alignItems="center"
              borderRadius={8}
            >
              <Spinner size="lg" color="white" />
            </Box>
          )}
          <Modal.CloseButton />
          <Modal.Header>ยืนยันการจัดส่ง</Modal.Header>
          <Modal.Body>
            <VStack space={4}>
              <Text fontSize="sm" color="gray.600">
                Order ID: {selectedOrder?.order_id.substring(0, 12)}...
              </Text>

              <VStack space={2}>
                <Text fontSize="sm" fontWeight="bold">
                  เลือกขนส่ง
                </Text>
                <Select
                  selectedValue={courierName}
                  onValueChange={setCourierName}
                  placeholder="เลือกขนส่ง"
                >
                  {COURIERS.map((courier) => (
                    <Select.Item
                      key={courier.value}
                      label={courier.label}
                      value={courier.value}
                    />
                  ))}
                </Select>
              </VStack>

              <VStack space={2}>
                <Text fontSize="sm" fontWeight="bold">
                  หมายเลข Tracking
                </Text>
                <TextInput
                  placeholder="เช่น TH123456789"
                  value={trackingNumber}
                  onChangeText={setTrackingNumber}
                  autoCapitalize="characters"
                  style={{
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    borderRadius: 6,
                    padding: 10,
                    fontSize: 14,
                  }}
                />
              </VStack>
            </VStack>
          </Modal.Body>
          <Modal.Footer>
            <Button.Group space={2}>
              <Button
                variant="ghost"
                colorScheme="blueGray"
                onPress={() => setShowShipModal(false)}
              >
                ยกเลิก
              </Button>
              <Button
                bg="violet.600"
                _pressed={{ bg: "violet.700" }}
                onPress={confirmShipment}
                isLoading={submitting}
                isLoadingText="กำลังบันทึก..."
              >
                ยืนยัน
              </Button>
            </Button.Group>
          </Modal.Footer>
        </Modal.Content>
      </Modal>
      {/* Reject Modal */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)}>
        <Modal.Content maxWidth="400px">
          {rejecting && (
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              bg="rgba(0,0,0,0.35)"
              zIndex={999}
              justifyContent="center"
              alignItems="center"
              borderRadius={8}
            >
              <Spinner size="lg" color="white" />
            </Box>
          )}
          <Modal.CloseButton />
          <Modal.Header>ปฏิเสธคำสั่งซื้อ</Modal.Header>
          <Modal.Body>
            <VStack space={4}>
              <Text fontSize="sm" color="gray.600">
                Order ID: {selectedOrder?.order_id.substring(0, 12)}...
              </Text>
              <Text fontSize="sm" color="red.500">
                ⚠️ การปฏิเสธจะคืนเงินให้ลูกค้าอัตโนมัติ
              </Text>
              <VStack space={2}>
                <Text fontSize="sm" fontWeight="bold">
                  เหตุผลในการปฏิเสธ *
                </Text>
                <TextInput
                  placeholder="เช่น สินค้าหมด, ไม่สามารถจัดส่งได้"
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  multiline
                  numberOfLines={3}
                  style={{
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    borderRadius: 6,
                    padding: 10,
                    fontSize: 14,
                    textAlignVertical: "top",
                    minHeight: 80,
                  }}
                />
              </VStack>
            </VStack>
          </Modal.Body>
          <Modal.Footer>
            <Button.Group space={2}>
              <Button
                variant="ghost"
                colorScheme="blueGray"
                onPress={() => setShowRejectModal(false)}
              >
                ยกเลิก
              </Button>
              <Button
                bg="red.500"
                _pressed={{ bg: "red.600" }}
                onPress={confirmReject}
                isLoading={rejecting}
                isLoadingText="กำลังดำเนินการ..."
              >
                ยืนยันปฏิเสธ
              </Button>
            </Button.Group>
          </Modal.Footer>
        </Modal.Content>
      </Modal>
    </Box>
  );
}
