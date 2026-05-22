import { getRole } from "@/utils/secure-store";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

export default function AdminLayout() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAdminRole = async () => {
      const role = await getRole();
      if (role === "admin") {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
        router.replace("/(tabs)"); // ถ้าไม่ใช่ admin ให้กลับไปหน้าหลัก
      }
    };
    checkAdminRole();
  }, []);

  if (isAdmin === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="admin-home"
        options={{
          title: "Admin Dashboard",
          headerBackVisible: false,
        }}
      />
      <Stack.Screen name="manage-stores" options={{ title: "จัดการร้านค้า" }} />
      <Stack.Screen
        name="store-detail"
        options={{ title: "รายละเอียดร้านค้า" }}
      />
      <Stack.Screen
        name="manage-categories"
        options={{ title: "จัดการหมวดหมู่" }}
      />
      <Stack.Screen name="dashboard" options={{ title: "แดชบอร์ด" }} />
      <Stack.Screen name="manage-user" options={{ title: "จัดการผู้ใช้" }} />
      <Stack.Screen name="report" options={{ headerShown: false }} />
      <Stack.Screen name="report-detail" options={{ headerShown: false }} />
    </Stack>
  );
}
