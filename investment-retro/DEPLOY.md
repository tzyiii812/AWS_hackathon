# AWS Amplify 部署指南

## 一、連接 GitHub

1. 登入 AWS Console → Amplify
2. 選「Host web app」→ GitHub
3. 選擇 repo 和 branch（例如 `main`）
4. Amplify 會自動偵測 `amplify.yml`

## 二、環境變數設定

在 Amplify Console → App settings → Environment variables 加入：

| Variable | Value |
|----------|-------|
| `EXPO_PUBLIC_API_BASE_URL` | `https://p9qp37v2vb.execute-api.us-east-1.amazonaws.com` |
| `EXPO_PUBLIC_COGNITO_REGION` | `us-east-1` |
| `EXPO_PUBLIC_COGNITO_USER_POOL_ID` | `us-east-1_n10QbdFwk` |
| `EXPO_PUBLIC_COGNITO_CLIENT_ID` | `7hkhtohqd42ii21h874uqblq4s` |

> 這些值已在 `config/env.ts` 有 fallback，但建議明確設定。

## 三、Rewrites and Redirects（重要！）

在 Amplify Console → App settings → Rewrites and redirects，新增以下規則：

### 規則 1：靜態資源正常走（已存在的檔案直接提供）

不需要額外設定，Amplify 預設會 serve 存在的檔案。

### 規則 2：SPA Fallback（讓所有路由都 fallback 到 index.html）

由於 Expo Router 使用 `output: "static"`，已為每個路由生成獨立的 HTML。
但為了確保不會出現 404，請加入這條 rewrite：

```
Source: /<*>
Target: /index.html
Type: 200 (Rewrite)
```

或使用 JSON 格式：

```json
[
  {
    "source": "/<*>",
    "target": "/index.html",
    "status": "200",
    "condition": null
  }
]
```

> 注意：因為 Expo static output 已為每個 route 生成 HTML，
> 大多數路由不需要 fallback。但加上這條可以防止意外的 404。

## 四、Build 設定概要

| 項目 | 值 |
|------|------|
| Build command | `npm run build:web` |
| Publish directory | `dist` |
| Node.js version | 18+ (Amplify 預設) |

## 五、自動部署

連接 GitHub 後，每次 push 到指定 branch 都會自動觸發部署。

## 六、Custom Domain（選用）

Amplify Console → Domain management 可以綁定自訂網域。
黑客松 demo 用 Amplify 提供的 `*.amplifyapp.com` 即可。
