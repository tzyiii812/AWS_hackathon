import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useLocalSearchParams } from 'expo-router';
import { usePortfolioHistory } from '@/context/PortfolioHistoryContext';
import { PortfolioSnapshot } from '@/services/api';

const MONTH_LABELS: Record<string, string> = {
  '01': 'January 2026',
  '02': 'February 2026',
  '03': 'March 2026',
  '04': 'April 2026',
  '05': 'May 2026',
  '06': 'June 2026',
  '07': 'July 2026',
  '08': 'August 2026',
  '09': 'September 2026',
  '10': 'October 2026',
  '11': 'November 2026',
  '12': 'December 2026',
};

function getMonthLabel(yearMonth: string): string {
  const parts = yearMonth.split('-');
  const month = parts[1];
  const year = parts[0];
  const monthName = MONTH_LABELS[month]?.split(' ')[0] || month;
  return `${monthName} ${year}`;
}

function getMoodEmoji(pnl: number): string {
  if (pnl >= 20000) return '🚀';
  if (pnl >= 10000) return '🎉';
  if (pnl >= 0) return '😊';
  if (pnl >= -10000) return '😐';
  return '😰';
}

function computeHoldingChanges(
  current: PortfolioSnapshot,
  previous: PortfolioSnapshot | null
) {
  if (!previous) {
    return {
      increased: current.holdings.map((h) => ({
        symbol: h.symbol,
        name: h.name || h.symbol,
        from: 0,
        to: h.shares,
      })),
      decreased: [],
    };
  }

  const prevMap = new Map(previous.holdings.map((h) => [h.symbol, h.shares]));
  const increased: { symbol: string; name: string; from: number; to: number }[] = [];
  const decreased: { symbol: string; name: string; from: number; to: number }[] = [];

  for (const h of current.holdings) {
    const prevShares = prevMap.get(h.symbol) ?? 0;
    if (h.shares > prevShares) {
      increased.push({ symbol: h.symbol, name: h.name || h.symbol, from: prevShares, to: h.shares });
    } else if (h.shares < prevShares) {
      decreased.push({ symbol: h.symbol, name: h.name || h.symbol, from: prevShares, to: h.shares });
    }
  }

  // Stocks that were in previous but not in current (sold entirely)
  for (const h of previous.holdings) {
    if (!current.holdings.find((c) => c.symbol === h.symbol)) {
      decreased.push({ symbol: h.symbol, name: h.name || h.symbol, from: h.shares, to: 0 });
    }
  }

  return { increased, decreased };
}

export default function JournalDetailScreen() {
  const { yearMonth } = useLocalSearchParams<{ yearMonth: string }>();
  const { portfolios, loading } = usePortfolioHistory();

  const journalData = useMemo(() => {
    if (!yearMonth || portfolios.length === 0) return null;

    const currentIndex = portfolios.findIndex((p) => p.yearMonth === yearMonth);
    if (currentIndex === -1) return null;

    const current = portfolios[currentIndex];
    // Previous month is the next item in the array (sorted newest first)
    const previous = currentIndex < portfolios.length - 1 ? portfolios[currentIndex + 1] : null;

    const totalChange = current.totalPnL;
    const prevMarketValue = previous?.totalMarketValue ?? 0;
    const marketChange = prevMarketValue > 0
      ? current.totalMarketValue - prevMarketValue
      : current.totalMarketValue;

    const holdingChanges = computeHoldingChanges(current, previous);

    return {
      month: getMonthLabel(current.yearMonth),
      title: `${getMonthLabel(current.yearMonth).split(' ')[0]} 投資紀錄`,
      mood: getMoodEmoji(totalChange),
      summary: `本月持有 ${current.holdings.length} 檔股票，總市值 NT$${current.totalMarketValue.toLocaleString('zh-TW')}，總損益 ${totalChange >= 0 ? '+' : '-'}NT$${Math.abs(totalChange).toLocaleString('zh-TW')}。`,
      portfolioChange: {
        totalMarketValue: `NT$${current.totalMarketValue.toLocaleString('zh-TW')}`,
        totalPnL: `${totalChange >= 0 ? '+' : '-'}NT$${Math.abs(totalChange).toLocaleString('zh-TW')}`,
        marketChange: previous
          ? `${marketChange >= 0 ? '+' : '-'}NT$${Math.abs(marketChange).toLocaleString('zh-TW')}`
          : '—',
      },
      holdingChanges,
      holdings: current.holdings,
      broker: current.broker,
      currency: current.currency,
      note: current.note,
    };
  }, [yearMonth, portfolios]);

  if (loading && portfolios.length === 0) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color="#222222" />
      </View>
    );
  }

  if (!journalData) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.emptyTitle}>找不到這篇月誌</Text>
        <Text style={styles.emptyText}>可能尚未上傳這個月的投資組合資料。</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.monthLabel}>{journalData.month}</Text>
        <Text style={styles.title}>{journalData.title}</Text>
        <Text style={styles.mood}>{journalData.mood}</Text>
      </View>

      {/* Summary */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>本月摘要</Text>
        <Text style={styles.bodyText}>{journalData.summary}</Text>
      </View>

      {/* Portfolio Change */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>資產狀況</Text>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>總市值</Text>
          <Text style={styles.dataValue}>{journalData.portfolioChange.totalMarketValue}</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>總損益</Text>
          <Text style={journalData.holdings.length > 0 ? styles.dataGreen : styles.dataValue}>
            {journalData.portfolioChange.totalPnL}
          </Text>
        </View>
        <View style={styles.dataRowLast}>
          <Text style={styles.dataLabel}>較上月市值變化</Text>
          <Text style={styles.dataGreen}>{journalData.portfolioChange.marketChange}</Text>
        </View>
      </View>

      {/* Holding Changes */}
      {(journalData.holdingChanges.increased.length > 0 ||
        journalData.holdingChanges.decreased.length > 0) && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>持股變化</Text>
          {journalData.holdingChanges.increased.length > 0 && (
            <View style={styles.changeGroup}>
              <Text style={styles.changeLabel}>📈 增加</Text>
              {journalData.holdingChanges.increased.map((item, i) => (
                <Text key={i} style={styles.changeItem}>
                  {item.name}：{item.from.toLocaleString('zh-TW')} → {item.to.toLocaleString('zh-TW')} 股
                </Text>
              ))}
            </View>
          )}
          {journalData.holdingChanges.decreased.length > 0 && (
            <View style={styles.changeGroup}>
              <Text style={styles.changeLabelNeg}>📉 減少</Text>
              {journalData.holdingChanges.decreased.map((item, i) => (
                <Text key={i} style={styles.changeItem}>
                  {item.name}：{item.from.toLocaleString('zh-TW')} → {item.to.toLocaleString('zh-TW')} 股
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Current Holdings */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>持有股票（{journalData.holdings.length} 檔）</Text>
        {journalData.holdings.map((stock, index) => {
          const marketValue = stock.marketValue ?? 0;
          const pnl = stock.pnl ?? 0;

          return (
            <View
              key={`${stock.symbol}-${index}`}
              style={index === journalData.holdings.length - 1 ? styles.holdingItemLast : styles.holdingItem}
            >
              <View style={styles.holdingLeft}>
                <Text style={styles.holdingName}>{stock.name || stock.symbol}</Text>
                <Text style={styles.holdingCode}>{stock.symbol}・{stock.shares.toLocaleString('zh-TW')} 股</Text>
              </View>
              <View style={styles.holdingRight}>
                <Text style={styles.holdingValue}>NT${marketValue.toLocaleString('zh-TW')}</Text>
                <Text style={pnl >= 0 ? styles.holdingGain : styles.holdingLoss}>
                  {pnl >= 0 ? '+' : '-'}NT${Math.abs(pnl).toLocaleString('zh-TW')}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Note */}
      {journalData.note ? (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>我的筆記</Text>
          <Text style={styles.noteText}>{journalData.note}</Text>
        </View>
      ) : null}

      {/* Broker info */}
      {journalData.broker ? (
        <View style={styles.metaCard}>
          <Text style={styles.metaText}>
            {journalData.broker}・{journalData.currency}
          </Text>
        </View>
      ) : null}

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
  emptyTitle: { fontSize: 22, fontWeight: '600', color: '#222222' },
  emptyText: { fontSize: 15, color: '#888888', marginTop: 10, textAlign: 'center' },
  header: { padding: 24, paddingBottom: 16, backgroundColor: 'transparent' },
  monthLabel: { fontSize: 14, color: '#B6C9A8', fontWeight: '600', marginBottom: 4 },
  title: { fontSize: 26, fontWeight: '600', color: '#222222' },
  mood: { fontSize: 24, marginTop: 8 },
  card: {
    backgroundColor: '#FFFFFF', marginHorizontal: 20, marginBottom: 16,
    padding: 24, borderRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  cardLabel: { fontSize: 13, color: '#888888', marginBottom: 12, letterSpacing: 0.5 },
  bodyText: { fontSize: 15, color: '#555555', lineHeight: 24 },
  dataRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F4F1ED',
    backgroundColor: 'transparent',
  },
  dataRowLast: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, backgroundColor: 'transparent',
  },
  dataLabel: { fontSize: 15, color: '#555555' },
  dataValue: { fontSize: 15, fontWeight: '500', color: '#222222' },
  dataGreen: { fontSize: 15, fontWeight: '500', color: '#B6C9A8' },
  changeGroup: { marginBottom: 14, backgroundColor: 'transparent' },
  changeLabel: { fontSize: 14, fontWeight: '600', color: '#B6C9A8', marginBottom: 6 },
  changeLabelNeg: { fontSize: 14, fontWeight: '600', color: '#E8A8A8', marginBottom: 6 },
  changeItem: { fontSize: 15, color: '#555555', paddingVertical: 3, paddingLeft: 4 },
  holdingItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F4F1ED',
    backgroundColor: 'transparent',
  },
  holdingItemLast: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, backgroundColor: 'transparent',
  },
  holdingLeft: { backgroundColor: 'transparent', flex: 1 },
  holdingRight: { alignItems: 'flex-end', backgroundColor: 'transparent' },
  holdingName: { fontSize: 16, fontWeight: '500', color: '#222222' },
  holdingCode: { fontSize: 13, color: '#BBBBBB', marginTop: 2 },
  holdingValue: { fontSize: 15, color: '#222222' },
  holdingGain: { fontSize: 13, color: '#86A874', fontWeight: '500', marginTop: 2 },
  holdingLoss: { fontSize: 13, color: '#D68E8E', fontWeight: '500', marginTop: 2 },
  noteText: { fontSize: 15, color: '#555555', lineHeight: 24, fontStyle: 'italic' },
  metaCard: {
    marginHorizontal: 20, marginBottom: 16, padding: 16,
    backgroundColor: '#F4F1ED', borderRadius: 16, alignItems: 'center',
  },
  metaText: { fontSize: 13, color: '#AAAAAA' },
  bottomPadding: { height: 40, backgroundColor: 'transparent' },
});
