// components/review/review-image.tsx
import React from "react";
import { Box, Text, HStack, VStack, Pressable, Spinner } from "native-base";
import { Image, Alert, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

export type ReviewImage = {
  uri: string; // local URI
  imageId?: string; // backend image ID (ได้หลังอัพโหลด)
  imageUrl?: string; // backend URL (ได้หลังอัพโหลด)
  uploading?: boolean; // กำลังอัพโหลด
  error?: string; // error message
};

type ReviewImageSelectorProps = {
  images: ReviewImage[];
  onImagesChange: (images: ReviewImage[]) => void;
  onUploadImage: (uri: string) => Promise<{ imageId: string; imageUrl: string }>;
  maxImages?: number;
};

export const ReviewImageSelector: React.FC<ReviewImageSelectorProps> = ({
  images,
  onImagesChange,
  onUploadImage,
  maxImages = 6,
}) => {
  const screenWidth = Dimensions.get("window").width;
  const imageSize = (screenWidth - 64) / 3;

  const pickImage = async () => {
    if (images.length >= maxImages) {
      Alert.alert("เพิ่มรูปไม่ได้", `คุณสามารถเพิ่มรูปได้สูงสุด ${maxImages} รูป`);
      return;
    }

    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "ต้องการสิทธิ์",
          "กรุณาอนุญาตการเข้าถึงคลังรูปภาพในการตั้งค่า"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        allowsMultipleSelection: false,
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0]) {
        const newImage: ReviewImage = {
          uri: result.assets[0].uri,
          uploading: true,
        };

        // เพิ่มรูปเข้า state ทันที
        const updatedImages = [...images, newImage];
        onImagesChange(updatedImages);

        // อัพโหลดรูปแบบ async
        try {
          const uploadResult = await onUploadImage(result.assets[0].uri);

          // อัพเดต state หลังอัพโหลดสำเร็จ
          const finalImages = updatedImages.map((img) =>
            img.uri === newImage.uri
              ? {
                  ...img,
                  imageId: uploadResult.imageId,
                  imageUrl: uploadResult.imageUrl,
                  uploading: false,
                }
              : img
          );
          onImagesChange(finalImages);
        } catch (error: any) {
          // อัพเดต state หลังอัพโหลดล้มเหลว
          const finalImages = updatedImages.map((img) =>
            img.uri === newImage.uri
              ? {
                  ...img,
                  uploading: false,
                  error: error.message || "อัพโหลดล้มเหลว",
                }
              : img
          );
          onImagesChange(finalImages);
          Alert.alert("อัพโหลดล้มเหลว", error.message || "กรุณาลองใหม่อีกครั้ง");
        }
      }
    } catch (error: any) {
      console.error("Pick image error:", error);
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถเลือกรูปภาพได้");
    }
  };

  const removeImage = (index: number) => {
    Alert.alert("ลบรูปภาพ", "คุณต้องการลบรูปภาพนี้ใช่หรือไม่?", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: () => {
          const updatedImages = images.filter((_, i) => i !== index);
          onImagesChange(updatedImages);
        },
      },
    ]);
  };

  return (
    <VStack space={2}>
      <HStack justifyContent="space-between" alignItems="center">
        <Text fontSize="sm" fontWeight="600" color="gray.700">
          เพิ่มรูปภาพ
        </Text>
        <Text fontSize="xs" color="gray.500">
          {images.length}/{maxImages}
        </Text>
      </HStack>

      <HStack space={2} flexWrap="wrap">
        {/* ปุ่มเพิ่มรูป */}
        {images.length < maxImages && (
          <Pressable onPress={pickImage}>
            <Box
              w={imageSize}
              h={imageSize}
              rounded="md"
              borderWidth={1}
              borderColor="coolGray.300"
              borderStyle="dashed"
              justifyContent="center"
              alignItems="center"
              bg="coolGray.50"
            >
              <Ionicons name="camera-outline" size={32} color="#9CA3AF" />
              <Text fontSize="xs" color="gray.500" mt={1}>
                เพิ่มรูป
              </Text>
            </Box>
          </Pressable>
        )}

        {/* รูปที่เลือกแล้ว */}
        {images.map((image, index) => (
          <Box
            key={index}
            w={imageSize}
            h={imageSize}
            rounded="md"
            overflow="hidden"
            position="relative"
            bg="gray.200"
          >
            {/* รูปภาพ */}
            <Image
              source={{ uri: image.uri }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />

            {/* สถานะการอัพโหลด */}
            {image.uploading && (
              <Box
                position="absolute"
                top={0}
                left={0}
                right={0}
                bottom={0}
                bg="rgba(0,0,0,0.5)"
                justifyContent="center"
                alignItems="center"
              >
                <Spinner color="white" size="sm" />
                <Text fontSize="xs" color="white" mt={1}>
                  กำลังอัพโหลด...
                </Text>
              </Box>
            )}

            {/* แสดง error */}
            {image.error && (
              <Box
                position="absolute"
                top={0}
                left={0}
                right={0}
                bottom={0}
                bg="rgba(239, 68, 68, 0.8)"
                justifyContent="center"
                alignItems="center"
                p={2}
              >
                <Ionicons name="alert-circle" size={24} color="white" />
                <Text
                  fontSize="xs"
                  color="white"
                  mt={1}
                  textAlign="center"
                  numberOfLines={2}
                >
                  {image.error}
                </Text>
              </Box>
            )}

            {/* ปุ่มลบ */}
            {!image.uploading && (
              <Pressable
                position="absolute"
                top={1}
                right={1}
                onPress={() => removeImage(index)}
              >
                <Box
                  w={6}
                  h={6}
                  rounded="full"
                  bg="rgba(0,0,0,0.6)"
                  justifyContent="center"
                  alignItems="center"
                >
                  <Ionicons name="close" size={16} color="white" />
                </Box>
              </Pressable>
            )}

            {/* เครื่องหมายอัพโหลดสำเร็จ */}
            {image.imageUrl && !image.uploading && !image.error && (
              <Box
                position="absolute"
                bottom={1}
                right={1}
                w={5}
                h={5}
                rounded="full"
                bg="green.500"
                justifyContent="center"
                alignItems="center"
              >
                <Ionicons name="checkmark" size={12} color="white" />
              </Box>
            )}
          </Box>
        ))}
      </HStack>

      {images.some((img) => img.uploading) && (
        <Text fontSize="xs" color="gray.500" italic>
          กรุณารอจนกว่าการอัพโหลดจะเสร็จสิ้น
        </Text>
      )}
    </VStack>
  );
};