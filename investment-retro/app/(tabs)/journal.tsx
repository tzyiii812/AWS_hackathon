import { StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter } from 'expo-router';

const JOURNALS = [
  {
    yearMonth: '2026-07',
    monthLabel: 'July',
    title: '維持投入的一個月',
    summary: '沒有太多交易，但維持了原本的投入計畫。',
    change: '+NT$18,200',
    goal: '東京旅行 73%',
    mood: '😊',
  },
  {
    yearMonth: '2026-06',
    monthLabel: 'June',
    title: '第一次收到 ETF 配息',
    summary: '收到人生第一筆配息，金額不大但意義重大。',
    change: '+NT$8,600',
    goal: '股息 NT$1,280',
    mood: '🎉',
  },
  {
    yearMonth: '2026-05',
    monthLabel: 'May',
    title: '加薪後增加投入',
    summary: '多出來的收入幾乎都轉化成了投資。',
    change: '+NT$22,100',
    goal: '東京旅行 63%',
    mood: '🚀',
  },
];

export default function JournalScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Journal</Text>
        <Text style={styles.subtitle}>我的投資日記</Text>
      </View>

      {JOURNALS.map((journal) => (
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
            <Text style={styles.metaText}>{journal.goal}</Text>
          </View>
        </TouchableOpacity>
      ))}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F7',
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
