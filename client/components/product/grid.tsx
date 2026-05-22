// components/grid.tsx
import { useRouter } from "expo-router";
import { Box, Text, useToast } from "native-base";
import React, { useEffect, useState } from "react";
import { View } from "react-native";

import { HomeProduct } from "@/api/home";
import { checkWishlist, toggleWishlist } from "@/api/wishlist";
import ProductCard from "@/components/product/card";
import { getToken } from "@/utils/secure-store";
import { DOMAIN } from "@/้host";

const API_BASE_URL = `${DOMAIN}`;

type HomeProductGridProps = {
  products: HomeProduct[];
  isSeller?: boolean;
  isShowTitle?: boolean;
  title?: string;
};

export const HomeProductGrid: React.FC<HomeProductGridProps> = ({
  products,
  isSeller = false,
  isShowTitle = false,
  title,
}) => {
  const router = useRouter();
  const toast = useToast();

  // ✅ เก็บสถานะ wishlist ของแต่ละสินค้า
  const [wishlistStates, setWishlistStates] = useState<Record<string, boolean>>(
    {},
  );

  // ✅ โหลดสถานะ wishlist เมื่อ component mount
  useEffect(() => {
    if (!isSeller && products.length > 0) {
      loadWishlistStates();
    }
  }, [products, isSeller]);

  const loadWishlistStates = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const states: Record<string, boolean> = {};

      // เช็คสถานะ wishlist ของแต่ละสินค้า
      await Promise.all(
        products.map(async (product) => {
          try {
            const isWishlisted = await checkWishlist(token, product.id);
            states[product.id] = isWishlisted;
          } catch (err) {
            console.error(`Error checking wishlist for ${product.id}:`, err);
            states[product.id] = false;
          }
        }),
      );

      setWishlistStates(states);
    } catch (error) {
      console.error("Error loading wishlist states:", error);
    }
  };

  // ✅ ฟังก์ชัน toggle wishlist แบบ fire-and-forget
  const handleToggleFavorite = async (productId: string) => {
    // เช็ค token ก่อน
    const token = await getToken();
    if (!token) {
      router.push("/(auth)/login");
      return;
    }

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

    // เรียก API ในพื้นหลัง (fire-and-forget)
    toggleWishlist(token, productId).catch((err) => {
      console.error("Error toggling wishlist:", err);
    });
  };

  if (!products || products.length === 0) {
    return (
      <Box mt={6} px={4}>
        <Text color="gray.500" fontSize="sm">
          ยังไม่มีสินค้า
        </Text>
      </Box>
    );
  }

  return (
    <Box mt={6} px={4}>
      {isShowTitle && (
        <Text mb={3} fontWeight="600" fontSize="md">
          {title}
        </Text>
      )}

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        {products.map((p) => {
          const imageUrl = p.imageId
            ? `${API_BASE_URL}/images/stream/${p.imageId}`
            : p.imageUrl;

          return (
            <ProductCard
              key={p.id}
              productId={p.id}
              title={p.title}
              price={p.price}
              star={p.rating}
              imageUrl={imageUrl}
              route={`/(home)/product-detail?productId=${encodeURIComponent(p.id)}`}
              isSeller={isSeller}
              isWishlisted={wishlistStates[p.id] || false}
              onToggleFavorite={() => handleToggleFavorite(p.id)}
            />
          );
        })}
      </View>
    </Box>
  );
};
