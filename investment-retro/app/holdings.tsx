import React, { useMemo } from 'react';
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

export default function HoldingsScreen() {
  const router = useRouter();
  const { latest, loading, error, refreshLatest } = usePortfolio();

  const holdings = useMemo(() => {
    const total = latest?.totalMarketValue ?? 0;

    return (latest?.holdings ?? []).map((holding) => {
      const marketValue = holding.marketValue ?? 0;
      const price = holding.shares > 0 ? marketValue / holding.shares : 0;
      const pnl = holding.pnl ?? 0;
      const estimatedCost = marketValue - pnl;
      const pnlPercent = estimatedCost > 0 ? (pnl / estimatedCost) * 100 : 0;
      const weight = total > 0 ? (marketValue / total) * 100 : 0;

      return {
        ...holding,
        marketValue,
        price,
        pnl,
        pnlPercent,
        weight,
      };
    });
  }, [latest]);

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
        <RefreshControl refreshing={loading} onRefresh={refreshLatest} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>我的持股</Text>
        <Text style={styles.subtitle}>
          共 {holdings.length} 檔・更新於{' '}
          {new Date(latest.createdAt).toLocaleDateString('zh-TW')}
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>總市值</Text>
            <Text style={styles.summaryValue}>
              NT${latest.totalMarketValue.toLocaleString('zh-TW')}
            </Text>
          </View>
          <View style={styles.summaryItemRight}>
            <Text style={styles.summaryLabel}>總損益</Text>
            <Text
              style={
                latest.totalPnL >= 0 ? styles.summaryPositive : styles.summaryNegative
              }
            >
              {latest.totalPnL >= 0 ? '+' : '-'}NT$
              {Math.abs(latest.totalPnL).toLocaleString('zh-TW')}
            </Text>
          </View>
        </View>
        {latest.broker ? (
          <Text style={styles.brokerText}>{latest.broker}・{latest.currency}</Text>
        ) : null}
      </View>

      {holdings.map((stock, index) => {
        const positive = stock.pnl >= 0;

        return (
          <View key={`${stock.symbol}-${index}`} style={styles.stockCard}>
            <View style={styles.stockTop}>
              <View style={styles.stockLeft}>
                <Text style={styles.stockName}>{stock.name || stock.symbol}</Text>
                <Text style={styles.stockCode}>{stock.symbol}</Text>
              </View>
              <View style={styles.stockRight}>
                <Text style={styles.stockValue}>
                  NT${stock.marketValue.toLocaleString('zh-TW')}
                </Text>
                <Text style={positive ? styles.stockGain : styles.stockLoss}>
                  {positive ? '+' : ''}{stock.pnlPercent.toFixed(2)}%
                </Text>
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
                <Text style={styles.detailLabel}>成本</Text>
                <Text style={styles.detailValue}>
                  {stock.avgCost === null || stock.avgCost === undefined
                    ? '—'
                    : `NT$${stock.avgCost.toLocaleString('zh-TW')}`}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>估算現價</Text>
                <Text style={styles.detailValue}>
                  NT${stock.price.toFixed(2)}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>占比</Text>
                <Text style={styles.detailValue}>{stock.weight.toFixed(1)}%</Text>
              </View>
            </View>
          </View>
        );
      })}

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
  },
  summaryItem: { backgroundColor: 'transparent' },
  summaryItemRight: { backgroundColor: 'transparent', alignItems: 'flex-end' },
  summaryLabel: { fontSize: 13, color: '#888888', marginBottom: 4 },
  summaryValue: { fontSize: 22, fontWeight: '600', color: '#222222' },
  summaryPositive: { fontSize: 22, fontWeight: '600', color: '#86A874' },
  summaryNegative: { fontSize: 22, fontWeight: '600', color: '#D68E8E' },
  brokerText: { marginTop: 14, fontSize: 13, color: '#AAAAAA' },
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
  stockGain: { fontSize: 14, color: '#86A874', fontWeight: '500', marginTop: 2 },
  stockLoss: { fontSize: 14, color: '#D68E8E', fontWeight: '500', marginTop: 2 },
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
});
