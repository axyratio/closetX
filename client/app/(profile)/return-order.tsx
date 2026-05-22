// app/(profile)/return-order.tsx
import {
  createReturnRequest,
  fetchOrderDetail,
  uploadReturnImage,
  deleteReturnImage,
  Order,
  ReturnReason,
} from "@/api/order";
import { Colors } from "@/constants/theme";
import { getToken } from "@/utils/secure-store";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Box,
  Button,
  Center,
  FormControl,
  HStack,
  Image,
  Pressable,
  Radio,
  ScrollView,
  Spinner,
  Text,
  useToast,
  VStack,
  WarningOutlineIcon,
} from "native-base";
import React, { useEffect, useState } from "react";
import { useColorScheme, TextInput } from "react-native";

const RETURN_REASONS: { value: ReturnReason; label: string }[] = [
  { value: "WRONG_ITEM", label: "สินค้าผิดจากที่สั่ง" },
  { value: "DAMAGED", label: "สินค้าเสียหาย" },
  { value: "NOT_AS_DESCRIBED", label: "ไม่ตรงตามคำอธิบาย" },
  { value: "DEFECTIVE", label: "สินค้ามีตำหนิ" },
  { value: "SIZE_ISSUE", label: "ไซส์ไม่เหมาะ" },
  { value: "QUALITY_ISSUE", label: "คุณภาพไม่ดี" },
  { value: "OTHER", label: "อื่นๆ" },
];

// ✅ Type สำหรับเก็บข้อมูลรูป
type UploadedImage = {
  image_id: string;
  uri: string;
  uploading?: boolean;
};

export default function ReturnOrderScreen() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? "light"];
  const router = useRouter();
  const toast = useToast();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);

  // Form state
  const [reason, setReason] = useState<ReturnReason>("WRONG_ITEM");
  const [reasonDetail, setReasonDetail] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);

  useEffect(() => {
    const loadOrder = async () => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token || !orderId) {
          router.replace("/login");
          return;
        }

        const data = await fetchOrderDetail(token, orderId);
        setOrder(data);
      } catch (error) {
        console.error("Error loading order:", error);
        toast.show({
          description: "ไม่สามารถโหลดข้อมูลได้",
          bg: "red.500",
          duration: 2000,
        });
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId]);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        toast.show({
          description: "ต้องการสิทธิ์เข้าถึงรูปภาพ",
          bg: "orange.500",
          duration: 2000,
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,  // ✅ เปลี่ยนเป็นทีละรูป
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        
        // ✅ เพิ่มรูปพร้อม loading state
        const tempId = `temp_${Date.now()}`;
        setImages((prev) => [
          ...prev,
          {
            image_id: tempId,
            uri: asset.uri,
            uploading: true,
          },
        ]);

        // ✅ อัปโหลดไปที่ backend
        try {
          const token = await getToken();
          if (!token) return;

          const uploadResult = await uploadReturnImage(token, asset.uri);
          
          // ✅ อัปเดต image_id จริงหลังอัปโหลดสำเร็จ
          setImages((prev) =>
            prev.map((img) =>
              img.image_id === tempId
                ? {
                    image_id: uploadResult.image_id,
                    uri: uploadResult.url,
                    uploading: false,
                  }
                : img
            )
          );

          toast.show({
            description: "อัปโหลดรูปสำเร็จ",
            bg: "green.500",
            duration: 1500,
          });
        } catch (uploadError) {
          // ✅ ถ้าอัปโหลดล้มเหลว ให้ลบรูปออก
          setImages((prev) => prev.filter((img) => img.image_id !== tempId));
          
          toast.show({
            description: "อัปโหลดรูปล้มเหลว กรุณาลองใหม่",
            bg: "red.500",
            duration: 2000,
          });
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      toast.show({
        description: "เกิดข้อผิดพลาดในการเลือกรูปภาพ",
        bg: "red.500",
        duration: 2000,
      });
    }
  };

  const handleRemoveImage = async (image: UploadedImage) => {
    try {
      // ✅ ลบรูปจาก backend ก่อน (ถ้าอัปโหลดสำเร็จแล้ว)
      if (!image.uploading && !image.image_id.startsWith("temp_")) {
        const token = await getToken();
        if (token) {
          await deleteReturnImage(token, image.image_id);
        }
      }
      
      // ✅ ลบออกจาก state
      setImages((prev) => prev.filter((img) => img.image_id !== image.image_id));
      
      toast.show({
        description: "ลบรูปภาพสำเร็จ",
        bg: "green.500",
        duration: 1500,
      });
    } catch (error) {
      console.error("Error removing image:", error);
      toast.show({
        description: "เกิดข้อผิดพลาดในการลบรูปภาพ",
        bg: "red.500",
        duration: 2000,
      });
    }
  };

  const handleSubmit = async () => {
    if (!reasonDetail.trim()) {
      toast.show({
        description: "กรุณาระบุรายละเอียดเหตุผล",
        bg: "orange.500",
        duration: 2000,
      });
      return;
    }

    // ✅ ตรวจสอบว่ามีรูปที่อัปโหลดสำเร็จแล้ว
    const uploadedImages = images.filter((img) => !img.uploading);
    if (uploadedImages.length === 0) {
      toast.show({
        description: "กรุณาแนบรูปภาพอย่างน้อย 1 รูป",
        bg: "orange.500",
        duration: 2000,
      });
      return;
    }

    // ✅ ตรวจสอบว่ามีรูปที่กำลังอัปโหลดอยู่หรือไม่
    if (images.some((img) => img.uploading)) {
      toast.show({
        description: "กรุณารอให้อัปโหลดรูปภาพเสร็จสิ้น",
        bg: "orange.500",
        duration: 2000,
      });
      return;
    }

    try {
      setSubmitting(true);
      const token = await getToken();
      if (!token) return;

      // ✅ ส่ง image_ids ไปแทน image_urls
      await createReturnRequest(token, {
        order_id: orderId!,
        reason,
        reason_detail: reasonDetail,
        image_ids: uploadedImages.map((img) => img.image_id),
      });

      toast.show({
        description: "ส่งคำขอคืนสินค้าสำเร็จ",
        bg: "green.500",
        duration: 2000,
      });

      router.back();
    } catch (error) {
      console.error("Error creating return request:", error);
      toast.show({
        description: "เกิดข้อผิดพลาด กรุณาลองใหม่",
        bg: "red.500",
        duration: 2000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box flex={1} bg="coolGray.50">
        <Center flex={1}>
          <Spinner size="lg" color="violet.600" />
        </Center>
      </Box>
    );
  }

  if (!order) {
    return (
      <Box flex={1} bg="coolGray.50">
        <Center flex={1}>
          <Text>ไม่พบข้อมูลคำสั่งซื้อ</Text>
        </Center>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="coolGray.50">
      <Box safeAreaTop bg="violet.600" />

      {/* Header */}
      <Box bg="violet.600" px={4} py={3}>
        <HStack alignItems="center" space={3}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <Text fontSize="lg" fontWeight="bold" color="white">
            คืนสินค้า
          </Text>
        </HStack>
      </Box>

      <ScrollView>
        {/* Order Info */}
        <Box bg="white" p={4} mb={2}>
          <Text fontSize="sm" fontWeight="bold" mb={2}>
            ข้อมูลคำสั่งซื้อ
          </Text>
          <Text fontSize="xs" color="gray.600">
            คำสั่งซื้อ: {order.order_id}
          </Text>
          <Text fontSize="xs" color="gray.600">
            ร้านค้า: {order.store_name}
          </Text>
          <Text fontSize="xs" color="gray.600">
            ยอดรวม: ฿{order.total_price.toFixed(0)}
          </Text>
        </Box>

        {/* Return Reason */}
        <Box bg="white" p={4} mb={2}>
          <FormControl isRequired>
            <FormControl.Label>เหตุผลการคืนสินค้า</FormControl.Label>
            <Radio.Group
              name="returnReason"
              value={reason}
              onChange={(value) => setReason(value as ReturnReason)}
            >
              <VStack space={2}>
                {RETURN_REASONS.map((r) => (
                  <Radio key={r.value} value={r.value} my={1}>
                    {r.label}
                  </Radio>
                ))}
              </VStack>
            </Radio.Group>
          </FormControl>
        </Box>

        {/* Reason Detail */}
        <Box bg="white" p={4} mb={2}>
          <FormControl isRequired>
            <FormControl.Label>รายละเอียดเพิ่มเติม</FormControl.Label>

            <TextInput
              style={{
                height: 160,
                borderWidth: 1,
                borderColor: "#e5e7eb",
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                backgroundColor: "white",
                textAlignVertical: "top",
              }}
              placeholder="โปรดระบุรายละเอียดปัญหา..."
              placeholderTextColor="#9ca3af"
              value={reasonDetail}
              onChangeText={(text) => setReasonDetail(text)}
              maxLength={500}
              multiline
            />

            <FormControl.HelperText>
              {reasonDetail.length}/500 ตัวอักษร
            </FormControl.HelperText>
          </FormControl>
        </Box>

        {/* Images */}
        <Box bg="white" p={4} mb={2}>
          <FormControl isRequired>
            <FormControl.Label>แนบรูปภาพ (สูงสุด 5 รูป)</FormControl.Label>
            <FormControl.HelperText>
              <HStack space={1} alignItems="center">
                <WarningOutlineIcon size="xs" color="gray.500" />
                <Text fontSize="xs" color="gray.500">
                  กรุณาถ่ายรูปแสดงปัญหาของสินค้าอย่างชัดเจน
                </Text>
              </HStack>
            </FormControl.HelperText>

            {/* Image Grid */}
            <HStack flexWrap="wrap" mt={3} space={2}>
              {images.map((image) => (
                <Box key={image.image_id} position="relative" mb={2}>
                  <Image
                    source={{ uri: image.uri }}
                    alt={`Image ${image.image_id}`}
                    width="80px"
                    height="80px"
                    borderRadius={8}
                  />
                  
                  {/* ✅ แสดง Loading Overlay */}
                  {image.uploading && (
                    <Center
                      position="absolute"
                      top={0}
                      left={0}
                      right={0}
                      bottom={0}
                      bg="rgba(0,0,0,0.5)"
                      borderRadius={8}
                    >
                      <Spinner size="sm" color="white" />
                    </Center>
                  )}
                  
                  {/* ✅ ปุ่มลบ */}
                  {!image.uploading && (
                    <Pressable
                      position="absolute"
                      top={-8}
                      right={-8}
                      onPress={() => handleRemoveImage(image)}
                      bg="red.500"
                      borderRadius="full"
                      p={1}
                    >
                      <Ionicons name="close" size={16} color="white" />
                    </Pressable>
                  )}
                </Box>
              ))}

              {/* Add Button */}
              {images.length < 5 && (
                <Pressable
                  onPress={handlePickImage}
                  width="80px"
                  height="80px"
                  borderRadius={8}
                  borderWidth={2}
                  borderColor="violet.300"
                  borderStyle="dashed"
                  alignItems="center"
                  justifyContent="center"
                  bg="violet.50"
                >
                  <Ionicons name="add" size={32} color="#7c3aed" />
                </Pressable>
              )}
            </HStack>
          </FormControl>
        </Box>

        {/* Warning */}
        <Box bg="orange.50" p={4} mb={4} mx={4} borderRadius={8}>
          <HStack space={2} alignItems="flex-start">
            <WarningOutlineIcon size="sm" color="orange.600" mt={0.5} />
            <VStack flex={1}>
              <Text fontSize="xs" fontWeight="bold" color="orange.800">
                ข้อควรทราบ
              </Text>
              <Text fontSize="xs" color="orange.700" mt={1}>
                • ร้านค้าจะตรวจสอบคำขอคืนสินค้าภายใน 1-3 วันทำการ{"\n"}
                • กรุณาเก็บสินค้าไว้ในสภาพเดิม{"\n"}
                • การคืนเงินจะดำเนินการภายใน 7-14 วันหลังจากได้รับสินค้าคืน
              </Text>
            </VStack>
          </HStack>
        </Box>

        {/* Submit Button */}
        <Box px={4} pb={6}>
          <Button
            colorScheme="violet"
            size="lg"
            onPress={handleSubmit}
            isLoading={submitting}
            isLoadingText="กำลังส่งคำขอ..."
            isDisabled={
              !reasonDetail.trim() || 
              images.length === 0 || 
              images.some((img) => img.uploading)
            }
          >
            ส่งคำขอคืนสินค้า
          </Button>
        </Box>
      </ScrollView>
    </Box>
  );
}