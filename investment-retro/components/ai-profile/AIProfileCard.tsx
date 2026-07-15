import React, { useState, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAIProfile } from '@/context/AIProfileContext';
import { useGoals } from '@/context/GoalContext';
import { AIProfileQuestion } from './AIProfileQuestion';
import { AIProfileCompletionCard } from './AIProfileCompletionCard';
import { getAllQuestions, TOTAL_QUESTIONS } from '@/config/ai-profile-questions';
import type { QuestionConfig } from '@/config/ai-profile-questions';

/**
 * AI Profile Card — 顯示在 Home 的 For You 區段附近。
 * 一次只顯示一題，已回答的跳過。
 */
export function AIProfileCard() {
  const { profile, loading, dismissed, isComplete, updateField, dismiss } = useAIProfile();
  const { activeGoals } = useGoals();
  const router = useRouter();

  // 判斷是否有目標（簡化：有目標即 hasGoalDeadline）
  const hasGoalDeadline = activeGoals.length > 0;
  const allQuestions = getAllQuestions(hasGoalDeadline);

  // 找出下一個尚未回答的問題
  const nextQuestion = allQuestions.find(
    (q) => !profile.completedQuestionIds.includes(q.id)
  );

  // Feedback state
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSelect = async (question: QuestionConfig, value: string) => {
    console.log('[AIProfileCard] Option pressed:', question.id, value);
    if (saving) return;
    setSaving(true);

    try {
      await updateField(question.fieldKey, value);

      // Show feedback
      const feedbackText = question.feedback[value] || '了解了。';
      setFeedback(feedbackText);

      // Auto-dismiss feedback after 2.5s
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      feedbackTimer.current = setTimeout(() => setFeedback(null), 2500);
    } catch (err) {
      console.warn('[AIProfileCard] Failed to save:', err);
      // Still show feedback so user knows it was registered
      setFeedback('儲存失敗，請稍後再試。');
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      feedbackTimer.current = setTimeout(() => setFeedback(null), 2500);
    } finally {
      setSaving(false);
    }
  };

  const handleDismiss = () => {
    dismiss();
    setFeedback(null);
  };

  const handleEdit = () => {
    router.push('/(tabs)/me');
  };

  // Don't show while loading
  if (loading) return null;

  // All complete → show completion card
  if (isComplete) {
    return <AIProfileCompletionCard onEdit={handleEdit} />;
  }

  // Dismissed for this session
  if (dismissed) return null;

  // No next question (shouldn't happen if !isComplete, but be safe)
  if (!nextQuestion) return null;

  // Show feedback after answering
  if (feedback) {
    return (
      <View style={styles.card}>
        <Text style={styles.feedbackText}>{feedback}</Text>
      </View>
    );
  }

  // Current question index (among all questions)
  const currentIndex = allQuestions.findIndex((q) => q.id === nextQuestion.id);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>讓 AI 更了解你</Text>
      <Text style={styles.subtitle}>回答一個小問題，讓之後的分析更適合你。</Text>

      <AIProfileQuestion
        question={nextQuestion}
        currentIndex={currentIndex}
        totalCount={TOTAL_QUESTIONS}
        onSelect={(value) => handleSelect(nextQuestion, value)}
      />

      <Pressable
        style={({ pressed }) => [styles.skipBtn, pressed && styles.skipBtnPressed]}
        onPress={handleDismiss}
      >
        <Text style={styles.skipText}>稍後再說</Text>
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#AAAAAA',
    marginBottom: 16,
  },
  skipBtn: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F9F8F6',
    cursor: 'pointer' as any,
  },
  skipBtnPressed: {
    opacity: 0.7,
  },
  skipText: {
    fontSize: 14,
    color: '#AAAAAA',
  },
  feedbackText: {
    fontSize: 15,
    color: '#555555',
    lineHeight: 24,
    textAlign: 'center',
    paddingVertical: 12,
  },
});
