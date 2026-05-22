// app/(admin)/store-detail.tsx
import { getToken } from "@/utils/secure-store";
import { DOMAIN } from "@/้host";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Box } from "native-base";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface StoreDetail {
  store_id: string;
  name: string;
  description?: string;
  logo_path?: string;
  address?: string;
  is_active: boolean;
  rating: number;
  stripe_account_id?: string;
  is_stripe_verified: boolean;
  owner: {
    user_id: string;
    username: string;
    email: string;
    role: string;
  };
  statistics: {
    total_products: number;
    active_products: number;
    draft_products: number;
  };
}

interface Product {
  product_id: string;
  product_name: string;
  base_price: number;
  stock_quantity: number;
  category: string;
  is_active: boolean;
  is_draft: boolean;
  image_url?: string;
}

export default function StoreDetail() {
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const router = useRouter();
  const [store, setStore] = useState<StoreDetail | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState(false); // Issue #11: loading ขณะเปลี่ยนสถานะร้าน
  const [activeTab, setActiveTab] = useState<"info" | "products">("info");

  useEffect(() => {
    fetchStoreDetail();
    fetchProducts();
  }, [storeId]);

  const fetchStoreDetail = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${DOMAIN}/admin/stores/${storeId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const result = await response.json();
      console.log("[Store detail]", result.data);
      if (result.success) {
        setStore(result.data);
      } else {
        Alert.alert("เกิดข้อผิดพลาด", result.message);
      }
    } catch (error) {
      console.error("Error fetching store detail:", error);
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถดึงข้อมูลร้านค้าได้");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = await getToken();
      const response = await fetch(
        `${DOMAIN}/admin/stores/${storeId}/products?limit=50`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );
      const result = await response.json();
      if (result.success) {
        setProducts(result.data.products);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStoreDetail();
    await fetchProducts();
    setRefreshing(false);
  }, []);

  const handleToggleStore = async () => {
    if (!store) return;

    const newStatus = !store.is_active;
    const actionText = newStatus ? "เปิด" : "ปิด";

    Alert.alert(
      "ยืนยันการเปลี่ยนสถานะ",
      `คุณต้องการ${actionText}ร้านค้า "${store.name}" หรือไม่?`,
      [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ยืนยัน",
          style: newStatus ? "default" : "destructive",
          onPress: async () => {
            try {
              setToggling(true); // Issue #11: แสดง loading overlay
              const token = await getToken();
              const formData = new FormData();
              formData.append("is_active", newStatus.toString());

              const response = await fetch(
                `${DOMAIN}/admin/stores/${storeId}/status`,
                {
                  method: "PATCH",
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                  body: formData,
                },
              );
              const result = await response.json();
              if (result.success) {
                // Issue #10: อัปเดต state ทันทีจาก response ไม่ต้อง refetch ทั้งหน้า
                setStore((prev) =>
                  prev ? { ...prev, is_active: result.data.is_active } : prev,
                );
                Alert.alert("สำเร็จ", result.message);
              } else {
                Alert.alert("เกิดข้อผิดพลาด", result.message);
              }
            } catch (error) {
              Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถเปลี่ยนสถานะได้");
            } finally {
              setToggling(false); // Issue #11: ซ่อน loading overlay
            }
          },
        },
      ],
    );
  };

  // const handleEditStore = () => {
  //   console.log("[Store detail] edit store", store?.store_id);
  //   if (!store) return;
  //   router.push({
  //     pathname: "/(store)/edit-store",
  //     params: {
  //       storeId: store.store_id,
  //       storeName: store.name,
  //       logoUrl: store.logo_path || "",
  //       isAdminMode: "true",
  //     },
  //   });
  // };

  const handleToggleProduct = async (product: Product) => {
    const newStatus = !product.is_active;
    const actionText = newStatus ? "เปิดขาย" : "ปิดขาย";

    Alert.alert(
      "ยืนยันการเปลี่ยนสถานะ",
      `คุณต้องการ${actionText}สินค้า "${product.product_name}" หรือไม่?`,
      [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ยืนยัน",
          onPress: async () => {
            try {
              setToggling(true); // Issue #11
              const token = await getToken();
              const formData = new FormData();
              formData.append("is_active", newStatus.toString());

              const response = await fetch(
                `${DOMAIN}/admin/stores/${storeId}/products/${product.product_id}/status`,
                {
                  method: "PATCH",
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                  body: formData,
                },
              );
              const result = await response.json();
              if (result.success) {
                // อัปเดต state ทันทีจาก response ไม่ต้อง refetch
                setProducts((prev) =>
                  prev.map((p) =>
                    p.product_id === product.product_id
                      ? { ...p, is_active: result.data.is_active }
                      : p,
                  ),
                );
                Alert.alert("สำเร็จ", result.message);
              } else {
                Alert.alert("เกิดข้อผิดพลาด", result.message);
              }
            } catch (error) {
              Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถเปลี่ยนสถานะได้");
            } finally {
              setToggling(false); // Issue #11
            }
          },
        },
      ],
    );
  };

  const handleEditProduct = (productId: string) => {
    router.push({
      pathname: "/(store)/edit-product" as any,
      params: {
        productId: productId,
        storeId: storeId,
        isAdminMode: "true",
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!store) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={64} color="#ef4444" />
        <Text style={styles.errorText}>ไม่พบข้อมูลร้านค้า</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>กลับ</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Issue #11: Loading overlay ขณะเปลี่ยนสถานะร้าน กดอะไรไม่ได้ */}
      <Modal visible={toggling} transparent animationType="fade">
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#7c3aed" />
            <Text style={styles.loadingOverlayText}>กำลังดำเนินการ...</Text>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <Box safeAreaTop></Box>

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>รายละเอียดร้านค้า</Text>
          <TouchableOpacity>
            {/* <Ionicons name="create-outline" size={24} color="#3b82f6" /> */}
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "info" && styles.tabActive]}
          onPress={() => setActiveTab("info")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "info" && styles.tabTextActive,
            ]}
          >
            ข้อมูลร้าน
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "products" && styles.tabActive]}
          onPress={() => setActiveTab("products")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "products" && styles.tabTextActive,
            ]}
          >
            สินค้า ({store.statistics.total_products})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === "info" ? (
          <>
            {/* Store Info Card */}
            <View style={styles.card}>
              <View style={styles.storeHeader}>
                {store.logo_path && (
                  <Image
                    source={{ uri: store.logo_path }}
                    style={styles.storeLogo}
                  />
                )}
                <View style={styles.storeInfo}>
                  <Text style={styles.storeName}>{store.name}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: store.is_active
                          ? "#dcfce7"
                          : "#fee2e2",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: store.is_active ? "#16a34a" : "#dc2626" },
                      ]}
                    >
                      {store.is_active ? "เปิดอยู่" : "ปิดอยู่"}
                    </Text>
                  </View>
                </View>
              </View>

              {store.description && (
                <Text style={styles.description}>{store.description}</Text>
              )}

              {store.address && (
                <View style={styles.infoRow}>
                  <Ionicons name="location" size={20} color="#6b7280" />
                  <Text style={styles.infoText}>{store.address}</Text>
                </View>
              )}

              <View style={styles.infoRow}>
                <Ionicons name="star" size={20} color="#fbbf24" />
                <Text style={styles.infoText}>
                  คะแนน: {store.rating.toFixed(1)} ⭐
                </Text>
              </View>
            </View>

            {/* Owner Info Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>ข้อมูลเจ้าของ</Text>
              <View style={styles.infoRow}>
                <Ionicons name="person" size={20} color="#6b7280" />
                <Text style={styles.infoText}>{store.owner.username}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="mail" size={20} color="#6b7280" />
                <Text style={styles.infoText}>{store.owner.email}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="shield" size={20} color="#6b7280" />
                <Text style={styles.infoText}>สิทธิ์: {store.owner.role}</Text>
              </View>
            </View>

            {/* Statistics Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>สถิติสินค้า</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {store.statistics.total_products}
                  </Text>
                  <Text style={styles.statLabel}>สินค้าทั้งหมด</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: "#16a34a" }]}>
                    {store.statistics.active_products}
                  </Text>
                  <Text style={styles.statLabel}>เปิดขาย</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: "#f59e0b" }]}>
                    {store.statistics.draft_products}
                  </Text>
                  <Text style={styles.statLabel}>แบบร่าง</Text>
                </View>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: store.is_active ? "#dc2626" : "#16a34a",
                  },
                ]}
                onPress={handleToggleStore}
              >
                <Ionicons
                  name={store.is_active ? "close-circle" : "checkmark-circle"}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.actionButtonText}>
                  {store.is_active ? "ปิดร้านค้า" : "เปิดร้านค้า"}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          // Product List
          <>
            {products.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="cube-outline" size={64} color="#d1d5db" />
                <Text style={styles.emptyText}>ไม่พบสินค้า</Text>
              </View>
            ) : (
              products.map((product) => (
                <View key={product.product_id} style={styles.productCard}>
                  {product.image_url && (
                    <Image
                      source={{ uri: product.image_url }}
                      style={styles.productImage}
                    />
                  )}
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>
                      {product.product_name}
                    </Text>
                    <Text style={styles.productPrice}>
                      ฿{product.base_price.toFixed(2)}
                    </Text>
                    <Text style={styles.productStock}>
                      คลัง: {product.stock_quantity}
                    </Text>
                    <View
                      style={[
                        styles.productStatus,
                        {
                          backgroundColor: product.is_active
                            ? "#dcfce7"
                            : "#fee2e2",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.productStatusText,
                          { color: product.is_active ? "#16a34a" : "#dc2626" },
                        ]}
                      >
                        {product.is_draft
                          ? "แบบร่าง"
                          : product.is_active
                            ? "เปิดขาย"
                            : "ปิดขาย"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.productActions}>
                    {/* <TouchableOpacity
                      onPress={() => handleEditProduct(product.product_id)}
                    >
                      <Ionicons name="create" size={24} color="#3b82f6" />
                    </TouchableOpacity> */}
                    {!product.is_draft && (
                      <TouchableOpacity
                        onPress={() => handleToggleProduct(product)}
                      >
                        <Ionicons
                          name={product.is_active ? "eye-off" : "eye"}
                          size={24}
                          color={product.is_active ? "#dc2626" : "#16a34a"}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  header: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#3b82f6",
  },
  tabText: {
    fontSize: 14,
    color: "#6b7280",
  },
  tabTextActive: {
    color: "#3b82f6",
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  card: {
    backgroundColor: "#fff",
    marginTop: 12,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  storeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  storeLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 12,
    backgroundColor: "#f3f4f6",
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  description: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 12,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#374151",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  actionContainer: {
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  productCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    alignItems: "center",
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: "#f3f4f6",
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#3b82f6",
    marginBottom: 2,
  },
  productStock: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  productStatus: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  productStatusText: {
    fontSize: 10,
    fontWeight: "600",
  },
  productActions: {
    flexDirection: "column",
    gap: 12,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: "#9ca3af",
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: "#ef4444",
  },
  backButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#3b82f6",
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  // Issue #11: Loading overlay styles
  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 40,
    alignItems: "center",
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingOverlayText: {
    fontSize: 15,
    color: "#374151",
    fontWeight: "500",
  },
});
