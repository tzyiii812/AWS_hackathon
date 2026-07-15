import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Modal,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Text, View } from '@/components/Themed';
import { useRouter } from 'expo-router';
import { useGoals, type Goal } from '@/context/GoalContext';
import { useAuth } from '@/context/AuthContext';
import { usePortfolio } from '@/context/PortfolioContext';
import { usePortfolioPnL } from '@/hooks/usePortfolioPnL';
import { useRealizedPnL } from '@/hooks/useRealizedPnL';
import {
  getPortfolioUploadUrl,
  getImageReadUrl,
  uploadImageToS3,
} from '@/services/api';

/** Cached presigned URLs for goal images */
const imageUrlCache: Record<string, string> = {};

/** Build a displayable URL from an S3 key (async, uses presigned URL) */
function useImageUrls(keys: (string | null | undefined)[], getToken: () => Promise<string>): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});

  const validKeys = keys.filter((k): k is string => !!k);

  React.useEffect(() => {
    if (validKeys.length === 0) return;

    const toFetch = validKeys.filter((k) => !imageUrlCache[k]);
    if (toFetch.length === 0) {
      // All already cached, just make sure state reflects it
      const cached: Record<string, string> = {};
      for (const k of validKeys) {
        if (imageUrlCache[k]) cached[k] = imageUrlCache[k];
      }
      setUrls(cached);
      return;
    }

    let cancelled = false;

    (async () => {
      const token = await getToken();
      const results = await Promise.all(
        toFetch.map(async (key) => {
          try {
            const url = await getImageReadUrl(key, token);
            console.log('[useImageUrls] Resolved key:', key, '→ URL length:', url.length);
            return { key, url };
          } catch (err) {
            console.warn('[useImageUrls] Failed to resolve key:', key, err);
            return { key, url: '' };
          }
        })
      );

      if (cancelled) return;

      const newUrls: Record<string, string> = {};
      for (const { key, url } of results) {
        if (url) {
          imageUrlCache[key] = url;
          newUrls[key] = url;
        }
      }

      // Merge with any already-cached ones
      const all: Record<string, string> = {};
      for (const k of validKeys) {
        if (imageUrlCache[k]) all[k] = imageUrlCache[k];
      }
      setUrls(all);
    })();

    return () => { cancelled = true; };
  }, [validKeys.join('|')]);

  return urls;
}

export default function MeScreen() {
  const router = useRouter();
  const { activeGoals, completedGoals, completedCount, updateGoal, deleteGoal } = useGoals();
  const { session, signOut, getAccessToken } = useAuth();
  const { latest } = usePortfolio();
  const pnl = usePortfolioPnL();
  const realized = useRealizedPnL();
  const displayName = session?.username?.split('@')[0] || 'Investor';

  // Resolve presigned URLs for all goal images
  const allImageKeys = [
    ...activeGoals.map((g) => g.imageKey),
    ...completedGoals.map((g) => g.achievementImageKey),
    ...completedGoals.map((g) => g.imageKey),
  ];
  const resolvedImages = useImageUrls(allImageKeys, getAccessToken);

  // Track images that failed to load
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const onImageError = (key: string) => {
    console.warn('[MeScreen] Image failed to load, key:', key);
    setFailedImages((prev) => new Set(prev).add(key));
  };

  // Edit modal state
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editImageUri, setEditImageUri] = useState<string | null>(null);
  const [editImageChanged, setEditImageChanged] = useState(false);
  const [saving, setSaving] = useState(false);

  // Achievement photo modal
  const [achieveGoal, setAchieveGoal] = useState<Goal | null>(null);
  const [achieveImageUri, setAchieveImageUri] = useState<string | null>(null);
  const [achieveSaving, setAchieveSaving] = useState(false);

  // Progress calculation: use profit (unrealized PnL + realized PnL)
  const totalProfit =
    (pnl.unrealizedPnL ?? 0) + (realized.totalRealizedPnL ?? 0);

  const openEdit = (goal: Goal) => {
    setEditGoal(goal);
    setEditName(goal.name);
    setEditAmount(String(goal.targetAmount));
    setEditDesc(goal.description || '');
    setEditImageUri(null);
    setEditImageChanged(false);
  };

  const pickEditImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const actions = asset.width > 1200 ? [{ resize: { width: 1200 } }] : [];
      const normalized = await manipulateAsync(asset.uri, actions, {
        compress: 0.8,
        format: SaveFormat.JPEG,
      });
      setEditImageUri(normalized.uri);
      setEditImageChanged(true);
    }
  };

  const saveEdit = async () => {
    if (!editGoal) return;
    setSaving(true);

    try {
      let imageKey = editGoal.imageKey ?? null;

      if (editImageChanged && editImageUri) {
        const token = await getAccessToken();
        const fileName = `goal-${editGoal.id}-${Date.now()}.jpg`;
        const upload = await getPortfolioUploadUrl(token, fileName, 'image/jpeg');
        await uploadImageToS3(upload, editImageUri, 'image/jpeg');
        imageKey = upload.key;
      }

      await updateGoal(editGoal.id, {
        name: editName,
        targetAmount: parseInt(editAmount) || 0,
        description: editDesc,
        ...(editImageChanged ? { imageKey } : {}),
      });
      setEditGoal(null);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (goal: Goal) => {
    Alert.alert(
      '刪除目標',
      `確定要刪除「${goal.name}」嗎？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '刪除',
          style: 'destructive',
          onPress: () => deleteGoal(goal.id),
        },
      ]
    );
  };

  // Complete goal flow: ask for achievement photo
  const startComplete = (goal: Goal) => {
    setAchieveGoal(goal);
    setAchieveImageUri(null);
  };

  const pickAchieveImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const actions = asset.width > 1200 ? [{ resize: { width: 1200 } }] : [];
      const normalized = await manipulateAsync(asset.uri, actions, {
        compress: 0.8,
        format: SaveFormat.JPEG,
      });
      setAchieveImageUri(normalized.uri);
    }
  };

  const confirmComplete = async () => {
    if (!achieveGoal) return;
    setAchieveSaving(true);

    try {
      let achievementImageKey: string | null = null;

      if (achieveImageUri) {
        const token = await getAccessToken();
        const fileName = `goal-achieve-${achieveGoal.id}-${Date.now()}.jpg`;
        const upload = await getPortfolioUploadUrl(token, fileName, 'image/jpeg');
        await uploadImageToS3(upload, achieveImageUri, 'image/jpeg');
        achievementImageKey = upload.key;
      }

      await updateGoal(achieveGoal.id, {
        completed: true,
        ...(achievementImageKey ? { achievementImageKey } : {}),
      });
      setAchieveGoal(null);
    } catch {
      // silent
    } finally {
      setAchieveSaving(false);
    }
  };

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
          <Text style={styles.statNumber}>{activeGoals.length}</Text>
          <Text style={styles.statLabel}>進行中目標</Text>
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

        {activeGoals.map((goal, i) => {
          const progress = goal.targetAmount > 0
            ? Math.min((totalProfit / goal.targetAmount) * 100, 100)
            : 0;
          const goalImgKey = goal.imageKey;
          const goalImg = goalImgKey && !failedImages.has(goalImgKey) ? resolvedImages[goalImgKey] : null;

          const cardContent = (
            <View style={styles.goalCardOverlay}>
              <View style={styles.goalCardTop}>
                <View style={styles.goalCardInfo}>
                  <Text style={goalImg ? styles.goalNameLight : styles.goalName}>{goal.name}</Text>
                  <Text style={goalImg ? styles.goalAmountLight : styles.goalAmount}>
                    NT${goal.targetAmount.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.goalActions}>
                  {progress >= 100 && (
                    <TouchableOpacity
                      style={styles.completeBtn}
                      onPress={() => startComplete(goal)}
                    >
                      <Text style={styles.completeBtnText}>達成</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={goalImg ? styles.deleteBtnLight : styles.deleteBtn}
                    onPress={() => handleDelete(goal)}
                  >
                    <Text style={goalImg ? styles.deleteBtnTextLight : styles.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.goalCardBottom}>
                <View style={goalImg ? styles.progressBarLight : styles.progressBar}>
                  <View
                    style={[
                      goalImg ? styles.progressFillLight : styles.progressFill,
                      { width: `${Math.max(progress, 0)}%` },
                      progress >= 100 ? styles.progressComplete : null,
                    ]}
                  />
                </View>
                <Text style={goalImg ? styles.progressTextLight : styles.progressText}>
                  {progress >= 100
                    ? '🎉 已達標！'
                    : `獲利進度 ${progress.toFixed(0)}%（NT$${totalProfit.toLocaleString('zh-TW')}）`}
                </Text>
              </View>
            </View>
          );

          return (
            <TouchableOpacity
              key={goal.id}
              activeOpacity={0.7}
              onPress={() => openEdit(goal)}
              style={[styles.goalCardWrapper, i < activeGoals.length - 1 && { marginBottom: 12 }]}
            >
              {goalImg ? (
                <ImageBackground
                  source={{ uri: goalImg }}
                  style={styles.goalCardBg}
                  imageStyle={styles.goalCardBgImage}
                  onError={() => goalImgKey && onImageError(goalImgKey)}
                >
                  <View style={styles.goalCardDarkOverlay}>
                    {cardContent}
                  </View>
                </ImageBackground>
              ) : (
                <View style={styles.goalCardNoImage}>
                  {cardContent}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>已完成的目標 🎉</Text>
          {completedGoals.map((goal) => {
            const achImgKey = goal.achievementImageKey || goal.imageKey;
            const achImg = achImgKey && !failedImages.has(achImgKey) ? resolvedImages[achImgKey] : null;
            return (
              <View key={goal.id} style={styles.completedCardWrapper}>
                {achImg ? (
                  <ImageBackground
                    source={{ uri: achImg }}
                    style={styles.completedCardBg}
                    imageStyle={styles.goalCardBgImage}
                    onError={() => achImgKey && onImageError(achImgKey)}
                  >
                    <View style={styles.completedCardOverlay}>
                      <Text style={styles.completedNameLight}>{goal.name}</Text>
                    </View>
                  </ImageBackground>
                ) : (
                  <View style={styles.completedItem}>
                    <Text style={styles.completedName}>{goal.name}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Settings */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>設定</Text>
        <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
          <Text style={styles.signOutText}>登出</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomPadding} />

      {/* Edit Goal Modal */}
      <Modal visible={editGoal !== null} transparent animationType="fade">
        <ScrollView contentContainerStyle={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>編輯目標</Text>

            <Text style={styles.modalLabel}>目標照片</Text>
            {editImageUri || editGoal?.imageKey ? (
              <View style={styles.modalImagePreview}>
                <Image
                  source={{ uri: editImageUri || (editGoal?.imageKey ? resolvedImages[editGoal.imageKey] : '') || '' }}
                  style={styles.modalPreviewImg}
                />
                <TouchableOpacity style={styles.modalChangeImg} onPress={pickEditImage}>
                  <Text style={styles.modalChangeImgText}>更換</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.modalImagePicker} onPress={pickEditImage}>
                <Text style={styles.modalImagePickerText}>📷 選擇照片</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.modalLabel}>名稱</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="目標名稱"
              placeholderTextColor="#CCCCCC"
            />

            <Text style={styles.modalLabel}>金額</Text>
            <TextInput
              style={styles.modalInput}
              value={editAmount}
              onChangeText={setEditAmount}
              keyboardType="numeric"
              placeholder="目標金額"
              placeholderTextColor="#CCCCCC"
            />

            <Text style={styles.modalLabel}>描述</Text>
            <TextInput
              style={styles.modalInput}
              value={editDesc}
              onChangeText={setEditDesc}
              placeholder="描述（選填）"
              placeholderTextColor="#CCCCCC"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditGoal(null)}
              >
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, saving && styles.modalSaveBtnDisabled]}
                onPress={saveEdit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>儲存</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </Modal>

      {/* Achievement Photo Modal */}
      <Modal visible={achieveGoal !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🎉 恭喜達成目標！</Text>
            <Text style={styles.achieveDesc}>
              上傳一張達成照片紀念這個時刻吧！
            </Text>

            {achieveImageUri ? (
              <View style={styles.modalImagePreview}>
                <Image source={{ uri: achieveImageUri }} style={styles.modalPreviewImg} />
                <TouchableOpacity style={styles.modalChangeImg} onPress={pickAchieveImage}>
                  <Text style={styles.modalChangeImgText}>更換</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.modalImagePicker} onPress={pickAchieveImage}>
                <Text style={styles.modalImagePickerText}>📷 選擇達成照片</Text>
              </TouchableOpacity>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  // Complete without photo
                  confirmComplete();
                }}
              >
                <Text style={styles.modalCancelText}>跳過</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, achieveSaving && styles.modalSaveBtnDisabled]}
                onPress={confirmComplete}
                disabled={achieveSaving}
              >
                {achieveSaving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>完成</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  addBtn: { fontSize: 14, color: '#86A874', fontWeight: '500' },
  emptyText: { fontSize: 15, color: '#BBBBBB', textAlign: 'center', paddingVertical: 12 },
  // Goal card with background image
  goalCardWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  goalCardBg: {
    width: '100%',
    minHeight: 120,
  },
  goalCardBgImage: {
    borderRadius: 16,
  },
  goalCardDarkOverlay: {
    backgroundColor: 'rgba(0,0,0,0.40)',
    borderRadius: 16,
    padding: 16,
  },
  goalCardNoImage: {
    backgroundColor: '#F9F8F6',
    borderRadius: 16,
    padding: 16,
  },
  goalCardOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  goalCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
  },
  goalCardInfo: { flex: 1, backgroundColor: 'transparent' },
  goalCardBottom: { marginTop: 12, backgroundColor: 'transparent' },
  goalName: { fontSize: 16, color: '#222222', fontWeight: '600' },
  goalNameLight: { fontSize: 16, color: '#FFFFFF', fontWeight: '600' },
  goalAmount: { fontSize: 13, color: '#BBBBBB', marginTop: 4 },
  goalAmountLight: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  progressBar: {
    height: 4, borderRadius: 2, backgroundColor: '#F0EDE8',
    overflow: 'hidden',
  },
  progressBarLight: {
    height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: '#86A874' },
  progressFillLight: { height: 4, borderRadius: 2, backgroundColor: '#FFFFFF' },
  progressComplete: { backgroundColor: '#6B9E5B' },
  progressText: { fontSize: 11, color: '#AAAAAA', marginTop: 4 },
  progressTextLight: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  goalActions: {
    flexDirection: 'column', alignItems: 'center', gap: 6,
    marginLeft: 8, backgroundColor: 'transparent',
  },
  completeBtn: {
    backgroundColor: '#86A874', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  completeBtnText: { fontSize: 11, color: '#FFFFFF', fontWeight: '600' },
  deleteBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#F9F8F6', alignItems: 'center', justifyContent: 'center',
  },
  deleteBtnText: { fontSize: 14, color: '#CCCCCC' },
  deleteBtnLight: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  deleteBtnTextLight: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  completedCardWrapper: {
    borderRadius: 12, overflow: 'hidden', marginBottom: 10,
  },
  completedCardBg: {
    width: '100%', height: 64,
  },
  completedCardOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 12, justifyContent: 'center', paddingHorizontal: 16,
  },
  completedNameLight: { fontSize: 15, color: '#FFFFFF', fontWeight: '500' },
  completedItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, backgroundColor: 'transparent',
  },
  completedName: { fontSize: 15, color: '#BBBBBB', textDecorationLine: 'line-through' },
  signOutButton: { paddingTop: 8, alignItems: 'center' },
  signOutText: { fontSize: 15, color: '#C47777', fontWeight: '500' },
  bottomPadding: { height: 40, backgroundColor: 'transparent' },

  // Modal shared
  modalOverlay: {
    flexGrow: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 28,
    width: '100%', maxWidth: 360,
  },
  modalTitle: { fontSize: 20, fontWeight: '600', color: '#222222', marginBottom: 16 },
  modalLabel: { fontSize: 13, color: '#888888', marginBottom: 6, marginTop: 14 },
  modalInput: {
    backgroundColor: '#F9F8F6', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, color: '#222222',
  },
  modalImagePicker: {
    backgroundColor: '#F9F8F6', borderRadius: 12, padding: 20,
    alignItems: 'center', borderWidth: 1, borderColor: '#F0EDE8', borderStyle: 'dashed',
  },
  modalImagePickerText: { fontSize: 14, color: '#AAAAAA' },
  modalImagePreview: { borderRadius: 12, overflow: 'hidden' },
  modalPreviewImg: { width: '100%', height: 140, borderRadius: 12 },
  modalChangeImg: {
    position: 'absolute', bottom: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  modalChangeImgText: { color: '#FFFFFF', fontSize: 11, fontWeight: '500' },
  modalButtons: {
    flexDirection: 'row', gap: 12, marginTop: 24, backgroundColor: 'transparent',
  },
  modalCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 999,
    alignItems: 'center', backgroundColor: '#F4F1ED',
  },
  modalCancelText: { fontSize: 15, color: '#888888', fontWeight: '500' },
  modalSaveBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 999,
    alignItems: 'center', backgroundColor: '#222222',
  },
  modalSaveBtnDisabled: { backgroundColor: '#CCCCCC' },
  modalSaveText: { fontSize: 15, color: '#FFFFFF', fontWeight: '600' },
  achieveDesc: { fontSize: 14, color: '#666666', marginBottom: 16 },
});
