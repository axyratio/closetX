// app/(tabs)/profile.tsx
import { Avartar } from "@/components/avartar";
import { CustomPressable } from "@/components/profile/pressable";
import { Colors } from "@/constants/theme";
import { logout } from "@/utils/fetch-interceptor";
import { getToken, saveRole } from "@/utils/secure-store";
import { DOMAIN } from "@/้host";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import axios from "axios";
import { router } from "expo-router";
import {
  Box,
  Center,
  Divider,
  Flex,
  HStack,
  Spinner,
  StatusBar,
  Text,
  VStack,
} from "native-base";
import React, { useEffect, useState } from "react";
import { useColorScheme } from "react-native";

type UserProfile = {
  username: string;
  email?: string;
  image_url?: string;
  profile_picture?: string;
};

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? "light"];

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile>({ username: "user123" });

  useEffect(() => {
    let mounted = true;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const token = await getToken();

        const res = await axios.get(`${DOMAIN}/profile/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (mounted) {
          setUser({
            username: res.data.username,
            email: res.data.email,
            image_url: res.data.profile_picture || res.data.image_url,
            profile_picture: res.data.profile_picture,
          });

          if (res.data.user_role) {
            await saveRole(res.data.user_role);
          }
        }
      } catch (err) {
        console.log("❌ Profile fetch error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchProfile();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      setLoading(true);
      await logout();
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = () => {
    const imageUrl = user.profile_picture || user.image_url;
    if (!imageUrl) return undefined;
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://"))
      return imageUrl;
    if (imageUrl.startsWith("/")) return `${DOMAIN}${imageUrl}`;
    return `${DOMAIN}/${imageUrl}`;
  };

  const profileImageUrl = getImageUrl();

  return (
    <Flex flex={1} bg="purple.50">
      <StatusBar backgroundColor="#7c3aed" />
      <Box safeAreaTop bg="#7c3aed" />

      {/* Header */}
      <Box bg="#7c3aed" borderBottomRadius={20} w="100%" pb={6} pt={2} px={4}>
        <HStack alignItems="center" space={3}>
          <Avartar
            size="lg"
            bg="#995ffd"
            imageUrl={profileImageUrl}
            name={user.username}
          />
          <VStack>
            <Text color="white" fontSize="lg" fontWeight="bold">
              {user.username || "ไม่มีชื่อผู้ใช้"}
            </Text>
            {user.email ? (
              <Text color="purple.200" fontSize="xs">
                {user.email}
              </Text>
            ) : null}
          </VStack>
        </HStack>
      </Box>

      {/* Menu */}
      <Flex flex={1} justifyContent="space-between" px={4} pt={4} pb={4}>
        <VStack
          space={0}
          bg="white"
          borderRadius={12}
          borderWidth={1}
          borderColor="gray.200"
          overflow="hidden"
        >
          {/* แก้ไขโปรไฟล์ */}
          <CustomPressable
            onPress={() => router.push("/me")}
            fontSize={14}
            p={4}
            justifyContent="flex-start"
            title="แก้ไขโปรไฟล์"
            icon={
              <MaterialCommunityIcons
                name="account-edit"
                size={22}
                color="#7c3aed"
              />
            }
            iconPosition="left"
          />
          <Divider />

          {/* การซื้อของฉัน */}
          <CustomPressable
            onPress={() => router.push("/(profile)/orders" as any)}
            fontSize={14}
            p={4}
            justifyContent="flex-start"
            title="การซื้อของฉัน"
            icon={
              <MaterialCommunityIcons
                name="package-variant-closed"
                size={22}
                color="#7c3aed"
              />
            }
            iconPosition="left"
          />
          <Divider />

          {/* ถูกใจ */}
          <CustomPressable
            onPress={() => router.push("/(profile)/wishlist" as any)}
            p={4}
            justifyContent="flex-start"
            fontSize={14}
            title="ถูกใจ"
            icon={
              <MaterialCommunityIcons name="heart" size={22} color="#7c3aed" />
            }
            iconPosition="left"
          />
          <Divider />

          {/* สมัครเป็นร้านค้า (เฉพาะ role: user) */}
          <CustomPressable
            onPress={() => router.push("/store/create-store")}
            p={4}
            justifyContent="flex-start"
            fontSize={14}
            title="สมัครเป็นร้านค้า"
            icon={
              <MaterialCommunityIcons
                name="store-plus"
                size={22}
                color="#7c3aed"
              />
            }
            iconPosition="left"
            rolesAllowed={["user"]}
          />

          {/* ร้านค้าของฉัน (เฉพาะ role: seller) */}
          <CustomPressable
            onPress={() => router.push("/(seller)/seller-menu")}
            p={4}
            justifyContent="flex-start"
            fontSize={14}
            title="ร้านค้าของฉัน"
            icon={
              <MaterialCommunityIcons name="store" size={22} color="#7c3aed" />
            }
            iconPosition="left"
            rolesAllowed={["seller"]}
          />
        </VStack>

        {/* Logout */}
        <Box
          mt={4}
          bg="white"
          borderRadius={12}
          borderWidth={1}
          borderColor="gray.200"
          overflow="hidden"
        >
          <CustomPressable
            fontSize={14}
            onPress={handleLogout}
            p={4}
            justifyContent="flex-start"
            title="ออกจากระบบ"
            icon={
              <MaterialCommunityIcons name="logout" size={22} color="#ef4444" />
            }
            iconPosition="left"
            color="red.500"
          />
        </Box>
      </Flex>

      {/* Loading overlay */}
      {loading && (
        <Center
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="rgba(0,0,0,0.3)"
          zIndex={10}
        >
          <Spinner color="white" size="lg" />
        </Center>
      )}
    </Flex>
  );
}
