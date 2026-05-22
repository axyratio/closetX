// client/app/(admin)/manage-users.tsx
import {
  formatDateTime,
  formatFullName,
  formatRole,
  formatUserStatus,
  getAllUsers,
  getRoleBgColor,
  getRoleColor,
  getUserStatusBgColor,
  getUserStatusColor,
  UserListItem,
} from "@/api/user-management";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Box } from "native-base";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ManageUsersScreen() {
  const router = useRouter();

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<
    "all" | "user" | "seller" | "admin"
  >("all");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive"
  >("all");

  const [skip, setSkip] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const loadUsers = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
          setSkip(0);
        } else {
          setLoading(true);
        }

        const params: any = {
          skip: isRefresh ? 0 : skip,
          limit: limit,
        };

        if (searchQuery) params.search = searchQuery;
        if (filterRole !== "all" && filterRole !== "seller")
          params.role = filterRole;
        if (filterStatus !== "all")
          params.is_active = filterStatus === "active";

        const response = await getAllUsers(params);

        if (response.success) {
          let filteredUsers = response.data.users;

          // Filter seller (has_store = true)
          if (filterRole === "seller") {
            filteredUsers = filteredUsers.filter((user) => user.has_store);
          }

          if (isRefresh) {
            setUsers(filteredUsers);
          } else {
            setUsers((prev) =>
              skip === 0 ? filteredUsers : [...prev, ...filteredUsers],
            );
          }
          setTotal(response.data.total);
        } else {
          Alert.alert("ข้อผิดพลาด", response.message);
        }
      } catch (error) {
        console.error("Error loading users:", error);
        Alert.alert("ข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลผู้ใช้ได้");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [skip, searchQuery, filterRole, filterStatus],
  );

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (!loading) {
      setSkip(0);
      loadUsers(true);
    }
  }, [filterRole, filterStatus]);

  const handleSearch = () => {
    setSkip(0);
    loadUsers(true);
  };

  const handleLoadMore = () => {
    if (!loading && users.length < total) {
      setSkip(skip + limit);
    }
  };

  const getRoleBadgeColor = (user: UserListItem) => {
    if (user.has_store) {
      return { bg: "#dbeafe", text: "#2563eb" };
    }
    return {
      bg: getRoleBgColor(user.role_name),
      text: getRoleColor(user.role_name),
    };
  };

  const getRoleLabel = (user: UserListItem) => {
    if (user.has_store) return "ร้านค้า";
    return formatRole(user.role_name);
  };

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>บทบาท:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterButtons}>
            {[
              { value: "all", label: "ทั้งหมด", icon: "people" },
              { value: "user", label: "ผู้ใช้", icon: "person" },
              { value: "seller", label: "ร้านค้า", icon: "storefront" },
              { value: "admin", label: "แอดมิน", icon: "shield" },
            ].map((role) => (
              <TouchableOpacity
                key={role.value}
                style={[
                  styles.filterButton,
                  filterRole === role.value && styles.filterButtonActive,
                ]}
                onPress={() => setFilterRole(role.value as any)}
              >
                <Ionicons
                  name={role.icon as any}
                  size={16}
                  color={filterRole === role.value ? "#fff" : "#6b7280"}
                />
                <Text
                  style={[
                    styles.filterButtonText,
                    filterRole === role.value && styles.filterButtonTextActive,
                  ]}
                >
                  {role.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>สถานะ:</Text>
        <View style={styles.filterButtons}>
          {[
            { value: "all", label: "ทั้งหมด" },
            { value: "active", label: "ใช้งาน" },
            { value: "inactive", label: "ระงับ" },
          ].map((status) => (
            <TouchableOpacity
              key={status.value}
              style={[
                styles.filterButton,
                filterStatus === status.value && styles.filterButtonActive,
              ]}
              onPress={() => setFilterStatus(status.value as any)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filterStatus === status.value &&
                    styles.filterButtonTextActive,
                ]}
              >
                {status.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderUserItem = ({ item }: { item: UserListItem }) => {
    const roleColors = getRoleBadgeColor(item);

    return (
      <TouchableOpacity
        style={styles.userCard}
        onPress={() =>
          router.push(`/(admin)/user-detail?userId=${item.user_id}` as any)
        }
        activeOpacity={0.7}
      >
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{formatFullName(item)}</Text>
            <Text style={styles.userUsername}>@{item.username}</Text>
          </View>
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: roleColors.bg }]}>
              <Text style={[styles.badgeText, { color: roleColors.text }]}>
                {getRoleLabel(item)}
              </Text>
            </View>
            <View
              style={[
                styles.badge,
                { backgroundColor: getUserStatusBgColor(item.is_active) },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: getUserStatusColor(item.is_active) },
                ]}
              >
                {formatUserStatus(item.is_active)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.userDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="mail-outline" size={16} color="#6b7280" />
            <Text style={styles.detailText}>{item.email}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={16} color="#6b7280" />
            <Text style={styles.detailText}>{item.phone_number}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color="#6b7280" />
            <Text style={styles.detailText}>
              สมัครเมื่อ: {formatDateTime(item.created_at)}
            </Text>
          </View>
        </View>

        <View style={styles.userStats}>
          <View style={styles.statItem}>
            <Ionicons name="cart-outline" size={18} color="#3b82f6" />
            <Text style={styles.statText}>{item.total_orders} คำสั่งซื้อ</Text>
          </View>
          {item.has_store && (
            <View style={styles.statItem}>
              <Ionicons name="storefront-outline" size={18} color="#10b981" />
              <Text style={[styles.statText, { color: "#10b981" }]}>
                มีร้านค้า
              </Text>
            </View>
          )}
        </View>

        <View style={styles.arrowContainer}>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={64} color="#d1d5db" />
      <Text style={styles.emptyText}>ไม่พบผู้ใช้</Text>
      <Text style={styles.emptySubtext}>
        {searchQuery
          ? "ลองค้นหาด้วยคำอื่น"
          : filterRole !== "all" || filterStatus !== "all"
            ? "ไม่มีผู้ใช้ตามเงื่อนไขที่เลือก"
            : "ยังไม่มีผู้ใช้ในระบบ"}
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!loading || skip === 0) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#3b82f6" />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Box safeAreaTop bg="#fff" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>จัดการผู้ใช้</Text>
          <Text style={styles.headerSubtitle}>
            {loading && skip === 0 ? "กำลังโหลด..." : `ทั้งหมด ${total} คน`}
          </Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="ค้นหา username, email, ชื่อ..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                setSkip(0);
                loadUsers(true);
              }}
            >
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>ค้นหา</Text>
        </TouchableOpacity>
      </View>

      {renderFilters()}

      {loading && skip === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>กำลังโหลด...</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.user_id}
          renderItem={renderUserItem}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadUsers(true)}
              colors={["#3b82f6"]}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            users.length === 0 && styles.emptyListContent,
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: { marginRight: 12 },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#1f2937" },
  headerSubtitle: { fontSize: 14, color: "#6b7280", marginTop: 2 },
  searchContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 8,
    backgroundColor: "#fff",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 16, color: "#1f2937" },
  searchButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  searchButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  filtersContainer: {
    padding: 16,
    paddingTop: 0,
    backgroundColor: "#fff",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  filterSection: { gap: 8 },
  filterLabel: { fontSize: 14, fontWeight: "600", color: "#4b5563" },
  filterButtons: { flexDirection: "row", gap: 8 },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 6,
  },
  filterButtonActive: { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
  filterButtonText: { fontSize: 14, color: "#6b7280", fontWeight: "500" },
  filterButtonTextActive: { color: "#fff" },
  listContent: { padding: 16, gap: 12 },
  emptyListContent: { flexGrow: 1, justifyContent: "center" },
  userCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    gap: 12,
    position: "relative",
  },
  userHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 18, fontWeight: "bold", color: "#1f2937" },
  userUsername: { fontSize: 14, color: "#6b7280", marginTop: 2 },
  badges: { gap: 4, alignItems: "flex-end" },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: "600" },
  userDetails: { gap: 8 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailText: { fontSize: 14, color: "#6b7280", flex: 1 },
  userStats: {
    flexDirection: "row",
    gap: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  statItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  statText: { fontSize: 14, color: "#6b7280" },
  arrowContainer: {
    position: "absolute",
    right: 16,
    top: "50%",
    marginTop: -10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: { marginTop: 12, fontSize: 16, color: "#6b7280" },
  emptyState: { alignItems: "center", padding: 40 },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4b5563",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 8,
    textAlign: "center",
  },
  footer: { padding: 16, alignItems: "center" },
});
