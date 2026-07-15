import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { usePortfolioHistory } from '@/context/PortfolioHistoryContext';
import { JournalListItem, listJournals } from '@/services/api';
import { calculatePortfolioPnLAtMonth } from '@/services/marketData';

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan',
  '02': 'Feb',
  '03': 'Mar',
  '04': 'Apr',
  '05': 'May',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Aug',
  '09': 'Sep',
  '10': 'Oct',
  '11': 'Nov',
  '12': 'Dec',
};

type CoverCard = {
  month: string;
  monthLabel: string;
  year: string;
  totalMarketValue: number;
  totalPnL: number;
  holdingsCount: number;
  title: string | null;
  closing: string | null;
};

export default function JournalScreen() {
  const router = useRouter();
  const { getAccessToken, isAuthenticated } = useAuth();
  const { portfolios, loading: histLoading, refresh: refreshHist } = usePortfolioHistory();
  const [cachedJournals, setCachedJournals] = useState<JournalListItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const fetchList = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingList(true);
    try {
      const token = await getAccessToken();
      const result = await listJournals(token);
      setCachedJournals(result.journals);
    } catch {
      // silent
    } finally {
      setLoadingList(false);
    }
  }, [isAuthenticated, getAccessToken]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const refresh = useCallback(async () => {
    await Promise.all([refreshHist(), fetchList()]);
  }, [refreshHist, fetchList]);

  // 合併 portfolio history 月份 + cached journals，填滿每個月
  // 使用市場資料計算每月損益
  const [coverCards, setCoverCards] = useState<CoverCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);

  useEffect(() => {
    if (portfolios.length === 0) {
      setCoverCards([]);
      return;
    }

    let active = true;

    const buildCards = async () => {
      setCardsLoading(true);

      // 建立 portfolio 月份 map（每月最新一筆）
      const portfolioByMonth: Record<string, typeof portfolios[0]> = {};
      for (const snapshot of portfolios) {
        const month = snapshot.yearMonth.slice(0, 7);
        if (!portfolioByMonth[month]) portfolioByMonth[month] = snapshot;
      }

      // 建立 cached journal map
      const journalByMonth: Record<string, JournalListItem> = {};
      for (const j of cachedJournals) {
        journalByMonth[j.month] = j;
      }

      // 找出起始月份和結束月份
      const allMonths = Object.keys(portfolioByMonth).sort();
      const startMonth = allMonths[0];
      const endMonth = allMonths[allMonths.length - 1];

      // 產生從 startMonth 到 endMonth 的所有月份
      const cards: CoverCard[] = [];
      let [curYear, curMonth] = startMonth.split('-').map(Number);
      const [endYear, endMon] = endMonth.split('-').map(Number);

      let lastSnapshot = portfolios[portfolios.length - 1];

      while (curYear < endYear || (curYear === endYear && curMonth <= endMon)) {
        const monthKey = `${curYear}-${String(curMonth).padStart(2, '0')}`;
        const m = String(curMonth).padStart(2, '0');

        // 找這個月的 portfolio（或用前一個月的）
        const snapshot = portfolioByMonth[monthKey];
        if (snapshot) lastSnapshot = snapshot;

        const journal = journalByMonth[monthKey];
        const currentSnapshot = snapshot ?? lastSnapshot;

        // 用市場資料計算該月的市值與損益
        let totalMarketValue = currentSnapshot.totalMarketValue;
        let totalPnL = currentSnapshot.totalPnL ?? 0;

        try {
          const holdings = currentSnapshot.holdings.map((h) => ({
            symbol: h.symbol,
            shares: h.shares,
            avgCost: h.avgCost,
          }));

          if (holdings.length > 0) {
            const pnlResult = await calculatePortfolioPnLAtMonth(monthKey, holdings);
            if (pnlResult.dataDate) {
              totalMarketValue = pnlResult.totalMarketValue;
              totalPnL = pnlResult.totalPnL;
            }
          }
        } catch {
          // 市場資料不可用時使用 snapshot 原始數據
        }

        cards.push({
          month: monthKey,
          monthLabel: MONTH_LABELS[m] || m,
          year: String(curYear),
          totalMarketValue,
          totalPnL,
          holdingsCount: currentSnapshot.holdings.length,
          title: journal?.title || null,
          closing: journal?.closing || null,
        });

        curMonth++;
        if (curMonth > 12) { curMonth = 1; curYear++; }
      }

      // 由新到舊排列
      if (active) {
        setCoverCards(cards.reverse());
        setCardsLoading(false);
      }
    };

    buildCards();
    return () => { active = false; };
  }, [portfolios, cachedJournals]);

  const loading = histLoading || loadingList || cardsLoading;

  if (loading && coverCards.length === 0) {
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
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Journal</Text>
        <Text style={styles.subtitle}>我的投資月報</Text>
      </View>

      {coverCards.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📖</Text>
          <Text style={styles.emptyTitle}>還沒有月報</Text>
          <Text style={styles.emptyText}>
            上傳券商持股截圖後，AI 會為你撰寫每月的投資回顧。
          </Text>
        </View>
      ) : (
        coverCards.map((card) => {
          const pnlPositive = card.totalPnL >= 0;

          return (
            <TouchableOpacity
              key={card.month}
              style={styles.coverCard}
              onPress={() =>
                router.push({
                  pathname: '/journal-detail',
                  params: { yearMonth: card.month },
                })
              }
              activeOpacity={0.85}
            >
              <View style={styles.coverBackground}>
                {/* Top row */}
                <View style={styles.coverTop}>
                  <View style={styles.monthBadge}>
                    <Text style={styles.monthBadgeText}>{card.monthLabel}</Text>
                  </View>
                  <Text style={styles.yearText}>{card.year}</Text>
                </View>

                {/* Title */}
                {card.title ? (
                  <Text style={styles.coverTitle}>{card.title}</Text>
                ) : null}

                {/* Stats */}
                <View style={styles.statsRow}>
                  <View style={styles.statBlock}>
                    <Text style={styles.statValue}>
                      NT${card.totalMarketValue.toLocaleString('zh-TW')}
                    </Text>
                    <Text style={styles.statLabel}>總市值</Text>
                  </View>
                  <View style={styles.statBlock}>
                    <Text style={[styles.statValue, pnlPositive ? styles.pnlPositive : styles.pnlNegative]}>
                      {pnlPositive ? '+' : '-'}NT${Math.abs(card.totalPnL).toLocaleString('zh-TW')}
                    </Text>
                    <Text style={styles.statLabel}>損益</Text>
                  </View>
                  <View style={styles.statBlock}>
                    <Text style={styles.statValue}>{card.holdingsCount}</Text>
                    <Text style={styles.statLabel}>檔</Text>
                  </View>
                </View>

                {/* Closing quote */}
                <View style={styles.closingSection}>
                  {card.closing ? (
                    <Text style={styles.closingText} numberOfLines={2}>
                      「{card.closing}」
                    </Text>
                  ) : (
                    <Text style={styles.tapHint}>點擊生成 AI 月報 →</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F7' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#FAF9F7' },
  stateText: { fontSize: 15, color: '#888888', marginTop: 10 },
  header: { padding: 24, paddingBottom: 16, backgroundColor: 'transparent' },
  title: { fontSize: 28, fontWeight: '600', color: '#222222' },
  subtitle: { fontSize: 14, color: '#888888', marginTop: 4 },
  emptyCard: { backgroundColor: '#FFFFFF', marginHorizontal: 20, padding: 28, borderRadius: 24, alignItems: 'center' },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 19, fontWeight: '600', color: '#222222' },
  emptyText: { fontSize: 14, color: '#888888', lineHeight: 21, textAlign: 'center', marginTop: 8 },

  coverCard: {
    marginHorizontal: 20, marginBottom: 20, borderRadius: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  coverBackground: { backgroundColor: '#2C2C2E', padding: 24, paddingVertical: 28 },
  coverTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, backgroundColor: 'transparent' },
  monthBadge: { backgroundColor: 'rgba(182, 201, 168, 0.9)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6 },
  monthBadgeText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', letterSpacing: 1 },
  yearText: { fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },

  coverTitle: { fontSize: 20, fontWeight: '600', color: '#FFFFFF', marginBottom: 16 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, backgroundColor: 'transparent' },
  statBlock: { backgroundColor: 'transparent' },
  statValue: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5 },
  pnlPositive: { color: '#B6C9A8' },
  pnlNegative: { color: '#E8A8A8' },

  closingSection: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 16, backgroundColor: 'transparent' },
  closingText: { fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 22, fontStyle: 'italic' },
  tapHint: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },

  bottomPadding: { height: 40, backgroundColor: 'transparent' },
});
