# Investment Retro - AI 投資回顧助手

一款結合 AI 分析的個人投資組合管理 App，幫助投資者透過截圖上傳、OCR 辨識、AI 對話與月報回顧，建立系統化的投資紀錄與反思習慣。

## 功能特色

### 核心功能

- **截圖 OCR 辨識**：拍照或選取券商持股截圖，自動辨識股票代號、股數、成本與市值
- **投資組合追蹤**：記錄每月持股快照，追蹤未實現/已實現損益變化
- **AI 投資助手**：基於 Amazon Bedrock Claude 的智慧對話，結合你的持股與台股市場資料提供分析建議
- **月報自動生成**：AI 根據你的持股變化自動產生投資回顧月報（Journal）
- **投資目標管理**：設定儲蓄/投資目標、追蹤達成進度、上傳目標照片作為動力
- **投資組合健康評分**：多維度評估持股集中度、產業分散度等指標
- **賣出紀錄追蹤**：偵測減碼/清倉的股票並記錄賣出價格，計算已實現損益
- **AI 投資理念分析**：透過問答了解你的投資風格，讓 AI 回答更貼近你的理念

### 畫面與頁籤

| Tab | 功能 |
|-----|------|
| Home | 總資產概覽、目標輪播、損益摘要、AI 個人化卡片 |
| Journal | 每月投資回顧月報列表，點入查看 AI 生成的完整分析 |
| + (Update) | 上傳截圖 → OCR → 比對差異 → 加備註 → 儲存 |
| Insights | 持股分析、健康評分、個股搜尋、Ask AI 入口 |
| Me | 個人資料、目標管理、AI 偏好設定、達成紀念照 |

## 技術架構

### 前端

- **框架**：React Native + Expo SDK 54
- **路由**：Expo Router（file-based routing）
- **狀態管理**：React Context（Auth / Portfolio / Goals / AIProfile）
- **語言**：TypeScript
- **平台支援**：iOS / Android / Web

### 後端（AWS Serverless）

| Lambda 函式 | 功能 |
|-------------|------|
| `ai-chat` | AI 對話（Amazon Bedrock Claude），整合市場資料上下文 |
| `ai-profile` | 儲存/讀取使用者投資理念問答 |
| `goals` | 目標 CRUD（DynamoDB） |
| `image-url` | 產生 S3 presigned URL 供圖片讀取 |
| `sell-prices` | 記錄賣出價格以計算已實現損益 |

### AWS 服務

- **Amazon Cognito** — 使用者認證（Email/Password）
- **Amazon API Gateway** — HTTP API，整合 Lambda
- **AWS Lambda** — 後端商業邏輯
- **Amazon DynamoDB** — 儲存 Portfolio、Goals、Journals、AI Profile
- **Amazon S3** — 儲存截圖與目標照片
- **Amazon Bedrock (Claude)** — AI 對話與月報生成
- **Amazon CloudFront** — Web 版靜態資源部署

### 市場資料

使用台股資料集（`Delivery_Hackathon_DataPackage_20260624/`）包含：

- 股價估值、法人買賣超、報酬率
- 距高低點動能指標、除息資訊
- 連續配息股票/ETF、產業分類
- 論壇討論熱度統計
- 綜合寬表（一檔股票一列）

前端 `services/marketData.ts` 載入 CSV 資料，`services/marketDataApi.ts` 將其打包為 AI 可讀的 prompt context。

## 快速開始

### 環境需求

- Node.js 18+
- npm 或 yarn
- Expo CLI（`npx expo`）
- iOS Simulator / Android Emulator 或實體裝置

### 安裝

```bash
cd investment-retro
npm install
```

### 環境變數設定

複製範本並填入你的 AWS 資源：

```bash
cp .env.example .env
```

`.env` 內容：

```env
EXPO_PUBLIC_API_BASE_URL=https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com
EXPO_PUBLIC_COGNITO_REGION=us-east-1
EXPO_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
EXPO_PUBLIC_COGNITO_CLIENT_ID=YOUR_APP_CLIENT_ID
```

### 啟動

```bash
# 開發模式（掃 QR Code 或模擬器）
npx expo start

# 指定平台
npx expo start --ios
npx expo start --android
npx expo start --web
```

## 專案結構

```
investment-retro/
├── app/                    # 頁面（Expo Router file-based routing）
│   ├── (tabs)/             # 底部 Tab 頁面
│   │   ├── index.tsx       # Home - 總覽
│   │   ├── journal.tsx     # 月報列表
│   │   ├── update.tsx      # 上傳截圖更新組合
│   │   ├── insights.tsx    # 持股分析 & Ask AI
│   │   └── me.tsx          # 個人設定
│   ├── login.tsx           # 登入/註冊
│   ├── ask-ai.tsx          # AI 對話頁
│   ├── add-goal.tsx        # 新增目標
│   ├── holdings.tsx        # 持股明細
│   ├── stock-detail.tsx    # 個股詳情
│   └── journal-detail.tsx  # 月報詳情
├── backend/                # AWS Lambda 函式原始碼
│   ├── ai-chat/            # AI 對話 Lambda
│   ├── ai-profile/         # 投資理念 Lambda
│   ├── goals/              # 目標管理 Lambda
│   ├── image-url/          # 圖片 URL Lambda
│   └── sell-prices/        # 賣出價格 Lambda
├── components/             # 共用元件
├── config/                 # 環境設定、日期、AI 問題集
├── context/                # React Context Providers
│   ├── AuthContext.tsx     # 認證狀態
│   ├── PortfolioContext.tsx
│   ├── PortfolioHistoryContext.tsx
│   ├── GoalContext.tsx
│   └── AIProfileContext.tsx
├── hooks/                  # Custom Hooks
│   ├── usePortfolioPnL.ts  # 未實現損益計算
│   ├── useRealizedPnL.ts   # 已實現損益計算
│   └── usePortfolioHealth.ts # 健康評分
├── services/               # API 與資料服務
│   ├── api.ts              # 後端 REST API 封裝
│   ├── cognito.ts          # AWS Cognito 認證
│   ├── marketData.ts       # 台股 CSV 資料載入
│   ├── marketDataApi.ts    # AI 上下文建構
│   ├── sellPriceStore.ts   # 賣出價格本地快取
│   └── storage.ts          # SecureStore / localStorage
└── assets/                 # 字體、圖片

Delivery_Hackathon_DataPackage_20260624/  # 台股市場資料集（CSV）
```

## 操作流程

1. **註冊/登入** — 使用 Email 建立帳號或登入現有帳號
2. **上傳持股截圖** — 點中間的 `+` 按鈕，選擇或拍攝券商 App 截圖
3. **OCR 辨識** — 系統自動辨識持股資料，可手動修正
4. **差異比對** — 如非首次上傳，顯示與上次持股的差異（增減碼偵測）
5. **儲存快照** — 可加備註後儲存，成為一筆月度紀錄
6. **查看分析** — 在 Insights 頁面檢視持股健康評分與市場數據
7. **問 AI** — 在 Ask AI 頁面提問，AI 結合你的持股與市場資料回答
8. **月報回顧** — Journal 頁面自動生成每月投資回顧分析

## 後端部署

各 Lambda 函式位於 `backend/` 子目錄，每個都有獨立的 `package.json`。以 `ai-chat` 為例：

```bash
cd backend/ai-chat
npm install
# 使用 deploy.sh 部署到 AWS Lambda
chmod +x deploy.sh
./deploy.sh
```

需要的 AWS 權限：

- Lambda 管理
- DynamoDB 讀寫
- S3 讀寫
- Bedrock InvokeModel
- Cognito User Pool

## CORS 設定（Web 版）

若透過瀏覽器存取，需設定：

**API Gateway**：允許 `authorization`、`content-type` headers，允許來源包含你的 CloudFront URL 與 `http://localhost:8081`。

**S3 Bucket**：允許 PUT/GET/HEAD 方法，來源同上。

詳細設定請參考 `investment-retro/BACKEND_INTEGRATION.md`。

## 團隊

AWS Hackathon 2026 參賽作品

## License

Private - All Rights Reserved
