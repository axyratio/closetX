// app/(profile)/wishlist.tsx
import { fetchWishlist, toggleWishlist, WishlistItem } from "@/api/wishlist";
import ProductCard from "@/components/product/card";
import { getToken } from "@/utils/secure-store";
import { DOMAIN } from "@/้host";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Box,
  Center,
  HStack,
  Pressable,
  Spinner,
  StatusBar,
  Text,
  useToast,
} from "native-base";
import React, { useCallback, useEffect, useState } from "react";
import {
  BackHandler,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

export default function WishlistScreen() {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  // ✅ เก็บสถานะ wishlist แบบ local
  const [wishlistStates, setWishlistStates] = useState<Record<string, boolean>>(
    {},
  );

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

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const token = await getToken();
      if (!token) {
        router.replace("/(auth)/login");
        return;
      }
      const data = await fetchWishlist(token);
      setItems(data.items);
      setTotal(data.total);
      console.log("[wishlist] wishlist items:", JSON.stringify(data.items, null, 2));

      // ✅ ตั้งค่าสถานะ wishlist เป็น true ทั้งหมด
      const states: Record<string, boolean> = {};
      data.items.forEach((item) => {
        states[item.product_id] = true;
      });
      setWishlistStates(states);
    } catch (err) {
      console.error("Error loading wishlist:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ✅ แก้ไข handleToggleFavorite ให้ทำงานทันทีแบบ fire-and-forget
  const handleToggleFavorite = async (productId: string) => {
    // อัปเดต UI ทันที (ไม่ต้องรอ API)
    const newState = !wishlistStates[productId];
    setWishlistStates((prev) => ({
      ...prev,
      [productId]: newState,
    }));

    // ลบ toast เก่าทั้งหมดก่อนแสดงอันใหม่
    toast.closeAll();

    // รอนิดนึงให้ toast เก่าหายสนิท แล้วค่อยแสดงอันใหม่
    setTimeout(() => {
      toast.show({
        description: newState
          ? "เพิ่มในรายการโปรดแล้ว"
          : "ลบออกจากรายการโปรดแล้ว",
        duration: 1500,
        bg: newState ? "violet.600" : "gray.600",
      });
    }, 100);

    // เรียก API ในพื้นหลัง (ไม่รอผลลัพธ์)
    try {
      const token = await getToken();
      if (token) {
        toggleWishlist(token, productId).catch((err) => {
          console.error("Error toggling wishlist:", err);
        });
      }
    } catch (err) {
      console.error("Error getting token:", err);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadWishlist(false);
  }, []);

  const getImageUri = (item: WishlistItem) => {
    if (item.image_url && item.image_url.startsWith("http")) {
      return item.image_url;
    }
    if (item.image_id) {
      return `${DOMAIN}/images/stream/${item.image_id}`;
    }
    if (item.image_url) {
      return `${DOMAIN}${item.image_url}`;
    }
    return undefined;
  };

  return (
    <Box flex={1} bg="coolGray.50">
      <StatusBar backgroundColor="#7c3aed" barStyle="light-content" />
      <Box safeAreaTop bg="violet.600" />

      {/* Header */}
      <Box bg="violet.600" px={4} py={3}>
        <HStack alignItems="center" justifyContent="space-between">
          <HStack alignItems="center" space={3}>
            <Pressable
              onPress={() => router.navigate("/(tabs)/profile" as any)}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>
            <Text fontSize="lg" fontWeight="bold" color="white">
              สินค้าที่บันทึก
            </Text>
          </HStack>
          <Text fontSize="sm" color="violet.200">
            {total} รายการ
          </Text>
        </HStack>
      </Box>

      {/* Content */}
      {loading ? (
        <Center flex={1}>
          <Spinner size="lg" color="violet.600" />
        </Center>
      ) : items.length === 0 ? (
        <Center flex={1}>
          <Ionicons name="heart-outline" size={64} color="#d1d5db" />
          <Text mt={4} color="gray.500" fontSize="md">
            ยังไม่มีสินค้าที่บันทึก
          </Text>
          <Pressable mt={3} onPress={() => router.push("/(tabs)")}>
            <Text color="violet.600" fontWeight="bold" fontSize="sm">
              ไปเลือกสินค้า →
            </Text>
          </Pressable>
        </Center>
      ) : (
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#7c3aed"]}
            />
          }
        >
          {/* ✅ ใช้ ProductCard แบบ 2 columns */}
          <View style={styles.productGrid}>
            {items.map((item) => (
              <ProductCard
                key={item.wishlist_id}
                productId={item.product_id}
                title={item.title}
                price={item.price}
                star={item.rating}
                imageUrl={getImageUri(item)}
                route={`/(home)/product-detail?productId=${item.product_id}`}
                isSeller={false}
                isWishlisted={wishlistStates[item.product_id] ?? true}
                onToggleFavorite={() => handleToggleFavorite(item.product_id)}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </Box>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
});
