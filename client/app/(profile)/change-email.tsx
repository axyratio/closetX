// app/(profile)/change-email.tsx
import { AppBarNoCheck } from "@/components/navbar";
import { useProfileContext } from "@/context/Refresh";
import { getToken } from "@/utils/secure-store";
import { DOMAIN } from "@/้host";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import axios from "axios";
import { useRouter } from "expo-router";
import { Box } from "native-base";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ChangeEmailScreen() {
  const { setRefresh } = useProfileContext();
  const router = useRouter();

  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [loading, setLoading] = useState(false);

  // ✅ ตรวจสอบรูปแบบอีเมล
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleChangeEmail = async () => {
    // Reset errors
    setEmailError("");
    setPasswordError("");

    // Validation
    if (!newEmail) {
      setEmailError("กรุณากรอกอีเมลใหม่");
      return;
    }

    if (!validateEmail(newEmail)) {
      setEmailError("รูปแบบอีเมลไม่ถูกต้อง");
      return;
    }

    if (!password) {
      setPasswordError("กรุณากรอกรหัสผ่าน");
      return;
    }

    if (password.length < 8) {
      setPasswordError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }

    try {
      setLoading(true);
      const token = await getToken();

      const response = await axios.patch(
        `${DOMAIN}/profile/email-change`,
        {
          new_email: newEmail,
          password: password,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.success) {
        // อัปเดท context
        setRefresh((prev) => prev + 1);

        Alert.alert("สำเร็จ", "เปลี่ยนอีเมลสำเร็จ", [
          {
            text: "ตกลง",
            onPress: () => router.back(),
          },
        ]);
      }
    } catch (error: any) {
      console.error("Error changing email:", error);

      // ✅ แสดง error ตาม field
      if (error.response?.data) {
        const errorData = error.response.data;

        if (errorData.field === "email") {
          setEmailError(errorData.message || "อีเมลนี้ถูกใช้งานแล้ว");
        } else if (errorData.field === "password") {
          setPasswordError(errorData.message || "รหัสผ่านไม่ถูกต้อง");
        } else {
          Alert.alert("ข้อผิดพลาด", errorData.message || "เกิดข้อผิดพลาด");
        }
      } else {
        Alert.alert("ข้อผิดพลาด", "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AppBarNoCheck
        title="เปลี่ยนอีเมล"
        actions={[
          {
            iconName: "check",
            accessibilityLabel: "บันทึก",
            onPress: handleChangeEmail,
          },
        ]}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <Box style={styles.container}>
          {/* คำอธิบาย */}
          <View style={styles.infoBox}>
            <MaterialCommunityIcons
              name="information"
              size={20}
              color="#3b82f6"
            />
            <Text style={styles.infoText}>
              กรุณากรอกอีเมลใหม่และรหัสผ่านของคุณเพื่อยืนยันการเปลี่ยนแปลง
            </Text>
          </View>

          {/* อีเมลใหม่ */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>อีเมลใหม่ *</Text>
            <TextInput
              style={[styles.input, emailError && styles.inputError]}
              value={newEmail}
              onChangeText={(text) => {
                setNewEmail(text);
                setEmailError(""); // Clear error เมื่อพิมพ์
              }}
              placeholder="example@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
            {emailError ? (
              <Text style={styles.errorText}>{emailError}</Text>
            ) : null}
          </View>

          {/* รหัสผ่าน */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>รหัสผ่าน *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[
                  styles.passwordInput,
                  passwordError && styles.inputError,
                ]}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setPasswordError(""); // Clear error เมื่อพิมพ์
                }}
                placeholder="กรอกรหัสผ่านเพื่อยืนยัน"
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <MaterialCommunityIcons
                  name={showPassword ? "eye-off" : "eye"}
                  size={24}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>
            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : null}
          </View>

          {/* คำเตือน */}
        </Box>
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
  inputError: {
    borderColor: "#ef4444",
    borderWidth: 2,
  },
  passwordContainer: {
    position: "relative",
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    padding: 12,
    paddingRight: 50,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  eyeIcon: {
    position: "absolute",
    right: 12,
    top: 12,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 4,
  },
  warningBox: {
    flexDirection: "row",
    backgroundColor: "#fef3c7",
    padding: 12,
    borderRadius: 8,
    marginTop: 24,
    alignItems: "center",
  },
  warningText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: "#92400e",
  },
});
