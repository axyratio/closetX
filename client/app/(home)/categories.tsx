// app/(home)/categories/index.tsx — เพิ่ม Loading States
import { useLocalSearchParams, useRouter } from "expo-router";
import { Box, Spinner, Text } from "native-base";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";

import type { HomeCategory } from "@/api/home";
import { CategoryProduct, fetchCategoryPageData } from "@/api/home";
import { AppBarNoCheck } from "@/components/navbar";
import { HomeProductGrid } from "@/components/product/grid";

export default function CategoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    categoryId?: string;
    categoryName?: string;
  }>();

  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState<HomeCategory[]>([]);
  const [products, setProducts] = useState<CategoryProduct[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );

  // ✅ แยก loading states
  const [initialLoading, setInitialLoading] = useState(true); // โหลดครั้งแรก
  const [categoryLoading, setCategoryLoading] = useState(false); // เปลี่ยนหมวดหมู่

  useEffect(() => {
    const load = async () => {
      try {
        setInitialLoading(true);
        const data = await fetchCategoryPageData();
        setCategories(data.categories);
        setProducts(data.products);

        const initialIdFromParam = params.categoryId
          ? String(params.categoryId)
          : null;

        if (
          initialIdFromParam &&
          data.categories.some((c) => c.id === initialIdFromParam)
        ) {
          setSelectedCategoryId(initialIdFromParam);
        } else if (data.categories.length > 0) {
          setSelectedCategoryId(data.categories[0].id);
        }
      } catch (e) {
        console.log("Category page load error:", e);
      } finally {
        setInitialLoading(false);
      }
    };
    load();
  }, []); // ✅ เปลี่ยนจาก [params.categoryId] เป็น []
  // กรองสินค้าตาม selectedCategoryId (UUID)
  const filteredProducts = useMemo(() => {
    if (!selectedCategoryId) return [];
    return products.filter((p) => p.categoryId === selectedCategoryId);
  }, [products, selectedCategoryId]);

  const handleSubmitSearch = () => {
    console.log("search in category:", search);
  };

  // ✅ เพิ่ม loading เมื่อเปลี่ยนหมวดหมู่
  const handleChangeCategory = (cat: HomeCategory) => {
    if (cat.id === selectedCategoryId) return; // ถ้าเป็นหมวดเดิม ไม่ต้องทำอะไร

    setCategoryLoading(true);

    // ใช้ setTimeout เพื่อให้ UI update ก่อน (simulate loading)
    setSelectedCategoryId(cat.id);
    router.setParams({ categoryId: cat.id, categoryName: cat.name } as any);
    setCategoryLoading(false);
  };

if (initialLoading) {
  return (
    <Box flex={1} bg="#f7f4ff">
      {/* <HomeNavbar
        searchValue={search}
        onChangeSearch={setSearch}
        onSubmitSearch={handleSubmitSearch}
      /> */}
      <Box flex={1} alignItems="center" justifyContent="center">
        <Spinner size="lg" color="#7c3aed" />
        <Text mt={3} color="#6b7280">
          กำลังโหลดหมวดหมู่...
        </Text>
      </Box>
    </Box>
  );
}

  return (
    <Box flex={1} bg="#f7f4ff">
      <AppBarNoCheck
        title="หมวดหมู่"
        onBackPress={() => router.back() }
      />
      {/* <HomeNavbar
        searchValue={search}
        onChangeSearch={setSearch}
        onSubmitSearch={handleSubmitSearch}
      /> */}

      {/* แถบเลือกหมวดหมู่ */}
      <Box mt={2} px={4}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 8 }}
        >
          {categories.map((cat) => {
            const isActive = cat.id === selectedCategoryId;
            return (
              <Pressable
                key={cat.id}
                onPress={() => handleChangeCategory(cat)}
                style={[
                  styles.categoryChip,
                  isActive && styles.categoryChipActive,
                  categoryLoading && styles.categoryChipDisabled,
                ]}
                disabled={categoryLoading}
              >
                <Text
                  style={[
                    styles.categoryText,
                    isActive && styles.categoryTextActive,
                    categoryLoading && styles.categoryTextDisabled,
                  ]}
                >
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Box>

      {/* ✅ Category Loading - แสดงตอนเปลี่ยนหมวดหมู่ */}
      {categoryLoading ? (
        <Box flex={1} alignItems="center" justifyContent="center">
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text mt={3} color="#6b7280">
            กำลังโหลดสินค้า...
          </Text>
        </Box>
      ) : (
        /* Grid สินค้าของหมวดที่เลือก */
        <ScrollView
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {filteredProducts.length === 0 ? (
            <Box py={12} alignItems="center">
              <Text color="#9ca3af" fontSize={16}>
                ไม่พบสินค้าในหมวดหมู่นี้
              </Text>
            </Box>
          ) : (
            <HomeProductGrid products={filteredProducts} />
          )}
        </ScrollView>
      )}
    </Box>
  );
}

const styles = StyleSheet.create({
  categoryChip: {
    marginRight: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  categoryChipActive: {
    backgroundColor: "#ede9fe",
  },
  categoryChipDisabled: {
    opacity: 0.5,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "400",
    color: "#6b7280",
  },
  categoryTextActive: {
    fontWeight: "700",
    color: "#7c3aed",
  },
  categoryTextDisabled: {
    color: "#9ca3af",
  },
});
