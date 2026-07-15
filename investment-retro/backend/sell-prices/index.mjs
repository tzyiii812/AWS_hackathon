/**
 * Lambda: Sell Prices (已實現損益 — 賣出價格紀錄)
 *
 * Routes:
 *   GET /user/sell-prices  — 取得使用者所有賣出價格紀錄
 *   PUT /user/sell-prices  — 整批覆蓋或合併賣出價格紀錄
 *
 * 環境變數：
 *   SELL_PRICES_TABLE — DynamoDB table name (預設 "InvestmentRetro-SellPrices")
 *
 * DynamoDB Schema:
 *   PK: userId (from JWT sub)
 *   Attribute: records (Map — key: symbol_yearMonth, value: SellPriceEntry)
 *   Attribute: updatedAt
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.SELL_PRICES_TABLE || 'InvestmentRetro-SellPrices';
const REGION = process.env.AWS_REGION || 'us-east-1';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization,content-type',
  'access-control-allow-methods': 'GET,PUT,OPTIONS',
  'content-type': 'application/json',
};

function getUserId(event) {
  const claims = event.requestContext?.authorizer?.jwt?.claims;
  if (claims?.sub) return claims.sub;
  if (claims?.['cognito:username']) return claims['cognito:username'];
  const auth = event.headers?.authorization || '';
  if (auth.startsWith('Bearer ')) {
    try {
      const payload = JSON.parse(Buffer.from(auth.split('.')[1], 'base64').toString());
      return payload.sub || payload['cognito:username'] || null;
    } catch { /* */ }
  }
  return null;
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

async function getSellPrices(userId) {
  const result = await ddb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { userId },
  }));

  if (!result.Item) {
    return response(200, { records: {} });
  }

  return response(200, { records: result.Item.records || {} });
}

async function putSellPrices(userId, body) {
  const records = body.records;

  if (!records || typeof records !== 'object') {
    return response(400, { message: '缺少 records 欄位。' });
  }

  // Merge mode: fetch existing and merge
  if (body.merge) {
    const existing = await ddb.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { userId },
    }));

    const existingRecords = existing.Item?.records || {};
    const merged = { ...existingRecords, ...records };

    await ddb.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        userId,
        records: merged,
        updatedAt: new Date().toISOString(),
      },
    }));

    return response(200, { records: merged, message: '已合併儲存。' });
  }

  // Overwrite mode
  await ddb.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      userId,
      records,
      updatedAt: new Date().toISOString(),
    },
  }));

  return response(200, { records, message: '已儲存。' });
}

// === Main Handler ===

export async function handler(event) {
  const method = event.requestContext?.http?.method || event.httpMethod || '';
  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  const userId = getUserId(event);
  if (!userId) {
    return response(401, { message: '未授權。' });
  }

  try {
    if (method === 'GET') {
      return await getSellPrices(userId);
    }

    if (method === 'PUT') {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || {});
      return await putSellPrices(userId, body);
    }

    return response(404, { message: '找不到路由。' });
  } catch (err) {
    console.error('SellPrices Error:', err);
    return response(500, { message: '伺服器錯誤。', error: err.message });
  }
}
