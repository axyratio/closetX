// app/store/my-store.tsx
import { CategoryCard } from "@/components/category/card";
import { AppBarNoCheck } from "@/components/navbar";
import StoreHeader from "@/components/store/header";
import MyTabs from "@/components/store/tab";
import { getToken } from "@/utils/secure-store";
import { DOMAIN } from "@/้host";

import {
  StoreProductItem as ClosedProductItem,
  ProductAPIService,
} from "@/api/products";

import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Box, Center, Spinner, Text } from "native-base";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  BackHandler,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import ProductCard from "@/components/product/card";

type StoreInfo = {
  store_id: string;
  name: string;
  logo_url?: string | null;
  rating: number;
  is_stripe_verified: boolean;
};

type StoreProductItem = {
  product_id: string;
  title: string;
  price: number;
  star: number;
  image_id?: string | null;
  image_url?: string | null;
  category?: string;
};

export default function MyStoreScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    initialTab?: "products" | "categories" | "closed";
  }>();
  const isFocused = useIsFocused();

  const [store, setStore] = useState<StoreInfo | null>(null);
  const [products, setProducts] = useState<StoreProductItem[]>([]);
  const [closedProducts, setClosedProducts] = useState<ClosedProductItem[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState(false);

  const isSeller = true;

  const fetchAll = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);

      const resp = await ProductAPIService.getMyStoreDashboard();
      if (!resp.success || !resp.data) {
        console.log("getMyStoreDashboard error:", resp.message);

        // ถ้า token หมด/ไม่มี ให้เด้ง login
        // (backend ถ้าคืน 401 อยู่แล้วก็โอเค)
        setStore(null);
        setProducts([]);
        setClosedProducts([]);
        return;
      }

      const data = resp.data;

      // logo_url อาจเป็น path /store/... ให้เติม DOMAIN
      const storeData = data.store;
      if (storeData.logo_url && !storeData.logo_url.startsWith("http")) {
        storeData.logo_url = `${DOMAIN}${storeData.logo_url}`;
      }

      setStore(storeData as any);
      setProducts((data.products || []) as any);
      setClosedProducts((data.closed_products || []) as any);
    } catch (e) {
      console.log("fetchAll error", e);
    } finally {
      if (!isRefresh) setLoading(false);
      setRefreshing(false);
    }
  };
  useEffect(() => {
  const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
    router.back();
    return true;
  });
  return () => backHandler.remove();
}, []);

  useEffect(() => {
    if (isFocused) fetchAll(false);
  }, [isFocused]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAll(true);
  }, []);

  // Stripe refresh link
  const handleRefreshStripeLink = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${DOMAIN}/store/connect/refresh-link`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        console.error("Failed to get refresh link:", json.message);
        return;
      }

      const refreshLink = json.data.onboarding_link;
      if (refreshLink) await WebBrowser.openBrowserAsync(refreshLink);
    } catch (e) {
      console.error("Error fetching refresh link:", e);
    }
  };

  const handleAddProductPress = () => {
  if (!store?.is_stripe_verified) {
    Alert.alert(
      "ยืนยันบัญชี Stripe",
      "คุณต้องยืนยันบัญชี Stripe ให้เรียบร้อยก่อนจึงจะสามารถเพิ่มสินค้าได้",
      [
        { text: "ยกเลิก", style: "cancel" },
        { 
          text: "ยืนยันตอนนี้", 
          onPress: handleRefreshStripeLink, // เรียกฟังก์ชันที่มีอยู่แล้ว
          style: "default" 
        },
      ]
    );
    return;
  }
  // ถ้าผ่านแล้วค่อยส่งไปหน้าเพิ่มสินค้า
  router.replace("/store/add-product" as any);
};

  const handleCloseProduct = async (productId: string) => {
    const resp = await ProductAPIService.closeProduct(productId);
    if (!resp.success) {
      console.log("closeProduct failed:", resp.message);
      return;
    }
    await fetchAll(true);
  };

  const handleOpenProduct = async (productId: string) => {
    // ✅ Issue #2: เช็คก่อนว่าสินค้านี้ถูกปิดโดย admin หรือไม่
    const product = closedProducts.find((p) => p.product_id === productId);
    if (product?.closed_by === "admin") {
      Alert.alert(
        "ไม่สามารถเปิดการขายได้",
        "สินค้านี้ถูกปิดโดยแอดมิน กรุณาติดต่อฝ่ายสนับสนุนเพื่อเปิดการขาย",
        [{ text: "ตกลง" }],
      );
      return;
    }


    const resp = await ProductAPIService.openProduct(productId);
    if (!resp.success) {
      // ✅ ถ้า backend ส่ง 403 กลับมา (กรณี admin ปิด) แสดง error message จาก backend
      Alert.alert("ไม่สามารถเปิดการขายได้", resp.message);
      return;
    }
    await fetchAll(true);
  };

  if (loading) {
    return (
      <Box flex={1} bg="white">
        <AppBarNoCheck title="ร้านค้าของฉัน" onBackPress={() => {}} />
        <Center flex={1}>
          <Spinner size="lg" color="violet.500" />
        </Center>
      </Box>
    );
  }

  // TAB 1: กำลังขาย
  const productTabContent = (
    <ScrollView
      contentContainerStyle={styles.productListContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {products.length === 0 ? (
        <Text textAlign="center" color="gray.400">
          ยังไม่มีสินค้าในร้านของคุณ
        </Text>
      ) : (
        <View style={styles.productGrid}>
          {products.map((p) => {
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
                route={`/store/add-product?productId=${p.product_id}`}
                isSeller={isSeller}
                isActive={true}
                onCloseSale={() => handleCloseProduct(p.product_id)}
              />
            );
          })}
        </View>
      )}
    </ScrollView>
  );

  // TAB 2: หมวดหมู่ (เอาจากสินค้ากำลังขาย)
  const productsByCategory = products.reduce(
    (acc, product) => {
      const categoryName = product.category || "ไม่มีหมวดหมู่";
      if (!acc[categoryName]) acc[categoryName] = [];
      acc[categoryName].push(product);
      return acc;
    },
    {} as Record<string, StoreProductItem[]>,
  );

  const categoryTabContent = (
    <ScrollView
      contentContainerStyle={styles.productListContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.productGrid}>
        {Object.keys(productsByCategory).map((categoryName) => {
          const categoryProducts = productsByCategory[categoryName];
          const firstProduct = categoryProducts[0];
          const coverImageUrl = firstProduct?.image_id
            ? `${DOMAIN}/images/stream/${firstProduct.image_id}`
            : firstProduct?.image_url || undefined;

          return (
            <CategoryCard
              key={categoryName}
              categoryName={categoryName}
              productCount={categoryProducts.length}
              coverImageUrl={coverImageUrl}
              onPress={() => {
                router.replace(
                  `/store/category-tab?categoryName=${encodeURIComponent(categoryName)}`,
                );
              }}
            />
          );
        })}
      </View>
    </ScrollView>
  );

  // TAB 3: ปิดการขาย (มาจาก dashboard)
  const closedTabContent = (
    <ScrollView
      contentContainerStyle={styles.productListContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >

  {closedProducts.map((p) => {
        const imageUrl = p.image_id
          ? `${DOMAIN}/images/stream/${p.image_id}`
          : p.image_url || undefined;

        return (
          <View key={p.product_id} style={{ position: "relative" }}>
            {/* ✅ Issue #2: Badge แสดงว่าใครปิด */}
            {p.closed_by === "admin" && (
              <View
                style={{
                  position: "absolute",
                  top: 4,
                  left: 4,
                  zIndex: 10,
                  backgroundColor: "#dc2626",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{ color: "white", fontSize: 10, fontWeight: "bold" }}
                >
                  ปิดโดยแอดมิน
                </Text>
              </View>
            )}
            <ProductCard
              key={p.product_id}
              productId={p.product_id}
              title={p.title}
              price={p.price}
              star={p.star}
              imageUrl={imageUrl}
              route={`/store/add-product?productId=${p.product_id}`}
              isSeller={isSeller}
              isActive={false}
              onOpenSale={
                p.closed_by !== "admin"
                  ? () => handleOpenProduct(p.product_id)
                  : undefined
              }
            />
          </View>
        );
      })}
    </ScrollView>
  );

  return (
    <Box flex={1} bg="white">
      <AppBarNoCheck title="ร้านค้าของฉัน" />

      <StoreHeader
        urlLogo={store?.logo_url}
        title={store?.name || "ร้านของฉัน"}
        storeId={store?.store_id}
        rating={store?.rating ?? 0}
        editStoreRoute={"/store/edit-store"}
        chatRoute={`/chat/store/${store?.store_id ?? ""}`}
        isStripeVerified={store?.is_stripe_verified ?? false}
        onRefreshStripe={handleRefreshStripeLink}
      />

      <MyTabs
        productContent={productTabContent}
        categoryContent={categoryTabContent}
        closedContent={closedTabContent}
        initialTab={params.initialTab}
      />

    <TouchableOpacity
          style={styles.floatingButton}
          onPress={handleAddProductPress} // เปลี่ยนมาใช้ฟังก์ชันที่สร้างใหม่
        >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </Box>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    zIndex: 999,
    elevation: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
  },
  productListContainer: {
    paddingBottom: 80,
  },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
});
