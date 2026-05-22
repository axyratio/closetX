// components/admin_dashboard/PaymentMethodChart.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PaymentMethodData {
  method: string;
  count: number;
  percentage: number;
}

interface Props {
  data: PaymentMethodData[];
}

const getMethodIcon = (method: string): any => {
  const methodLower = method.toLowerCase();
  if (methodLower.includes('card') || methodLower.includes('credit')) {
    return 'card';
  } else if (methodLower.includes('promptpay')) {
    return 'qr-code';
  } else if (methodLower.includes('bank')) {
    return 'business';
  }
  return 'wallet';
};

const COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#5856D6'];

export default function PaymentMethodChart({ data }: Props) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <View style={styles.container}>
      {/* Pie Chart Visualization */}
      <View style={styles.pieContainer}>
        {data.map((item, index) => {
          const color = COLORS[index % COLORS.length];
          return (
            <View key={index} style={styles.pieSegment}>
              <View style={[styles.pieColor, { backgroundColor: color }]} />
              <Text style={styles.piePercentage}>{item.percentage.toFixed(1)}%</Text>
            </View>
          );
        })}
      </View>

      {/* Method List */}
      <View style={styles.listContainer}>
        {data.map((item, index) => {
          const color = COLORS[index % COLORS.length];
          return (
            <View key={index} style={styles.methodRow}>
              <View style={styles.methodLeft}>
                <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
                  <Ionicons name={getMethodIcon(item.method)} size={20} color={color} />
                </View>
                <View style={styles.methodInfo}>
                  <Text style={styles.methodName}>{item.method}</Text>
                  <Text style={styles.methodCount}>{item.count} รายการ</Text>
                </View>
              </View>
              <View style={styles.percentageContainer}>
                <Text style={[styles.percentageText, { color }]}>
                  {item.percentage.toFixed(1)}%
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {data.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>ไม่มีข้อมูลการชำระเงิน</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8
  },
  pieContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    flexWrap: 'wrap'
  },
  pieSegment: {
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 8
  },
  pieColor: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8
  },
  piePercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333'
  },
  listContainer: {
    marginTop: 16
  },
  methodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 8
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  methodInfo: {
    flex: 1
  },
  methodName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2
  },
  methodCount: {
    fontSize: 12,
    color: '#666'
  },
  percentageContainer: {
    paddingHorizontal: 12
  },
  percentageText: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 14,
    color: '#999'
  }
});