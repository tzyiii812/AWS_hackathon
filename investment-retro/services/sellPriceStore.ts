/**
 * sellPriceStore — 賣出價格紀錄（本地 + 後端同步）
 *
 * 每筆賣出紀錄以 key = `${symbol}_${yearMonth}` 識別。
 * 使用者可以：
 *   - 填入賣出價格 → 狀態 "confirmed"
 *   - 跳過 → 狀態 "skipped"（不計入已實現損益）
 *
 * 資料同步策略：
 *   - 讀取時：從後端拉取，與本地合併（以較新的 updatedAt 為準）
 *   - 寫入時：同時存本地 + push 到後端（merge mode）
 *   - 後端不可用時 gracefully fallback 到本地
 */

import { getStoredValue, setStoredValue } from '@/services/storage';
import { getSellPricesFromServer, putSellPricesToServer } from '@/services/api';
import { APP_TODAY } from '@/config/appDate';

const STORE_KEY = 'sell_prices';

export type SellPriceStatus = 'confirmed' | 'skipped';

export type SellPriceEntry = {
  symbol: string;
  yearMonth: string;
  /** 使用者填寫的賣出價格（skipped 時為 null） */
  sellPrice: number | null;
  status: SellPriceStatus;
  /** 賣出股數（記錄用） */
  soldShares: number;
  /** 紀錄建立時間 */
  updatedAt: string;
};

export type SellPriceRecord = Record<string, SellPriceEntry>;

/** 產生唯一 key */
export function makeSellKey(symbol: string, yearMonth: string): string {
  return `${symbol}_${yearMonth}`;
}

// === Internal: access token getter (set by initSellPriceSync) ===

let _getAccessToken: (() => Promise<string>) | null = null;

/**
 * 初始化同步功能，需要在 app 啟動時呼叫一次。
 * 傳入取得 access token 的函數。
 */
export function initSellPriceSync(getAccessToken: () => Promise<string>): void {
  _getAccessToken = getAccessToken;
}

// === Local storage helpers ===

async function getLocal(): Promise<SellPriceRecord> {
  try {
    const raw = await getStoredValue(STORE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as SellPriceRecord;
  } catch {
    return {};
  }
}

async function setLocal(records: SellPriceRecord): Promise<void> {
  await setStoredValue(STORE_KEY, JSON.stringify(records));
}

// === Merge logic: prefer newer updatedAt ===

function mergeRecords(local: SellPriceRecord, remote: SellPriceRecord): SellPriceRecord {
  const merged = { ...remote };

  for (const [key, localEntry] of Object.entries(local)) {
    const remoteEntry = merged[key] as SellPriceEntry | undefined;
    if (!remoteEntry) {
      merged[key] = localEntry;
    } else {
      // Keep the one with newer updatedAt
      const localTime = new Date(localEntry.updatedAt).getTime();
      const remoteTime = new Date(remoteEntry.updatedAt).getTime();
      if (localTime > remoteTime) {
        merged[key] = localEntry;
      }
    }
  }

  return merged;
}

// === Push to backend (fire-and-forget, won't block) ===

async function pushToBackend(records: SellPriceRecord): Promise<void> {
  if (!_getAccessToken) return;
  try {
    const token = await _getAccessToken();
    await putSellPricesToServer(token, records as Record<string, unknown>, true);
  } catch (err) {
    console.warn('[sellPriceStore] Failed to push to backend:', err);
  }
}

// === Public API ===

/** 讀取所有賣出價格紀錄（合併本地 + 後端） */
export async function getAllSellPrices(): Promise<SellPriceRecord> {
  const local = await getLocal();

  // Try to fetch from backend and merge
  if (_getAccessToken) {
    try {
      const token = await _getAccessToken();
      const { records: remote } = await getSellPricesFromServer(token);
      const merged = mergeRecords(local, remote as SellPriceRecord);

      // Persist merged result locally
      await setLocal(merged);

      // If local had newer entries, push them to backend
      const localKeys = Object.keys(local);
      const hasLocalUpdates = localKeys.some((k) => {
        const remoteEntry = (remote as SellPriceRecord)[k];
        if (!remoteEntry) return true;
        return new Date(local[k].updatedAt).getTime() > new Date(remoteEntry.updatedAt).getTime();
      });

      if (hasLocalUpdates) {
        // Push merged to backend (don't await, non-blocking)
        pushToBackend(merged);
      }

      return merged;
    } catch (err) {
      console.warn('[sellPriceStore] Backend fetch failed, using local:', err);
    }
  }

  return local;
}

/** 儲存一筆賣出價格（confirmed） */
export async function confirmSellPrice(
  symbol: string,
  yearMonth: string,
  sellPrice: number,
  soldShares: number
): Promise<void> {
  const all = await getLocal();
  const key = makeSellKey(symbol, yearMonth);
  const entry: SellPriceEntry = {
    symbol,
    yearMonth,
    sellPrice,
    status: 'confirmed',
    soldShares,
    updatedAt: APP_TODAY.toISOString(),
  };
  all[key] = entry;
  await setLocal(all);

  // Sync to backend
  pushToBackend({ [key]: entry } as unknown as SellPriceRecord);
}

/** 標記一筆賣出為跳過 */
export async function skipSellPrice(
  symbol: string,
  yearMonth: string,
  soldShares: number
): Promise<void> {
  const all = await getLocal();
  const key = makeSellKey(symbol, yearMonth);
  const entry: SellPriceEntry = {
    symbol,
    yearMonth,
    sellPrice: null,
    status: 'skipped',
    soldShares,
    updatedAt: APP_TODAY.toISOString(),
  };
  all[key] = entry;
  await setLocal(all);

  // Sync to backend
  pushToBackend({ [key]: entry } as unknown as SellPriceRecord);
}

/** 查詢單筆賣出的紀錄（尚未回答時回傳 undefined） */
export async function getSellPrice(
  symbol: string,
  yearMonth: string
): Promise<SellPriceEntry | undefined> {
  const all = await getAllSellPrices();
  return all[makeSellKey(symbol, yearMonth)];
}
