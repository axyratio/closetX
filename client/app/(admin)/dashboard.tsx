// app/(admin)/dashboard.tsx
import CategoryChart from "@/components/admin_dashboard/category-chart";
import DashboardOverviewCardEnhanced from "@/components/admin_dashboard/dashboard-overview-card";
import OrderStatusCardEnhanced from "@/components/admin_dashboard/order-status-card";
import PaymentMethodChart from "@/components/admin_dashboard/payment-method-chart";
import RatingCard from "@/components/admin_dashboard/rating-card";
import SalesChart from "@/components/admin_dashboard/sale-chart";
import { AppBarNoCheck } from "@/components/navbar";
import { getToken } from "@/utils/secure-store";
import { DOMAIN } from "@/้host";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type SalesPeriod = "daily" | "weekly" | "monthly";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<SalesPeriod>("daily");
  const [loadingSales, setLoadingSales] = useState(false); // เพิ่ม loading สำหรับกราฟ

  // State for all dashboard data
  const [overview, setOverview] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [sales, setSales] = useState<any>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [orderStatus, setOrderStatus] = useState<any>(null);
  const [vtonUsage, setVtonUsage] = useState<any>(null);
  const [lowStock, setLowStock] = useState<any>(null);
  const [ratings, setRatings] = useState<any>(null);

  // console.log("[Dashboard] lowStock:", JSON.stringify(stockData.data, null, 2));

  // ✅ Fetch ข้อมูลทั้งหมด (ยกเว้น Sales)
  const fetchAllData = async () => {
    const token = await getToken();
    if (!token) return;

    try {
      setLoading(true);

      const headers = { Authorization: `Bearer ${token}` };

      const [
        overviewRes,
        categoriesRes,
        salesRes,
        paymentRes,
        orderRes,
        vtonRes,
        stockRes,
        ratingsRes,
      ] = await Promise.all([
        fetch(`${DOMAIN}/admin/dashboard/overview`, { headers }),
        fetch(`${DOMAIN}/admin/dashboard/products-by-category`, { headers }),
        fetch(`${DOMAIN}/admin/dashboard/sales?period=${selectedPeriod}`, {
          headers,
        }),
        fetch(`${DOMAIN}/admin/dashboard/payment-methods`, { headers }),
        fetch(`${DOMAIN}/admin/dashboard/order-status`, { headers }),
        fetch(`${DOMAIN}/admin/dashboard/vton-usage`, { headers }),
        fetch(`${DOMAIN}/admin/dashboard/low-stock-products?threshold=10`, {
          headers,
        }),
        fetch(`${DOMAIN}/admin/dashboard/ratings`, { headers }),
      ]);

      const [
        overviewData,
        categoriesData,
        salesData,
        paymentData,
        orderData,
        vtonData,
        stockData,
        ratingsData,
      ] = await Promise.all([
        overviewRes.json(),
        categoriesRes.json(),
        salesRes.json(),
        paymentRes.json(),
        orderRes.json(),
        vtonRes.json(),
        stockRes.json(),
        ratingsRes.json(),
      ]);

      setOverview(overviewData.data);
      setCategories(categoriesData.data?.categories || []);
      setSales(salesData.data);
      setPaymentMethods(paymentData.data?.methods || []);
      setOrderStatus(orderData.data);
      setVtonUsage(vtonData.data);
      setLowStock(stockData.data);
      setRatings(ratingsData.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ✅ Fetch เฉพาะข้อมูล Sales
  const fetchSalesData = async (period: SalesPeriod) => {
    const token = await getToken();
    if (!token) return;

    try {
      setLoadingSales(true);

      const headers = { Authorization: `Bearer ${token}` };
      const response = await fetch(
        `${DOMAIN}/admin/dashboard/sales?period=${period}`,
        { headers },
      );
      const data = await response.json();

      setSales(data.data);
    } catch (error) {
      console.error("Error fetching sales data:", error);
    } finally {
      setLoadingSales(false);
    }
  };

  // ✅ เรียกครั้งแรกตอน mount
  useEffect(() => {
    fetchAllData();
  }, []);

  // ✅ เรียกเฉพาะตอนเปลี่ยน period (ไม่ fetch ทั้งหน้า)
  useEffect(() => {
    if (!loading) {
      fetchSalesData(selectedPeriod);
    }
  }, [selectedPeriod]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const handlePeriodChange = (period: SalesPeriod) => {
    setSelectedPeriod(period);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <AppBarNoCheck
        title="แดชบอร์ดผู้ดูแลระบบ"
        titleColor="#000"
        backIconColor="#000"
        backgroundColor="#fff"
        fontWeight="bold"
      ></AppBarNoCheck>


      {overview && <DashboardOverviewCardEnhanced data={overview} />}

      {/* Sales Chart with Period Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ยอดขาย</Text>
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[
              styles.periodButton,
              selectedPeriod === "daily" && styles.periodButtonActive,
            ]}
            onPress={() => handlePeriodChange("daily")}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === "daily" && styles.periodButtonTextActive,
              ]}
            >
              รายวัน
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.periodButton,
              selectedPeriod === "weekly" && styles.periodButtonActive,
            ]}
            onPress={() => handlePeriodChange("weekly")}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === "weekly" && styles.periodButtonTextActive,
              ]}
            >
              รายสัปดาห์
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.periodButton,
              selectedPeriod === "monthly" && styles.periodButtonActive,
            ]}
            onPress={() => handlePeriodChange("monthly")}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === "monthly" && styles.periodButtonTextActive,
              ]}
            >
              รายเดือน
            </Text>
          </TouchableOpacity>
        </View>

        {/* ✅ แสดง loading indicator ตอนกำลังโหลดกราฟ */}
        {loadingSales ? (
          <View style={styles.chartLoadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.chartLoadingText}>กำลังโหลดข้อมูล...</Text>
          </View>
        ) : (
          sales && <SalesChart data={sales.data} period={selectedPeriod} />
        )}
      </View>

      {/* Categories Chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>สินค้าแต่ละหมวดหมู่</Text>
        {categories.length > 0 && <CategoryChart data={categories} />}
      </View>

      {/* Payment Methods */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ช่องทางการชำระเงิน</Text>
        {paymentMethods.length > 0 && (
          <PaymentMethodChart data={paymentMethods} />
        )}
      </View>

      {/* Order Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>สถานะคำสั่งซื้อทั้งหมด</Text>
        {/* <Text style={styles.sectionSubtitle}>
          แสดงเฉพาะสถานะที่มีการใช้งานจริงในระบบ
        </Text> */}
        {orderStatus && <OrderStatusCardEnhanced data={orderStatus} />}
      </View>



      {/* Ratings Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ภาพรวมเรทติ้ง</Text>
        {ratings && <RatingCard data={ratings} />}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  header: {
    backgroundColor: "#007AFF",
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#E0E0E0",
  },
  section: {
    backgroundColor: "#FFF",
    marginTop: 16,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#666",
    marginBottom: 12,
    fontStyle: "italic",
  },
  periodSelector: {
    flexDirection: "row",
    marginBottom: 16,
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: "#007AFF",
  },
  periodButtonText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  periodButtonTextActive: {
    color: "#FFF",
  },
  chartLoadingContainer: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  chartLoadingText: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
  },
});
