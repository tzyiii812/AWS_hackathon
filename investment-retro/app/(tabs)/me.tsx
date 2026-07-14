import { StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter } from 'expo-router';
import { useGoals } from '@/context/GoalContext';
import { useAuth } from '@/context/AuthContext';
import { usePortfolio } from '@/context/PortfolioContext';

export default function MeScreen() {
  const router = useRouter();
  const { activeGoals, completedGoals, completedCount } = useGoals();
  const { session, signOut } = useAuth();
  const { latest } = usePortfolio();
  const displayName = session?.username?.split('@')[0] || 'Investor';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.avatar}>🌱</Text>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.subtitle}>{session?.username}</Text>
      </View>

      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{latest?.holdings.length ?? 0}</Text>
          <Text style={styles.statLabel}>持有股票</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>24</Text>
          <Text style={styles.statLabel}>篇月誌</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{completedCount}</Text>
          <Text style={styles.statLabel}>目標達成</Text>
        </View>
      </View>

      {/* Active Goals */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardLabel}>我的目標</Text>
          <TouchableOpacity onPress={() => router.push('/add-goal')}>
            <Text style={styles.addBtn}>+ 新增</Text>
          </TouchableOpacity>
        </View>

        {activeGoals.length === 0 && (
          <Text style={styles.emptyText}>還沒有目標，建立一個吧！</Text>
        )}

        {activeGoals.map((goal, i) => (
          <View
            key={goal.id}
            style={i === activeGoals.length - 1 ? styles.goalItemLast : styles.goalItem}
          >
            <View style={styles.goalLeft}>
              <Text style={styles.goalIcon}>{goal.icon}</Text>
              <View style={styles.goalInfo}>
                <Text style={styles.goalName}>{goal.name}</Text>
                <Text style={styles.goalAmount}>
                  NT${goal.targetAmount.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>已完成的目標 🎉</Text>
          {completedGoals.map((goal) => (
            <View key={goal.id} style={styles.completedItem}>
              <Text style={styles.goalIcon}>{goal.icon}</Text>
              <Text style={styles.completedName}>{goal.name}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Achievements */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>成就</Text>
        <Text style={styles.achievement}>🎉 第一筆投資</Text>
        <Text style={styles.achievement}>💰 第一筆股息</Text>
        <Text style={styles.achievement}>📅 連續投資 12 個月</Text>
        {completedCount > 0 && (
          <Text style={styles.achievement}>🎯 完成 {completedCount} 個目標</Text>
        )}
      </View>

      {/* Settings */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>設定</Text>
        <Text style={styles.settingItem}>帳號設定</Text>
        <Text style={styles.settingItem}>通知設定</Text>
        <Text style={styles.settingItem}>資料匯出</Text>
        <Text style={styles.settingItem}>隱私設定</Text>
        <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
          <Text style={styles.signOutText}>登出</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F7' },
  header: { alignItems: 'center', paddingTop: 32, paddingBottom: 20, backgroundColor: 'transparent' },
  avatar: { fontSize: 48, marginBottom: 12 },
  name: { fontSize: 24, fontWeight: '600', color: '#222222' },
  subtitle: { fontSize: 14, color: '#888888', marginTop: 4 },
  statsCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: '#FFFFFF', marginHorizontal: 20, marginBottom: 16, padding: 20,
    borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  statItem: { alignItems: 'center', backgroundColor: 'transparent' },
  statDivider: { width: 1, height: 30, backgroundColor: '#F4F1ED' },
  statNumber: { fontSize: 24, fontWeight: '600', color: '#222222' },
  statLabel: { fontSize: 12, color: '#888888', marginTop: 4 },
  card: {
    backgroundColor: '#FFFFFF', marginHorizontal: 20, marginBottom: 16, padding: 24,
    borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16, backgroundColor: 'transparent',
  },
  cardLabel: { fontSize: 13, color: '#888888', marginBottom: 16, letterSpacing: 0.5 },
  addBtn: { fontSize: 14, color: '#AFC8E8', fontWeight: '500' },
  emptyText: { fontSize: 15, color: '#BBBBBB', textAlign: 'center', paddingVertical: 12 },
  goalItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F4F1ED',
    backgroundColor: 'transparent',
  },
  goalItemLast: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, backgroundColor: 'transparent',
  },
  goalLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'transparent', flex: 1 },
  goalIcon: { fontSize: 22 },
  goalInfo: { backgroundColor: 'transparent', flex: 1 },
  goalName: { fontSize: 16, color: '#222222', fontWeight: '500' },
  goalAmount: { fontSize: 13, color: '#BBBBBB', marginTop: 2 },
  completedItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, backgroundColor: 'transparent',
  },
  completedName: { fontSize: 15, color: '#BBBBBB', textDecorationLine: 'line-through' },
  achievement: { fontSize: 15, color: '#555555', paddingVertical: 10 },
  settingItem: { fontSize: 15, color: '#555555', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F4F1ED' },
  signOutButton: { paddingTop: 18, alignItems: 'center' },
  signOutText: { fontSize: 15, color: '#C47777', fontWeight: '500' },
  bottomPadding: { height: 40, backgroundColor: 'transparent' },
});
