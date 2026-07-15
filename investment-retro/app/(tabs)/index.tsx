import React, { useState, useEffect } from 'react';
import {
  ImageBackground,
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
import { usePortfolioPnL } from '@/hooks/usePortfolioPnL';
import { useRealizedPnL } from '@/hooks/useRealizedPnL';
import { getImageReadUrl } from '@/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;
const CARD_HEIGHT = 200;

const PLACEHOLDER_TIPS = [
  { id: '1', icon: '💡', title: '試試問 AI', content: '上傳持股截圖後，AI 可以分析你的投資組合配置。' },
  { id: '2', icon: '📊', title: '持續追蹤', content: '定期更新持股，才能看到報酬趨勢和進度。' },
];

/** Cached presigned URLs for goal images */
const homeImageUrlCache: Record<string, string> = {};

export default function HomeScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { activeGoals, totalTarget, completedCount } = useGoals();
  const { latest } = usePortfolio();
  const pnl = usePortfolioPnL();
  const realized = useRealizedPnL();
  const portfolioValue = pnl.totalMarketValue;
  const [cardIndex, setCardIndex] = useState(0);
  const [realizedExpanded, setRealizedExpanded] = useState(false);
  const [resolvedImages, setResolvedImages] = useState<Record<string, string>>({});

  // Resolve presigned URLs for goal images
  const imageKeys = activeGoals.map((g) => g.imageKey).filter((k): k is string => !!k);

  useEffect(() => {
    if (imageKeys.length === 0) return;

    const toFetch = imageKeys.filter((k) => !homeImageUrlCache[k]);
    if (toFetch.length === 0) {
      const cached: Record<string, string> = {};
      for (const k of imageKeys) {
        if (homeImageUrlCache[k]) cached[k] = homeImageUrlCache[k];
      }
      setResolvedImages(cached);
      return;
    }

    let cancelled = false;

    (async () => {
      const results = await Promise.all(
        toFetch.map(async (key) => {
          try {
            const url = await getImageReadUrl(key);
            return { key, url };
          } catch {
            return { key, url: '' };
          }
        })
      );

      if (cancelled) return;

      for (const { key, url } of results) {
        if (url) homeImageUrlCache[key] = url;
      }

      const all: Record<string, string> = {};
      for (const k of imageKeys) {
        if (homeImageUrlCache[k]) all[k] = homeImageUrlCache[k];
      }
      setResolvedImages(all);
    })();

    return () => { cancelled = true; };
  }, [imageKeys.join('|')]);

  // 從 usePortfolioPnL hook 取得計算結果
  const { unrealizedPnL, returnRate } = pnl;

  // Track images that failed to load
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const onImageError = (key: string) => {
    console.warn('[HomeScreen] Image failed to load, key:', key);
    setFailedImages((prev) => new Set(prev).add(key));
  };

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

    // Progress based on profit, not total market value
    const profit = (unrealizedPnL ?? 0) + (realized.totalRealizedPnL ?? 0);
    const progress = goal.targetAmount > 0
      ? Math.min((profit / goal.targetAmount) * 100, 100)
      : 0;

    const goalImg = goal.imageKey && !failedImages.has(goal.imageKey) ? resolvedImages[goal.imageKey] : null;

    const cardContent = (
      <View style={styles.goalCardContent}>
        <Text style={goalImg ? styles.goalNameLight : styles.goalName}>{goal.name}</Text>
        <Text style={goalImg ? styles.goalTargetLight : styles.goalTarget}>
          NT${goal.targetAmount.toLocaleString()}
        </Text>
        {goal.description ? (
          <Text style={goalImg ? styles.goalDescLight : styles.goalDesc}>{goal.description}</Text>
        ) : null}
        <View style={goalImg ? styles.goalProgressBarLight : styles.goalProgressBar}>
          <View style={[goalImg ? styles.goalProgressFillLight : styles.goalProgressFill, { width: `${Math.max(progress, 0)}%` }]} />
        </View>
        <Text style={goalImg ? styles.goalProgressTextLight : styles.goalProgressText}>
          {progress >= 100
            ? '🎉 已達標！去「我」頁面完成目標'
            : `獲利進度 ${progress.toFixed(0)}%`}
        </Text>
      </View>
    );

    if (goalImg) {
      return (
        <ImageBackground
          source={{ uri: goalImg }}
          style={styles.goalCardWithImage}
          imageStyle={styles.goalCardImageStyle}
          onError={() => goal.imageKey && onImageError(goal.imageKey)}
        >
          <View style={styles.goalCardImageOverlay}>
            {cardContent}
          </View>
        </ImageBackground>
      );
    }

    return (
      <View style={styles.goalCard}>
        {cardContent}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Good Evening,</Text>
        <Text style={styles.name}>{session?.username ?? 'Investor'} 🌱</Text>
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
              {pnl.totalMarketValue > 0
                ? `NT$${pnl.totalMarketValue.toLocaleString('zh-TW')}`
                : '—'}
            </Text>
            <Text
              style={
                (unrealizedPnL ?? 0) >= 0
                  ? styles.portfolioGain
                  : styles.portfolioLoss
              }
            >
              {unrealizedPnL != null
                ? `${unrealizedPnL >= 0 ? '+' : ''}NT$${Math.abs(unrealizedPnL).toLocaleString('zh-TW')}`
                : '—'}
              {returnRate != null ? ` (${returnRate >= 0 ? '+' : ''}${returnRate.toFixed(2)}%)` : ''}
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

      {/* Realized PnL Card */}
      {latest && (realized.totalRealizedPnL !== null || realized.confirmedCount > 0) ? (
        <View style={styles.card}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setRealizedExpanded((v) => !v)}
          >
            <View style={styles.realizedHeader}>
              <Text style={styles.cardLabel}>已實現損益</Text>
              <Text style={styles.realizedToggle}>
                {realizedExpanded ? '收起 ▲' : '展開 ▼'}
              </Text>
            </View>
            <Text
              style={
                (realized.totalRealizedPnL ?? 0) >= 0
                  ? styles.realizedGain
                  : styles.realizedLoss
              }
            >
              {realized.totalRealizedPnL != null
                ? `${realized.totalRealizedPnL >= 0 ? '+' : ''}NT$${Math.abs(realized.totalRealizedPnL).toLocaleString('zh-TW')}`
                : 'NT$0'}
            </Text>
            <Text style={styles.realizedMeta}>
              {realized.confirmedCount} 筆交易
              {realized.skippedCount > 0 ? `・${realized.skippedCount} 筆已跳過` : ''}
            </Text>
          </TouchableOpacity>

          {realizedExpanded && realized.trades.length > 0 ? (
            <View style={styles.realizedList}>
              {realized.trades.map((trade, idx) => (
                <View key={`${trade.symbol}-${trade.yearMonth}-${idx}`} style={styles.realizedRow}>
                  <View style={styles.realizedRowLeft}>
                    <Text style={styles.realizedName}>
                      {trade.name}{trade.isFullSell ? '（清倉）' : ''}
                    </Text>
                    <Text style={styles.realizedDetail}>
                      {trade.yearMonth}・{trade.soldShares.toLocaleString('zh-TW')} 股・均價 NT${trade.sellPrice}
                    </Text>
                  </View>
                  <Text
                    style={
                      trade.realizedPnL >= 0
                        ? styles.realizedItemGain
                        : styles.realizedItemLoss
                    }
                  >
                    {trade.realizedPnL >= 0 ? '+' : ''}NT$
                    {Math.abs(trade.realizedPnL).toLocaleString('zh-TW')}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Tips */}
      {latest && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>For You</Text>
          </View>

          {PLACEHOLDER_TIPS.map((item) => (
            <View key={item.id} style={styles.feedCard}>
              <Text style={styles.feedItemIcon}>{item.icon}</Text>
              <Text style={styles.feedTitle}>{item.title}</Text>
              <Text style={styles.feedContent}>{item.content}</Text>
              <TouchableOpacity style={styles.feedAction} onPress={() => router.push('/ask-ai')}>
                <Text style={styles.feedActionText}>問 AI 更多 →</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      {/* Memory — 未來接真實歷史對比資料後啟用 */}

      {/* Recent Journal — 未來接 journal 資料後啟用 */}

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
  goalCardWithImage: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  goalCardImageStyle: {
    borderRadius: 24,
  },
  goalCardImageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.40)',
    borderRadius: 24,
    padding: 28,
    justifyContent: 'center',
  },
  goalCardContent: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'transparent',
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
  goalName: { fontSize: 22, fontWeight: '600', color: '#222222', marginBottom: 6 },
  goalNameLight: { fontSize: 22, fontWeight: '600', color: '#FFFFFF', marginBottom: 6 },
  goalTarget: { fontSize: 15, color: '#888888' },
  goalTargetLight: { fontSize: 15, color: 'rgba(255,255,255,0.85)' },
  goalDesc: { fontSize: 13, color: '#BBBBBB', marginTop: 6 },
  goalDescLight: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 6 },
  goalProgressBar: {
    height: 4, borderRadius: 2, backgroundColor: '#F0EDE8',
    marginTop: 14, overflow: 'hidden',
  },
  goalProgressBarLight: {
    height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)',
    marginTop: 14, overflow: 'hidden',
  },
  goalProgressFill: { height: 4, borderRadius: 2, backgroundColor: '#86A874' },
  goalProgressFillLight: { height: 4, borderRadius: 2, backgroundColor: '#FFFFFF' },
  goalProgressText: { fontSize: 12, color: '#AAAAAA', marginTop: 6 },
  goalProgressTextLight: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 6 },

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

  // Realized PnL
  realizedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  realizedToggle: { fontSize: 12, color: '#AAAAAA' },
  realizedGain: { fontSize: 26, fontWeight: '600', color: '#86A874', marginBottom: 4 },
  realizedLoss: { fontSize: 26, fontWeight: '600', color: '#D68E8E', marginBottom: 4 },
  realizedMeta: { fontSize: 13, color: '#AAAAAA' },
  realizedList: {
    borderTopWidth: 1,
    borderTopColor: '#F4F1ED',
    marginTop: 14,
    paddingTop: 12,
    backgroundColor: 'transparent',
  },
  realizedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  realizedRowLeft: { flex: 1, backgroundColor: 'transparent' },
  realizedName: { fontSize: 14, fontWeight: '500', color: '#333333' },
  realizedDetail: { fontSize: 12, color: '#AAAAAA', marginTop: 2 },
  realizedItemGain: { fontSize: 14, fontWeight: '500', color: '#86A874' },
  realizedItemLoss: { fontSize: 14, fontWeight: '500', color: '#D68E8E' },

  // (reserved for future memory / journal cards)

  bottomPadding: { height: 40, backgroundColor: 'transparent' },
});
