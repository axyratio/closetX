// components/admin_dashboard/VTONUsageCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface VTONUsageData {
  total_usage: number;
  by_model: Array<{
    model: string;
    count: number;
  }>;
}

interface Props {
  data: VTONUsageData;
}

const COLORS = ['#007AFF', '#34C759', '#FF9500', '#AF52DE'];

export default function VTONUsageCard({ data }: Props) {
  return (
    <View style={styles.container}>
      {/* Total Usage */}
      <View style={styles.totalContainer}>
        <View style={styles.totalLeft}>
          <Ionicons name="shirt" size={32} color="#007AFF" />
          <View style={styles.totalInfo}>
            <Text style={styles.totalLabel}>การใช้งาน VTON ทั้งหมด</Text>
            <Text style={styles.totalValue}>{data.total_usage.toLocaleString()}</Text>
          </View>
        </View>
        <View style={styles.iconCircle}>
          <Ionicons name="trending-up" size={24} color="#34C759" />
        </View>
      </View>

      {/* By Model */}
      {data.by_model && data.by_model.length > 0 && (
        <View style={styles.modelContainer}>
          <Text style={styles.modelTitle}>แยกตาม Model</Text>
          {data.by_model.map((item, index) => {
            const percentage = data.total_usage > 0 
              ? ((item.count / data.total_usage) * 100).toFixed(1) 
              : 0;
            const color = COLORS[index % COLORS.length];

            return (
              <View key={index} style={styles.modelRow}>
                <View style={styles.modelLeft}>
                  <View style={[styles.modelDot, { backgroundColor: color }]} />
                  <Text style={styles.modelName} numberOfLines={1}>
                    {item.model || 'Unknown'}
                  </Text>
                </View>
                <View style={styles.modelRight}>
                  <Text style={styles.modelCount}>{item.count}</Text>
                  <Text style={styles.modelPercentage}>({percentage}%)</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {data.total_usage === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>ยังไม่มีการใช้งาน VTON</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 16
  },
  totalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  totalInfo: {
    marginLeft: 12,
    flex: 1
  },
  totalLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4
  },
  totalValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF'
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#34C75920',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modelContainer: {
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    padding: 16
  },
  modelTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12
  },
  modelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  modelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  modelDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10
  },
  modelName: {
    fontSize: 14,
    color: '#333',
    flex: 1
  },
  modelRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  modelCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 6
  },
  modelPercentage: {
    fontSize: 12,
    color: '#666'
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8
  },
  emptyText: {
    fontSize: 14,
    color: '#999'
  }
});