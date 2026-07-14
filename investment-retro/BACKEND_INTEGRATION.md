# Investment Retro 前後端串接說明

此版本已接上目前的 AWS 後端：

- Cognito Email / Password 登入
- Access Token 安全保存與自動更新
- `GET /portfolio/upload-url`
- S3 Presigned URL 圖片上傳
- `POST /portfolio/ocr`
- OCR 結果修改與確認
- `POST /portfolio`
- `GET /portfolio/latest`
- 首頁、持股頁、Insights 顯示最新 Portfolio

## 1. 安裝與啟動

```bash
npm install
npx expo start
```

Web：

```bash
npm run web
```

設定位於 `.env`：

```env
EXPO_PUBLIC_API_BASE_URL=https://p9qp37v2vb.execute-api.us-east-1.amazonaws.com
EXPO_PUBLIC_COGNITO_REGION=us-east-1
EXPO_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_n10QbdFwk
EXPO_PUBLIC_COGNITO_CLIENT_ID=7hkhtohqd42ii21h874uqblq4s
```

這些是前端可公開的 API URL 與 Cognito 識別碼，不要把密碼、Access Token、AWS Access Key 放進 `.env`。

## 2. 實際操作流程

1. 使用 Cognito 帳號登入。
2. 點下方中間的 `+`。
3. 選擇券商持股截圖。
4. 前端自動轉成 JPEG、縮小並壓縮。
5. 前端取得 Presigned URL 並 PUT 到 S3。
6. 前端將後端回傳的 S3 `key` 傳給 OCR API。
7. 使用者修改或確認辨識結果。
8. 儲存後，首頁、Holdings、Insights 會顯示 DynamoDB 的最新資料。

## 3. Web 版本必須設定 CORS

手機原生 App 不受瀏覽器 CORS 限制，但 CloudFront / Expo Web 需要以下設定。

### API Gateway HTTP API

進入：

`API Gateway → InvestmentRetro-API → CORS`

建議測試設定：

- Allow origins：
  - `https://d84l1y8p4kdic.cloudfront.net`
  - `http://localhost:8081`
- Allow methods：`GET`、`POST`、`OPTIONS`
- Allow headers：`authorization`、`content-type`
- Max age：`300`
- Allow credentials：關閉

Hackathon 臨時測試也可以把 Allow origins 設為 `*`，但正式上線建議只保留實際前端網址。

### S3 Bucket

進入：

`S3 → investment-retro-screenshots-yphcpy-2026 → Permissions → CORS → Edit`

貼上：

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedOrigins": [
      "https://d84l1y8p4kdic.cloudfront.net",
      "http://localhost:8081"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

## 4. 主要新增檔案

- `app/login.tsx`：Cognito 登入畫面
- `context/AuthContext.tsx`：Token 與登入狀態
- `context/PortfolioContext.tsx`：最新 Portfolio 狀態
- `services/cognito.ts`：Cognito API
- `services/api.ts`：Investment Retro API 與 S3 上傳
- `services/storage.ts`：原生 SecureStore / Web localStorage
- `config/env.ts`：環境設定

## 5. 已完成檢查

```bash
npx tsc --noEmit
npx expo export --platform web
```

兩項檢查皆已通過。
