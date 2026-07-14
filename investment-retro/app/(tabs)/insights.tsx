import { StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter } from 'expo-router';
import { HOLDINGS, PORTFOLIO_SUMMARY } from '@/data/portfolio';

export default function InsightsScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Insights</Text>
        <Text style={styles.subtitle}>投資組合分析</Text>
      </View>

      {/* Ask AI */}
      <TouchableOpacity
        style={styles.askAiCard}
        onPress={() => router.push('/ask-ai')}
        activeOpacity={0.8}
      >
        <Text style={styles.askAiIcon}>🤖</Text>
        <Text style={styles.askAiTitle}>Ask AI</Text>
        <Text style={styles.askAiSubtitle}>問我關於你的投資組合</Text>
      </TouchableOpacity>

      {/* Portfolio Health */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Portfolio Health</Text>
        <Text style={styles.healthScore}>78</Text>
        <Text style={styles.healthMax}>/ 100</Text>

        <View style={styles.gradeRow}>
          <Text style={styles.gradeLabel}>集中度</Text>
          <Text style={styles.gradeValue}>B</Text>
        </View>
        <View style={styles.gradeRow}>
          <Text style={styles.gradeLabel}>分散程度</Text>
          <Text style={styles.gradeValue}>B+</Text>
        </View>
        <View style={styles.gradeRow}>
          <Text style={styles.gradeLabel}>目標一致性</Text>
          <Text style={styles.gradeValue}>A-</Text>
        </View>
        <View style={styles.gradeRowLast}>
          <Text style={styles.gradeLabel}>波動風險</Text>
          <Text style={styles.gradeValue}>B</Text>
        </View>
      </View>

      {/* Holdings */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>我的持股（{PORTFOLIO_SUMMARY.holdingCount} 檔）</Text>

        {HOLDINGS.map((stock, i) => (
          <View
            key={stock.symbol}
            style={i === HOLDINGS.length - 1 ? styles.holdingItemLast : styles.holdingItem}
          >
            <View style={styles.holdingLeft}>
              <Text style={styles.holdingSymbol}>{stock.name}</Text>
              <Text style={styles.holdingCode}>{stock.symbol}</Text>
            </View>
            <View style={styles.holdingRight}>
              <Text style={styles.holdingValue}>NT${stock.marketValue.toLocaleString()}</Text>
              <Text style={styles.holdingGain}>+{stock.pnlPercent}%</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F7' },
  header: { padding: 24, paddingBottom: 12, backgroundColor: 'transparent' },
  title: { fontSize: 28, fontWeight: '600', color: '#222222' },
  subtitle: { fontSize: 14, color: '#888888', marginTop: 4 },
  askAiCard: {
    backgroundColor: '#F4F1ED', marginHorizontal: 20, marginBottom: 16,
    padding: 24, borderRadius: 24, alignItems: 'center',
  },
  askAiIcon: { fontSize: 32, marginBottom: 8 },
  askAiTitle: { fontSize: 18, fontWeight: '600', color: '#222222' },
  askAiSubtitle: { fontSize: 14, color: '#888888', marginTop: 4 },
  card: {
    backgroundColor: '#FFFFFF', marginHorizontal: 20, marginBottom: 16,
    padding: 24, borderRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  cardLabel: { fontSize: 13, color: '#888888', marginBottom: 12, letterSpacing: 0.5 },
  healthScore: { fontSize: 48, fontWeight: '600', color: '#222222' },
  healthMax: { fontSize: 16, color: '#BBBBBB', marginBottom: 20 },
  gradeRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F4F1ED',
    backgroundColor: 'transparent',
  },
  gradeRowLast: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 12, backgroundColor: 'transparent',
  },
  gradeLabel: { fontSize: 15, color: '#555555' },
  gradeValue: { fontSize: 15, fontWeight: '600', color: '#222222' },
  holdingItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F4F1ED',
    backgroundColor: 'transparent',
  },
  holdingItemLast: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, backgroundColor: 'transparent',
  },
  holdingLeft: { backgroundColor: 'transparent' },
  holdingRight: { alignItems: 'flex-end', backgroundColor: 'transparent' },
  holdingSymbol: { fontSize: 16, fontWeight: '500', color: '#222222' },
  holdingCode: { fontSize: 13, color: '#BBBBBB', marginTop: 2 },
  holdingValue: { fontSize: 15, color: '#222222' },
  holdingGain: { fontSize: 14, color: '#B6C9A8', fontWeight: '500', marginTop: 2 },
  bottomPadding: { height: 40, backgroundColor: 'transparent' },
});
