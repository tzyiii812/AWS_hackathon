import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { usePortfolioHistory } from '@/context/PortfolioHistoryContext';
import { generateJournal, JournalReport } from '@/services/api';
import { calculatePortfolioPnLAtMonth } from '@/services/marketData';

const MONTH_NAMES: Record<string, string> = {
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

export default function JournalDetailScreen() {
  const { yearMonth } = useLocalSearchParams<{ yearMonth: string }>();
  const { getAccessToken } = useAuth();
  const { portfolios } = usePortfolioHistory();
  const [journal, setJournal] = useState<JournalReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const month = yearMonth?.slice(5, 7) || '01';
  const year = yearMonth?.slice(0, 4) || '2025';
  const monthName = MONTH_NAMES[month] || month;

  // 找對應 snapshot（用該月或之前最近的）
  const targetMonth = yearMonth?.slice(0, 7) || '';
  const snapshot =
    portfolios.find((p) => p.yearMonth.startsWith(targetMonth)) ||
    portfolios.find((p) => p.yearMonth.slice(0, 7) <= targetMonth);

  // 使用市場資料計算該月的市值和損益
  const [marketPnL, setMarketPnL] = useState<{
    totalMarketValue: number;
    totalPnL: number;
    holdingsCount: number;
  } | null>(null);

  useEffect(() => {
    if (!snapshot || !yearMonth) return;
    let active = true;

    const calcPnL = async () => {
      try {
        const holdings = snapshot.holdings.map((h) => ({
          symbol: h.symbol,
          shares: h.shares,
          avgCost: h.avgCost,
        }));

        if (holdings.length > 0) {
          const result = await calculatePortfolioPnLAtMonth(
            yearMonth.slice(0, 7),
            holdings
          );
          if (active && result.dataDate) {
            setMarketPnL({
              totalMarketValue: result.totalMarketValue,
              totalPnL: result.totalPnL,
              holdingsCount: holdings.length,
            });
          }
        }
      } catch {
        // 市場資料不可用，使用 snapshot 原始數據
      }
    };

    calcPnL();
    return () => { active = false; };
  }, [snapshot, yearMonth]);

  useEffect(() => {
    if (!yearMonth) return;
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getAccessToken();
        const result = await generateJournal(token, yearMonth);
        if (active) setJournal(result.journal);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'AI 月報生成失敗');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, [yearMonth, getAccessToken]);

  if (loading) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color="#222222" />
        <Text style={styles.loadingText}>AI 正在撰寫你的月報…</Text>
        <Text style={styles.loadingHint}>分析持股與目標中</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingState}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!journal) return null;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.monthLabel}>{monthName} {year}</Text>
        <Text style={styles.diaryTitle}>{journal.title}</Text>
      </View>

      {/* 帳戶快照 */}
      {snapshot && (
        <View style={styles.snapshotCard}>
          <View style={styles.snapshotRow}>
            <View style={styles.snapshotItem}>
              <Text style={styles.snapshotValue}>
                NT${(marketPnL?.totalMarketValue ?? snapshot.totalMarketValue).toLocaleString('zh-TW')}
              </Text>
              <Text style={styles.snapshotLabel}>總市值</Text>
            </View>
            <View style={styles.snapshotItem}>
              <Text style={[styles.snapshotValue, (marketPnL?.totalPnL ?? snapshot.totalPnL ?? 0) >= 0 ? styles.pnlGreen : styles.pnlRed]}>
                {(marketPnL?.totalPnL ?? snapshot.totalPnL ?? 0) >= 0 ? '+' : '-'}NT${Math.abs(marketPnL?.totalPnL ?? snapshot.totalPnL ?? 0).toLocaleString('zh-TW')}
              </Text>
              <Text style={styles.snapshotLabel}>損益</Text>
            </View>
          </View>
          <Text style={styles.snapshotMeta}>
            {snapshot.holdings.length} 檔持股{snapshot.broker ? `・${snapshot.broker}` : ''}
          </Text>
        </View>
      )}

      {/* 月度回顧 */}
      <View style={styles.diarySection}>
        <Text style={styles.diaryBody}>{journal.summary}</Text>
      </View>

      {/* 目標與建議（故事感） */}
      <View style={styles.storyCard}>
        <Text style={styles.storyIcon}>🎯</Text>
        <Text style={styles.storyBody}>{journal.goalAndAdvice}</Text>
      </View>

      {/* 鼓勵 */}
      <View style={styles.encourageCard}>
        <Text style={styles.encourageText}>{journal.encouragement}</Text>
      </View>

      {/* 結語 */}
      <View style={styles.closingCard}>
        <Text style={styles.closingQuote}>「{journal.closing}」</Text>
      </View>

      {/* 筆記 */}
      {snapshot?.note ? (
        <View style={styles.noteSection}>
          <Text style={styles.noteLabel}>✏️ 我的筆記</Text>
          <Text style={styles.noteText}>{snapshot.note}</Text>
        </View>
      ) : null}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F7' },

  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#FAF9F7' },
  loadingText: { fontSize: 17, color: '#222222', fontWeight: '500', marginTop: 20 },
  loadingHint: { fontSize: 14, color: '#AAAAAA', marginTop: 8 },
  errorIcon: { fontSize: 40, marginBottom: 12 },
  errorText: { fontSize: 15, color: '#A95454', textAlign: 'center', lineHeight: 22 },

  header: { padding: 24, paddingBottom: 8, backgroundColor: 'transparent' },
  monthLabel: { fontSize: 14, color: '#B6C9A8', fontWeight: '600', letterSpacing: 1, marginBottom: 8 },
  diaryTitle: { fontSize: 26, fontWeight: '600', color: '#222222', lineHeight: 34 },

  snapshotCard: {
    backgroundColor: '#2C2C2E', marginHorizontal: 20, marginTop: 16, marginBottom: 28,
    padding: 20, borderRadius: 20,
  },
  snapshotRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, backgroundColor: 'transparent' },
  snapshotItem: { backgroundColor: 'transparent' },
  snapshotValue: { fontSize: 20, fontWeight: '600', color: '#FFFFFF' },
  snapshotLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  snapshotMeta: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  pnlGreen: { color: '#B6C9A8' },
  pnlRed: { color: '#E8A8A8' },

  diarySection: { paddingHorizontal: 24, marginBottom: 24, backgroundColor: 'transparent' },
  diaryBody: { fontSize: 16, color: '#444444', lineHeight: 28 },

  storyCard: {
    backgroundColor: '#FFFFFF', marginHorizontal: 20, marginBottom: 20, padding: 24, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  storyIcon: { fontSize: 22, marginBottom: 10 },
  storyBody: { fontSize: 15, color: '#444444', lineHeight: 26 },

  encourageCard: {
    marginHorizontal: 20, marginBottom: 20, padding: 22,
    backgroundColor: '#FFFFFF', borderRadius: 20,
    borderLeftWidth: 4, borderLeftColor: '#B6C9A8',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  encourageText: { fontSize: 15, color: '#555555', lineHeight: 26, fontStyle: 'italic' },

  closingCard: {
    backgroundColor: '#2C2C2E', marginHorizontal: 20, marginBottom: 20,
    padding: 28, borderRadius: 20, alignItems: 'center',
  },
  closingQuote: { fontSize: 17, color: 'rgba(255,255,255,0.85)', lineHeight: 28, textAlign: 'center', fontStyle: 'italic' },

  noteSection: { paddingHorizontal: 24, marginBottom: 20, backgroundColor: 'transparent' },
  noteLabel: { fontSize: 13, color: '#888888', marginBottom: 8 },
  noteText: { fontSize: 15, color: '#555555', lineHeight: 24, fontStyle: 'italic' },

  bottomPadding: { height: 40, backgroundColor: 'transparent' },
});
