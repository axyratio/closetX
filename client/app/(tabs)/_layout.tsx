
import { connectNotificationWS, fetchUnreadCount } from "@/api/notification";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getToken } from "@/utils/secure-store";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

// ── Badge Component ──
function TabBarBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? "light"];
  const [unreadCount, setUnreadCount] = useState(0);
  const wsCleanupRef = useRef<(() => void) | null>(null);

  // mount เดียว → โหลด initial count + เปิด ws
  // unmount → close ws
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const token = await getToken();
      if (!token || cancelled) return;

      // 1. initial badge count จาก REST
      const count = await fetchUnreadCount(token);
      if (!cancelled) setUnreadCount(count);

      // 2. เปิด ws เพื่อ realtime badge update
      wsCleanupRef.current = connectNotificationWS(token, (event) => {
        if (!cancelled) setUnreadCount(event.unread_count);
      });
    };

    init();

    return () => {
      cancelled = true;
      if (wsCleanupRef.current) {
        wsCleanupRef.current();
        wsCleanupRef.current = null;
      }
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarInactiveTintColor: themeColors.icon,
        tabBarActiveTintColor: themeColors.tint,
        tabBarLabelStyle: { fontSize: 9 },
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarLabel: "หน้าแรก",
          href: "/(tabs)",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          title: "แชท",
          tabBarLabel: "แชท",
          href: "/(tabs)/chat", // ใช้ href เพื่อให้แน่ใจว่า navigation เป็นแบบ full reload (ไม่ใช่ client-side) ซึ่งจะทำให้ badge อัปเดตถูกต้องเมื่อกลับมาที่ tab นี้
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? "chatbubbles" : "chatbubbles-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="vton"
        options={{
          title: "ลองชุด",
          tabBarLabel: "ลองชุด",
          href: "/(tabs)/vton",
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? "shirt" : "shirt-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="notification"
        options={{
          title: "การแจ้งเตือน",
          tabBarLabel: "แจ้งเตือน",
          tabBarIcon: ({ focused, color, size }) => (
            <View>
              <Ionicons
                name={focused ? "notifications" : "notifications-outline"}
                size={size}
                color={color}
              />
              <TabBarBadge count={unreadCount} />
            </View>
          ),
        }}
        listeners={{
          tabPress: () => setUnreadCount(0), // optimistic clear เมื่อกด tab
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "โปรไฟล์",
          tabBarLabel: "โปรไฟล์",
          href: "/(tabs)/profile", // ใช้ href เพื่อให้แน่ใจว่า navigation เป็นแบบ full reload (ไม่ใช่ client-side) ซึ่งจะทำให้ badge อัปเดตถูกต้องเมื่อกลับมาที่ tab นี้
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    right: -10,
    top: -5,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
});
