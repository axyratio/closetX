// client/app/(admin)/user-detail.tsx
import {
  changeUserRole,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatFullName,
  formatRole,
  formatUserStatus,
  getRoleBgColor,
  getRoleColor,
  getUserDetail,
  getUserOrders,
  getUserReviews,
  getUserStatusBgColor,
  getUserStatusColor,
  toggleUserStatus,
  UserDetail,
  UserOrder,
  UserReview,
} from "@/api/user-management";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Box } from "native-base";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function UserDetailScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();

  // States
  const [user, setUser] = useState<UserDetail | null>(null);
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"info" | "orders" | "reviews">(
    "info",
  );

  // Load data
  useEffect(() => {
    if (userId) {
      loadUserData();
      loadOrders();
      loadReviews();
    }
  }, [userId]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const response = await getUserDetail(userId);

      if (response.success) {
        setUser(response.data);
      } else {
        Alert.alert("ข้อผิดพลาด", response.message);
        router.back();
      }
    } catch (error) {
      console.error("Error loading user:", error);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลผู้ใช้ได้");
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const response = await getUserOrders(userId, 0, 10);
      if (response.success) {
        setOrders(response.data.orders);
      }
    } catch (error) {
      console.error("Error loading orders:", error);
    }
  };

  const loadReviews = async () => {
    try {
      const response = await getUserReviews(userId, 0, 10);
      if (response.success) {
        setReviews(response.data.reviews);
      }
    } catch (error) {
      console.error("Error loading reviews:", error);
    }
  };

  // Toggle user status
  const handleToggleStatus = async () => {
    if (!user) return;

    const newStatus = !user.is_active;
    const actionText = newStatus ? "เปิดใช้งาน" : "ระงับ";

    Alert.alert(
      `ยืนยัน${actionText}บัญชี`,
      `คุณต้องการ${actionText}บัญชีของ ${formatFullName(user)} ใช่หรือไม่?`,
      [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ยืนยัน",
          style: newStatus ? "default" : "destructive",
          onPress: async () => {
            try {
              const response = await toggleUserStatus(userId, newStatus);
              if (response.success) {
                Alert.alert("สำเร็จ", response.message);
                loadUserData();
              } else {
                Alert.alert("ข้อผิดพลาด", response.message);
              }
            } catch (error) {
              Alert.alert("ข้อผิดพลาด", "ไม่สามารถอัปเดตสถานะได้");
            }
          },
        },
      ],
    );
  };

  // Change user role
  const handleChangeRole = async () => {
    if (!user) return;

    const newRole = user.role.role_name === "admin" ? "user" : "admin";
    const roleText = newRole === "admin" ? "ผู้ดูแลระบบ" : "ผู้ใช้";

    Alert.alert(
      "ยืนยันเปลี่ยน Role",
      `คุณต้องการเปลี่ยน role ของ ${formatFullName(user)} เป็น ${roleText} ใช่หรือไม่?`,
      [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ยืนยัน",
          onPress: async () => {
            try {
              const response = await changeUserRole(userId, newRole);
              if (response.success) {
                Alert.alert("สำเร็จ", response.message);
                loadUserData();
              } else {
                Alert.alert("ข้อผิดพลาด", response.message);
              }
            } catch (error) {
              Alert.alert("ข้อผิดพลาด", "ไม่สามารถเปลี่ยน role ได้");
            }
          },
        },
      ],
    );
  };

  // Render info tab
  const renderInfoTab = () => {
    if (!user) return null;

    return (
      <View style={styles.tabContent}>
        {/* Personal Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ข้อมูลส่วนตัว</Text>
          <View style={styles.infoGrid}>
            <InfoRow
              icon="person-outline"
              label="ชื่อ-นามสกุล"
              value={formatFullName(user)}
            />
            <InfoRow icon="at-outline" label="Username" value={user.username} />
            <InfoRow icon="mail-outline" label="Email" value={user.email} />
            <InfoRow
              icon="call-outline"
              label="เบอร์โทร"
              value={user.phone_number}
            />
            {user.gender && (
              <InfoRow
                icon="male-female-outline"
                label="เพศ"
                value={
                  user.gender === "male"
                    ? "ชาย"
                    : user.gender === "female"
                      ? "หญิง"
                      : "อื่นๆ"
                }
              />
            )}
            {user.birth_date && (
              <InfoRow
                icon="calendar-outline"
                label="วันเกิด"
                value={formatDate(user.birth_date)}
              />
            )}
          </View>
        </View>

        {/* Account Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ข้อมูลบัญชี</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Ionicons name="shield-outline" size={20} color="#6b7280" />
              <Text style={styles.infoLabel}>Role:</Text>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: getRoleBgColor(user.role.role_name) },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: getRoleColor(user.role.role_name) },
                  ]}
                >
                  {formatRole(user.role.role_name)}
                </Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color="#6b7280"
              />
              <Text style={styles.infoLabel}>สถานะ:</Text>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: getUserStatusBgColor(user.is_active) },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: getUserStatusColor(user.is_active) },
                  ]}
                >
                  {formatUserStatus(user.is_active)}
                </Text>
              </View>
            </View>
            <InfoRow
              icon="time-outline"
              label="สมัครเมื่อ"
              value={formatDateTime(user.created_at)}
            />
            {user.updated_at && (
              <InfoRow
                icon="create-outline"
                label="แก้ไขล่าสุด"
                value={formatDateTime(user.updated_at)}
              />
            )}
          </View>
        </View>

        {/* Statistics Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>สถิติ</Text>
          <View style={styles.statsGrid}>
            <StatBox
              icon="cart-outline"
              label="คำสั่งซื้อ"
              value={user.statistics.total_orders}
              color="#3b82f6"
            />
            <StatBox
              icon="star-outline"
              label="รีวิว"
              value={user.statistics.total_reviews}
              color="#f59e0b"
            />
            <StatBox
              icon="cash-outline"
              label="ยอดใช้จ่าย"
              value={formatCurrency(user.statistics.total_spent)}
              color="#10b981"
            />
            <StatBox
              icon="storefront-outline"
              label="ร้านค้า"
              value={user.statistics.has_store ? "มี" : "ไม่มี"}
              color={user.statistics.has_store ? "#10b981" : "#6b7280"}
            />
          </View>
        </View>

        {/* Store Info (if exists) */}
        {user.store && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>ข้อมูลร้านค้า</Text>
            <View style={styles.storeInfo}>
              {user.store.logo_path && (
                <Image
                  source={{ uri: user.store.logo_path }}
                  style={styles.storeLogo}
                />
              )}
              <View style={styles.storeDetails}>
                <Text style={styles.storeName}>{user.store.name}</Text>
                {user.store.description && (
                  <Text style={styles.storeDescription}>
                    {user.store.description}
                  </Text>
                )}
                <View style={styles.storeStats}>
                  <View style={styles.storeStat}>
                    <Ionicons name="star" size={16} color="#f59e0b" />
                    <Text style={styles.storeStatText}>
                      {user.store.rating.toFixed(1)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: getUserStatusBgColor(
                          user.store.is_active,
                        ),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        { color: getUserStatusColor(user.store.is_active) },
                      ]}
                    >
                      {user.store.is_active ? "เปิดอยู่" : "ปิด"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.viewStoreButton}
              onPress={() =>
                router.push(
                  `/(admin)/store-detail?storeId=${user.store!.store_id}`,
                )
              }
            >
              <Text style={styles.viewStoreButtonText}>
                ดูรายละเอียดร้านค้า
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#3b82f6" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // Render orders tab
  const renderOrdersTab = () => (
    <View style={styles.tabContent}>
      {orders.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cart-outline" size={48} color="#d1d5db" />
          <Text style={styles.emptyText}>ยังไม่มีคำสั่งซื้อ</Text>
        </View>
      ) : (
        orders.map((order) => (
          <View key={order.order_id} style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderStatus}>{order.order_text_status}</Text>
              <Text style={styles.orderPrice}>
                {formatCurrency(order.total_price)}
              </Text>
            </View>
            {order.store_name && (
              <Text style={styles.orderStore}>ร้าน: {order.store_name}</Text>
            )}
            <Text style={styles.orderDate}>
              {formatDateTime(order.created_at)}
            </Text>
            <Text style={styles.orderItems}>{order.item_count} รายการ</Text>
          </View>
        ))
      )}
    </View>
  );

  // Render reviews tab
  const renderReviewsTab = () => (
    <View style={styles.tabContent}>
      {reviews.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="star-outline" size={48} color="#d1d5db" />
          <Text style={styles.emptyText}>ยังไม่มีรีวิว</Text>
        </View>
      ) : (
        reviews.map((review) => (
          <View key={review.review_id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewProduct}>{review.product_name}</Text>
              <View style={styles.reviewRating}>
                {[...Array(5)].map((_, i) => (
                  <Ionicons
                    key={i}
                    name={i < review.rating ? "star" : "star-outline"}
                    size={16}
                    color="#f59e0b"
                  />
                ))}
              </View>
            </View>
            {review.comment && (
              <Text style={styles.reviewComment}>{review.comment}</Text>
            )}
            {review.images.length > 0 && (
              <ScrollView horizontal style={styles.reviewImages}>
                {review.images.map((url, idx) => (
                  <Image
                    key={idx}
                    source={{ uri: url }}
                    style={styles.reviewImage}
                  />
                ))}
              </ScrollView>
            )}
            <Text style={styles.reviewDate}>
              {formatDateTime(review.created_at)}
            </Text>
          </View>
        ))
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>กำลังโหลด...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text style={styles.errorText}>ไม่พบข้อมูลผู้ใช้</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Box safeAreaTop bg="#fff"></Box>

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{formatFullName(user)}</Text>
          <Text style={styles.headerSubtitle}>@{user.username}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            !user.is_active && styles.actionButtonSuccess,
          ]}
          onPress={handleToggleStatus}
        >
          <Ionicons
            name={user.is_active ? "ban-outline" : "checkmark-circle-outline"}
            size={20}
            color="#fff"
          />
          <Text style={styles.actionButtonText}>
            {user.is_active ? "ระงับบัญชี" : "เปิดใช้งาน"}
          </Text>
        </TouchableOpacity>
        {/* <TouchableOpacity
          style={styles.actionButton}
          onPress={handleChangeRole}
        >
          <Ionicons name="shield-outline" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>
            {user.role.role_name === "admin" ? "ลด Role" : "เลื่อน Admin"}
          </Text>
        </TouchableOpacity> */}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {["info", "orders", "reviews"].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab as any)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab === "info"
                ? "ข้อมูล"
                : tab === "orders"
                  ? `คำสั่งซื้อ (${orders.length})`
                  : `รีวิว (${reviews.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.scrollView}>
        {activeTab === "info" && renderInfoTab()}
        {activeTab === "orders" && renderOrdersTab()}
        {activeTab === "reviews" && renderReviewsTab()}
      </ScrollView>
    </View>
  );
}

// Helper Components
const InfoRow = ({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon as any} size={20} color="#6b7280" />
    <Text style={styles.infoLabel}>{label}:</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const StatBox = ({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: any;
  color: string;
}) => (
  <View style={styles.statBox}>
    <Ionicons name={icon as any} size={32} color={color} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    backgroundColor: "#fff",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ef4444",
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  actionButtonSuccess: {
    backgroundColor: "#10b981",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#3b82f6",
  },
  tabText: {
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#3b82f6",
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
  },
  infoGrid: {
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: "#1f2937",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statBox: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    gap: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  storeInfo: {
    flexDirection: "row",
    gap: 12,
  },
  storeLogo: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
  },
  storeDetails: {
    flex: 1,
    gap: 4,
  },
  storeName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
  },
  storeDescription: {
    fontSize: 14,
    color: "#6b7280",
  },
  storeStats: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  storeStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  storeStatText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  viewStoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    gap: 8,
  },
  viewStoreButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3b82f6",
  },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    gap: 8,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderStatus: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
  },
  orderPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#10b981",
  },
  orderStore: {
    fontSize: 14,
    color: "#6b7280",
  },
  orderDate: {
    fontSize: 14,
    color: "#9ca3af",
  },
  orderItems: {
    fontSize: 14,
    color: "#6b7280",
  },
  reviewCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    gap: 12,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reviewProduct: {
    flex: 1,
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
  },
  reviewRating: {
    flexDirection: "row",
    gap: 2,
  },
  reviewComment: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
  },
  reviewImages: {
    flexDirection: "row",
    gap: 8,
  },
  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    marginRight: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: "#9ca3af",
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#9ca3af",
    marginTop: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6b7280",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ef4444",
    marginTop: 16,
  },
});
