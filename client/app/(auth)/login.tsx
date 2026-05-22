// app/(auth)/login.tsx
import { getCurrentUserId, validateToken } from "@/utils/fetch-interceptor";
import { getToken, saveRole, saveToken } from "@/utils/secure-store";
import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { Box, Button, Text } from "native-base";
import { useEffect, useState } from "react";
import {
  Text as RNText,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { DOMAIN } from "@/้host";

export default function Login() {
  const router = useRouter();
  const [formData, setFormData] = useState({ identity: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState({
    identity: "",
    password: "",
    message: "",
  });

  const { identity, password } = formData;
  const setField = (field: string, value: string) =>
    setFormData({ ...formData, [field]: value });

  useEffect(() => {
    const checkToken = async () => {
      const token = await getToken();
      if (token) {
        router.replace("/(tabs)");
      }
    };
    checkToken();
  }, []);

  const handleError = () => {
    const newError = { identity: "", password: "", message: "" };
    if (!identity) newError.identity = "กรุณากรอกชื่อผู้ใช้หรืออีเมล";
    if (!password) newError.password = "กรุณากรอกรหัสผ่าน";
    setError(newError);
    return Object.values(newError).some((v) => v !== "");
  };

  const handleLogin = async () => {
    if (handleError()) return;

    try {
      setLoading(true);
      setError({ identity: "", password: "", message: "" });

      const res = await fetch(`${DOMAIN}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errData = await res.json();
        setError({
          identity: "",
          password: "",
          message: errData.message || "ผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
        });
        return;
      }

      const data = await res.json();
      await saveToken(data.access_token);
      await saveRole(data.user_role);
      await validateToken();
      console.log("[LOGIN] Current User ID after login", getCurrentUserId());

      if (data.user_role === "admin") {
        router.replace("/(admin)/admin-home");
      } else {
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      console.log(err, "err");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box flex={1} justifyContent="space-between" flexDirection="column" bg="white">
      {/* Purple header */}
      <Box bg="#7c3aed" pt={12} pb={8} px={4} alignItems="center">
        <RNText style={{ fontSize: 32, fontWeight: "bold", color: "#fff" }}>
          ClosetX
        </RNText>
        <Text color="purple.200" fontSize="sm" mt={1}>
          เข้าสู่ระบบ
        </Text>
      </Box>

      {/* Form */}
      <Box flex={1} px={4} pt={6} style={{ gap: 12 }}>
        {error.message !== "" && (
          <Text style={{ color: "red", fontSize: 13 }}>{error.message}</Text>
        )}

        <Box>
          <TextInput
            placeholder="ชื่อผู้ใช้ หรือ อีเมล"
            value={identity}
            onChangeText={(text) => setField("identity", text)}
            autoCapitalize="none"
            style={{
              borderWidth: 1,
              borderColor: error.identity ? "red" : "#d8b4fe",
              padding: 10,
              borderRadius: 8,
              fontSize: 15,
            }}
          />
          {error.identity !== "" && (
            <Text style={{ color: "red", fontSize: 11, marginTop: 3 }}>
              {error.identity}
            </Text>
          )}
        </Box>

        <Box>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TextInput
              placeholder="รหัสผ่าน"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(text) => setField("password", text)}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: error.password ? "red" : "#d8b4fe",
                padding: 10,
                borderRadius: 8,
                fontSize: 15,
                paddingRight: 40,
              }}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={{ position: "absolute", right: 10 }}
            >
              <Feather
                name={showPassword ? "eye" : "eye-off"}
                size={20}
                color="#9c6fe4"
              />
            </TouchableOpacity>
          </View>
          {error.password !== "" && (
            <Text style={{ color: "red", fontSize: 11, marginTop: 3 }}>
              {error.password}
            </Text>
          )}
        </Box>

        <View style={{ alignItems: "flex-end" }}>
          <TouchableOpacity
            onPress={() => router.push("/(auth)/forgot-password" as any)}
          >
            <Text color="purple.600" fontSize="sm">
              ลืมรหัสผ่าน?
            </Text>
          </TouchableOpacity>
        </View>
      </Box>

      {/* Bottom */}
      <View style={{ padding: 16 }}>
        <View style={{ alignItems: "flex-end", marginBottom: 8 }}>
          <TouchableOpacity onPress={() => router.replace("/(auth)/register")}>
            <Text color="purple.600" fontSize="sm">
              ยังไม่มีบัญชี? สมัครสมาชิก
            </Text>
          </TouchableOpacity>
        </View>
        <Button
          py={3}
          onPress={handleLogin}
          bg="#7c3aed"
          _pressed={{ bg: "#6d28d9" }}
          isLoading={loading}
          borderRadius={8}
        >
          <Text fontSize={16} color="white" fontWeight="bold">
            เข้าสู่ระบบ
          </Text>
        </Button>
      </View>
    </Box>
  );
}