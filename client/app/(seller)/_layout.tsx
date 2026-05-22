import { getToken } from "@/utils/secure-store";
import { Stack, useRouter } from "expo-router";
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

  return <Stack screenOptions={{ headerShown: false }} />;
}
