import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, View } from '@/components/Themed';

const MOCK_RESPONSES: Record<string, string> = {
  '我的哪一檔股票占比最高？':
    '目前占比最高的是台積電，占你投資組合的 24.6%（市值 NT$168,000）。\n\n一般建議單一個股不超過總資產的 20~30%，你目前在合理範圍內。',
  '我的投資組合是不是太集中？':
    '從產業角度來看，科技類資產占比為 62%，確實偏高。\n\n台積電和 0050 都高度相關於台灣科技產業。下次投入時可以考慮其他產業。',
  '按照目前方式，多久能完成目標？':
    '東京旅行目標目前完成 73%。\n\n按照過去 6 個月的投入速度：\n\n保守情境：12 個月\n目前情境：9 個月\n積極情境：7 個月',
  '為什麼這個月市值下降？':
    '這個月你的總市值實際上增加了 NT$18,200。\n\n如果感覺下降，可能是某一天的短期波動，這是正常的。',
  '我的持股適合旅行目標嗎？':
    '0050 和 00919 是 ETF，波動穩定，適合中短期目標。\n\n台積電波動較大，距離目標越近時可以考慮調整比例。',
};

const SUGGESTIONS = [
  '我的哪一檔股票占比最高？',
  '我的投資組合是不是太集中？',
  '按照目前方式，多久能完成目標？',
  '為什麼這個月市值下降？',
  '我的持股適合旅行目標嗎？',
];

type Message = { role: 'user' | 'ai'; content: string };

export default function AskAIScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      content: '嗨！我是你的投資助手 🌱\n\n問我任何關於你投資組合的問題。',
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const send = (text: string) => {
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const response =
        MOCK_RESPONSES[text] ||
        '根據你的投資組合（總市值 NT$682,300，6 檔股票），整體表現穩健。建議持續維持目前的定期投入策略。';
      setMessages((prev) => [...prev, { role: 'ai', content: response }]);
      setIsTyping(false);
    }, 1200);
  };

  const showSuggestions = messages.length <= 1;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <ScrollView
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
            <Text style={styles.typingText}>思考中...</Text>
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
        />
        <TouchableOpacity
          style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
          onPress={() => input.trim() && send(input.trim())}
          disabled={!input.trim()}
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
    maxWidth: '80%',
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
  typingText: {
    fontSize: 14,
    color: '#BBBBBB',
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
