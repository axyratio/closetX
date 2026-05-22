// app/(store)/category-tab.tsx
import { AppBarNoCheck } from "@/components/navbar";
import ProductCard from "@/components/product/card";
import { getToken } from "@/utils/secure-store";
import { DOMAIN } from "@/้host";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Box } from "native-base";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

// Re-using types from mystore.tsx
type StoreProductItem = {
  product_id: string;
  title: string;
  price: number;
  star: number;
  image_id?: string | null;
  image_url?: string | null;
  category?: string;
};

const STORE_API_BASE = `${DOMAIN}/stores`;

export default function CategoryTabScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ categoryName: string }>();
  const categoryName = params.categoryName
    ? decodeURIComponent(params.categoryName)
    : "หมวดหมู่";

  const [allProducts, setAllProducts] = useState<StoreProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProducts = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        router.replace("/(auth)/login");
        return;
      }
      const res = await fetch(`${STORE_API_BASE}/me/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);

      const json = await res.json();
      setAllProducts(json.data.products || []);
    } catch (e) {
      console.error("fetch store products error", e);
    } finally {
      if (!isRefresh) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchProducts(true);
  }, []);

  // =========================
  // HANDLE BACK BUTTON → กลับไปหน้า mystore พร้อมเปิดแท็บ category
  // =========================
  const handleBack = () => {
    router.replace({
      pathname: "/(seller)/store/mystore" as any,
      params: { initialTab: "categories" },
    });
  };

  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true; // บอกว่าเราจัดการ event นี้เองแล้ว
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );
    return () => subscription.remove();
  }, []);

  // กรองสินค้าตามหมวดหมู่ที่ได้รับมา
  const filteredProducts = useMemo(() => {
    return allProducts.filter(
      (p) => (p.category || "ไม่มีหมวดหมู่") === categoryName,
    );
  }, [allProducts, categoryName]);

  if (loading) {
    return (
      <Box flex={1} bg="white">
        <AppBarNoCheck title={categoryName} onBackPress={handleBack} />
        <ActivityIndicator
          style={{ marginTop: 20 }}
          size="large"
          color="#7c3aed"
        />
      </Box>
    );
  }

  return (
    <Box flex={1} bg="white">
      <AppBarNoCheck title={categoryName} onBackPress={handleBack} />
      <ScrollView
        contentContainerStyle={styles.productListContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.productGrid}>
          {filteredProducts.map((p) => {
            const imageUrl = p.image_id
              ? `${DOMAIN}/images/stream/${p.image_id}`
              : p.image_url || undefined;
            return (
              <ProductCard
                key={p.product_id}
                productId={p.product_id}
                title={p.title}
                price={p.price}
                star={p.star}
                imageUrl={imageUrl}
                route={`/(store)/add-product?productId=${p.product_id}`}
                isSeller={true}
              />
            );
          })}
        </View>
      </ScrollView>
    </Box>
  );
}

const styles = StyleSheet.create({
  productListContainer: { padding: 16, paddingBottom: 80 },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
});
