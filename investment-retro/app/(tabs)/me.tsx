import { StyleSheet, ScrollView } from 'react-native';
import { Text, View } from '@/components/Themed';

export default function MeScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.avatar}>👤</Text>
        <Text style={styles.name}>子珆</Text>
        <Text style={styles.subtitle}>開始投資 628 天</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>6</Text>
          <Text style={styles.statLabel}>持有股票</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>24</Text>
          <Text style={styles.statLabel}>篇月誌</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>2</Text>
          <Text style={styles.statLabel}>目標達成</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎯 我的目標</Text>
        <View style={styles.goalItem}>
          <Text style={styles.goalName}>東京旅行</Text>
          <Text style={styles.goalProgress}>73%</Text>
        </View>
        <View style={styles.goalItem}>
          <Text style={styles.goalName}>MacBook Pro</Text>
          <Text style={styles.goalProgress}>45%</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🏆 成就</Text>
        <Text style={styles.achievement}>🎉 第一筆投資</Text>
        <Text style={styles.achievement}>💰 第一筆股息</Text>
        <Text style={styles.achievement}>📅 連續投資 12 個月</Text>
        <Text style={styles.achievement}>🎯 完成第一個目標</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>⚙️ 設定</Text>
        <Text style={styles.settingItem}>帳號設定</Text>
        <Text style={styles.settingItem}>通知設定</Text>
        <Text style={styles.settingItem}>資料匯出</Text>
        <Text style={styles.settingItem}>隱私設定</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F9FAFB',
  },
  avatar: {
    fontSize: 48,
    marginBottom: 8,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563EB',
  },
  statLabel: {
    fontSize: 12,
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
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  goalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: 'transparent',
  },
  goalName: {
    fontSize: 15,
    color: '#111827',
  },
  goalProgress: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563EB',
  },
  achievement: {
    fontSize: 14,
    color: '#374151',
    paddingVertical: 6,
  },
  settingItem: {
    fontSize: 15,
    color: '#374151',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
});
