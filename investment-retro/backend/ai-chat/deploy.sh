#!/bin/bash
# =============================================================
# deploy.sh — 部署 AI Chat Lambda 到 AWS
#
# 使用前請確認：
#   1. 已安裝 AWS CLI 並設定好 credentials
#   2. 已在 us-east-1 啟用 Bedrock Claude 模型存取權限
#   3. 已知道你的 API Gateway ID（預設：p9qp37v2vb）
#
# 用法：
#   cd backend/ai-chat
#   chmod +x deploy.sh
#   ./deploy.sh
# =============================================================

set -e

# === 設定（請根據你的環境修改） ===
FUNCTION_NAME="InvestmentRetro-AI-Chat"
REGION="us-east-1"
RUNTIME="nodejs20.x"
HANDLER="index.handler"
TIMEOUT=60
MEMORY=512
API_ID="p9qp37v2vb"
ROUTE_PATH="/ai/chat"

# Lambda IAM Role（如果已有同專案的 Role 可共用）
# 如果沒有，下方會自動建立
ROLE_NAME="InvestmentRetro-Lambda-AI-Chat-Role"

echo "📦 安裝依賴..."
npm install --production

echo "🗜️  打包 Lambda..."
rm -f function.zip
zip -r function.zip index.mjs node_modules/ package.json

# === 檢查 Role 是否存在 ===
echo "🔑 檢查 IAM Role..."
ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text 2>/dev/null || echo "")

if [ -z "$ROLE_ARN" ]; then
  echo "   建立 IAM Role: $ROLE_NAME"

  # Trust policy for Lambda
  cat > /tmp/trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "lambda.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

  ROLE_ARN=$(aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document file:///tmp/trust-policy.json \
    --query 'Role.Arn' --output text)

  # Attach basic Lambda execution
  aws iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"

  # Attach Bedrock invoke permission
  cat > /tmp/bedrock-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/*",
        "arn:aws:bedrock:*:*:inference-profile/*"
      ]
    }
  ]
}
EOF

  aws iam put-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-name "BedrockInvokePolicy" \
    --policy-document file:///tmp/bedrock-policy.json

  echo "   等待 Role 生效..."
  sleep 10
fi

echo "   Role ARN: $ROLE_ARN"

# === 建立或更新 Lambda ===
echo "🚀 部署 Lambda..."
EXISTING=$(aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" 2>/dev/null || echo "")

if [ -z "$EXISTING" ]; then
  echo "   建立新 Lambda: $FUNCTION_NAME"
  aws lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --runtime "$RUNTIME" \
    --role "$ROLE_ARN" \
    --handler "$HANDLER" \
    --timeout "$TIMEOUT" \
    --memory-size "$MEMORY" \
    --zip-file fileb://function.zip \
    --environment "Variables={BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-6,BEDROCK_REGION=$REGION}" \
    --region "$REGION" \
    --no-cli-pager
else
  echo "   更新既有 Lambda: $FUNCTION_NAME"
  aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file fileb://function.zip \
    --region "$REGION" \
    --no-cli-pager

  # 等待更新完成
  aws lambda wait function-updated --function-name "$FUNCTION_NAME" --region "$REGION"

  aws lambda update-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --timeout "$TIMEOUT" \
    --memory-size "$MEMORY" \
    --environment "Variables={BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-6,BEDROCK_REGION=$REGION}" \
    --region "$REGION" \
    --no-cli-pager
fi

# === 取得 Lambda ARN ===
LAMBDA_ARN=$(aws lambda get-function \
  --function-name "$FUNCTION_NAME" \
  --region "$REGION" \
  --query 'Configuration.FunctionArn' --output text)

echo "   Lambda ARN: $LAMBDA_ARN"

# === 設定 API Gateway 整合 ===
echo "🌐 設定 API Gateway route..."

# 建立整合
INTEGRATION_ID=$(aws apigatewayv2 get-integrations \
  --api-id "$API_ID" \
  --region "$REGION" \
  --query "Items[?IntegrationUri=='${LAMBDA_ARN}'].IntegrationId | [0]" \
  --output text 2>/dev/null || echo "None")

if [ "$INTEGRATION_ID" = "None" ] || [ -z "$INTEGRATION_ID" ]; then
  echo "   建立 API Gateway 整合..."
  INTEGRATION_ID=$(aws apigatewayv2 create-integration \
    --api-id "$API_ID" \
    --integration-type AWS_PROXY \
    --integration-uri "$LAMBDA_ARN" \
    --payload-format-version "2.0" \
    --region "$REGION" \
    --query 'IntegrationId' --output text)
fi

echo "   Integration ID: $INTEGRATION_ID"

# 建立路由
EXISTING_ROUTE=$(aws apigatewayv2 get-routes \
  --api-id "$API_ID" \
  --region "$REGION" \
  --query "Items[?RouteKey=='POST ${ROUTE_PATH}'].RouteId | [0]" \
  --output text 2>/dev/null || echo "None")

if [ "$EXISTING_ROUTE" = "None" ] || [ -z "$EXISTING_ROUTE" ]; then
  echo "   建立路由 POST $ROUTE_PATH..."
  aws apigatewayv2 create-route \
    --api-id "$API_ID" \
    --route-key "POST ${ROUTE_PATH}" \
    --target "integrations/${INTEGRATION_ID}" \
    --region "$REGION" \
    --no-cli-pager
else
  echo "   路由已存在，更新 target..."
  aws apigatewayv2 update-route \
    --api-id "$API_ID" \
    --route-id "$EXISTING_ROUTE" \
    --target "integrations/${INTEGRATION_ID}" \
    --region "$REGION" \
    --no-cli-pager
fi

# 賦予 API Gateway 呼叫 Lambda 的權限
echo "   設定 Lambda invoke permission..."
aws lambda add-permission \
  --function-name "$FUNCTION_NAME" \
  --statement-id "apigateway-invoke-$(date +%s)" \
  --action "lambda:InvokeFunction" \
  --principal "apigateway.amazonaws.com" \
  --source-arn "arn:aws:execute-api:${REGION}:*:${API_ID}/*/*/ai/chat" \
  --region "$REGION" \
  --no-cli-pager 2>/dev/null || echo "   (permission 可能已存在，略過)"

# 清理
rm -f function.zip

echo ""
echo "✅ 部署完成！"
echo ""
echo "測試指令："
echo "  curl -X POST https://${API_ID}.execute-api.${REGION}.amazonaws.com/ai/chat \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -H 'Authorization: Bearer <YOUR_TOKEN>' \\"
echo "    -d '{\"message\": \"你好\", \"holdings\": [], \"portfolioSummary\": null}'"
echo ""
