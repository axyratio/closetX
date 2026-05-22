// app/(home)/review-detail.tsx
import { ReviewAPI, ReviewDto } from "@/api/review";
import { ReviewCard } from "@/components/review/review-card";
import { ReviewDraft } from "@/components/review/review-draft";
import ReportModal from "@/components/report/report-modal";
import { createReport } from "@/api/report";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Box,
  Center,
  HStack,
  Pressable,
  Spinner,
  Text,
  VStack,
  Menu,
} from "native-base";
import React, { useEffect, useState } from "react";
import { FlatList, RefreshControl, StatusBar, Alert } from "react-native";

export default function ReviewDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ 
      productId: string; 
      orderId?: string;
      action?: string;
      variantId?: string;
      variantName?: string;
      productName?: string;
    }>();
  const productId = params.productId as string;

  console.log("[ReviewDetail] variant id", params.variantId)

  const [reviews, setReviews] = useState<ReviewDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDraftModal, setShowDraftModal] = useState(false);
  
  // 🆕 State for report modal
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedReviewForReport, setSelectedReviewForReport] = useState<ReviewDto | null>(null);
  
  // เช็คว่ามี action="write" ใน params หรือไม่
  useEffect(() => {
    if (params.action === "write") {
      setShowDraftModal(true);
    }
  }, [params.action]);

  const loadReviews = async (showLoading = true) => {
    if (!productId) return;

    try {
      if (showLoading) {
        setLoading(true);
        setError(null);
      }

      const result = await ReviewAPI.getAllByProduct(productId);

      if (!result.success) {
        setError(result.message);
        setReviews([]);
        return;
      }

      // เรียงตามวันที่ล่าสุดก่อน
      const sortedReviews = (result.data || []).sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setReviews(sortedReviews);
      setError(null);
    } catch (err: any) {
      console.error("Load reviews error:", err);
      setError("เกิดข้อผิดพลาดในการโหลดรีวิว");
      setReviews([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [productId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadReviews(false);
  };

  // 🆕 Handle report review
  const handleReportReview = (review: ReviewDto) => {
    setSelectedReviewForReport(review);
    setReportModalVisible(true);
  };

  // 🆕 Submit report
  const handleSubmitReport = async (data: any) => {
    if (!selectedReviewForReport) return;

    try {
      const reportData = {
        report_type: "user" as const,
        reported_id: selectedReviewForReport.userId,
        reason: data.reason,
        description: `รายงานรีวิว: ${data.description}`,
        image_urls: data.imageUrls,
      };

      await createReport(reportData);
      
      Alert.alert(
        "รายงานสำเร็จ",
        "ขอบคุณที่แจ้งเรา เราจะตรวจสอบและดำเนินการต่อไป",
        [
          {
            text: "ตกลง",
            onPress: () => {
              setReportModalVisible(false);
              setSelectedReviewForReport(null);
            },
          },
        ]
      );
    } catch (error) {
      console.error("Submit report error:", error);
      Alert.alert(
        "เกิดข้อผิดพลาด",
        "ไม่สามารถส่งรายงานได้ กรุณาลองใหม่อีกครั้ง"
      );
    }
  };

  // คำนวณคะแนนเฉลี่ย
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  // นับจำนวนรีวิวแต่ละดาว
  const starCounts = [5, 4, 3, 2, 1].map(
    (star) => reviews.filter((r) => r.rating === star).length
  );

  if (loading) {
    return (
      <Box flex={1} bg="coolGray.50">
        <StatusBar backgroundColor="#7c3aed" barStyle="light-content" />
        <Box safeAreaTop bg="violet.600" />

        <Box bg="violet.600" px={4} py={3}>
          <HStack alignItems="center" space={3}>
            <Pressable onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>
            <Text fontSize="lg" fontWeight="bold" color="white">
              รีวิวสินค้า
            </Text>
          </HStack>
        </Box>

        <Center flex={1}>
          <Spinner size="lg" color="violet.600" />
          <Text mt={2} color="gray.500">
            กำลังโหลดรีวิว...
          </Text>
        </Center>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="coolGray.50">
      <StatusBar backgroundColor="#7c3aed" barStyle="light-content" />
      <Box safeAreaTop bg="violet.600" />

      {/* Header */}
      <Box bg="violet.600" px={4} py={3}>
        <HStack alignItems="center" space={3}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <Text fontSize="lg" fontWeight="bold" color="white">
            รีวิวสินค้า ({reviews.length})
          </Text>
        </HStack>
      </Box>

      {error ? (
        <Center flex={1} px={4}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text mt={4} fontSize="md" color="gray.700" textAlign="center">
            {error}
          </Text>
          <Pressable
            mt={4}
            px={6}
            py={3}
            bg="violet.600"
            rounded="lg"
            onPress={() => loadReviews()}
          >
            <Text color="white" fontWeight="bold">
              ลองใหม่อีกครั้ง
            </Text>
          </Pressable>
        </Center>
      ) : reviews.length === 0 ? (
        <Center flex={1} px={4}>
          <Ionicons name="chatbox-outline" size={64} color="#9CA3AF" />
          <Text mt={4} fontSize="md" color="gray.500" textAlign="center">
            ยังไม่มีรีวิวสำหรับสินค้านี้
          </Text>
        </Center>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.reviewId}
          ListHeaderComponent={
            <Box bg="white" p={4} mb={2}>
              <VStack space={2}>
                {/* คะแนนเฉลี่ย */}
                <HStack alignItems="center" space={2}>
                  <Text fontSize="3xl" fontWeight="bold" color="gray.800">
                    {averageRating.toFixed(1)}
                  </Text>
                  <VStack>
                    <HStack alignItems="center" space={1}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Ionicons
                          key={i}
                          name={i < Math.round(averageRating) ? "star" : "star-outline"}
                          size={16}
                          color="#facc15"
                        />
                      ))}
                    </HStack>
                    <Text fontSize="xs" color="gray.500">
                      จากทั้งหมด {reviews.length} รีวิว
                    </Text>
                  </VStack>
                </HStack>

                {/* กราฟดาว */}
                <VStack space={1} mt={2}>
                  {[5, 4, 3, 2, 1].map((star, idx) => {
                    const count = starCounts[idx];
                    const percentage =
                      reviews.length > 0
                        ? (count / reviews.length) * 100
                        : 0;

                    return (
                      <HStack key={star} alignItems="center" space={2}>
                        <Text fontSize="xs" color="gray.600" w={8}>
                          {star} ⭐
                        </Text>
                        <Box
                          flex={1}
                          h={2}
                          bg="gray.200"
                          rounded="full"
                          overflow="hidden"
                        >
                          <Box
                            h="full"
                            w={`${percentage}%`}
                            bg="yellow.400"
                          />
                        </Box>
                        <Text fontSize="xs" color="gray.600" w={8}>
                          {count}
                        </Text>
                      </HStack>
                    );
                  })}
                </VStack>
              </VStack>
            </Box>
          }
          renderItem={({ item }) => (
            <Box bg="white" mb={2}>
              <HStack justifyContent="space-between" alignItems="flex-start" p={3}>
                <Box flex={1}>
                  <ReviewCard review={item} />
                </Box>
                {/* 🆕 Report button for each review */}
                <Menu
                  trigger={(triggerProps) => (
                    <Pressable {...triggerProps} p={2}>
                      <Ionicons name="ellipsis-vertical" size={20} color="#6B7280" />
                    </Pressable>
                  )}
                >
                  <Menu.Item onPress={() => handleReportReview(item)}>
                    <HStack space={2} alignItems="center">
                      <Ionicons name="flag-outline" size={18} color="#EF4444" />
                      <Text>รายงานรีวิว</Text>
                    </HStack>
                  </Menu.Item>
                </Menu>
              </HStack>
            </Box>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#7c3aed"]}
            />
          }
          contentContainerStyle={{ paddingBottom: 16 }}
        />
      )}
      <Pressable
        position="absolute"
        bottom={4}
        right={4}
        w={14}
        h={14}
        rounded="full"
        bg="violet.600"
        shadow={4}
        justifyContent="center"
        alignItems="center"
        onPress={() => setShowDraftModal(true)}
      >
        <Ionicons name="create-outline" size={24} color="white" />
      </Pressable>

      {/* Review Draft Modal */}
      <ReviewDraft
        visible={showDraftModal}
        productId={productId}
        orderId={params.orderId || ""}
        variantId={params.variantId}
        variantName={params.variantName}
        productName={params.productName}
        onClose={() => setShowDraftModal(false)}
        onSuccess={() => {
          loadReviews(false); // Reload reviews
        }}
      />

      {/* 🆕 Report Modal */}
      {selectedReviewForReport && (
        <ReportModal
          visible={reportModalVisible}
          onClose={() => {
            setReportModalVisible(false);
            setSelectedReviewForReport(null);
          }}
          onSubmit={handleSubmitReport}
          reportType="user"
          reportedId={selectedReviewForReport.userId}
          reportedName={selectedReviewForReport.userDisplayName}
        />
      )}
    </Box>
  );
}