#!/bin/bash
# Deploy AI Profile Lambda
# Usage: bash deploy.sh
#
# Prerequisites:
#   - AWS CLI configured with valid credentials
#   - Same AWS account as the existing InvestmentRetro API

set -e

REGION="us-east-1"
FUNCTION_NAME="InvestmentRetro-AIProfile"
TABLE_NAME="InvestmentRetro-AIProfiles"
ROLE_NAME="InvestmentRetro-Portfolio-role-rm51v06f"
API_ID="p9qp37v2vb"

echo "=== Step 1: Create DynamoDB Table ==="
aws dynamodb create-table \
  --table-name "$TABLE_NAME" \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "$REGION" 2>/dev/null && echo "Table created." || echo "Table already exists."

echo ""
echo "=== Step 2: Add DynamoDB permissions to Lambda role ==="
aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "AIProfileTableAccess" \
  --policy-document "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [{
      \"Sid\": \"AIProfileDynamoDB\",
      \"Effect\": \"Allow\",
      \"Action\": [
        \"dynamodb:GetItem\",
        \"dynamodb:PutItem\",
        \"dynamodb:UpdateItem\"
      ],
      \"Resource\": \"arn:aws:dynamodb:${REGION}:655737485266:table/${TABLE_NAME}\"
    }]
  }" && echo "IAM policy added." || echo "IAM policy may already exist."

echo ""
echo "=== Step 3: Package Lambda ==="
cd "$(dirname "$0")"
rm -f function.zip
zip -r function.zip index.mjs node_modules/ package.json

echo ""
echo "=== Step 4: Create or Update Lambda Function ==="
ROLE_ARN="arn:aws:iam::655737485266:role/$ROLE_NAME"

aws lambda create-function \
  --function-name "$FUNCTION_NAME" \
  --runtime "nodejs20.x" \
  --role "$ROLE_ARN" \
  --handler "index.handler" \
  --zip-file "fileb://function.zip" \
  --timeout 10 \
  --memory-size 128 \
  --environment "Variables={AI_PROFILE_TABLE=$TABLE_NAME}" \
  --region "$REGION" 2>/dev/null && echo "Lambda created." || {
    echo "Lambda exists, updating code..."
    aws lambda update-function-code \
      --function-name "$FUNCTION_NAME" \
      --zip-file "fileb://function.zip" \
      --region "$REGION"
    
    # Wait for update to complete before updating config
    sleep 3
    aws lambda update-function-configuration \
      --function-name "$FUNCTION_NAME" \
      --environment "Variables={AI_PROFILE_TABLE=$TABLE_NAME}" \
      --region "$REGION"
  }

echo ""
echo "=== Step 5: Add API Gateway Routes ==="

# Add Lambda permission for API Gateway
aws lambda add-permission \
  --function-name "$FUNCTION_NAME" \
  --statement-id "apigateway-invoke" \
  --action "lambda:InvokeFunction" \
  --principal "apigateway.amazonaws.com" \
  --source-arn "arn:aws:execute-api:${REGION}:655737485266:${API_ID}/*" \
  --region "$REGION" 2>/dev/null || echo "Permission already exists."

# Create integration
LAMBDA_ARN="arn:aws:lambda:${REGION}:655737485266:function:${FUNCTION_NAME}"
INTEGRATION_ID=$(aws apigatewayv2 create-integration \
  --api-id "$API_ID" \
  --integration-type AWS_PROXY \
  --integration-uri "$LAMBDA_ARN" \
  --payload-format-version "2.0" \
  --region "$REGION" \
  --query "IntegrationId" --output text 2>/dev/null) || {
    echo "Integration may already exist. Checking..."
    INTEGRATION_ID=$(aws apigatewayv2 get-integrations \
      --api-id "$API_ID" \
      --region "$REGION" \
      --query "Items[?IntegrationUri=='${LAMBDA_ARN}'].IntegrationId | [0]" --output text)
  }

echo "Integration ID: $INTEGRATION_ID"

# Create routes
aws apigatewayv2 create-route \
  --api-id "$API_ID" \
  --route-key "GET /user/ai-profile" \
  --target "integrations/$INTEGRATION_ID" \
  --authorization-type JWT \
  --authorizer-id "$(aws apigatewayv2 get-routes --api-id $API_ID --region $REGION --query "Items[?RouteKey=='GET /goals'].AuthorizerId | [0]" --output text)" \
  --region "$REGION" 2>/dev/null && echo "GET route created." || echo "GET route may already exist."

aws apigatewayv2 create-route \
  --api-id "$API_ID" \
  --route-key "PATCH /user/ai-profile" \
  --target "integrations/$INTEGRATION_ID" \
  --authorization-type JWT \
  --authorizer-id "$(aws apigatewayv2 get-routes --api-id $API_ID --region $REGION --query "Items[?RouteKey=='GET /goals'].AuthorizerId | [0]" --output text)" \
  --region "$REGION" 2>/dev/null && echo "PATCH route created." || echo "PATCH route may already exist."

# OPTIONS for CORS
aws apigatewayv2 create-route \
  --api-id "$API_ID" \
  --route-key "OPTIONS /user/ai-profile" \
  --target "integrations/$INTEGRATION_ID" \
  --region "$REGION" 2>/dev/null && echo "OPTIONS route created." || echo "OPTIONS route may already exist."

echo ""
echo "=== Done! ==="
echo "API endpoints:"
echo "  GET   https://${API_ID}.execute-api.${REGION}.amazonaws.com/user/ai-profile"
echo "  PATCH https://${API_ID}.execute-api.${REGION}.amazonaws.com/user/ai-profile"

# Clean up
rm -f function.zip
