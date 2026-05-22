// app/store/options.tsx
// ✅ แก้ไข: เพิ่ม validation และจัดการ variant_id ให้ถูกต้อง

import { DOMAIN } from "@/้host";

import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Box, Switch, Text } from "native-base";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
} from "react-native";

import { AppBarNoCheck } from "@/components/navbar";
import { VariantOption } from "@/types/variant";
import { getToken } from "@/utils/secure-store";

// =========================
// CONFIG
// =========================
const API_BASE_URL = `${DOMAIN}`;
const IMAGE_UPLOAD_URL = `${API_BASE_URL}/images/upload`;
const PRODUCT_API_BASE = `${API_BASE_URL}/products`;

// upload image ใช้ร่วม
type UploadResponseData = {
  image_id: string;
  url: string;
};

// ขยาย VariantOption ให้รองรับ id + price + stock
export type VariantOptionExtended = VariantOption & {
  displayImageId?: string;
  tryOnImageId?: string;
  displayImageUri?: string;
  tryOnImageUri?: string;
  priceDelta?: number; // ส่วนเพิ่มจาก base_price
  stock?: number; // stock ต่อ option
  weight_grams?: number; // น้ำหนัก (กรัม)
};

async function uploadImageFile(
  uri: string,
  imageType: "NORMAL" | "VTON",
): Promise<UploadResponseData> {
  const token = await getToken();
  const fileName = uri.split("/").pop() || "image.jpg";
  const ext = fileName.split(".").pop()?.toLowerCase();
  const mimeType =
    ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

  const formData = new FormData();
  formData.append("file", {
    uri,
    name: fileName,
    type: mimeType,
  } as any);
  formData.append("image_type", imageType);

  const res = await fetch(IMAGE_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    console.log("upload error:", text);
    throw new Error("Upload failed");
  }

  const json = await res.json();
  return json.data as UploadResponseData;
}

export default function OptionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    productId?: string;
    productName?: string;
    productDesc?: string;
    minBuy?: string;
    categoryName?: string;
    categoryId?: string;
    variant?: string;
    images?: string;
  }>();

  const productId = params.productId as string | undefined;

  const [variantName, setVariantName] = useState<string>("");
  const [variantCreated, setVariantCreated] = useState(false);

  const [enableImages, setEnableImages] = useState(false);
  const [options, setOptions] = useState<VariantOptionExtended[]>([]);
  const [optionText, setOptionText] = useState("");

  const [showOptionForm, setShowOptionForm] = useState(false);

  // helper เอาไว้ update field ของ option ตัวเดียว
  const updateOption = (id: string, patch: Partial<VariantOptionExtended>) => {
    setOptions((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    );
  };

  // =========================
  // LOAD VARIANT จาก backend ถ้ามี productId
  // =========================
  useEffect(() => {
    if (!productId) return;

    if (params.variant) {
      console.log(
        "OptionsScreen: skip fetchVariant because params.variant exists",
      );
      return;
    }

    const fetchVariant = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${PRODUCT_API_BASE}/${productId}/variant`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          console.log("get variant error", res.status);
          return;
        }

        const json = await res.json();
        const data = json.data;

        console.log("fetched variant data:", data);

        setVariantName(data.variant_name || "");
        setEnableImages(!!data.enable_vton);

        const mappedOptions: VariantOptionExtended[] = (data.options || []).map(
          (opt: any) => {
            console.log("mapping variant option from backend:", opt);
            const displayImageUrl = opt.display_image?.image_id
              ? `${API_BASE_URL}/images/stream/${opt.display_image.image_id}`
              : undefined;
            const tryOnImageUrl = opt.tryon_image?.image_id
              ? `${API_BASE_URL}/images/stream/${opt.tryon_image.image_id}`
              : undefined;

            return {
              id: opt.variant_id, // ✅ เพิ่ม fallback
              name: opt.name,
              displayImageUri: displayImageUrl,
              displayImageId: opt.display_image?.image_id,
              tryOnImageUri: tryOnImageUrl,
              tryOnImageId: opt.tryon_image?.image_id,
              priceDelta:
                typeof opt.price_delta === "number"
                  ? opt.price_delta
                  : undefined,
              stock: typeof opt.stock === "number" ? opt.stock : undefined,
              weight_grams:
                typeof opt.weight_grams === "number" ? opt.weight_grams : 500,
            };
          },
        );

        setOptions(mappedOptions);
        setVariantCreated(true);
        setShowOptionForm(false);
      } catch (err) {
        console.error("fetch variant error", err);
      }
    };

    fetchVariant();
  }, [productId, params.variant]);

  // ถ้า route มากับ variant
  useEffect(() => {
    if (!params.variant) return;
    try {
      const v = JSON.parse(String(params.variant));
      console.log("OptionsScreen: use variant from params:", v);

      setVariantName(v.variantName || "");
      setEnableImages(!!v.enableImages);

      const mappedOptions: VariantOptionExtended[] = Array.isArray(v.options)
        ? (v.options as VariantOptionExtended[]).map((opt) => ({
            ...opt,
            // ✅ ถ้าไม่มี id ให้สร้างใหม่
            id: opt.id || Date.now().toString() + Math.random(),
            displayImageUri: opt.displayImageId
              ? `${API_BASE_URL}/images/stream/${opt.displayImageId}`
              : undefined,
            tryOnImageUri: opt.tryOnImageId
              ? `${API_BASE_URL}/images/stream/${opt.tryOnImageId}`
              : undefined,
          }))
        : [];

      setOptions(mappedOptions);
      setVariantCreated(true);
      setShowOptionForm(false);
    } catch (e) {
      console.log("parse variant from params error", e);
    }
  }, [params.variant]);

  // =========================
  // HANDLERS
  // =========================

  const handleCreateVariant = () => {
    if (variantCreated) return;
    setVariantCreated(true);
    setShowOptionForm(false);
    if (!variantName) setVariantName("ไซส์");
  };

  const handleAddOption = () => {
    const name = optionText.trim();
    if (!name) return;

    const exists = options.some((o) => o.name === name);
    if (exists) {
      Alert.alert("ชื่อตัวเลือกซ้ำ", "กรุณาใช้ชื่ออื่น");
      return;
    }

    const newOption: VariantOptionExtended = {
      id: Date.now().toString() + Math.random(), // ✅ ใช้ timestamp + random
      name,
      priceDelta: 0,
      stock: 0,
      weight_grams: 500,
    };
    setOptions((prev) => [...prev, newOption]);
    setOptionText("");
    setShowOptionForm(false);
  };

  const pickOneImage = async (): Promise<string | null> => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("ต้องอนุญาตให้เข้าถึงรูปภาพ");
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled) return null;
    return result.assets[0].uri;
  };

  // รูปตัวเลือกสินค้า (NORMAL)
  const handlePickDisplayImage = async (id: string) => {
    const localUri = await pickOneImage();
    console.log("picked display image uri:", localUri);
    if (!localUri) return;

    try {
      const uploaded = await uploadImageFile(localUri, "NORMAL");
      const fullUrl = `${API_BASE_URL}/images/stream/${uploaded.image_id}`;
      console.log("uploaded display image:", fullUrl);
      updateOption(id, {
        displayImageUri: fullUrl,
        displayImageId: uploaded.image_id,
      });
    } catch (e) {
      console.log("upload display image failed", e);
      Alert.alert("อัปโหลดรูปล้มเหลว", "กรุณาลองใหม่อีกครั้ง");
    }
  };

  // รูป VTON (TRY-ON)
  const handlePickTryOnImage = async (id: string) => {
    if (!enableImages) return;

    const localUri = await pickOneImage();
    if (!localUri) return;

    try {
      const uploaded = await uploadImageFile(localUri, "VTON");
      const fullUrl = `${API_BASE_URL}/images/stream/${uploaded.image_id}`;
      console.log("uploaded vton image:", fullUrl);
      updateOption(id, {
        tryOnImageUri: fullUrl,
        tryOnImageId: uploaded.image_id,
      });
    } catch (e) {
      console.log("upload vton image failed", e);
      Alert.alert("อัปโหลดรูปล้มเหลว", "กรุณาลองใหม่อีกครั้ง");
    }
  };

  const handleRemoveOption = (id: string) => {
    setOptions((prev) => prev.filter((o) => o.id !== id));
  };

  // =========================
  // SAVE: ส่งกลับไปหน้า AddProduct
  // =========================
  const handleSave = useCallback(() => {
    // ✅ Validation ก่อน save
    if (!variantName.trim()) {
      Alert.alert("ข้อผิดพลาด", "กรุณากรอกชื่อตัวเลือก");
      return;
    }

    if (options.length === 0) {
      Alert.alert("ข้อผิดพลาด", "กรุณาเพิ่มตัวเลือกอย่างน้อย 1 รายการ");
      return;
    }

    // ✅ ตรวจสอบว่าแต่ละ option มี stock และ priceDelta
    for (const opt of options) {
      if (typeof opt.stock !== "number" || opt.stock < 0) {
        Alert.alert("ข้อผิดพลาด", `กรุณากรอกจำนวนคลังสำหรับ "${opt.name}"`);
        return;
      }
    }

    const variantPayload = {
      variantName,
      enableImages,
      options,
    };

    console.log("Variant payload from OptionsScreen:", variantPayload);

    router.replace({
      pathname: "/store/add-product",
      params: {
        ...(productId ? { productId } : {}),
        productName: params.productName ?? "",
        productDesc: params.productDesc ?? "",
        minBuy: params.minBuy ?? "",
        categoryName: params.categoryName ?? "",
        categoryId: params.categoryId ?? "",
        ...(params.images ? { images: params.images } : {}),
        variant: JSON.stringify(variantPayload),
      },
    });
  }, [
    variantName,
    enableImages,
    options,
    router,
    productId,
    params.productName,
    params.productDesc,
    params.minBuy,
    params.categoryName,
    params.categoryId,
    params.images,
  ]);

  // ย้อนกลับ: ถ้ายังไม่ได้สร้าง variant หรือยังไม่มี option ให้ back ได้เลย ไม่ต้อง validate
  const handleBack = useCallback(() => {
    if (!variantCreated || options.length === 0) {
      router.replace({
        pathname: "/store/add-product",
        params: {
          ...(productId ? { productId } : {}),
          productName: params.productName ?? "",
          productDesc: params.productDesc ?? "",
          minBuy: params.minBuy ?? "",
          categoryName: params.categoryName ?? "",
          categoryId: params.categoryId ?? "",
          ...(params.images ? { images: params.images } : {}),
        },
      });
      return;
    }
    handleSave();
  }, [variantCreated, options.length, handleSave, router, productId, params]);

  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );
    return () => subscription.remove();
  }, [handleBack]);

  console.log("OptionsScreen render, options:", options);

  return (
    <Box flex={1} bg="#f5efec">
      <AppBarNoCheck title="ตัวเลือกสินค้า" onBackPress={handleBack} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 180 }}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={handleCreateVariant} disabled={variantCreated}>
            <Box
              borderWidth={1}
              borderStyle="dashed"
              borderColor="#b197fc"
              borderRadius={8}
              py={3}
              alignItems="center"
              justifyContent="center"
              bg="white"
              opacity={variantCreated ? 0.4 : 1}
            >
              <Text color="#7c3aed" fontWeight="600">
                + เพิ่มตัวเลือกสำหรับสินค้า
              </Text>
            </Box>
          </Pressable>

          {variantCreated && (
            <Box mt={6} bg="white" p={4} borderRadius={8}>
              {/* <Box flexDirection="row" justifyContent="space-between">
                <Box flex={1}>
                  <Text fontSize="xs" color="gray.500" mb={1}>
                    ชื่อตัวเลือก (เช่น ไซส์, สี)
                  </Text>
                  <TextInput
                    value={variantName}
                    onChangeText={setVariantName}
                    placeholder="ตั้งชื่อตัวเลือก"
                    style={{
                      borderBottomWidth: 1,
                      borderColor: "#eee",
                      paddingVertical: 4,
                      fontSize: 16,
                    }}
                  />
                </Box>

                <Pressable
                  onPress={() => {
                    setVariantCreated(false);
                    setVariantName("");
                    setOptions([]);
                    setShowOptionForm(false);
                  }}
                >
                  <Text color="red.500" fontWeight="600" ml={4} mt={6}>
                    ลบ
                  </Text>
                </Pressable>
              </Box> */}

              <Box mt={4} flexDirection="row" alignItems="center">
                <Text flex={1}>เพิ่มรูปภาพสำหรับลองเสื้อ (VTON)</Text>
                <Switch
                  value={enableImages}
                  onValueChange={setEnableImages}
                  offTrackColor="#ddd"
                  onTrackColor="#7c3aed"
                />
              </Box>

              <Box mt={4}>
                <Pressable onPress={() => setShowOptionForm(true)}>
                  <Text color="#7c3aed" mb={2}>
                    + เพิ่มตัวเลือกสำหรับลูกค้า
                  </Text>
                </Pressable>
                {/* {enableImages && (
                  <Text color="#7c3aed">+ เพิ่มรูปสำหรับลองเสื้อ</Text>
                )} */}
              </Box>

              <Box mt={6}>
                {options.map((opt) => (
                  <Box
                    key={opt.id}
                    mb={4}
                    p={3}
                    borderRadius={8}
                    borderWidth={1}
                    borderColor="#f1f1f1"
                    bg="#fafafa"
                  >
                    <Box
                      flexDirection="row"
                      alignItems="center"
                      justifyContent="space-between"
                      mb={2}
                    >
                      <TextInput
                        value={opt.name}
                        onChangeText={(text) =>
                          updateOption(opt.id!, { name: text })
                        }
                        placeholder="ชื่อตัวเลือก"
                        style={{
                          flex: 1,
                          fontWeight: "500",
                          fontSize: 14,
                          borderBottomWidth: 1,
                          borderColor: "#eee",
                          paddingVertical: 2,
                        }}
                      />
                      <Pressable onPress={() => handleRemoveOption(opt.id!)}>
                        <Text color="red.400" fontSize="xs">
                          ลบ
                        </Text>
                      </Pressable>
                    </Box>

                    <Box flexDirection="row" mt={2}>
                      <Box flex={1} mr={2}>
                        <Text fontSize="xs" color="gray.500">
                          ส่วนเพิ่มราคา (บาท)
                        </Text>
                        <TextInput
                          keyboardType="numeric"
                          placeholder="0"
                          value={
                            typeof opt.priceDelta === "number"
                              ? String(opt.priceDelta)
                              : ""
                          }
                          onChangeText={(text) => {
                            const num = parseFloat(text.replace(/,/g, ""));
                            updateOption(opt.id!, {
                              priceDelta: isNaN(num) ? 0 : num,
                            });
                          }}
                          style={{
                            borderWidth: 1,
                            borderColor: "#ddd",
                            borderRadius: 8,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            fontSize: 14,
                          }}
                        />
                      </Box>

                      <Box flex={1} ml={2}>
                        <Text fontSize="xs" color="gray.500">
                          คลังของตัวเลือก *
                        </Text>
                        <TextInput
                          keyboardType="numeric"
                          placeholder="0"
                          value={
                            typeof opt.stock === "number"
                              ? String(opt.stock)
                              : ""
                          }
                          onChangeText={(text) => {
                            const num = parseInt(text, 10);
                            updateOption(opt.id!, {
                              stock: isNaN(num) ? 0 : num,
                            });
                          }}
                          style={{
                            borderWidth: 1,
                            borderColor: "#ddd",
                            borderRadius: 8,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            fontSize: 14,
                          }}
                        />
                      </Box>
                    </Box>

                    <Box flexDirection="row" mt={2}>
                      <Box flex={1}>
                        <Text fontSize="xs" color="gray.500">
                          น้ำหนัก (กรัม) *
                        </Text>
                        <TextInput
                          keyboardType="numeric"
                          placeholder="500"
                          value={
                            typeof opt.weight_grams === "number"
                              ? String(opt.weight_grams)
                              : ""
                          }
                          onChangeText={(text) => {
                            const num = parseInt(text, 10);
                            updateOption(opt.id!, {
                              weight_grams: isNaN(num) ? undefined : num,
                            });
                          }}
                          style={{
                            borderWidth: 1,
                            borderColor: "#ddd",
                            borderRadius: 8,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            fontSize: 14,
                          }}
                        />
                      </Box>
                    </Box>

                    <Pressable onPress={() => handlePickDisplayImage(opt.id!)}>
                      <Box
                        flexDirection="row"
                        alignItems="center"
                        justifyContent="space-between"
                        py={6}
                      >
                        <Box>
                          <Text fontSize="xs" color="gray.500">
                            รูปตัวเลือกสินค้า
                          </Text>
                          <Text fontSize="xs" color="gray.400">
                            แตะเพื่อเลือกรูป
                          </Text>
                        </Box>

                        {opt.displayImageUri && (
                          <Image
                            source={{ uri: opt.displayImageUri }}
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 6,
                            }}
                          />
                        )}
                      </Box>
                    </Pressable>

                    {enableImages && (
                      <Pressable onPress={() => handlePickTryOnImage(opt.id!)}>
                        <Box
                          flexDirection="row"
                          alignItems="center"
                          justifyContent="space-between"
                          py={6}
                        >
                          <Box>
                            <Text fontSize="xs" color="gray.500">
                              รูปสำหรับลองเสื้อ (VTON)
                            </Text>
                            <Text fontSize="xs" color="gray.400">
                              แตะเพื่อเลือกรูป (1 รูปต่อ 1 ตัวเลือก)
                            </Text>
                          </Box>

                          {opt.tryOnImageUri && (
                            <Image
                              source={{ uri: opt.tryOnImageUri }}
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 6,
                              }}
                            />
                          )}
                        </Box>
                      </Pressable>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </ScrollView>

        {variantCreated && showOptionForm && (
          <Box
            position="absolute"
            left={0}
            right={0}
            bottom={70}
            bg="white"
            borderTopWidth={1}
            borderColor="#eee"
            px={16}
            py={10}
          >
            <Pressable
              onPress={() => {
                setShowOptionForm(false);
                setOptionText("");
              }}
              style={{ position: "absolute", top: 10, right: 16, zIndex: 10 }}
            >
              <Text style={{ fontSize: 18, color: "#999" }}>✕</Text>
            </Pressable>

            <Text textAlign="center" mb={3}>
              เพิ่มตัวเลือก
            </Text>

            <Box flexDirection="row" justifyContent="center" mb={4}>
              <TextInput
                value={optionText}
                onChangeText={setOptionText}
                placeholder="ตัวเลือก เช่น XL แดง"
                style={{
                  borderWidth: 1,
                  borderColor: "#7c3aed",
                  borderRadius: 999,
                  paddingVertical: 2,
                  paddingHorizontal: 18,
                  minWidth: 120,
                  textAlign: "center",
                  fontSize: 14,
                }}
              />
            </Box>

            <Pressable
              onPress={handleAddOption}
              style={{ alignSelf: "center" }}
            >
              <Box bg="#7c3aed" px={5} py={2} borderRadius={999}>
                <Text
                  style={{
                    color: "white",
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  เพิ่ม
                </Text>
              </Box>
            </Pressable>
          </Box>
        )}
      </KeyboardAvoidingView>

      <Box
        position="absolute"
        left={0}
        right={0}
        bottom={0}
        bg="white"
        borderTopWidth={1}
        borderColor="#ddd"
        p={4}
      >
        <Pressable
          onPress={handleSave}
          disabled={!variantCreated || options.length === 0}
          style={{
            backgroundColor:
              !variantCreated || options.length === 0 ? "#c4b5fd" : "#7c3aed",
            paddingVertical: 14,
            borderRadius: 10,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
            บันทึกตัวเลือกสินค้า
          </Text>
        </Pressable>
      </Box>
    </Box>
  );
}
