import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  manipulateAsync,
  SaveFormat,
} from 'expo-image-manipulator';
import { useRouter } from 'expo-router';
import { Text, View } from '@/components/Themed';
import { useAuth } from '@/context/AuthContext';
import { usePortfolio } from '@/context/PortfolioContext';
import { usePortfolioHistory } from '@/context/PortfolioHistoryContext';
import { APP_CURRENT_YEAR_MONTH } from '@/config/appDate';
import {
  createPortfolio,
  getPortfolioUploadUrl,
  PortfolioHolding,
  runPortfolioOcr,
  uploadImageToS3,
} from '@/services/api';
import {
  confirmSellPrice,
  skipSellPrice,
} from '@/services/sellPriceStore';

type SelectedImage = {
  uri: string;
  width: number;
  height: number;
};

type EditableHolding = {
  symbol: string;
  name: string;
  shares: string;
  avgCost: string;
  marketValue: string;
  pnl: string;
};

type HoldingChange = {
  symbol: string;
  name: string;
  previousShares: number;
  currentShares: number;
};

const toEditableHolding = (holding: PortfolioHolding): EditableHolding => ({
  symbol: holding.symbol ?? '',
  name: holding.name ?? '',
  shares: holding.shares === null || holding.shares === undefined ? '' : String(holding.shares),
  avgCost:
    holding.avgCost === null || holding.avgCost === undefined
      ? ''
      : String(holding.avgCost),
  marketValue:
    holding.marketValue === null || holding.marketValue === undefined
      ? ''
      : String(holding.marketValue),
  pnl: holding.pnl === null || holding.pnl === undefined ? '' : String(holding.pnl),
});

const parseNumber = (value: string, fallback = 0) => {
  const normalized = value.replace(/,/g, '').trim();

  if (!normalized) {
    return fallback;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toPortfolioHolding = (holding: EditableHolding): PortfolioHolding => ({
  symbol: holding.symbol.trim().toUpperCase(),
  name: holding.name.trim() || null,
  shares: parseNumber(holding.shares),
  avgCost: holding.avgCost.trim() ? parseNumber(holding.avgCost) : null,
  marketValue: holding.marketValue.trim() ? parseNumber(holding.marketValue) : null,
  pnl: holding.pnl.trim() ? parseNumber(holding.pnl) : null,
});

const formatMoney = (value: number) =>
  `NT$${Math.round(value).toLocaleString('zh-TW')}`;

export default function UpdatePortfolioScreen() {
  const router = useRouter();
  const { getAccessToken } = useAuth();
  const { latest, setLatest } = usePortfolio();
  const { refresh: refreshHistory } = usePortfolioHistory();
  const [step, setStep] = useState(0);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [screenshotKey, setScreenshotKey] = useState<string | null>(null);
  const [holdings, setHoldings] = useState<EditableHolding[]>([]);
  const [currency, setCurrency] = useState('TWD');
  const [broker, setBroker] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyMessage, setBusyMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // 賣出確認狀態：key = symbol, value = { confirmed, sellPrice }
  const [sellConfirmations, setSellConfirmations] = useState<
    Record<string, { status: 'pending' | 'confirmed' | 'skipped' | 'not_sold' | 'price_done'; sellPrice: string }>
  >({});

  const parsedHoldings = useMemo(
    () => holdings.map(toPortfolioHolding),
    [holdings]
  );

  const totalMarketValue = useMemo(
    () =>
      parsedHoldings.reduce(
        (sum, holding) => sum + (holding.marketValue ?? 0),
        0
      ),
    [parsedHoldings]
  );

  // 嚴格公式：totalCost = Σ (shares × avgCost)，只計入有 avgCost 且 shares > 0 的股票
  const totalCost = useMemo(
    () =>
      parsedHoldings.reduce((sum, h) => {
        if (h.avgCost != null && h.shares > 0) {
          return sum + h.avgCost * h.shares;
        }
        return sum;
      }, 0),
    [parsedHoldings]
  );

  // 嚴格公式：totalPnL = totalMarketValue - totalCost（未實現損益）
  const totalPnL = useMemo(
    () => (totalCost > 0 ? totalMarketValue - totalCost : 0),
    [totalMarketValue, totalCost]
  );

  const comparison = useMemo(() => {
    const previousBySymbol = new Map(
      (latest?.holdings ?? []).map((holding) => [
        holding.symbol.toUpperCase(),
        holding,
      ])
    );
    const currentBySymbol = new Map(
      parsedHoldings.map((holding) => [holding.symbol.toUpperCase(), holding])
    );
    const increased: HoldingChange[] = [];
    const decreased: HoldingChange[] = [];

    for (const current of parsedHoldings) {
      if (!current.symbol) continue;

      const previous = previousBySymbol.get(current.symbol.toUpperCase());
      const previousShares = previous?.shares ?? 0;

      if (current.shares > previousShares) {
        increased.push({
          symbol: current.symbol,
          name: current.name || current.symbol,
          previousShares,
          currentShares: current.shares,
        });
      } else if (current.shares < previousShares) {
        decreased.push({
          symbol: current.symbol,
          name: current.name || current.symbol,
          previousShares,
          currentShares: current.shares,
        });
      }
    }

    for (const previous of latest?.holdings ?? []) {
      if (!currentBySymbol.has(previous.symbol.toUpperCase()) && previous.shares > 0) {
        decreased.push({
          symbol: previous.symbol,
          name: previous.name || previous.symbol,
          previousShares: previous.shares,
          currentShares: 0,
        });
      }
    }

    return {
      increased,
      decreased,
      marketValueChange: totalMarketValue - (latest?.totalMarketValue ?? 0),
      hasPrevious: Boolean(latest),
    };
  }, [latest, parsedHoldings, totalMarketValue]);

  const reset = () => {
    setStep(0);
    setSelectedImage(null);
    setScreenshotKey(null);
    setHoldings([]);
    setCurrency('TWD');
    setBroker(null);
    setConfidence(null);
    setNote('');
    setError(null);
    setBusy(false);
    setBusyMessage('');
    setSellConfirmations({});
  };

  const pickImage = async () => {
    setError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setError('需要相簿權限才能選擇券商截圖。');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      allowsMultipleSelection: false,
      quality: 0.9,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    const asset = result.assets[0];
    setBusy(true);
    setBusyMessage('正在整理圖片格式…');

    try {
      const actions = asset.width > 1800 ? [{ resize: { width: 1800 } }] : [];
      const normalized = await manipulateAsync(asset.uri, actions, {
        compress: 0.82,
        format: SaveFormat.JPEG,
      });

      setSelectedImage({
        uri: normalized.uri,
        width: normalized.width,
        height: normalized.height,
      });
      setScreenshotKey(null);
      setHoldings([]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '圖片處理失敗。');
    } finally {
      setBusy(false);
      setBusyMessage('');
    }
  };

  const startRecognition = async () => {
    if (!selectedImage) {
      setError('請先選擇圖片。');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const token = await getAccessToken();
      const fileName = `portfolio-${Date.now()}.jpg`;

      setBusyMessage('正在取得安全上傳網址…');
      const upload = await getPortfolioUploadUrl(token, fileName, 'image/jpeg');

      setBusyMessage('正在上傳券商截圖…');
      await uploadImageToS3(upload, selectedImage.uri, 'image/jpeg');

      setBusyMessage('AI 正在辨識持股…');
      const ocr = await runPortfolioOcr(token, upload.key);

      if (!Array.isArray(ocr.result.holdings) || ocr.result.holdings.length === 0) {
        throw new Error('AI 沒有辨識到持股，請換一張更清楚的截圖。');
      }

      setScreenshotKey(upload.key);
      setHoldings(ocr.result.holdings.map(toEditableHolding));
      setCurrency(ocr.result.currency || 'TWD');
      setBroker(ocr.result.broker ?? null);
      setConfidence(ocr.result.confidence ?? null);
      setStep(1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'OCR 辨識失敗。');
    } finally {
      setBusy(false);
      setBusyMessage('');
    }
  };

  const updateHolding = (
    index: number,
    field: keyof EditableHolding,
    value: string
  ) => {
    setHoldings((current) =>
      current.map((holding, holdingIndex) =>
        holdingIndex === index ? { ...holding, [field]: value } : holding
      )
    );
  };

  const removeHolding = (index: number) => {
    setHoldings((current) => current.filter((_, holdingIndex) => holdingIndex !== index));
  };

  const addHolding = () => {
    setHoldings((current) => [
      ...current,
      {
        symbol: '',
        name: '',
        shares: '',
        avgCost: '',
        marketValue: '',
        pnl: '',
      },
    ]);
  };

  const confirmOcr = () => {
    const invalidIndex = parsedHoldings.findIndex(
      (holding) => !holding.symbol || holding.shares < 0
    );

    if (invalidIndex >= 0) {
      setError(`第 ${invalidIndex + 1} 筆持股需要股票代號，股數不能小於 0。`);
      return;
    }

    if (parsedHoldings.length === 0) {
      setError('至少需要保留一筆持股。');
      return;
    }

    // 初始化賣出確認狀態（只針對消失或減少的股票）
    const currentBySymbol = new Map(
      parsedHoldings.map((h) => [h.symbol.toUpperCase(), h])
    );
    const newConfirmations: typeof sellConfirmations = {};
    for (const prev of latest?.holdings ?? []) {
      if (!prev.shares || prev.shares <= 0) continue;
      const curr = currentBySymbol.get(prev.symbol.toUpperCase());
      if (!curr) {
        // 完全消失 → 可能是全部賣出
        newConfirmations[prev.symbol] = { status: 'pending', sellPrice: '' };
      } else if (curr.shares < prev.shares) {
        // 股數減少 → 可能是部分賣出（減碼）
        newConfirmations[prev.symbol] = { status: 'pending', sellPrice: '' };
      }
    }
    setSellConfirmations(newConfirmations);

    setError(null);
    setStep(2);
  };

  const handleStep2Next = async () => {
    // 賣出價格將在 savePortfolio 中儲存（使用後端回傳的 yearMonth 確保 key 一致）
    setStep(3);
  };

  const savePortfolio = async () => {
    if (!screenshotKey) {
      setError('找不到已上傳圖片的 key，請重新上傳。');
      return;
    }

    setBusy(true);
    setBusyMessage('正在儲存投資組合…');
    setError(null);

    try {
      const token = await getAccessToken();
      const result = await createPortfolio(token, {
        holdings: parsedHoldings,
        screenshotKeys: [screenshotKey],
        note: note.trim(),
        currency,
        broker,
        totalMarketValue,
        totalCost,
        totalPnL,
        yearMonth: APP_CURRENT_YEAR_MONTH,
      });

      // 強制使用 App 模擬日期的 yearMonth，避免後端用真實日期覆蓋
      result.portfolio.yearMonth = APP_CURRENT_YEAR_MONTH;

      // 使用 App 日期的 yearMonth 儲存賣出價格，確保與 useRealizedPnL 偵測時的 key 一致
      const yearMonth = APP_CURRENT_YEAR_MONTH;
      const currentBySymbolMap = new Map(
        parsedHoldings.map((h) => [h.symbol.toUpperCase(), h])
      );
      for (const [symbol, conf] of Object.entries(sellConfirmations)) {
        if (conf.status === 'confirmed' || conf.status === 'price_done') {
          const price = parseFloat(conf.sellPrice);
          if (!isNaN(price) && price > 0) {
            const prev = latest?.holdings.find((h) => h.symbol === symbol);
            const curr = currentBySymbolMap.get(symbol.toUpperCase());
            const prevShares = prev?.shares ?? 0;
            const currShares = curr?.shares ?? 0;
            const soldShares = prevShares - currShares;
            await confirmSellPrice(symbol, yearMonth, price, soldShares);
          }
        } else if (conf.status === 'skipped' || conf.status === 'not_sold') {
          const prev = latest?.holdings.find((h) => h.symbol === symbol);
          const curr = currentBySymbolMap.get(symbol.toUpperCase());
          const prevShares = prev?.shares ?? 0;
          const currShares = curr?.shares ?? 0;
          const soldShares = prevShares - currShares;
          await skipSellPrice(symbol, yearMonth, soldShares);
        }
      }

      setLatest(result.portfolio);

      // 重新載入投資組合歷史，確保 useRealizedPnL 能偵測到新的賣出
      await refreshHistory();

      setStep(4);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '投資組合儲存失敗。');
    } finally {
      setBusy(false);
      setBusyMessage('');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.progressContainer}>
        {[0, 1, 2, 3, 4].map((index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index <= step ? styles.progressActive : styles.progressInactive,
            ]}
          />
        ))}
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {busy ? (
        <View style={styles.busyCard}>
          <ActivityIndicator color="#222222" />
          <Text style={styles.busyText}>{busyMessage || '處理中…'}</Text>
        </View>
      ) : null}

      {step === 0 && (
        <View style={styles.content}>
          <Text style={styles.stepTitle}>上傳券商截圖</Text>
          <Text style={styles.stepDesc}>
            圖片會先轉成 JPEG 並縮小，再安全上傳到你的私人 S3 路徑。
          </Text>

          {!selectedImage ? (
            <TouchableOpacity style={styles.uploadArea} onPress={pickImage} disabled={busy}>
              <Text style={styles.uploadIcon}>📷</Text>
              <Text style={styles.uploadText}>選擇圖片</Text>
              <Text style={styles.uploadHint}>建議使用完整、清楚的持股頁面</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.previewArea}>
              <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
              <View style={styles.imageActions}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={pickImage} disabled={busy}>
                  <Text style={styles.secondaryBtnText}>重新選擇</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={startRecognition} disabled={busy}>
                  <Text style={styles.primaryBtnText}>開始辨識</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {step === 1 && (
        <View style={styles.content}>
          <Text style={styles.stepTitle}>確認辨識結果</Text>
          <Text style={styles.stepDesc}>
            AI 偵測到 {holdings.length} 檔股票
            {broker ? `・${broker}` : ''}
            {confidence ? `・信心度 ${confidence}` : ''}
          </Text>

          {holdings.map((holding, index) => (
            <View key={`${holding.symbol}-${index}`} style={styles.stockCard}>
              <View style={styles.stockHeader}>
                <Text style={styles.stockIndex}>持股 {index + 1}</Text>
                <TouchableOpacity onPress={() => removeHolding(index)}>
                  <Text style={styles.removeText}>移除</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.twoColumns}>
                <View style={styles.fieldHalf}>
                  <Text style={styles.inputLabel}>股票代號</Text>
                  <TextInput
                    style={styles.smallInput}
                    value={holding.symbol}
                    onChangeText={(value) => updateHolding(index, 'symbol', value)}
                    autoCapitalize="characters"
                    placeholder="2330"
                    placeholderTextColor="#BBBBBB"
                  />
                </View>
                <View style={styles.fieldHalf}>
                  <Text style={styles.inputLabel}>名稱</Text>
                  <TextInput
                    style={styles.smallInput}
                    value={holding.name}
                    onChangeText={(value) => updateHolding(index, 'name', value)}
                    placeholder="台積電"
                    placeholderTextColor="#BBBBBB"
                  />
                </View>
              </View>

              <View style={styles.twoColumns}>
                <View style={styles.fieldHalf}>
                  <Text style={styles.inputLabel}>持有股數</Text>
                  <TextInput
                    style={styles.smallInput}
                    value={holding.shares}
                    onChangeText={(value) => updateHolding(index, 'shares', value)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="#BBBBBB"
                  />
                </View>
                <View style={styles.fieldHalf}>
                  <Text style={styles.inputLabel}>平均成本</Text>
                  <TextInput
                    style={styles.smallInput}
                    value={holding.avgCost}
                    onChangeText={(value) => updateHolding(index, 'avgCost', value)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="#BBBBBB"
                  />
                </View>
              </View>

              <View style={styles.twoColumns}>
                <View style={styles.fieldHalf}>
                  <Text style={styles.inputLabel}>市值</Text>
                  <TextInput
                    style={styles.smallInput}
                    value={holding.marketValue}
                    onChangeText={(value) => updateHolding(index, 'marketValue', value)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="#BBBBBB"
                  />
                </View>
                <View style={styles.fieldHalf}>
                  <Text style={styles.inputLabel}>損益</Text>
                  <TextInput
                    style={styles.smallInput}
                    value={holding.pnl}
                    onChangeText={(value) => updateHolding(index, 'pnl', value)}
                    keyboardType="numbers-and-punctuation"
                    placeholder="0"
                    placeholderTextColor="#BBBBBB"
                  />
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.addHoldingButton} onPress={addHolding}>
            <Text style={styles.addHoldingText}>＋ 手動新增持股</Text>
          </TouchableOpacity>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>辨識後總市值</Text>
            <Text style={styles.summaryValue}>{formatMoney(totalMarketValue)}</Text>
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(0)}>
              <Text style={styles.secondaryBtnText}>重新上傳</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={confirmOcr}>
              <Text style={styles.primaryBtnText}>確認資料</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {step === 2 && (
        <View style={styles.content}>
          <Text style={styles.stepTitle}>與上次比較</Text>
          <Text style={styles.stepDesc}>
            {comparison.hasPrevious
              ? '以下是本次更新的持股變化。'
              : '這是你的第一筆投資組合紀錄。'}
          </Text>

          {comparison.increased.length > 0 ? (
            <View style={styles.changeCard}>
              <Text style={styles.changeLabel}>📈 增加或新增</Text>
              {comparison.increased.map((item) => (
                <Text key={`up-${item.symbol}`} style={styles.changeItem}>
                  {item.name}：{item.previousShares.toLocaleString()} →{' '}
                  {item.currentShares.toLocaleString()} 股
                </Text>
              ))}
            </View>
          ) : null}

          {comparison.decreased.length > 0 ? (
            <View style={styles.changeCard}>
              <Text style={styles.changeLabelNeg}>📉 減少或移除</Text>
              {comparison.decreased.map((item) => {
                const isSold = item.currentShares === 0;
                const soldShares = item.previousShares - item.currentShares;
                const conf = sellConfirmations[item.symbol];

                return (
                  <View key={`down-${item.symbol}`} style={styles.sellItem}>
                    <Text style={styles.changeItem}>
                      {item.name}：{item.previousShares.toLocaleString()} →{' '}
                      {item.currentShares.toLocaleString()} 股
                      {!isSold ? `（減碼 ${soldShares.toLocaleString()} 股）` : ''}
                    </Text>

                    {conf ? (
                      <View style={styles.sellConfirmArea}>
                        {conf.status === 'pending' ? (
                          <>
                            <Text style={styles.sellQuestion}>
                              是否已經{isSold ? '賣出' : '減碼賣出'} {item.name}？
                            </Text>
                            <View style={styles.sellBtnRow}>
                              <TouchableOpacity
                                style={styles.sellBtnYes}
                                onPress={() =>
                                  setSellConfirmations((prev) => ({
                                    ...prev,
                                    [item.symbol]: { ...prev[item.symbol], status: 'confirmed' },
                                  }))
                                }
                              >
                                <Text style={styles.sellBtnYesText}>是，已賣出</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.sellBtnNo}
                                onPress={() =>
                                  setSellConfirmations((prev) => ({
                                    ...prev,
                                    [item.symbol]: { ...prev[item.symbol], status: 'not_sold' },
                                  }))
                                }
                              >
                                <Text style={styles.sellBtnNoText}>不是</Text>
                              </TouchableOpacity>
                            </View>
                          </>
                        ) : conf.status === 'confirmed' ? (
                          <>
                            <Text style={styles.sellQuestion}>賣出均價（NT$）</Text>
                            <View style={styles.sellPriceRow}>
                              <TextInput
                                style={styles.sellPriceInput}
                                value={conf.sellPrice}
                                onChangeText={(value) =>
                                  setSellConfirmations((prev) => ({
                                    ...prev,
                                    [item.symbol]: { ...prev[item.symbol], sellPrice: value },
                                  }))
                                }
                                keyboardType="decimal-pad"
                                placeholder="例如 150.5"
                                placeholderTextColor="#CCCCCC"
                              />
                              <TouchableOpacity
                                style={[
                                  styles.sellConfirmBtn,
                                  !conf.sellPrice.trim() && styles.sellConfirmBtnDisabled,
                                ]}
                                disabled={!conf.sellPrice.trim()}
                                onPress={() =>
                                  setSellConfirmations((prev) => ({
                                    ...prev,
                                    [item.symbol]: { ...prev[item.symbol], status: 'price_done' },
                                  }))
                                }
                              >
                                <Text style={styles.sellConfirmBtnText}>確認</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.sellSkipBtn}
                                onPress={() =>
                                  setSellConfirmations((prev) => ({
                                    ...prev,
                                    [item.symbol]: { ...prev[item.symbol], status: 'skipped', sellPrice: '' },
                                  }))
                                }
                              >
                                <Text style={styles.sellSkipText}>跳過</Text>
                              </TouchableOpacity>
                            </View>
                          </>
                        ) : conf.status === 'price_done' ? (
                          <Text style={styles.sellDone}>
                            ✅ 已確認賣出，均價 NT${conf.sellPrice}
                          </Text>
                        ) : conf.status === 'not_sold' ? (
                          <Text style={styles.sellDone}>
                            ✅ 已標記為未賣出（可能是轉帳或截圖遺漏）
                          </Text>
                        ) : (
                          <Text style={styles.sellDone}>✅ 已跳過，不計入損益</Text>
                        )}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null}

          {comparison.hasPrevious &&
          comparison.increased.length === 0 &&
          comparison.decreased.length === 0 ? (
            <View style={styles.changeCard}>
              <Text style={styles.noChangeText}>持股股數沒有變化。</Text>
            </View>
          ) : null}

          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>
              {comparison.hasPrevious ? '總市值變化' : '目前總市值'}
            </Text>
            <Text
              style={[
                styles.summaryValue,
                comparison.marketValueChange < 0 && styles.summaryValueNegative,
              ]}
            >
              {comparison.hasPrevious && comparison.marketValueChange >= 0 ? '+' : ''}
              {formatMoney(
                comparison.hasPrevious
                  ? comparison.marketValueChange
                  : totalMarketValue
              )}
            </Text>
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(1)}>
              <Text style={styles.secondaryBtnText}>上一步</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleStep2Next}>
              <Text style={styles.primaryBtnText}>下一步</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {step === 3 && (
        <View style={styles.content}>
          <Text style={styles.stepTitle}>留下一句話</Text>
          <Text style={styles.stepDesc}>這次更新，有什麼想記住的嗎？</Text>

          <TextInput
            style={styles.noteInput}
            placeholder="例如：加薪了，多買了一些 ETF"
            placeholderTextColor="#BBBBBB"
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={2000}
          />

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(2)} disabled={busy}>
              <Text style={styles.secondaryBtnText}>上一步</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={savePortfolio} disabled={busy}>
              <Text style={styles.primaryBtnText}>{note ? '儲存' : '跳過並儲存'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {step === 4 && (
        <View style={styles.content}>
          <View style={styles.doneCenter}>
            <Text style={styles.doneIcon}>🌿</Text>
            <Text style={styles.doneTitle}>更新完成</Text>
            <Text style={styles.doneDesc}>
              投資組合已存入 DynamoDB。{`\n`}首頁與持股頁會使用這次的真實資料。
            </Text>

            {note ? (
              <View style={styles.notePreview}>
                <Text style={styles.notePreviewText}>「{note}」</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.fullPrimaryBtn}
              onPress={() => router.replace('/(tabs)')}
            >
              <Text style={styles.primaryBtnText}>回到首頁</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resetButton} onPress={reset}>
              <Text style={styles.resetButtonText}>再新增一筆</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F7' },
  scrollContent: { paddingBottom: 48 },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  progressDot: { width: 32, height: 4, borderRadius: 2 },
  progressActive: { backgroundColor: '#222222' },
  progressInactive: { backgroundColor: '#EDEBE8' },
  content: { padding: 24, backgroundColor: 'transparent' },
  stepTitle: { fontSize: 24, fontWeight: '600', color: '#222222', marginBottom: 8 },
  stepDesc: { fontSize: 15, color: '#888888', lineHeight: 22, marginBottom: 24 },
  errorCard: {
    marginHorizontal: 24,
    marginTop: 12,
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#FBECEC',
  },
  errorText: { color: '#A95454', fontSize: 14, lineHeight: 20 },
  busyCard: {
    marginHorizontal: 24,
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F4F1ED',
  },
  busyText: { color: '#555555', fontSize: 14 },
  uploadArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 44,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  uploadIcon: { fontSize: 40, marginBottom: 12 },
  uploadText: { fontSize: 16, color: '#555555', fontWeight: '500' },
  uploadHint: { marginTop: 8, fontSize: 13, color: '#AAAAAA', textAlign: 'center' },
  previewArea: { gap: 16, backgroundColor: 'transparent' },
  previewImage: { width: '100%', height: 360, borderRadius: 20, resizeMode: 'contain', backgroundColor: '#F4F1ED' },
  imageActions: { flexDirection: 'row', gap: 12, backgroundColor: 'transparent' },
  stockCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    backgroundColor: 'transparent',
  },
  stockIndex: { fontSize: 15, fontWeight: '600', color: '#444444' },
  removeText: { fontSize: 13, color: '#C77D7D' },
  twoColumns: { flexDirection: 'row', gap: 10, backgroundColor: 'transparent' },
  fieldHalf: { flex: 1, backgroundColor: 'transparent', marginBottom: 10 },
  inputLabel: { fontSize: 12, color: '#888888', marginBottom: 6 },
  smallInput: {
    backgroundColor: '#F7F5F2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#222222',
  },
  addHoldingButton: {
    borderWidth: 1,
    borderColor: '#DDD8D2',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  addHoldingText: { color: '#666666', fontSize: 14, fontWeight: '500' },
  changeCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 12 },
  changeLabel: { fontSize: 14, fontWeight: '600', color: '#D68E8E', marginBottom: 8 },
  changeLabelNeg: { fontSize: 14, fontWeight: '600', color: '#86A874', marginBottom: 8 },
  changeItem: { fontSize: 15, color: '#555555', paddingVertical: 4, lineHeight: 22 },
  noChangeText: { fontSize: 15, color: '#777777' },
  summaryCard: {
    backgroundColor: '#F4F1ED',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryText: { fontSize: 15, color: '#555555' },
  summaryValue: { fontSize: 18, fontWeight: '600', color: '#D68E8E' },
  summaryValueNegative: { color: '#86A874' },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 8, backgroundColor: 'transparent' },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#222222',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  fullPrimaryBtn: {
    width: '100%',
    backgroundColor: '#222222',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#F4F1ED',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#555555', fontSize: 16, fontWeight: '500' },
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
  doneCenter: { alignItems: 'center', paddingTop: 40, backgroundColor: 'transparent' },
  doneIcon: { fontSize: 56, marginBottom: 20 },
  doneTitle: { fontSize: 24, fontWeight: '600', color: '#222222', marginBottom: 8 },
  doneDesc: { fontSize: 15, color: '#888888', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  notePreview: { backgroundColor: '#F4F1ED', borderRadius: 16, padding: 16, marginBottom: 24, width: '100%' },
  notePreviewText: { fontSize: 15, color: '#555555', fontStyle: 'italic', textAlign: 'center' },
  resetButton: { paddingVertical: 16 },
  resetButtonText: { color: '#777777', fontSize: 14 },
  sellItem: {
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  sellConfirmArea: {
    backgroundColor: '#F9F8F6',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  sellQuestion: {
    fontSize: 14,
    fontWeight: '500',
    color: '#444444',
    marginBottom: 10,
  },
  sellBtnRow: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'transparent',
  },
  sellBtnYes: {
    flex: 1,
    backgroundColor: '#222222',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sellBtnYesText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  sellBtnNo: {
    flex: 1,
    backgroundColor: '#F4F1ED',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sellBtnNoText: { color: '#888888', fontSize: 14, fontWeight: '500' },
  sellPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'transparent',
  },
  sellPriceInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#222222',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  sellSkipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F4F1ED',
    borderRadius: 999,
  },
  sellSkipText: { color: '#888888', fontSize: 14 },
  sellConfirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#222222',
    borderRadius: 999,
  },
  sellConfirmBtnDisabled: {
    backgroundColor: '#CCCCCC',
  },
  sellConfirmBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  sellDone: {
    fontSize: 13,
    color: '#86A874',
    marginTop: 4,
  },
});
