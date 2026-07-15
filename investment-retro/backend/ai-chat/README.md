# AI Chat Lambda

投資組合 AI 問答後端，使用 Amazon Bedrock Claude 回答使用者問題。

## 架構

```
前端 ask-ai.tsx
  → POST /ai/chat (API Gateway)
    → Lambda (this function)
      → Amazon Bedrock Claude 3.5 Sonnet
        → 回傳 AI 回覆
```

## 部署前置條件

1. **AWS CLI** 已安裝並設定好 credentials
2. **Bedrock 模型存取** — 在 AWS Console 的 Bedrock 頁面啟用 `Claude 3.5 Sonnet` 模型
3. 知道你的 API Gateway ID（預設 `p9qp37v2vb`）

### 啟用 Bedrock 模型

1. 開啟 AWS Console → Amazon Bedrock → Model access
2. 點 "Manage model access"
3. 勾選 Anthropic → Claude 3.5 Sonnet v2
4. 點 "Save changes"（通常幾分鐘內生效）

## 部署

```bash
cd backend/ai-chat
chmod +x deploy.sh
./deploy.sh
```

腳本會自動：
- 安裝依賴、打包 zip
- 建立 IAM Role（含 Bedrock invoke 權限）
- 建立/更新 Lambda function
- 在 API Gateway 建立 `POST /ai/chat` 路由
- 設定 Lambda invoke permission

## 測試

```bash
# 無需認證的快速測試（需要先把 API Gateway 的 /ai/chat 路由設為不需 auth，或帶 token）
curl -X POST https://p9qp37v2vb.execute-api.us-east-1.amazonaws.com/ai/chat \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_COGNITO_TOKEN' \
  -d '{
    "message": "我的持股分散嗎？",
    "holdings": [
      {"symbol": "2330", "name": "台積電", "shares": 10, "avgCost": 550, "marketValue": 160000, "weight": 0.45},
      {"symbol": "0050", "name": "元大台灣50", "shares": 20, "avgCost": 130, "marketValue": 145000, "weight": 0.41}
    ],
    "portfolioSummary": {
      "totalMarketValue": 355000,
      "totalCost": 310000,
      "holdingsCount": 2,
      "currency": "TWD"
    }
  }'
```

## 環境變數

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `BEDROCK_MODEL_ID` | `anthropic.claude-3-5-sonnet-20241022-v2:0` | Bedrock 模型 ID |
| `BEDROCK_REGION` | `us-east-1` | Bedrock 所在 region |

## API 格式

### Request

```json
POST /ai/chat
Authorization: Bearer <cognito_token>

{
  "message": "我的哪一檔股票占比最高？",
  "holdings": [
    {
      "symbol": "2330",
      "name": "台積電",
      "shares": 10,
      "avgCost": 550,
      "marketValue": 160000,
      "pnl": 5500,
      "weight": 0.45
    }
  ],
  "portfolioSummary": {
    "totalMarketValue": 355000,
    "totalCost": 310000,
    "totalPnL": 45000,
    "holdingsCount": 5,
    "currency": "TWD"
  },
  "context": {
    "currentDate": "2025-12-31"
  }
}
```

### Response

```json
{
  "reply": "📊 根據你的持股資料...\n\n台積電占比最高，達 45%..."
}
```

### Error Response

```json
{
  "message": "AI 回應失敗，請稍後再試。",
  "error": "..."
}
```
