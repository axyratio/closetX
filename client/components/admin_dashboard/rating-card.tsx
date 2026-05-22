// components/admin_dashboard/RatingCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RatingDistribution {
  rating: number;
  count: number;
  percentage: number;
}

interface RatingsOverview {
  average_rating: number;
  total_reviews: number;
  distribution: RatingDistribution[];
}

interface Props {
  data: RatingsOverview;
}

const StarRating = ({ rating, size = 16 }: { rating: number; size?: number }) => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(
        <Ionicons key={i} name="star" size={size} color="#FFB800" />
      );
    } else if (i === fullStars && hasHalfStar) {
      stars.push(
        <Ionicons key={i} name="star-half" size={size} color="#FFB800" />
      );
    } else {
      stars.push(
        <Ionicons key={i} name="star-outline" size={size} color="#E0E0E0" />
      );
    }
  }

  return <View style={{ flexDirection: 'row' }}>{stars}</View>;
};

export default function RatingCard({ data }: Props) {
  // เรียงจาก 5 ดาวไป 1 ดาว
  const sortedDistribution = [...data.distribution].sort((a, b) => b.rating - a.rating);

  return (
    <View style={styles.container}>
      {/* Average Rating */}
      <View style={styles.averageContainer}>
        <View style={styles.averageLeft}>
          <Text style={styles.averageNumber}>{data.average_rating.toFixed(1)}</Text>
          <StarRating rating={data.average_rating} size={20} />
          <Text style={styles.totalReviews}>
            จาก {data.total_reviews.toLocaleString()} รีวิว
          </Text>
        </View>
        <View style={styles.iconContainer}>
          <Ionicons name="star" size={48} color="#FFB800" />
        </View>
      </View>

      {/* Distribution */}
      <View style={styles.distributionContainer}>
        <Text style={styles.distributionTitle}>การกระจายของคะแนน</Text>
        {sortedDistribution.map((item, index) => {
          const maxCount = Math.max(...data.distribution.map(d => d.count), 1);
          const barWidth = (item.count / maxCount) * 100;

          return (
            <View key={index} style={styles.distributionRow}>
              <View style={styles.starsLabel}>
                <Text style={styles.starNumber}>{item.rating}</Text>
                <Ionicons name="star" size={14} color="#FFB800" />
              </View>
              
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    {
                      width: `${barWidth}%`,
                      backgroundColor: item.rating >= 4 ? '#34C759' : 
                                      item.rating >= 3 ? '#FFB800' : 
                                      item.rating >= 2 ? '#FF9500' : '#FF3B30'
                    }
                  ]}
                />
              </View>

              <View style={styles.countContainer}>
                <Text style={styles.count}>{item.count}</Text>
                <Text style={styles.percentage}>({item.percentage}%)</Text>
              </View>
            </View>
          );
        })}
      </View>

      {data.total_reviews === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>ยังไม่มีรีวิว</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8
  },
  averageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    marginBottom: 20
  },
  averageLeft: {
    flex: 1
  },
  averageNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFB800',
    marginBottom: 8
  },
  totalReviews: {
    fontSize: 13,
    color: '#666',
    marginTop: 8
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFB80020',
    justifyContent: 'center',
    alignItems: 'center'
  },
  distributionContainer: {
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    padding: 16
  },
  distributionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  starsLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 50
  },
  starNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 4
  },
  barContainer: {
    flex: 1,
    height: 20,
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    overflow: 'hidden',
    marginHorizontal: 12
  },
  bar: {
    height: '100%',
    borderRadius: 10,
    minWidth: 4
  },
  countContainer: {
    width: 80,
    alignItems: 'flex-end'
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
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8
  },
  emptyText: {
    fontSize: 14,
    color: '#999'
  }
});