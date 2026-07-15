/**
 * Lambda: POST /ai/chat
 *
 * 接收使用者問題 + 持股資料，呼叫 Amazon Bedrock Claude 回答。
 *
 * 環境變數：
 *   BEDROCK_MODEL_ID  — 預設 "anthropic.claude-3-5-sonnet-20241022-v2:0"
 *   BEDROCK_REGION    — 預設 "us-east-1"
 *   COGNITO_USER_POOL_ID — 用於驗證 JWT（可選，若 API Gateway 已驗證可省略）
 *
 * 請求格式：
 * {
 *   "message": "我的哪一檔股票占比最高？",
 *   "holdings": [{ symbol, name, shares, avgCost, marketValue, pnl, weight }],
 *   "portfolioSummary": { totalMarketValue, totalCost, totalPnL, holdingsCount, currency },
 *   "context": { currentDate, note }
 * }
 *
 * 回應格式：
 * {
 *   "reply": "根據你的持股資料..."
 * }
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

const BEDROCK_MODEL_ID =
  process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-sonnet-4-6';
const BEDROCK_REGION = process.env.BEDROCK_REGION || 'us-east-1';

const bedrock = new BedrockRuntimeClient({ region: BEDROCK_REGION });

// === CORS Headers ===
const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization,content-type',
  'access-control-allow-methods': 'POST,OPTIONS',
  'content-type': 'application/json',
};

// === System Prompt ===
function buildSystemPrompt(holdings, portfolioSummary, context, aiUserProfile) {
  const lines = [
    '你是一位專業但友善的投資顧問 AI，名字叫「投資小幫手」。',
    '你的任務是根據使用者的投資組合資料，用繁體中文回答問題。',
    '',
    '## 回答原則',
    '- 用繁體中文回答，語氣溫和但專業',
    '- 直接回答問題，不要重複問題',
    '- 善用 emoji 讓回答更生動（📊📈📉💡⚠️✅🎯）',
    '- 如果資料不足以回答，誠實說明並給出一般性建議',
    '- 不要給出具體的買賣建議或保證報酬率',
    '- 回答長度適中，重點清楚，用換行和項目符號提高可讀性',
    '',
  ];

  // AI User Profile — 個人化偏好
  if (aiUserProfile && Object.values(aiUserProfile).some((v) => v != null)) {
    lines.push('## 使用者投資偏好（請據此調整回答方式）');

    if (aiUserProfile.analysisPriority) {
      const labels = {
        stability: '重視資產穩定',
        growth: '重視長期成長',
        income: '重視穩定配息',
        goal_completion: '優先完成目標',
        unsure: '尚未確定偏好',
      };
      lines.push(`- 分析重點：${labels[aiUserProfile.analysisPriority] || aiUserProfile.analysisPriority}`);
    }

    if (aiUserProfile.drawdownTolerance) {
      const labels = {
        low: '低（約 5% 即感到不安）',
        medium_low: '中低（約 10%）',
        medium: '中等（約 20%）',
        high: '高（30% 以上也能長期持有）',
        unsure: '尚未確定',
      };
      lines.push(`- 下跌承受度：${labels[aiUserProfile.drawdownTolerance] || aiUserProfile.drawdownTolerance}`);
    }

    if (aiUserProfile.investmentStyle) {
      const labels = {
        dca: '定期定額',
        buy_and_hold: '買入後長期持有',
        income: '以配息為主',
        active: '會依市場主動調整',
        beginner: '剛開始投資',
      };
      lines.push(`- 投資方式：${labels[aiUserProfile.investmentStyle] || aiUserProfile.investmentStyle}`);
    }

    if (aiUserProfile.goalTradeoff) {
      const labels = {
        goal_first: '優先準時完成目標',
        balanced: '目標與成長兩者平衡',
        growth_first: '可以延後目標，追求成長',
        unsure: '尚未確定',
      };
      lines.push(`- 目標取捨：${labels[aiUserProfile.goalTradeoff] || aiUserProfile.goalTradeoff}`);
    }

    if (aiUserProfile.investmentHorizon) {
      const labels = {
        within_1_year: '一年內需要使用',
        one_to_three_years: '1～3 年',
        three_to_five_years: '3～5 年',
        over_five_years: '5 年以上',
        unsure: '尚未確定',
      };
      lines.push(`- 投資期限：${labels[aiUserProfile.investmentHorizon] || aiUserProfile.investmentHorizon}`);
    }

    lines.push('');
    lines.push('請根據以上偏好調整你的回答角度和建議方式：');
    lines.push('- 如果使用者重視穩定，避免建議高波動策略');
    lines.push('- 如果使用者下跌承受度低，在回答中加入風險提醒');
    lines.push('- 如果使用者是新手，使用更簡單的說明方式');
    lines.push('- 如果使用者優先完成目標，將分析與目標達成時間連結');
    lines.push('');
  }

  if (portfolioSummary) {
    lines.push('## 使用者投資組合摘要');
    lines.push(`- 持股數量：${portfolioSummary.holdingsCount} 檔`);
    lines.push(`- 總市值：NT$${(portfolioSummary.totalMarketValue ?? 0).toLocaleString()}`);
    lines.push(`- 總成本：NT$${(portfolioSummary.totalCost ?? 0).toLocaleString()}`);
    lines.push(`- 未實現損益：NT$${(portfolioSummary.totalPnL ?? 0).toLocaleString()}`);
    lines.push(`- 幣別：${portfolioSummary.currency || 'TWD'}`);
    lines.push('');
  }

  if (holdings && holdings.length > 0) {
    lines.push('## 使用者持股明細');
    lines.push('| 股票 | 代號 | 股數 | 均成本 | 市值 | 損益 | 占比 |');
    lines.push('|------|------|------|--------|------|------|------|');

    for (const h of holdings) {
      const weight = h.weight != null ? `${(h.weight * 100).toFixed(1)}%` : '—';
      const mv = h.marketValue != null ? `NT$${h.marketValue.toLocaleString()}` : '—';
      const pnl = h.pnl != null ? `NT$${h.pnl.toLocaleString()}` : '—';
      const cost = h.avgCost != null ? `NT$${h.avgCost.toLocaleString()}` : '—';
      lines.push(
        `| ${h.name || h.symbol} | ${h.symbol} | ${h.shares ?? '—'} | ${cost} | ${mv} | ${pnl} | ${weight} |`
      );
    }
    lines.push('');
  }

  if (context) {
    lines.push('## 附加資訊');
    if (context.currentDate) lines.push(`- 資料日期：${context.currentDate}`);
    if (context.note) lines.push(`- ${context.note}`);
    lines.push('');
  }

  return lines.join('\n');
}

// === Main Handler ===
export async function handler(event) {
  // Handle CORS preflight
  if (event.requestContext?.http?.method === 'OPTIONS' || event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  try {
    // Parse body — handle multiple formats from API Gateway
    let body;

    if (event.body) {
      if (typeof event.body === 'string') {
        if (event.isBase64Encoded) {
          body = JSON.parse(Buffer.from(event.body, 'base64').toString('utf-8'));
        } else {
          body = JSON.parse(event.body);
        }
      } else {
        body = event.body;
      }
    } else if (event.message) {
      // Fallback: the event itself might be the body (direct invoke without wrapping)
      body = event;
    }

    if (!body || !body.message) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: '缺少 message 欄位。' }),
      };
    }

    const { message, holdings, portfolioSummary, context, aiUserProfile } = body;

    // Build system prompt with portfolio context
    const systemPrompt = buildSystemPrompt(holdings, portfolioSummary, context, aiUserProfile);

    // Call Bedrock Claude
    const requestBody = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1500,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
    };

    const command = new InvokeModelCommand({
      modelId: BEDROCK_MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody),
    });

    const response = await bedrock.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    // Extract text from Claude response
    const reply =
      responseBody.content?.[0]?.text ||
      responseBody.completion ||
      '抱歉，AI 暫時無法回應。';

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ reply }),
    };
  } catch (err) {
    console.error('AI Chat Error:', err);

    const statusCode = err.name === 'ThrottlingException' ? 429 : 500;
    const message =
      statusCode === 429
        ? 'AI 請求過於頻繁，請稍後再試。'
        : 'AI 回應失敗，請稍後再試。';

    return {
      statusCode,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message, error: err.message }),
    };
  }
}
