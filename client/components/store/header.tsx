// components/store/StoreHeader.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Box, Text } from "native-base";
import React from "react";
import { Image, Pressable } from "react-native";

type StoreHeaderProps = {
  urlLogo?: string | null;
  title: string;
  rating: number;
  viewStoreRoute?: string; // route เข้าไปดูร้านทั้งหมด
  editStoreRoute?: string; // route แก้ไขชื่อร้าน / โปรไฟล์ร้าน
  chatRoute: string; // route ไปหน้าแชท
  storeId?: string;
  isStripeVerified: boolean;
  onRefreshStripe?: () => void; // ฟังก์ชันสำหรับกด refresh link
};

export default function StoreHeader({
  urlLogo,
  title,
  rating,
  viewStoreRoute,
  editStoreRoute,
  chatRoute,
  storeId,
  isStripeVerified,
  onRefreshStripe,
}: StoreHeaderProps) {
  const router = useRouter();

  const handlePressStore = () => {
    if (!viewStoreRoute) return;
    router.push(viewStoreRoute as any);
  };

  const handleEditStore = () => {
    if (!editStoreRoute) return;
    router.push({
      pathname: editStoreRoute,
      params: { storeId, storeName: title, logoUrl: urlLogo },
    } as any);
  };

  return (
    <Box bg="#f5e9ff" px={4} pt={3} pb={3}>
      <Pressable onPress={handlePressStore}>
        <Box flexDirection="row" alignItems="center">
          {/* โลโก้ร้าน */}
          <Box
            width={20}
            height={20}
            borderRadius={999}
            overflow="hidden"
            bg="gray.200"
          >
            {urlLogo ? (
              <Image
                source={{ uri: urlLogo }}
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <Box flex={1} alignItems="center" justifyContent="center">
                <Ionicons name="storefront-outline" size={26} color="#a855f7" />
              </Box>
            )}
          </Box>

          {/* ข้อมูลร้าน */}
          <Box flex={1} ml={3}>
            <Box flexDirection="row" alignItems="center">
              <Text fontWeight="bold" fontSize="md" numberOfLines={1}>
                {title || "ร้านของฉัน"}
              </Text>

              {/* ปุ่มแก้ไขชื่อร้าน */}
              <Pressable
                onPress={handleEditStore}
                style={{ marginLeft: 6, padding: 2 }}
              >
                <Ionicons name="create-outline" size={16} color="#6d28d9" />
              </Pressable>
            </Box>

            <Box flexDirection="row" alignItems="center" mt={1}>
              <Ionicons name="star" size={14} color="#facc15" />
              <Text fontSize="xs" ml={1}>
                {rating?.toFixed(1) ?? "0.0"}
              </Text>
            </Box>

            {/* สถานะ Stripe */}
            <Box flexDirection="row" alignItems="center" mt={1}>
              {isStripeVerified ? (
                <>
                  <Ionicons name="shield-checkmark" size={14} color="#22c55e" />
                  <Text fontSize="xs" ml={1} color="green.600">
                    ยืนยัน Stripe แล้ว
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="warning" size={14} color="#f97316" />
                  <Text fontSize="xs" ml={1} color="orange.600">
                    ยังไม่ได้ยืนยัน Stripe
                  </Text>
                  {/* ปุ่มสำหรับกด refresh link */}
                  <Pressable
                    onPress={onRefreshStripe}
                    style={{
                      marginLeft: 8,
                      backgroundColor: "#fef2f2",
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 999,
                    }}
                  >
                    <Text fontSize="xs" color="red.600" fontWeight="bold">
                      ยืนยันตัวตน
                    </Text>
                  </Pressable>
                </>
              )}
            </Box>
          </Box>

          {/* ปุ่มแชทร้าน */}
          {/* <ChatButton route={chatRoute} /> */}
        </Box>
      </Pressable>
    </Box>
  );
}

// components/header.tsx
import { ProductDetailDto } from "@/api/products";
import { Avatar, Button, HStack, Menu } from "native-base";
import { View } from "react-native";

type ProductHeaderProps = {
  product: ProductDetailDto;
  onPressTryOn: () => void;
  onPressAddToCart: () => void;
};

type StoreHeaderProductDetailProps = {
  product: ProductDetailDto;
  onPressViewStore: () => void;
  onPressChat: () => void;
  onPressReport?: () => void; // 🆕 เพิ่ม callback สำหรับรายงาน
};

// แยกฟังก์ชันคำนวณส่วนลดให้แก้ logic ได้ง่าย
export function calculateDiscount(
  basePrice: number,
  originalPrice?: number,
): { originalPrice?: number; discountPercent?: number } {
  if (!originalPrice || originalPrice <= basePrice) {
    return { originalPrice: undefined, discountPercent: undefined };
  }
  const percent = Math.round(
    ((originalPrice - basePrice) / originalPrice) * 100,
  );
  return { originalPrice, discountPercent: percent };
}

export const ProductHeader: React.FC<ProductHeaderProps> = ({
  product,
  onPressTryOn,
  onPressAddToCart,
}) => {
  const { originalPrice, discountPercent } = calculateDiscount(
    product.basePrice,
    product.originalPrice,
  );

  return (
    <Box px={4} py={3} bg="white">
      <Text
        fontSize="md"
        fontWeight="600"
        numberOfLines={2}
        ellipsizeMode="tail"
        mb={2}
      >
        {product.productName}
      </Text>

      <HStack alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <HStack alignItems="baseline" space={2}>
            <Text fontSize="lg" fontWeight="700" color="#8b5cf6">
              ฿{product.basePrice.toFixed(0)}
            </Text>
            {originalPrice && (
              <Text
                fontSize="sm"
                color="gray.400"
                style={{ textDecorationLine: "line-through" }}
              >
                ฿{originalPrice.toFixed(0)}
              </Text>
            )}
            {discountPercent && (
              <Text fontSize="xs" color="red.500">
                -{discountPercent}%
              </Text>
            )}
          </HStack>
        </Box>

        {/* ปุ่มลองเสื้อ + เพิ่มตะกร้า แถวเดียวกันกับราคา */}
        <HStack space={2}>
          <Button
            size="sm"
            bg="#a855f7"
            _pressed={{ bg: "#9333ea" }}
            borderRadius="full"
            onPress={onPressTryOn}
          >
            ลองเสื้อ
          </Button>
          <Button
            size="sm"
            variant="outline"
            borderColor="#a855f7"
            _text={{ color: "#a855f7" }}
            borderRadius="full"
            onPress={onPressAddToCart}
          >
            ตะกร้า
          </Button>
        </HStack>
      </HStack>
    </Box>
  );
};

export const StoreHeaderProductDetail: React.FC<
  StoreHeaderProductDetailProps
> = ({
  product,
  onPressViewStore,
  onPressChat,
  onPressReport, // 🆕
}) => {
  const store = product.store;
  return (
    <Box px={4} py={3} bg="white" mt={2}>
      <Text fontSize="sm" fontWeight="600" mb={2}>
        ร้านค้า
      </Text>

      <HStack alignItems="center" justifyContent="space-between">
        <HStack alignItems="center" space={3}>
          <Avatar
            size="sm"
            source={store.logoPath ? { uri: store.logoPath } : undefined}
          >
            {store.name?.[0] ?? "S"}
          </Avatar>
          <Box>
            <Text fontSize="sm" fontWeight="600">
              {store.name}
            </Text>
            <Text fontSize="xs" color="gray.500">
              lorem
            </Text>
          </Box>
        </HStack>

        <HStack space={2} alignItems="center">
          <Pressable onPress={onPressViewStore}>
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: "#a855f7",
              }}
            >
              <Text fontSize="xs" color="#a855f7">
                ดูร้านค้า
              </Text>
            </View>
          </Pressable>

          <Pressable onPress={onPressChat}>
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: "#a855f7",
              }}
            >
              <Text fontSize="xs" color="white">
                แชท
              </Text>
            </View>
          </Pressable>

          {/* 🆕 Report menu button */}
          {onPressReport && (
            <Menu
              trigger={(triggerProps) => (
                <Pressable {...triggerProps} p={1}>
                  <Ionicons
                    name="ellipsis-vertical"
                    size={20}
                    color="#6B7280"
                  />
                </Pressable>
              )}
            >
              <Menu.Item onPress={onPressReport}>
                <HStack space={2} alignItems="center">
                  <Ionicons name="flag-outline" size={18} color="#EF4444" />
                  <Text>รายงานร้านค้า</Text>
                </HStack>
              </Menu.Item>
            </Menu>
          )}
        </HStack>
      </HStack>
    </Box>
  );
};

// components/description.tsx
import { useState } from "react";

type DescriptionProps = {
  text: string;
};

export const ExpandableDescription: React.FC<DescriptionProps> = ({ text }) => {
  const [expanded, setExpanded] = useState(false);

  // ใช้ numberOfLines=10 เพื่อแสดงสูงสุด 10 บรรทัดก่อนตัด "..."
  // ถ้าอยากดูทั้งหมดก็กดปุ่ม → expanded=true → เอา numberOfLines ออก
  const shouldShowReadMore = text && text.length > 0;

  return (
    <Box px={4} py={3} bg="white" mt={2}>
      <Text
        style={{ fontSize: 14, color: "#374151" }}
        numberOfLines={expanded ? undefined : 10}
        ellipsizeMode="tail"
      >
        {text}
      </Text>

      {shouldShowReadMore && (
        <Pressable
          onPress={() => setExpanded((prev) => !prev)}
          style={{ marginTop: 8 }}
        >
          <Text style={{ fontSize: 12, color: "#7c3aed" }}>
            {expanded ? "ย่อ" : "ดูเพิ่มเติม"}
          </Text>
        </Pressable>
      )}
    </Box>
  );
};
