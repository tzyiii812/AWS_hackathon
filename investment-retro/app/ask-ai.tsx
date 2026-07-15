import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { useLocalSearchParams } from 'expo-router';
import { usePortfolio } from '@/context/PortfolioContext';
import { useAuth } from '@/context/AuthContext';
import { APP_CONFIG } from '@/config/env';
import {
  buildPortfolioContext,
  buildMarketOverviewContext,
  buildStockAnalysisContext,
  buildTrendContext,
} from '@/services/marketDataApi';
import { searchStocks, getStockBySymbol } from '@/services/marketData';
import { APP_TODAY_ISO } from '@/config/appDate';

type Message = { role: 'user' | 'ai'; content: string };

/** 從使用者問題中提取可能的股票代號或名稱 */
function extractStockMentions(text: string): string[] {
  // 常見台股代號 pattern: 4~6 碼數字
  const symbolPattern = /\b(\d{4,6})\b/g;
  const symbols = [...text.matchAll(symbolPattern)].map((m) => m[1]);

  // 常見 ETF / 股票名稱
  const knownNames = [
    '台積電', '鴻海', '聯發科', '台達電', '中華電',
    '台泥', '統一', '富邦金', '國泰金', '中信金',
    '兆豐金', '元大金', '玉山金', '第一金', '合庫金',
    '大立光', '聯電', '日月光', '廣達', '仁寶',
    '0050', '0056', '00878', '00919', '006208', '00715L',
    '元大台灣50', '元大高股息', '國泰永續高息',
    '群益台灣精選高息', '富邦台50',
  ];

  for (const name of knownNames) {
    if (text.includes(name)) {
      symbols.push(name);
    }
  }

  return [...new Set(symbols)];
}

/** 根據問題類型產生建議的 AI 回覆（本地版，用市場資料） */
async function generateLocalResponse(
  question: string,
  holdingSymbols: string[],
  holdings: Array<{ symbol: string; name?: string | null; shares: number; avgCost?: number | null; marketValue?: number | null; pnl?: number | null }>
): Promise<string> {
  try {
    // 分析問題意圖
    const isAboutConcentration =
      question.includes('占比') ||
      question.includes('集中') ||
      question.includes('最高') ||
      question.includes('集中度');

    const isAboutPnLImpact =
      question.includes('損益') ||
      question.includes('影響最大') ||
      question.includes('賺最多') ||
      question.includes('賠最多');

    const isAboutDecline =
      question.includes('下降') ||
      question.includes('下跌') ||
      question.includes('為什麼');

    const isAboutPortfolio =
      question.includes('持股') ||
      question.includes('投資組合') ||
      question.includes('部位') ||
      isAboutConcentration;

    const isAboutReturn =
      question.includes('報酬') ||
      question.includes('賺') ||
      question.includes('賠') ||
      question.includes('績效') ||
      question.includes('漲') ||
      question.includes('跌') ||
      question.includes('市值');

    const isAboutDividend =
      question.includes('股利') ||
      question.includes('殖利率') ||
      question.includes('配息') ||
      question.includes('除息');

    const isAboutGoal =
      question.includes('目標') ||
      question.includes('多久') ||
      question.includes('完成') ||
      question.includes('適合') ||
      question.includes('旅行');

    const isAboutMarket =
      question.includes('市場') ||
      question.includes('大盤') ||
      question.includes('排名');

    const isAboutHealth =
      question.includes('健康') ||
      question.includes('得分') ||
      question.includes('改善建議') ||
      question.includes('分散程度') ||
      question.includes('分散') ||
      question.includes('波動風險') ||
      question.includes('波動') ||
      question.includes('配息覆蓋') ||
      question.includes('ETF 比例') ||
      question.includes('ETF');

    // --- 本地可直接回答的持股分析問題 ---

    if ((isAboutConcentration || isAboutPnLImpact || isAboutDecline || isAboutHealth) && holdings.length > 0) {
      const totalMV = holdings.reduce((s, h) => s + (h.marketValue ?? 0), 0);

      // 占比分析
      const withWeight = holdings
        .filter((h) => (h.marketValue ?? 0) > 0)
        .map((h) => ({
          symbol: h.symbol,
          name: h.name ?? h.symbol,
          marketValue: h.marketValue!,
          weight: totalMV > 0 ? ((h.marketValue! / totalMV) * 100) : 0,
          pnl: h.pnl ?? ((h.marketValue ?? 0) - (h.shares ?? 0) * (h.avgCost ?? 0)),
        }))
        .sort((a, b) => b.marketValue - a.marketValue);

      if (isAboutConcentration) {
        const top = withWeight[0];
        const lines = [
          `📊 持股占比分析\n`,
          `你目前共持有 ${holdings.length} 檔股票，總市值約 NT$${totalMV.toLocaleString('zh-TW')}。\n`,
          `占比最高的是：`,
          '',
        ];
        withWeight.slice(0, 5).forEach((h, i) => {
          lines.push(`${i + 1}. ${h.name}（${h.symbol}）— ${h.weight.toFixed(1)}%，市值 NT$${h.marketValue.toLocaleString('zh-TW')}`);
        });

        if (top && top.weight > 30) {
          lines.push('', `⚠️ ${top.name} 占比 ${top.weight.toFixed(1)}%，集中度偏高。建議考慮分散到其他標的或 ETF，降低單一股票風險。`);
        } else if (top && top.weight > 20) {
          lines.push('', `💡 ${top.name} 占比 ${top.weight.toFixed(1)}%，尚在合理範圍，但可留意是否需要再平衡。`);
        } else {
          lines.push('', `✅ 持股分散度良好，最大單一持股占比在 20% 以下。`);
        }
        return lines.join('\n');
      }

      if (isAboutPnLImpact) {
        const byPnL = [...withWeight].sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));
        const lines = [
          `📊 損益影響分析\n`,
          `以下是對你投資組合損益影響最大的持股：\n`,
        ];
        byPnL.slice(0, 5).forEach((h, i) => {
          const sign = h.pnl >= 0 ? '+' : '';
          lines.push(`${i + 1}. ${h.name}（${h.symbol}）— ${sign}NT$${Math.abs(h.pnl).toLocaleString('zh-TW')}（占比 ${h.weight.toFixed(1)}%）`);
        });
        const biggest = byPnL[0];
        if (biggest) {
          lines.push('', biggest.pnl >= 0
            ? `💡 ${biggest.name} 是你目前獲利最大的持股，貢獻 +NT$${biggest.pnl.toLocaleString('zh-TW')}。`
            : `⚠️ ${biggest.name} 是目前虧損最大的持股，影響 -NT$${Math.abs(biggest.pnl).toLocaleString('zh-TW')}。可以評估是否需要調整部位或停損。`
          );
        }
        return lines.join('\n');
      }

      if (isAboutDecline) {
        const losers = withWeight.filter((h) => h.pnl < 0).sort((a, b) => a.pnl - b.pnl);
        const lines = [
          `📉 市值變動分析\n`,
        ];
        if (losers.length === 0) {
          lines.push('你的持股目前全部為正報酬，總市值沒有下降的跡象。');
        } else {
          lines.push(`以下持股目前為虧損狀態，可能是市值下降的主因：\n`);
          losers.slice(0, 5).forEach((h, i) => {
            lines.push(`${i + 1}. ${h.name}（${h.symbol}）— NT$${Math.abs(h.pnl).toLocaleString('zh-TW')} 虧損，占比 ${h.weight.toFixed(1)}%`);
          });
          lines.push('', `💡 建議觀察這些股票的產業趨勢和法人動向，評估是否需要調整。`);
        }
        return lines.join('\n');
      }

      if (isAboutHealth) {
        // 直接用持股資料做分析，不依賴市場資料 API
        const lines = [
          `📊 投資組合健康度分析\n`,
          `你目前共持有 ${holdings.length} 檔股票，總市值約 NT$${totalMV.toLocaleString('zh-TW')}。\n`,
        ];

        // 集中度分析
        const topWeight = withWeight[0]?.weight ?? 0;
        if (topWeight > 30) {
          lines.push(`⚠️ 集中度：最大持股 ${withWeight[0].name} 占比 ${topWeight.toFixed(1)}%，建議分散至 30% 以下。`);
        } else {
          lines.push(`✅ 集中度：最大持股 ${withWeight[0]?.name ?? '—'} 占比 ${topWeight.toFixed(1)}%，分散合理。`);
        }

        // ETF 占比（簡單判斷：代號以 0 開頭且為 4~6 碼的視為 ETF）
        const etfHoldings = withWeight.filter((h) => /^0\d{3,5}/.test(h.symbol));
        const etfPct = etfHoldings.reduce((s, h) => s + h.weight, 0);
        if (etfPct >= 20 && etfPct <= 60) {
          lines.push(`✅ ETF 比例：${etfPct.toFixed(1)}%，個股與 ETF 配置平衡。`);
        } else if (etfPct < 20) {
          lines.push(`💡 ETF 比例：${etfPct.toFixed(1)}%，偏低。加入 ETF 可降低個別風險。`);
        } else {
          lines.push(`💡 ETF 比例：${etfPct.toFixed(1)}%，偏高。可搭配成長型個股提升報酬潛力。`);
        }

        // 持股數量建議
        if (holdings.length < 5) {
          lines.push(`💡 持股數量：${holdings.length} 檔偏少，建議至少 5~10 檔提高分散性。`);
        } else if (holdings.length > 20) {
          lines.push(`💡 持股數量：${holdings.length} 檔偏多，過多持股可能稀釋報酬且難以追蹤。`);
        } else {
          lines.push(`✅ 持股數量：${holdings.length} 檔，在合理範圍。`);
        }

        lines.push('', `💡 更詳細的分數可在 Insights 頁面的 Portfolio Health 卡片查看，點各維度可獲得針對性建議。`);
        return lines.join('\n');
      }
    }

    if (isAboutGoal && holdings.length > 0) {
      const totalMV = holdings.reduce((s, h) => s + (h.marketValue ?? 0), 0);
      const lines = [
        `🎯 目標分析\n`,
        `你目前的投資組合總市值約 NT$${totalMV.toLocaleString('zh-TW')}。\n`,
        `要評估是否適合你的目標，我需要知道：`,
        `1. 你的目標金額是多少？`,
        `2. 預計多久後需要用到這筆錢？`,
        `3. 你每個月可以再投入多少？\n`,
        `💡 一般來說：`,
        `• 短期目標（1-2年）：建議以穩定配息的 ETF 為主`,
        `• 中期目標（3-5年）：可配置成長型個股 + 高股息 ETF`,
        `• 長期目標（5年以上）：可承受較高波動，追求資本增值`,
      ];
      return lines.join('\n');
    }

    // --- 其他問題走原有的市場資料路徑 ---

    // 如果用戶有持股資料但問題不屬於上述明確類別，直接用持股做通用分析
    if (holdings.length > 0) {
      const totalMV = holdings.reduce((s, h) => s + (h.marketValue ?? 0), 0);
      const totalCostLocal = holdings.reduce((s, h) => {
        if (h.avgCost != null && h.shares > 0) return s + h.avgCost * h.shares;
        return s;
      }, 0);
      const totalPnLLocal = totalMV - totalCostLocal;

      const withWeight = holdings
        .filter((h) => (h.marketValue ?? 0) > 0)
        .map((h) => ({
          symbol: h.symbol,
          name: h.name ?? h.symbol,
          marketValue: h.marketValue!,
          weight: totalMV > 0 ? ((h.marketValue! / totalMV) * 100) : 0,
          pnl: h.pnl ?? ((h.marketValue ?? 0) - (h.shares ?? 0) * (h.avgCost ?? 0)),
        }))
        .sort((a, b) => b.marketValue - a.marketValue);

      // 嘗試從市場資料補充更多資訊
      let marketContext = '';
      try {
        if (holdingSymbols.length > 0 && (isAboutPortfolio || isAboutReturn || isAboutDividend)) {
          marketContext = await buildPortfolioContext(holdingSymbols);
        } else if (isAboutMarket) {
          marketContext = await buildMarketOverviewContext();
        } else {
          // 提取問題中提到的特定股票
          const mentions = extractStockMentions(question);
          if (mentions.length > 0) {
            for (const mention of mentions.slice(0, 3)) {
              const results = await searchStocks(mention);
              if (results.length > 0) {
                const symbol = results[0].股票代號;
                marketContext += await buildStockAnalysisContext(symbol) + '\n\n';
              }
            }
          }
        }
      } catch {
        // 市場資料取得失敗，沒關係，用持股資料回答
      }

      // 組合回覆：先用持股資料做摘要
      const lines = [
        `📊 你的投資組合摘要\n`,
        `持股 ${holdings.length} 檔，總市值 NT$${totalMV.toLocaleString('zh-TW')}`,
        totalCostLocal > 0 ? `總成本 NT$${totalCostLocal.toLocaleString('zh-TW')}，未實現損益 ${totalPnLLocal >= 0 ? '+' : ''}NT$${Math.abs(totalPnLLocal).toLocaleString('zh-TW')}` : '',
        '',
        `前 5 大持股：`,
      ];
      withWeight.slice(0, 5).forEach((h, i) => {
        const sign = h.pnl >= 0 ? '+' : '-';
        lines.push(`${i + 1}. ${h.name}（${h.symbol}）${h.weight.toFixed(1)}% — ${sign}NT$${Math.abs(h.pnl).toLocaleString('zh-TW')}`);
      });

      if (marketContext) {
        lines.push('', `---\n`, marketContext);
      }

      lines.push('', `💡 以上為 ${APP_TODAY_ISO} 的數據。如需更深入的分析，可以問我特定的問題，例如「我的持股殖利率如何？」或「哪一檔股票最近漲最多？」`);
      return lines.join('\n');
    }

    // 完全沒有持股資料的情況
    // 提取問題中提到的特定股票
    const mentions = extractStockMentions(question);

    let context = '';
    try {
      if (isAboutMarket) {
        context = await buildMarketOverviewContext();
      } else if (mentions.length > 0) {
        for (const mention of mentions.slice(0, 3)) {
          const results = await searchStocks(mention);
          if (results.length > 0) {
            const symbol = results[0].股票代號;
            context += await buildStockAnalysisContext(symbol) + '\n\n';
          }
        }
      }
    } catch {
      // 市場資料載入失敗
    }

    if (!context) {
      return '目前沒有你的持股資料。請先到「更新」頁面上傳券商截圖，讓我辨識你的投資組合後，就能回答關於你持股的問題囉！';
    }

    return `📊 根據市場資料分析：\n\n${context}\n\n💡 以上為 ${APP_TODAY_ISO} 的市場數據，供你參考做投資決策。`;
  } catch (err) {
    console.error('generateLocalResponse error:', err);
    // 即使出錯，如果有持股資料也試著給出基本回答
    if (holdings.length > 0) {
      const totalMV = holdings.reduce((s, h) => s + (h.marketValue ?? 0), 0);
      return `📊 你目前持有 ${holdings.length} 檔股票，總市值約 NT$${totalMV.toLocaleString('zh-TW')}。\n\n目前市場資料暫時無法載入，但你可以在 Insights 頁面查看持股清單和 Portfolio Health 評分。`;
    }
    return '目前無法載入資料。請確認你已上傳持股截圖，稍後再試。';
  }
}

const SUGGESTIONS = [
  '我的哪一檔股票占比最高？',
  '我的投資組合是不是太集中？',
  '哪一檔股票對我的損益影響最大？',
  '為什麼這個月總市值下降？',
  '我的持股適不適合目前的旅行目標？',
  '按照目前投資方式，多久能完成目標？',
];

export default function AskAIScreen() {
  const { question: initialQuestion } = useLocalSearchParams<{ question?: string }>();
  const { latest } = usePortfolio();
  const { getAccessToken, isAuthenticated } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const hasSentInitial = useRef(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      content: '嗨！我是你的投資助手 🌱\n\n我可以查詢 300 檔台股的即時資料，包括行情、法人動向、技術面、股利等。問我任何關於你投資組合或市場的問題吧！',
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // 取得使用者持股代號
  const holdingSymbols =
    latest?.holdings.map((h) => h.symbol).filter(Boolean) ?? [];

  // 計算整體市值與成本供 AI context 使用
  const totalMarketValue = (latest?.holdings ?? []).reduce(
    (sum, h) => sum + (h.marketValue ?? 0),
    0
  );
  const totalCost = (latest?.holdings ?? []).reduce((sum, h) => {
    if (h.avgCost != null && h.shares > 0) return sum + h.avgCost * h.shares;
    return sum;
  }, 0);

  const send = async (text: string) => {
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setIsTyping(true);

    try {
      // 嘗試呼叫後端 AI API
      let aiResponse: string | null = null;

      if (isAuthenticated) {
        try {
          const token = await getAccessToken();

          // 組裝完整持股資料供 AI 使用
          const holdingsDetail = latest?.holdings.map((h) => {
            const mv = h.marketValue ?? 0;
            const cost = (h.shares ?? 0) * (h.avgCost ?? 0);
            return {
              symbol: h.symbol,
              name: h.name ?? h.symbol,
              shares: h.shares,
              avgCost: h.avgCost ?? null,
              marketValue: mv,
              pnl: h.pnl ?? (mv && cost ? mv - cost : null),
              weight: totalMarketValue > 0 ? mv / totalMarketValue : null,
            };
          }) ?? [];

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 50000);

          const res = await fetch(`${APP_CONFIG.apiBaseUrl}/ai/chat`, {
            method: 'POST',
            headers: {
              authorization: `Bearer ${token}`,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              message: text,
              holdings: holdingsDetail,
              portfolioSummary: {
                totalMarketValue,
                totalCost,
                totalPnL: totalMarketValue - totalCost,
                holdingsCount: latest?.holdings.length ?? 0,
                currency: latest?.currency ?? 'TWD',
              },
              context: {
                currentDate: APP_TODAY_ISO,
                note: '請根據使用者的完整持股資料（含市值、占比、損益）來回答問題。用繁體中文回答。',
              },
            }),
            signal: controller.signal,
          });

          clearTimeout(timeout);

          if (res.ok) {
            const data = await res.json();
            aiResponse = data.reply || data.message || data.response || null;
          } else if (res.status === 429) {
            aiResponse = '⏳ AI 目前忙碌中，請稍後再試。';
          }
          // 其他 status (404, 500) → 走本地 fallback
        } catch (err) {
          // 後端不可用（timeout / network error / 404）→ 走本地 fallback
          console.log('Backend AI unavailable, using local fallback:', err instanceof Error ? err.message : err);
        }
      }

      // 如果後端沒回應，使用本地市場資料產生回覆
      if (!aiResponse) {
        aiResponse = await generateLocalResponse(text, holdingSymbols, latest?.holdings ?? []);
      }

      setMessages((prev) => [...prev, { role: 'ai', content: aiResponse! }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', content: '抱歉，發生了錯誤。請稍後再試。' },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // 從 Health Card 導入的問題自動送出
  useEffect(() => {
    if (initialQuestion && !hasSentInitial.current) {
      hasSentInitial.current = true;
      // Delay slightly so component is mounted and send function is stable
      setTimeout(() => send(initialQuestion), 300);
    }
  }, [initialQuestion]);

  // 自動滾動到底部
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, isTyping]);

  const showSuggestions = messages.length <= 1;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg, i) => (
          <View
            key={i}
            style={[
              styles.bubble,
              msg.role === 'user' ? styles.userBubble : styles.aiBubble,
            ]}
          >
            {msg.role === 'ai' && <Text style={styles.aiLabel}>🌱</Text>}
            <Text
              style={[
                styles.bubbleText,
                msg.role === 'user' ? styles.userText : styles.aiTextStyle,
              ]}
            >
              {msg.content}
            </Text>
          </View>
        ))}

        {isTyping && (
          <View style={[styles.bubble, styles.aiBubble]}>
            <Text style={styles.aiLabel}>🌱</Text>
            <View style={styles.typingRow}>
              <ActivityIndicator size="small" color="#86A874" />
              <Text style={styles.typingText}> 正在查詢市場資料...</Text>
            </View>
          </View>
        )}

        {showSuggestions && (
          <View style={styles.suggestions}>
            {SUGGESTIONS.map((q, i) => (
              <TouchableOpacity
                key={i}
                style={styles.suggestionChip}
                onPress={() => send(q)}
              >
                <Text style={styles.suggestionText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder="問我任何問題..."
          placeholderTextColor="#BBBBBB"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => input.trim() && send(input.trim())}
          returnKeyType="send"
          editable={!isTyping}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || isTyping) && styles.sendBtnDisabled]}
          onPress={() => input.trim() && !isTyping && send(input.trim())}
          disabled={!input.trim() || isTyping}
        >
          <Text style={styles.sendBtnText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F7',
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 20,
    paddingBottom: 20,
  },
  bubble: {
    maxWidth: '85%',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
  },
  userBubble: {
    backgroundColor: '#222222',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 6,
  },
  aiBubble: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  aiLabel: {
    fontSize: 14,
    marginBottom: 6,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 23,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiTextStyle: {
    color: '#555555',
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  typingText: {
    fontSize: 14,
    color: '#86A874',
    fontStyle: 'italic',
  },
  suggestions: {
    marginTop: 12,
    gap: 8,
    backgroundColor: 'transparent',
  },
  suggestionChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  suggestionText: {
    fontSize: 14,
    color: '#555555',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F4F1ED',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
    color: '#222222',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#EDEBE8',
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
