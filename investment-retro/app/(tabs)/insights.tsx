import { StyleSheet, ScrollView } from 'react-native';
import { Text, View } from '@/components/Themed';

export default function InsightsScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Insights</Text>
        <Text style={styles.subtitle}>投資組合分析</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 Portfolio Health</Text>
        <Text style={styles.score}>78 / 100</Text>
        <View style={styles.row}>
          <Text style={styles.label}>集中度</Text>
          <Text style={styles.grade}>B</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>分散程度</Text>
          <Text style={styles.grade}>B+</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>目標一致性</Text>
          <Text style={styles.grade}>A-</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Holdings</Text>

        <View style={styles.holdingItem}>
          <Text style={styles.holdingSymbol}>2330 台積電</Text>
          <Text style={styles.holdingValue}>NT$168,000</Text>
          <Text style={styles.holdingPositive}>+18.31%</Text>
        </View>

        <View style={styles.holdingItem}>
          <Text style={styles.holdingSymbol}>0050 元大台灣50</Text>
          <Text style={styles.holdingValue}>NT$132,000</Text>
          <Text style={styles.holdingPositive}>+10.00%</Text>
        </View>

        <View style={styles.holdingItem}>
          <Text style={styles.holdingSymbol}>00919 群益台灣精選高息</Text>
          <Text style={styles.holdingValue}>NT$98,000</Text>
          <Text style={styles.holdingPositive}>+6.20%</Text>
        </View>
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
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
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
    marginBottom: 12,
  },
  score: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
  },
  grade: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  holdingItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: 'transparent',
  },
  holdingSymbol: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  holdingValue: {
    fontSize: 14,
    color: '#374151',
    marginTop: 2,
  },
  holdingPositive: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10B981',
    marginTop: 2,
  },
});
