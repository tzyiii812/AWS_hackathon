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
  holdingSymbols: string[]
): Promise<string> {
  try {
    // 分析問題意圖
    const isAboutPortfolio =
      question.includes('持股') ||
      question.includes('投資組合') ||
      question.includes('部位') ||
      question.includes('占比') ||
      question.includes('集中');

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
      question.includes('完成');

    const isAboutMarket =
      question.includes('市場') ||
      question.includes('大盤') ||
      question.includes('排名');

    // 提取問題中提到的特定股票
    const mentions = extractStockMentions(question);

    // 取得市場資料
    let context = '';

    if (holdingSymbols.length > 0 && (isAboutPortfolio || isAboutReturn)) {
      context = await buildPortfolioContext(holdingSymbols);
    } else if (isAboutMarket) {
      context = await buildMarketOverviewContext();
    } else if (mentions.length > 0) {
      // 嘗試搜尋提到的股票
      for (const mention of mentions.slice(0, 3)) {
        const results = await searchStocks(mention);
        if (results.length > 0) {
          const symbol = results[0].股票代號;
          context += await buildStockAnalysisContext(symbol) + '\n\n';
        }
      }
    } else if (holdingSymbols.length > 0) {
      context = await buildPortfolioContext(holdingSymbols);
    }

    if (!context) {
      return '目前沒有足夠的市場資料來回答這個問題。請先上傳你的持股截圖，或詢問特定股票的資訊。';
    }

    // 組合回覆
    return `📊 根據市場資料分析：\n\n${context}\n\n💡 以上為 ${APP_TODAY_ISO} 的市場數據，供你參考做投資決策。`;
  } catch (err) {
    console.error('generateLocalResponse error:', err);
    return '市場資料載入失敗，請稍後再試。';
  }
}

const SUGGESTIONS = [
  '我的持股表現如何？',
  '幫我分析 0050 的近期走勢',
  '我的投資組合殖利率多少？',
  '市場上哪些股票年報酬最高？',
  '台積電目前估值如何？',
];

export default function AskAIScreen() {
  const { latest } = usePortfolio();
  const { getAccessToken, isAuthenticated } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

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
          const res = await fetch(`${APP_CONFIG.apiBaseUrl}/ai/chat`, {
            method: 'POST',
            headers: {
              authorization: `Bearer ${token}`,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              message: text,
              holdings: holdingSymbols,
              context: {
                currentDate: APP_TODAY_ISO,
                note: '現在時間為 2025/12/31，所有分析與評估都以此日期為基準。',
              },
            }),
          });

          if (res.ok) {
            const data = await res.json();
            aiResponse = data.reply || data.message || data.response;
          }
        } catch {
          // 後端 AI 不可用，使用本地資料
        }
      }

      // 如果後端沒回應，使用本地市場資料產生回覆
      if (!aiResponse) {
        aiResponse = await generateLocalResponse(text, holdingSymbols);
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
