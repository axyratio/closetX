// components/admin_dashboard.tsx/dashboard-overview-card-enhanced.tsx
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface OverviewData {
  stores: {
    total: number;
    active: number;
    inactive: number;
  };
  products: {
    total: number;
    active: number;
    draft: number;
  };
  orders: {
    total: number;
    paid: number;
    unpaid: number;
  };
  users: {
    total: number;
    active: number;
    inactive: number;
  };
}

interface Props {
  data: OverviewData;
}

const DetailedCard = ({
  icon,
  label,
  total,
  primary,
  primaryLabel,
  secondary,
  secondaryLabel,
  color,
}: {
  icon: any;
  label: string;
  total: number;
  primary: number;
  primaryLabel: string;
  secondary: number;
  secondaryLabel: string;
  color: string;
}) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={[styles.iconContainer, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.headerInfo}>
        <Text style={styles.cardLabel}>{label}</Text>
        <Text style={styles.cardTotal}>{total.toLocaleString()}</Text>
      </View>
    </View>

    <View style={styles.cardDetails}>
      <View style={styles.detailRow}>
        <View style={styles.detailItem}>
          <Text style={[styles.detailValue, { color }]}>
            {primary.toLocaleString()}
          </Text>
          <Text style={styles.detailLabel}>{primaryLabel}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.detailItem}>
          <Text style={styles.detailValue}>{secondary.toLocaleString()}</Text>
          <Text style={styles.detailLabel}>{secondaryLabel}</Text>
        </View>
      </View>
    </View>
  </View>
);

export default function DashboardOverviewCardEnhanced({ data }: Props) {
  return (
    <View style={styles.container}>
      <DetailedCard
        icon="storefront"
        label="ร้านค้าทั้งหมด"
        total={data.stores.total}
        primary={data.stores.active}
        primaryLabel="เปิดอยู่"
        secondary={data.stores.inactive}
        secondaryLabel="ปิดแล้ว"
        color="#4CAF50"
      />

      <DetailedCard
        icon="cube"
        label="สินค้าทั้งหมด"
        total={data.products.total}
        primary={data.products.active}
        primaryLabel="กำลังขาย"
        secondary={data.products.draft}
        secondaryLabel="แบบร่าง"
        color="#2196F3"
      />

      <DetailedCard
        icon="cart"
        label="คำสั่งซื้อทั้งหมด"
        total={data.orders.total}
        primary={data.orders.paid}
        primaryLabel="ชำระแล้ว"
        secondary={data.orders.unpaid}
        secondaryLabel="รอชำระ"
        color="#FF9800"
      />

      <DetailedCard
        icon="people"
        label="ผู้ใช้งานทั้งหมด"
        total={data.users.total}
        primary={data.users.active}
        primaryLabel="Active"
        secondary={data.users.inactive}
        secondaryLabel="Inactive"
        color="#9C27B0"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFF",
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  card: {
    backgroundColor: "#FAFAFA",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  cardTotal: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  cardDetails: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    padding: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailItem: {
    flex: 1,
    alignItems: "center",
  },
  detailValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 11,
    color: "#999",
    textAlign: "center",
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 8,
  },
});
