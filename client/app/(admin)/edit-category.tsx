// File: app/(admin)/edit-category.tsx

import { fetchAdminCategories, updateCategory } from "@/api/category";
import { AppBarNoCheck } from "@/components/navbar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Box, Button, Spinner, Text } from "native-base";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    TextInput,
    View,
} from "react-native";

export default function EditCategoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ categoryId: string }>();
  const categoryId = params.categoryId;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("#E8F5E9");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    loadCategory();
  }, []);

  const loadCategory = async () => {
    try {
      const categories = await fetchAdminCategories(false);
      const cat = categories.find((c) => c.category_id === categoryId);
      if (!cat) {
        Alert.alert("ไม่พบหมวดหมู่");
        router.back();
        return;
      }

      setName(cat.name);
      setSlug(cat.slug);
      // setDescription(cat.description || "");
      // setBackgroundColor(cat.background_color || "#E8F5E9");
      // setDisplayOrder(String(cat.display_order));
      setIsActive(cat.is_active);
    } catch (error: any) {
      Alert.alert("เกิดข้อผิดพลาด", error.message);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("กรุณากรอกชื่อหมวดหมู่");
      return;
    }

    setSubmitting(true);
    try {
      await updateCategory(categoryId, {
        name: name.trim(),
        slug: slug.trim(),
        // description: description.trim() || undefined,
        // background_color: backgroundColor,
        // display_order: parseInt(displayOrder) || 0,
        is_active: isActive,
      });

      Alert.alert("สำเร็จ", "อัพเดทหมวดหมู่เรียบร้อยแล้ว", [
        { text: "ตกลง", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("เกิดข้อผิดพลาด", error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box flex={1} bg="white">
        <AppBarNoCheck
          title="แก้ไขหมวดหมู่"
          onBackPress={() => router.back()}
        />
        <Box flex={1} alignItems="center" justifyContent="center">
          <Spinner size="lg" />
        </Box>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="white">
      <AppBarNoCheck title="แก้ไขหมวดหมู่" onBackPress={() => router.back()} />

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
              onChangeText={setName}
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
              autoCapitalize="none"
            />
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
              multiline
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
              keyboardType="number-pad"
            />
          </Box>

          {/* Active Status */}
          <Box
            mb={4}
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Text fontSize="sm" fontWeight="600">
              เปิดใช้งาน
            </Text>
            <Switch value={isActive} onValueChange={setIsActive} />
          </Box>

          {/* Submit Button */}
          <Button
            bg="#7c3aed"
            onPress={handleSubmit}
            isLoading={submitting}
            isDisabled={submitting}
            mt={4}
          >
            บันทึกการแก้ไข
          </Button>
        </Box>
      </ScrollView>
    </Box>
  );
}

const PRESET_COLORS = [
  "#E8F5E9",
  "#E3F2FD",
  "#FFF3E0",
  "#FCE4EC",
  "#E0F2F1",
  "#F3E5F5",
  "#FFF9C4",
  "#FFEBEE",
];

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  colorBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  colorBoxSelected: {
    borderColor: "#7c3aed",
    borderWidth: 3,
  },
});
