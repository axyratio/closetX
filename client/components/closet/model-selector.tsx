import type { UserTryOnImage } from "@/api/closet";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Box, HStack, Modal, Pressable, Text } from "native-base";
import React, { useState } from "react";
import { Alert, Image } from "react-native";

interface ModelSelectorProps {
  userImages: UserTryOnImage[];
  selectedModel: UserTryOnImage | null;
  onSelectModel: (image: UserTryOnImage) => void;
  onAddModel: (file: File | string) => void;
  onDeleteModel: (imageId: string) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  userImages,
  selectedModel,
  onSelectModel,
  onAddModel,
  onDeleteModel,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      onAddModel(result.assets[0].uri);
    }
  };

  const handleDelete = (image: UserTryOnImage) => {
    Alert.alert("ยืนยันการลบ", "คุณต้องการลบภาพนี้หรือไม่?", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: () => onDeleteModel(image.user_image_id),
      },
    ]);
  };

  return (
    <Box>
      <Text fontSize="sm" color="gray.600" mb={1}>
        ภาพในตัวของคุณ
      </Text>
      <Text fontSize="xs" color="gray.400" mb={3}>
        กดค้างที่ภาพเพื่อดูภาพเต็ม
      </Text>

      <HStack flexWrap="wrap" justifyContent="flex-start" mx="-1%">
        {/* ปุ่มเพิ่มรูป */}
        <Pressable
          onPress={handlePickImage}
          width="31.3%"
          style={{ aspectRatio: 3 / 4 }}
          bg="white"
          borderWidth={2}
          borderColor="gray.300"
          borderStyle="dashed"
          borderRadius="lg"
          justifyContent="center"
          alignItems="center"
          m="1%"
          mb={3}
        >
          <Ionicons name="add" size={32} color="#9CA3AF" />
        </Pressable>

        {userImages.map((image) => (
          <Box
            key={image.user_image_id}
            width="31.3%"
            style={{ aspectRatio: 3 / 4 }}
            m="1%"
            mb={3}
            position="relative"
          >
            <Pressable
              onPress={() => onSelectModel(image)}
              onLongPress={() => setPreviewUrl(image.image_url)}
              delayLongPress={300}
              width="100%"
              height="100%"
              borderRadius="lg"
              overflow="hidden"
              borderWidth={2}
              borderColor={
                selectedModel?.user_image_id === image.user_image_id
                  ? "#7c3aed"
                  : "transparent"
              }
            >
              <Image
                source={{ uri: image.image_url }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            </Pressable>

            <Pressable
              onPress={() => handleDelete(image)}
              position="absolute"
              top={1}
              right={1}
              bg="red.500"
              borderRadius="full"
              p={1}
              zIndex={10}
              _pressed={{ bg: "red.600" }}
            >
              <Ionicons name="close" size={16} color="white" />
            </Pressable>
          </Box>
        ))}
      </HStack>

      {/* Preview Modal */}
      <Modal
        isOpen={!!previewUrl}
        onClose={() => setPreviewUrl(null)}
        size="full"
      >
        <Modal.Content
          bg="black"
          maxW="100%"
          maxH="100%"
          w="100%"
          h="100%"
          m={0}
          borderRadius={0}
        >
          {/* ปุ่มปิด */}
          <Pressable
            position="absolute"
            top={10}
            right={4}
            zIndex={10}
            onPress={() => setPreviewUrl(null)}
            bg="rgba(0,0,0,0.55)"
            borderRadius="full"
            p={2}
            _pressed={{ bg: "rgba(0,0,0,0.85)" }}
          >
            <Ionicons name="close" size={28} color="white" />
          </Pressable>

          {previewUrl && (
            <Image
              source={{ uri: previewUrl }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="contain"
            />
          )}
        </Modal.Content>
      </Modal>
    </Box>
  );
};