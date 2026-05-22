// ==========================================
// 4. CREATE CATEGORY SCREEN
// ==========================================
// File: app/(admin)/create-category.tsx

import { createCategory } from "@/api/category";
import { AppBarNoCheck } from "@/components/navbar";
import { useRouter } from "expo-router";
import { Box, Button, Text } from "native-base";
import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

// Simple color picker colors
const PRESET_COLORS = [
  "#E8F5E9", // Light Green
  "#E3F2FD", // Light Blue
  "#FFF3E0", // Light Orange
  "#FCE4EC", // Light Pink
  "#E0F2F1", // Light Teal
  "#F3E5F5", // Light Purple
  "#FFF9C4", // Light Yellow
  "#FFEBEE", // Light Red
];

export default function CreateCategoryScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("#E8F5E9");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [submitting, setSubmitting] = useState(false);

  // Auto-generate slug from name
  const handleNameChange = (text: string) => {
    setName(text);
    // Simple slug generation
    const autoSlug = text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9ก-๙]+/g, "-")
      .replace(/^-|-$/g, "");
    setSlug(autoSlug);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("กรุณากรอกชื่อหมวดหมู่");
      return;
    }

    if (!slug.trim()) {
      Alert.alert("กรุณากรอก slug");
      return;
    }

    setSubmitting(true);
    try {
      await createCategory({
        name: name.trim(),
        slug: slug.trim(),
        // description: description.trim() || undefined,
        // background_color: backgroundColor,
        // display_order: parseInt(displayOrder) || 0,
      });

      Alert.alert("สำเร็จ", "สร้างหมวดหมู่เรียบร้อยแล้ว", [
        { text: "ตกลง", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("เกิดข้อผิดพลาด", error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box flex={1} bg="white">
      <Box safeArea bg="#7c3aed" />
      <AppBarNoCheck
        title="เพิ่มหมวดหมู่ใหม่"
        onBackPress={() => router.back()}
      />

      <ScrollView>
        <Box p={4}>
          {/* Name */}
          <Box mb={4}>
            <Text fontSize="sm" fontWeight="600" mb={2}>
              ชื่อหมวดหมู่ *
            </Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={handleNameChange}
              placeholder="เช่น เสื้อยืด"
            />
          </Box>

          {/* Slug */}
          <Box mb={4}>
            <Text fontSize="sm" fontWeight="600" mb={2}>
              Slug *
            </Text>
            <TextInput
              style={styles.input}
              value={slug}
              onChangeText={setSlug}
              placeholder="tshirt"
              autoCapitalize="none"
            />
            <Text fontSize="xs" color="gray.500" mt={1}>
              ใช้ใน URL และระบบ (ภาษาอังกฤษตัวเล็ก ไม่มีช่องว่าง)
            </Text>
          </Box>

          {/* Description */}
          <Box mb={4}>
            <Text fontSize="sm" fontWeight="600" mb={2}>
              คำอธิบาย
            </Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              value={description}
              onChangeText={setDescription}
              placeholder="คำอธิบายเกี่ยวกับหมวดหมู่นี้"
              multiline
              numberOfLines={3}
            />
          </Box>

          {/* Background Color */}
          <Box mb={4}>
            <Text fontSize="sm" fontWeight="600" mb={2}>
              สีพื้นหลัง
            </Text>
            <View style={styles.colorGrid}>
              {PRESET_COLORS.map((color) => (
                <Pressable
                  key={color}
                  onPress={() => setBackgroundColor(color)}
                  style={[
                    styles.colorBox,
                    { backgroundColor: color },
                    backgroundColor === color && styles.colorBoxSelected,
                  ]}
                />
              ))}
            </View>
            <Text fontSize="xs" color="gray.500" mt={2}>
              เลือก: {backgroundColor}
            </Text>
          </Box>

          {/* Display Order */}
          <Box mb={4}>
            <Text fontSize="sm" fontWeight="600" mb={2}>
              ลำดับการแสดงผล
            </Text>
            <TextInput
              style={styles.input}
              value={displayOrder}
              onChangeText={setDisplayOrder}
              placeholder="0"
              keyboardType="number-pad"
            />
            <Text fontSize="xs" color="gray.500" mt={1}>
              ตัวเลขน้อยจะแสดงก่อน
            </Text>
          </Box>

          {/* Submit Button */}
          <Button
            bg="#7c3aed"
            onPress={handleSubmit}
            isLoading={submitting}
            isDisabled={submitting}
            mt={4}
          >
            สร้างหมวดหมู่
          </Button>
        </Box>
      </ScrollView>
    </Box>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  colorBox: {
    width: 50,
    height: 50,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorBoxSelected: {
    borderColor: "#7c3aed",
    borderWidth: 3,
  },
});
