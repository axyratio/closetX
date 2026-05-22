// app/(chat)/chat.tsx - Chat Screen with User/Store Report Support
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { chatAPI, ChatMessage } from "@/api/chat";
import { createReport } from "@/api/report";
import ChatInput from "@/components/chat/chat-input";
import ReportModal from "@/components/report/report-modal";
import { getCurrentUserId } from "@/utils/fetch-interceptor";
import { getToken } from "@/utils/secure-store";
import { WS_DOMAIN } from "@/้host";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

function normalizeParam(p: unknown): string | undefined {
  if (Array.isArray(p)) return p[0];
  if (typeof p === "string") return p;
  return undefined;
}

function formatDateLabel(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateOnly = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const yesterdayOnly = new Date(
    yesterday.getFullYear(),
    yesterday.getMonth(),
    yesterday.getDate(),
  );

  if (dateOnly.getTime() === todayOnly.getTime()) return "วันนี้";
  if (dateOnly.getTime() === yesterdayOnly.getTime()) return "เมื่อวาน";

  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function isSameDay(date1: string, date2: string): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const paramConversationId = useMemo(
    () => normalizeParam(params.conversationId),
    [params.conversationId],
  );
  const paramStoreId = useMemo(
    () => normalizeParam(params.storeId),
    [params.storeId],
  );
  const paramStoreName = useMemo(
    () => normalizeParam(params.storeName),
    [params.storeName],
  );
  // ✅ เพิ่ม params สำหรับ report
  const paramUserId = useMemo(
    () => normalizeParam(params.userId),
    [params.userId],
  );
  const paramViewerType = useMemo(
    () =>
      normalizeParam(params.viewerType) as "CUSTOMER" | "SELLER" | undefined,
    [params.viewerType],
  );

  const [resolvedConversationId, setResolvedConversationId] = useState<
    string | undefined
  >();
  const [resolvedStoreName, setResolvedStoreName] = useState<
    string | undefined
  >();
  const [resolvedStoreId, setResolvedStoreId] = useState<string | undefined>();
  // ✅ เพิ่ม state สำหรับ userId
  const [resolvedUserId, setResolvedUserId] = useState<string | undefined>();

  const cid = resolvedConversationId;
  const headerTitle = resolvedStoreName ?? paramStoreName ?? "แชท";
  // ✅ ตรวจสอบว่าเป็น seller หรือไม่
  const isSeller = paramViewerType === "SELLER";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sendingImage, setSendingImage] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [wsReady, setWsReady] = useState(false);
  const [isInChat, setIsInChat] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Report states
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const isLoadingMoreRef = useRef(false);
  const shouldScrollToEndRef = useRef(false);
  const PAGE_SIZE = 20;

  useFocusEffect(
    useCallback(() => {
      setIsInChat(true);
      return () => setIsInChat(false);
    }, []),
  );

  // Resolver
  useEffect(() => {
    if (paramConversationId) {
      setResolvedConversationId(paramConversationId);
      setResolvedStoreName(paramStoreName ?? "แชท");
      setResolvedStoreId(paramStoreId);
      setResolvedUserId(paramUserId); // ✅ เก็บ userId
      return;
    }

    if (paramStoreId) {
      (async () => {
        try {
          setLoading(true);
          const conv = await chatAPI.createOrGetConversation(paramStoreId);
          setResolvedConversationId(conv.conversation_id);
          setResolvedStoreName(conv.store_name ?? paramStoreName ?? "ร้านค้า");
          setResolvedStoreId(conv.store_id);
          setResolvedUserId(paramUserId); // ✅ เก็บ userId
          setLoading(false);
        } catch (e: any) {
          setLoading(false);
          setTimeout(() => {
            Alert.alert(
              "ไม่พบแชท",
              e?.response?.data?.detail || "ไม่สามารถสร้างบทสนทนาได้",
              [{ text: "ตกลง", onPress: () => router.back() }],
            );
          }, 300);
        }
      })();
    }
    setLoading(false);
  }, [paramConversationId, paramStoreId, paramStoreName, paramUserId]);

  // Get current user
  useEffect(() => {
    const userId = getCurrentUserId();
    setCurrentUserId(userId);
  }, []);

  // ✅ Handle report - รองรับทั้ง store และ user
  const handleReport = () => {
    setMenuVisible(false);

    if (isSeller) {
      // Seller รายงาน Customer
      if (!resolvedUserId) {
        Alert.alert("ข้อผิดพลาด", "ไม่พบข้อมูลลูกค้า");
        return;
      }
    } else {
      // Customer รายงาน Store
      if (!resolvedStoreId) {
        Alert.alert("ข้อผิดพลาด", "ไม่พบข้อมูลร้านค้า");
        return;
      }
    }

    setReportModalVisible(true);
  };

  // ✅ Submit report - รองรับทั้ง store และ user
  const handleSubmitReport = async (data: any) => {
    try {
      const reportData = isSeller
        ? {
            // Seller รายงาน Customer
            report_type: "user" as const,
            reported_id: resolvedUserId!,
            reason: data.reason,
            description: data.description,
            image_urls: data.imageUrls,
          }
        : {
            // Customer รายงาน Store
            report_type: "store" as const,
            reported_id: resolvedStoreId!,
            reason: data.reason,
            description: data.description,
            image_urls: data.imageUrls,
          };

      console.log("📝 Submitting report:", reportData);

      await createReport(reportData);

      const targetName = isSeller ? "ลูกค้า" : "ร้านค้า";

      Alert.alert(
        "รายงานสำเร็จ",
        `ขอบคุณที่แจ้งเรา เราจะตรวจสอบ${targetName}นี้และดำเนินการต่อไป`,
        [
          {
            text: "ตกลง",
            onPress: () => setReportModalVisible(false),
          },
        ],
      );
    } catch (error: any) {
      console.error("Submit report error:", error);
      Alert.alert(
        "เกิดข้อผิดพลาด",
        error?.response?.data?.detail ||
          "ไม่สามารถส่งรายงานได้ กรุณาลองใหม่อีกครั้ง",
      );
    }
  };

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    if (!cid) return;

    console.log("[fetchMessages] Loading initial 20 messages");
    setLoading(true);

    try {
      const data = await chatAPI.getConversationMessages(
        cid,
        undefined,
        PAGE_SIZE,
      );
      console.log(`[fetchMessages] Loaded ${data.length} messages`);

      setMessages(data.reverse());
      setHasMore(data.length === PAGE_SIZE);

      shouldScrollToEndRef.current = true;

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
        shouldScrollToEndRef.current = false;
      }, 300);
    } catch (err: any) {
      console.log("[fetchMessages] ❌ error =", err);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถโหลดข้อความได้");
    } finally {
      setLoading(false);
    }
  }, [cid]);

  // Load more messages
  const loadMoreMessages = useCallback(async () => {
    if (!cid || !hasMore || loadingMore || loading || messages.length === 0)
      return;

    const oldestMessageId = messages[0].message_id;

    console.log(`[loadMoreMessages] Loading older than ${oldestMessageId}`);
    setLoadingMore(true);
    isLoadingMoreRef.current = true;
    shouldScrollToEndRef.current = false;

    try {
      const data = await chatAPI.getConversationMessages(
        cid,
        oldestMessageId,
        PAGE_SIZE,
      );
      console.log(`[loadMoreMessages] Loaded ${data.length} older messages`);

      if (data.length > 0) {
        setMessages((prev) => {
          const olderMessages = data.reverse();
          const existingIds = new Set(prev.map((m) => m.message_id));
          const uniqueMessages = olderMessages.filter(
            (m) => !existingIds.has(m.message_id),
          );

          return [...uniqueMessages, ...prev];
        });
        setHasMore(data.length === PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (err: any) {
      console.log("[loadMoreMessages] ❌ error =", err);
    } finally {
      setLoadingMore(false);
      setTimeout(() => {
        isLoadingMoreRef.current = false;
      }, 500);
    }
  }, [cid, messages, hasMore, loadingMore, loading]);

  // WebSocket setup
  useEffect(() => {
    if (!cid) return;

    const setup = async () => {
      try {
        setWsReady(false);
        const token = await getToken();
        if (!token) return;

        const wsUrl = `${WS_DOMAIN}/ws/chat?token=${token}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setWsReady(true);
          ws.send(
            JSON.stringify({
              action: "join_conversation",
              conversation_id: cid,
            }),
          );
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (
              data?.type === "new_message" &&
              data?.message?.conversation_id === cid
            ) {
              const newMessage = data.message;

              setMessages((prev) => {
                const exists = prev.some(
                  (m) => m.message_id === newMessage.message_id,
                );
                if (exists) return prev;

                return [...prev, newMessage];
              });

              shouldScrollToEndRef.current = true;

              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
                shouldScrollToEndRef.current = false;
              }, 100);

              if (isInChat && newMessage.sender_id !== currentUserId) {
                chatAPI.markAsRead(cid).catch(console.log);
              }
            }
          } catch (e) {
            console.log("[WS] parse error:", e);
          }
        };

        ws.onerror = (e) => console.log("[WS] error:", e);
        ws.onclose = () => setWsReady(false);

        wsRef.current = ws;
      } catch (e) {
        setWsReady(false);
      }
    };

    setup();
    fetchMessages();

    return () => {
      wsRef.current?.close();
      wsRef.current = null;
      setWsReady(false);
    };
  }, [cid, fetchMessages, isInChat, currentUserId]);

  // Mark as read
  useEffect(() => {
    if (!cid || !isInChat) return;
    chatAPI.markAsRead(cid).catch(console.log);
  }, [cid, isInChat]);

  // Send message
  const handleSendMessage = useCallback(
    (content: string) => {
      if (
        !cid ||
        !wsRef.current ||
        !wsReady ||
        wsRef.current.readyState !== WebSocket.OPEN
      ) {
        Alert.alert("ข้อผิดพลาด", "กำลังเชื่อมต่อแชท กรุณารอสักครู่");
        return;
      }

      wsRef.current.send(
        JSON.stringify({
          action: "send_message",
          conversation_id: cid,
          content,
          message_type: "text",
        }),
      );
    },
    [cid, wsReady],
  );

  // Send image
  const handleSendImage = useCallback(
    async (imageUri: string) => {
      if (!cid) return;

      setSendingImage(true);
      try {
        const newMessage = await chatAPI.sendImageMessage(cid, imageUri);

        setMessages((prev) => {
          const exists = prev.some(
            (m) => m.message_id === newMessage.message_id,
          );
          if (exists) return prev;
          return [...prev, newMessage];
        });

        shouldScrollToEndRef.current = true;

        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
          shouldScrollToEndRef.current = false;
        }, 300);
      } catch (err: any) {
        Alert.alert("ข้อผิดพลาด", "ไม่สามารถส่งรูปภาพได้");
      } finally {
        setSendingImage(false);
      }
    },
    [cid],
  );

  // Render message
  const renderMessageItem = ({
    item,
    index,
  }: {
    item: ChatMessage;
    index: number;
  }) => {
    const isMyMessage = item.sender_id === currentUserId;
    const messageTime = new Date(item.created_at).toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const showDateSeparator =
      index === 0 ||
      !isSameDay(messages[index - 1].created_at, item.created_at);
    const dateSeparatorKey = `date-${item.created_at.split("T")[0]}-${index}`;

    return (
      <>
        {showDateSeparator && (
          <View key={dateSeparatorKey} style={styles.dateSeparatorContainer}>
            <View style={styles.dateSeparatorLine} />
            <Text style={styles.dateSeparatorText}>
              {formatDateLabel(item.created_at)}
            </Text>
            <View style={styles.dateSeparatorLine} />
          </View>
        )}

        <View
          style={[
            styles.messageContainer,
            isMyMessage
              ? styles.myMessageContainer
              : styles.otherMessageContainer,
          ]}
        >
          {item.message_type === "image" && item.image_path ? (
            <TouchableOpacity
              onPress={() => setSelectedImage(item.image_path)}
              style={[
                styles.imageMessageWrapper,
                isMyMessage ? styles.myMessage : styles.otherMessage,
              ]}
            >
              <Image
                source={{ uri: item.image_path }}
                style={styles.messageImage}
                resizeMode="cover"
              />
              <Text
                style={[
                  styles.messageTime,
                  isMyMessage ? styles.myMessageTime : styles.otherMessageTime,
                ]}
              >
                {messageTime}
              </Text>
            </TouchableOpacity>
          ) : (
            <View
              style={[
                styles.messageBubble,
                isMyMessage ? styles.myMessage : styles.otherMessage,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  isMyMessage ? styles.myMessageText : styles.otherMessageText,
                ]}
              >
                {item.content}
              </Text>
              <Text
                style={[
                  styles.messageTime,
                  isMyMessage ? styles.myMessageTime : styles.otherMessageTime,
                ]}
              >
                {messageTime}
              </Text>
            </View>
          )}
        </View>
      </>
    );
  };

  // Render header
  const renderListHeader = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMoreContainer}>
        <ActivityIndicator size="small" color="#8b5cf6" />
        <Text style={styles.loadingMoreText}>กำลังโหลดข้อความเก่า...</Text>
      </View>
    );
  };

  if (!cid) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>แชท</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>เปิดแชทไม่สำเร็จ</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header with Report Button */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.navigate("/(tabs)/chat" as any)}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {headerTitle}
        </Text>
        {/* Report Menu Button */}
        <TouchableOpacity
          onPress={() => setMenuVisible(true)}
          style={styles.headerButton}
        >
          <Ionicons name="ellipsis-vertical" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex1}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8b5cf6" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.message_id}
            renderItem={renderMessageItem}
            ListHeaderComponent={renderListHeader}
            contentContainerStyle={styles.messagesList}
            initialNumToRender={20}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={true}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
            }}
            scrollEventThrottle={16}
            onScroll={({ nativeEvent }) => {
              const isNearTop = nativeEvent.contentOffset.y <= 50;
              if (isNearTop && !loadingMore && hasMore) {
                loadMoreMessages();
              }
            }}
          />
        )}

        {sendingImage && (
          <View style={styles.sendingIndicator}>
            <ActivityIndicator size="small" color="#8b5cf6" />
            <Text style={styles.sendingText}>กำลังส่งรูปภาพ...</Text>
          </View>
        )}

        <ChatInput
          onSendMessage={handleSendMessage}
          onSendImage={handleSendImage}
          disabled={sendingImage || !wsReady}
        />
      </KeyboardAvoidingView>

      {/* Report Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={styles.menuOverlay}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={handleReport}>
              <Ionicons name="flag-outline" size={20} color="#EF4444" />
              <Text style={styles.menuItemText}>
                {isSeller ? "รายงานลูกค้า" : "รายงานร้านค้า"}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Image Viewer */}
      <Modal
        visible={!!selectedImage}
        transparent
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.imageViewerContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedImage(null)}
          >
            <Ionicons name="close-circle" size={40} color="#fff" />
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* ✅ Report Modal - รองรับทั้ง store และ user */}
      {(isSeller ? resolvedUserId : resolvedStoreId) && (
        <ReportModal
          visible={reportModalVisible}
          onClose={() => setReportModalVisible(false)}
          onSubmit={handleSubmitReport}
          reportType={isSeller ? "user" : "store"}
          reportedId={isSeller ? resolvedUserId! : resolvedStoreId!}
          reportedName={headerTitle}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9" },
  flex1: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerButton: {
    padding: 4,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginHorizontal: 8,
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  messagesList: { padding: 16, flexGrow: 1 },
  loadingMoreContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
  },
  loadingMoreText: { marginLeft: 8, fontSize: 14, color: "#8b5cf6" },
  dateSeparatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  dateSeparatorLine: { flex: 1, height: 1, backgroundColor: "#e0e0e0" },
  dateSeparatorText: {
    marginHorizontal: 12,
    fontSize: 12,
    fontWeight: "500",
    color: "#999",
    backgroundColor: "#f9f9f9",
    paddingHorizontal: 8,
  },
  messageContainer: { marginBottom: 12 },
  myMessageContainer: { alignItems: "flex-end" },
  otherMessageContainer: { alignItems: "flex-start" },
  messageBubble: { maxWidth: "75%", padding: 12, borderRadius: 16 },
  myMessage: { backgroundColor: "#8b5cf6", borderBottomRightRadius: 4 },
  otherMessage: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: { fontSize: 16, lineHeight: 22 },
  myMessageText: { color: "#fff" },
  otherMessageText: { color: "#333" },
  messageTime: { fontSize: 11, marginTop: 4 },
  myMessageTime: { color: "rgba(255,255,255,0.7)", textAlign: "right" },
  otherMessageTime: { color: "#999", textAlign: "left" },
  imageMessageWrapper: {
    maxWidth: "75%",
    borderRadius: 16,
    overflow: "hidden",
  },
  messageImage: { width: 250, height: 250, borderRadius: 12 },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#666", marginTop: 16 },
  sendingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
  },
  sendingText: { marginLeft: 8, fontSize: 14, color: "#8b5cf6" },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: { position: "absolute", top: 50, right: 20, zIndex: 10 },
  fullImage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: Platform.OS === "ios" ? 100 : 80,
    paddingRight: 16,
  },
  menuContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
});
