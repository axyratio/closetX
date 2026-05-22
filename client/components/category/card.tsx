// components/card.tsx
import { DOMAIN } from "@/้host";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2; // 2 columns with padding

// ========================================
// Category Card Component
// ========================================

type CategoryCardProps = {
  categoryName: string;
  productCount: number;
  coverImageUrl?: string;
  onPress: () => void;
};

export function CategoryCard({
  categoryName,
  productCount,
  coverImageUrl,
  onPress,
}: CategoryCardProps) {
  const formattedImageUrl = coverImageUrl?.startsWith("http")
    ? coverImageUrl
    : coverImageUrl
      ? `${DOMAIN}${coverImageUrl}`
      : undefined;

  return (
    <Pressable
      style={styles.cardWrapper}
      onPress={onPress}
      android_ripple={{ color: "#e0e0e0" }}
    >
      <View style={styles.card}>
        <View style={styles.categoryImageContainer}>
          {formattedImageUrl ? (
            <Image
              source={{ uri: formattedImageUrl }}
              style={styles.categoryImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.categoryImagePlaceholder}>
              <Ionicons name="albums-outline" size={32} color="#9ca3af" />
            </View>
          )}
        </View>

        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName} numberOfLines={1}>
            {categoryName}
          </Text>
          <Text style={styles.categoryCount}>{productCount} รายการ</Text>
        </View>
      </View>
    </Pressable>
  );
}

// ========================================
// Styles
// ========================================

const styles = StyleSheet.create({
  cardWrapper: {
    width: CARD_WIDTH,
    marginBottom: 16,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },


  // Category Card Styles
  categoryImageContainer: {
    width: "100%",
    height: 120,
    backgroundColor: "#f9fafb",
  },
  categoryImage: {
    width: "100%",
    height: "100%",
  },
  categoryImagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  categoryInfo: {
    padding: 12,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 12,
    color: "#6b7280",
  },
});