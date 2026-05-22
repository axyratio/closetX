import { AppBarNoCheck } from "@/components/navbar";
import { getToken } from "@/utils/secure-store";
import { DOMAIN } from "@/้host";
import Feather from "@expo/vector-icons/Feather";
import axios from "axios";
import { router } from "expo-router";
import { Box, Text } from "native-base";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Password = {
  password: string;
  new_password: string;
  confirm_password: string;
};

type PasswordError = {
  password?: string;
  new_password?: string;
  confirm_password?: string;
};

// กฎรหัสผ่าน
const PASSWORD_RULES = [
  { test: (v: string) => v.length >= 8, message: "อย่างน้อย 8 ตัวอักษร" },
  {
    test: (v: string) => /[A-Z]/.test(v),
    message: "ตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว (A-Z)",
  },
  {
    test: (v: string) => /[a-z]/.test(v),
    message: "ตัวพิมพ์เล็กอย่างน้อย 1 ตัว (a-z)",
  },
  {
    test: (v: string) => /[0-9]/.test(v),
    message: "ตัวเลขอย่างน้อย 1 ตัว (0-9)",
  },
];

const validateNewPassword = (value: string): string => {
  for (const rule of PASSWORD_RULES) {
    if (!rule.test(value)) return rule.message;
  }
  return "";
};

// PasswordField component
function PasswordField({
  title,
  value,
  onChange,
  error,
  placeholder,
  hint,
}: {
  title: string;
  value: string;
  onChange: (text: string) => void;
  error?: string;
  placeholder?: string;
  hint?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <Box mb={4}>
      <Text fontWeight="normal" mb={2}>
        {title}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1,
          borderColor: error ? "#ef4444" : "#d1d5db",
          borderRadius: 4,
          backgroundColor: "white",
        }}
      >
        <TextInput
          placeholder={placeholder || title}
          value={value}
          onChangeText={onChange}
          secureTextEntry={!show}
          style={{ flex: 1, padding: 10, fontSize: 15, paddingRight: 40 }}
        />
        <TouchableOpacity
          onPress={() => setShow(!show)}
          style={{ position: "absolute", right: 10 }}
        >
          <Feather name={show ? "eye" : "eye-off"} size={20} color="#9c6fe4" />
        </TouchableOpacity>
      </View>
      {hint && !error && (
        <Text fontSize={11} color="gray.400" mt={1}>
          {hint}
        </Text>
      )}
      {error ? (
        <Text fontSize={12} color="red.500" mt={1}>
          {error}
        </Text>
      ) : null}
    </Box>
  );
}

// PasswordStrength indicator
function PasswordStrength({ value }: { value: string }) {
  if (!value) return null;
  const passed = PASSWORD_RULES.filter((r) => r.test(value)).length;
  const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e"];
  const labels = ["อ่อนมาก", "อ่อน", "ปานกลาง", "แข็งแกร่ง"];

  return (
    <Box mb={4}>

      <Box mt={2} style={{ gap: 2 }}>
        {PASSWORD_RULES.map((rule, i) => (
          <View
            key={i}
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <Feather
              name={rule.test(value) ? "check-circle" : "circle"}
              size={12}
              color={rule.test(value) ? "#22c55e" : "#9ca3af"}
            />
            <Text
              fontSize={11}
              color={rule.test(value) ? "green.600" : "gray.400"}
            >
              {rule.message}
            </Text>
          </View>
        ))}
      </Box>
    </Box>
  );
}

export default function PasswordScreen() {
  const [password, setPassword] = useState<Password>({
    password: "",
    new_password: "",
    confirm_password: "",
  });
  const [passwordError, setPasswordError] = useState<PasswordError>({});

  const handleChange = (key: keyof Password) => (value: string) => {
    setPassword((prev) => ({ ...prev, [key]: value }));
    setPasswordError((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (pwd: Password) => {
    const errors: PasswordError = {};

    if (!pwd.password) errors.password = "กรุณากรอกรหัสผ่านเดิม";

    const newPwdError = validateNewPassword(pwd.new_password);
    if (!pwd.new_password) {
      errors.new_password = "กรุณากรอกรหัสผ่านใหม่";
    } else if (newPwdError) {
      errors.new_password = newPwdError;
    }

    if (!pwd.confirm_password) {
      errors.confirm_password = "กรุณายืนยันรหัสผ่านใหม่";
    } else if (pwd.new_password !== pwd.confirm_password) {
      errors.confirm_password = "รหัสผ่านไม่ตรงกัน";
    }

    if (Object.keys(errors).length > 0) {
      setPasswordError(errors);
      return;
    }

    try {
      const token = await getToken();
      const res = await axios.patch(
        `${DOMAIN}/profile/password-change`,
        {
          old_password: pwd.password,
          new_password: pwd.new_password,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.data.success) {
        Alert.alert("สำเร็จ", "เปลี่ยนรหัสผ่านสำเร็จ", [
          { text: "ตกลง", onPress: () => router.back() },
        ]);
      } else {
        if (res.data.password) {
          setPasswordError({ password: res.data.password });
        } else {
          Alert.alert("ข้อผิดพลาด", res.data.message || "เกิดข้อผิดพลาด");
        }
      }
    } catch (err: any) {
      if (err.response?.data?.password) {
        setPasswordError({ password: err.response.data.password });
      } else if (err.response?.data?.message) {
        Alert.alert("ข้อผิดพลาด", err.response.data.message);
      } else {
        Alert.alert("ข้อผิดพลาด", "ไม่สามารถเปลี่ยนรหัสผ่านได้");
      }
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      <AppBarNoCheck
        title="เปลี่ยนรหัสผ่าน"
        actions={[
          {
            iconName: "check",
            accessibilityLabel: "บันทึก",
            onPress: async () => {
              await handleSubmit(password);
            },
          },
        ]}
      />

      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <PasswordField
          title="รหัสผ่านเดิม"
          value={password.password}
          onChange={handleChange("password")}
          error={passwordError.password}
        />

        <PasswordField
          title="รหัสผ่านใหม่"
          value={password.new_password}
          onChange={handleChange("new_password")}
          error={passwordError.new_password}
          hint="ต้องมีอย่างน้อย 8 ตัว, ตัวพิมพ์ใหญ่, ตัวพิมพ์เล็ก และตัวเลข"
        />

        <PasswordStrength value={password.new_password} />

        <PasswordField
          title="ยืนยันรหัสผ่านใหม่"
          value={password.confirm_password}
          onChange={handleChange("confirm_password")}
          error={passwordError.confirm_password}
        />
      </ScrollView>
    </View>
  );
}
