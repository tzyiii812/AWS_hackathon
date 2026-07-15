/**
 * Lambda: Goals CRUD
 *
 * Routes:
 *   GET    /goals        — 列出使用者所有目標
 *   POST   /goals        — 新增目標
 *   PUT    /goals/{id}   — 修改目標
 *   DELETE /goals/{id}   — 刪除目標
 *
 * 環境變數：
 *   GOALS_TABLE — DynamoDB table name (預設 "InvestmentRetro-Goals")
 *
 * DynamoDB Schema:
 *   PK: userId (from JWT sub)
 *   SK: goalId
 *   Attributes: icon, name, targetAmount, description, completed, createdAt, updatedAt
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'node:crypto';

const TABLE_NAME = process.env.GOALS_TABLE || 'InvestmentRetro-Goals';
const REGION = process.env.AWS_REGION || 'us-east-1';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization,content-type',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'content-type': 'application/json',
};

function getUserId(event) {
  // API Gateway HTTP API JWT authorizer puts claims in requestContext
  const claims = event.requestContext?.authorizer?.jwt?.claims;
  if (claims?.sub) return claims.sub;
  // Fallback: Cognito authorizer
  if (claims?.['cognito:username']) return claims['cognito:username'];
  // Fallback: from header (for testing without authorizer)
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

// === Handlers ===

async function listGoals(userId) {
  const result = await ddb.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': userId },
  }));

  const goals = (result.Items || []).map((item) => ({
    id: item.goalId,
    icon: item.icon || '🎯',
    name: item.name,
    targetAmount: item.targetAmount,
    description: item.description || '',
    completed: item.completed || false,
    createdAt: item.createdAt,
    imageKey: item.imageKey || null,
    achievementImageKey: item.achievementImageKey || null,
  }));

  // Sort by createdAt ascending
  goals.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

  return response(200, { goals });
}

async function createGoal(userId, body) {
  if (!body.name || !body.targetAmount) {
    return response(400, { message: '需要 name 和 targetAmount。' });
  }

  const goalId = `goal_${randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  const item = {
    userId,
    goalId,
    icon: body.icon || '🎯',
    name: body.name,
    targetAmount: Number(body.targetAmount),
    description: body.description || '',
    completed: false,
    imageKey: body.imageKey || null,
    achievementImageKey: null,
    createdAt: now,
    updatedAt: now,
  };

  await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));

  return response(201, {
    message: '目標已建立。',
    goal: {
      id: goalId,
      icon: item.icon,
      name: item.name,
      targetAmount: item.targetAmount,
      description: item.description,
      completed: item.completed,
      createdAt: item.createdAt,
      imageKey: item.imageKey,
      achievementImageKey: item.achievementImageKey,
    },
  });
}

async function updateGoal(userId, goalId, body) {
  const updates = [];
  const names = {};
  const values = {};

  if (body.name !== undefined) {
    updates.push('#n = :name');
    names['#n'] = 'name';
    values[':name'] = body.name;
  }
  if (body.icon !== undefined) {
    updates.push('icon = :icon');
    values[':icon'] = body.icon;
  }
  if (body.targetAmount !== undefined) {
    updates.push('targetAmount = :amt');
    values[':amt'] = Number(body.targetAmount);
  }
  if (body.description !== undefined) {
    updates.push('description = :desc');
    values[':desc'] = body.description;
  }
  if (body.completed !== undefined) {
    updates.push('completed = :comp');
    values[':comp'] = Boolean(body.completed);
  }
  if (body.imageKey !== undefined) {
    updates.push('imageKey = :img');
    values[':img'] = body.imageKey;
  }
  if (body.achievementImageKey !== undefined) {
    updates.push('achievementImageKey = :achImg');
    values[':achImg'] = body.achievementImageKey;
  }

  if (updates.length === 0) {
    return response(400, { message: '沒有要更新的欄位。' });
  }

  updates.push('updatedAt = :now');
  values[':now'] = new Date().toISOString();

  await ddb.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { userId, goalId },
    UpdateExpression: `SET ${updates.join(', ')}`,
    ...(Object.keys(names).length > 0 && { ExpressionAttributeNames: names }),
    ExpressionAttributeValues: values,
  }));

  return response(200, { message: '目標已更新。' });
}

async function deleteGoal(userId, goalId) {
  await ddb.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { userId, goalId },
  }));

  return response(200, { message: '目標已刪除。' });
}

// === Main Handler ===

export async function handler(event) {
  // CORS preflight
  const method = event.requestContext?.http?.method || event.httpMethod || '';
  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  const userId = getUserId(event);
  if (!userId) {
    return response(401, { message: '未授權。' });
  }

  const path = event.rawPath || event.path || '';
  const routeKey = event.routeKey || `${method} ${path}`;

  try {
    // Extract goalId from path: /goals/{goalId}
    const pathMatch = path.match(/\/goals\/([^/]+)/);
    const goalId = pathMatch?.[1] || null;

    if (method === 'GET' && !goalId) {
      return await listGoals(userId);
    }

    if (method === 'POST' && !goalId) {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || {});
      return await createGoal(userId, body);
    }

    if (method === 'PUT' && goalId) {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || {});
      return await updateGoal(userId, goalId, body);
    }

    if (method === 'DELETE' && goalId) {
      return await deleteGoal(userId, goalId);
    }

    return response(404, { message: '找不到路由。' });
  } catch (err) {
    console.error('Goals Error:', err);
    return response(500, { message: '伺服器錯誤。', error: err.message });
  }
}
