import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useLocalSearchParams } from 'expo-router';

// Mock journal data
const MOCK_JOURNALS: Record<string, any> = {
  '2026-07': {
    month: 'July 2026',
    title: '維持投入的一個月',
    summary:
      '本月資產增加 NT$18,200，其中 NT$10,000 來自新增投入，NT$8,200 來自市場價格變化。',
    portfolioChange: {
      totalChange: '+NT$18,200',
      newInvestment: 'NT$10,000',
      marketChange: '+NT$8,200',
    },
    holdingChanges: {
      added: [],
      increased: [
        { symbol: '2330', name: '台積電', from: 150, to: 200 },
        { symbol: '0050', name: '元大台灣50', from: 900, to: 1000 },
      ],
      decreased: [
        { symbol: '00919', name: '群益台灣精選高息', from: 1000, to: 800 },
      ],
    },
    goalProgress: {
      name: '東京旅行',
      from: 68,
      to: 73,
      amount: '+NT$10,000',
      estimate: '預估還需要 8～11 個月',
    },
    aiStory:
      '七月，你沒有大幅改變自己的投資方式。\n\n你新增了一部分 0050，也繼續維持原本的定期投入。\n\n這個月的資產成長，有一半以上來自你主動存下來的資金，而不是單純依賴市場上漲。\n\n東京旅行基金從 68% 上升到 73%。按照最近幾個月的速度，你正在穩定接近原本設定的目標。',
    userNote: '這個月加薪了，決定多買一些 ETF。',
    quote: '穩定，就是一種力量。',
  },
  '2026-06': {
    month: 'June 2026',
    title: '第一次收到 ETF 配息',
    summary:
      '本月資產增加 NT$8,600。收到人生第一筆 ETF 配息 NT$1,280，雖然金額不大，但意義重大。',
    portfolioChange: {
      totalChange: '+NT$8,600',
      newInvestment: 'NT$6,000',
      marketChange: '+NT$2,600',
    },
    holdingChanges: {
      added: [{ symbol: '00919', name: '群益台灣精選高息', from: 0, to: 1000 }],
      increased: [{ symbol: '0050', name: '元大台灣50', from: 800, to: 900 }],
      decreased: [],
    },
    goalProgress: {
      name: '東京旅行',
      from: 63,
      to: 68,
      amount: '+NT$10,000',
      estimate: '預估還需要 10～13 個月',
    },
    aiStory:
      '六月，你收到了人生第一筆 ETF 配息。\n\n金額是 NT$1,280，來自 00919 群益台灣精選高息。雖然這個數字看起來不大，但它代表你的投資開始產生被動收入了。\n\n你也新增了一檔高息 ETF，看得出來你開始思考如何讓資產產生現金流。\n\n東京旅行基金穩定推進，從 63% 來到 68%。',
    userNote: '第一次收到配息，覺得很開心！',
    quote: '每一筆配息，都是未來自由的一小步。',
  },
  '2026-05': {
    month: 'May 2026',
    title: '加薪後增加投入',
    summary:
      '本月資產增加 NT$22,100。因為加薪，這個月的投入金額比平常多了不少。',
    portfolioChange: {
      totalChange: '+NT$22,100',
      newInvestment: 'NT$18,000',
      marketChange: '+NT$4,100',
    },
    holdingChanges: {
      added: [],
      increased: [
        { symbol: '2330', name: '台積電', from: 100, to: 150 },
        { symbol: '0050', name: '元大台灣50', from: 700, to: 800 },
      ],
      decreased: [],
    },
    goalProgress: {
      name: '東京旅行',
      from: 58,
      to: 63,
      amount: '+NT$10,000',
      estimate: '預估還需要 11～14 個月',
    },
    aiStory:
      '五月，你因為加薪而增加了投入金額。\n\n這個月你投入了 NT$18,000，是過去半年平均的將近三倍。你把多出來的收入幾乎都轉化成了投資。\n\n台積電和 0050 都增加了持股。你的投資組合正在變得更扎實。\n\n東京旅行基金從 58% 跳到 63%，這是近幾個月最大幅度的成長。',
    userNote: '',
    quote: '收入增加時，讓投資跟著成長。',
  },
};

export default function JournalDetailScreen() {
  const { yearMonth } = useLocalSearchParams<{ yearMonth: string }>();
  const journal = MOCK_JOURNALS[yearMonth || '2026-07'];

  if (!journal) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>找不到這篇月誌</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.month}>{journal.month}</Text>
        <Text style={styles.title}>{journal.title}</Text>
      </View>

      {/* Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 本月摘要</Text>
        <Text style={styles.bodyText}>{journal.summary}</Text>
      </View>

      {/* Portfolio Change */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💰 資產變化</Text>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>總變化</Text>
          <Text style={styles.dataValuePositive}>{journal.portfolioChange.totalChange}</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>新增投入</Text>
          <Text style={styles.dataValue}>{journal.portfolioChange.newInvestment}</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>市場變化</Text>
          <Text style={styles.dataValuePositive}>{journal.portfolioChange.marketChange}</Text>
        </View>
      </View>

      {/* Holding Changes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 持股變化</Text>
        {journal.holdingChanges.added.length > 0 && (
          <View style={styles.changeGroup}>
            <Text style={styles.changeLabel}>🆕 新增</Text>
            {journal.holdingChanges.added.map((item: any, i: number) => (
              <Text key={i} style={styles.changeItem}>
                {item.symbol} {item.name}：{item.to} 股
              </Text>
            ))}
          </View>
        )}
        {journal.holdingChanges.increased.length > 0 && (
          <View style={styles.changeGroup}>
            <Text style={styles.changeLabel}>📈 增加</Text>
            {journal.holdingChanges.increased.map((item: any, i: number) => (
              <Text key={i} style={styles.changeItem}>
                {item.symbol} {item.name}：{item.from} → {item.to} 股
              </Text>
            ))}
          </View>
        )}
        {journal.holdingChanges.decreased.length > 0 && (
          <View style={styles.changeGroup}>
            <Text style={styles.changeLabel}>📉 減少</Text>
            {journal.holdingChanges.decreased.map((item: any, i: number) => (
              <Text key={i} style={styles.changeItem}>
                {item.symbol} {item.name}：{item.from} → {item.to} 股
              </Text>
            ))}
          </View>
        )}
      </View>

      {/* Goal Progress */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 目標進度</Text>
        <Text style={styles.goalName}>{journal.goalProgress.name}</Text>
        <Text style={styles.goalProgressText}>
          {journal.goalProgress.from}% → {journal.goalProgress.to}%
        </Text>
        <Text style={styles.bodyText}>
          本月目標累積增加 {journal.goalProgress.amount}
        </Text>
        <Text style={styles.aiEstimate}>{journal.goalProgress.estimate}</Text>
      </View>

      {/* AI Story */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>✨ AI 月誌</Text>
        <Text style={styles.storyText}>{journal.aiStory}</Text>
      </View>

      {/* Quote */}
      <View style={styles.quoteSection}>
        <Text style={styles.quoteText}>"{journal.quote}"</Text>
      </View>

      {/* User Note */}
      {journal.userNote ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💬 我的筆記</Text>
          <Text style={styles.noteText}>{journal.userNote}</Text>
        </View>
      ) : null}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 20,
    paddingBottom: 12,
    backgroundColor: '#F9FAFB',
  },
  month: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  bodyText: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 24,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: 'transparent',
  },
  dataLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  dataValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  dataValuePositive: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  changeGroup: {
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  changeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  changeItem: {
    fontSize: 14,
    color: '#4B5563',
    paddingVertical: 3,
    paddingLeft: 8,
  },
  goalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  goalProgressText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 8,
  },
  aiEstimate: {
    fontSize: 13,
    color: '#2563EB',
    marginTop: 8,
    fontStyle: 'italic',
  },
  storyText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 28,
  },
  quoteSection: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 20,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
  },
  quoteText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E40AF',
    fontStyle: 'italic',
    lineHeight: 24,
  },
  noteText: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  bottomPadding: {
    height: 40,
    backgroundColor: 'transparent',
  },
});
