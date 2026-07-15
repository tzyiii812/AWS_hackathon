import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter } from 'expo-router';
import { usePortfolio } from '@/context/PortfolioContext';
import { usePortfolioPnL } from '@/hooks/usePortfolioPnL';

/**
 * 公式（與 Home、Holdings 完全一致，由 usePortfolioPnL hook 統一計算）：
 *   目前市值     = 持有股數 × 目前價格（市場資料）
 *   總成本       = 持有股數 × 平均成本
 *   未實現損益   = 目前市值 - 總成本
 *   未實現報酬率 = 未實現損益 ÷ 總成本 × 100%
 */

export default function InsightsScreen() {
  const router = useRouter();
  const { latest } = usePortfolio();
  const pnl = usePortfolioPnL();

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
              {pnl.totalMarketValue > 0
                ? `NT$${pnl.totalMarketValue.toLocaleString('zh-TW')}`
                : '—'}
            </Text>
            <Text
              style={
                (pnl.unrealizedPnL ?? 0) >= 0
                  ? styles.positiveText
                  : styles.negativeText
              }
            >
              {pnl.unrealizedPnL != null
                ? `${pnl.unrealizedPnL >= 0 ? '+' : ''}NT$${Math.abs(pnl.unrealizedPnL).toLocaleString('zh-TW')} 未實現損益`
                : '未實現損益 —'}
              {pnl.returnRate != null
                ? ` (${pnl.returnRate >= 0 ? '+' : ''}${pnl.returnRate.toFixed(2)}%)`
                : ''}
            </Text>
            <Text style={styles.snapshotMeta}>
              {latest.holdings.length} 檔・{latest.broker || '券商未辨識'}・{latest.yearMonth}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>我的持股（{pnl.holdings.length} 檔）</Text>

            {pnl.holdings.map((stock, index) => (
                <View
                  key={`${stock.symbol}-${index}`}
                  style={
                    index === pnl.holdings.length - 1
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
                      {stock.hasPriceData
                        ? `NT$${stock.marketValue.toLocaleString('zh-TW')}`
                        : '價格未知'}
                    </Text>
                    {stock.unrealizedPnL != null ? (
                      <Text style={stock.unrealizedPnL >= 0 ? styles.holdingGain : styles.holdingLoss}>
                        {stock.unrealizedPnL >= 0 ? '+' : ''}NT${Math.abs(stock.unrealizedPnL).toLocaleString('zh-TW')}
                      </Text>
                    ) : (
                      <Text style={styles.holdingNoData}>損益 —</Text>
                    )}
                  </View>
                </View>
            ))}
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
  holdingNoData: { fontSize: 13, color: '#BBBBBB', marginTop: 2 },
  bottomPadding: { height: 40, backgroundColor: 'transparent' },
});
