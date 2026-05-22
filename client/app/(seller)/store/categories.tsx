// File: app/(store)/categories.tsx

import { useLocalSearchParams, useRouter } from "expo-router";
import { Box } from "native-base";
import React from "react";

import { AppBarNoCheck } from "@/components/navbar";
import CategoryList, { Category } from "@/components/store/category";

export default function CategoriesScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    productId?: string;
    productName?: string;
    productDesc?: string;
    minBuy?: string;
    categoryId?: string;
    categoryName?: string;
    variant?: string;
    images?: string;
  }>();

  const handleSelect = (category: Category) => {
    router.replace({
      pathname: "/store/add-product",
      params: {
        ...params,
        categoryId: category.category_id,
        categoryName: category.name,
      },
    } as any);
  };

  return (
    <Box flex={1} bg="white">
      <AppBarNoCheck title="เลือกหมวดหมู่" />
      <CategoryList onSelect={handleSelect} />
    </Box>
  );
}
