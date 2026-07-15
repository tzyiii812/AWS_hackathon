import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Text, View } from '@/components/Themed';
import { usePortfolio } from '@/context/PortfolioContext';
import { usePortfolioHistory } from '@/context/PortfolioHistoryContext';
import { usePortfolioPnL } from '@/hooks/usePortfolioPnL';
import { useRealizedPnL } from '@/hooks/useRealizedPnL';
import { SellPricePrompt } from '@/components/SellPricePrompt';
import { APP_TODAY_ISO } from '@/config/appDate';

/**
 * 公式（由 usePortfolioPnL hook 統一計算）：
 *   目前市值     = 持有股數 × 目前價格（市場資料 price_valuation_latest.json）
 *   總成本       = 持有股數 × 平均成本
 *   未實現損益   = 目前市值 - 總成本
 *   報酬率       = 未實現損益 ÷ 總成本 × 100%
 *
 * 若 shares <= 0 或 avgCost 為 null → 該檔無法計算成本/損益，顯示 "—"
 * 若 totalCost = 0 → 不計算報酬率（避免除以零）
 */

export default function HoldingsScreen() {
  const router = useRouter();
  const { latest, loading, error, refreshLatest } = usePortfolio();
  const { refresh: refreshHistory } = usePortfolioHistory();
  const pnl = usePortfolioPnL();
  const realized = useRealizedPnL();

  const handleRefresh = useCallback(async () => {
    await Promise.all([refreshLatest(), refreshHistory()]);
    // portfolios 更新後 useRealizedPnL 的 useEffect 會自動重新讀取 sellPrices
    // 但為了確保即時性，也主動觸發 realized refresh
    realized.refresh();
  }, [refreshLatest, refreshHistory, realized.refresh]);

  if (loading && !latest) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color="#222222" />
        <Text style={styles.stateText}>正在讀取投資組合…</Text>
      </View>
    );
  }

  if (!latest) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyTitle}>還沒有投資組合</Text>
        <Text style={styles.stateText}>
          上傳一張券商持股截圖，AI 會幫你整理成持股資料。
        </Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/(tabs)/update')}
        >
          <Text style={styles.primaryButtonText}>開始更新</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>我的持股</Text>
        <Text style={styles.subtitle}>
          共 {pnl.holdings.length} 檔・更新於{' '}
          {APP_TODAY_ISO}
        </Text>
      </View>

      {/* 市場資料載入錯誤提示 */}
      {pnl.error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{pnl.error}</Text>
        </View>
      ) : null}

      {/* 部分持股找不到價格的警示 */}
      {!pnl.error && pnl.unmatchedSymbols.length > 0 ? (
        <View style={styles.warningBanner}>
          <Text style={styles.warningBannerText}>
            {pnl.unmatchedSymbols.length} 檔找不到市場價格（
            {pnl.unmatchedSymbols.slice(0, 3).join('、')}
            {pnl.unmatchedSymbols.length > 3 ? '…' : ''}），損益僅反映可查詢的部分。
          </Text>
        </View>
      ) : null}

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>總市值</Text>
            <Text style={styles.summaryValue}>
              {pnl.totalMarketValue > 0
                ? `NT$${pnl.totalMarketValue.toLocaleString('zh-TW')}`
                : '—'}
            </Text>
          </View>
          <View style={styles.summaryItemRight}>
            <Text style={styles.summaryLabel}>總成本</Text>
            <Text style={styles.summaryValue}>
              {pnl.totalCost > 0
                ? `NT$${pnl.totalCost.toLocaleString('zh-TW')}`
                : '—'}
            </Text>
          </View>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>未實現損益</Text>
            <Text
              style={
                pnl.unrealizedPnL != null && pnl.unrealizedPnL >= 0
                  ? styles.summaryPositive
                  : pnl.unrealizedPnL != null
                  ? styles.summaryNegative
                  : styles.summaryValue
              }
            >
              {pnl.unrealizedPnL != null
                ? `${pnl.unrealizedPnL >= 0 ? '+' : '-'}NT$${Math.abs(pnl.unrealizedPnL).toLocaleString('zh-TW')}`
                : '—'}
            </Text>
          </View>
          <View style={styles.summaryItemRight}>
            <Text style={styles.summaryLabel}>報酬率</Text>
            <Text
              style={
                pnl.returnRate != null && pnl.returnRate >= 0
                  ? styles.summaryPositive
                  : pnl.returnRate != null
                  ? styles.summaryNegative
                  : styles.summaryValue
              }
            >
              {pnl.returnRate != null
                ? `${pnl.returnRate >= 0 ? '+' : ''}${pnl.returnRate.toFixed(2)}%`
                : '—'}
            </Text>
          </View>
        </View>
        {latest.broker ? (
          <Text style={styles.brokerText}>{latest.broker}・{latest.currency}</Text>
        ) : null}
        {pnl.dataDate ? (
          <Text style={styles.dataDateText}>
            資料更新：{APP_TODAY_ISO}
          </Text>
        ) : null}
      </View>

      {/* Realized PnL Card */}
      {(realized.totalRealizedPnL !== null || realized.pendingTrades.length > 0) ? (
        <View style={styles.realizedCard}>
          <View style={styles.realizedHeader}>
            <Text style={styles.realizedTitle}>已實現損益</Text>
            <Text style={styles.realizedNote}>
              依歷史快照比對・{realized.confirmedCount} 筆已確認
              {realized.skippedCount > 0 ? `・${realized.skippedCount} 筆已跳過` : ''}
            </Text>
          </View>
          {realized.totalRealizedPnL !== null ? (
            <Text
              style={
                realized.totalRealizedPnL >= 0
                  ? styles.realizedPositive
                  : styles.realizedNegative
              }
            >
              {realized.totalRealizedPnL >= 0 ? '+' : '-'}NT$
              {Math.abs(realized.totalRealizedPnL).toLocaleString('zh-TW')}
            </Text>
          ) : (
            <Text style={styles.realizedPending}>尚未確認賣出價格</Text>
          )}
          {realized.pendingTrades.length > 0 ? (
            <Text style={styles.realizedWarning}>
              還有 {realized.pendingTrades.length} 筆賣出待確認價格
            </Text>
          ) : null}
          {realized.trades.length > 0 ? (
            <View style={styles.realizedTrades}>
              {realized.trades.slice(0, 5).map((trade, idx) => (
                <View key={`${trade.symbol}-${trade.yearMonth}-${idx}`} style={styles.tradeRow}>
                  <View style={styles.tradeLeft}>
                    <Text style={styles.tradeName}>
                      {trade.name}{trade.isFullSell ? '（清倉）' : ''}
                    </Text>
                    <Text style={styles.tradeDetail}>
                      {trade.yearMonth}・賣出 {trade.soldShares.toLocaleString('zh-TW')} 股・均價 NT${trade.sellPrice}
                    </Text>
                  </View>
                  <Text
                    style={
                      trade.realizedPnL >= 0
                        ? styles.tradeGain
                        : styles.tradeLoss
                    }
                  >
                    {trade.realizedPnL >= 0 ? '+' : '-'}NT$
                    {Math.abs(trade.realizedPnL).toLocaleString('zh-TW')}
                  </Text>
                </View>
              ))}
              {realized.trades.length > 5 ? (
                <Text style={styles.tradeMore}>
                  還有 {realized.trades.length - 5} 筆…
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* 賣出價格確認 Modal */}
      <SellPricePrompt
        pendingTrades={realized.pendingTrades}
        onComplete={realized.refresh}
      />

      {/* Per-stock cards */}
      {pnl.holdings.map((stock, index) => (
        <View key={`${stock.symbol}-${index}`} style={styles.stockCard}>
          <View style={styles.stockTop}>
            <View style={styles.stockLeft}>
              <Text style={styles.stockName}>{stock.name || stock.symbol}</Text>
              <Text style={styles.stockCode}>{stock.symbol}</Text>
            </View>
            <View style={styles.stockRight}>
              <Text style={styles.stockValue}>
                {stock.hasPriceData
                  ? `NT$${stock.marketValue.toLocaleString('zh-TW')}`
                  : '市值未辨識'}
              </Text>
              {stock.returnRate != null ? (
                <Text
                  style={stock.returnRate >= 0 ? styles.stockGain : styles.stockLoss}
                >
                  {stock.returnRate >= 0 ? '+' : ''}
                  {stock.returnRate.toFixed(2)}%
                </Text>
              ) : (
                <Text style={styles.stockNoData}>—</Text>
              )}
            </View>
          </View>
          <View style={styles.stockDetails}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>持有</Text>
              <Text style={styles.detailValue}>
                {stock.shares.toLocaleString('zh-TW')} 股
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>均價</Text>
              <Text style={styles.detailValue}>
                {stock.avgCost != null
                  ? `NT$${stock.avgCost.toLocaleString('zh-TW')}`
                  : '—'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>現價</Text>
              <Text style={styles.detailValue}>
                {stock.currentPrice != null && stock.currentPrice > 0
                  ? `NT$${stock.currentPrice.toFixed(2)}`
                  : '—'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>損益</Text>
              <Text style={styles.detailValue}>
                {stock.unrealizedPnL != null
                  ? `${stock.unrealizedPnL >= 0 ? '+' : '-'}NT$${Math.abs(stock.unrealizedPnL).toLocaleString('zh-TW')}`
                  : '—'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>占比</Text>
              <Text style={styles.detailValue}>{stock.weight.toFixed(1)}%</Text>
            </View>
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={styles.updateButton}
        onPress={() => router.push('/(tabs)/update')}
      >
        <Text style={styles.updateButtonText}>＋ 更新投資組合</Text>
      </TouchableOpacity>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F7' },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: '#FAF9F7',
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '600', color: '#222222' },
  stateText: {
    fontSize: 15,
    color: '#888888',
    marginTop: 10,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 340,
  },
  errorText: { color: '#A95454', fontSize: 14, marginTop: 12 },
  primaryButton: {
    marginTop: 24,
    backgroundColor: '#222222',
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 15,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  header: { padding: 24, paddingBottom: 12, backgroundColor: 'transparent' },
  title: { fontSize: 28, fontWeight: '600', color: '#222222' },
  subtitle: { fontSize: 14, color: '#888888', marginTop: 4 },
  summaryCard: {
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    marginBottom: 12,
  },
  summaryItem: { backgroundColor: 'transparent' },
  summaryItemRight: { backgroundColor: 'transparent', alignItems: 'flex-end' },
  summaryLabel: { fontSize: 13, color: '#888888', marginBottom: 4 },
  summaryValue: { fontSize: 22, fontWeight: '600', color: '#222222' },
  summaryPositive: { fontSize: 22, fontWeight: '600', color: '#D68E8E' },
  summaryNegative: { fontSize: 22, fontWeight: '600', color: '#86A874' },
  brokerText: { marginTop: 14, fontSize: 13, color: '#AAAAAA' },
  dataDateText: { marginTop: 6, fontSize: 12, color: '#BBBBBB' },
  errorBanner: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#FDF2F2',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F5DADA',
  },
  errorBannerText: { fontSize: 13, color: '#A95454', lineHeight: 18 },
  warningBanner: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#FFF8F0',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F5E6D3',
  },
  warningBannerText: { fontSize: 13, color: '#9A7B4F', lineHeight: 18 },
  stockCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  stockTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    backgroundColor: 'transparent',
  },
  stockLeft: { backgroundColor: 'transparent' },
  stockRight: { alignItems: 'flex-end', backgroundColor: 'transparent' },
  stockName: { fontSize: 17, fontWeight: '500', color: '#222222' },
  stockCode: { fontSize: 13, color: '#BBBBBB', marginTop: 2 },
  stockValue: { fontSize: 16, fontWeight: '500', color: '#222222' },
  stockGain: { fontSize: 14, color: '#D68E8E', fontWeight: '500', marginTop: 2 },
  stockLoss: { fontSize: 14, color: '#86A874', fontWeight: '500', marginTop: 2 },
  stockNoData: { fontSize: 14, color: '#BBBBBB', marginTop: 2 },
  stockDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F4F1ED',
  },
  detailItem: { alignItems: 'center', backgroundColor: 'transparent', flex: 1 },
  detailLabel: { fontSize: 11, color: '#BBBBBB', marginBottom: 4 },
  detailValue: { fontSize: 12, color: '#555555', fontWeight: '500' },
  updateButton: {
    marginHorizontal: 20,
    marginTop: 6,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#222222',
  },
  updateButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  bottomPadding: { height: 40, backgroundColor: 'transparent' },
  realizedCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  realizedHeader: { marginBottom: 10, backgroundColor: 'transparent' },
  realizedTitle: { fontSize: 15, fontWeight: '600', color: '#222222' },
  realizedNote: { fontSize: 12, color: '#AAAAAA', marginTop: 2 },
  realizedPositive: { fontSize: 20, fontWeight: '600', color: '#D68E8E' },
  realizedNegative: { fontSize: 20, fontWeight: '600', color: '#86A874' },
  realizedPending: { fontSize: 16, color: '#AAAAAA', marginTop: 4 },
  realizedWarning: { fontSize: 12, color: '#9A7B4F', marginTop: 6 },
  realizedTrades: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F4F1ED',
    backgroundColor: 'transparent',
  },
  tradeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  tradeLeft: { flex: 1, backgroundColor: 'transparent' },
  tradeName: { fontSize: 14, fontWeight: '500', color: '#333333' },
  tradeDetail: { fontSize: 12, color: '#AAAAAA', marginTop: 2 },
  tradeGain: { fontSize: 14, fontWeight: '500', color: '#D68E8E' },
  tradeLoss: { fontSize: 14, fontWeight: '500', color: '#86A874' },
  tradeNoData: { fontSize: 14, color: '#BBBBBB' },
  tradeMore: { fontSize: 12, color: '#AAAAAA', marginTop: 8, textAlign: 'center' },
});
