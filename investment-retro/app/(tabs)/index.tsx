import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useGoals } from '@/context/GoalContext';
import { usePortfolio } from '@/context/PortfolioContext';
import { usePortfolioHistory } from '@/context/PortfolioHistoryContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;
const CARD_HEIGHT = 200;

const AI_FEED = [
  { id: '1', icon: '📈', title: '台積電近期波動增加', content: '它占你投資組合的 24%，波動會直接影響你的目標進度。' },
  { id: '2', icon: '🎯', title: '東京旅行目標可能提前完成', content: '最近三個月的平均投入比前半年增加了 18%。' },
  { id: '3', icon: '🏆', title: '連續 8 個月維持定期投入', content: '即使市場下跌，你的投入方式也沒有改變。' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { activeGoals, completeGoal, totalTarget, completedCount } = useGoals();
  const { latest } = usePortfolio();
  const portfolioValue = latest?.totalMarketValue ?? 0;
  const [cardIndex, setCardIndex] = useState(0);

  // Total cards: 1 overview + N goals
  const totalCards = 1 + activeGoals.length;

  const goNext = () => setCardIndex((prev) => (prev + 1) % totalCards);
  const goPrev = () => setCardIndex((prev) => (prev - 1 + totalCards) % totalCards);

  const renderCurrentCard = () => {
    if (cardIndex === 0) {
      // Overview card
      return (
        <View style={styles.goalCard}>
          <Text style={styles.goalCardLabel}>目標總覽</Text>
          <Text style={styles.goalCardTitle}>
            {activeGoals.length} 個進行中
            {completedCount > 0 ? ` ・ ${completedCount} 個已完成` : ''}
          </Text>
          <Text style={styles.totalAmount}>
            NT${totalTarget.toLocaleString()}
          </Text>
          <Text style={styles.totalLabel}>目標總金額</Text>
        </View>
      );
    }

    const goal = activeGoals[cardIndex - 1];
    if (!goal) return null;
    const canComplete = portfolioValue >= goal.targetAmount;

    return (
      <View style={styles.goalCard}>
        <Text style={styles.goalIcon}>{goal.icon}</Text>
        <Text style={styles.goalName}>{goal.name}</Text>
        <Text style={styles.goalTarget}>
          NT${goal.targetAmount.toLocaleString()}
        </Text>
        {goal.description ? (
          <Text style={styles.goalDesc}>{goal.description}</Text>
        ) : null}
        {canComplete && (
          <TouchableOpacity
            style={styles.completeBtn}
            onPress={() => completeGoal(goal.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.completeBtnText}>Complete</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Good Evening,</Text>
        <Text style={styles.name}>子珆 🌱</Text>
      </View>

      {/* Goal Carousel */}
      <View style={styles.carouselWrapper}>
        {/* Left Arrow */}
        <TouchableOpacity style={styles.arrowLeft} onPress={goPrev} activeOpacity={0.6}>
          <Text style={styles.arrowText}>‹</Text>
        </TouchableOpacity>

        {/* Card */}
        {renderCurrentCard()}

        {/* Right Arrow */}
        <TouchableOpacity style={styles.arrowRight} onPress={goNext} activeOpacity={0.6}>
          <Text style={styles.arrowText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Dots */}
      <View style={styles.dotsContainer}>
        {Array.from({ length: totalCards }).map((_, i) => (
          <TouchableOpacity key={i} onPress={() => setCardIndex(i)}>
            <View style={[styles.dot, i === cardIndex && styles.dotActive]} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Portfolio Snapshot */}
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          latest ? router.push('/holdings') : router.push('/(tabs)/update')
        }
        activeOpacity={0.8}
      >
        <Text style={styles.cardLabel}>我的投資組合</Text>
        {latest ? (
          <>
            <Text style={styles.portfolioValue}>
              NT${latest.totalMarketValue.toLocaleString('zh-TW')}
            </Text>
            <Text
              style={
                latest.totalPnL >= 0
                  ? styles.portfolioGain
                  : styles.portfolioLoss
              }
            >
              {latest.totalPnL >= 0 ? '+' : '-'}NT$
              {Math.abs(latest.totalPnL).toLocaleString('zh-TW')}
            </Text>
            <Text style={styles.portfolioMeta}>
              持有 {latest.holdings.length} 檔股票・{latest.yearMonth}
            </Text>
            <Text style={styles.viewAll}>查看所有持股 →</Text>
          </>
        ) : (
          <>
            <Text style={styles.emptyPortfolioTitle}>尚未匯入持股</Text>
            <Text style={styles.portfolioMeta}>上傳券商截圖，建立第一筆投資紀錄。</Text>
            <Text style={styles.viewAll}>開始更新 →</Text>
          </>
        )}
      </TouchableOpacity>

      {/* AI Feed */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>For You ✨</Text>
      </View>

      {AI_FEED.map((item) => (
        <View key={item.id} style={styles.feedCard}>
          <Text style={styles.feedItemIcon}>{item.icon}</Text>
          <Text style={styles.feedTitle}>{item.title}</Text>
          <Text style={styles.feedContent}>{item.content}</Text>
          <TouchableOpacity style={styles.feedAction} onPress={() => router.push('/ask-ai')}>
            <Text style={styles.feedActionText}>問 AI 更多 →</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* Memory */}
      <View style={styles.memoryCard}>
        <Text style={styles.memoryLabel}>去年今天</Text>
        <Text style={styles.memoryText}>
          東京旅行基金只有 31%。{'\n'}現在已經來到 73%。
        </Text>
      </View>

      {/* Recent Journal */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push({ pathname: '/journal-detail', params: { yearMonth: '2026-07' } })}
        activeOpacity={0.8}
      >
        <Text style={styles.cardLabel}>最近月誌</Text>
        <Text style={styles.journalTitle}>維持投入的一個月</Text>
        <Text style={styles.journalBody}>這個月沒有太多交易，但維持了原本的投入計畫。</Text>
        <Text style={styles.journalMeta}>資產 +NT$18,200 ・ 東京旅行 68% → 73%</Text>
        <Text style={styles.readMore}>閱讀完整月誌 →</Text>
      </TouchableOpacity>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F7' },
  header: { padding: 24, paddingTop: 20, paddingBottom: 8, backgroundColor: 'transparent' },
  greeting: { fontSize: 16, color: '#888888' },
  name: { fontSize: 28, fontWeight: '600', color: '#222222', marginTop: 2 },

  // Carousel
  carouselWrapper: {
    marginTop: 16,
    marginHorizontal: SCREEN_WIDTH > 500 ? 20 : 20,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  goalCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    justifyContent: 'center',
  },
  arrowLeft: {
    position: 'absolute',
    left: -6,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  arrowRight: {
    position: 'absolute',
    right: -6,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  arrowText: {
    fontSize: 22,
    color: '#222222',
    fontWeight: '300',
    marginTop: -2,
  },

  goalCardLabel: { fontSize: 13, color: '#888888', marginBottom: 8, letterSpacing: 0.5 },
  goalCardTitle: { fontSize: 16, fontWeight: '500', color: '#555555', marginBottom: 12 },
  totalAmount: { fontSize: 32, fontWeight: '600', color: '#222222' },
  totalLabel: { fontSize: 14, color: '#888888', marginTop: 4 },
  goalIcon: { fontSize: 28, marginBottom: 8 },
  goalName: { fontSize: 22, fontWeight: '600', color: '#222222', marginBottom: 6 },
  goalTarget: { fontSize: 15, color: '#888888' },
  goalDesc: { fontSize: 13, color: '#BBBBBB', marginTop: 6 },
  completeBtn: {
    marginTop: 16, backgroundColor: '#B6C9A8', borderRadius: 999,
    paddingVertical: 12, alignItems: 'center',
  },
  completeBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '500' },

  // Dots
  dotsContainer: {
    flexDirection: 'row', justifyContent: 'center', gap: 6,
    marginTop: 14, marginBottom: 16, backgroundColor: 'transparent',
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EDEBE8' },
  dotActive: { backgroundColor: '#222222', width: 18 },

  // Card
  card: {
    backgroundColor: '#FFFFFF', marginHorizontal: 20, marginBottom: 16,
    padding: 24, borderRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  cardLabel: { fontSize: 13, color: '#888888', marginBottom: 8, letterSpacing: 0.5 },
  portfolioValue: { fontSize: 32, fontWeight: '600', color: '#222222', marginBottom: 4 },
  portfolioLoss: { fontSize: 14, color: '#D68E8E', marginTop: 4 },
  emptyPortfolioTitle: { fontSize: 22, fontWeight: '600', color: '#222222', marginTop: 4, marginBottom: 8 },
  portfolioGain: { fontSize: 16, color: '#B6C9A8', fontWeight: '500', marginBottom: 8 },
  portfolioMeta: { fontSize: 14, color: '#888888' },
  viewAll: { fontSize: 14, color: '#AFC8E8', fontWeight: '500', marginTop: 14 },

  // Feed
  sectionHeader: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12, backgroundColor: 'transparent' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#222222' },
  feedCard: {
    backgroundColor: '#FFFFFF', marginHorizontal: 20, marginBottom: 12,
    padding: 20, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  feedItemIcon: { fontSize: 20, marginBottom: 8 },
  feedTitle: { fontSize: 16, fontWeight: '600', color: '#222222', marginBottom: 6 },
  feedContent: { fontSize: 14, color: '#555555', lineHeight: 21 },
  feedAction: { marginTop: 14 },
  feedActionText: { fontSize: 14, color: '#AFC8E8', fontWeight: '500' },

  // Memory
  memoryCard: { backgroundColor: '#F8F3EC', marginHorizontal: 20, marginBottom: 16, padding: 20, borderRadius: 20 },
  memoryLabel: { fontSize: 13, color: '#C8B6A6', fontWeight: '600', marginBottom: 8 },
  memoryText: { fontSize: 16, color: '#555555', lineHeight: 24 },

  // Journal
  journalTitle: { fontSize: 20, fontWeight: '600', color: '#222222', marginBottom: 8 },
  journalBody: { fontSize: 15, color: '#555555', lineHeight: 22, marginBottom: 8 },
  journalMeta: { fontSize: 13, color: '#888888' },
  readMore: { fontSize: 14, color: '#AFC8E8', fontWeight: '500', marginTop: 14 },

  bottomPadding: { height: 40, backgroundColor: 'transparent' },
});
