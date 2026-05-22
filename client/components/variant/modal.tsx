// components/modal.tsx
import { ProductVariantDto } from "@/api/products";
import { Box, Text } from "native-base";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

export type ModalMode = "add_to_cart" | "try_on" | "buy_now";

type VariantSelectModalProps = {
  visible: boolean;
  mode: ModalMode;
  variants: ProductVariantDto[];
  onClose: () => void;
  onConfirm: (result: { variant: ProductVariantDto; quantity: number }) => void;
};

export const VariantSelectModal: React.FC<VariantSelectModalProps> = ({
  visible,
  mode,
  variants,
  onClose,
  onConfirm,
}) => {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null,
  );
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    if (visible) {
      setSelectedVariantId(null);
      setQuantity(1);
    }
  }, [visible, mode]);

  const selectedVariant =
    variants.find((v) => v.variantId === selectedVariantId) ?? null;

  const title = useMemo(() => {
    switch (mode) {
      case "add_to_cart":
        return "เลือกตัวเลือกสินค้าเพื่อเพิ่มลงตะกร้า";
      case "try_on":
        return "เลือกตัวเลือกเพื่อทดลองลองเสื้อ";
      case "buy_now":
        return "เลือกตัวเลือกเพื่อซื้อเลย";
      default:
        return "เลือกตัวเลือกสินค้า";
    }
  }, [mode]);

  const buttonLabel = useMemo(() => {
    switch (mode) {
      case "add_to_cart":
        return "เพิ่มลงตะกร้า";
      case "try_on":
        return "ลองเสื้อ";
      case "buy_now":
        return "ซื้อเลย";
      default:
        return "ยืนยัน";
    }
  }, [mode]);

  const showQuantityControls = mode === "add_to_cart" || mode === "buy_now"; // ❗ try_on ไม่ต้องมีจำนวน

  const unitPrice = selectedVariant?.price ?? 0;
  const maxStock =
    selectedVariant && typeof selectedVariant.stock === "number"
      ? selectedVariant.stock
      : undefined;

  const safeQuantity =
    maxStock != null ? Math.min(quantity, maxStock) : quantity;
  const totalPrice = unitPrice * safeQuantity;

  const previewImageUrl = selectedVariant?.images?.[0]?.imageUrl ?? undefined;

  // ❗ ต้องเลือก variant ก่อนถึงจะกด +/- ได้
  const guardSelectVariant = () => {
    if (!selectedVariant) {
      Alert.alert("กรุณาเลือกตัวเลือกสินค้า", "โปรดเลือกตัวเลือกก่อนปรับจำนวน");
      return false;
    }
    return true;
  };

  const handleDecrease = () => {
    if (!guardSelectVariant()) return;
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  };

  const handleIncrease = () => {
    if (!guardSelectVariant()) return;

    setQuantity((prev) => {
      const next = prev + 1;
      if (maxStock != null && next > maxStock) {
        Alert.alert(
          "จำนวนเกินสต็อก",
          `คงเหลือ ${maxStock} ชิ้น ไม่สามารถเพิ่มเกินนี้ได้`,
        );
        return prev;
      }
      return next;
    });
  };

  const handleConfirm = () => {
    if (!selectedVariant) {
      Alert.alert(
        "กรุณาเลือกตัวเลือกสินค้า",
        "โปรดเลือกอย่างน้อย 1 ตัวเลือกก่อน",
      );
      return;
    }

    // กันกรณี front bug หรือ stock เปลี่ยนระหว่างกด
    if (showQuantityControls && maxStock != null && safeQuantity > maxStock) {
      Alert.alert("สต็อกไม่พอ", `สต็อกคงเหลือ ${maxStock} ชิ้น โปรดลดจำนวนลง`);
      return;
    }

    onConfirm({
      variant: selectedVariant,
      quantity: showQuantityControls ? safeQuantity : 1,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />

        <View style={styles.sheet}>
          {/* Header + preview */}
          <Box px={4} pt={3} pb={2}>
            <Text fontSize="md" fontWeight="600" mb={2}>
              {title}
            </Text>

            <Box flexDirection="row" alignItems="center">
              <Box
                width={60}
                height={60}
                borderRadius={8}
                overflow="hidden"
                bg="#e5e7eb"
                mr={3}
              >
                {previewImageUrl ? (
                  <Image
                    source={{ uri: previewImageUrl }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={{
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 11, color: "#6b7280" }}>
                      ไม่มีรูป
                    </Text>
                  </View>
                )}
              </Box>

              <Box flex={1}>
                <Text
                  numberOfLines={2}
                  style={{ fontSize: 13, fontWeight: "600", color: "#111827" }}
                >
                  {selectedVariant?.variantName || "ยังไม่ได้เลือกตัวเลือก"}
                </Text>
                {selectedVariant && (
                  <Text
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      color: "#6b7280",
                    }}
                  >
                    ราคา ฿{selectedVariant.price.toFixed(0)}
                  </Text>
                )}
                {maxStock != null && (
                  <Text
                    style={{
                      marginTop: 2,
                      fontSize: 11,
                      color: "#6b7280",
                    }}
                  >
                    สต็อกคงเหลือ {maxStock} ชิ้น
                  </Text>
                )}
              </Box>
            </Box>
          </Box>

          {/* Grid 2 คอลัมน์สำหรับเลือก variant */}
          <ScrollView
            style={{ maxHeight: 260 }}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 12,
            }}
          >
            <View style={styles.grid}>
              {variants.map((v) => {
                const isActive = v.variantId === selectedVariantId;
                const isOutOfStock =
                  typeof v.stock === "number" && v.stock === 0; // ← เพิ่ม

                return (
                  <Pressable
                    key={v.variantId}
                    onPress={() => {
                      if (isOutOfStock) return; // ← กันกด
                      setSelectedVariantId(v.variantId);
                    }}
                    style={[
                      styles.variantCard,
                      isActive && styles.variantCardActive,
                      isOutOfStock && styles.variantCardDisabled, // ← เพิ่ม style
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: isOutOfStock
                          ? "#d1d5db"
                          : isActive
                            ? "#4c1d95"
                            : "#111827", // ← เปลี่ยนสี
                      }}
                      numberOfLines={2}
                    >
                      {v.variantName}
                    </Text>

                    <Text
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        color: isOutOfStock
                          ? "#d1d5db"
                          : isActive
                            ? "#6d28d9"
                            : "#4b5563",
                      }}
                    >
                      ฿{v.price.toFixed(0)}
                    </Text>

                    {typeof v.stock === "number" && (
                      <Text
                        style={{
                          marginTop: 2,
                          fontSize: 11,
                          color: isOutOfStock ? "#ef4444" : "#6b7280", // ← แดงเมื่อหมด
                        }}
                      >
                        {isOutOfStock ? "สินค้าหมด" : `คงเหลือ ${v.stock} ชิ้น`}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* qty + total เฉพาะ add_to_cart / buy_now */}
          {showQuantityControls && (
            <Box px={4} pb={2}>
              <Box
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
                mb={2}
              >
                <Box flexDirection="row" alignItems="center">
                  <Pressable onPress={handleDecrease} style={styles.qtyButton}>
                    <Text style={{ fontSize: 18, color: "#4b5563" }}>-</Text>
                  </Pressable>
                  <Text
                    style={{
                      marginHorizontal: 16,
                      fontSize: 16,
                      fontWeight: "600",
                    }}
                  >
                    {safeQuantity}
                  </Text>
                  <Pressable onPress={handleIncrease} style={styles.qtyButton}>
                    <Text style={{ fontSize: 18, color: "#4b5563" }}>+</Text>
                  </Pressable>
                </Box>

                <Box alignItems="flex-end">
                  <Text style={{ fontSize: 11, color: "#6b7280" }}>รวมยอด</Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: "#7c3aed",
                    }}
                  >
                    ฿{totalPrice.toFixed(0)}
                  </Text>
                </Box>
              </Box>
            </Box>
          )}

          <Box px={4} pb={4} pt={2}>
            <Pressable
              onPress={handleConfirm}
              style={[
                styles.primaryButton,
                !selectedVariant && { opacity: 0.7 },
              ]}
            >
              <Text
                style={{
                  color: "white",
                  fontWeight: "600",
                  fontSize: 15,
                }}
              >
                {buttonLabel}
              </Text>
            </Pressable>
          </Box>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  variantCard: {
    width: "50%",
    padding: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 8,
  },
  variantCardActive: {
    borderColor: "#8b5cf6",
    backgroundColor: "#f5f3ff",
  },
  primaryButton: {
    backgroundColor: "#7c3aed",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  qtyButton: {
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  variantCardDisabled: {
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    opacity: 0.6,
  },
});
