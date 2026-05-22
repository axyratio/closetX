import { getToken } from "@/utils/secure-store";
import { Slot, Stack, useRouter } from "expo-router";
import { useEffect } from "react";

export default function ProfileLayout() {
  const router = useRouter();

  useEffect(() => {
    const verify = async () => {
      const token = await getToken();
      if (!token) router.replace("/(auth)/login");
    };
    verify();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Slot /> {/* ✅ ใช้ Slot ให้ route ย่อย render ได้ */}
    </Stack>
  );
}
