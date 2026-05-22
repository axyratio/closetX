// components/review/card.tsx
import React from "react";
import { Box, Text, HStack } from "native-base";
import { View, Image } from "react-native";
import { ReviewDto } from "@/api/products";
import { Ionicons } from "@expo/vector-icons";

type ReviewCardProps = {
  review: ReviewDto;
};

function maskUsername(name: string): string {
  if (!name) return "";
  if (name.length <= 2) return name[0] + "***";
  return name[0] + "***" + name[name.length - 1];
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
  return (
    <Box mb={4}>
      <Text fontSize="xs" color="gray.700" mb={1}>
        {maskUsername(review.userDisplayName)}
      </Text>

      <HStack alignItems="center" space={1} mb={1}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Ionicons
            key={i}
            name={i < review.rating ? "star" : "star-outline"}
            size={14}
            color="#facc15"
          />
        ))}
      </HStack>

      {review.variantName && (
        <Text fontSize="xs" color="gray.500" mb={1}>
          ตัวเลือกสินค้า: {review.variantName}
        </Text>
      )}

      {review.comment && (
        <Text fontSize="sm" color="gray.700">
          {review.comment}
        </Text>
      )}
    </Box>
  );
};
