// app/(seller)/dashboard.tsx
import { DashboardData, fetchSellerDashboard } from "@/api/seller";
import { getToken } from "@/utils/secure-store";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Box,
  Center,
  HStack,
  Image,
  Pressable,
  ScrollView,
  Select,
  Spinner,
  StatusBar,
  Text,
  VStack,
} from "native-base";
import React, { useEffect, useState } from "react";
import { BackHandler, Dimensions } from "react-native";
import { BarChart } from "react-native-chart-kit";

const { width } = Dimensions.get("window");

export default function SellerDashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState("2025-01");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  useEffect(() => {
  const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
    router.back();
    return true;
  });
  return () => backHandler.remove();
}, []);

  useEffect(() => {
    loadDashboard();
  }, [selectedMonth]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      console.log("[Dashboard] fetching month:", selectedMonth); // ← เพิ่ม
      const data = await fetchSellerDashboard(token, selectedMonth);
      console.log("[Dashboard] data:", data); // ← เพิ่ม
      setDashboard(data);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderStatCard = (
    title: string,
    value: number,
    change: number,
    color: string,
  ) => (
    <Box flex={1} bg="white" rounded="lg" p={4} shadow={1}>
      <Text fontSize="xs" color="gray.500" mb={1}>
        {title}
      </Text>
      <Text fontSize="xl" fontWeight="bold" color={color}>
        ฿{value.toLocaleString()}
      </Text>
      <HStack alignItems="center" space={1} mt={1}>
        {/* <Ionicons
          name={change >= 0 ? "trending-up" : "trending-down"}
          size={14}
          color={change >= 0 ? "#10b981" : "#ef4444"}
        />
        <Text
          fontSize="xs"
          color={change >= 0 ? "green.600" : "red.600"}
          fontWeight="bold"
        >
          {change >= 0 ? "+" : ""}
          {change.toFixed(1)}%
        </Text> */}
      </HStack>
    </Box>
  );

  const screenWidth = Dimensions.get("window").width;

  const renderSalesChart = () => {
    if (!dashboard) return null;

    const data = {
      labels: dashboard.sales_chart.map((d) => d.date),
      datasets: [{ data: dashboard.sales_chart.map((d) => d.sales) }],
    };

    return (
      <Box bg="white" rounded="lg" p={4} shadow={1} mb={4}>
        <Text fontSize="md" fontWeight="bold" color="gray.800" mb={4}>
          ยอดขายรายวัน (7 วันล่าสุด)
        </Text>
        <BarChart
          data={data}
          width={screenWidth - 64}
          height={200}
          yAxisLabel="฿"
          yAxisSuffix=""
          chartConfig={{
            backgroundColor: "#ffffff",
            backgroundGradientFrom: "#ffffff",
            backgroundGradientTo: "#ffffff",
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(124, 58, 237, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
            style: { borderRadius: 8 },
          }}
          style={{ borderRadius: 8 }}
          showValuesOnTopOfBars
        />
      </Box>
    );
  };

  const renderTopProducts = () => {
    if (!dashboard) return null;

    const filteredProducts =
      selectedCategory === "ALL"
        ? dashboard.top_products
        : dashboard.top_products.filter((p) => p.category === selectedCategory);

    // Get unique categories
    const categories = [
      "ALL",
      ...Array.from(new Set(dashboard.top_products.map((p) => p.category))),
    ];

    return (
      <Box bg="white" rounded="lg" p={4} shadow={1} mb={4}>
        <HStack justifyContent="space-between" alignItems="center" mb={4}>
          <Text fontSize="md" fontWeight="bold" color="gray.800">
            สินค้าขายดี
          </Text>
          <Select
            selectedValue={selectedCategory}
            onValueChange={setSelectedCategory}
            w="140px"
            h="35px"
            fontSize="xs"
          >
            {categories.map((cat) => (
              <Select.Item
                key={cat}
                label={cat === "ALL" ? "ทั้งหมด" : cat}
                value={cat}
              />
            ))}
          </Select>
        </HStack>

        {filteredProducts.map((product, index) => {
          // ✅ ดักค่ารูปภาพว่างเปล่า ถ้าว่างให้ใช้รูปรอง (Placeholder)
          const validImageUrl =
            product.image_url && product.image_url.trim() !== ""
              ? product.image_url
              : "https://via.placeholder.com/150?text=No+Image";

          return (
            // ✅ เปลี่ยน Key ให้ผสม Index ป้องกันปัญหา Key ซ้ำหรือเป็น Null
            <HStack
              key={`${product.product_id || "product"}-${index}`}
              space={3}
              mb={3}
              alignItems="center"
            >
              {/* Rank */}
              <Center
                w="30px"
                h="30px"
                bg={
                  index === 0
                    ? "yellow.400"
                    : index === 1
                      ? "gray.400"
                      : "orange.400"
                }
                rounded="full"
              >
                <Text fontSize="xs" fontWeight="bold" color="white">
                  {index + 1}
                </Text>
              </Center>

              {/* Image */}
              <Image
                source={{ uri: validImageUrl }}
                alt={product.product_name || "Product Image"}
                size="50px"
                rounded="md"
              />

              {/* Info */}
              <VStack flex={1}>
                <Text fontSize="sm" color="gray.800" numberOfLines={1}>
                  {product.product_name}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  ขายแล้ว {product.sold_count} ชิ้น
                </Text>
              </VStack>

              {/* Revenue */}
              <VStack alignItems="flex-end">
                <Text fontSize="sm" fontWeight="bold" color="violet.600">
                  ฿{(product.revenue / 1000).toFixed(1)}K
                </Text>
              </VStack>
            </HStack>
          );
        })}
      </Box>
    );
  };

  const renderOrderStatusCount = () => {
    if (!dashboard) return null;

    const statuses = [
      {
        label: "กำลังเตรียม",
        count: dashboard.order_status_count.preparing,
        color: "#f59e0b",
      },
      {
        label: "จัดส่งแล้ว",
        count: dashboard.order_status_count.shipped,
        color: "#3b82f6",
      },
      {
        label: "สำเร็จ",
        count: dashboard.order_status_count.completed,
        color: "#10b981",
      },
    ];

    return (
      <Box bg="white" rounded="lg" p={4} shadow={1} mb={4}>
        <Text fontSize="md" fontWeight="bold" color="gray.800" mb={4}>
          สถานะออเดอร์
        </Text>
        <HStack justifyContent="space-between">
          {statuses.map((status) => (
            <VStack key={status.label} alignItems="center" flex={1}>
              <Box
                w="50px"
                h="50px"
                bg={`${status.color}20`}
                rounded="full"
                alignItems="center"
                justifyContent="center"
                mb={2}
              >
                <Text fontSize="lg" fontWeight="bold" color={status.color}>
                  {status.count}
                </Text>
              </Box>
              <Text fontSize="xs" color="gray.600" textAlign="center">
                {status.label}
              </Text>
            </VStack>
          ))}
        </HStack>
      </Box>
    );
  };

  const renderQuickStats = () => {
    if (!dashboard) return null;

    return (
      <HStack space={3} mb={4}>
        <Box flex={1} bg="white" rounded="lg" p={4} shadow={1}>
          <HStack alignItems="center" space={2}>
            <Box bg="blue.100" p={2} rounded="full">
              <Ionicons name="people" size={20} color="#3b82f6" />
            </Box>
            <VStack flex={1}>
              <Text fontSize="xs" color="gray.500">
                ลูกค้าทั้งหมด
              </Text>
              <Text fontSize="lg" fontWeight="bold" color="gray.800">
                {dashboard.total_customers}
              </Text>
            </VStack>
          </HStack>
        </Box>

        <Box flex={1} bg="white" rounded="lg" p={4} shadow={1}>
          <HStack alignItems="center" space={2}>
            <Box bg="red.100" p={2} rounded="full">
              <Ionicons name="return-down-back" size={20} color="#ef4444" />
            </Box>
            <VStack flex={1}>
              <Text fontSize="xs" color="gray.500">
                รอคืนสินค้า
              </Text>
              <Text fontSize="lg" fontWeight="bold" color="gray.800">
                {dashboard.pending_returns}
              </Text>
            </VStack>
          </HStack>
        </Box>
      </HStack>
    );
  };

  if (loading) {
    return (
      <Box flex={1} bg="coolGray.50">
        <StatusBar backgroundColor="#7c3aed" barStyle="light-content" />
        <Box safeAreaTop bg="violet.600" />
        <Center flex={1}>
          <Spinner size="lg" color="violet.600" />
        </Center>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="coolGray.50">
      <StatusBar backgroundColor="#7c3aed" barStyle="light-content" />
      <Box safeAreaTop bg="violet.600" />

      {/* Header */}
      <Box bg="violet.600" px={4} py={3}>
        <HStack alignItems="center" space={3} mb={3}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <Text fontSize="lg" fontWeight="bold" color="white" flex={1}>
            Dashboard
          </Text>
        </HStack>
      </Box>

      {/* Content */}
      <ScrollView showsVerticalScrollIndicator={false}>
        <VStack p={4} space={4}>
          {/* Sales Stats */}
          <HStack space={3}>
            {dashboard && (
              <>
                {renderStatCard(
                  "วันนี้",
                  dashboard.sales_stats.today,
                  dashboard.sales_stats.change_today,
                  "#7c3aed",
                )}
                {renderStatCard(
                  "7 วันที่แล้ว",
                  dashboard.sales_stats.week,
                  dashboard.sales_stats.change_week,
                  "#f59e0b",
                )}
                {renderStatCard(
                  "30 วันที่แล้ว",
                  dashboard.sales_stats.month,
                  dashboard.sales_stats.change_month,
                  "#10b981",
                )}
              </>
            )}
          </HStack>

          {/* Sales Chart */}
          {renderSalesChart()}

          {/* Quick Stats */}
          {renderQuickStats()}

          {/* Order Status */}
          {renderOrderStatusCount()}

          {/* Top Products */}
          {renderTopProducts()}
        </VStack>
      </ScrollView>
    </Box>
  );
}
