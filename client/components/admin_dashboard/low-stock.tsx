// components/admin_dashboard/LowStockCard.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LowStockItem {
  type: 'product' | 'variant';
  id: string;
  name: string;
  stock: number;
  store_name: string;
}

interface LowStockData {
  threshold: number;
  products: LowStockItem[];
  variants: LowStockItem[];
  total_count: number;
}

interface Props {
  data: LowStockData;
}

export default function LowStockCard({ data }: Props) {
  const [activeTab, setActiveTab] = useState<'products' | 'variants'>('products');
  
  if (!data || !data.products || !data.variants) {
    return null;
  }
  
  const allItems = [...data.products, ...data.variants];

  const getStockColor = (stock: number): string => {
    if (stock === 0) return '#FF3B30';
    if (stock <= 3) return '#FF9500';
    return '#FF9500';
  };

  const renderItem = (item: LowStockItem, index: number) => {
    const stockColor = getStockColor(item.stock);
    
    return (
      <View key={index} style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={styles.itemLeft}>
            <View style={[styles.stockBadge, { backgroundColor: stockColor + '20' }]}>
              <Ionicons name="cube" size={20} color={stockColor} />
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.storeName} numberOfLines={1}>
                {item.store_name}
              </Text>
            </View>
          </View>
          <View style={styles.stockContainer}>
            <Text style={[styles.stockNumber, { color: stockColor }]}>
              {item.stock}
            </Text>
            <Text style={styles.stockLabel}>เหลือ</Text>
          </View>
        </View>
        <View style={styles.itemFooter}>
          <View style={[styles.typeBadge, { 
            backgroundColor: item.type === 'product' ? '#007AFF20' : '#34C75920' 
          }]}>
            <Text style={[styles.typeText, {
              color: item.type === 'product' ? '#007AFF' : '#34C759'
            }]}>
              {item.type === 'product' ? 'สินค้าหลัก' : 'ตัวเลือก'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (data.total_count === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="checkmark-circle" size={48} color="#34C759" />
        <Text style={styles.emptyTitle}>สต็อกสินค้าเพียงพอ</Text>
        <Text style={styles.emptySubtitle}>
          ไม่มีสินค้าที่เหลือน้อยกว่า {data.threshold} ชิ้น
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryLeft}>
          <Ionicons name="alert-circle" size={24} color="#FF9500" />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>สินค้าที่ต้องเติมสต็อก</Text>
            <Text style={styles.summaryValue}>{data.total_count} รายการ</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'products' && styles.tabActive]}
          onPress={() => setActiveTab('products')}
        >
          <Text style={[styles.tabText, activeTab === 'products' && styles.tabTextActive]}>
            สินค้าหลัก ({data.products.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'variants' && styles.tabActive]}
          onPress={() => setActiveTab('variants')}
        >
          <Text style={[styles.tabText, activeTab === 'variants' && styles.tabTextActive]}>
            ตัวเลือก ({data.variants.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView style={styles.listContainer} nestedScrollEnabled>
        {activeTab === 'products' ? (
          data.products.length > 0 ? (
            data.products.map((item, index) => renderItem(item, index))
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>ไม่มีสินค้าหลักที่เหลือน้อย</Text>
            </View>
          )
        ) : (
          data.variants.length > 0 ? (
            data.variants.map((item, index) => renderItem(item, index))
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>ไม่มีตัวเลือกที่เหลือน้อย</Text>
            </View>
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    marginBottom: 16
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  summaryInfo: {
    marginLeft: 12
  },
  summaryLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF9500'
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6
  },
  tabActive: {
    backgroundColor: '#FFF'
  },
  tabText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500'
  },
  tabTextActive: {
    color: '#007AFF',
    fontWeight: '600'
  },
  listContainer: {
    maxHeight: 400
  },
  itemCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  itemLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 8
  },
  stockBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  itemInfo: {
    flex: 1
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  storeName: {
    fontSize: 12,
    color: '#666'
  },
  stockContainer: {
    alignItems: 'center'
  },
  stockNumber: {
    fontSize: 24,
    fontWeight: 'bold'
  },
  stockLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start'
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600'
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#F8F9FA',
    borderRadius: 10
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 4
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#666'
  },
  noDataContainer: {
    padding: 32,
    alignItems: 'center'
  },
  noDataText: {
    fontSize: 14,
    color: '#999'
  }
});