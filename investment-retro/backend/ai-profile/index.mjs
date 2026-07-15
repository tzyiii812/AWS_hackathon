/**
 * Lambda: AI User Profile
 *
 * Routes:
 *   GET   /user/ai-profile   — 取得使用者 AI 偏好設定
 *   PATCH /user/ai-profile   — 更新使用者 AI 偏好設定（可單欄位更新）
 *
 * 環境變數：
 *   AI_PROFILE_TABLE — DynamoDB table name (預設 "InvestmentRetro-AIProfiles")
 *
 * DynamoDB Schema:
 *   PK: userId (from JWT sub)
 *   Attributes: analysisPriority, drawdownTolerance, investmentStyle,
 *               goalTradeoff, investmentHorizon, completedQuestionIds,
 *               source, updatedAt
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.AI_PROFILE_TABLE || 'InvestmentRetro-AIProfiles';
const REGION = process.env.AWS_REGION || 'us-east-1';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization,content-type',
  'access-control-allow-methods': 'GET,PATCH,OPTIONS',
  'content-type': 'application/json',
};

// Valid field names and their allowed values
const VALID_FIELDS = {
  analysisPriority: ['stability', 'growth', 'income', 'goal_completion', 'unsure', null],
  drawdownTolerance: ['low', 'medium_low', 'medium', 'high', 'unsure', null],
  investmentStyle: ['dca', 'buy_and_hold', 'income', 'active', 'beginner', null],
  goalTradeoff: ['goal_first', 'balanced', 'growth_first', 'unsure', null],
  investmentHorizon: ['within_1_year', 'one_to_three_years', 'three_to_five_years', 'over_five_years', 'unsure', null],
};

// Map field names to question IDs
const FIELD_TO_QUESTION_ID = {
  analysisPriority: 'analysis_priority',
  drawdownTolerance: 'drawdown_tolerance',
  investmentStyle: 'investment_style',
  goalTradeoff: 'goal_tradeoff',
  investmentHorizon: 'goal_tradeoff', // shares question slot with goalTradeoff
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

const DEFAULT_PROFILE = {
  analysisPriority: null,
  drawdownTolerance: null,
  investmentStyle: null,
  goalTradeoff: null,
  investmentHorizon: null,
  completedQuestionIds: [],
  source: 'user_answered',
  updatedAt: null,
};

async function getProfile(userId) {
  const result = await ddb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { userId },
  }));

  if (!result.Item) {
    return response(200, { profile: { ...DEFAULT_PROFILE } });
  }

  const { userId: _uid, ...profile } = result.Item;
  return response(200, { profile });
}

async function patchProfile(userId, body) {
  // Validate fields
  const updates = [];
  const values = {};
  const completedIds = new Set();

  for (const [field, allowedValues] of Object.entries(VALID_FIELDS)) {
    if (field in body) {
      const value = body[field];
      if (value !== null && !allowedValues.includes(value)) {
        return response(400, {
          message: `欄位 ${field} 的值無效：${value}`,
        });
      }
      updates.push(`${field} = :${field}`);
      values[`:${field}`] = value;

      // Track completed question IDs
      if (value !== null && FIELD_TO_QUESTION_ID[field]) {
        completedIds.add(FIELD_TO_QUESTION_ID[field]);
      }
    }
  }

  if (updates.length === 0) {
    return response(400, { message: '沒有要更新的欄位。' });
  }

  // Get existing profile to merge completedQuestionIds
  const existing = await ddb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { userId },
  }));

  const existingCompleted = new Set(existing.Item?.completedQuestionIds || []);

  // Also compute completed from existing field values
  if (existing.Item) {
    for (const [field, qId] of Object.entries(FIELD_TO_QUESTION_ID)) {
      if (existing.Item[field] && !(field in body)) {
        existingCompleted.add(qId);
      }
    }
  }

  // Merge
  for (const id of completedIds) {
    existingCompleted.add(id);
  }

  // Remove question IDs for fields being set to null
  for (const [field, allowedValues] of Object.entries(VALID_FIELDS)) {
    if (field in body && body[field] === null && FIELD_TO_QUESTION_ID[field]) {
      existingCompleted.delete(FIELD_TO_QUESTION_ID[field]);
    }
  }

  const allCompleted = [...existingCompleted];
  const now = new Date().toISOString();

  updates.push('completedQuestionIds = :cids');
  values[':cids'] = allCompleted;

  updates.push('#src = :src');
  values[':src'] = 'user_answered';

  updates.push('updatedAt = :now');
  values[':now'] = now;

  const names = { '#src': 'source' };

  await ddb.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { userId },
    UpdateExpression: `SET ${updates.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));

  // Return updated profile
  const updatedResult = await ddb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { userId },
  }));

  const { userId: _uid, ...profile } = updatedResult.Item || {};
  return response(200, { profile, message: '已更新。' });
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
      return await getProfile(userId);
    }

    if (method === 'PATCH') {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || {});
      return await patchProfile(userId, body);
    }

    return response(404, { message: '找不到路由。' });
  } catch (err) {
    console.error('AI Profile Error:', err);
    return response(500, { message: '伺服器錯誤。', error: err.message });
  }
}
