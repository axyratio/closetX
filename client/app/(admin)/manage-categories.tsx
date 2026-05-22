// client/app/(admin)/manage-categories-enhanced.tsx
import {
  Category,
  createCategory,
  deleteCategory,
  getAllCategories,
  updateCategory,
} from "@/api/admin-category";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Box } from "native-base";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ManageCategoriesScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false); // ✅ Loading state สำหรับการบันทึก
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    image: null as any,
    imageUri: null as string | null,
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await getAllCategories(false); // แสดงทั้งหมด รวม inactive
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error("Error loading categories:", error);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถโหลดหมวดหมู่ได้");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditMode(false);
    setSelectedCategory(null);
    setFormData({
      name: "",
      slug: "",
      description: "",
      image: null,
      imageUri: null,
    });
    setModalVisible(true);
  };

  const openEditModal = (category: Category) => {
    setEditMode(true);
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      image: null,
      imageUri: category.image || null,
    });
    setModalVisible(true);
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, // ✅ เปิดให้ crop ได้
        aspect: [1, 1], // ✅ บังคับให้เป็น square 1:1
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setFormData({
          ...formData,
          image: {
            uri: asset.uri,
            type: "image/jpeg",
            name: `category_${Date.now()}.jpg`,
          },
          imageUri: asset.uri,
        });
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถเลือกรูปภาพได้");
    }
  };

  const handleRemoveImage = () => {
    setFormData({
      ...formData,
      image: null,
      imageUri: null,
    });
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      Alert.alert("ข้อผิดพลาด", "กรุณากรอกชื่อหมวดหมู่");
      return;
    }
    if (!formData.slug.trim()) {
      Alert.alert("ข้อผิดพลาด", "กรุณากรอก Slug");
      return;
    }

    try {
      setSubmitting(true); // ✅ เริ่ม loading

      if (editMode && selectedCategory) {
        // Update
        const updateData: any = {
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
        };

        // ถ้ามีรูปใหม่
        if (formData.image) {
          updateData.image = formData.image;
        }

        // ถ้าลบรูป (มีรูปเดิมแต่ไม่มี imageUri)
        if (selectedCategory.image && !formData.imageUri) {
          updateData.remove_image = true;
        }

        const response = await updateCategory(
          selectedCategory.category_id,
          updateData,
        );

        if (response.success) {
          // ✅ อัพเดท state แทนการ reload ทั้งหน้า
          setCategories((prev) =>
            prev.map((cat) =>
              cat.category_id === selectedCategory.category_id
                ? {
                    ...cat,
                    ...response.data,
                    product_count: cat.product_count, // เก็บจำนวนสินค้าเดิม
                  }
                : cat,
            ),
          );

          Alert.alert("สำเร็จ", "อัพเดทหมวดหมู่เรียบร้อยแล้ว");
          setModalVisible(false);
        } else {
          Alert.alert("ข้อผิดพลาด", response.message || "ไม่สามารถอัพเดทได้");
        }
      } else {
        // Create
        const response = await createCategory({
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
          image: formData.image,
        });

        if (response.success) {
          // ✅ เพิ่ม category ใหม่เข้า state
          const newCategory: Category = {
            ...response.data,
            product_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setCategories((prev) => [newCategory, ...prev]);

          Alert.alert("สำเร็จ", "สร้างหมวดหมู่เรียบร้อยแล้ว");
          setModalVisible(false);
        } else {
          Alert.alert("ข้อผิดพลาด", response.message || "ไม่สามารถสร้างได้");
        }
      }
    } catch (error) {
      console.error("Error submitting category:", error);
      Alert.alert("ข้อผิดพลาด", "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSubmitting(false); // ✅ หยุด loading
    }
  };

  const handleToggleActive = async (category: Category) => {
    try {
      const newStatus = !category.is_active;
      const response = await updateCategory(category.category_id, {
        is_active: newStatus,
      });

      if (response.success) {
        // ✅ อัพเดท state แทนการ reload
        setCategories((prev) =>
          prev.map((cat) =>
            cat.category_id === category.category_id
              ? { ...cat, is_active: newStatus }
              : cat,
          ),
        );

        Alert.alert("สำเร็จ", newStatus ? "เปิดใช้งานแล้ว" : "ปิดใช้งานแล้ว");
      }
    } catch (error) {
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถเปลี่ยนสถานะได้");
    }
  };


  const renderCategoryItem = ({ item }: { item: Category }) => (
    <View style={styles.categoryCard}>
      <View style={styles.categoryContent}>

        {/* Info */}
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{item.name}</Text>
          <Text style={styles.categorySlug}>Slug: {item.slug}</Text>
          {item.description && (
            <Text style={styles.categoryDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <View style={styles.categoryStats}>
            <Text style={styles.categoryStatsText}>
              {item.product_count} สินค้า
            </Text>
            <View
              style={[
                styles.statusBadge,
                item.is_active ? styles.statusActive : styles.statusInactive,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  item.is_active
                    ? styles.statusTextActive
                    : styles.statusTextInactive,
                ]}
              >
                {item.is_active ? "ใช้งาน" : "ปิด"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.categoryActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="create-outline" size={20} color="#3b82f6" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleToggleActive(item)}
        >
          <Ionicons
            name={item.is_active ? "eye-off-outline" : "eye-outline"}
            size={20}
            color={item.is_active ? "#f59e0b" : "#10b981"}
          />
        </TouchableOpacity>

        {/* <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity> */}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Box safeArea bg="#fff" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>จัดการหมวดหมู่</Text>
        <TouchableOpacity onPress={openCreateModal}>
          <Ionicons name="add-circle" size={28} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      {/* Category List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>กำลังโหลด...</Text>
        </View>
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.category_id}
          renderItem={renderCategoryItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="albums-outline" size={64} color="#9ca3af" />
              <Text style={styles.emptyText}>ยังไม่มีหมวดหมู่</Text>
            </View>
          }
        />
      )}

      {/* Create/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              disabled={submitting}
            >
              <Ionicons name="close" size={28} color="#1f2937" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editMode ? "แก้ไขหมวดหมู่" : "สร้างหมวดหมู่ใหม่"}
            </Text>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting} // ✅ ปิดปุ่มตอน loading
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#3b82f6" />
              ) : (
                <Text style={styles.saveButton}>บันทึก</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>

            {/* Name */}
            <Text style={styles.label}>
              ชื่อหมวดหมู่ <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="เช่น เสื้อยืด"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              editable={!submitting}
            />

            {/* Slug */}
            <Text style={styles.label}>
              Slug <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="เช่น tshirt"
              value={formData.slug}
              onChangeText={(text) =>
                setFormData({ ...formData, slug: text.toLowerCase() })
              }
              autoCapitalize="none"
              editable={!submitting}
            />

            {/* Description */}
            <Text style={styles.label}>คำอธิบาย</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="คำอธิบายหมวดหมู่ (ถ้ามี)"
              value={formData.description}
              onChangeText={(text) =>
                setFormData({ ...formData, description: text })
              }
              multiline
              numberOfLines={4}
              editable={!submitting}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#6b7280",
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: "#9ca3af",
  },
  categoryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryContent: {
    flexDirection: "row",
    gap: 12,
  },
  categoryImageWrapper: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
  },
  categoryImage: {
    width: "100%",
    height: "100%",
  },
  categoryImagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  categoryInfo: {
    flex: 1,
    gap: 4,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
  },
  categorySlug: {
    fontSize: 12,
    color: "#6b7280",
  },
  categoryDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  categoryStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  categoryStatsText: {
    fontSize: 12,
    color: "#9ca3af",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: "#dcfce7",
  },
  statusInactive: {
    backgroundColor: "#fee2e2",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusTextActive: {
    color: "#16a34a",
  },
  statusTextInactive: {
    color: "#dc2626",
  },
  categoryActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 12,
  },
  actionButton: {
    padding: 8,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  saveButton: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3b82f6",
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    marginTop: 16,
  },
  required: {
    color: "#ef4444",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  imagePicker: {
    width: "100%",
    height: 250,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
    overflow: "hidden",
  },
  imagePickerPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  imagePickerText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  imagePickerSubtext: {
    fontSize: 12,
    color: "#9ca3af",
  },
  imagePreviewWrapper: {
    position: "relative",
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  imagePreview: {
    width: 200, // ✅ Square 1:1
    height: 200, // ✅ Square 1:1
    borderRadius: 12,
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
