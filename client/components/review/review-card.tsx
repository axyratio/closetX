// components/review/review-card.tsx
import React, { useState } from "react";
import { Box, Text, HStack, VStack } from "native-base";
import { Image, Pressable, Dimensions, Modal } from "react-native";
import { ReviewDto } from "@/api/review";
import { Ionicons } from "@expo/vector-icons";

type ReviewCardProps = {
  review: ReviewDto;
  showFullInfo?: boolean; // แสดงข้อมูลเต็ม (ใช้ในหน้า detail)
};

function maskUsername(name: string): string {
  if (!name) return "ผู้ใช้";
  if (name.length <= 2) return name[0] + "***";
  return name[0] + "***" + name[name.length - 1];
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "วันนี้";
  if (diffDays === 1) return "เมื่อวาน";
  if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} สัปดาห์ที่แล้ว`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} เดือนที่แล้ว`;
  return `${Math.floor(diffDays / 365)} ปีที่แล้ว`;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  showFullInfo = true,
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null
  );

  const screenWidth = Dimensions.get("window").width;
  const imageSize = (screenWidth - 64) / 3; // 3 รูปต่อแถว, padding 16*2 + gap

  return (
    <Box px={4} py={3} borderBottomWidth={1} borderBottomColor="coolGray.200">
      <VStack space={2}>
        {/* ชื่อผู้ใช้และวันที่ */}
        <HStack justifyContent="space-between" alignItems="center">
          <HStack alignItems="center" space={2}>
            <Box
              w={8}
              h={8}
              rounded="full"
              bg="violet.100"
              justifyContent="center"
              alignItems="center"
            >
              <Text fontSize="sm" fontWeight="bold" color="violet.600">
                {review.userDisplayName[0]?.toUpperCase() || "?"}
              </Text>
            </Box>
            <Text fontSize="sm" fontWeight="600" color="gray.700">
              {maskUsername(review.userDisplayName)}
            </Text>
          </HStack>
          {showFullInfo && (
            <Text fontSize="xs" color="gray.500">
              {formatDate(review.createdAt)}
            </Text>
          )}
        </HStack>

        {/* ดาวและตัวเลือกสินค้า */}
        <HStack alignItems="center" space={3}>
          <HStack alignItems="center" space={1}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Ionicons
                key={i}
                name={i < review.rating ? "star" : "star-outline"}
                size={14}
                color="#facc15"
              />
            ))}
          </HStack>
          {review.variantName && showFullInfo && (
            <Text fontSize="xs" color="gray.500">
              • {review.variantName}
            </Text>
          )}
        </HStack>

        {/* ข้อความรีวิว */}
        {review.comment && (
          <Text fontSize="sm" color="gray.700" lineHeight={20}>
            {review.comment}
          </Text>
        )}

        {/* รูปภาพรีวิว */}
        {review.images && review.images.length > 0 && (
          <HStack space={2} flexWrap="wrap" mt={1}>
            {review.images.slice(0, 6).map((img, index) => (
              <Pressable
                key={img.imageId}
                onPress={() => setSelectedImageIndex(index)}
              >
                <Box
                  w={imageSize}
                  h={imageSize}
                  rounded="md"
                  overflow="hidden"
                  bg="gray.200"
                  position="relative"
                >
                  <Image
                    source={{ uri: img.imageUrl }}
                    style={{
                      width: "100%",
                      height: "100%",
                    }}
                    resizeMode="cover"
                  />
                  {/* แสดง +N ถ้ามีรูปเกิน 6 รูป */}
                  {index === 5 && review.images!.length > 6 && (
                    <Box
                      position="absolute"
                      top={0}
                      left={0}
                      right={0}
                      bottom={0}
                      bg="rgba(0,0,0,0.6)"
                      justifyContent="center"
                      alignItems="center"
                    >
                      <Text color="white" fontSize="xl" fontWeight="bold">
                        +{review.images!.length - 6}
                      </Text>
                    </Box>
                  )}
                </Box>
              </Pressable>
            ))}
          </HStack>
        )}
      </VStack>

      {/* Modal แสดงรูปใหญ่ */}
      {selectedImageIndex !== null && review.images && (
        <Modal
          visible={true}
          transparent
          onRequestClose={() => setSelectedImageIndex(null)}
        >
          <Box flex={1} bg="rgba(0,0,0,0.9)" justifyContent="center">
            <Pressable
              style={{
                position: "absolute",
                top: 50,
                right: 20,
                zIndex: 10,
              }}
              onPress={() => setSelectedImageIndex(null)}
            >
              <Ionicons name="close-circle" size={36} color="white" />
            </Pressable>

            <Image
              source={{
                uri: review.images[selectedImageIndex].imageUrl,
              }}
              style={{
                width: screenWidth,
                height: screenWidth,
              }}
              resizeMode="contain"
            />

            {/* ตัวบ่งชี้รูปที่เลือก */}
            <HStack
              justifyContent="center"
              alignItems="center"
              space={2}
              mt={4}
            >
              {review.images.map((_, index) => (
                <Box
                  key={index}
                  w={2}
                  h={2}
                  rounded="full"
                  bg={
                    index === selectedImageIndex
                      ? "white"
                      : "rgba(255,255,255,0.4)"
                  }
                />
              ))}
            </HStack>
          </Box>
        </Modal>
      )}
    </Box>
  );
};
