// app/address/new.tsx
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { Box, Button, Switch, Text } from "native-base";
import { useRouter } from "expo-router";

import { AppBarNoCheck } from "@/components/navbar";
import { createAddress, ShippingAddressPayload } from "@/api/address";
import { useAddressStore } from "@/components/address/address-store";

// ── Styles ────────────────────────────────────────────────────────────────────
const baseInput = {
  borderWidth: 1,
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 10,
  backgroundColor: "white",
  fontSize: 14,
} as const;
const inputStyle        = { ...baseInput, borderColor: "#E5E7EB" } as const;
const inputErrorStyle   = { ...baseInput, borderColor: "#EF4444" } as const;
const inputSuccessStyle = { ...baseInput, borderColor: "#22C55E" } as const;

// ── Validation config ─────────────────────────────────────────────────────────
interface FieldConfig { label: string; minLen: number }

const FIELD_CONFIG: Record<string, FieldConfig> = {
  full_name:    { label: "ชื่อผู้รับ",           minLen: 4 },
  phone_number: { label: "เบอร์โทรศัพท์",        minLen: 4 },
  confirmPhone: { label: "ยืนยันเบอร์โทรศัพท์",  minLen: 4 },
  address_line: { label: "ที่อยู่",              minLen: 4 },
  sub_district: { label: "ตำบล / แขวง",          minLen: 4 },
  district:     { label: "อำเภอ / เขต",          minLen: 4 },
  province:     { label: "จังหวัด",              minLen: 4 },
  postal_code:  { label: "รหัสไปรษณีย์",         minLen: 4 },
};

function validateField(key: string, value: string, phoneRef?: string): string {
  const cfg = FIELD_CONFIG[key];
  if (!cfg) return "";
  if (!value.trim())                      return `กรุณากรอก${cfg.label}`;
  if (value.trim().length < cfg.minLen)   return `${cfg.label}ต้องมีอย่างน้อย ${cfg.minLen} ตัวอักษร`;
  if (key === "confirmPhone" && phoneRef !== undefined && value !== phoneRef)
                                           return "เบอร์โทรศัพท์ไม่ตรงกัน";
  return "";
}

type ErrorMap   = Partial<Record<string, string>>;
type TouchedMap = Partial<Record<string, boolean>>;

// ── Component ─────────────────────────────────────────────────────────────────
const AddressNewScreen: React.FC = () => {
  const router = useRouter();
  const { fetchAll } = useAddressStore();

  const [form, setForm] = useState<ShippingAddressPayload>({
    full_name: "", phone_number: "", address_line: "",
    sub_district: "", district: "", province: "", postal_code: "",
    is_default: false,
  });
  const [confirmPhone, setConfirmPhone] = useState("");
  const [errors,  setErrors]  = useState<ErrorMap>({});
  const [touched, setTouched] = useState<TouchedMap>({});
  const [saving,  setSaving]  = useState(false);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const touchField  = (key: string) => setTouched((p) => ({ ...p, [key]: true }));
  const setFieldErr = (key: string, msg: string) => setErrors((p) => ({ ...p, [key]: msg }));

  const getStyle = (key: string) => {
    if (!touched[key])  return inputStyle;
    if (errors[key])    return inputErrorStyle;
    return inputSuccessStyle;
  };

  // ── onChange ──────────────────────────────────────────────────────────────
  const handleChange = (key: keyof ShippingAddressPayload, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (typeof value === "string" && touched[key]) {
      setFieldErr(key, validateField(key, value));
    }
    // re-validate confirm when phone changes
    if (key === "phone_number" && touched["confirmPhone"]) {
      setFieldErr("confirmPhone", validateField("confirmPhone", confirmPhone, value as string));
    }
  };

  const handleConfirmChange = (value: string) => {
    setConfirmPhone(value);
    if (touched["confirmPhone"]) {
      setFieldErr("confirmPhone", validateField("confirmPhone", value, form.phone_number));
    }
  };

  // ── onBlur ────────────────────────────────────────────────────────────────
  const handleBlur = (key: string, value: string, phoneRef?: string) => {
    touchField(key);
    setFieldErr(key, validateField(key, value, phoneRef));
  };

  // ── Validate all on submit ────────────────────────────────────────────────
  const validateAll = (): boolean => {
    const allTouched: TouchedMap = {};
    const allErrors:  ErrorMap   = {};

    const fields: Array<[string, string, string?]> = [
      ["full_name",    form.full_name],
      ["phone_number", form.phone_number],
      ["confirmPhone", confirmPhone,           form.phone_number],
      ["address_line", form.address_line],
      ["sub_district", form.sub_district ?? ""],
      ["district",     form.district     ?? ""],
      ["province",     form.province     ?? ""],
      ["postal_code",  form.postal_code  ?? ""],
    ];

    for (const [key, val, ref] of fields) {
      allTouched[key] = true;
      allErrors[key]  = validateField(key, val, ref);
    }
    setTouched(allTouched);
    setErrors(allErrors);
    return Object.values(allErrors).every((e) => !e);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validateAll()) return;
    setSaving(true);
    try {
      await createAddress(form);
      await fetchAll();
      router.back();
    } catch (e: any) {
      alert(e?.message || "ไม่สามารถสร้างที่อยู่ได้");
    } finally {
      setSaving(false);
    }
  };

  // ── Render field helper ───────────────────────────────────────────────────
  const renderField = (
    key: string,
    value: string,
    placeholder: string,
    onChangeText: (v: string) => void,
    opts?: { keyboardType?: "phone-pad" | "number-pad"; multiline?: boolean; phoneRef?: string }
  ) => {
    const cfg      = FIELD_CONFIG[key];
    const err      = touched[key] ? errors[key] : undefined;
    const isOk     = touched[key] && !errors[key];
    const showOk   = isOk && key === "confirmPhone";

    return (
      <View style={{ marginBottom: 16 }} key={key}>
        <Text fontSize="xs" color="coolGray.700" marginBottom={4}>
          {cfg.label} <Text color="red.500">*</Text>
        </Text>
        <TextInput
          value={value}
          placeholder={placeholder}
          onChangeText={onChangeText}
          onBlur={() => handleBlur(key, value, opts?.phoneRef)}
          keyboardType={opts?.keyboardType}
          multiline={opts?.multiline}
          style={[
            getStyle(key),
            opts?.multiline ? { textAlignVertical: "top", minHeight: 80 } : {},
          ]}
        />
        {err ? (
          <Text fontSize="xs" color="red.500" mt={1}>⚠ {err}</Text>
        ) : showOk ? (
          <Text fontSize="xs" color="green.600" mt={1}>✓ เบอร์โทรศัพท์ตรงกัน</Text>
        ) : null}
      </View>
    );
  };

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <Box flex={1} bg="coolGray.50">
      <AppBarNoCheck title="เพิ่มที่อยู่ใหม่" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          {renderField("full_name",    form.full_name,         "ชื่อ-นามสกุล",             (t) => handleChange("full_name", t))}
          {renderField("phone_number", form.phone_number,      "เช่น 0812345678",           (t) => handleChange("phone_number", t), { keyboardType: "phone-pad" })}
          {renderField("confirmPhone", confirmPhone,           "กรอกเบอร์โทรอีกครั้ง",     handleConfirmChange, { keyboardType: "phone-pad", phoneRef: form.phone_number })}
          {renderField("address_line", form.address_line,      "บ้านเลขที่, หมู่บ้าน, ถนน ฯลฯ", (t) => handleChange("address_line", t), { multiline: true })}
          {renderField("sub_district", form.sub_district ?? "", "ตำบล / แขวง",              (t) => handleChange("sub_district", t))}
          {renderField("district",     form.district     ?? "", "อำเภอ / เขต",              (t) => handleChange("district", t))}
          {renderField("province",     form.province     ?? "", "จังหวัด",                  (t) => handleChange("province", t))}
          {renderField("postal_code",  form.postal_code  ?? "", "รหัสไปรษณีย์",             (t) => handleChange("postal_code", t), { keyboardType: "number-pad" })}

          {/* Default toggle */}
          <View style={{ marginTop: 8, marginBottom: 32, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text fontSize="xs" color="coolGray.700" style={{ flex: 1, marginRight: 8 }}>
              ใช้เป็นที่อยู่ค่าเริ่มต้นสำหรับการสั่งซื้อครั้งต่อไป
            </Text>
            <Switch
              isChecked={!!form.is_default}
              onToggle={(val) => handleChange("is_default", val)}
              offTrackColor="coolGray.300"
              onTrackColor="violet.500"
            />
          </View>
        </ScrollView>

        <Box px={4} pb={6}>
          <Button onPress={handleSave} isLoading={saving} borderRadius="full">
            บันทึกที่อยู่
          </Button>
        </Box>
      </KeyboardAvoidingView>
    </Box>
  );
};

export default AddressNewScreen;