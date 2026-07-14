# 串接版變更摘要

- 新增 Cognito 登入、首次登入修改密碼、Refresh Token 更新。
- 原生裝置使用 Expo SecureStore；Web 使用 localStorage。
- Update Portfolio 從 Mock OCR 改為真實選圖、JPEG 轉換、S3 上傳、Bedrock OCR。
- OCR 結果可修改、刪除及手動新增持股。
- 自動比較上一筆 Portfolio 的股數與總市值。
- 儲存到 `POST /portfolio` 後即時更新全域 Portfolio。
- Holdings、Home、Insights 改讀取 `GET /portfolio/latest`。
- Me 頁新增登入帳號顯示與登出。
- 新增 Expo Image Picker、Image Manipulator、Secure Store 依賴。
