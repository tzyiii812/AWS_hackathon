import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  onEdit: () => void;
};

export function AIProfileCompletionCard({ onEdit }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{'✨ AI preferences completed'}</Text>
      <Text style={styles.desc}>
        之後的分析會參考你的投資方式與目標。
      </Text>
      <Pressable
        style={({ pressed }) => [styles.editBtn, pressed && styles.editBtnPressed]}
        onPress={onEdit}
      >
        <Text style={styles.editBtnText}>查看或修改</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 6,
  },
  desc: {
    fontSize: 14,
    color: '#888888',
    lineHeight: 21,
  },
  editBtn: {
    marginTop: 14,
    cursor: 'pointer' as any,
  },
  editBtnPressed: {
    opacity: 0.7,
  },
  editBtnText: {
    fontSize: 14,
    color: '#AFC8E8',
    fontWeight: '500',
  },
});
