// components/review/header.tsx
import { ReviewDto } from "@/api/products";
import { useRouter } from "expo-router";
import { Box, Button, HStack, Text } from "native-base";
import React from "react";
import { ReviewCard } from "./card";

type ReviewPreviewSectionProps = {
  productId: string;
  bestReview?: ReviewDto;
  reviewCount: number;
};

export const ReviewPreviewSection: React.FC<ReviewPreviewSectionProps> = ({
  productId,
  bestReview,
  reviewCount,
}) => {
  const router = useRouter();

const handleViewAll = () => {
  router.push({
    pathname: "/(home)/review-detail",  // ✅ เปลี่ยนจาก "/(customer)/product/[id]/reviews"
    params: { productId: productId },
  } as any);
};

  if (!bestReview) return null;
return (
  <Box px={4} py={3} bg="white" mt={2} w="full">
    <HStack
      w="full"
      justifyContent="space-between"
      alignItems="center"
      mb={2}
      flexWrap="nowrap"
    >
      <Text fontWeight="600" flexShrink={1} numberOfLines={1} ellipsizeMode="tail">
        รีวิว
      </Text>

      <Button variant="ghost" onPress={handleViewAll} px={0}>
        <Text color="#7c3aed" fontSize="xs" numberOfLines={1} ellipsizeMode="tail">
          ดูทั้งหมด ({reviewCount})
        </Text>
      </Button>
    </HStack>

    <Box w="full">
      <ReviewCard review={bestReview} />
    </Box>
  </Box>
);

};
