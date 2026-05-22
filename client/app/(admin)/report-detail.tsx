// app/(admin)/report-detail.tsx — รูปภาพ + ปุ่ม action ทั้งหมด
import {
  formatReportReason,
  formatReportStatus,
  getReportDetail,
  updateReportStatus,
} from "@/api/report";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SW, height: SH } = Dimensions.get("window");

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "#fef3c7", text: "#92400e" },
  reviewing: { bg: "#dbeafe", text: "#1e40af" },
  resolved: { bg: "#dcfce7", text: "#166534" },
  rejected: { bg: "#fee2e2", text: "#991b1b" },
};

export default function ReportDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { reportId } = useLocalSearchParams<{ reportId: string }>();

  const [report, setReport] = useState<any>(null);
  console.log("[admin report] setReport", report);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // image viewer
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  useEffect(() => {
    loadDetail();
  }, []);

  const loadDetail = async () => {
    try {
      const res = await getReportDetail(reportId, true);
      console.log("report-detail raw response:", JSON.stringify(res));

      if (res.success) {
        // backend อาจส่งใน res.data หรือ res.data.report
        const reportData = res.data?.report ?? res.data;
        console.log("=== reportData ===", JSON.stringify(reportData, null, 2));
        console.log("=== reported_id ===", reportData?.reported_id);
        console.log("=== ALL KEYS ===", Object.keys(reportData ?? {}));
        setReport(reportData);

        // parse image_urls — รองรับทุก format ที่เป็นไปได้
        const raw = reportData?.image_urls;
        let urls: string[] = [];
        if (Array.isArray(raw)) {
          urls = raw;
        } else if (typeof raw === "string" && raw.trim().startsWith("[")) {
          try {
            urls = JSON.parse(raw);
          } catch {}
        } else if (typeof raw === "string" && raw.trim() !== "") {
          // กรณีเป็น URL เดี่ยวๆ ไม่ใช่ JSON array
          urls = [raw];
        }
        console.log("parsed imageUrls:", urls);
        setImageUrls(urls);
      } else {
        Alert.alert("ข้อผิดพลาด", "ไม่พบข้อมูลรายงาน");
        router.back();
      }
    } catch (e) {
      console.error("loadDetail error:", e);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลได้");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleChangeStatus = (newStatus: string) => {
    const labels: Record<string, string> = {
      resolved: "ตรวจสอบแล้ว",
      rejected: "ปฏิเสธ",
    };
    Alert.alert(
      "ยืนยันการเปลี่ยนสถานะ",
      `เปลี่ยนเป็น "${labels[newStatus]}" ใช่หรือไม่?`,
      [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ยืนยัน",
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await updateReportStatus(reportId, newStatus);
              if (res.success) {
                Alert.alert("สำเร็จ", "เปลี่ยนสถานะเรียบร้อยแล้ว", [
                  { text: "ตกลง", onPress: () => router.back() },
                ]);
              } else {
                Alert.alert(
                  "ข้อผิดพลาด",
                  res.message || "ไม่สามารถเปลี่ยนสถานะได้",
                );
              }
            } catch {
              Alert.alert("ข้อผิดพลาด", "เกิดข้อผิดพลาด");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleViewTarget = () => {
    console.log("[admin report] store", report.store_id);
    console.log("[admin report] user ", report.user_id);
    if (!report) return;

    if (report.report_type === "user") {
      // user-detail รับ param: userId
      router.push({
        pathname: "/(admin)/user-detail",
        params: { userId: report.reported_user.user_id },
      } as any);
    } else {
      // store-detail รับ param: storeId
      router.push({
        pathname: "/(admin)/store-detail",
        params: { storeId: report.reported_store.store_id },
      } as any);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!report) return null;

  const statusColor = STATUS_COLORS[report.status] ?? {
    bg: "#f3f4f6",
    text: "#374151",
  };
  const canAction =
    report.status === "pending" || report.status === "reviewing";

  return (
    <View style={styles.container}>
      {/* safe area */}
      <View style={{ height: insets.top, backgroundColor: "#fff" }} />

      {/* header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>รายละเอียดรายงาน</Text>
        <View style={[styles.badge, { backgroundColor: statusColor.bg }]}>
          <Text style={[styles.badgeText, { color: statusColor.text }]}>
            {formatReportStatus(report.status)}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* ── ข้อมูลหลัก ── */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Ionicons
              name={
                report.report_type === "user"
                  ? "person-circle-outline"
                  : "storefront-outline"
              }
              size={20}
              color="#ef4444"
            />
            <Text style={styles.sectionTitle}>
              {report.report_type === "user" ? "รายงานผู้ใช้" : "รายงานร้านค้า"}
            </Text>
          </View>

          <Row label="ผู้ถูกรายงาน" value={report.reported_name} bold />
          <Row label="เหตุผล" value={formatReportReason(report.reason)} />
          <Row label="โดย" value={report.reporter_username} />
          {report.description && (
            <View style={styles.descBox}>
              <Text style={styles.descLabel}>รายละเอียด</Text>
              <Text style={styles.descText}>{report.description}</Text>
            </View>
          )}
          {report.admin_note && (
            <View style={[styles.descBox, { backgroundColor: "#eff6ff" }]}>
              <Text style={[styles.descLabel, { color: "#1e40af" }]}>
                หมายเหตุ Admin
              </Text>
              <Text style={[styles.descText, { color: "#1e40af" }]}>
                {report.admin_note}
              </Text>
            </View>
          )}
        </View>

        {/* ── รูปภาพหลักฐาน ── */}
        {imageUrls.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="images-outline" size={20} color="#6b7280" />
              <Text style={styles.sectionTitle}>
                รูปภาพหลักฐาน ({imageUrls.length})
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.thumbRow}>
                {imageUrls.map((url, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.thumbWrapper}
                    onPress={() => {
                      setViewerIndex(i);
                      setViewerVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: url }}
                      style={styles.thumb}
                      resizeMode="cover"
                    />
                    <View style={styles.thumbOverlay}>
                      <Ionicons name="eye-outline" size={20} color="#fff" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* ── ปุ่ม action ── */}
        {canAction && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ดำเนินการ</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: "#10b981" },
                  actionLoading && styles.btnDisabled,
                ]}
                onPress={() => handleChangeStatus("resolved")}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size={18} color="#fff" />
                ) : (
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color="#fff"
                  />
                )}
                <Text style={styles.actionBtnText}>ตรวจสอบแล้ว</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: "#ef4444" },
                  actionLoading && styles.btnDisabled,
                ]}
                onPress={() => handleChangeStatus("rejected")}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size={18} color="#fff" />
                ) : (
                  <Ionicons
                    name="close-circle-outline"
                    size={20}
                    color="#fff"
                  />
                )}
                <Text style={styles.actionBtnText}>ปฏิเสธ</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── ลิงก์ไปดู user/store ── */}
        <TouchableOpacity
          style={styles.viewTargetBtn}
          onPress={handleViewTarget}
        >
          <Ionicons
            name={
              report.report_type === "user"
                ? "person-outline"
                : "storefront-outline"
            }
            size={18}
            color="#3b82f6"
          />
          <Text style={styles.viewTargetText}>
            ดู{report.report_type === "user" ? "ผู้ใช้" : "ร้านค้า"}ที่ถูกรายงาน
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#3b82f6" />
        </TouchableOpacity>
      </ScrollView>

      {/* ── Image Viewer Modal ── */}
      <Modal
        visible={viewerVisible}
        transparent
        onRequestClose={() => setViewerVisible(false)}
      >
        <View style={styles.viewer}>
          {/* close */}
          <TouchableOpacity
            style={styles.viewerClose}
            onPress={() => setViewerVisible(false)}
          >
            <Ionicons name="close-circle" size={40} color="#fff" />
          </TouchableOpacity>

          {/* counter */}
          <View style={styles.viewerCounter}>
            <Text style={styles.viewerCounterText}>
              {viewerIndex + 1} / {imageUrls.length}
            </Text>
          </View>

          {/* main image */}
          <ScrollView
            maximumZoomScale={3}
            minimumZoomScale={1}
            centerContent
            contentContainerStyle={styles.viewerContent}
          >
            <Image
              source={{ uri: imageUrls[viewerIndex] }}
              style={{ width: SW, height: SH * 0.7 }}
              resizeMode="contain"
            />
          </ScrollView>

          {/* nav prev */}
          {viewerIndex > 0 && (
            <TouchableOpacity
              style={[styles.navBtn, { left: 16 }]}
              onPress={() => setViewerIndex((v) => v - 1)}
            >
              <Ionicons name="chevron-back" size={30} color="#fff" />
            </TouchableOpacity>
          )}

          {/* nav next */}
          {viewerIndex < imageUrls.length - 1 && (
            <TouchableOpacity
              style={[styles.navBtn, { right: 16 }]}
              onPress={() => setViewerIndex((v) => v + 1)}
            >
              <Ionicons name="chevron-forward" size={30} color="#fff" />
            </TouchableOpacity>
          )}

          {/* thumbnail strip */}
          {imageUrls.length > 1 && (
            <View style={styles.strip}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {imageUrls.map((url, i) => (
                  <TouchableOpacity key={i} onPress={() => setViewerIndex(i)}>
                    <Image
                      source={{ uri: url }}
                      style={[
                        styles.stripThumb,
                        i === viewerIndex && styles.stripThumbActive,
                      ]}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

// helper component
function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          bold && { fontWeight: "700", color: "#1f2937" },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    gap: 10,
  },
  backBtn: { padding: 2 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#1f2937", flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: "700" },

  scroll: { padding: 16, gap: 12 },

  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#374151" },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 4,
  },
  rowLabel: { fontSize: 14, color: "#9ca3af", width: 110 },
  rowValue: { fontSize: 14, color: "#4b5563", flex: 1, textAlign: "right" },

  descBox: { backgroundColor: "#f9fafb", borderRadius: 8, padding: 12, gap: 4 },
  descLabel: { fontSize: 12, fontWeight: "600", color: "#6b7280" },
  descText: { fontSize: 14, color: "#374151", lineHeight: 20 },

  thumbRow: { flexDirection: "row", gap: 10 },
  thumbWrapper: {
    width: 110,
    height: 110,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  thumb: { width: "100%", height: "100%" },
  thumbOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },

  actionRow: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 10,
    gap: 6,
  },
  actionBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  btnDisabled: { opacity: 0.6 },

  viewTargetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  viewTargetText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#3b82f6",
    flex: 1,
  },

  // Image Viewer
  viewer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.96)",
    justifyContent: "center",
    alignItems: "center",
  },
  viewerClose: { position: "absolute", top: 50, right: 20, zIndex: 10 },
  viewerCounter: {
    position: "absolute",
    top: 55,
    left: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 10,
  },
  viewerCounterText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  viewerContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  navBtn: {
    position: "absolute",
    top: "45%",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  strip: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  stripThumb: {
    width: 58,
    height: 58,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  stripThumbActive: { borderColor: "#3b82f6" },
});
