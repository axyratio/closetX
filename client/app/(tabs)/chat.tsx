// app/(tabs)/chat.tsx - User Conversation List with Realtime Unread
import { chatAPI, ChatConversation } from "@/api/chat";
import ChatCard from "@/components/chat/chat-card";
import { getCurrentUserId } from "@/utils/fetch-interceptor";
import { getToken } from "@/utils/secure-store";
import { WS_DOMAIN } from "@/้host";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ConversationHistoryScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // ✅ โหลด current user ID
  useEffect(() => {
    const userId = getCurrentUserId();
    setCurrentUserId(userId);
  }, []);

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      setError(null);
      const data = await chatAPI.getUserConversations();
      console.log("[ConversationHistory] Loaded conversations:", data.length);
      setConversations(data);
    } catch (err: any) {
      console.error("[ConversationHistory] Error:", err);
      setError(err?.response?.data?.detail || "ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ✅ Setup WebSocket สำหรับ realtime updates
  useEffect(() => {
    if (!currentUserId) return;

    const setupWebSocket = async () => {
      try {
        const token = await getToken();
        if (!token) {
          console.log("[WS] No token found");
          return;
        }

        const wsUrl = `${WS_DOMAIN}/ws/chat?token=${token}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log("[ConversationList] WebSocket connected");
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("[ConversationList] WS message:", data);

            // ✅ อัพเดท unread count เมื่อมีข้อความใหม่
            if (data.type === "unread_update") {
              setConversations((prev) =>
                prev.map((conv) => {
                  if (conv.conversation_id === data.conversation_id) {
                    return {
                      ...conv,
                      unread_count: data.unread_count,
                      last_message: data.last_message || conv.last_message,
                      last_message_at:
                        data.last_message_at || conv.last_message_at,
                    };
                  }
                  return conv;
                }),
              );
            }

            // ✅ เมื่อข้อความถูกอ่านแล้ว (จากหน้าแชท)
            if (data.type === "messages_read") {
              setConversations((prev) =>
                prev.map((conv) => {
                  if (conv.conversation_id === data.conversation_id) {
                    return {
                      ...conv,
                      unread_count: 0,
                    };
                  }
                  return conv;
                }),
              );
            }
          } catch (e) {
            console.log("[ConversationList] WS parse error:", e);
          }
        };

        ws.onerror = (e) => {
          console.log("[ConversationList] WS error:", e);
        };

        ws.onclose = () => {
          console.log("[ConversationList] WS closed");
        };

        wsRef.current = ws;
      } catch (e) {
        console.log("[ConversationList] WS setup error:", e);
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
      fetchConversations();
    }, []),
  );

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchConversations();
  }, []);

  // Handle conversation press
  const handleConversationPress = (conversation: ChatConversation) => {
    console.log(
      "[ConversationHistory] Opening conversation:",
      conversation.conversation_id,
    );
    router.push({
      pathname: "/(chat)/chat",
      params: {
        conversationId: conversation.conversation_id,
        storeName: conversation.store_name || "ร้านค้า",
        storeId: conversation.store_id,
      },
    });
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={80} color="#ccc" />
      <Text style={styles.emptyText}>ยังไม่มีการสนทนา</Text>
      <Text style={styles.emptySubText}>เริ่มต้นสนทนากับร้านค้าได้เลย</Text>
    </View>
  );

  // Render error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>พูดคุย</Text>
          <TouchableOpacity onPress={fetchConversations}>
            <Ionicons name="refresh" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchConversations}
          >
            <Text style={styles.retryButtonText}>ลองอีกครั้ง</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>พูดคุย</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Conversations List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.conversation_id}
          renderItem={({ item }) => (
            <ChatCard
              conversation={item}
              viewerType="USER"
              onPress={() => handleConversationPress(item)}
            />
          )}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#8b5cf6"]}
              tintColor="#8b5cf6"
            />
          }
          contentContainerStyle={
            conversations.length === 0 && styles.emptyListContainer
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
    marginBottom: 24,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#8b5cf6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
