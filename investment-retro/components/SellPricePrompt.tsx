/**
 * SellPricePrompt — 偵測到未確認的賣出時，彈出 Modal 詢問使用者賣出價格
 *
 * 使用方式：
 *   <SellPricePrompt pendingTrades={trades} onComplete={refresh} />
 *
 * 會依序顯示每一筆未確認的賣出，使用者可以：
 *   1. 輸入賣出價格 → 確認
 *   2. 跳過（該筆不計入已實現損益）
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import {
  confirmSellPrice,
  skipSellPrice,
} from '@/services/sellPriceStore';

export type PendingTrade = {
  symbol: string;
  name: string;
  yearMonth: string;
  soldShares: number;
  isFullSell: boolean;
  avgCost: number;
};

type Props = {
  /** 尚未確認賣出價格的交易清單 */
  pendingTrades: PendingTrade[];
  /** 全部處理完畢或每筆處理後的回呼（用來觸發重新計算） */
  onComplete: () => void;
};

export function SellPricePrompt({ pendingTrades, onComplete }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [visible, setVisible] = useState(false);

  // 當有新的 pending trades 時重設
  useEffect(() => {
    if (pendingTrades.length > 0) {
      setCurrentIndex(0);
      setInputValue('');
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [pendingTrades]);

  const current = pendingTrades[currentIndex] ?? null;

  const handleNext = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < pendingTrades.length) {
      setCurrentIndex(nextIndex);
      setInputValue('');
    } else {
      setVisible(false);
      onComplete();
    }
  }, [currentIndex, pendingTrades.length, onComplete]);

  const handleConfirm = useCallback(async () => {
    if (!current) return;

    const price = parseFloat(inputValue);
    if (isNaN(price) || price <= 0) return;

    setSubmitting(true);
    await confirmSellPrice(current.symbol, current.yearMonth, price, current.soldShares);
    setSubmitting(false);
    handleNext();
  }, [current, inputValue, handleNext]);

  const handleSkip = useCallback(async () => {
    if (!current) return;

    setSubmitting(true);
    await skipSellPrice(current.symbol, current.yearMonth, current.soldShares);
    setSubmitting(false);
    handleNext();
  }, [current, handleNext]);

  if (!current || !visible) return null;

  const parsedPrice = parseFloat(inputValue);
  const isValidPrice = !isNaN(parsedPrice) && parsedPrice > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.card}>
          <Text style={styles.title}>確認賣出價格</Text>
          <Text style={styles.description}>
            偵測到你在 {current.yearMonth} {current.isFullSell ? '清倉' : '減碼'}了：
          </Text>

          <View style={styles.tradeInfo}>
            <Text style={styles.tradeName}>{current.name}（{current.symbol}）</Text>
            <Text style={styles.tradeDetail}>
              賣出 {current.soldShares.toLocaleString('zh-TW')} 股・均成本 NT${current.avgCost.toLocaleString('zh-TW')}
            </Text>
          </View>

          <Text style={styles.inputLabel}>賣出均價（NT$）</Text>
          <TextInput
            style={styles.input}
            value={inputValue}
            onChangeText={setInputValue}
            placeholder="例如 150.5"
            placeholderTextColor="#CCCCCC"
            keyboardType="decimal-pad"
            autoFocus
            editable={!submitting}
          />

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              disabled={submitting}
            >
              <Text style={styles.skipButtonText}>跳過</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, !isValidPrice && styles.confirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={!isValidPrice || submitting}
            >
              <Text style={styles.confirmButtonText}>確認</Text>
            </TouchableOpacity>
          </View>

          {pendingTrades.length > 1 ? (
            <Text style={styles.progress}>
              {currentIndex + 1} / {pendingTrades.length}
            </Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 16,
  },
  tradeInfo: {
    backgroundColor: '#F9F8F6',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  tradeName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#222222',
  },
  tradeDetail: {
    fontSize: 13,
    color: '#888888',
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9F8F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '500',
    color: '#222222',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    marginBottom: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'transparent',
  },
  skipButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    backgroundColor: '#F4F1ED',
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#888888',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    backgroundColor: '#222222',
  },
  confirmButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  progress: {
    marginTop: 14,
    fontSize: 12,
    color: '#BBBBBB',
    textAlign: 'center',
  },
});
