// components/chat/chat-card.tsx
import { ChatConversation } from "@/api/chat";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type ViewerType = "USER" | "SELLER";

interface ChatCardProps {
  conversation: ChatConversation;
  onPress: () => void;
  viewerType: ViewerType; // ✅ ใครเป็นคนดู list นี้
}

export default function ChatCard({ conversation, onPress, viewerType }: ChatCardProps) {
  const formatTimestamp = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
    return date.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
  };

  // ✅ เลือก "คู่สนทนา"
  const partnerName =
    viewerType === "USER"
      ? (conversation.store_name || "ร้านค้า")
      : (
          [conversation.user_first_name, conversation.user_last_name].filter(Boolean).join(" ")
          || conversation.user_username
          || "ลูกค้า"
        );

  // ✅ รูปคู่สนทนา - ใช้ full URL ที่ได้จาก backend แล้ว
  const partnerAvatarUrl =
    viewerType === "USER"
      ? conversation.store_logo_path  // ✅ ได้ full URL มาจาก backend แล้ว
      : null; // ถ้ามี user_avatar_path ค่อยใส่

  const partnerInitial = partnerName?.charAt(0)?.toUpperCase() || "?";

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.avatarContainer}>
        {partnerAvatarUrl ? (
          <Image source={{ uri: partnerAvatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>{partnerInitial}</Text>
          </View>
        )}
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.storeName} numberOfLines={1}>
            {partnerName}
          </Text>
          <Text style={styles.timestamp}>{formatTimestamp(conversation.last_message_at)}</Text>
        </View>

        <View style={styles.messageRow}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {conversation.last_message || "ไม่มีข้อความ"}
          </Text>
          {conversation.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {conversation.unread_count > 99 ? "99+" : conversation.unread_count}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { 
    flexDirection: "row", 
    padding: 16, 
    backgroundColor: "#fff", 
    borderBottomWidth: 1, 
    borderBottomColor: "#f0f0f0" 
  },
  avatarContainer: { marginRight: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarPlaceholder: { 
    backgroundColor: "#e0e0e0", 
    justifyContent: "center", 
    alignItems: "center" 
  },
  avatarText: { fontSize: 20, fontWeight: "bold", color: "#666" },
  contentContainer: { flex: 1, justifyContent: "center" },
  headerRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 4 
  },
  storeName: { 
    fontSize: 16, 
    fontWeight: "600", 
    color: "#333", 
    flex: 1, 
    marginRight: 8 
  },
  timestamp: { fontSize: 12, color: "#999" },
  messageRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between" 
  },
  lastMessage: { 
    fontSize: 14, 
    color: "#666", 
    flex: 1, 
    marginRight: 8 
  },
  unreadBadge: { 
    backgroundColor: "#8b5cf6", 
    borderRadius: 10, 
    minWidth: 20, 
    height: 20, 
    justifyContent: "center", 
    alignItems: "center", 
    paddingHorizontal: 6 
  },
  unreadText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
});