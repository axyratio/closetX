// app/(auth)/forgot-password.tsx
import { DOMAIN } from "@/้host";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Box, Button, Text, VStack } from "native-base";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from "react-native";

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetUrl, setResetUrl] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");

    if (!email.trim()) {
      setError("กรุณากรอกอีเมล");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("รูปแบบอีเมลไม่ถูกต้อง");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${DOMAIN}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const json = await res.json();

      if (json.success) {
        setSent(true);
        // DEV: แสดง reset URL ถ้ามี
        if (json.data?.reset_url) {
          setResetUrl(json.data.reset_url);
        }
      } else {
        setError(json.message || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  };

  // ─── หน้าสำเร็จ ───
  if (sent) {
    return (
      <Box flex={1} bg="white" safeArea>
        <VStack flex={1} px={6} justifyContent="center" alignItems="center" space={4}>
          <Box bg="violet.100" p={4} rounded="full">
            <Ionicons name="mail-outline" size={48} color="#7c3aed" />
          </Box>
          <Text fontSize="xl" fontWeight="bold" color="gray.800" textAlign="center">
            ส่งลิงก์แล้ว
          </Text>
          <Text fontSize="sm" color="gray.500" textAlign="center" lineHeight="xl">
            หากอีเมล {email} มีอยู่ในระบบ{"\n"}
            เราจะส่งลิงก์รีเซ็ตรหัสผ่านให้
          </Text>

          {/* DEV: แสดง token URL */}
          {resetUrl ? (
            <Box bg="gray.50" p={3} rounded="lg" w="100%">
              <Text fontSize="xs" color="gray.400" mb={1}>
                🛠 DEV: Reset URL
              </Text>
              <Text fontSize="xs" color="violet.600" selectable>
                {resetUrl}
              </Text>
            </Box>
          ) : null}

          <Button
            w="100%"
            bg="violet.600"
            _pressed={{ bg: "violet.700" }}
            rounded="xl"
            py={3}
            mt={4}
            onPress={() => router.replace("/(auth)/login")}
          >
            <Text color="white" fontWeight="bold" fontSize="md">
              กลับไปหน้าเข้าสู่ระบบ
            </Text>
          </Button>
        </VStack>
      </Box>
    );
  }

  // ─── หน้ากรอกอีเมล ───
  return (
    <Box flex={1} bg="white" safeArea>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          {/* Header */}
          <Box px={4} pt={2}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
          </Box>

          <VStack flex={1} px={6} pt={8} space={5}>
            <Box>
              <Text fontSize="2xl" fontWeight="bold" color="gray.800">
                ลืมรหัสผ่าน?
              </Text>
              <Text fontSize="sm" color="gray.500" mt={2} lineHeight="xl">
                กรอกอีเมลที่ใช้สมัครสมาชิก{"\n"}
                เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้คุณ
              </Text>
            </Box>

            {/* Email Input */}
            <Box>
              <Text fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
                อีเมล
              </Text>
              <TextInput
                placeholder="example@email.com"
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  setError("");
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={{
                  borderWidth: 2,
                  borderColor: error ? "#dc2626" : "#e5e7eb",
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 16,
                  backgroundColor: "#fafafa",
                }}
              />
              {error ? (
                <Text fontSize="xs" color="red.500" mt={1}>
                  {error}
                </Text>
              ) : null}
            </Box>

            {/* Submit Button */}
            <Button
              bg="violet.600"
              _pressed={{ bg: "violet.700" }}
              rounded="xl"
              py={3.5}
              isLoading={loading}
              isLoadingText="กำลังส่ง..."
              onPress={handleSubmit}
            >
              <Text color="white" fontWeight="bold" fontSize="md">
                ส่งลิงก์รีเซ็ตรหัสผ่าน
              </Text>
            </Button>

            <Text fontSize="xs" color="gray.400" textAlign="center" lineHeight="lg">
              จำกัด 3 ครั้ง / ชั่วโมง • ลิงก์หมดอายุใน 30 นาที
            </Text>
          </VStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </Box>
  );
}