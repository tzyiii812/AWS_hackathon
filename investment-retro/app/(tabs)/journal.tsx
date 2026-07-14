import { StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter } from 'expo-router';

const JOURNALS = [
  {
    yearMonth: '2026-07',
    monthLabel: 'July 2026',
    title: '維持投入的一個月',
    change: '資產 +NT$18,200',
    goal: '東京旅行 73%',
  },
  {
    yearMonth: '2026-06',
    monthLabel: 'June 2026',
    title: '第一次收到 ETF 配息',
    change: '資產 +NT$8,600',
    goal: '股息 NT$1,280',
  },
  {
    yearMonth: '2026-05',
    monthLabel: 'May 2026',
    title: '加薪後增加投入',
    change: '資產 +NT$22,100',
    goal: '東京旅行 58% → 63%',
  },
];

export default function JournalScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Journal</Text>
        <Text style={styles.subtitle}>你的投資人生紀錄</Text>
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
          activeOpacity={0.7}
        >
          <Text style={styles.month}>{journal.monthLabel}</Text>
          <Text style={styles.cardTitle}>{journal.title}</Text>
          <Text style={styles.cardText}>{journal.change}</Text>
          <Text style={styles.cardText}>{journal.goal}</Text>
          <Text style={styles.readMore}>閱讀完整月誌 →</Text>
        </TouchableOpacity>
      ))}
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
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  card: {
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
  month: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  readMore: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '500',
    marginTop: 12,
  },
});
