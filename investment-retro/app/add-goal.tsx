import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Text, View } from '@/components/Themed';
import { useRouter } from 'expo-router';
import { useGoals } from '@/context/GoalContext';
import { useAuth } from '@/context/AuthContext';
import {
  getPortfolioUploadUrl,
  uploadImageToS3,
} from '@/services/api';

export default function AddGoalScreen() {
  const router = useRouter();
  const { addGoal } = useGoals();
  const { getAccessToken } = useAuth();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const pickImage = async () => {
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
      setImageUri(normalized.uri);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let imageKey: string | null = null;

      if (imageUri) {
        const token = await getAccessToken();
        const fileName = `goal-${Date.now()}.jpg`;
        const upload = await getPortfolioUploadUrl(token, fileName, 'image/jpeg');
        console.log('[AddGoal] Upload URL response - key:', upload.key);
        await uploadImageToS3(upload, imageUri, 'image/jpeg');
        console.log('[AddGoal] Image uploaded successfully to S3');
        imageKey = upload.key;
      }

      await addGoal({
        icon: '',
        name,
        targetAmount: parseInt(amount) || 0,
        description,
        imageKey,
      });
      console.log('[AddGoal] Goal created with imageKey:', imageKey);
      setSaved(true);
      setTimeout(() => router.back(), 1200);
    } catch (err) {
      console.error('[AddGoal] Error saving goal:', err);
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <View style={styles.doneContainer}>
        <Text style={styles.doneTitle}>目標已建立</Text>
        <Text style={styles.doneDesc}>開始為「{name}」努力吧！</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Text style={styles.label}>目標照片（選填）</Text>
        <Text style={styles.hint}>上傳一張代表這個目標的照片，激勵自己！</Text>

        {imageUri ? (
          <View style={styles.imagePreview}>
            <Image source={{ uri: imageUri }} style={styles.previewImg} />
            <TouchableOpacity style={styles.changeImgBtn} onPress={pickImage}>
              <Text style={styles.changeImgText}>更換照片</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            <Text style={styles.imagePickerText}>選擇照片</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.label}>目標名稱</Text>
        <TextInput
          style={styles.input}
          placeholder="例如：日本旅行"
          placeholderTextColor="#BBBBBB"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>目標金額</Text>
        <TextInput
          style={styles.input}
          placeholder="例如：200000"
          placeholderTextColor="#BBBBBB"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
        />

        <Text style={styles.label}>描述（選填）</Text>
        <TextInput
          style={styles.input}
          placeholder="例如：和朋友一起去東京"
          placeholderTextColor="#BBBBBB"
          value={description}
          onChangeText={setDescription}
        />

        <TouchableOpacity
          style={[styles.saveBtn, (!name || !amount || saving) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!name || !amount || saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>建立目標</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F7' },
  content: { padding: 24 },
  label: { fontSize: 14, fontWeight: '500', color: '#555555', marginBottom: 10, marginTop: 20 },
  hint: { fontSize: 13, color: '#AAAAAA', marginBottom: 12, marginTop: -6 },
  imagePicker: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 28,
    alignItems: 'center', borderWidth: 2, borderColor: '#F0EDE8', borderStyle: 'dashed',
  },
  imagePickerText: { fontSize: 14, color: '#AAAAAA' },
  imagePreview: { borderRadius: 16, overflow: 'hidden' },
  previewImg: { width: '100%', height: 180, borderRadius: 16 },
  changeImgBtn: {
    position: 'absolute', bottom: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  changeImgText: { color: '#FFFFFF', fontSize: 12, fontWeight: '500' },
  input: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, fontSize: 16, color: '#222222',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  saveBtn: {
    backgroundColor: '#222222', borderRadius: 999, paddingVertical: 16, alignItems: 'center', marginTop: 32,
  },
  saveBtnDisabled: { backgroundColor: '#EDEBE8' },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
  doneContainer: {
    flex: 1, backgroundColor: '#FAF9F7', alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  doneTitle: { fontSize: 24, fontWeight: '600', color: '#222222', marginBottom: 8 },
  doneDesc: { fontSize: 15, color: '#888888' },
});
