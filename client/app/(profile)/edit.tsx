// app/(profile)/edit.tsx
import { updateStore } from "@/api/store";
import { AppBarNoCheck } from "@/components/navbar";
import { useProfileContext } from "@/context/Refresh";
import { getToken } from "@/utils/secure-store";
import { DOMAIN } from "@/้host";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import { debounce } from "lodash";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Profile } from "./me";

export default function EditForm() {
  const { setRefresh } = useProfileContext();
  const router = useRouter();
  const params = useLocalSearchParams<{
    key: keyof Profile | string;
    value: string;
    title?: string;
    returnPath?: string;
    returnParams?: string;
  }>();
  const fieldKey = params.key;
  const initialValue = params.value;
  const titleMap: Record<keyof Profile, string> = {
    username: "ชื่อผู้ใช้",
    first_name: "ชื่อ",
    last_name: "นามสกุล",
    email: "อีเมล",
    phone_number: "โทรศัพท์",
    birth_date: "วันเกิด",
    profile_picture: "รูปโปรไฟล์",
  };

  const title =
    params.title ||
    (fieldKey ? titleMap[fieldKey as keyof Profile] : "แก้ไขข้อมูล");

  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // ✅ สำหรับ username validation
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null,
  );
  const [checkingUsername, setCheckingUsername] = useState(false);

  // ✅ ตรวจสอบ username ซ้ำแบบ real-time
  const checkUsernameAvailability = useCallback(
    debounce(async (username: string) => {
      if (username.length < 3) {
        setError("Username ต้องมีอย่างน้อย 3 ตัวอักษร");
        setUsernameAvailable(null);
        return;
      }

      // ถ้าเป็นค่าเดิม ไม่ต้องเช็ค
      if (username === initialValue) {
        setError("");
        setUsernameAvailable(true);
        return;
      }

      setCheckingUsername(true);
      setError("");

      try {
        const token = await getToken();
        const response = await axios.post(
          `${DOMAIN}/profile/check-username`,
          { username },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (response.data.available) {
          setUsernameAvailable(true);
          setError("");
        } else {
          setUsernameAvailable(false);
          setError(response.data.message || "Username นี้ถูกใช้งานแล้ว");
        }
      } catch (err: any) {
        console.error("Error checking username:", err);
        setError("ไม่สามารถตรวจสอบ username ได้");
      } finally {
        setCheckingUsername(false);
      }
    }, 500),
    [initialValue],
  );

  // ✅ เมื่อ username เปลี่ยน
  useEffect(() => {
    if (fieldKey === "username" && value && value !== initialValue) {
      checkUsernameAvailability(value);
    } else if (fieldKey === "username" && value === initialValue) {
      setError("");
      setUsernameAvailable(true);
    }
  }, [value, fieldKey, initialValue, checkUsernameAvailability]);

  const handleSubmit = async (fieldKey: string, initialValue: string) => {
    // ตรวจสอบว่าเป็นการแก้ไขร้านค้าหรือไม่
    const isStoreEdit = params.returnPath?.includes("store");

    if (isStoreEdit) {
      // แก้ไขข้อมูลร้านค้า
      try {
        setSaving(true);
        const returnParams = params.returnParams
          ? JSON.parse(params.returnParams)
          : {};

        const response = await updateStore(returnParams.storeId, {
          [fieldKey]: value,
        });

        if (response.success) {
          Alert.alert("สำเร็จ", "บันทึกข้อมูลเรียบร้อย", [
            {
              text: "ตกลง",
              onPress: () => {
                router.push({
                  pathname: params.returnPath as any,
                  params: {
                    ...returnParams,
                    updatedField: fieldKey,
                    updatedValue: value,
                  },
                });
              },
            },
          ]);
        } else {
          Alert.alert("ข้อผิดพลาด", response.message || "ไม่สามารถบันทึกได้");
        }
      } catch (error) {
        console.error("Error updating store:", error);
        Alert.alert("ข้อผิดพลาด", "เกิดข้อผิดพลาดในการบันทึก");
      } finally {
        setSaving(false);
      }
      return;
    }

    // ✅ ตรวจสอบ username ก่อนบันทึก
    if (fieldKey === "username" && !usernameAvailable) {
      Alert.alert("ข้อผิดพลาด", "Username นี้ถูกใช้งานแล้ว");
      return;
    }

    // แก้ไขโปรไฟล์
    if (params.returnPath) {
      const returnParams = params.returnParams
        ? JSON.parse(params.returnParams)
        : {};
      router.push({
        pathname: params.returnPath as any,
        params: {
          ...returnParams,
          updatedField: fieldKey,
          updatedValue: value,
        },
      });
      return;
    }

    try {
      setSaving(true);
      const token = await getToken();
      const res = await axios.patch(
        `${DOMAIN}/profile/change`,
        {
          [fieldKey]: value,
        } as any,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setRefresh((prev) => prev + 1);

      // ✅ ตรวจสอบ error จาก backend
      if (!res.data.success) {
        if (res.data.error && res.data.error.field === "username") {
          setError(res.data.error.message);
          return;
        }
        setError(res.data.message || "Something went wrong");
        return;
      }

      console.log("Saved:", res.data);
      router.back();
    } catch (err: any) {
      console.error(err);

      // ✅ แสดง error จาก response
      if (err.response?.data?.error) {
        setError(err.response.data.error.message || "เกิดข้อผิดพลาด");
      } else {
        setError("เกิดข้อผิดพลาดในการบันทึก");
      }
    } finally {
      setSaving(false);
    }
  };

  // ตรวจสอบว่าเป็นการแก้ไขคำอธิบายหรือที่อยู่หรือไม่ (ควรเป็น multiline)
  const isMultiline = fieldKey === "description" || fieldKey === "address";

  return (
    <View style={{ flex: 1 }}>
      <AppBarNoCheck
        title={title}
        actions={[
          {
            iconName: "check",
            accessibilityLabel: "บันทึก",
            onPress: async () => {
              if (fieldKey && initialValue)
                await handleSubmit(fieldKey as string, initialValue);
            },
          },
        ]}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View style={styles.container}>
          {/* คำอธิบาย */}
          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="pencil" size={20} color="#3b82f6" />
            <Text style={styles.infoText}>
              กรอกข้อมูลใหม่และกดปุ่ม ✓ เพื่อบันทึก
            </Text>
          </View>

          {/* ฟิลด์ข้อมูล */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{title} *</Text>
            <TextInput
              style={[
                isMultiline ? styles.textArea : styles.input,
                error && styles.inputError,
              ]}
              value={value}
              onChangeText={(text) => {
                setValue(text);
                setError("");
              }}
              placeholder={`กรอก${title}`}
              multiline={isMultiline}
              numberOfLines={isMultiline ? 4 : 1}
              editable={!saving}
              textAlignVertical={isMultiline ? "top" : "center"}
            />

            {/* แสดงสถานะตรวจสอบ username */}
            {fieldKey === "username" && checkingUsername && (
              <View style={styles.checkingContainer}>
                <ActivityIndicator size="small" color="#6b7280" />
                <Text style={styles.checkingText}>กำลังตรวจสอบ...</Text>
              </View>
            )}

            {/* แสดง error */}
            {error && !checkingUsername && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            {/* แสดงว่าใช้งานได้ (สีเขียว) */}
            {fieldKey === "username" &&
              usernameAvailable &&
              !checkingUsername &&
              value !== initialValue && (
                <View style={styles.successContainer}>
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={16}
                    color="#10b981"
                  />
                  <Text style={styles.successText}>Username นี้ใช้งานได้</Text>
                </View>
              )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#fff",
    flex: 1,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#dbeafe",
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    alignItems: "center",
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#1e40af",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#374151",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: "#fff",
    minHeight: 100,
    textAlignVertical: "top",
  },
  inputError: {
    borderColor: "#ef4444",
    borderWidth: 2,
  },
  checkingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  checkingText: {
    color: "#6b7280",
    marginLeft: 8,
    fontSize: 12,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 4,
  },
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  successText: {
    color: "#10b981",
    fontSize: 12,
    marginLeft: 6,
  },
});
