import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Text, View } from '@/components/Themed';

const MOCK_OCR_RESULT = [
  { symbol: '2330', name: '台積電', shares: 200, avgCost: 710, marketValue: 168000 },
  { symbol: '0050', name: '元大台灣50', shares: 1000, avgCost: 120, marketValue: 132000 },
  { symbol: '00919', name: '群益精選高息', shares: 800, avgCost: 21, marketValue: 19200 },
];

export default function UpdatePortfolioScreen() {
  const [step, setStep] = useState(0);
  const [imageSelected, setImageSelected] = useState(false);
  const [note, setNote] = useState('');

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);
  const reset = () => {
    setStep(0);
    setImageSelected(false);
    setNote('');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Progress */}
      <View style={styles.progressContainer}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              i <= step ? styles.progressActive : styles.progressInactive,
            ]}
          />
        ))}
      </View>

      {/* Step 0: Upload */}
      {step === 0 && (
        <View style={styles.content}>
          <Text style={styles.stepTitle}>上傳券商截圖</Text>
          <Text style={styles.stepDesc}>拍下或選擇你的持股畫面</Text>

          {!imageSelected ? (
            <TouchableOpacity
              style={styles.uploadArea}
              onPress={() => setImageSelected(true)}
            >
              <Text style={styles.uploadIcon}>📷</Text>
              <Text style={styles.uploadText}>選擇圖片</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.previewArea}>
              <View style={styles.preview}>
                <Text style={styles.previewText}>📊 已選擇截圖</Text>
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={nextStep}>
                <Text style={styles.primaryBtnText}>開始辨識</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Step 1: OCR Result */}
      {step === 1 && (
        <View style={styles.content}>
          <Text style={styles.stepTitle}>辨識結果</Text>
          <Text style={styles.stepDesc}>
            AI 偵測到 {MOCK_OCR_RESULT.length} 檔股票
          </Text>

          {MOCK_OCR_RESULT.map((stock, i) => (
            <View key={i} style={styles.stockCard}>
              <View style={styles.stockTop}>
                <Text style={styles.stockName}>{stock.name}</Text>
                <Text style={styles.stockCode}>{stock.symbol}</Text>
              </View>
              <View style={styles.stockRow}>
                <Text style={styles.stockLabel}>{stock.shares} 股</Text>
                <Text style={styles.stockValue}>
                  NT${stock.marketValue.toLocaleString()}
                </Text>
              </View>
            </View>
          ))}

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={prevStep}>
              <Text style={styles.secondaryBtnText}>重新上傳</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={nextStep}>
              <Text style={styles.primaryBtnText}>確認</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Step 2: Compare */}
      {step === 2 && (
        <View style={styles.content}>
          <Text style={styles.stepTitle}>與上次比較</Text>
          <Text style={styles.stepDesc}>本次更新的持股變化</Text>

          <View style={styles.changeCard}>
            <Text style={styles.changeLabel}>📈 增加</Text>
            <Text style={styles.changeItem}>台積電：150 → 200 股</Text>
            <Text style={styles.changeItem}>元大台灣50：900 → 1000 股</Text>
          </View>

          <View style={styles.changeCard}>
            <Text style={styles.changeLabelNeg}>📉 減少</Text>
            <Text style={styles.changeItem}>群益精選高息：1000 → 800 股</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>總市值變化</Text>
            <Text style={styles.summaryValue}>+NT$18,200</Text>
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={prevStep}>
              <Text style={styles.secondaryBtnText}>上一步</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={nextStep}>
              <Text style={styles.primaryBtnText}>下一步</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Step 3: Note */}
      {step === 3 && (
        <View style={styles.content}>
          <Text style={styles.stepTitle}>留下一句話</Text>
          <Text style={styles.stepDesc}>
            這次更新，有什麼想記住的嗎？
          </Text>

          <TextInput
            style={styles.noteInput}
            placeholder="例如：加薪了，多買了一些 ETF"
            placeholderTextColor="#BBBBBB"
            value={note}
            onChangeText={setNote}
            multiline
          />

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={prevStep}>
              <Text style={styles.secondaryBtnText}>上一步</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={nextStep}>
              <Text style={styles.primaryBtnText}>{note ? '儲存' : '跳過'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Step 4: Done */}
      {step === 4 && (
        <View style={styles.content}>
          <View style={styles.doneCenter}>
            <Text style={styles.doneIcon}>🌿</Text>
            <Text style={styles.doneTitle}>更新完成</Text>
            <Text style={styles.doneDesc}>
              投資組合已更新。{'\n'}系統將自動更新目標進度。
            </Text>

            {note ? (
              <View style={styles.notePreview}>
                <Text style={styles.notePreviewText}>"{note}"</Text>
              </View>
            ) : null}

            <TouchableOpacity style={styles.primaryBtn} onPress={reset}>
              <Text style={styles.primaryBtnText}>回到首頁</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F7',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  progressDot: {
    width: 32,
    height: 4,
    borderRadius: 2,
  },
  progressActive: {
    backgroundColor: '#222222',
  },
  progressInactive: {
    backgroundColor: '#EDEBE8',
  },
  content: {
    padding: 24,
    backgroundColor: 'transparent',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 8,
  },
  stepDesc: {
    fontSize: 15,
    color: '#888888',
    marginBottom: 24,
  },
  uploadArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 48,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  uploadIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  uploadText: {
    fontSize: 16,
    color: '#555555',
  },
  previewArea: {
    gap: 16,
    backgroundColor: 'transparent',
  },
  preview: {
    backgroundColor: '#F4F1ED',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
  },
  previewText: {
    fontSize: 18,
    color: '#555555',
  },
  stockCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  stockTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  stockName: {
    fontSize: 17,
    fontWeight: '500',
    color: '#222222',
  },
  stockCode: {
    fontSize: 13,
    color: '#BBBBBB',
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  stockLabel: {
    fontSize: 14,
    color: '#888888',
  },
  stockValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#222222',
  },
  changeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
  },
  changeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B6C9A8',
    marginBottom: 8,
  },
  changeLabelNeg: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E8A8A8',
    marginBottom: 8,
  },
  changeItem: {
    fontSize: 15,
    color: '#555555',
    paddingVertical: 4,
  },
  summaryCard: {
    backgroundColor: '#F4F1ED',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 15,
    color: '#555555',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#B6C9A8',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#222222',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#F4F1ED',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#555555',
    fontSize: 16,
    fontWeight: '500',
  },
  noteInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    fontSize: 16,
    color: '#222222',
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  doneCenter: {
    alignItems: 'center',
    paddingTop: 40,
    backgroundColor: 'transparent',
  },
  doneIcon: {
    fontSize: 56,
    marginBottom: 20,
  },
  doneTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 8,
  },
  doneDesc: {
    fontSize: 15,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  notePreview: {
    backgroundColor: '#F4F1ED',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    width: '100%',
  },
  notePreviewText: {
    fontSize: 15,
    color: '#555555',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
