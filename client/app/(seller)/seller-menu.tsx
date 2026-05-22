// app/(seller)/seller-menu.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { sellerAPI } from "@/api/seller";
import { getGlobalStoreId, setGlobalStoreId } from "@/utils/fetch-interceptor";
import { getStoreId, saveRole, saveStoreId } from "@/utils/secure-store";

interface BadgeCounts {
  unread_notifications: number;
  preparing_orders: number;
  pending_returns: number;
  unread_chats: number;
}

export default function SellerMenuScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState<BadgeCounts>({
    unread_notifications: 0,
    preparing_orders: 0,
    pending_returns: 0,
    unread_chats: 0,
  });

  const loadAndSetStoreId = async (): Promise<string | null> => {
    try {
      // 1. เช็คจาก Global Variable ก่อน (in-memory)
      const cachedStoreId = getGlobalStoreId();
      if (cachedStoreId) {
        console.log("[Store] Using cached store ID:", cachedStoreId);
        return cachedStoreId;
      }

      // 2. ถ้าไม่มีใน memory ให้โหลดจาก SecureStore
      const storedId = await getStoreId();

      if (storedId) {
        console.log("[Store] Loaded store ID from SecureStore:", storedId);
        // เก็บลง Global Variable
        setGlobalStoreId(storedId);
        return storedId;
      }

      // 3. ถ้าไม่มีใน SecureStore ให้ดึงจาก API
      console.log("[Store] No stored ID, fetching from API...");
      const storeData = await sellerAPI.getMyStore(); // สมมติว่ามี API นี้

      if (storeData?.store_id) {
        console.log("[Store] Fetched store ID from API:", storeData.store_id);

        // บันทึกลง SecureStore
        await saveStoreId(storeData.store_id);

        // เก็บลง Global Variable
        setGlobalStoreId(storeData.store_id);

        return storeData.store_id;
      }

      console.warn("[Store] No store ID found");
      return null;
    } catch (error) {
      console.error("[Store] Error loading store ID:", error);
      return null;
    }
  };
  
  useEffect(() => {
  const backAction = () => {
    router.navigate("/(tabs)/profile" as any);
    return true;
  };

  const backHandler = BackHandler.addEventListener(
    "hardwareBackPress",
    backAction,
  );

  return () => backHandler.remove();
}, []);

  // โหลดข้อมูลเมื่อเปิดหน้า
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // โหลดและตั้งค่า Store ID ก่อน
        const storeId = await loadAndSetStoreId();

        if (!storeId) {
          Alert.alert("ไม่พบข้อมูลร้านค้า", "กรุณาสร้างร้านค้าก่อนใช้งาน", [
            {
              text: "สร้างร้านค้า",
              onPress: () => router.push("/store/create-store"),
            },
            { text: "ยกเลิก", style: "cancel" },
          ]);
          setLoading(false);
          return;
        }

        // โหลด Badge Counts หลังจาก Store ID พร้อมแล้ว
        const data = await sellerAPI.getBadgeCounts();

        // ✅ Issue #1: เช็คว่าร้านถูกปิดโดย Admin หรือไม่
        if (data.is_active === false) {
          Alert.alert(
            "ร้านค้าถูกปิด",
            "ร้านค้าของคุณถูกปิดโดยแอดมิน กรุณาติดต่อฝ่ายสนับสนุนเพื่อเปิดใช้งานอีกครั้ง",
            [
              {
                text: "ตกลง",
                onPress: () => router.navigate("/profile"),
              },
            ],
          );
          setLoading(false);
          return; // ❗ หยุดโหลดข้อมูลต่อ ไม่ให้เข้าใช้งานได้
        }

        setBadges(data);
      } catch (error: any) {
        
        if (error?.response?.status === 403) {
            saveRole("user")
            router.replace("/store/create-store" as any);
            return;
          }
          console.error("[SellerMenu] Load error:", error);
          router.replace("/store/create-store" as any);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // ฟังก์ชันเปิดหน้า Chat
  const handleOpenChats = () => {
    // ✅ ไม่ต้องส่ง params เพราะหน้า Chat จะดึงจาก Global Variable เอง
    router.push("/(seller)/chat" as any);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>กำลังโหลด...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.navigate("/(tabs)/profile" as any)}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>เมนูผู้ขาย</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {/* Dashboard */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push("/(seller)/dashboard")}
        >
          <View style={styles.menuIcon}>
            <Ionicons name="stats-chart" size={24} color="#8b5cf6" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>แดชบอร์ด</Text>
            <Text style={styles.menuDescription}>สรุปยอดขายและสถิติ</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push("/store/mystore")}
        >
          <View style={styles.menuIcon}>
            <Ionicons name="storefront" size={24} color="#8b5cf6" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>ร้านค้า</Text>
            <Text style={styles.menuDescription}>จัดการร้านค้าของฉัน</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        {/* Orders */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push("/(seller)/orders")}
        >
          <View style={styles.menuIcon}>
            <Ionicons name="cart" size={24} color="#8b5cf6" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>จัดการคำสั่งซื้อ</Text>
            <Text style={styles.menuDescription}>คำสั่งซื้อทั้งหมด</Text>
          </View>
          {badges.preparing_orders > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badges.preparing_orders}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        {/* Returns */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push("/(seller)/returns")}
        >
          <View style={styles.menuIcon}>
            <Ionicons name="return-up-back" size={24} color="#8b5cf6" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>คำขอคืนสินค้า</Text>
            <Text style={styles.menuDescription}>จัดการการคืนสินค้า</Text>
          </View>
          {badges.pending_returns > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badges.pending_returns}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        {/* Chats */}
        <TouchableOpacity style={styles.menuItem} onPress={handleOpenChats}>
          <View style={styles.menuIcon}>
            <Ionicons name="chatbubbles" size={24} color="#8b5cf6" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>แชทลูกค้า</Text>
            <Text style={styles.menuDescription}>ข้อความจากลูกค้า</Text>
          </View>
          {badges.unread_chats > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badges.unread_chats}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  menuContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f3f0ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 14,
    color: "#666",
  },
  badge: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    minWidth: 24,
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
