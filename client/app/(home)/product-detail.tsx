// app/(home)/product-detail.tsx

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Box, Text } from "native-base";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  View,
} from "react-native";

import { addToCart, getCartSummary } from "@/api/cart";
import { chatAPI } from "@/api/chat";
import { closetApi } from "@/api/closet";
import {
  getProductDetail,
  ProductDetailDto,
  ProductVariantDto,
} from "@/api/products";
import { createReport } from "@/api/report";
import { toggleWishlist } from "@/api/wishlist";
import { IconWithBadge } from "@/components/icon";
import {
  ProductMainImage,
  ProductThumbnailStrip,
} from "@/components/product/image-selector";
import ReportModal from "@/components/report/report-modal";
import { ReviewPreviewSection } from "@/components/review/header";
import {
  ExpandableDescription,
  ProductHeader,
  StoreHeaderProductDetail,
} from "@/components/store/header";
import { ModalMode, VariantSelectModal } from "@/components/variant/modal";
import { getToken } from "@/utils/secure-store";

export default function ProductDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; productId?: string }>();
  const productId = (params.productId || params.id) as string | undefined;

  const [product, setProduct] = useState<ProductDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("add_to_cart");

  const [cartCount, setCartCount] = useState(0);

  const [isWishlisted, setIsWishlisted] = useState(false);

  // 🆕 Report modal state
  const [reportModalVisible, setReportModalVisible] = useState(false);

  const loadCartCount = async () => {
    try {
      const summary = await getCartSummary();
      setCartCount(summary.itemCount);
    } catch (e) {
      console.log("load cart summary error", e);
    }
  };

  useEffect(() => {
    if (!productId) return;

    const fetchDetail = async () => {
      try {
        const detail = await getProductDetail(productId);
        detail.images.sort((a, b) => a.displayOrder - b.displayOrder);
        setProduct(detail);
        setIsWishlisted(detail.isWishlisted ?? false); // เพิ่มบรรทัดนี้
        console.log("[ProductDetail] isWishlisted =", detail.isWishlisted); // เพิ่ม
      } catch (e) {
        console.log("load product detail error", e);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
    loadCartCount();
  }, [productId]);

  // ✅ helper: เช็คว่ามีรูป VTON อย่างน้อย 1 รูปใน variants ไหม
  const hasAnyVtonImage = (p: ProductDetailDto | null) => {
    if (!p?.variants?.length) return false;
    return p.variants.some((v) =>
      (v.images || []).some((img) => img.imageType === "VTON"),
    );
  };

  // ✅ helper: ส่ง variants เข้า modal แบบ "ตัด NORMAL ทิ้ง" เฉพาะโหมด try_on
  const getVariantsWithVtonImagesOnly = (p: ProductDetailDto | null) => {
    if (!p?.variants?.length) return [];
    return p.variants.map((v) => ({
      ...v,
      images: (v.images || []).filter((img) => img.imageType === "VTON"),
    }));
  };

  const openVariantModal = (mode: ModalMode) => {
    // ✅ เงื่อนไขตามที่สั่ง: อยู่ในปุ่ม "ลองเสื้อ" เท่านั้น
    if (mode === "try_on") {
      if (!hasAnyVtonImage(product)) {
        Alert.alert("ลองเสื้อไม่ได้", "ร้านค้าไม่ได้เพิ่มเสื้อสำหรับลองเสื้อ");
        return;
      }
    }

    setModalMode(mode);
    setModalVisible(true);
  };

  // 🆕 Handle report store
  const handleReportStore = () => {
    if (!product?.store?.storeId) {
      Alert.alert("ข้อผิดพลาด", "ไม่พบข้อมูลร้านค้า");
      return;
    }
    setReportModalVisible(true);
  };

  // 🆕 Submit report
  const handleSubmitReport = async (data: any) => {
    if (!product?.store?.storeId) return;

    try {
      const reportData = {
        report_type: "store" as const,
        reported_id: product.store.storeId,
        reason: data.reason,
        description: data.description,
        image_urls: data.imageUrls,
      };

      await createReport(reportData);

      Alert.alert(
        "รายงานสำเร็จ",
        "ขอบคุณที่แจ้งเรา เราจะตรวจสอบและดำเนินการต่อไป",
        [
          {
            text: "ตกลง",
            onPress: () => setReportModalVisible(false),
          },
        ],
      );
    } catch (error) {
      console.error("Submit report error:", error);
      Alert.alert(
        "เกิดข้อผิดพลาด",
        "ไม่สามารถส่งรายงานได้ กรุณาลองใหม่อีกครั้ง",
      );
    }
  };

  const handleConfirmVariant = async (payload: {
    variant: ProductVariantDto;
    quantity: number;
  }) => {
    const { variant, quantity } = payload;

    if (!product) return;

    if (modalMode === "add_to_cart") {
      try {
        await addToCart({
          productId: product.productId,
          variantId: variant.variantId,
          quantity,
        });
        await loadCartCount();
      } catch (e) {
        console.log("add to cart error", e);
      } finally {
        setModalVisible(false);
      }
      return;
    }

    if (modalMode === "try_on") {
      setModalVisible(false);

      try {
        // ✅ เรียก API เพิ่มสินค้าเข้า product garments ก่อน
        console.log("📤 [TRY_ON] Adding product garment:", {
          productId: product.productId,
          variantId: variant.variantId,
        });

        await closetApi.addProductGarment(product.productId, variant.variantId);

        console.log("✅ [TRY_ON] Product garment added successfully");

        // ✅ router ไปหน้า vton แล้ว "เปิดแท็บเสื้อจากสินค้า" ทันที
        // ✅ router พร้อม refresh เพื่อให้ vton.tsx โหลดข้อมูลใหม่
        router.replace({
          pathname: "/(tabs)/vton",
          params: {
            tab: "outfit",
            outfitTab: "product",
            _refresh: Date.now().toString(), // force refresh
          },
        } as any);
      } catch (error) {
        console.error("❌ [TRY_ON] Error adding product garment:", error);
        Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถเพิ่มสินค้าเข้าตู้เสื้อได้");
      }

      return;
    }

    if (modalMode === "buy_now") {
      setModalVisible(false);
      router.push({
        pathname: "/(checkout)/checkout",
        params: {
          productId: product.productId,
          variantId: variant.variantId,
          quantity: String(quantity),
          storeId: product.store.storeId,
          storeName: product.store.name,
          unitPrice: String(variant.price ?? product.basePrice),
          productName: product.productName,
          variantName: variant.variantName ?? "",
          image_url: product.images[0]?.imageUrl || "",
        },
      } as any);
      return;
    }
  };

  if (loading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <ActivityIndicator />
        <Text mt={2}>กำลังโหลดสินค้า...</Text>
      </Box>
    );
  }

  if (!product) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <Text>ไม่พบสินค้า</Text>
      </Box>
    );
  }

  const variantsForModal =
    modalMode === "try_on"
      ? getVariantsWithVtonImagesOnly(product)
      : product.variants;

  return (
    <Box flex={1} bg="#f3f4f6">
      <StatusBar style="light" backgroundColor="#4c1d95" />
      <Box safeAreaTop bg="violet.600" />

      {/* overlay ปุ่มบนสุด */}
      <View
        style={{
          position: "absolute",
          top: 15,
          left: 0,
          right: 0,
          zIndex: 20,
          paddingTop: 32,
          paddingHorizontal: 16,
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            backgroundColor: "rgba(0,0,0,0.4)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="arrow-back" size={18} color="#fff" />
        </Pressable>

        <View style={{ flexDirection: "row" }}>
          <Pressable
            onPress={() => router.push({ pathname: "/(cart)/cart" } as any)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              backgroundColor: "rgba(0,0,0,0.4)",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 8,
            }}
          >
            <IconWithBadge
              count={cartCount}
              icon={
                <Ionicons
                  onPress={() => router.push("/(cart)/cart")}
                  name="cart-outline"
                  size={20}
                  color="#fff"
                />
              }
            />
          </Pressable>

          <Pressable
            onPress={async () => {
              setIsWishlisted((prev) => !prev); // optimistic
              try {
                const token = await getToken();
                if (token && productId) {
                  const result = await toggleWishlist(token, productId);
                  setIsWishlisted(result.status === "added");
                }
              } catch (err) {
                setIsWishlisted((prev) => !prev); // rollback
                console.error("Toggle wishlist error:", err);
              }
            }}
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              backgroundColor: "rgba(0,0,0,0.4)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={isWishlisted ? "heart" : "heart-outline"}
              size={18}
              color={isWishlisted ? "#FF4D4D" : "#fff"}
            />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ภาพสินค้า */}
        <ProductMainImage
          images={product.images}
          selectedIndex={selectedImageIndex}
          onChangeIndex={(idx) => setSelectedImageIndex(idx)}
        />

        <ProductThumbnailStrip
          images={product.images}
          selectedIndex={selectedImageIndex}
          onSelect={(idx) => setSelectedImageIndex(idx)}
        />

        {/* หัวข้อ + ราคา + ปุ่มลองเสื้อ/ตะกร้า */}
        <ProductHeader
          product={product}
          onPressAddToCart={() => openVariantModal("add_to_cart")}
          onPressTryOn={() => openVariantModal("try_on")}
        />

        {/* ร้านค้า + แชท + 🆕 รายงาน */}
        <StoreHeaderProductDetail
          product={product}
          onPressViewStore={() =>
            router.push({
              pathname: "/(home)/store-detail",
              params: { storeId: product.store.storeId },
            } as any)
          }
          onPressChat={async () => {
            try {
              const conv = await chatAPI.createOrGetConversation(
                product.store.storeId,
              );

              router.push({
                pathname: "/(chat)/chat",
                params: {
                  conversationId: conv.conversation_id,
                  storeName: conv.store_name ?? product.store.name ?? "ร้านค้า",
                  storeId: product.store.storeId,
                },
              } as any);
            } catch (e) {
              console.log("[ProductDetail] open chat error", e);
              Alert.alert("ข้อผิดพลาด", "ไม่สามารถเปิดแชทได้");
            }
          }}
          onPressReport={handleReportStore} // 🆕
        />

        {/* รีวิวตัวอย่าง + ปุ่มดูทั้งหมด */}
        <ReviewPreviewSection
          productId={product.productId}
          bestReview={product.bestReview}
          reviewCount={product.reviewCount}
        />

        {/* คำอธิบายสินค้า */}
        <ExpandableDescription text={product.description ?? ""} />
      </ScrollView>

      {/* ปุ่มซื้อเลยด้านล่าง */}
      <Box
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        bg="white"
        p={4}
        borderTopWidth={1}
        borderColor="#e5e7eb"
      >
        <Pressable
          onPress={() => openVariantModal("buy_now")}
          style={{
            backgroundColor: "#7c3aed",
            borderRadius: 999,
            paddingVertical: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>ซื้อเลย</Text>
        </Pressable>
      </Box>

      {/* modal เลือก variant ใช้ร่วม 3 โหมด */}
      <VariantSelectModal
        visible={modalVisible}
        mode={modalMode}
        variants={variantsForModal}
        onClose={() => setModalVisible(false)}
        onConfirm={handleConfirmVariant}
      />

      {/* 🆕 Report Modal */}
      {product?.store && (
        <ReportModal
          visible={reportModalVisible}
          onClose={() => setReportModalVisible(false)}
          onSubmit={handleSubmitReport}
          reportType="store"
          reportedId={product.store.storeId}
          reportedName={product.store.name}
        />
      )}
    </Box>
  );
}
