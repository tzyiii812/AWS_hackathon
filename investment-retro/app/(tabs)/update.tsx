import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { Text, View } from '@/components/Themed';

// Mock data for OCR result
const MOCK_OCR_RESULT = [
  { symbol: '2330', name: '台積電', shares: 200, avgCost: 710, marketValue: 168000 },
  { symbol: '0050', name: '元大台灣50', shares: 1000, avgCost: 120, marketValue: 132000 },
  { symbol: '00919', name: '群益台灣精選高息', shares: 800, avgCost: 21, marketValue: 19200 },
];

// Mock data for previous portfolio
const MOCK_PREVIOUS = [
  { symbol: '2330', name: '台積電', shares: 150, avgCost: 710, marketValue: 126000 },
  { symbol: '0050', name: '元大台灣50', shares: 900, avgCost: 120, marketValue: 118800 },
  { symbol: '00919', name: '群益台灣精選高息', shares: 1000, avgCost: 21, marketValue: 24000 },
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
    <ScrollView style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              i <= step ? styles.progressDotActive : styles.progressDotInactive,
            ]}
          />
        ))}
      </View>
      <Text style={styles.stepLabel}>
        {step === 0 && '上傳截圖'}
        {step === 1 && '確認持股'}
        {step === 2 && '比較變化'}
        {step === 3 && '留下筆記'}
        {step === 4 && '完成！'}
      </Text>

      {/* Step 0: Upload Screenshot */}
      {step === 0 && (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>📸 上傳券商截圖</Text>
          <Text style={styles.stepDescription}>
            拍下或選擇你的券商 App 持股畫面截圖
          </Text>

          {!imageSelected ? (
            <View style={styles.uploadArea}>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => setImageSelected(true)}
              >
                <Text style={styles.uploadIcon}>📷</Text>
                <Text style={styles.uploadText}>選擇圖片</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.uploadButtonSecondary}
                onPress={() => setImageSelected(true)}
              >
                <Text style={styles.uploadIcon}>🖼️</Text>
                <Text style={styles.uploadText}>從相簿選擇</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imagePreview}>
              <View style={styles.fakePlaceholder}>
                <Text style={styles.fakePlaceholderText}>📊 券商截圖預覽</Text>
                <Text style={styles.fakePlaceholderSubtext}>(已選擇圖片)</Text>
              </View>
              <TouchableOpacity style={styles.primaryButton} onPress={nextStep}>
                <Text style={styles.primaryButtonText}>開始辨識</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Step 1: OCR Result */}
      {step === 1 && (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>✅ 辨識結果</Text>
          <Text style={styles.stepDescription}>
            AI 偵測到 {MOCK_OCR_RESULT.length} 檔股票，請確認是否正確
          </Text>

          {MOCK_OCR_RESULT.map((stock, index) => (
            <View key={index} style={styles.stockCard}>
              <View style={styles.stockHeader}>
                <Text style={styles.stockSymbol}>{stock.symbol}</Text>
                <Text style={styles.stockName}>{stock.name}</Text>
              </View>
              <View style={styles.stockDetails}>
                <View style={styles.stockDetailItem}>
                  <Text style={styles.stockLabel}>持有股數</Text>
                  <Text style={styles.stockValue}>{stock.shares} 股</Text>
                </View>
                <View style={styles.stockDetailItem}>
                  <Text style={styles.stockLabel}>平均成本</Text>
                  <Text style={styles.stockValue}>NT${stock.avgCost}</Text>
                </View>
                <View style={styles.stockDetailItem}>
                  <Text style={styles.stockLabel}>目前市值</Text>
                  <Text style={styles.stockValue}>NT${stock.marketValue.toLocaleString()}</Text>
                </View>
              </View>
            </View>
          ))}

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={prevStep}>
              <Text style={styles.secondaryButtonText}>重新上傳</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={nextStep}>
              <Text style={styles.primaryButtonText}>確認正確</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Step 2: Compare History */}
      {step === 2 && (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>📊 與上次比較</Text>
          <Text style={styles.stepDescription}>以下是本次更新的持股變化</Text>

          <View style={styles.changeCard}>
            <Text style={styles.changeTitle}>📈 增加</Text>
            <Text style={styles.changeItem}>2330 台積電：150 → 200 股 (+50)</Text>
            <Text style={styles.changeItem}>0050 元大台灣50：900 → 1000 股 (+100)</Text>
          </View>

          <View style={styles.changeCard}>
            <Text style={styles.changeTitleNeg}>📉 減少</Text>
            <Text style={styles.changeItem}>00919 群益台灣精選高息：1000 → 800 股 (-200)</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>本次摘要</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>總市值變化</Text>
              <Text style={styles.summaryPositive}>+NT$18,200</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>持股數量</Text>
              <Text style={styles.summaryValue}>3 檔（不變）</Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={prevStep}>
              <Text style={styles.secondaryButtonText}>上一步</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={nextStep}>
              <Text style={styles.primaryButtonText}>下一步</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Step 3: Optional Note */}
      {step === 3 && (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>💬 留下一句話</Text>
          <Text style={styles.stepDescription}>
            這次更新，有什麼想記住的嗎？（選填）
          </Text>

          <TextInput
            style={styles.noteInput}
            placeholder="例如：這個月加薪了，多買了一些 ETF"
            placeholderTextColor="#9CA3AF"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={prevStep}>
              <Text style={styles.secondaryButtonText}>上一步</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={nextStep}>
              <Text style={styles.primaryButtonText}>{note ? '儲存' : '跳過'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Step 4: Done */}
      {step === 4 && (
        <View style={styles.stepContent}>
          <View style={styles.doneContainer}>
            <Text style={styles.doneIcon}>🎉</Text>
            <Text style={styles.doneTitle}>更新完成！</Text>
            <Text style={styles.doneDescription}>
              你的投資組合已更新。{'\n'}
              系統將自動更新目標進度與分析。
            </Text>

            <View style={styles.doneStats}>
              <View style={styles.doneStatItem}>
                <Text style={styles.doneStatNumber}>3</Text>
                <Text style={styles.doneStatLabel}>檔股票</Text>
              </View>
              <View style={styles.doneStatItem}>
                <Text style={styles.doneStatNumber}>NT$319,200</Text>
                <Text style={styles.doneStatLabel}>總市值</Text>
              </View>
            </View>

            {note ? (
              <View style={styles.notePreview}>
                <Text style={styles.notePreviewLabel}>你的筆記</Text>
                <Text style={styles.notePreviewText}>"{note}"</Text>
              </View>
            ) : null}

            <TouchableOpacity style={styles.primaryButton} onPress={reset}>
              <Text style={styles.primaryButtonText}>回到首頁</Text>
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
    backgroundColor: '#F9FAFB',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
    backgroundColor: '#F9FAFB',
  },
  progressDot: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  progressDotActive: {
    backgroundColor: '#2563EB',
  },
  progressDotInactive: {
    backgroundColor: '#E5E7EB',
  },
  stepLabel: {
    textAlign: 'center',
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 16,
  },
  stepContent: {
    padding: 16,
    backgroundColor: '#F9FAFB',
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  uploadArea: {
    gap: 12,
    backgroundColor: 'transparent',
  },
  uploadButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#2563EB',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  uploadButtonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  uploadIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  imagePreview: {
    gap: 16,
    backgroundColor: 'transparent',
  },
  fakePlaceholder: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  fakePlaceholderText: {
    fontSize: 18,
    color: '#2563EB',
    fontWeight: '600',
  },
  fakePlaceholderSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  stockCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  stockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  stockSymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
  },
  stockName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  stockDetails: {
    gap: 6,
    backgroundColor: 'transparent',
  },
  stockDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  stockLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  stockValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  changeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  changeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 8,
  },
  changeTitleNeg: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 8,
  },
  changeItem: {
    fontSize: 14,
    color: '#374151',
    paddingVertical: 4,
  },
  summaryCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 4,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    backgroundColor: 'transparent',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#374151',
  },
  summaryPositive: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  noteInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  doneContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: 'transparent',
  },
  doneIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  doneTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  doneDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  doneStats: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 24,
    backgroundColor: 'transparent',
  },
  doneStatItem: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  doneStatNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563EB',
  },
  doneStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  notePreview: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
  },
  notePreviewLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  notePreviewText: {
    fontSize: 15,
    color: '#374151',
    fontStyle: 'italic',
  },
});
