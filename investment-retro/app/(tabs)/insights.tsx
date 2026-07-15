import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter } from 'expo-router';
import { usePortfolio } from '@/context/PortfolioContext';
import { usePortfolioPnL } from '@/hooks/usePortfolioPnL';
import { usePortfolioHealth, type Grade } from '@/hooks/usePortfolioHealth';

/**
 * 公式（與 Home、Holdings 完全一致，由 usePortfolioPnL hook 統一計算）：
 *   目前市值     = 持有股數 × 目前價格（市場資料）
 *   總成本       = 持有股數 × 平均成本
 *   未實現損益   = 目前市值 - 總成本
 *   未實現報酬率 = 未實現損益 ÷ 總成本 × 100%
 */

function gradeColor(grade: Grade) {
  if (grade.startsWith('A')) return { backgroundColor: '#E8F5E2' };
  if (grade.startsWith('B')) return { backgroundColor: '#FFF8E1' };
  return { backgroundColor: '#FFEBEE' };
}

function gradeBarColor(grade: Grade) {
  if (grade.startsWith('A')) return { backgroundColor: '#86A874' };
  if (grade.startsWith('B')) return { backgroundColor: '#D4A843' };
  return { backgroundColor: '#D68E8E' };
}

export default function InsightsScreen() {
  const router = useRouter();
  const { latest } = usePortfolio();
  const pnl = usePortfolioPnL();
  const health = usePortfolioHealth();
  const [search, setSearch] = useState('');

  const filteredHoldings = useMemo(() => {
    if (!search.trim()) return pnl.holdings;
    const q = search.trim().toLowerCase();
    return pnl.holdings.filter(
      (h) =>
        h.symbol.toLowerCase().includes(q) ||
        h.name.toLowerCase().includes(q)
    );
  }, [pnl.holdings, search]);

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

          {health.loading ? (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Portfolio Health</Text>
              <View style={styles.healthLoading}>
                <ActivityIndicator size="small" color="#86A874" />
                <Text style={styles.healthLoadingText}>分析中…</Text>
              </View>
            </View>
          ) : health.ready ? (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Portfolio Health</Text>
              <View style={styles.healthScoreRow}>
                <Text style={styles.healthScore}>{health.totalScore}</Text>
                <Text style={styles.healthScoreMax}> / 100</Text>
                <View style={[styles.healthGradeBadge, gradeColor(health.totalGrade)]}>
                  <Text style={styles.healthGradeText}>{health.totalGrade}</Text>
                </View>
              </View>

              <View style={styles.healthBar}>
                <View style={[styles.healthBarFill, { width: `${health.totalScore}%` }, gradeBarColor(health.totalGrade)]} />
              </View>

              <View style={styles.healthDimensions}>
                {Object.values(health.dimensions).map((dim) => (
                  <TouchableOpacity
                    key={dim.labelEn}
                    style={styles.healthDimRow}
                    activeOpacity={0.6}
                    onPress={() =>
                      router.push({
                        pathname: '/ask-ai',
                        params: { question: `分析我的投資組合「${dim.label}」，目前得分 ${dim.score} 分（${dim.grade}），狀況是「${dim.description}」。請給我具體的改善建議。` },
                      })
                    }
                  >
                    <View style={styles.healthDimLeft}>
                      <Text style={styles.healthDimLabel}>{dim.label}</Text>
                      <Text style={styles.healthDimDesc}>{dim.description}</Text>
                    </View>
                    <View style={styles.healthDimRight}>
                      <View style={[styles.healthDimBadge, gradeColor(dim.grade)]}>
                        <Text style={styles.healthDimGrade}>{dim.grade}</Text>
                      </View>
                      <Text style={styles.healthDimArrow}>›</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardLabel}>我的持股（{pnl.holdings.length} 檔）</Text>

            <TextInput
              style={styles.searchInput}
              placeholder="搜尋股票代號或名稱..."
              placeholderTextColor="#CCCCCC"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {filteredHoldings.length === 0 ? (
              <Text style={styles.noResult}>找不到符合的股票</Text>
            ) : (
              filteredHoldings.map((stock, index) => (
                <TouchableOpacity
                  key={`${stock.symbol}-${index}`}
                  style={[
                    styles.stockCard,
                    index === filteredHoldings.length - 1 && styles.stockCardLast,
                  ]}
                  activeOpacity={0.6}
                  onPress={() =>
                    router.push({
                      pathname: '/stock-detail',
                      params: { symbol: stock.symbol },
                    })
                  }
                >
                  <View style={styles.stockTop}>
                    <View style={styles.stockLeft}>
                      <Text style={styles.stockName}>{stock.name || stock.symbol}</Text>
                      <Text style={styles.stockCode}>{stock.symbol}</Text>
                    </View>
                    <View style={styles.stockRight}>
                      <Text style={styles.stockValue}>
                        {stock.hasPriceData
                          ? `NT$${stock.marketValue.toLocaleString('zh-TW')}`
                          : '—'}
                      </Text>
                      {stock.unrealizedPnL != null ? (
                        <Text
                          style={
                            stock.unrealizedPnL >= 0
                              ? styles.holdingGain
                              : styles.holdingLoss
                          }
                        >
                          {stock.unrealizedPnL >= 0 ? '+' : ''}
                          {stock.returnRate != null
                            ? `${stock.returnRate.toFixed(2)}%`
                            : `NT$${Math.abs(stock.unrealizedPnL).toLocaleString('zh-TW')}`}
                        </Text>
                      ) : (
                        <Text style={styles.holdingNoData}>—</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.stockMeta}>
                    <Text style={styles.stockMetaText}>
                      {stock.shares.toLocaleString('zh-TW')} 股
                    </Text>
                    <Text style={styles.stockMetaDot}>・</Text>
                    <Text style={styles.stockMetaText}>
                      均價 {stock.avgCost != null ? `NT$${stock.avgCost.toLocaleString('zh-TW')}` : '—'}
                    </Text>
                    <Text style={styles.stockMetaDot}>・</Text>
                    <Text style={styles.stockMetaText}>
                      占比 {stock.weight.toFixed(1)}%
                    </Text>
                    <Text style={styles.stockArrow}>›</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
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
  holdingGain: { fontSize: 13, color: '#86A874', fontWeight: '500', marginTop: 2 },
  holdingLoss: { fontSize: 13, color: '#D68E8E', fontWeight: '500', marginTop: 2 },
  holdingNoData: { fontSize: 13, color: '#BBBBBB', marginTop: 2 },
  bottomPadding: { height: 40, backgroundColor: 'transparent' },
  searchInput: {
    backgroundColor: '#F4F1ED',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#222222',
    marginBottom: 16,
  },
  noResult: {
    fontSize: 14,
    color: '#AAAAAA',
    textAlign: 'center',
    paddingVertical: 20,
  },
  stockCard: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F1ED',
    backgroundColor: 'transparent',
  },
  stockCardLast: {
    borderBottomWidth: 0,
  },
  stockTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
  },
  stockLeft: { backgroundColor: 'transparent' },
  stockRight: { alignItems: 'flex-end', backgroundColor: 'transparent' },
  stockName: { fontSize: 16, fontWeight: '500', color: '#222222' },
  stockCode: { fontSize: 12, color: '#BBBBBB', marginTop: 2 },
  stockValue: { fontSize: 16, fontWeight: '500', color: '#222222' },
  stockMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  stockMetaText: { fontSize: 12, color: '#999999' },
  stockMetaDot: { fontSize: 12, color: '#DDDDDD', marginHorizontal: 4 },
  stockArrow: {
    fontSize: 16,
    color: '#CCCCCC',
    marginLeft: 'auto',
  },
  healthLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  healthLoadingText: { fontSize: 14, color: '#888888' },
  healthScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  healthScore: { fontSize: 42, fontWeight: '700', color: '#222222' },
  healthScoreMax: { fontSize: 18, color: '#AAAAAA', fontWeight: '400' },
  healthGradeBadge: {
    marginLeft: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  healthGradeText: { fontSize: 14, fontWeight: '700', color: '#333333' },
  healthBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F0EDE8',
    marginBottom: 20,
    overflow: 'hidden',
  },
  healthBarFill: {
    height: 6,
    borderRadius: 3,
  },
  healthDimensions: {
    gap: 12,
    backgroundColor: 'transparent',
  },
  healthDimRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  healthDimLeft: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  healthDimRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  healthDimLabel: { fontSize: 15, fontWeight: '500', color: '#333333' },
  healthDimDesc: { fontSize: 12, color: '#999999', marginTop: 3 },
  healthDimBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  healthDimGrade: { fontSize: 13, fontWeight: '600', color: '#333333' },
  healthDimArrow: { fontSize: 18, color: '#CCCCCC', fontWeight: '300' },
});
