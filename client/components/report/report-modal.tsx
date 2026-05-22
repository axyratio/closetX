// client/components/report/ReportModal.tsx
import { uploadImage } from "@/api/upload";
import { getToken } from "@/utils/secure-store";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: ReportData) => void;
  reportType: "user" | "store";
  reportedId: string;
  reportedName: string;
}

export interface ReportData {
  reason: string;
  description: string;
  imageUrls: string[];
}

const REPORT_REASONS = [
  { value: "spam", label: "สแปม", icon: "ban" },
  { value: "harassment", label: "การล่วงละเมิด", icon: "warning" },
  { value: "inappropriate", label: "เนื้อหาไม่เหมาะสม", icon: "eye-off" },
  { value: "scam", label: "การหลอกลวง", icon: "alert-circle" },
  { value: "fake", label: "ปลอม/สินค้าปลอม", icon: "close-circle" },
  { value: "copyright", label: "ละเมิดลิขสิทธิ์", icon: "document-lock" },
  { value: "other", label: "อื่นๆ", icon: "ellipsis-horizontal" },
];

export default function ReportModal({
  visible,
  onClose,
  onSubmit,
  reportType,
  reportedId,
  reportedName,
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [description, setDescription] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleReset = () => {
    setSelectedReason("");
    setDescription("");
    setImageUrls([]);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // เลือกและอัปโหลดรูปทีละรูป
  const handlePickImage = async () => {
    try {
      if (imageUrls.length >= 5) {
        Alert.alert("เกินจำนวน", "สามารถอัปโหลดรูปได้สูงสุด 5 รูป");
        return;
      }

      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("ต้องการสิทธิ์", "กรุณาอนุญาตการเข้าถึงรูปภาพ");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploading(true);
        try {
          const token = await getToken();
          if (!token) {
            Alert.alert("ข้อผิดพลาด", "กรุณาเข้าสู่ระบบใหม่");
            return;
          }

          // อัปโหลดรูป
          const uploaded = await uploadImage(result.assets[0].uri, token);

          // เพิ่ม URL ที่ได้เข้า array
          setImageUrls((prev) => [...prev, uploaded.url]);

          Alert.alert("สำเร็จ", "อัปโหลดรูปภาพสำเร็จ");
        } catch (error) {
          console.error("Error uploading image:", error);
          Alert.alert("ข้อผิดพลาด", "ไม่สามารถอัปโหลดรูปภาพได้");
        } finally {
          setUploading(false);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถเลือกรูปภาพได้");
      setUploading(false);
    }
  };

  // ลบรูป
  const handleRemoveImage = (index: number) => {
    Alert.alert("ยืนยันการลบ", "คุณต้องการลบรูปนี้ใช่หรือไม่?", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: () => {
          setImageUrls((prev) => prev.filter((_, i) => i !== index));
        },
      },
    ]);
  };

  // ส่งรายงาน
  const handleSubmit = async () => {
  // Validation
  if (!selectedReason) {
    Alert.alert("กรุณาเลือกเหตุผล", "โปรดเลือกเหตุผลในการรายงาน");
    return;
  }

  setSubmitting(true);

  try {
    await onSubmit({
      reason: selectedReason,
      description: description.trim(),
      imageUrls: imageUrls,
    });
    
    // ✅ Reset form หลังส่งสำเร็จ
    handleReset();
  } catch (error) {
    console.error("Submit error:", error);
  } finally {
    // ✅ ปิดการหมุนเสมอ
    setSubmitting(false);
  }
};

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>
                รายงาน{reportType === "user" ? "ผู้ใช้" : "ร้านค้า"}
              </Text>
              <Text style={styles.headerSubtitle}>{reportedName}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} disabled={submitting}>
              <Ionicons name="close" size={28} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* เลือกเหตุผล */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>เหตุผลในการรายงาน *</Text>
              <View style={styles.reasonsContainer}>
                {REPORT_REASONS.map((reason) => (
                  <TouchableOpacity
                    key={reason.value}
                    style={[
                      styles.reasonButton,
                      selectedReason === reason.value &&
                        styles.reasonButtonActive,
                    ]}
                    onPress={() => setSelectedReason(reason.value)}
                    disabled={submitting}
                  >
                    <Ionicons
                      name={reason.icon as any}
                      size={20}
                      color={
                        selectedReason === reason.value ? "#ef4444" : "#6b7280"
                      }
                    />
                    <Text
                      style={[
                        styles.reasonText,
                        selectedReason === reason.value &&
                          styles.reasonTextActive,
                      ]}
                    >
                      {reason.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* รายละเอียด */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                รายละเอียด * (อย่างน้อย 10 ตัวอักษร)
              </Text>
              <TextInput
                style={styles.textArea}
                placeholder="กรุณาระบุรายละเอียดเพิ่มเติม..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={6}
                maxLength={1000}
                editable={!submitting}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{description.length}/1000</Text>
            </View>

            {/* อัปโหลดรูป */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                รูปภาพหลักฐาน (สูงสุด 5 รูป)
              </Text>

              {/* รูปที่อัปโหลดแล้ว */}
              {imageUrls.length > 0 && (
                <View style={styles.imagesGrid}>
                  {imageUrls.map((url, index) => (
                    <View key={index} style={styles.imageContainer}>
                      <Image source={{ uri: url }} style={styles.image} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => handleRemoveImage(index)}
                        disabled={submitting}
                      >
                        <Ionicons
                          name="close-circle"
                          size={24}
                          color="#ef4444"
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* ปุ่มเพิ่มรูป */}
              {imageUrls.length < 5 && (
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handlePickImage}
                  disabled={uploading || submitting}
                >
                  {uploading ? (
                    <>
                      <ActivityIndicator size="small" color="#3b82f6" />
                      <Text style={styles.uploadButtonText}>
                        กำลังอัปโหลด...
                      </Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="camera" size={24} color="#3b82f6" />
                      <Text style={styles.uploadButtonText}>เพิ่มรูปภาพ</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* คำเตือน */}
            <View style={styles.warningBox}>
              <Ionicons name="information-circle" size={20} color="#f59e0b" />
              <Text style={styles.warningText}>
                การรายงานเท็จอาจส่งผลต่อบัญชีของคุณ กรุณาให้ข้อมูลที่ถูกต้อง
              </Text>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>ยกเลิก</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                submitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="flag" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>ส่งรายงาน</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  content: {
    maxHeight: "70%",
  },
  section: {
    padding: 20,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  reasonsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reasonButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    gap: 8,
  },
  reasonButtonActive: {
    backgroundColor: "#fee2e2",
    borderColor: "#ef4444",
  },
  reasonText: {
    fontSize: 14,
    color: "#6b7280",
  },
  reasonTextActive: {
    color: "#ef4444",
    fontWeight: "600",
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 120,
    backgroundColor: "#fff",
  },
  charCount: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "right",
  },
  imagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  imageContainer: {
    position: "relative",
    width: 100,
    height: 100,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#3b82f6",
    borderStyle: "dashed",
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 15,
    color: "#3b82f6",
    fontWeight: "600",
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    margin: 20,
    marginTop: 0,
    padding: 12,
    backgroundColor: "#fef3c7",
    borderRadius: 8,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: "#92400e",
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
  },
  submitButton: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
