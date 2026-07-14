import { APP_CONFIG } from '@/config/env';

export type PortfolioHolding = {
  symbol: string;
  name?: string | null;
  shares: number;
  avgCost?: number | null;
  marketValue?: number | null;
  pnl?: number | null;
};

export type PortfolioSnapshot = {
  userId: string;
  snapshotId: string;
  yearMonth: string;
  holdings: PortfolioHolding[];
  totalCost: number;
  totalMarketValue: number;
  totalPnL: number;
  screenshotKeys: string[];
  note: string;
  currency: string;
  broker?: string | null;
  createdAt: string;
};

export type OcrResult = {
  holdings: PortfolioHolding[];
  currency?: string;
  totalMarketValue?: number;
  broker?: string | null;
  confidence?: string;
};

export type UploadUrlResult = {
  uploadUrl: string;
  key: string;
  method?: string;
  expiresIn?: number;
  requiredHeaders?: Record<string, string>;
};

export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function unwrapLambdaPayload(data: unknown): unknown {
  if (
    data &&
    typeof data === 'object' &&
    'statusCode' in data &&
    'body' in data &&
    typeof (data as { body?: unknown }).body === 'string'
  ) {
    try {
      return JSON.parse((data as { body: string }).body);
    } catch {
      return data;
    }
  }

  return data;
}

async function apiRequest<T>(
  path: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('authorization', `Bearer ${accessToken}`);
  headers.set('accept', 'application/json');

  if (options.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const response = await fetch(`${APP_CONFIG.apiBaseUrl}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let parsed: unknown = null;

  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  const data = unwrapLambdaPayload(parsed);

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'message' in data
        ? String((data as { message: unknown }).message)
        : `API 請求失敗（${response.status}）`;

    throw new ApiError(response.status, message, data);
  }

  return data as T;
}

export async function getPortfolioUploadUrl(
  accessToken: string,
  fileName: string,
  contentType = 'image/jpeg'
): Promise<UploadUrlResult> {
  const query = new URLSearchParams({ fileName, contentType });
  const data = await apiRequest<UploadUrlResult>(
    `/portfolio/upload-url?${query.toString()}`,
    accessToken
  );

  if (!data.uploadUrl || !data.key) {
    throw new ApiError(500, '上傳網址 API 沒有回傳 uploadUrl 或 key。', data);
  }

  return data;
}

export async function uploadImageToS3(
  upload: UploadUrlResult,
  localUri: string,
  contentType = 'image/jpeg'
): Promise<void> {
  const localResponse = await fetch(localUri);

  if (!localResponse.ok) {
    throw new ApiError(localResponse.status, '無法讀取選取的圖片。');
  }

  const blob = await localResponse.blob();
  const headers = new Headers(upload.requiredHeaders ?? {});
  headers.set('content-type', contentType);

  const response = await fetch(upload.uploadUrl, {
    method: upload.method ?? 'PUT',
    headers,
    body: blob,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new ApiError(
      response.status,
      `圖片上傳失敗（${response.status}）`,
      detail
    );
  }
}

export async function runPortfolioOcr(
  accessToken: string,
  key: string
): Promise<{ key: string; result: OcrResult }> {
  return apiRequest('/portfolio/ocr', accessToken, {
    method: 'POST',
    body: JSON.stringify({ key }),
  });
}

export async function createPortfolio(
  accessToken: string,
  input: {
    holdings: PortfolioHolding[];
    screenshotKeys: string[];
    note?: string;
    currency?: string;
    broker?: string | null;
    totalMarketValue?: number;
    totalCost?: number;
    totalPnL?: number;
    yearMonth?: string;
  }
): Promise<{ message: string; portfolio: PortfolioSnapshot }> {
  return apiRequest('/portfolio', accessToken, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getLatestPortfolio(
  accessToken: string
): Promise<{ portfolio: PortfolioSnapshot }> {
  return apiRequest('/portfolio/latest', accessToken);
}

export async function getPortfolioHistory(
  accessToken: string,
  limit = 12,
  nextToken?: string
): Promise<{
  portfolios: PortfolioSnapshot[];
  count: number;
  nextToken: string | null;
}> {
  const query = new URLSearchParams({ limit: String(limit) });

  if (nextToken) {
    query.set('nextToken', nextToken);
  }

  return apiRequest(`/portfolio/history?${query.toString()}`, accessToken);
}
