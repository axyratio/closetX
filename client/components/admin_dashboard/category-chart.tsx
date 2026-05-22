// components/admin_dashboard/CategoryChart.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface CategoryData {
  category: string;
  count: number;
}

interface Props {
  data: CategoryData[];
}

const COLORS = [
  '#007AFF',
  '#34C759',
  '#FF9500',
  '#FF3B30',
  '#5856D6',
  '#AF52DE',
  '#FF2D55',
  '#5AC8FA'
];

export default function CategoryChart({ data }: Props) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const maxCount = Math.max(...data.map(d => d.count));

  return (
    <View style={styles.container}>
      {data.map((item, index) => {
        const percentage = total > 0 ? (item.count / total) * 100 : 0;
        const barWidth = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
        const color = COLORS[index % COLORS.length];

        return (
          <View key={index} style={styles.row}>
            <View style={styles.labelContainer}>
              <View style={[styles.colorDot, { backgroundColor: color }]} />
              <Text style={styles.categoryLabel} numberOfLines={1}>
                {item.category}
              </Text>
            </View>
            
            <View style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  {
                    width: `${barWidth}%`,
                    backgroundColor: color
                  }
                ]}
              />
            </View>
            
            <View style={styles.valueContainer}>
              <Text style={styles.count}>{item.count}</Text>
              <Text style={styles.percentage}>({percentage.toFixed(1)}%)</Text>
            </View>
          </View>
        );
      })}

      {data.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>ไม่มีข้อมูลหมวดหมู่</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 120
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8
  },
  categoryLabel: {
    fontSize: 13,
    color: '#333',
    flex: 1,
    fontWeight: '500'
  },
  barContainer: {
    flex: 1,
    height: 24,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 12
  },
  bar: {
    height: '100%',
    borderRadius: 12,
    minWidth: 4
  },
  valueContainer: {
    alignItems: 'flex-end',
    width: 80
  },
  count: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333'
  },
  percentage: {
    fontSize: 11,
    color: '#666',
    marginTop: 2
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