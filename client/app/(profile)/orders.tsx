// app/(profile)/orders.tsx
import {
  confirmOrderReceived,
  fetchUserOrders,
  Order,
  OrderStatus,
  reorderItems,
} from "@/api/order";
import { OrderCard } from "@/components/order/order-card";
import { OrderEmptyState } from "@/components/order/order-empty-state";
import { Colors } from "@/constants/theme";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { getToken } from "@/utils/secure-store";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Box,
  Center,
  HStack,
  Pressable,
  ScrollView,
  Spinner,
  StatusBar,
  Text,
  useToast,
} from "native-base";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  RefreshControl,
  useColorScheme,
} from "react-native";

type TabType =
  | "ALL"
  | "UNPAID"
  | "PREPARING"
  | "SHIPPED"
  | "DELIVERED"
  | "RETURNING"
  | "CANCELLED";

const TABS: { key: TabType; label: string; statuses?: OrderStatus[] }[] = [
  { key: "ALL", label: "ทั้งหมด" },
  { key: "UNPAID", label: "รอชำระเงิน", statuses: ["UNPAID"] },
  { key: "PREPARING", label: "กำลังเตรียม", statuses: ["PREPARING", "PAID"] },
  { key: "SHIPPED", label: "กำลังจัดส่ง", statuses: ["SHIPPED"] },
  {
    key: "DELIVERED",
    label: "จัดส่งสำเร็จ",
    statuses: ["DELIVERED", "COMPLETED"],
  },
  {
    key: "RETURNING",
    label: "การคืนสินค้า",
    statuses: ["RETURNING", "APPROVED", "REJECTED", "RETURNED"],
  },
  { key: "CANCELLED", label: "ยกเลิก", statuses: ["CANCELLED"] },
];

export default function OrdersScreen() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? "light"];
  const router = useRouter();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<TabType>("ALL");
  const [reviewedMap, setReviewedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const backAction = () => {
      router.navigate("/(tabs)/profile" as any);
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );
    return () => backHandler.remove();
  }, []);

  const fetchFn = useCallback(
    async (skip: number, limit: number) => {
      const token = await getToken();
      if (!token) return [];

      const selectedTab = TABS.find((t) => t.key === activeTab);
      const statuses = activeTab === "ALL" ? undefined : selectedTab?.statuses;
    //       console.log("📦 [fetchFn] activeTab:", activeTab);
    // console.log("📦 [fetchFn] statuses:", statuses);
    // console.log("📦 [fetchFn] skip:", skip, "limit:", limit);

      const res = await fetchUserOrders(token, statuses, skip, limit);
    //       console.log("📦 [fetchFn] orders returned:", res?.orders?.length);
    // console.log("📦 [fetchFn] orders:", JSON.stringify(res?.orders, null, 2));
      return res?.orders || [];
    },
    [activeTab],
  );

  const {
    data: orders,
    setData: setOrders,
    loading,
    loadingMore,
    refreshing,
    load,
    loadMore,
    refresh,
  } = usePaginatedList<Order>(fetchFn, 10);

  useEffect(() => {
    load();
  }, [activeTab]);

  const handleStatusChange = (orderId: string, newStatus: string) => {
    setOrders((prev) =>
      prev.map((o): Order => {
        if (o.order_id !== orderId) return o;
        const status = newStatus as OrderStatus;
        return {
          ...o,
          order_status: status,
          can_confirm_received: status === "DELIVERED",
          can_return: status === "DELIVERED",
          can_review: status === "COMPLETED",
        };
      }),
    );
  };


  const handleReorder = async (orderId: string) => {
    try {
      const token = await getToken();
      if (!token) return;
      const result = await reorderItems(token, orderId);
      toast.show({
        description: result.message || "เพิ่มสินค้าเข้าตะกร้าสำเร็จ",
        duration: 2000,
        bg: "green.500",
      });
      router.push("/(cart)/cart");
    } catch (error: any) {
      toast.show({
        description: error.response?.data?.detail || "เกิดข้อผิดพลาด",
        duration: 3000,
        bg: "red.500",
      });
    }
  };

  const handleReturn = (orderId: string) => {
    router.push(`/(profile)/return-order?orderId=${orderId}` as any);
  };

  const handleReview = (
    orderId: string,
    productId: string,
    variantId: string,
  ) => {
    router.push({
      pathname: "/(home)/review-detail",
      params: { productId, orderId, variantId, action: "write" },
    } as any);
  };

  const renderTabButton = (tab: (typeof TABS)[0]) => {
    const isActive = activeTab === tab.key;
    return (
      <Pressable
        key={tab.key}
        onPress={() => setActiveTab(tab.key)}
        px={4}
        py={2}
        borderBottomWidth={2}
        borderBottomColor={isActive ? "violet.600" : "transparent"}
      >
        <Text
          fontSize="xs"
          fontWeight={isActive ? "bold" : "normal"}
          color={isActive ? "violet.600" : "gray.500"}
          numberOfLines={1}
        >
          {tab.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <Box flex={1} bg="coolGray.50">
      <StatusBar backgroundColor="#7c3aed" barStyle="light-content" />
      <Box safeAreaTop bg="violet.600" />

      <Box bg="violet.600" px={4} py={3}>
        <HStack alignItems="center" space={3}>
          <Pressable onPress={() => router.navigate("/(tabs)/profile" as any)}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <Text fontSize="lg" fontWeight="bold" color="white">
            การซื้อของฉัน
          </Text>
        </HStack>
      </Box>

      <Box bg="white" borderBottomWidth={1} borderBottomColor="coolGray.200">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <HStack>{TABS.map(renderTabButton)}</HStack>
        </ScrollView>
      </Box>

      {loading ? (
        <Center flex={1}>
          <Spinner size="lg" color="violet.600" />
          <Text mt={2} color="gray.500">
            กำลังโหลด...
          </Text>
        </Center>
      ) : orders.length === 0 ? (
        <OrderEmptyState
          message={`ยังไม่มีรายการในหมวด${TABS.find((t) => t.key === activeTab)?.label}`}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.order_id}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onReorder={handleReorder}
              onReview={handleReview}
              onReturn={handleReturn}
              reviewedMap={reviewedMap}
              onStatusChange={handleStatusChange}
            />
          )}
          contentContainerStyle={{ padding: 16 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              colors={["#7c3aed"]}
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                color="#7c3aed"
                style={{ marginVertical: 16 }}
              />
            ) : null
          }
        />
      )}
    </Box>
  );
}
