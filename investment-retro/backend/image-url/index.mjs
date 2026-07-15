/**
 * Lambda: GET /image-url?key=xxx
 *
 * 回傳 S3 presigned GET URL，讓前端讀取私有圖片。
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const BUCKET = process.env.SCREENSHOTS_BUCKET || 'investment-retro-screenshots-yphcpy-2026';
const REGION = process.env.AWS_REGION || 'us-east-1';

const s3 = new S3Client({ region: REGION });

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization,content-type',
  'access-control-allow-methods': 'GET,OPTIONS',
  'content-type': 'application/json',
};

export async function handler(event) {
  if ((event.requestContext?.http?.method || event.httpMethod) === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  const key = event.queryStringParameters?.key;

  if (!key) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: '缺少 key 參數。' }),
    };
  }

  try {
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ url }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: '無法產生圖片連結。', error: err.message }),
    };
  }
}
