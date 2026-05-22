// app/(seller)/chat.tsx - Seller Chat List with Realtime Unread
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { Box, HStack, Modal, Pressable, ScrollView, Select, Text, useToast, VStack } from "native-base";
import React, { useCallback, useEffect, useState, useRef } from "react";
import { ActivityIndicator, BackHandler, TextInput } from "react-native";

import { chatAPI, ChatConversation } from "@/api/chat";
import { createReport } from "@/api/report";
import ChatCard from "@/components/chat/chat-card";
import { getGlobalStoreId, getCurrentUserId } from "@/utils/fetch-interceptor";
import { getStoreId, getToken } from "@/utils/secure-store";
import { WS_DOMAIN } from "@/้host";

export default function SellerChatsScreen() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const toast = useToast();

  // Report modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTarget, setReportTarget] = useState<ChatConversation | null>(null);
  const [reportReason, setReportReason] = useState("spam");
  const [reportDesc, setReportDesc] = useState("");
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
  const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
    router.back();
    return true;
  });
  return () => backHandler.remove();
}, []);

  // ✅ โหลด current user ID
  useEffect(() => {
    const userId = getCurrentUserId();
    setCurrentUserId(userId);
  }, []);

  // ✅ โหลด Store ID จาก Global Variable หรือ SecureStore
  const loadStoreId = useCallback(async () => {
    // 1. เช็คจาก Global Variable ก่อน
    let id = getGlobalStoreId();
    
    if (id) {
      console.log('[SellerChat] Using global store ID:', id);
      setStoreId(id);
      return id;
    }

    // 2. ถ้าไม่มีใน memory ให้โหลดจาก SecureStore
    id = await getStoreId();
    
    if (id) {
      console.log('[SellerChat] Loaded store ID from SecureStore:', id);
      setStoreId(id);
      return id;
    }

    console.warn('[SellerChat] No store ID found');
    return null;
  }, []);

  // โหลดรายการ Conversations
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // ✅ โหลด Store ID
      const id = await loadStoreId();

      if (!id) {
        setError("ไม่พบรหัสร้านค้า (กรุณากลับไปหน้าเมนูผู้ขายแล้วลองใหม่)");
        setLoading(false);
        return;
      }

      console.log('[SellerChat] Loading conversations for store:', id);

      // เรียก API
      const data = await chatAPI.getStoreConversations(id);
      console.log('[SellerChat] Loaded conversations:', data.length);
      
      setConversations(data || []);
      console.log('[SellerChat] conversations user_ids:', (data || []).map((c: any) => ({
        conv_id: c.conversation_id,
        user_id: c.user_id,
        username: c.user_username,
      })));
    } catch (e: any) {
      console.error("[SellerChat] load error:", e);
      const errorMsg = e?.response?.data?.detail || "โหลดรายการแชทไม่สำเร็จ";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [loadStoreId]);

  // ✅ Setup WebSocket สำหรับ realtime updates
  useEffect(() => {
    if (!currentUserId) return;

    const setupWebSocket = async () => {
      try {
        const token = await getToken();
        if (!token) {
          console.log('[WS] No token found');
          return;
        }

        const wsUrl = `${WS_DOMAIN}/ws/chat?token=${token}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('[SellerChatList] WebSocket connected');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('[SellerChatList] WS message:', data);

            // ✅ อัพเดท unread count เมื่อมีข้อความใหม่
            if (data.type === 'unread_update') {
              setConversations((prev) =>
                prev.map((conv) => {
                  if (conv.conversation_id === data.conversation_id) {
                    return {
                      ...conv,
                      unread_count: data.unread_count,
                      last_message: data.last_message || conv.last_message,
                      last_message_at: data.last_message_at || conv.last_message_at,
                    };
                  }
                  return conv;
                })
              );
            }

            // ✅ เมื่อข้อความถูกอ่านแล้ว (จากหน้าแชท)
            if (data.type === 'messages_read') {
              setConversations((prev) =>
                prev.map((conv) => {
                  if (conv.conversation_id === data.conversation_id) {
                    return {
                      ...conv,
                      unread_count: 0,
                    };
                  }
                  return conv;
                })
              );
            }
          } catch (e) {
            console.log('[SellerChatList] WS parse error:', e);
          }
        };

        ws.onerror = (e) => {
          console.log('[SellerChatList] WS error:', e);
        };

        ws.onclose = () => {
          console.log('[SellerChatList] WS closed');
        };

        wsRef.current = ws;
      } catch (e) {
        console.log('[SellerChatList] WS setup error:', e);
      }
    };

    setupWebSocket();

    return () => {
      try {
        wsRef.current?.close();
      } catch {}
      wsRef.current = null;
    };
  }, [currentUserId]);

  // ✅ โหลดข้อมูลเมื่อเข้าหน้า
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // รายงานผู้ใช้
  const handleReportUser = (conversation: ChatConversation) => {
    console.log('[Report] handleReportUser called, conversation:', {
      conversation_id: conversation.conversation_id,
      user_id: conversation.user_id,
      user_username: conversation.user_username,
      user_first_name: conversation.user_first_name,
    });
    if (!conversation.user_id) {
      console.warn('[Report] ⚠️ user_id is missing from conversation!');
    }
    setReportTarget(conversation);
    setReportReason("spam");
    setReportDesc("");
    setShowReportModal(true);
  };

  const submitReport = async () => {
    if (!reportTarget) return;
    if (!reportDesc.trim()) {
      toast.show({ description: "กรุณากรอกรายละเอียด", duration: 2000, bg: "orange.500" });
      return;
    }
    try {
      setReporting(true);
      console.log('[Report] submitReport called, reportTarget:', {
        user_id: reportTarget?.user_id,
        user_username: reportTarget?.user_username,
        reason: reportReason,
        description: reportDesc,
      });
      if (!reportTarget?.user_id) {
        console.error('[Report] ❌ Cannot submit: user_id is undefined or null');
        toast.show({ description: "ไม่พบ user_id กรุณาลองใหม่", duration: 2000, bg: "red.500" });
        setReporting(false);
        return;
      }
      await createReport({
        report_type: "user",
        reported_id: reportTarget.user_id,
        reason: reportReason,
        description: reportDesc,
        image_urls: [],
      });
      console.log('[Report] ✅ createReport success');
      toast.show({ description: "รายงานผู้ใช้สำเร็จ", duration: 2000, bg: "green.500" });
      setShowReportModal(false);
    } catch (e) {
      console.error('[Report] ❌ createReport error:', e);
      toast.show({ description: "เกิดข้อผิดพลาด กรุณาลองใหม่", duration: 2000, bg: "red.500" });
    } finally {
      setReporting(false);
    }
  };

  // เปิดหน้าแชท
  const openChat = (conversation: ChatConversation) => {
    const customerName = [
      conversation.user_first_name,
      conversation.user_last_name
    ]
      .filter(Boolean)
      .join(" ") || conversation.user_username || "ลูกค้า";

    router.push({
      pathname: "/(chat)/chat" as any,
      params: {
        conversationId: conversation.conversation_id,
        storeName: customerName,
        userId: conversation.user_id,       // ✅ ส่ง user_id ไปให้หน้าแชทรายงานได้
        viewerType: "SELLER",               // ✅ บอกว่าเป็น seller เปิด
      },
    });
  };

  return (
    <Box flex={1} bg="coolGray.50">
      {/* Header */}
      <Box bg="violet.600" px={4} py={4} safeAreaTop>
        <HStack alignItems="center" space={3}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <VStack flex={1}>
            <Text fontSize="xl" fontWeight="bold" color="white">
              แชทลูกค้า
            </Text>
            {storeId && (
              <Text fontSize="xs" color="white" opacity={0.85}>
                Store ID: {storeId.slice(0, 8)}...
              </Text>
            )}
          </VStack>
          <Pressable onPress={load} disabled={loading}>
            <Ionicons 
              name="refresh" 
              size={22} 
              color={loading ? "rgba(255,255,255,0.5)" : "white"} 
            />
          </Pressable>
        </HStack>
      </Box>

      {/* Loading State */}
      {loading ? (
        <Box flex={1} alignItems="center" justifyContent="center">
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text color="gray.600" mt={3}>
            กำลังโหลด...
          </Text>
        </Box>
      ) : error ? (
        /* Error State */
        <Box flex={1} alignItems="center" justifyContent="center" px={6}>
          <Ionicons name="alert-circle-outline" size={60} color="#999" />
          <Text color="gray.700" textAlign="center" mt={4}>
            {error}
          </Text>
          <Pressable 
            mt={4} 
            bg="violet.600" 
            px={6} 
            py={3} 
            borderRadius={8}
            onPress={load}
          >
            <Text color="white" fontWeight="600">ลองอีกครั้ง</Text>
          </Pressable>
        </Box>
      ) : (
        /* Conversations List */
        <ScrollView>
          <VStack p={4} space={3}>
            {conversations.map((c) => (
              <Box key={c.conversation_id} bg="white" borderRadius={12} mb={1} overflow="hidden">
                <HStack alignItems="center">
                  <Box flex={1}>
                    <ChatCard
                      conversation={c}
                      viewerType="SELLER"
                      onPress={() => openChat(c)}
                    />
                  </Box>
                  <Pressable
                    onPress={() => handleReportUser(c)}
                    px={3}
                    py={4}
                    _pressed={{ bg: "red.50" }}
                  >
                    <Ionicons name="flag-outline" size={20} color="#ef4444" />
                  </Pressable>
                </HStack>
              </Box>
            ))}
            
            {/* Empty State */}
            {conversations.length === 0 && (
              <Box alignItems="center" justifyContent="center" py={20}>
                <Ionicons name="chatbubbles-outline" size={80} color="#ccc" />
                <Text textAlign="center" color="gray.500" mt={6} fontSize="lg">
                  ยังไม่มีแชทจากลูกค้า
                </Text>
                <Text textAlign="center" color="gray.400" mt={2} fontSize="sm">
                  เมื่อลูกค้าส่งข้อความมา จะแสดงที่นี่
                </Text>
              </Box>
            )}
          </VStack>
        </ScrollView>
      )}
      {/* Report Modal */}
      <Modal isOpen={showReportModal} onClose={() => setShowReportModal(false)}>
        <Modal.Content maxWidth="400px">
          {reporting && (
            <Box
              position="absolute" top={0} left={0} right={0} bottom={0}
              bg="rgba(0,0,0,0.35)" zIndex={999}
              justifyContent="center" alignItems="center" borderRadius={8}
            >
              <ActivityIndicator size="large" color="white" />
            </Box>
          )}
          <Modal.CloseButton />
          <Modal.Header>รายงานผู้ใช้</Modal.Header>
          <Modal.Body>
            <VStack space={4}>
              <Text fontSize="sm" color="gray.600">
                รายงาน: <Text fontWeight="bold">{reportTarget?.user_username || reportTarget?.user_first_name || "ผู้ใช้"}</Text>
              </Text>
              <VStack space={2}>
                <Text fontSize="sm" fontWeight="bold" color="gray.700">เหตุผล</Text>
                <Select
                  selectedValue={reportReason}
                  onValueChange={setReportReason}
                >
                  <Select.Item label="สแปม" value="spam" />
                  <Select.Item label="การล่วงละเมิด" value="harassment" />
                  <Select.Item label="เนื้อหาไม่เหมาะสม" value="inappropriate" />
                  <Select.Item label="การหลอกลวง" value="scam" />
                  <Select.Item label="ปลอม/สินค้าปลอม" value="fake" />
                  <Select.Item label="อื่นๆ" value="other" />
                </Select>
              </VStack>
              <VStack space={2}>
                <Text fontSize="sm" fontWeight="bold" color="gray.700">รายละเอียด *</Text>
                <TextInput
                  placeholder="อธิบายรายละเอียดเพิ่มเติม"
                  value={reportDesc}
                  onChangeText={setReportDesc}
                  multiline
                  numberOfLines={3}
                  style={{
                    borderWidth: 1, borderColor: "#e5e7eb",
                    borderRadius: 6, padding: 10, fontSize: 14,
                    textAlignVertical: "top", minHeight: 80,
                  }}
                />
              </VStack>
            </VStack>
          </Modal.Body>
          <Modal.Footer>
            <HStack space={2} flex={1}>
              <Box flex={1}>
                <Pressable
                  onPress={() => setShowReportModal(false)}
                  py={2} borderRadius={6} borderWidth={1} borderColor="gray.300"
                  alignItems="center"
                >
                  <Text color="gray.600" fontWeight="600">ยกเลิก</Text>
                </Pressable>
              </Box>
              <Box flex={1}>
                <Pressable
                  onPress={submitReport}
                  py={2} borderRadius={6} bg="red.500"
                  alignItems="center"
                >
                  <Text color="white" fontWeight="600">รายงาน</Text>
                </Pressable>
              </Box>
            </HStack>
          </Modal.Footer>
        </Modal.Content>
      </Modal>
    </Box>
  );
}