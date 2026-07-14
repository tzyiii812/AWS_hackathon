import { StyleSheet, ScrollView } from 'react-native';
import { Text, View } from '@/components/Themed';

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Good Evening, 子珆 🌱</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎯 東京旅行</Text>
        <Text style={styles.progress}>73%</Text>
        <Text style={styles.cardText}>目前累積：NT$146,000</Text>
        <Text style={styles.cardText}>距離目標：NT$54,000</Text>
        <Text style={styles.aiText}>AI 預估：大約還需要 8～11 個月</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>💼 My Portfolio</Text>
        <Text style={styles.bigNumber}>NT$682,300</Text>
        <Text style={styles.cardText}>總成本：NT$610,000</Text>
        <Text style={styles.positive}>+NT$72,300 (+11.85%)</Text>
        <Text style={styles.cardText}>持有 6 檔股票</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📝 最近月誌</Text>
        <Text style={styles.cardSubtitle}>July Review</Text>
        <Text style={styles.cardText}>
          這個月沒有進行太多交易，但仍然維持原本的投入計畫。
        </Text>
        <Text style={styles.cardText}>資產變化：+NT$18,200</Text>
        <Text style={styles.cardText}>東京旅行：68% → 73%</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 20,
    paddingTop: 16,
    backgroundColor: '#F9FAFB',
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  cardText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  progress: {
    fontSize: 36,
    fontWeight: '700',
    color: '#2563EB',
    marginVertical: 4,
  },
  bigNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginVertical: 4,
  },
  positive: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    marginTop: 4,
  },
  aiText: {
    fontSize: 13,
    color: '#2563EB',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
