// components/review/review-draft.tsx
import { CreateReviewPayload, ReviewAPI } from "@/api/review";
import { uploadImage } from "@/api/upload";
import { getToken } from "@/utils/secure-store";
import { Ionicons } from "@expo/vector-icons";
import {
    Box,
    Button,
    HStack,
    Pressable,
    ScrollView,
    Text,
    useToast,
    VStack
} from "native-base";
import React, { useEffect, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    TextInput,
} from "react-native";
import { ReviewImage, ReviewImageSelector } from "./review-image";

type ReviewDraftProps = {
  visible: boolean;
  productId: string;
  orderId: string;
  variantId?: string;
  variantName?: string;
  productName?: string;
  onClose: () => void;
  onSuccess?: () => void;
};

export const ReviewDraft: React.FC<ReviewDraftProps> = ({
  visible,
  productId,
  orderId,
  variantId,
  variantName,
  productName,
  onClose,
  onSuccess,
}) => {
  const toast = useToast();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<ReviewImage[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Reset state เมื่อเปิด modal
  useEffect(() => {
    if (visible) {
      setRating(5);
      setComment("");
      setImages([]);
    }
  }, [visible]);

  const handleUploadImage = async (
    uri: string
  ): Promise<{ imageId: string; imageUrl: string }> => {
    const token = await getToken();
    if (!token) throw new Error("ไม่พบ token กรุณาเข้าสู่ระบบใหม่");

    const result = await uploadImage(uri, token);
    return {
      imageId: result.image_id,
      imageUrl: result.url,
    };
  };

  const handleSubmit = async () => {
    // ตรวจสอบว่ารูปทั้งหมดอัพโหลดเสร็จแล้ว
    const hasUploading = images.some((img) => img.uploading);
    if (hasUploading) {
      toast.show({
        description: "กรุณารอจนกว่าการอัพโหลดรูปภาพจะเสร็จสิ้น",
        duration: 3000,
        bg: "orange.500",
      });
      return;
    }

    // ตรวจสอบว่ารูปทั้งหมดอัพโหลดสำเร็จ
    const hasError = images.some((img) => img.error);
    if (hasError) {
      Alert.alert(
        "มีรูปภาพที่อัพโหลดไม่สำเร็จ",
        "กรุณาลบรูปที่อัพโหลดไม่สำเร็จแล้วลองใหม่อีกครั้ง หรือส่งรีวิวโดยไม่มีรูปภาพนั้น",
        [
          { text: "ตกลง", style: "cancel" },
          {
            text: "ส่งรีวิว",
            onPress: () => submitReview(),
          },
        ]
      );
      return;
    }

    await submitReview();
  };

const submitReview = async () => {
    setSubmitting(true);
    console.log("--- เริ่มกระบวนการส่งรีวิว ---");

    try {
      // รวบรวม URL ของรูปที่อัพโหลดสำเร็จแล้ว
      const imageUrls = images
        .filter((img) => img.imageUrl && !img.error)
        .map((img) => img.imageUrl!);

      const payload: CreateReviewPayload = {
        productId,
        orderId,
        variantId,
        rating,
        comment: comment.trim() || undefined,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      };

      // ✅ LOG 1: ตรวจสอบ Payload ก่อนยิง API
      console.log("DEBUG: Payload ที่ส่งไป ->", JSON.stringify(payload, null, 2));

      const result = await ReviewAPI.create(payload);

      // ✅ LOG 2: ตรวจสอบผลลัพธ์จาก API
      console.log("DEBUG: API Response ->", result);

      if (!result.success) {
        // หากไม่สำเร็จ ให้พิมพ์ message ที่ได้จาก Backend ออกมาดู
        console.error("DEBUG: Backend rejected with message:", result.message);
        throw new Error(result.message);
      }

      toast.show({
        description: "ส่งรีวิวสำเร็จ ขอบคุณที่ใช้บริการ",
        duration: 3000,
        bg: "green.500",
      });

      onSuccess?.();
      onClose();
    } catch (error: any) {
      // ✅ LOG 3: ตรวจสอบ Error อย่างละเอียด
      console.error("--- Submit review error detail ---");
      if (error.response) {
        // กรณีเป็น Error จาก Axios (ถ้าใช้) จะมีข้อมูลใน response
        console.error("Data:", error.response.data);
        console.error("Status:", error.response.status);
      } else {
        console.error("Error Message:", error.message);
        console.error("Full Error Object:", error);
      }
      
      toast.show({
        description: error.message || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
        duration: 3000,
        bg: "red.500",
      });
    } finally {
      setSubmitting(false);
      console.log("--- จบกระบวนการส่งรีวิว ---");
    }
  };

  const canSubmit = rating > 0 && !submitting;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <Box flex={1} bg="coolGray.50" safeAreaTop>
          {/* Header */}
          <Box
            bg="white"
            px={4}
            py={3}
            borderBottomWidth={1}
            borderBottomColor="coolGray.200"
          >
            <HStack justifyContent="space-between" alignItems="center">
              <Pressable onPress={onClose} disabled={submitting}>
                <Ionicons name="close" size={24} color="#374151" />
              </Pressable>
              <Text fontSize="lg" fontWeight="bold" color="gray.800">
                เขียนรีวิว
              </Text>
              <Box w={6} />
            </HStack>
          </Box>

          <ScrollView>
            <VStack space={4} p={4}>
              {/* ข้อมูลสินค้า */}
              {productName && (
                <Box bg="white" p={3} rounded="md">
                  <Text fontSize="sm" fontWeight="600" color="gray.700">
                    {productName}
                  </Text>
                  {variantName && (
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      ตัวเลือก: {variantName}
                    </Text>
                  )}
                </Box>
              )}

              {/* เลือกดาว */}
              <Box bg="white" p={4} rounded="md">
                <Text fontSize="sm" fontWeight="600" color="gray.700" mb={3}>
                  ให้คะแนนสินค้า
                </Text>
                <HStack justifyContent="center" space={2}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Pressable key={star} onPress={() => setRating(star)}>
                      <Ionicons
                        name={star <= rating ? "star" : "star-outline"}
                        size={40}
                        color={star <= rating ? "#facc15" : "#D1D5DB"}
                      />
                    </Pressable>
                  ))}
                </HStack>
                <Text fontSize="xs" color="gray.500" textAlign="center" mt={2}>
                  {rating === 5
                    ? "ดีเยี่ยม"
                    : rating === 4
                    ? "ดี"
                    : rating === 3
                    ? "ปานกลาง"
                    : rating === 2
                    ? "พอใช้"
                    : "แย่"}
                </Text>
              </Box>

              {/* เขียนรีวิว */}
              <Box bg="white" p={4} rounded="md">
                <Text fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
                  เขียนรีวิว (ไม่บังคับ)
                </Text>

                {/* เปลี่ยนจาก TextArea เป็น TextInput */}
                <Box
                  borderWidth={1}
                  borderColor="coolGray.300"
                  rounded="sm"
                  p={2}
                  minH={32}
                >
                  <TextInput
                    value={comment}
                    onChangeText={setComment}
                    placeholder="แบ่งปันประสบการณ์การใช้งานสินค้านี้..."
                    placeholderTextColor="#9ca3af"
                    multiline={true}
                    numberOfLines={4}
                    textAlignVertical="top" // สำคัญสำหรับ Android เพื่อให้ตัวหนังสือเริ่มจากด้านบน
                    style={{
                      fontSize: 14,
                      color: "#1f2937",
                      minHeight: 100, // ปรับความสูงตามต้องการ
                    }}
                  />
                </Box>

                <Text fontSize="xs" color="gray.500" mt={1} textAlign="right">
                  {comment.length} ตัวอักษร
                </Text>
              </Box>

              {/* เพิ่มรูปภาพ */}
              <Box bg="white" p={4} rounded="md">
                <ReviewImageSelector
                  images={images}
                  onImagesChange={setImages}
                  onUploadImage={handleUploadImage}
                  maxImages={6}
                />
              </Box>
            </VStack>
          </ScrollView>

          {/* ปุ่มส่งรีวิว */}
          <Box
            bg="white"
            p={4}
            borderTopWidth={1}
            borderTopColor="coolGray.200"
            safeAreaBottom
          >
            <Button
              onPress={handleSubmit}
              isDisabled={!canSubmit}
              isLoading={submitting}
              bg="violet.600"
              _pressed={{ bg: "violet.700" }}
              _disabled={{ bg: "coolGray.300" }}
              rounded="lg"
            >
              <Text color="white" fontWeight="bold">
                ส่งรีวิว
              </Text>
            </Button>
          </Box>
        </Box>
      </KeyboardAvoidingView>
    </Modal>
  );
};
