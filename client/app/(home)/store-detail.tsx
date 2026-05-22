// app/(home)/store-detail.tsx
import {
  getPublicStoreDetail,
  getStoreCategories,
  getStoreProducts,
  StoreProduct,
} from "@/api/public-store";
import { createReport } from "@/api/report";
import ProductCard from "@/components/product/card";
import ReportModal from "@/components/report/report-modal";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { DOMAIN } from "@/้host";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Store = {
  store_id: string;
  name: string;
  description?: string;
  address?: string;
  logo?: string;
  rating: number;
  total_reviews: number;
  total_products: number;
};

type Category = {
  category_id: string;
  category_name: string;
  category_slug: string;
  product_count: number;
};

type Tab = "รายการสินค้า" | "หมวดหมู่";

export default function StoreDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ storeId: string }>();
  const storeId = params.storeId;

  const [store, setStore] = useState<Store | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedTab, setSelectedTab] = useState<Tab>("รายการสินค้า");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);


  // ─── Products pagination ───────────────────────────────────────────────────
  const fetchFn = useCallback(
    async (skip: number, limit: number) => {
      const res = await getStoreProducts({
        storeId,
        categoryId: selectedCategory ?? undefined,
        skip,
        limit,
      });
    //       console.log("🔍 [fetchFn] response success:", res.success);
    // console.log("🔍 [fetchFn] products count:", res.data?.products?.length);
    // console.log("🔍 [fetchFn] products:", JSON.stringify(res.data?.products, null, 10));
      return res.success ? res.data.products : [];
    },
    [storeId, selectedCategory],
  );

  const {
    data: products,
    loading: productsLoading,
    loadingMore,
    load,
    loadMore,
    refresh,
    refreshing,
  } = usePaginatedList<StoreProduct>(fetchFn, 2);

  useEffect(() => {
    if (storeId) load();
  }, [load]);
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (storeId) {
      loadStoreData();
      loadCategories();
    }
  }, [storeId]);

  const loadStoreData = async () => {
    try {
      setLoading(true);
      const data = await getPublicStoreDetail(storeId);
      if (data.success) setStore(data.data);
    } catch (error) {
      console.error("Error loading store:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await getStoreCategories(storeId);
      if (data.success) setCategories(data.data.categories);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const handleChatPress = async () => {
    try {
      setChatLoading(true);
      router.push({
        pathname: "/(chat)/chat",
        params: { storeId: store!.store_id, storeName: store!.name },
      });
    } catch {
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถเปิดแชทได้");
    } finally {
      setTimeout(() => setChatLoading(false), 1000);
    }
  };

  const handleReportSubmit = async (data: any) => {
    try {
      const response = await createReport({
        report_type: "store",
        reported_id: storeId!,
        reason: data.reason,
        description: data.description,
        image_urls: data.imageUrls,
      });
      if (response.success) {
        Alert.alert(
          "สำเร็จ",
          "ส่งรายงานเรียบร้อยแล้ว ทีมงานจะตรวจสอบโดยเร็วที่สุด",
        );
        setReportModalVisible(false);
      } else {
        Alert.alert("ข้อผิดพลาด", response.message || "ไม่สามารถส่งรายงานได้");
      }
    } catch {
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถส่งรายงานได้");
    }
  };

  // ─── Shared Header ────────────────────────────────────────────────────────
  const logoUrl = store?.logo?.startsWith("http")
    ? store.logo
    : `${DOMAIN}${store?.logo}`;

  const renderListHeader = () => (
    <View>
      {/* Store Header */}
      <View style={styles.storeHeader}>
        <View style={styles.avatarWrapper}>
          {store?.logo ? (
            <Image
              source={{ uri: logoUrl }}
              style={styles.avatar}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="storefront" size={32} color="#9ca3af" />
            </View>
          )}
          <TouchableOpacity
            style={styles.chatBadge}
            onPress={handleChatPress}
            disabled={chatLoading}
          >
            {chatLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="chatbubble" size={16} color="white" />
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.storeInfo}>
          <Text style={styles.storeName}>{store?.name}</Text>
          <View style={styles.storeRating}>
            <Ionicons name="star" size={16} color="#fbbf24" />
            <Text style={styles.ratingValue}>{store?.rating.toFixed(1)}</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {(["รายการสินค้า", "หมวดหมู่"] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, selectedTab === tab && styles.activeTab]}
            onPress={() => {
              setSelectedTab(tab);
              if (tab !== "รายการสินค้า") setSelectedCategory(null);
            }}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === tab && styles.activeTabText,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filter Badge */}
      {selectedTab === "รายการสินค้า" && selectedCategory && (
        <View style={styles.filterBadge}>
          <Text style={styles.filterText}>
            กรองตามหมวดหมู่:{" "}
            {
              categories.find((c) => c.category_id === selectedCategory)
                ?.category_name
            }
          </Text>
          <TouchableOpacity onPress={() => setSelectedCategory(null)}>
            <Ionicons name="close-circle" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
      )}

      {/* Loading indicator for products */}
      {productsLoading && (
        <ActivityIndicator color="#8b5cf6" style={{ marginVertical: 24 }} />
      )}

      {/* Categories (แสดงใน ListHeaderComponent แทน เพื่อไม่ซ้อน list) */}
      {selectedTab === "หมวดหมู่" && (
        <View style={styles.categoriesContainer}>
          {categories.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="albums-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>ยังไม่มีหมวดหมู่</Text>
            </View>
          ) : (
            categories.map((cat) => (
              <TouchableOpacity
                key={cat.category_id}
                style={styles.categoryCard}
                onPress={() => {
                  setSelectedCategory(cat.category_id);
                  setSelectedTab("รายการสินค้า");
                }}
              >
                <View style={styles.categoryIconWrapper}>
                  <View style={styles.categoryIcon}>
                    <Ionicons name="pricetag" size={24} color="#8b5cf6" />
                  </View>
                </View>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{cat.category_name}</Text>
                  <Text style={styles.categoryCount}>
                    {cat.product_count} สินค้า
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </View>
  );
  // ──────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      </View>
    );
  }

  if (!store) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorText}>ไม่พบร้านค้า</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ร้านค้า</Text>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => setReportModalVisible(true)}
        >
          <Ionicons name="flag-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* FlatList เดียวสำหรับทุก tab — ไม่ซ้อนใน ScrollView */}
      <FlatList
        data={selectedTab === "รายการสินค้า" ? products : []}
        keyExtractor={(item) => item.product_id}
        numColumns={2}
        columnWrapperStyle={
          selectedTab === "รายการสินค้า"
            ? {
                justifyContent: "space-between",
                paddingHorizontal: 16,
                marginTop: 16,
              }
            : undefined
        }
        renderItem={({ item }) => (
          <ProductCard
            productId={item.product_id}
            title={item.name}
            price={item.price}
            star={item.rating}
            imageUrl={item.image}
            route={`/(home)/product-detail?productId=${encodeURIComponent(item.product_id)}`}
          />
        )}
        ListHeaderComponent={renderListHeader}
        onEndReached={selectedTab === "รายการสินค้า" ? loadMore : undefined}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={
              selectedTab === "รายการสินค้า" ? refresh : loadCategories
            }
          />
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color="#8b5cf6" style={{ marginVertical: 16 }} />
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      />

      <ReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        onSubmit={handleReportSubmit}
        reportType="store"
        reportedId={storeId!}
        reportedName={store.name}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  errorText: { fontSize: 18, fontWeight: "600", color: "#6b7280" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#1f2937" },
  moreButton: { padding: 4 },
  storeHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "white",
    gap: 12,
  },
  avatarWrapper: { position: "relative" },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  chatBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#8b5cf6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  storeInfo: { flex: 1 },
  storeName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  storeRating: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingValue: { fontSize: 14, fontWeight: "600", color: "#1f2937" },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: { borderBottomColor: "#8b5cf6" },
  tabText: { fontSize: 14, fontWeight: "500", color: "#6b7280" },
  activeTabText: { color: "#8b5cf6", fontWeight: "600" },
  filterBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ede9fe",
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterText: { fontSize: 13, color: "#7c3aed", fontWeight: "500" },
  emptyState: { paddingVertical: 60, alignItems: "center", gap: 12 },
  emptyText: { fontSize: 16, color: "#9ca3af" },
  categoriesContainer: { padding: 16, gap: 12 },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryIconWrapper: { marginRight: 12 },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  categoryInfo: { flex: 1 },
  categoryName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  categoryCount: { fontSize: 12, color: "#6b7280" },
  infoContainer: { padding: 16, gap: 16 },
  infoSection: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 8,
  },
  infoValue: { fontSize: 14, color: "#1f2937", lineHeight: 20 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 8,
  },
  statItem: { alignItems: "center", gap: 4 },
  statValue: { fontSize: 18, fontWeight: "bold", color: "#1f2937" },
  statLabel: { fontSize: 12, color: "#6b7280" },
});
