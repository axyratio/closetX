// app/(profile)/profile-picture.tsx
import { AppBarNoCheck } from "@/components/navbar";
import { useProfileContext } from "@/context/Refresh";
import { getToken } from "@/utils/secure-store";
import { DOMAIN } from "@/้host";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Box } from "native-base";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Props {
  currentProfilePicture?: string;
}

export default function ProfilePictureScreen({ currentProfilePicture }: Props) {
  const { setRefresh } = useProfileContext();
  const router = useRouter();

  const [profilePicture, setProfilePicture] = useState<string | null>(
    currentProfilePicture || null,
  );
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ✅ เลือกรูปจาก Gallery
  const pickImage = async () => {
    try {
      // ขออนุญาต
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "ต้องการสิทธิ์",
          "แอปต้องการสิทธิ์เข้าถึงรูปภาพเพื่ออัปโหลดรูปโปรไฟล์",
        );
        return;
      }

      // เลือกรูป
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1], // Square
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถเลือกรูปภาพได้");
    }
  };

  // ✅ ถ่ายรูปจากกล้อง
  const takePhoto = async () => {
    try {
      // ขออนุญาต
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "ต้องการสิทธิ์",
          "แอปต้องการสิทธิ์เข้าถึงกล้องเพื่อถ่ายรูปโปรไฟล์",
        );
        return;
      }

      // ถ่ายรูป
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถถ่ายรูปได้");
    }
  };

  // ✅ อัปโหลดรูป
  const uploadImage = async (uri: string) => {
    try {
      setUploading(true);

      const token = await getToken();

      // สร้าง FormData
      const formData = new FormData();
      formData.append("file", {
        uri: uri,
        type: "image/jpeg",
        name: "profile.jpg",
      } as any);

      const response = await axios.post(
        `${DOMAIN}/profile/profile-picture`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
            "Connection": "close",
          },
        },
      );

      console.log("Upload response:", response.data);

      if (response.data.success) {
        // อัปเดต state โดยตรง
        if (response.data.profile_picture_url) {
          setProfilePicture(response.data.profile_picture_url);
        }

        // รีเซตข้อมูลโปรไฟล์จากเซิร์ฟเวอร์
        setRefresh((prev) => prev + 1);

        Alert.alert("สำเร็จ", "อัปโหลดรูปโปรไฟล์สำเร็จ");
      } else {
        Alert.alert(
          "ข้อผิดพลาด",
          response.data.message || "ไม่สามารถอัปโหลดได้",
        );
      }
    } catch (error: any) {
      console.error("Error uploading image:", error);

      if (error.response?.data?.message) {
        Alert.alert("ข้อผิดพลาด", error.response.data.message);
      } else {
        Alert.alert("ข้อผิดพลาด", "ไม่สามารถอัปโหลดรูปภาพได้");
      }
    } finally {
      setUploading(false);
    }
  };

  // ✅ ลบรูปโปรไฟล์
  const deleteProfilePicture = async () => {
    Alert.alert("ยืนยันการลบ", "คุณต้องการลบรูปโปรไฟล์หรือไม่?", [
      {
        text: "ยกเลิก",
        style: "cancel",
      },
      {
        text: "ลบ",
        style: "destructive",
        onPress: async () => {
          try {
            setDeleting(true);

            const token = await getToken();
            const response = await axios.delete(
              `${DOMAIN}/profile/profile-picture`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            );

            if (response.data.success) {
              setProfilePicture(null);
              setRefresh((prev) => prev + 1);
              Alert.alert("สำเร็จ", "ลบรูปโปรไฟล์สำเร็จ");
            } else {
              Alert.alert(
                "ข้อผิดพลาด",
                response.data.message || "ไม่สามารถลบได้",
              );
            }
          } catch (error: any) {
            console.error("Error deleting profile picture:", error);
            Alert.alert("ข้อผิดพลาด", "ไม่สามารถลบรูปโปรไฟล์ได้");
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  // ✅ ฟังก์ชันบันทึกและกลับ
  const handleSave = () => {
    // เนื่องจากการอัปโหลดและลบรูปทำแบบ real-time แล้ว
    // เพียงแค่กลับไปหน้าเดิม
    router.back();
  };

  return (
    <View style={{ flex: 1 }}>
      <AppBarNoCheck
        title="รูปโปรไฟล์"
        actions={[
          {
            iconName: "check",
            accessibilityLabel: "บันทึก",
            onPress: handleSave,
          },
        ]}
      />

      <Box style={styles.container}>
        {/* แสดงรูปโปรไฟล์ */}
        <View style={styles.profilePictureContainer}>
          {profilePicture ? (
            <Image
              source={{ uri: profilePicture }}
              style={styles.profilePicture}
            />
          ) : (
            <View style={styles.placeholderContainer}>
              <MaterialCommunityIcons
                name="account-circle"
                size={120}
                color="#d1d5db"
              />
            </View>
          )}

          {/* Loading overlay */}
          {(uploading || deleting) && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#7c3aed" />
            </View>
          )}
        </View>

        {/* ปุ่มต่างๆ */}
        <View style={styles.buttonsContainer}>
          {/* เลือกจาก Gallery */}
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={pickImage}
            disabled={uploading || deleting}
          >
            <MaterialCommunityIcons name="image" size={24} color="#fff" />
            <Text style={styles.buttonText}>เลือกจากแกลเลอรี่</Text>
          </TouchableOpacity>

          {/* ถ่ายรูป */}
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={takePhoto}
            disabled={uploading || deleting}
          >
            <MaterialCommunityIcons name="camera" size={24} color="#7c3aed" />
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              ถ่ายรูป
            </Text>
          </TouchableOpacity>

          {/* ลบรูป */}
          {profilePicture && (
            <TouchableOpacity
              style={[styles.button, styles.dangerButton]}
              onPress={deleteProfilePicture}
              disabled={uploading || deleting}
            >
              <MaterialCommunityIcons name="delete" size={24} color="#ef4444" />
              <Text style={[styles.buttonText, styles.dangerButtonText]}>
                ลบรูปโปรไฟล์
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* คำแนะนำ */}
        <View style={styles.tipsContainer}>
          <MaterialCommunityIcons
            name="information"
            size={20}
            color="#6b7280"
          />
          <Text style={styles.tipsText}>
            • รองรับไฟล์: JPG, PNG, GIF, WebP{"\n"}• ขนาดแนะนำ: 500x500 pixels
            {"\n"}• ขนาดไฟล์ไม่เกิน 5MB
          </Text>
        </View>
      </Box>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  profilePictureContainer: {
    alignItems: "center",
    marginTop: 32,
    marginBottom: 32,
    position: "relative",
  },
  profilePicture: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: "#e5e7eb",
  },
  placeholderContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 100,
  },
  buttonsContainer: {
    gap: 12,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: "#7c3aed",
  },
  secondaryButton: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#7c3aed",
  },
  dangerButton: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#ef4444",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  secondaryButtonText: {
    color: "#7c3aed",
  },
  dangerButtonText: {
    color: "#ef4444",
  },
  tipsContainer: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    padding: 16,
    borderRadius: 8,
    marginTop: 32,
    gap: 8,
  },
  tipsText: {
    flex: 1,
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 18,
  },
});
