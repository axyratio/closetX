// app/(seller)/returns.tsx
import {
  fetchReturnRequests,
  handleReturnRequest,
  ReturnRequest,
} from "@/api/seller";
import { getToken } from "@/utils/secure-store";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Box,
  Button,
  Center,
  HStack,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Spinner,
  StatusBar,
  Text,
  useToast,
  VStack,
} from "native-base";
import React, { useCallback, useEffect, useState } from "react";
import { BackHandler, FlatList, RefreshControl, TextInput } from "react-native";

type TabType = "PENDING" | "REFUNDED" | "REJECTED" | "ALL";

const TABS: { key: TabType; label: string }[] = [
  { key: "PENDING", label: "รอดำเนินการ" },
  { key: "REFUNDED", label: "อนุมัติแล้ว" },
  { key: "REJECTED", label: "ปฏิเสธแล้ว" },
  { key: "ALL", label: "ทั้งหมด" },
];

const REASON_MAP: Record<string, string> = {
  WRONG_ITEM: "สินค้าไม่ตรงตามที่สั่ง",
  DAMAGED: "สินค้าชำรุดเสียหาย",
  NOT_AS_DESCRIBED: "สินค้าไม่ตรงตามคำอธิบาย",
  DEFECTIVE: "สินค้ามีตำหนิ",
  SIZE_ISSUE: "ขนาดไม่พอดี",
  QUALITY_ISSUE: "คุณภาพไม่ดี",
  OTHER: "อื่นๆ",
};

export default function SellerReturnsScreen() {
  const router = useRouter();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<TabType>("PENDING");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);

  // Modal for handling return
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(
    null,
  );
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { from } = useLocalSearchParams<{ from?: string }>();

  useEffect(() => {
    const backAction = () => {
      if (from === "notification_seller") {
        router.navigate({
          pathname: "/(tabs)/notification",
          params: { initialTab: "seller" },
        } as any);
      } else {
        router.back();
      }
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );

    return () => backHandler.remove();
  }, [from]);

  useEffect(() => {
    loadReturns();
  }, [activeTab]);

  const loadReturns = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      const token = await getToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      const status = activeTab === "ALL" ? undefined : activeTab;
      const data = await fetchReturnRequests(token, status);
      setReturns(data);
    } catch (error) {
      console.error("Error loading returns:", error);
      toast.show({
        description: "ไม่สามารถโหลดข้อมูลได้",
        duration: 2000,
        bg: "red.500",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadReturns(false);
  }, [activeTab]);

  const handleViewDetail = (returnReq: ReturnRequest) => {
    setSelectedReturn(returnReq);
    setNote("");
    setShowDetailModal(true);
  };

  const handleAction = async (action: "APPROVE" | "REJECT") => {
    if (!selectedReturn) return;

    try {
      setSubmitting(true);
      const token = await getToken();
      if (!token) return;

      const result = await handleReturnRequest(
        token,
        selectedReturn.return_id,
        action,
        note,
      );

      toast.show({
        description: result.message,
        duration: 2000,
        bg: "green.500",
      });

      setShowDetailModal(false);
      loadReturns(false);
    } catch (error) {
      toast.show({
        description: "เกิดข้อผิดพลาด กรุณาลองใหม่",
        duration: 2000,
        bg: "red.500",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderReturnCard = ({ item }: { item: ReturnRequest }) => (
    <Pressable
      onPress={() => handleViewDetail(item)}
      _pressed={{ opacity: 0.7 }}
    >
      <Box bg="white" rounded="lg" p={4} mb={3} shadow={1}>
        {/* Header */}
        <HStack justifyContent="space-between" alignItems="center" mb={3}>
          <VStack flex={1}>
            {/* <Text fontSize="xs" color="gray.500">
              Return ID: {item.return_id.substring(0, 8)}...
            </Text> */}
            <Text fontSize="sm" fontWeight="bold" color="gray.800">
              {item.customer_name}
            </Text>
          </VStack>
          <Box
            bg={
              item.status === "PENDING"
                ? "orange.100"
                : item.status === "REFUNDED"
                  ? "green.100"
                  : "red.100"
            }
            px={3}
            py={1}
            rounded="full"
          >
            <Text
              fontSize="xs"
              fontWeight="bold"
              color={
                item.status === "PENDING"
                  ? "orange.600"
                  : item.status === "REFUNDED"
                    ? "green.600"
                    : "red.600"
              }
            >
              {item.status_text}
            </Text>
          </Box>
        </HStack>

        {/* Reason */}
        <Box bg="coolGray.50" p={3} rounded="md" mb={3}>
          <HStack alignItems="flex-start" space={2}>
            <Ionicons name="alert-circle" size={16} color="#f59e0b" />
            <VStack flex={1}>
              <Text fontSize="xs" fontWeight="bold" color="gray.700">
                เหตุผลการคืน
              </Text>
              <Text fontSize="xs" color="gray.600">
                {REASON_MAP[item.reason] || item.reason}
              </Text>
              {item.reason_detail && (
                <Text fontSize="xs" color="gray.500" mt={1}>
                  {item.reason_detail}
                </Text>
              )}
            </VStack>
          </HStack>
        </Box>

        {/* Items */}
        {item.order_items.map((orderItem, index) => (
          <HStack key={index} space={2} mb={2}>
            <VStack flex={1}>
              <Text fontSize="sm" color="gray.800" numberOfLines={1}>
                {orderItem.product_name}
              </Text>
              <Text fontSize="xs" color="gray.500">
                {orderItem.variant_name} × {orderItem.quantity}
              </Text>
            </VStack>
            <Text fontSize="sm" color="gray.600">
              ฿{(orderItem.unit_price * orderItem.quantity).toLocaleString()}
            </Text>
          </HStack>
        ))}

        {/* Images Preview */}
        {item.image_urls.length > 0 && (
          <HStack space={2} mt={2}>
            {item.image_urls.slice(0, 3).map((url, index) => (
              <Image
                key={index}
                source={{ uri: url }}
                alt="evidence"
                size="60px"
                rounded="md"
              />
            ))}
            {item.image_urls.length > 3 && (
              <Center bg="gray.200" size="60px" rounded="md">
                <Text fontSize="xs" color="gray.600">
                  +{item.image_urls.length - 3}
                </Text>
              </Center>
            )}
          </HStack>
        )}

        {/* Footer */}
        <HStack
          justifyContent="space-between"
          alignItems="center"
          pt={3}
          borderTopWidth={1}
          borderTopColor="coolGray.200"
          mt={3}
        >
          <Text fontSize="sm" color="gray.500">
            ยอดคืน:{" "}
            <Text fontWeight="bold" color="red.600">
              ฿{item.refund_amount.toLocaleString()}
            </Text>
          </Text>
          {item.status === "PENDING" && (
            <Text fontSize="xs" color="violet.600" fontWeight="bold">
              แตะเพื่อดำเนินการ →
            </Text>
          )}
        </HStack>
      </Box>
    </Pressable>
  );

  return (
    <Box flex={1} bg="coolGray.50">
      <StatusBar backgroundColor="#7c3aed" barStyle="light-content" />
      <Box safeAreaTop bg="violet.600" />

      {/* Header */}
      <Box bg="violet.600" px={4} py={3}>
        <HStack alignItems="center" space={3}>
          <Pressable
            onPress={() => {
              if (from === "notification_seller") {
                router.navigate({
                  pathname: "/(tabs)/notification",
                  params: { initialTab: "seller" },
                } as any);
              } else {
                router.back();
              }
            }}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <Text fontSize="lg" fontWeight="bold" color="white">
            การคืนสินค้า
          </Text>
        </HStack>
      </Box>

      {/* Tabs */}
      <Box bg="white" borderBottomWidth={1} borderBottomColor="coolGray.200">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <HStack>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  px={4}
                  py={3}
                  borderBottomWidth={2}
                  borderBottomColor={isActive ? "violet.600" : "transparent"}
                >
                  <Text
                    fontSize="sm"
                    fontWeight={isActive ? "bold" : "normal"}
                    color={isActive ? "violet.600" : "gray.500"}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </HStack>
        </ScrollView>
      </Box>

      {/* Content */}
      {loading ? (
        <Center flex={1}>
          <Spinner size="lg" color="violet.600" />
        </Center>
      ) : returns.length === 0 ? (
        <Center flex={1}>
          <Ionicons name="checkmark-circle-outline" size={64} color="#d1d5db" />
          <Text mt={4} color="gray.500">
            ไม่มีคำขอคืนสินค้า
          </Text>
        </Center>
      ) : (
        <FlatList
          data={returns}
          keyExtractor={(item) => item.return_id}
          renderItem={renderReturnCard}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#7c3aed"]}
            />
          }
        />
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        size="full"
      >
        <Modal.Content maxWidth="500px">
          {/* Loading Overlay — inside Modal.Content so it sits above the modal */}
          {submitting && (
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              bg="rgba(0,0,0,0.35)"
              zIndex={999}
              justifyContent="center"
              alignItems="center"
              borderRadius={8}
            >
              <Spinner size="lg" color="white" />
            </Box>
          )}
          <Modal.CloseButton />
          <Modal.Header>รายละเอียดการคืนสินค้า</Modal.Header>
          <Modal.Body>
            <ScrollView showsVerticalScrollIndicator={false}>
              <VStack space={4}>
                {/* Customer Info */}
                <Box>
                  <Text fontSize="sm" fontWeight="bold" color="gray.700" mb={2}>
                    ข้อมูลลูกค้า
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    {selectedReturn?.customer_name}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    Order ID: {selectedReturn?.order_id}
                  </Text>
                </Box>

                {/* Reason */}
                <Box>
                  <Text fontSize="sm" fontWeight="bold" color="gray.700" mb={2}>
                    เหตุผลการคืน
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    {selectedReturn && REASON_MAP[selectedReturn.reason]}
                  </Text>
                  {selectedReturn?.reason_detail && (
                    <Text fontSize="sm" color="gray.500" mt={1}>
                      {selectedReturn.reason_detail}
                    </Text>
                  )}
                </Box>

                {/* Products */}
                <Box>
                  <Text fontSize="sm" fontWeight="bold" color="gray.700" mb={2}>
                    สินค้าที่ขอคืน
                  </Text>
                  {selectedReturn?.order_items.map((item, index) => (
                    <HStack key={index} justifyContent="space-between" mb={2}>
                      <VStack flex={1}>
                        <Text fontSize="sm" color="gray.800">
                          {item.product_name}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {item.variant_name} × {item.quantity}
                        </Text>
                      </VStack>
                      <Text fontSize="sm" color="gray.600">
                        ฿{(item.unit_price * item.quantity).toLocaleString()}
                      </Text>
                    </HStack>
                  ))}
                  <Box
                    borderTopWidth={1}
                    borderTopColor="gray.200"
                    pt={2}
                    mt={2}
                  >
                    <HStack justifyContent="space-between">
                      <Text fontSize="sm" fontWeight="bold" color="gray.700">
                        ยอดคืนเงินทั้งหมด
                      </Text>
                      <Text fontSize="md" fontWeight="bold" color="red.600">
                        ฿{selectedReturn?.refund_amount.toLocaleString()}
                      </Text>
                    </HStack>
                  </Box>
                </Box>

                {/* Images */}
                {selectedReturn && selectedReturn.image_urls.length > 0 && (
                  <Box>
                    <Text
                      fontSize="sm"
                      fontWeight="bold"
                      color="gray.700"
                      mb={2}
                    >
                      ภาพหลักฐาน
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
                      <HStack space={2}>
                        {selectedReturn.image_urls.map((url, index) => (
                          <Image
                            key={index}
                            source={{ uri: url }}
                            alt={`evidence-${index}`}
                            size="120px"
                            rounded="md"
                          />
                        ))}
                      </HStack>
                    </ScrollView>
                  </Box>
                )}

                {/* Note (only for pending) */}
                {selectedReturn?.status === "PENDING" && (
                  <Box>
                    <Text
                      fontSize="sm"
                      fontWeight="bold"
                      color="gray.700"
                      mb={2}
                    >
                      หมายเหตุ (ถ้ามี)
                    </Text>
                    <TextInput
                      placeholder="เช่น กรุณาส่งสินค้าคืนภายใน 7 วัน"
                      value={note}
                      onChangeText={setNote}
                      style={{
                        borderWidth: 1,
                        borderColor: "#d1d5db",
                        borderRadius: 6,
                        padding: 10,
                        minHeight: 80,
                      }}
                      multiline
                    />
                  </Box>
                )}
              </VStack>
            </ScrollView>
          </Modal.Body>
          <Modal.Footer>
            {selectedReturn?.status === "PENDING" ? (
              <HStack space={2} flex={1}>
                <Button
                  variant="outline"
                  borderColor="red.500"
                  _text={{ color: "red.500", fontWeight: "bold" }}
                  onPress={() => handleAction("REJECT")}
                  isLoading={submitting}
                  flex={1}
                >
                  ปฏิเสธ
                </Button>
                <Button
                  bg="green.600"
                  _pressed={{ bg: "green.700" }}
                  _text={{ color: "white", fontWeight: "bold" }}
                  onPress={() => handleAction("APPROVE")}
                  isLoading={submitting}
                  flex={1}
                >
                  อนุมัติ
                </Button>
              </HStack>
            ) : (
              <Button
                variant="ghost"
                _text={{ color: "gray.600" }}
                onPress={() => setShowDetailModal(false)}
              >
                ปิด
              </Button>
            )}
          </Modal.Footer>
        </Modal.Content>
      </Modal>
    </Box>
  );
}
