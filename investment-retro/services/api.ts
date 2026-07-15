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
  totalCost?: number;
  totalMarketValue: number;
  totalPnL?: number;
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

export type JournalReport = {
  title: string;
  summary: string;
  goalAndAdvice: string;
  encouragement: string;
  closing: string;
};

export type JournalGenerateResult = {
  yearMonth: string;
  portfolio: {
    totalMarketValue: number;
    totalPnL: number;
    holdingsCount: number;
  };
  journal: JournalReport;
  cached: boolean;
};

export type JournalListItem = {
  month: string;
  title: string;
  closing: string;
  portfolio: {
    totalMarketValue: number;
    totalPnL: number;
    holdingsCount: number;
  };
};

export async function listJournals(
  accessToken: string
): Promise<{ journals: JournalListItem[] }> {
  return apiRequest('/journal/list', accessToken);
}

export async function generateJournal(
  accessToken: string,
  yearMonth: string
): Promise<JournalGenerateResult> {
  // Journal 生成需要較長時間（AI 處理），加入 retry 機制
  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 55000);

      const headers = new Headers();
      headers.set('authorization', `Bearer ${accessToken}`);
      headers.set('accept', 'application/json');
      headers.set('content-type', 'application/json');

      const response = await fetch(`${APP_CONFIG.apiBaseUrl}/journal/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ yearMonth }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const text = await response.text();
      let parsed: unknown = null;

      if (text) {
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = text;
        }
      }

      // Unwrap Lambda payload if needed
      if (
        parsed &&
        typeof parsed === 'object' &&
        'statusCode' in parsed &&
        'body' in parsed &&
        typeof (parsed as { body?: unknown }).body === 'string'
      ) {
        try {
          parsed = JSON.parse((parsed as { body: string }).body);
        } catch {
          // keep parsed as-is
        }
      }

      if (!response.ok) {
        const message =
          parsed && typeof parsed === 'object' && 'message' in parsed
            ? String((parsed as { message: unknown }).message)
            : `月報生成失敗（${response.status}）`;
        throw new ApiError(response.status, message, parsed);
      }

      return parsed as JournalGenerateResult;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      // 如果是 timeout 或 5xx，重試
      if (
        err instanceof ApiError && err.status >= 500 ||
        (err instanceof Error && err.name === 'AbortError')
      ) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      throw err;
    }
  }

  throw new ApiError(500, '月報生成失敗，請稍後再試');
}

// === Goals API ===

export type GoalData = {
  id: string;
  icon: string;
  name: string;
  targetAmount: number;
  description: string;
  completed: boolean;
  createdAt: string;
  /** S3 key for the goal's inspiration/target photo */
  imageKey?: string | null;
  /** S3 key for the achievement photo (uploaded when goal is completed) */
  achievementImageKey?: string | null;
};

export async function listGoals(
  accessToken: string
): Promise<{ goals: GoalData[] }> {
  return apiRequest('/goals', accessToken);
}

export async function createGoalApi(
  accessToken: string,
  input: { icon: string; name: string; targetAmount: number; description?: string; imageKey?: string | null }
): Promise<{ message: string; goal: GoalData }> {
  return apiRequest('/goals', accessToken, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateGoalApi(
  accessToken: string,
  goalId: string,
  input: Partial<{ icon: string; name: string; targetAmount: number; description: string; completed: boolean; imageKey: string | null; achievementImageKey: string | null }>
): Promise<{ message: string }> {
  return apiRequest(`/goals/${goalId}`, accessToken, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deleteGoalApi(
  accessToken: string,
  goalId: string
): Promise<{ message: string }> {
  return apiRequest(`/goals/${goalId}`, accessToken, {
    method: 'DELETE',
  });
}

// === Image URL ===

export async function getImageReadUrl(key: string, _accessToken?: string): Promise<string> {
  const query = new URLSearchParams({ key });
  const response = await fetch(`${APP_CONFIG.apiBaseUrl}/image-url?${query.toString()}`);
  if (!response.ok) {
    throw new ApiError(response.status, '無法取得圖片連結。');
  }
  const data = await response.json();
  return data.url;
}
