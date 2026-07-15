import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  label: string;
  selected?: boolean;
  onPress: () => void;
};

export function AIProfileOption({ label, selected, onPress }: Props) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      onPress={() => {
        console.log('[AIProfileOption] Pressed:', label);
        onPress();
      }}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.option,
        selected && styles.optionSelected,
        pressed && styles.optionPressed,
      ]}
      accessible={true}
      accessibilityRole="button"
    >
      <View pointerEvents="none">
        <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F5F3F0',
    marginBottom: 8,
    ...Platform.select({
      web: { cursor: 'pointer', userSelect: 'none' } as any,
      default: {},
    }),
  },
  optionSelected: {
    backgroundColor: '#E8F0E2',
    borderWidth: 1,
    borderColor: '#86A874',
  },
  optionPressed: {
    opacity: 0.7,
    backgroundColor: '#EBE9E6',
  },
  optionText: {
    fontSize: 15,
    color: '#333333',
  },
  optionTextSelected: {
    color: '#4A7A3A',
    fontWeight: '500',
  },
});
