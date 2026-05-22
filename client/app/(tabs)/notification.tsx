// ============================================================
// ไฟล์: client/app/(tabs)/notification.tsx (แทนที่ทั้งไฟล์)
// รวมการแจ้งเตือน 2 Tabs: ผู้ใช้ (buyer) | ร้านค้า (seller)
// ดึงจาก API เดียว GET /notifications/me?role=buyer|seller
// ============================================================

import {
  connectNotificationWS,
  deleteNotification,
  fetchNotifications,
  markAllAsRead,
  markAsRead,
  Notification,
} from "@/api/notification";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { getRole, getToken } from "@/utils/secure-store";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type TabType = "buyer" | "seller";

export default function NotificationScreen() {
  const router = useRouter();

  // ─── Tab state ───
  const [activeTab, setActiveTab] = useState<TabType>("buyer");
  const [isSeller, setIsSeller] = useState(false);

  // ─── Buyer state ───
  // const [buyerNotifs, setBuyerNotifs] = useState<Notification[]>([]);
  // const [buyerLoading, setBuyerLoading] = useState(true);
  // const [buyerRefreshing, setBuyerRefreshing] = useState(false);
  const [buyerUnread, setBuyerUnread] = useState(0);

  // ─── Seller state ───
  // const [sellerNotifs, setSellerNotifs] = useState<Notification[]>([]);
  // const [sellerLoading, setSellerLoading] = useState(true);
  // const [sellerRefreshing, setSellerRefreshing] = useState(false);
  const [sellerUnread, setSellerUnread] = useState(0);
  const wsCleanupRef = useRef<(() => void) | null>(null);
  const { initialTab } = useLocalSearchParams<{ initialTab?: string }>();

  useEffect(() => {
    if (initialTab === "seller") {
      setActiveTab("seller");
    }
  }, [initialTab]);

  // ─── โหลด role ───
  useEffect(() => {
    (async () => {
      const r = await getRole();
      setIsSeller(r === "seller");
    })();
  }, []);

  // ─── WebSocket สำหรับ realtime ───
  useEffect(() => {
    let active = true;
    const startWS = async () => {
      const token = await getToken();
      if (!token || !active) return;
      wsCleanupRef.current = connectNotificationWS(token, (event) => {
        if (!active) return;
        const n = event.notification;
        const role = n.receiver_role || "buyer";
        if (role === "seller") {
          setSellerNotifs((prev) => [n, ...prev]);
          setSellerUnread((prev) => prev + 1);
        } else {
          setBuyerNotifs((prev) => [n, ...prev]);
          setBuyerUnread((prev) => prev + 1);
        }
      });
    };
    startWS();
    return () => {
      active = false;
      wsCleanupRef.current?.();
      wsCleanupRef.current = null;
    };
  }, []);

  // ─── REST: โหลดข้อมูลทุกครั้งที่กลับมา tab ───
  useFocusEffect(
    useCallback(() => {
      loadBuyer();
      if (isSeller) loadSeller();
    }, [isSeller]),
  );
  const fetchBuyerFn = useCallback(
    (skip: number, limit: number) =>
      getToken().then((token) =>
        token
          ? fetchNotifications(token, limit, skip, "buyer").then((d) => {
              setBuyerUnread(d.unread_count);
              return d.notifications;
            })
          : [],
      ),
    [],
  );

  const fetchSellerFn = useCallback(
    (skip: number, limit: number) =>
      getToken().then((token) =>
        token
          ? fetchNotifications(token, limit, skip, "seller").then((d) => {
              setSellerUnread(d.unread_count);
              return d.notifications;
            })
          : [],
      ),
    [],
  );

  const {
    data: buyerNotifs,
    setData: setBuyerNotifs,
    loading: buyerLoading,
    refreshing: buyerRefreshing,
    load: loadBuyer,
    loadMore: loadMoreBuyer,
    refresh: refreshBuyer,
  } = usePaginatedList<Notification>(fetchBuyerFn, 10);
  const {
    data: sellerNotifs,
    setData: setSellerNotifs,
    loading: sellerLoading,
    refreshing: sellerRefreshing,
    load: loadSeller,
    loadMore: loadMoreSeller,
    refresh: refreshSeller,
  } = usePaginatedList<Notification>(fetchSellerFn, 10);


  // ─── อ่านแล้ว ───
  const handleMarkAsRead = async (notificationId: string, role: TabType) => {
    const setNotifs = role === "buyer" ? setBuyerNotifs : setSellerNotifs;
    const setUnread = role === "buyer" ? setBuyerUnread : setSellerUnread;
    setNotifs((prev) =>
      prev.map((n) =>
        n.notification_id === notificationId ? { ...n, is_read: true } : n,
      ),
    );
    setUnread((prev) => Math.max(0, prev - 1));
    try {
      const token = await getToken();
      if (token) await markAsRead(token, notificationId);
    } catch (e) {
      console.error("markAsRead:", e);
    }
  };

  // ─── อ่านทั้งหมด ───
  const handleMarkAllAsRead = async (role: TabType) => {
    const setNotifs = role === "buyer" ? setBuyerNotifs : setSellerNotifs;
    const setUnread = role === "buyer" ? setBuyerUnread : setSellerUnread;
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
    try {
      const token = await getToken();
      if (token) await markAllAsRead(token, role);
    } catch {
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถทำเครื่องหมายได้");
    }
  };

  // ─── ลบ ───
  const handleDelete = (notificationId: string, role: TabType) => {
    Alert.alert("ลบการแจ้งเตือน", "คุณแน่ใจหรือไม่?", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: async () => {
          const setNotifs = role === "buyer" ? setBuyerNotifs : setSellerNotifs;
          setNotifs((prev) =>
            prev.filter((n) => n.notification_id !== notificationId),
          );
          try {
            const token = await getToken();
            if (token) await deleteNotification(token, notificationId);
          } catch {
            Alert.alert("ข้อผิดพลาด", "ไม่สามารถลบได้");
          }
        },
      },
    ]);
  };

  // ─── กด notification → navigate ───
  const handlePress = (item: Notification, role: TabType) => {
    if (!item.is_read) handleMarkAsRead(item.notification_id, role);

    if (role === "seller") {
      // Seller → ไปหน้าร้านค้า
      if (item.order_id) {
        const returnTypes = [
          "RETURN_REQUEST",
          "RETURN_APPROVED",
          "RETURN_REJECTED",
        ];
        if (returnTypes.includes(item.notification_type)) {
          router.navigate({
            pathname: "/(seller)/returns",
            params: { from: "notification_seller" }, // ← เพิ่ม from
          } as any);
        } else {
          router.navigate({
            pathname: "/(seller)/orders",
            params: { from: "notification_seller" },
          } as any);
        }
      }
    } else {
      // Buyer → ไปหน้า order-detail / chat
      if (item.order_id) {
        router.push({
          pathname: "/(profile)/order-detail",
          params: { orderId: item.order_id, from: "notification" },
        });
      } else if (item.conversation_id) {
        router.push({
          pathname: "/(chat)/chat",
          params: { conversationId: item.conversation_id },
        });
      }
    }
  };

  // ─── Icons & Colors ───
  const getIcon = (
    type: string,
    role: TabType,
  ): keyof typeof Ionicons.glyphMap => {
    const map: Record<string, keyof typeof Ionicons.glyphMap> = {
      ORDER_PAID: role === "seller" ? "cart" : "card",
      ORDER_PREPARING: "cube",
      ORDER_SHIPPED: "car",
      ORDER_DELIVERED: "checkmark-circle",
      ORDER_COMPLETED: "checkmark-done-circle",
      ORDER_CANCELLED: "close-circle",
      RETURN_REQUEST: "return-down-back",
      RETURN_APPROVED: "checkmark-done-circle",
      RETURN_REJECTED: "close-circle",
      NEW_MESSAGE: "chatbubble",
      PAYMENT_SUCCESS: "checkmark-circle",
      PAYMENT_FAILED: "close-circle",
    };
    return map[type] || "notifications";
  };

  const getColor = (type: string): string => {
    const map: Record<string, string> = {
      ORDER_PAID: "#8b5cf6",
      ORDER_PREPARING: "#f59e0b",
      ORDER_SHIPPED: "#3b82f6",
      ORDER_DELIVERED: "#10b981",
      ORDER_COMPLETED: "#10b981",
      ORDER_CANCELLED: "#ef4444",
      RETURN_REQUEST: "#f59e0b",
      RETURN_APPROVED: "#10b981",
      RETURN_REJECTED: "#ef4444",
      NEW_MESSAGE: "#3b82f6",
      PAYMENT_SUCCESS: "#10b981",
      PAYMENT_FAILED: "#ef4444",
    };
    return map[type] || "#6b7280";
  };

  const formatTime = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (m < 1) return "เมื่อสักครู่";
    if (m < 60) return `${m} นาทีที่แล้ว`;
    if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
    if (d < 7) return `${d} วันที่แล้ว`;
    return new Date(dateString).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
    });
  };

  // ─── Render notification item (ใช้ร่วมกัน) ───
  const renderItem =
    (role: TabType) =>
    ({ item }: { item: Notification }) => {
      const color = getColor(item.notification_type);
      const accentColor = role === "seller" ? "#7c3aed" : "#8b5cf6";
      return (
        <TouchableOpacity
          style={[
            styles.card,
            !item.is_read && {
              backgroundColor: "#f5f3ff",
              borderLeftWidth: 3,
              borderLeftColor: accentColor,
            },
          ]}
          onPress={() => handlePress(item, role)}
        >
          <View style={[styles.iconCircle, { backgroundColor: color }]}>
            <Ionicons
              name={getIcon(item.notification_type, role)}
              size={22}
              color="#fff"
            />
          </View>
          <View style={styles.content}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>
                {item.title}
              </Text>
              {!item.is_read && (
                <View style={[styles.dot, { backgroundColor: accentColor }]} />
              )}
            </View>
            <Text style={styles.message} numberOfLines={2}>
              {item.message}
            </Text>
            <Text style={styles.time}>{formatTime(item.created_at)}</Text>
          </View>
          {item.image_url && (
            <Image source={{ uri: item.image_url }} style={styles.thumbnail} />
          )}
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item.notification_id, role)}
          >
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    };

  // ─── Tab Bar ───
  const renderTabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, activeTab === "buyer" && styles.tabActiveBuyer]}
        onPress={() => setActiveTab("buyer")}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === "buyer" && styles.tabTextActiveBuyer,
          ]}
        >
          ผู้ใช้
        </Text>
        {buyerUnread > 0 && (
          <View style={[styles.badge, { backgroundColor: "#8b5cf6" }]}>
            <Text style={styles.badgeText}>
              {buyerUnread > 99 ? "99+" : buyerUnread}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      {isSeller && (
        <TouchableOpacity
          style={[styles.tab, activeTab === "seller" && styles.tabActiveSeller]}
          onPress={() => setActiveTab("seller")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "seller" && styles.tabTextActiveSeller,
            ]}
          >
            ร้านค้า
          </Text>
          {sellerUnread > 0 && (
            <View style={[styles.badge, { backgroundColor: "#7c3aed" }]}>
              <Text style={styles.badgeText}>
                {sellerUnread > 99 ? "99+" : sellerUnread}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  // ─── Current tab data ───
  const notifs = activeTab === "buyer" ? buyerNotifs : sellerNotifs;
  const loading = activeTab === "buyer" ? buyerLoading : sellerLoading;
  const refreshing = activeTab === "buyer" ? buyerRefreshing : sellerRefreshing;
  const unread = activeTab === "buyer" ? buyerUnread : sellerUnread;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>การแจ้งเตือน</Text>
        </View>
        {renderTabBar()}
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>การแจ้งเตือน</Text>
        {unread > 0 && (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={() => handleMarkAllAsRead(activeTab)}
          >
            <Text style={styles.markAllText}>อ่านทั้งหมด</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Bar */}
      {renderTabBar()}

      {/* List */}
      {notifs.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="notifications-off-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>
            {activeTab === "seller"
              ? "ไม่มีการแจ้งเตือนร้านค้า"
              : "ไม่มีการแจ้งเตือน"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifs}
          onEndReached={activeTab === "buyer" ? loadMoreBuyer : loadMoreSeller}
          onEndReachedThreshold={0.3}
          keyExtractor={(item) => item.notification_id}
          renderItem={renderItem(activeTab)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() =>
                activeTab === "buyer" ? refreshBuyer() : refreshSeller()
              }
              colors={[activeTab === "seller" ? "#7c3aed" : "#8b5cf6"]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#8b5cf6",
    borderRadius: 8,
  },
  markAllText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  // Tab Bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingHorizontal: 16,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActiveBuyer: { borderBottomColor: "#8b5cf6" },
  tabActiveSeller: { borderBottomColor: "#7c3aed" },
  tabText: { fontSize: 15, fontWeight: "600", color: "#9ca3af" },
  tabTextActiveBuyer: { color: "#8b5cf6" },
  tabTextActiveSeller: { color: "#7c3aed" },
  badge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
    paddingHorizontal: 6,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  // List
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 12 },
  emptyText: { marginTop: 16, fontSize: 16, color: "#9ca3af" },

  // Card
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  content: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  title: { fontSize: 15, fontWeight: "600", color: "#111827", flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  message: { fontSize: 13, color: "#6b7280", marginBottom: 3 },
  time: { fontSize: 12, color: "#9ca3af" },
  thumbnail: { width: 48, height: 48, borderRadius: 8, marginLeft: 8 },
  deleteBtn: { padding: 8, justifyContent: "center", alignItems: "center" },
});
