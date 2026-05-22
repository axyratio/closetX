// app/store/edit-store.tsx — แก้ไขรองรับ Admin Mode
import { getMyStore, updateStore } from "@/api/store";
import { Avartar } from "@/components/avartar";
import { AppBarNoCheck } from "@/components/navbar";
import { EditPressable } from "@/components/profile/pressable";
import { getToken } from "@/utils/secure-store";
import { DOMAIN } from "@/้host";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Center, HStack, Spinner, VStack } from "native-base";
import React, { useEffect, useState } from "react";
import {
  Alert,
  BackHandler,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";

type StoreData = {
  id: string;
  name: string;
  description?: string;
  address?: string;
  logoUrl?: string;
};

export default function EditStoreScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    storeId: string;
    storeName: string;
    logoUrl?: string;
    isAdminMode?: string; // ✅ เพิ่ม param
    updatedField?: string;
    updatedValue?: string;
  }>();

  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // ✅ เช็คว่าเป็น admin mode หรือไม่
  const isAdminMode = params.isAdminMode === "true";

  console.log("[EDIT STORE] params:", params);
  console.log("[EDIT STORE] isAdminMode:", isAdminMode);
  console.log("[EDIT STORE] storeId:", params.storeId);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      loadStoreData(); // reload จาก backend ทุกครั้งที่กลับมา
    }
  }, [isFocused]);

  // ✅ แก้ไข: รองรับทั้ง admin mode และ owner mode
  const loadStoreData = async () => {
    try {
      setLoading(true);
      let response;

      if (isAdminMode && params.storeId) {
        // ✅ Admin mode: เรียก /admin/stores/{storeId}
        console.log("[EDIT STORE] Fetching as admin:", params.storeId);
        const token = await getToken();
        const res = await fetch(`${DOMAIN}/admin/stores/${params.storeId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        response = await res.json();
        console.log("[EDIT STORE] Admin response:", response);
      } else {
        // ✅ Owner mode: เรียก /stores/me
        console.log("[EDIT STORE] Fetching as owner");
        response = await getMyStore();
        console.log("[EDIT STORE] Owner response:", response);
      }

      if (response.success && response.data) {
        const storeData = response.data;
        let finalLogoUrl = storeData.logo_path;
        if (finalLogoUrl && !finalLogoUrl.startsWith("http")) {
          finalLogoUrl = `${DOMAIN}${finalLogoUrl}`;
        }

        setStore({
          id: storeData.store_id,
          name: storeData.name,
          description: storeData.description || "",
          address: storeData.address || "",
          logoUrl: finalLogoUrl,
        });
      } else {
        Alert.alert("ข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลร้านค้าได้");
      }
    } catch (error) {
      console.error("[EDIT STORE] Error loading store:", error);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลร้านค้าได้");
    } finally {
      setLoading(false);
    }
  };

  // เมื่อกลับมาจากการแก้ไขที่หน้า generic edit
  useEffect(() => {
    if (params.updatedField && params.updatedValue) {
      setStore((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          [params.updatedField!]: params.updatedValue!,
        };
      });
    }
  }, [params.updatedField, params.updatedValue]);

  // Handle back press
  useEffect(() => {
    const backAction = () => {
      router.back();
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );

    return () => backHandler.remove();
  }, [router]);

  // อัพโหลดโลโก้
  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        try {
          setUploadingLogo(true);

          const logoFile = {
            uri: asset.uri,
            type: "image/jpeg",
            name: `store_logo_${Date.now()}.jpg`,
          };

          // ✅ อัพโหลดโลโก้ (ใช้ API เดิมได้ เพราะ updateStore จัดการ endpoint เอง)
          const response = await updateStore(store!.id, {
            logo: logoFile as any,
          });

          if (response.success) {
            let newLogoUrl = response.data?.logo_path;
            if (newLogoUrl && !newLogoUrl.startsWith("http")) {
              newLogoUrl = `${DOMAIN}${newLogoUrl}`;
            }

            setStore((prev) =>
              prev ? { ...prev, logoUrl: newLogoUrl } : null,
            );
            Alert.alert("สำเร็จ", "อัพโหลดโลโก้เรียบร้อย");
          } else {
            Alert.alert(
              "ข้อผิดพลาด",
              response.message || "ไม่สามารถอัพโหลดได้",
            );
          }
        } catch (error) {
          console.error("Error uploading logo:", error);
          Alert.alert("ข้อผิดพลาด", "ไม่สามารถอัพโหลดโลโก้ได้");
        } finally {
          setUploadingLogo(false);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถเลือกรูปภาพได้");
    }
  };

  const handleRemoveLogo = () => {
    Alert.alert("ลบโลโก้", "คุณต้องการลบโลโก้ร้านใช่หรือไม่?", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: async () => {
          try {
            setUploadingLogo(true);

            const response = await updateStore(store!.id, {
              remove_logo: true,
            });

            if (response.success) {
              setStore((prev) =>
                prev ? { ...prev, logoUrl: undefined } : null,
              );
              Alert.alert("สำเร็จ", "ลบโลโก้เรียบร้อย");
            } else {
              Alert.alert("ข้อผิดพลาด", response.message || "ไม่สามารถลบได้");
            }
          } catch (error) {
            console.error("Error removing logo:", error);
            Alert.alert("ข้อผิดพลาด", "ไม่สามารถลบโลโก้ได้");
          } finally {
            setUploadingLogo(false);
          }
        },
      },
    ]);
  };

  if (loading || !store) {
    return (
      <Center flex={1}>
        <Spinner size="lg" />
      </Center>
    );
  }

  return (
    <VStack flex={1} bg="#f0f0f0" style={{ gap: 8 }}>
      <AppBarNoCheck
        title={isAdminMode ? "แก้ไขร้านค้า (Admin)" : "แก้ไขข้อมูลร้านค้า"}
      />

      {/* Logo Section */}
      <VStack alignItems="center" py={4} bg="white" space={3}>
        <TouchableOpacity
          onPress={handlePickImage}
          disabled={uploadingLogo}
          style={{ position: "relative" }}
        >
          <Avartar name={store.name} imageUrl={store.logoUrl} size={150} />

          {uploadingLogo && (
            <Center
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              bg="rgba(0,0,0,0.5)"
              borderRadius={75}
            >
              <Spinner size="lg" color="white" />
            </Center>
          )}

          {!store.logoUrl && (
            <Center
              position="absolute"
              bottom={0}
              right={0}
              bg="#8b5cf6"
              borderRadius={999}
              width={40}
              height={40}
              borderWidth={3}
              borderColor="white"
            >
              <Ionicons name="camera" size={20} color="white" />
            </Center>
          )}
        </TouchableOpacity>

        {/* Logo Actions */}
        <HStack space={2}>
          <TouchableOpacity
            onPress={handlePickImage}
            disabled={uploadingLogo}
            style={[
              styles.button,
              styles.primaryButton,
              uploadingLogo && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {store.logoUrl ? "เปลี่ยนโลโก้" : "เพิ่มโลโก้"}
            </Text>
          </TouchableOpacity>

          {store.logoUrl && (
            <TouchableOpacity
              onPress={handleRemoveLogo}
              disabled={uploadingLogo}
              style={[
                styles.button,
                styles.dangerButton,
                uploadingLogo && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.dangerButtonText}>ลบโลโก้</Text>
            </TouchableOpacity>
          )}
        </HStack>

        <Text style={styles.hint}>
          แนะนำขนาด 1:1 (Square) สำหรับโลโก้ที่สวยงาม
        </Text>
      </VStack>

      {/* Edit Fields */}
      <VStack>
        <EditPressable
          title="ชื่อร้านค้า"
          value={store.name}
          onPress={() =>
            router.push({
              pathname: "/store/edit",
              params: {
                key: "name",
                value: store.name,
                title: "แก้ไขชื่อร้านค้า",
                returnPath: "/store/edit-store",
                returnParams: JSON.stringify({
                  storeId: store.id,
                  isAdminMode: params.isAdminMode, // ✅ ส่ง isAdminMode ต่อ
                }),
              },
            })
          }
        />

        <EditPressable
          title="คำอธิบายร้าน"
          value={store.description || "ไม่ได้ระบุ"}
          onPress={() =>
            router.push({
              pathname: "/store/edit",
              params: {
                key: "description",
                value: store.description || "",
                title: "แก้ไขคำอธิบายร้าน",
                returnPath: "/store/edit-store",
                returnParams: JSON.stringify({
                  storeId: store.id,
                  isAdminMode: params.isAdminMode, // ✅ ส่ง isAdminMode ต่อ
                }),
              },
            })
          }
        />

        <EditPressable
          title="ที่อยู่ร้าน"
          value={store.address || "ไม่ได้ระบุ"}
          onPress={() =>
            router.push({
              pathname: "/store/edit",
              params: {
                key: "address",
                value: store.address || "",
                title: "แก้ไขที่อยู่ร้าน",
                returnPath: "/store/edit-store",
                returnParams: JSON.stringify({
                  storeId: store.id,
                  isAdminMode: params.isAdminMode, // ✅ ส่ง isAdminMode ต่อ
                }),
              },
            })
          }
        />
      </VStack>
    </VStack>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  primaryButton: {
    backgroundColor: "#8b5cf6",
  },
  primaryButtonText: {
    color: "white",
    fontWeight: "600",
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: "#ef4444",
    backgroundColor: "transparent",
  },
  dangerButtonText: {
    color: "#ef4444",
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  hint: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
  },
});
