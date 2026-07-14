import React, { useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter } from 'expo-router';
import { useGoals } from '@/context/GoalContext';

const ICONS = ['✈️', '💻', '🏠', '🚗', '💍', '📚', '🏖️', '🎓', '💰', '🎁'];

export default function AddGoalScreen() {
  const router = useRouter();
  const { addGoal } = useGoals();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('✈️');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    addGoal({
      icon: selectedIcon,
      name,
      targetAmount: parseInt(amount) || 0,
      description,
    });
    setSaved(true);
    setTimeout(() => router.back(), 1200);
  };

  if (saved) {
    return (
      <View style={styles.doneContainer}>
        <Text style={styles.doneIcon}>🌿</Text>
        <Text style={styles.doneTitle}>目標已建立</Text>
        <Text style={styles.doneDesc}>開始為「{name}」努力吧！</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Text style={styles.label}>選擇圖示</Text>
        <View style={styles.iconGrid}>
          {ICONS.map((icon) => (
            <TouchableOpacity
              key={icon}
              style={[styles.iconItem, selectedIcon === icon && styles.iconItemSelected]}
              onPress={() => setSelectedIcon(icon)}
            >
              <Text style={styles.iconText}>{icon}</Text>
            </TouchableOpacity>
          ))}
        </View>

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
          style={[styles.saveBtn, (!name || !amount) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!name || !amount}
        >
          <Text style={styles.saveBtnText}>建立目標</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F7' },
  content: { padding: 24 },
  label: { fontSize: 14, fontWeight: '500', color: '#555555', marginBottom: 10, marginTop: 20 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, backgroundColor: 'transparent' },
  iconItem: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#F4F1ED', alignItems: 'center', justifyContent: 'center',
  },
  iconItemSelected: { backgroundColor: '#222222' },
  iconText: { fontSize: 22 },
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
  doneIcon: { fontSize: 56, marginBottom: 20 },
  doneTitle: { fontSize: 24, fontWeight: '600', color: '#222222', marginBottom: 8 },
  doneDesc: { fontSize: 15, color: '#888888' },
});
