// components/admin_dashboard.tsx/order-status-card-enhanced.tsx
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

interface OrderStatusData {
  status: string;
  status_th: string;
  count: number;
  percentage: number;
}

interface Props {
  data: {
    statuses: OrderStatusData[];
    total_orders: number;
    total_status_types: number;
  };
}

const getStatusInfo = (status: string): { icon: any; color: string } => {
  const statusMap: Record<string, { icon: any; color: string }> = {
    UNPAID: { icon: "time-outline", color: "#8E8E93" },
    PAID: { icon: "checkmark-circle", color: "#34C759" },
    PREPARING: { icon: "cube-outline", color: "#FF9500" },
    SHIPPED: { icon: "airplane", color: "#007AFF" },
    DELIVERED: { icon: "checkmark-done-circle", color: "#34C759" },
    COMPLETED: { icon: "trophy", color: "#AF52DE" },
    RETURNING: { icon: "return-up-back", color: "#FF9500" },
    RETURNED: { icon: "arrow-undo", color: "#FF3B30" },
    CANCELLED: { icon: "close-circle", color: "#8E8E93" },
    FAILED: { icon: "alert-circle", color: "#FF3B30" },
  };

  return statusMap[status] || { icon: "ellipse", color: "#8E8E93" };
};

export default function OrderStatusCardEnhanced({ data }: Props) {
  const { statuses, total_orders, total_status_types } = data;

  return (
    <View style={styles.container}>
      {/* Summary Header */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>คำสั่งซื้อทั้งหมด</Text>
          <Text style={styles.summaryValue}>
            {total_orders.toLocaleString()}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>สถานะที่ใช้งาน</Text>
          <Text style={styles.summaryValue}>{total_status_types}</Text>
        </View>
      </View>

      {/* Status List */}
      <ScrollView style={styles.listContainer} nestedScrollEnabled>
        {statuses.map((item, index) => {
          const { icon, color } = getStatusInfo(item.status);

          return (
            <View key={index} style={styles.statusRow}>
              <View style={styles.statusLeft}>
                <View
                  style={[styles.iconCircle, { backgroundColor: color + "20" }]}
                >
                  <Ionicons name={icon} size={20} color={color} />
                </View>
                <View style={styles.statusInfo}>
                  <Text style={styles.statusLabel}>{item.status_th}</Text>
                  <Text style={styles.statusCode}>({item.status})</Text>
                </View>
              </View>

              <View style={styles.statusRight}>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>
                    {item.count.toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.percentageText}>
                  {item.percentage.toFixed(1)}%
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {statuses.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={48} color="#CCC" />
          <Text style={styles.emptyText}>ยังไม่มีคำสั่งซื้อในระบบ</Text>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  summaryContainer: {
    flexDirection: "row",
    backgroundColor: "#F8F9FA",
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#007AFF",
  },
  summaryDivider: {
    width: 1,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 8,
  },
  listContainer: {
    maxHeight: 400,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  statusCode: {
    fontSize: 11,
    color: "#999",
  },
  statusRight: {
    alignItems: "flex-end",
  },
  countBadge: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 4,
  },
  countText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFF",
  },
  percentageText: {
    fontSize: 12,
    color: "#666",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 10,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    marginTop: 12,
  },
  noteContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  noteText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
    flex: 1,
  },
});
