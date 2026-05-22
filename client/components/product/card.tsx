import { DOMAIN } from "@/้host";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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

type ProductCardProps = {
  productId: string;
  title: string;
  price: number;
  star: number;
  imageUrl?: string;
  route: string;
  isSeller?: boolean;
  onToggleFavorite?: () => void;
  isActive?: boolean; // true=กำลังขาย, false=ปิดการขาย
  onCloseSale?: () => void; // ปิดการขาย
  onOpenSale?: () => void; // เปิดการขาย
  categoryName?: string;
  isWishlisted?: boolean; // ✅ สถานะว่าอยู่ใน wishlist หรือไม่
};

function EditIconButton({ route }: { route: string }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={(e) => {
        e.stopPropagation();
        if (!route) return;
        router.replace(route as any);
      }}
      style={styles.editButton}
    >
      <Ionicons name="create-outline" size={18} color="white" />
    </Pressable>
  );
}

export default function ProductCard({
  productId,
  title,
  price,
  star,
  imageUrl,
  route,
  isSeller = false,
  onToggleFavorite,
  isActive = true,
  onCloseSale,
  onOpenSale,
  categoryName,
  isWishlisted = false, // ✅ รับค่า default เป็น false
}: ProductCardProps) {
  const router = useRouter();

  const handlePressCard = () => {
  if (!isSeller) {
      if (route) {
      router.push(route as any);
    } else {
      router.push({
        pathname: `/(store)/add-product?productId=${productId}`,
      } as any);
    }
  };
  }

  // Format image URL
  const formattedImageUrl = imageUrl?.startsWith("http")
    ? imageUrl
    : imageUrl
      ? `${DOMAIN}${imageUrl}`
      : undefined;

  return (
    <Pressable
      style={styles.cardWrapper}
      onPress={handlePressCard}
      android_ripple={{ color: "#e0e0e0" }}
    >
      <View style={styles.card}>
        {/* Image Container */}
        <View style={styles.imageContainer}>
          {formattedImageUrl ? (
            <Image
              source={{ uri: formattedImageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={40} color="#d1d5db" />
            </View>
          )}

          {/* Inactive Badge */}
          {!isActive && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>ปิดการขาย</Text>
            </View>
          )}

          {/* Action Buttons (Top Right) */}
          <View style={styles.actionButtons}>
            {/* Wishlist/Heart Button - แสดงสำหรับ buyer เท่านั้น */}
            {!isSeller && onToggleFavorite && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onToggleFavorite();
                }}
                style={styles.iconButton}
              >
                <Ionicons
                  name={isWishlisted ? "heart" : "heart-outline"}
                  size={18}
                  color={isWishlisted ? "#ef4444" : "#6b7280"}
                />
              </Pressable>
            )}

            {/* Seller Actions */}
            {isSeller && (
              <>
                {isActive
                  ? onCloseSale && (
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          onCloseSale();
                        }}
                        style={styles.iconButton}
                      >
                        <Ionicons
                          name="ban-outline"
                          size={18}
                          color="#6b7280"
                        />
                      </Pressable>
                    )
                  : onOpenSale && (
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          onOpenSale();
                        }}
                        style={styles.iconButton}
                      >
                        <Ionicons
                          name="refresh-outline"
                          size={18}
                          color="#6b7280"
                        />
                      </Pressable>
                    )}
                <EditIconButton route={route} />
              </>
            )}
          </View>
        </View>

        {/* Product Info */}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
            {title}
          </Text>

          <View style={styles.footer}>
            <Text style={styles.price}>฿{price.toLocaleString()}</Text>
            {star > 0 && (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color="#fbbf24" />
                <Text style={styles.ratingText}>{star.toFixed(1)}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    width: CARD_WIDTH,
    marginBottom: 16,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 3,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },

  // Image Styles
  imageContainer: {
    width: "100%",
    height: CARD_WIDTH,
    position: "relative",
    backgroundColor: "#f9fafb",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  // Inactive Badge
  inactiveBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  inactiveBadgeText: {
    color: "white",
    fontSize: 11,
    fontWeight: "bold",
  },

  // Action Buttons (Top Right)
  actionButtons: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    gap: 6,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#8b5cf6",
    justifyContent: "center",
    alignItems: "center",
  },

  // Product Info
  info: {
    padding: 12,
    gap: 8,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#ede9fe",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#7c3aed",
  },
  title: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
    minHeight: 36,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  price: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#8b5cf6",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
  },
});
