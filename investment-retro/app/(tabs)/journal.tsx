import { useMemo } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter } from 'expo-router';
import { usePortfolioHistory } from '@/context/PortfolioHistoryContext';

const MONTH_LABELS: Record<string, string> = {
  '01': 'January',
  '02': 'February',
  '03': 'March',
  '04': 'April',
  '05': 'May',
  '06': 'June',
  '07': 'July',
  '08': 'August',
  '09': 'September',
  '10': 'October',
  '11': 'November',
  '12': 'December',
};

function getMoodEmoji(pnl: number): string {
  if (pnl >= 20000) return '🚀';
  if (pnl >= 10000) return '🎉';
  if (pnl >= 0) return '😊';
  if (pnl >= -10000) return '😐';
  return '😰';
}

export default function JournalScreen() {
  const router = useRouter();
  const { portfolios, loading, refresh } = usePortfolioHistory();

  const journals = useMemo(() => {
    return portfolios.map((snapshot) => {
      const [, month] = snapshot.yearMonth.split('-');
      const monthLabel = MONTH_LABELS[month] || snapshot.yearMonth;
      const change = snapshot.totalPnL >= 0
        ? `+NT$${snapshot.totalPnL.toLocaleString('zh-TW')}`
        : `-NT$${Math.abs(snapshot.totalPnL).toLocaleString('zh-TW')}`;

      return {
        yearMonth: snapshot.yearMonth,
        monthLabel,
        title: `${monthLabel} 投資紀錄`,
        summary: `持有 ${snapshot.holdings.length} 檔股票，總市值 NT$${snapshot.totalMarketValue.toLocaleString('zh-TW')}。`,
        change,
        holdingCount: `${snapshot.holdings.length} 檔`,
        mood: getMoodEmoji(snapshot.totalPnL),
      };
    });
  }, [portfolios]);

  if (loading && portfolios.length === 0) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color="#222222" />
        <Text style={styles.stateText}>正在讀取月誌…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Journal</Text>
        <Text style={styles.subtitle}>我的投資日記</Text>
      </View>

      {journals.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📖</Text>
          <Text style={styles.emptyTitle}>還沒有月誌</Text>
          <Text style={styles.emptyText}>
            上傳券商持股截圖後，每一筆投資紀錄都會成為你的月誌。
          </Text>
        </View>
      ) : (
        journals.map((journal) => (
          <TouchableOpacity
            key={journal.yearMonth}
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: '/journal-detail',
                params: { yearMonth: journal.yearMonth },
              })
            }
            activeOpacity={0.8}
          >
            <View style={styles.cardTop}>
              <Text style={styles.month}>{journal.monthLabel}</Text>
              <Text style={styles.mood}>{journal.mood}</Text>
            </View>
            <Text style={styles.cardTitle}>{journal.title}</Text>
            <Text style={styles.cardSummary}>{journal.summary}</Text>
            <View style={styles.cardMeta}>
              <Text style={styles.metaText}>{journal.change}</Text>
              <Text style={styles.metaDot}>・</Text>
              <Text style={styles.metaText}>{journal.holdingCount}</Text>
            </View>
          </TouchableOpacity>
        ))
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F7',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: '#FAF9F7',
  },
  stateText: {
    fontSize: 15,
    color: '#888888',
    marginTop: 10,
  },
  header: {
    padding: 24,
    paddingBottom: 12,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#222222',
  },
  subtitle: {
    fontSize: 14,
    color: '#888888',
    marginTop: 4,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    padding: 28,
    borderRadius: 24,
    alignItems: 'center',
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 19, fontWeight: '600', color: '#222222' },
  emptyText: {
    fontSize: 14,
    color: '#888888',
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
  },
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
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  month: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B6C9A8',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  mood: {
    fontSize: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 8,
  },
  cardSummary: {
    fontSize: 15,
    color: '#555555',
    lineHeight: 22,
    marginBottom: 12,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  metaText: {
    fontSize: 13,
    color: '#888888',
  },
  metaDot: {
    fontSize: 13,
    color: '#CCCCCC',
    marginHorizontal: 4,
  },
  bottomPadding: {
    height: 40,
    backgroundColor: 'transparent',
  },
});
