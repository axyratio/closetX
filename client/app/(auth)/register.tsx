// app/(auth)/register.tsx
import { DOMAIN } from "@/้host";
import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { Box, Button, HStack, Text } from "native-base";
import { useState } from "react";
import {
  Text as RNText,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
    confirm_email: "",
    first_name: "",
    last_name: "",
    phone_number: "",
  });

  const {
    username,
    password,
    email,
    confirm_email,
    first_name,
    last_name,
    phone_number,
  } = formData;

  const setField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState({
    username: "",
    password: "",
    email: "",
    confirm_email: "",
    first_name: "",
    last_name: "",
    phone_number: "",
  });

  const handleError = () => {
    let newError = {
      username: "",
      password: "",
      email: "",
      confirm_email: "",
      first_name: "",
      last_name: "",
      phone_number: "",
    };

    if (username === "") newError.username = "กรุณากรอกชื่อผู้ใช้";
    if (email === "") newError.email = "กรุณากรอกอีเมล";
    if (confirm_email === "") {
      newError.confirm_email = "กรุณายืนยันอีเมลอีกครั้ง";
    } else if (email !== confirm_email) {
      newError.confirm_email = "อีเมลไม่ตรงกัน กรุณากรอกใหม่";
    }
    if (password === "") newError.password = "กรุณากรอกรหัสผ่าน";
    if (first_name === "") newError.first_name = "กรุณากรอกชื่อ";
    if (last_name === "") newError.last_name = "กรุณากรอกนามสกุล";
    if (phone_number === "") newError.phone_number = "กรุณากรอกเบอร์โทรศัพท์";

    setError(newError);
    return Object.values(newError).some((v) => v !== "");
  };

  const handleRegister = async () => {
    const hasError = handleError();
    if (hasError) return;

    try {
      setLoading(true);

      // ตัด confirm_email ออกก่อนส่ง backend
      const { confirm_email: _, ...sendData } = formData;

      const res = await fetch(`${DOMAIN}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sendData),
      });

      if (!res.ok) {
        const errorMessage = await res.text();
        const errorData = JSON.parse(errorMessage);
        const fieldErrors = errorData.errors || errorData;

        setError({
          username: fieldErrors.username || "",
          password: fieldErrors.password || "",
          email: fieldErrors.email || "",
          confirm_email: "",
          first_name: fieldErrors.first_name || "",
          last_name: fieldErrors.last_name || "",
          phone_number: fieldErrors.phone_number || "",
        });
        return;
      }

      setError({
        username: "",
        password: "",
        email: "",
        confirm_email: "",
        first_name: "",
        last_name: "",
        phone_number: "",
      });
      router.push("/login");
    } catch (err: any) {
      console.error("[Register] Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (hasError: boolean) => ({
    borderWidth: 1,
    borderColor: hasError ? "red" : "#d8b4fe",
    padding: 10,
    marginTop: 5,
    borderRadius: 8,
    fontSize: 15,
  });

  return (
    <Box flex={1} bg="white">
      {/* Purple header */}
      <Box bg="#7c3aed" pt={12} pb={8} px={4} alignItems="center">
        <RNText style={{ fontSize: 32, fontWeight: "bold", color: "#fff" }}>
          ClosetX
        </RNText>
        <Text color="purple.200" fontSize="sm" mt={1}>
          สมัครเข้าใช้งาน
        </Text>
      </Box>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ข้อมูลการสมัคร */}
        <RNText
          style={{ marginBottom: 8, fontWeight: "600", color: "#7c3aed" }}
        >
          ข้อมูลการสมัคร
        </RNText>

        <TextInput
          placeholder="ชื่อผู้ใช้"
          value={username}
          onChangeText={(text) => setField("username", text)}
          autoCapitalize="none"
          style={inputStyle(!!error.username)}
        />
        {error.username !== "" && (
          <Text style={{ color: "red", fontSize: 10 }}>{error.username}</Text>
        )}

        <TextInput
          placeholder="อีเมล"
          value={email}
          onChangeText={(text) => setField("email", text)}
          autoCapitalize="none"
          keyboardType="email-address"
          style={inputStyle(!!error.email)}
        />
        {error.email !== "" && (
          <Text style={{ color: "red", fontSize: 10 }}>{error.email}</Text>
        )}

        <TextInput
          placeholder="ยืนยัน อีเมล"
          value={confirm_email}
          onChangeText={(text) => setField("confirm_email", text)}
          autoCapitalize="none"
          keyboardType="email-address"
          style={inputStyle(!!error.confirm_email)}
        />
        {error.confirm_email !== "" && (
          <Text style={{ color: "red", fontSize: 10 }}>
            {error.confirm_email}
          </Text>
        )}

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TextInput
            placeholder="รหัสผ่าน"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={(text) => setField("password", text)}
            style={[
              inputStyle(!!error.password),
              { flex: 1, paddingRight: 40 },
            ]}
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
          <Text style={{ color: "red", fontSize: 10 }}>{error.password}</Text>
        )}

        {/* ข้อมูลส่วนตัว */}
        <RNText
          style={{
            marginTop: 16,
            marginBottom: 4,
            fontWeight: "600",
            color: "#7c3aed",
          }}
        >
          ข้อมูลส่วนตัว
        </RNText>

        <HStack width="100%" style={{ gap: 8 }}>
          <TextInput
            placeholder="ชื่อจริง"
            value={first_name}
            onChangeText={(text) => setField("first_name", text)}
            style={[inputStyle(!!error.first_name), { flex: 1 }]}
          />
          <TextInput
            placeholder="นามสกุล"
            value={last_name}
            onChangeText={(text) => setField("last_name", text)}
            style={[inputStyle(!!error.last_name), { flex: 1 }]}
          />
        </HStack>
        {error.first_name !== "" && (
          <Text style={{ color: "red", fontSize: 10 }}>{error.first_name}</Text>
        )}
        {error.last_name !== "" && (
          <Text style={{ color: "red", fontSize: 10 }}>{error.last_name}</Text>
        )}

        <TextInput
          placeholder="โทรศัพท์"
          value={phone_number}
          onChangeText={(text) => setField("phone_number", text)}
          keyboardType="phone-pad"
          style={inputStyle(!!error.phone_number)}
        />
        {error.phone_number !== "" && (
          <Text style={{ color: "red", fontSize: 10 }}>
            {error.phone_number}
          </Text>
        )}

        {/* Actions */}
        <View style={{ marginTop: 20 }}>
          <View style={{ alignItems: "flex-end", marginBottom: 8 }}>
            <TouchableOpacity onPress={() => router.replace("/login")}>
              <Text color="purple.600" fontSize="sm">
                มีบัญชีแล้ว? เข้าสู่ระบบ
              </Text>
            </TouchableOpacity>
          </View>
          <Button
            py={3}
            onPress={handleRegister}
            bg="#7c3aed"
            _pressed={{ bg: "#6d28d9" }}
            isLoading={loading}
            borderRadius={8}
          >
            <Text fontSize={16} color="white" fontWeight="bold">
              สมัครสมาชิก
            </Text>
          </Button>
        </View>
      </ScrollView>
    </Box>
  );
}
