import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePortfolio } from '@/context/PortfolioContext';
import { usePortfolioPnL } from '@/hooks/usePortfolioPnL';

export default function StockDetailScreen() {
  const router = useRouter();
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const { latest } = usePortfolio();
  const pnl = usePortfolioPnL();

  const stock = pnl.holdings.find((h) => h.symbol === symbol);

  if (!stock) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>找不到股票 {symbol}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Calculate sector weight (same symbol sector holdings)
  const totalMV = pnl.totalMarketValue;
  const weightPct = stock.weight.toFixed(1);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.stockName}>{stock.name}</Text>
        <Text style={styles.stockCode}>{stock.symbol}</Text>
      </View>

      {/* Summary Card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>持股摘要</Text>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>持有股數</Text>
            <Text style={styles.summaryValue}>
              {stock.shares.toLocaleString('zh-TW')} 股
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>平均成本</Text>
            <Text style={styles.summaryValue}>
              {stock.avgCost != null
                ? `NT$${stock.avgCost.toLocaleString('zh-TW')}`
                : '—'}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>目前價格</Text>
            <Text style={styles.summaryValue}>
              {stock.currentPrice != null
                ? `NT$${stock.currentPrice.toFixed(2)}`
                : '—'}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>目前市值</Text>
            <Text style={styles.summaryValue}>
              {stock.hasPriceData
                ? `NT$${stock.marketValue.toLocaleString('zh-TW')}`
                : '—'}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>未實現損益</Text>
            <Text
              style={[
                styles.summaryValue,
                stock.unrealizedPnL != null && stock.unrealizedPnL >= 0
                  ? styles.positive
                  : styles.negative,
              ]}
            >
              {stock.unrealizedPnL != null
                ? `${stock.unrealizedPnL >= 0 ? '+' : ''}NT$${Math.abs(stock.unrealizedPnL).toLocaleString('zh-TW')}`
                : '—'}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>報酬率</Text>
            <Text
              style={[
                styles.summaryValue,
                stock.returnRate != null && stock.returnRate >= 0
                  ? styles.positive
                  : styles.negative,
              ]}
            >
              {stock.returnRate != null
                ? `${stock.returnRate >= 0 ? '+' : ''}${stock.returnRate.toFixed(2)}%`
                : '—'}
            </Text>
          </View>
        </View>
      </View>

      {/* Weight / Risk Card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>投資組合角色</Text>

        <View style={styles.riskRow}>
          <Text style={styles.riskLabel}>占比</Text>
          <Text style={styles.riskValue}>{weightPct}%</Text>
        </View>

        <View style={styles.weightBar}>
          <View
            style={[
              styles.weightBarFill,
              { width: `${Math.min(stock.weight, 100)}%` },
              stock.weight > 30
                ? styles.weightBarDanger
                : stock.weight > 20
                  ? styles.weightBarWarn
                  : styles.weightBarOk,
            ]}
          />
        </View>

        {stock.weight > 30 ? (
          <View style={styles.riskAlert}>
            <Text style={styles.riskAlertText}>
              ⚠️ {stock.name} 占你投資組合的 {weightPct}%，集中度偏高。若此股票出現較大波動，你的整體資產可能受到明顯影響。
            </Text>
          </View>
        ) : stock.weight > 20 ? (
          <View style={styles.riskNote}>
            <Text style={styles.riskNoteText}>
              💡 {stock.name} 是你目前占比較高的持股之一。建議定期檢視是否需要再平衡。
            </Text>
          </View>
        ) : (
          <View style={styles.riskNote}>
            <Text style={styles.riskNoteText}>
              ✅ {stock.name} 占比 {weightPct}%，在合理範圍內。
            </Text>
          </View>
        )}

        {stock.unrealizedPnL != null && (
          <View style={styles.riskRow}>
            <Text style={styles.riskLabel}>對組合損益影響</Text>
            <Text
              style={[
                styles.riskValue,
                stock.unrealizedPnL >= 0 ? styles.positive : styles.negative,
              ]}
            >
              {stock.unrealizedPnL >= 0 ? '+' : ''}NT$
              {Math.abs(stock.unrealizedPnL).toLocaleString('zh-TW')}
            </Text>
          </View>
        )}
      </View>

      {/* AI Analysis Button */}
      <TouchableOpacity
        style={styles.aiCard}
        activeOpacity={0.7}
        onPress={() =>
          router.push({
            pathname: '/ask-ai',
            params: {
              question: `分析「${stock.name}（${stock.symbol}）」在我的投資組合中扮演什麼角色。目前占比 ${weightPct}%，市值 NT$${stock.marketValue.toLocaleString('zh-TW')}，報酬率 ${stock.returnRate != null ? stock.returnRate.toFixed(2) + '%' : '未知'}。請分析這檔股票對我的投資組合的影響，以及潛在的風險和建議。`,
            },
          })
        }
      >
        <Text style={styles.aiIcon}>🤖</Text>
        <View style={styles.aiContent}>
          <Text style={styles.aiTitle}>AI 個股分析</Text>
          <Text style={styles.aiSubtitle}>
            這檔股票在我的投資組合裡扮演什麼角色？
          </Text>
        </View>
        <Text style={styles.aiArrow}>›</Text>
      </TouchableOpacity>

      {/* Quick Questions */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>更多問題</Text>
        {[
          `${stock.name}最近的法人動向如何？`,
          `${stock.name}的殖利率表現怎麼樣？`,
          `我應該加碼還是減碼${stock.name}？`,
        ].map((q, i) => (
          <TouchableOpacity
            key={i}
            style={styles.questionRow}
            activeOpacity={0.6}
            onPress={() =>
              router.push({ pathname: '/ask-ai', params: { question: q } })
            }
          >
            <Text style={styles.questionText}>{q}</Text>
            <Text style={styles.questionArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F7' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF9F7',
    padding: 24,
  },
  emptyText: { fontSize: 16, color: '#888888' },
  backBtn: {
    marginTop: 16,
    backgroundColor: '#222222',
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  header: {
    padding: 24,
    paddingBottom: 16,
    backgroundColor: 'transparent',
  },
  stockName: { fontSize: 28, fontWeight: '700', color: '#222222' },
  stockCode: { fontSize: 15, color: '#AAAAAA', marginTop: 4 },
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
  cardLabel: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    backgroundColor: 'transparent',
  },
  summaryItem: {
    width: '45%',
    backgroundColor: 'transparent',
  },
  summaryLabel: { fontSize: 12, color: '#AAAAAA', marginBottom: 4 },
  summaryValue: { fontSize: 17, fontWeight: '600', color: '#222222' },
  positive: { color: '#86A874' },
  negative: { color: '#D68E8E' },
  riskRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  riskLabel: { fontSize: 15, color: '#555555' },
  riskValue: { fontSize: 16, fontWeight: '600', color: '#222222' },
  weightBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F0EDE8',
    marginVertical: 12,
    overflow: 'hidden',
  },
  weightBarFill: { height: 8, borderRadius: 4 },
  weightBarOk: { backgroundColor: '#86A874' },
  weightBarWarn: { backgroundColor: '#D4A843' },
  weightBarDanger: { backgroundColor: '#D68E8E' },
  riskAlert: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  riskAlertText: { fontSize: 14, color: '#A95454', lineHeight: 21 },
  riskNote: {
    backgroundColor: '#F8F9F7',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  riskNoteText: { fontSize: 14, color: '#555555', lineHeight: 21 },
  aiCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  aiIcon: { fontSize: 28, marginRight: 14 },
  aiContent: { flex: 1 },
  aiTitle: { fontSize: 16, fontWeight: '600', color: '#222222' },
  aiSubtitle: { fontSize: 13, color: '#888888', marginTop: 3 },
  aiArrow: { fontSize: 22, color: '#CCCCCC' },
  questionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F1ED',
    backgroundColor: 'transparent',
  },
  questionText: { fontSize: 14, color: '#555555', flex: 1 },
  questionArrow: { fontSize: 18, color: '#CCCCCC', marginLeft: 8 },
  bottomPadding: { height: 40, backgroundColor: 'transparent' },
});
