// app/store/add-product.tsx
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Box, Text } from "native-base";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
} from "react-native";

import { Category, fetchPublicCategories } from "@/api/category";
import { AppBarNoCheck } from "@/components/navbar";
import PreviewModal from "@/components/preview-modal";
import { UnifiedRow } from "@/components/product/addproduct-form";
import { AddProductForm, FormImagesField } from "@/components/product/form";
import { VariantOption } from "@/types/variant";
import { getToken } from "@/utils/secure-store";
import { DOMAIN } from "@/้host";
import type { VariantOptionExtended } from "./options";
import axios from "axios";

// =========================
// CONFIG
// =========================
const API_BASE_URL = `${DOMAIN}`;
const IMAGE_UPLOAD_URL = `${API_BASE_URL}/images/upload`;
const PRODUCT_API_BASE = `${API_BASE_URL}/products`;

// =========================
// TYPE
// =========================

type VariantState = {
  variantName: string;
  enableImages: boolean;
  options: (VariantOption & {
    displayImageId?: string;
    tryOnImageId?: string;
    displayImageUri?: string;
    tryOnImageUri?: string;
    priceDelta?: number;
    stock?: number;
  })[];
};

type ProductImageItem = {
  localUri: string;
  remoteUrl?: string;
  imageId?: string;
  isMain?: boolean;
  displayOrder?: number;
};

type UploadResponseData = {
  image_id: string;
  url: string;
};

async function uploadImageFile(
  uri: string,
  imageType: "NORMAL" | "VTON",
): Promise<UploadResponseData> {
  console.log("[IMAGE] uploadImageFile called:", { uri, imageType });

  const token = await getToken();
  console.log("[IMAGE] token:", !!token ? "HAS_TOKEN" : "NO_TOKEN");
  console.log("[IMAGE] upload URL:", IMAGE_UPLOAD_URL);

  const fileName = uri.split("/").pop() || "image.jpg";
  const ext = fileName.split(".").pop()?.toLowerCase();
  const mimeType =
    ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

  const formData = new FormData();
  formData.append("file", { uri, name: fileName, type: mimeType } as any);
  formData.append("image_type", imageType);

  console.log("[IMAGE] about to axios.post");

  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    console.log("[IMAGE] file info:", fileInfo);
    const res = await axios.post(IMAGE_UPLOAD_URL, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
        "Connection": "close", // ← เพิ่มอันนี้
      },
    });
    console.log("[IMAGE] success:", res.data);
    return res.data.data as UploadResponseData;
  } catch (e: any) {
    console.log("[IMAGE] error status:", e?.response?.status);
    console.log("[IMAGE] error data:", e?.response?.data);
    console.log("[IMAGE] error message:", e?.message);
    throw e;
  }
}

export default function AddProductScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    categoryId?: string; // 🆕 slug / uuid
    categoryName?: string;
    productId?: string;
    productName?: string;
    productDesc?: string;
    minBuy?: string;
    variant?: string;
    images?: string;
  }>();

  const productId = params.productId ? String(params.productId) : undefined;

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [minBuy, setMinBuy] = useState("");

  const [productImages, setProductImages] = useState<ProductImageItem[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUri, setPreviewUri] = useState("");
  const [previewIndex, setPreviewIndex] = useState(0);

  const [categoryId, setCategoryId] = useState<string | null>(null); // 🆕
  const [categoryName, setCategoryName] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);

  const [variant, setVariant] = useState<VariantState | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const imageUris = useMemo(
    () =>
      productImages
        .map((img) => img.localUri || img.remoteUrl || "")
        .filter(Boolean),
    [productImages],
  );

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await fetchPublicCategories();
      setCategories(data);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  const navigateBackToStore = () => {
    router.replace("/store/mystore");
  };

  const handleBackPress = () => {
    if (!isDirty) {
      navigateBackToStore();
      return;
    }

    Alert.alert("ยืนยัน", "คุณแน่ใจที่จะละทิ้งข้อมูลไหม", [
      {
        text: "อยู่ต่อ",
        style: "cancel",
      },
      {
        text: "ละทิ้ง",
        style: "destructive",
        onPress: () => {
          setIsDirty(false);
          navigateBackToStore();
        },
      },
    ]);
  };

  useEffect(() => {
    const onBackPress = () => {
      handleBackPress();
      return true;
    };

    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [isDirty, router]);

  // initial from params
  useEffect(() => {
    if (params.productName !== undefined) {
      setName(String(params.productName));
    }
    if (params.productDesc !== undefined) {
      setDesc(String(params.productDesc));
    }
    if (params.minBuy !== undefined) {
      setMinBuy(String(params.minBuy));
    }
    if (params.categoryName !== undefined) {
      setCategoryName(String(params.categoryName));
    }
    if (params.categoryId !== undefined) {
      setCategoryId(String(params.categoryId)); // 🆕
    }

    if (params.images) {
      try {
        const parsed = JSON.parse(String(params.images)) as ProductImageItem[];
        if (Array.isArray(parsed)) {
          setProductImages(parsed);
        }
      } catch (e) {
        console.log("parse images from params error", e);
      }
    }
  }, [
    params.productName,
    params.productDesc,
    params.minBuy,
    params.categoryName,
    params.categoryId,
    params.images,
  ]);

  // variant from params
  useEffect(() => {
    if (!params.variant) return;

    try {
      const v = JSON.parse(String(params.variant));
      const parsed: VariantState = {
        variantName: v.variantName || "",
        enableImages: !!v.enableImages,
        options: Array.isArray(v.options)
          ? (v.options as VariantOptionExtended[])
          : [],
      };
      setVariant(parsed);
      setIsDirty(true);
    } catch (e) {
      console.log("parse variant error", e);
    }
  }, [params.variant]);

  // load product (edit mode)
  useEffect(() => {
    if (!productId) return;

    if (params.variant) {
      console.log(
        "AddProduct: skip fetchProduct because params.variant exists (ใช้ state จาก options)",
      );
      return;
    }

    const fetchProduct = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${PRODUCT_API_BASE}/${productId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          console.log("get product error status:", res.status);
          return;
        }

        const json = await res.json();
        const data = json.data;

        setName(data.product_name || "");
        setDesc(data.description || "");
        if (typeof data.base_price !== "undefined") {
          setMinBuy(String(data.base_price));
        }

        // ถ้า backend ยังส่งมาแค่ชื่อหมวด ให้ map เองภายหลัง
        setCategoryName(data.category || "");
        // ถ้าในอนาคต backend ส่ง category_id มาด้วย ค่อย map ลง state ตรงนี้
        if (data.category_id) {
          setCategoryId(String(data.category_id));
        }

        if (Array.isArray(data.images)) {
          const mapped: ProductImageItem[] = data.images.map((img: any) => {
            const imageId = String(img.image_id);
            const fullUrl = `${API_BASE_URL}/images/stream/${imageId}`;
            return {
              localUri: fullUrl,
              remoteUrl: fullUrl,
              imageId,
              isMain: !!img.is_main,
              displayOrder:
                typeof img.display_order === "number" ? img.display_order : 0,
            };
          });

          mapped.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
          setProductImages(mapped);
        }

        if (Array.isArray(data.variants) && data.variants.length > 0) {
          const variantNameFromBackend = data.variant_name || "ตัวเลือก";
          const basePrice = data.base_price ?? 0;

          const optionsFromBackend: VariantState["options"] = data.variants.map(
            (v: any) => {
              const name = v.name_option || v.sku || "ตัวเลือกไม่ระบุชื่อ";

              let displayImageUri: string | undefined;
              let displayImageId: string | undefined;
              let tryOnImageUri: string | undefined;
              let tryOnImageId: string | undefined;

              if (Array.isArray(v.images)) {
                const normal = v.images.find(
                  (img: any) => img.image_type === "NORMAL",
                );
                const vton = v.images.find(
                  (img: any) => img.image_type === "VTON",
                );

                if (normal) {
                  const urlPath = normal.image_url as string;
                  const fullUrl = urlPath.startsWith("http")
                    ? urlPath
                    : `${API_BASE_URL}${urlPath}`;
                  displayImageUri = fullUrl;
                  displayImageId = String(normal.image_id);
                }

                if (vton) {
                  const urlPath = vton.image_url as string;
                  const fullUrl = urlPath.startsWith("http")
                    ? urlPath
                    : `${API_BASE_URL}${urlPath}`;
                  tryOnImageUri = fullUrl;
                  tryOnImageId = String(vton.image_id);
                }
              }

              const fullPrice =
                typeof v.price === "number" ? v.price : basePrice;
              const priceDelta = typeof fullPrice === "number" ? fullPrice : 0;

              //  - basePrice

              return {
                id: String(v.variant_id),
                name,
                displayImageUri,
                tryOnImageUri,
                displayImageId,
                tryOnImageId,
                priceDelta,
                stock: typeof v.stock === "number" ? v.stock : undefined,
              };
            },
          );

          const enableImages = optionsFromBackend.some(
            (opt) => !!opt.tryOnImageUri,
          );

          setVariant({
            variantName: variantNameFromBackend,
            enableImages,
            options: optionsFromBackend,
          });
        }
      } catch (err) {
        console.error("fetch product error", err);
      }
    };

    fetchProduct();
  }, [productId, params.variant]);

  // IMAGE HANDLERS เหมือนเดิม ↓ (ไม่แตะ)
  const openPreview = (uri: string, index: number) => {
    setPreviewUri(uri);
    setPreviewIndex(index);
    setPreviewVisible(true);
  };
const addImages = async () => {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("ต้องอนุญาตให้เข้าถึงรูปภาพ");
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (result.canceled || !result.assets?.length) return;

  const localUri = result.assets[0].uri;

  // เพิ่ม placeholder ก่อน
  const tempId = `temp_${Date.now()}`;
  setProductImages((prev) => [
    ...prev,
    { localUri, remoteUrl: undefined, imageId: undefined },
  ]);
  setIsDirty(true);

  try {
    const uploaded = await uploadImageFile(localUri, "NORMAL");
    setProductImages((prev) => {
      const copy = [...prev];
      const idx = copy.findIndex((p) => p.localUri === localUri && !p.imageId);
      if (idx === -1) return copy;
      copy[idx] = {
        ...copy[idx],
        remoteUrl: `${API_BASE_URL}${uploaded.url}`,
        imageId: uploaded.image_id,
      };
      return copy;
    });
  } catch (e: any) {
    // ลบ placeholder ออกเพราะ upload ไม่สำเร็จ
    setProductImages((prev) =>
      prev.filter((p) => !(p.localUri === localUri && !p.imageId))
    );
    Alert.alert(
      "อัปโหลดรูปภาพไม่สำเร็จ",
      e?.message || "กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่อีกครั้ง",
    );
  }
};

const editImage = async (index: number) => {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (result.canceled) return;

  const localUri = result.assets[0].uri;

  // เก็บของเดิมไว้ก่อนในกรณี upload ล้มเหลว
  const previousImage = productImages[index];

  setProductImages((prev) => {
    const copy = [...prev];
    if (!copy[index]) return copy;
    copy[index] = { ...copy[index], localUri, remoteUrl: undefined, imageId: undefined };
    return copy;
  });
  setIsDirty(true);

  try {
    const uploaded = await uploadImageFile(localUri, "NORMAL");
    setProductImages((prev) => {
      const copy = [...prev];
      if (!copy[index]) return copy;
      copy[index] = {
        ...copy[index],
        remoteUrl: uploaded.url,
        imageId: uploaded.image_id,
      };
      return copy;
    });
  } catch (e: any) {
    // คืนค่าเดิมกลับไปเพราะ upload ไม่สำเร็จ
    setProductImages((prev) => {
      const copy = [...prev];
      if (!copy[index]) return copy;
      copy[index] = previousImage;
      return copy;
    });
    Alert.alert(
      "อัปโหลดรูปภาพไม่สำเร็จ",
      e?.message || "กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่อีกครั้ง",
    );
  }
};


  const removeImage = (index: number) => {
    setProductImages((prev) => prev.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  const imagesJson =
    productImages.length > 0 ? JSON.stringify(productImages) : "";

  const optionsRoute = (() => {
    const q: string[] = [];
    if (productId) q.push(`productId=${encodeURIComponent(productId)}`);
    if (name) q.push(`productName=${encodeURIComponent(name)}`);
    if (desc) q.push(`productDesc=${encodeURIComponent(desc)}`);
    if (minBuy) q.push(`minBuy=${encodeURIComponent(minBuy)}`);
    if (categoryId) {
      q.push(`categoryId=${encodeURIComponent(categoryId)}`); // 🆕
    }
    if (categoryName) {
      q.push(`categoryName=${encodeURIComponent(categoryName)}`);
    }
    if (variant) {
      q.push(`variant=${encodeURIComponent(JSON.stringify(variant))}`);
    }
    if (imagesJson) {
      q.push(`images=${encodeURIComponent(imagesJson)}`);
    }
    const qs = q.length ? `?${q.join("&")}` : "";
    return `/store/options${qs}`;
  })();

  const categoryRoute = (() => {
    const q: string[] = [];
    if (productId) q.push(`productId=${encodeURIComponent(productId)}`);
    if (name) q.push(`productName=${encodeURIComponent(name)}`);
    if (desc) q.push(`productDesc=${encodeURIComponent(desc)}`);
    if (minBuy) q.push(`minBuy=${encodeURIComponent(minBuy)}`);
    if (categoryId) {
      q.push(`categoryId=${encodeURIComponent(categoryId)}`); // 🆕
    }
    if (categoryName) {
      q.push(`categoryName=${encodeURIComponent(categoryName)}`);
    }
    if (variant) {
      q.push(`variant=${encodeURIComponent(JSON.stringify(variant))}`);
    }
    if (imagesJson) {
      q.push(`images=${encodeURIComponent(imagesJson)}`);
    }
    const qs = q.length ? `?${q.join("&")}` : "";
    return `/store/categories${qs}`;
  })();

  const handleSelectCategory = (cat: Category) => {
    setCategoryId(cat.category_id); // ✅ เก็บ UUID
    setCategoryName(cat.name);
    router.back();
  };

  const handleSubmit = async () => {
    if (isSubmitting) {
      console.log("Submit ignored: already submitting");
      return;
    }
    setIsSubmitting(true);

    try {
      if (!name.trim()) {
        Alert.alert("กรุณากรอกชื่อสินค้า");
        return;
      }

      if (!variant || variant.options.length === 0) {
        Alert.alert("กรุณาเพิ่มตัวเลือกสินค้า");
        return;
      }

      // ต้องมีทั้ง id + name
      if (!categoryName) {
        Alert.alert("กรุณาเลือกหมวดหมู่");
        return;
      }

      const minBuyNum = 0; // Issue #8: ไม่ใช้ base_price แล้ว ใช้ lowest variant price แทน

      const totalStock =
        variant.options.reduce((sum, o) => sum + (o.stock ?? 0), 0) ?? 0;

      if (totalStock <= 0) {
        Alert.alert("จำนวนคลังรวมของตัวเลือกต้องมากกว่า 0");
        return;
      }

      const payloadImages = productImages.map((img, idx) => ({
        image_id: img.imageId,
        url: img.remoteUrl,
        is_main: idx === 0,
        display_order: idx,
        image_type: "NORMAL" as const,
        variant_id: null,
      }));

      console.log("[IMAGE]Image URLs to be submitted:", payloadImages);
      console.log(`[IMAGE]Total images: ${payloadImages.length}`);

      let payloadVariant: any = null;

      if (variant) {
        payloadVariant = {
          variant_name: variant.variantName,
          enable_vton: variant.enableImages,
          options: variant.options.map((opt) => ({
            variant_id: opt.id || null,
            name_option: opt.name,
            price_delta: opt.priceDelta ?? 0,
            stock: opt.stock ?? 0,
            weight_grams: (opt as any).weight_grams ?? 500,
            images: [
              opt.displayImageId && {
                image_id: opt.displayImageId,
                image_type: "NORMAL" as const,
                is_main: true,
                display_order: 0,
              },
              opt.tryOnImageId && {
                image_id: opt.tryOnImageId,
                image_type: "VTON" as const,
                is_main: false,
                display_order: 1,
              },
            ].filter(Boolean),
          })),
        };
      }

      const payload = {
        product_name: name,
        description: desc,
        base_price: minBuyNum,
        stock_quantity: totalStock,
        category: categoryName, // ภาษาไทยไว้โชว์ / report
        category_id: categoryId, // 🆕 slug / uuid
        images: payloadImages,
        variant: payloadVariant,
      };

      console.log("Submit payload (ready to send to backend):", {
        product_id: productId,
        ...payload,
      });

      const token = await getToken();
      const isEdit = !!productId;

      const endpoint = isEdit
        ? `${PRODUCT_API_BASE}/${productId}/update`
        : `${PRODUCT_API_BASE}`;
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        console.log("create/update product failed", json);
        Alert.alert(
          "บันทึกสินค้าไม่สำเร็จ",
          json.detail || json.message || "Error",
        );
        return;
      }

      console.log(
        "Submit payload (ready to send to backend):",
        JSON.stringify(
          { product_id: productId, ...payload }, // ใส่ Object ที่ต้องการดู
          null,
          2, // เว้นวรรค 2 Space เพื่อให้อ่านง่าย
        ),
      );
      console.log("create/update product success:", json);
      setIsDirty(false);

      Alert.alert("สำเร็จ", "บันทึกสินค้าเรียบร้อย", [
        {
          text: "โอเค",
          onPress: () => {
            // router.replace("/store/mystore" as any);
            router.replace("/store/mystore" as any);
          },
        },
      ]);
    } catch (e: any) {
      console.log("network error when create/update product", e);
      Alert.alert("เกิดข้อผิดพลาดขณะเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeName = (text: string) => {
    setName(text);
    setIsDirty(true);
  };

  const handleChangeDesc = (text: string) => {
    setDesc(text);
    setIsDirty(true);
  };

  const handleChangeMinBuy = (text: string) => {
    setMinBuy(text);
    setIsDirty(true);
  };

  return (
    <Box bg="white" flex={1}>
      <AppBarNoCheck title="เพิ่มสินค้า" onBackPress={handleBackPress} />

      <PreviewModal
        uri={previewUri}
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        onEdit={() => {
          setPreviewVisible(false);
          setTimeout(() => editImage(previewIndex), 0);
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <FormImagesField
            label="รูปภาพสินค้า"
            required
            images={imageUris}
            max={10}
            onAddImage={addImages}
            onRemoveImage={removeImage}
            onCropImage={openPreview}
          />

          <AddProductForm
            type="text"
            label="ชื่อสินค้า"
            required
            maxLength={120}
            placeholder="เพิ่มชื่อสินค้า"
            value={name}
            onChangeText={handleChangeName}
          />

          <AddProductForm
            type="textarea"
            label="รายละเอียดสินค้า"
            required
            maxLength={5000}
            placeholder="เพิ่มรายละเอียดสินค้า"
            value={desc}
            onChangeText={handleChangeDesc}
            height={150}
          />

          <UnifiedRow
            type="select"
            title="ตัวเลือก"
            description={
              variant && variant.options.length > 0
                ? `${variant.variantName}: ${variant.options
                    .map((o) => o.name)
                    .join(", ")}`
                : "เพิ่มตัวเลือก"
            }
            required
            // navigationMethod="push"
            route={optionsRoute}
          />

          <UnifiedRow
            type="select"
            title="หมวดหมู่"
            description={categoryName || "เลือกหมวดหมู่"}
            required
            // navigationMethod="push"
            route={categoryRoute}
          />

          {/* Issue #8: ลบช่อง "ราคาซื้อขั้นต่ำ" ออก ราคาจะแสดงจาก lowest variant price แทน */}
        </ScrollView>
      </KeyboardAvoidingView>

      <Box
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        bg="white"
        p={4}
        borderTopWidth={1}
        borderColor="#ddd"
      >
        <Pressable
          onPress={isSubmitting ? undefined : handleSubmit}
          disabled={isSubmitting}
          style={{
            backgroundColor: "#7c3aed",
            paddingVertical: 14,
            borderRadius: 10,
            alignItems: "center",
            opacity: isSubmitting ? 0.7 : 1,
          }}
        >
          <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
            {isSubmitting ? "กำลังบันทึก..." : "บันทึกสินค้า"}
          </Text>
        </Pressable>
      </Box>
    </Box>
  );
}
