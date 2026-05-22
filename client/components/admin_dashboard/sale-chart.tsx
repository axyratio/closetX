// components/admin_dashboard/SalesChart.tsx
import React from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';

interface SalesData {
  label: string;
  value: number;
}

interface Props {
  data: SalesData[];
  period: 'daily' | 'weekly' | 'monthly';
}

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 64;
const CHART_HEIGHT = 200;
const BAR_WIDTH = 30;

export default function SalesChart({ data, period }: Props) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>ไม่มีข้อมูลยอดขาย</Text>
      </View>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const scrollWidth = Math.max(CHART_WIDTH, data.length * (BAR_WIDTH + 12));

  return (
    <View style={styles.container}>
      {/* Total Sales */}
      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>ยอดขายรวม</Text>
        <Text style={styles.totalValue}>
          ฿{data.reduce((sum, d) => sum + d.value, 0).toLocaleString('th-TH', { 
            minimumFractionDigits: 2,
            maximumFractionDigits: 2 
          })}
        </Text>
      </View>

      {/* Chart */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.chartScroll}
      >
        <View style={[styles.chartContainer, { width: scrollWidth }]}>
          <View style={styles.chart}>
            {data.map((item, index) => {
              const barHeight = (item.value / maxValue) * (CHART_HEIGHT - 60);
              
              return (
                <View key={index} style={styles.barContainer}>
                  <Text style={styles.barValue}>
                    {item.value > 0 ? `฿${item.value.toLocaleString('th-TH', { 
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0 
                    })}` : ''}
                  </Text>
                  <View style={styles.barWrapper}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: barHeight,
                          backgroundColor: item.value > 0 ? '#007AFF' : '#E0E0E0'
                        }
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel}>{item.label}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
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
    paddingHorizontal: 4,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 16
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500'
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF'
  },
  chartScroll: {
    marginHorizontal: -16
  },
  chartContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_HEIGHT,
    paddingBottom: 30
  },
  barContainer: {
    alignItems: 'center',
    marginHorizontal: 6
  },
  barWrapper: {
    width: BAR_WIDTH,
    height: CHART_HEIGHT - 60,
    justifyContent: 'flex-end',
    alignItems: 'center'
  },
  bar: {
    width: BAR_WIDTH,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 2
  },
  barValue: {
    fontSize: 10,
    color: '#333',
    marginBottom: 4,
    fontWeight: '600'
  },
  barLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 8,
    textAlign: 'center'
  },
  emptyContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8
  },
  emptyText: {
    fontSize: 14,
    color: '#999'
  }
});