import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AIProfileOption } from './AIProfileOption';
import type { QuestionConfig } from '@/config/ai-profile-questions';

type Props = {
  question: QuestionConfig;
  currentIndex: number;
  totalCount: number;
  selectedValue?: string | null;
  onSelect: (value: string) => void;
};

export function AIProfileQuestion({
  question,
  currentIndex,
  totalCount,
  selectedValue,
  onSelect,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.progress}>
        {currentIndex + 1} / {totalCount}
      </Text>
      <Text style={styles.questionText}>{question.question}</Text>
      {question.hint ? (
        <Text style={styles.hint}>{question.hint}</Text>
      ) : null}
      <View style={styles.options}>
        {question.options.map((opt) => (
          <AIProfileOption
            key={opt.value}
            label={opt.label}
            selected={selectedValue === opt.value}
            onPress={() => onSelect(opt.value)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // no background, fully transparent
  },
  progress: {
    fontSize: 12,
    color: '#AAAAAA',
    marginBottom: 8,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 6,
    lineHeight: 24,
  },
  hint: {
    fontSize: 12,
    color: '#AAAAAA',
    marginBottom: 12,
    lineHeight: 18,
  },
  options: {
    marginTop: 12,
  },
});
