import { StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter } from 'expo-router';
import { usePortfolio } from '@/context/PortfolioContext';

export default function InsightsScreen() {
  const router = useRouter();
  const { latest } = usePortfolio();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Insights</Text>
        <Text style={styles.subtitle}>投資組合分析</Text>
      </View>

      <TouchableOpacity
        style={styles.askAiCard}
        onPress={() => router.push('/ask-ai')}
        activeOpacity={0.8}
      >
        <Text style={styles.askAiIcon}>🤖</Text>
        <Text style={styles.askAiTitle}>Ask AI</Text>
        <Text style={styles.askAiSubtitle}>問我關於你的投資組合</Text>
      </TouchableOpacity>

      {!latest ? (
        <TouchableOpacity
          style={styles.emptyCard}
          onPress={() => router.push('/(tabs)/update')}
          activeOpacity={0.8}
        >
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyTitle}>先建立投資組合</Text>
          <Text style={styles.emptyText}>
            上傳券商截圖後，這裡會顯示持股與分析摘要。
          </Text>
          <Text style={styles.emptyAction}>開始更新 →</Text>
        </TouchableOpacity>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Portfolio Snapshot</Text>
            <Text style={styles.marketValue}>
              NT${latest.totalMarketValue.toLocaleString('zh-TW')}
            </Text>
            <Text
              style={latest.totalPnL >= 0 ? styles.positiveText : styles.negativeText}
            >
              {latest.totalPnL >= 0 ? '+' : '-'}NT$
              {Math.abs(latest.totalPnL).toLocaleString('zh-TW')} 總損益
            </Text>
            <Text style={styles.snapshotMeta}>
              {latest.holdings.length} 檔・{latest.broker || '券商未辨識'}・{latest.yearMonth}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>我的持股（{latest.holdings.length} 檔）</Text>

            {latest.holdings.map((stock, index) => {
              const marketValue = stock.marketValue ?? 0;
              const pnl = stock.pnl ?? 0;

              return (
                <View
                  key={`${stock.symbol}-${index}`}
                  style={
                    index === latest.holdings.length - 1
                      ? styles.holdingItemLast
                      : styles.holdingItem
                  }
                >
                  <View style={styles.holdingLeft}>
                    <Text style={styles.holdingSymbol}>{stock.name || stock.symbol}</Text>
                    <Text style={styles.holdingCode}>{stock.symbol}</Text>
                  </View>
                  <View style={styles.holdingRight}>
                    <Text style={styles.holdingValue}>
                      NT${marketValue.toLocaleString('zh-TW')}
                    </Text>
                    <Text style={pnl >= 0 ? styles.holdingGain : styles.holdingLoss}>
                      {pnl >= 0 ? '+' : '-'}NT${Math.abs(pnl).toLocaleString('zh-TW')}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

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
    backgroundColor: '#F4F1ED',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
  },
  askAiIcon: { fontSize: 32, marginBottom: 8 },
  askAiTitle: { fontSize: 18, fontWeight: '600', color: '#222222' },
  askAiSubtitle: { fontSize: 14, color: '#888888', marginTop: 4 },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardLabel: { fontSize: 13, color: '#888888', marginBottom: 12, letterSpacing: 0.5 },
  marketValue: { fontSize: 34, fontWeight: '600', color: '#222222' },
  positiveText: { fontSize: 15, color: '#86A874', marginTop: 6, fontWeight: '500' },
  negativeText: { fontSize: 15, color: '#D68E8E', marginTop: 6, fontWeight: '500' },
  snapshotMeta: { fontSize: 13, color: '#AAAAAA', marginTop: 12 },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    padding: 28,
    borderRadius: 24,
    alignItems: 'center',
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 19, fontWeight: '600', color: '#222222' },
  emptyText: { fontSize: 14, color: '#888888', lineHeight: 21, textAlign: 'center', marginTop: 8 },
  emptyAction: { fontSize: 14, color: '#86A874', fontWeight: '600', marginTop: 16 },
  holdingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F1ED',
    backgroundColor: 'transparent',
  },
  holdingItemLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: 'transparent',
  },
  holdingLeft: { backgroundColor: 'transparent' },
  holdingRight: { alignItems: 'flex-end', backgroundColor: 'transparent' },
  holdingSymbol: { fontSize: 16, fontWeight: '500', color: '#222222' },
  holdingCode: { fontSize: 13, color: '#BBBBBB', marginTop: 2 },
  holdingValue: { fontSize: 15, color: '#222222' },
  holdingGain: { fontSize: 13, color: '#86A874', fontWeight: '500', marginTop: 2 },
  holdingLoss: { fontSize: 13, color: '#D68E8E', fontWeight: '500', marginTop: 2 },
  bottomPadding: { height: 40, backgroundColor: 'transparent' },
});
