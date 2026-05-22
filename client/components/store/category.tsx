// File: components/category.tsx

import React, { useEffect, useState } from "react";
import { ScrollView, Pressable } from "react-native";
import { Box, Spinner, Text } from "native-base";
import { Category, fetchPublicCategories } from "@/api/category";

type CategoryListProps = {
  onSelect: (category: Category) => void;
};

export default function CategoryList({ onSelect }: CategoryListProps) {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await fetchPublicCategories();
      setCategories(data);
    } catch (error) {
      console.error("Failed to load categories:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box flex={1} alignItems="center" justifyContent="center">
        <Spinner />
        <Text mt={2}>กำลังโหลดหมวดหมู่...</Text>
      </Box>
    );
  }

  if (categories.length === 0) {
    return (
      <Box flex={1} alignItems="center" justifyContent="center" p={4}>
        <Text color="gray.500">ไม่มีหมวดหมู่</Text>
      </Box>
    );
  }

  return (
    <ScrollView>
      <Box>
        {categories.map((cat) => (
          <CategoryItem key={cat.category_id} item={cat} onPress={onSelect} />
        ))}
      </Box>
    </ScrollView>
  );
}

type CategoryItemProps = {
  item: Category;
  onPress: (item: Category) => void;
};

export function CategoryItem({ item, onPress }: CategoryItemProps) {
  return (
    <Pressable onPress={() => onPress(item)}>
      <Box
        px={4}
        py={4}
        borderBottomWidth={1}
        borderColor="#eee"
        backgroundColor="white"
      >
        <Text fontSize="md" fontWeight="500">
          {item.name}
        </Text>
        <Text fontSize="xs" color="gray.500" mt={1}>
          Slug: {item.slug}
        </Text>
      </Box>
    </Pressable>
  );
}

export type { Category };