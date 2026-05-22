// components/review/grid.tsx
import React from "react";
import { FlatList } from "react-native";
import { Box } from "native-base";
import { ReviewDto } from "@/api/products";
import { ReviewCard } from "./card";

type ReviewListProps = {
  reviews: ReviewDto[];
};

export const ReviewList: React.FC<ReviewListProps> = ({ reviews }) => {
  return (
    <FlatList
      data={reviews}
      keyExtractor={(item) => item.reviewId}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      renderItem={({ item }) => (
        <Box mb={4}>
          <ReviewCard review={item} />
        </Box>
      )}
    />
  );
};
