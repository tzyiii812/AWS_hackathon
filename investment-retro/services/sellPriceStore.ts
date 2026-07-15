/**
 * sellPriceStore — 本地儲存使用者確認的賣出價格
 *
 * 每筆賣出紀錄以 key = `${symbol}_${yearMonth}` 識別。
 * 使用者可以：
 *   - 填入賣出價格 → 狀態 "confirmed"
 *   - 跳過 → 狀態 "skipped"（不計入已實現損益）
 *
 * 資料存在本地（AsyncStorage / localStorage），不上傳後端。
 */

import { getStoredValue, setStoredValue } from '@/services/storage';

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

/** 讀取所有賣出價格紀錄 */
export async function getAllSellPrices(): Promise<SellPriceRecord> {
  try {
    const raw = await getStoredValue(STORE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as SellPriceRecord;
  } catch {
    return {};
  }
}

/** 儲存一筆賣出價格（confirmed） */
export async function confirmSellPrice(
  symbol: string,
  yearMonth: string,
  sellPrice: number,
  soldShares: number
): Promise<void> {
  const all = await getAllSellPrices();
  const key = makeSellKey(symbol, yearMonth);
  all[key] = {
    symbol,
    yearMonth,
    sellPrice,
    status: 'confirmed',
    soldShares,
    updatedAt: new Date().toISOString(),
  };
  await setStoredValue(STORE_KEY, JSON.stringify(all));
}

/** 標記一筆賣出為跳過 */
export async function skipSellPrice(
  symbol: string,
  yearMonth: string,
  soldShares: number
): Promise<void> {
  const all = await getAllSellPrices();
  const key = makeSellKey(symbol, yearMonth);
  all[key] = {
    symbol,
    yearMonth,
    sellPrice: null,
    status: 'skipped',
    soldShares,
    updatedAt: new Date().toISOString(),
  };
  await setStoredValue(STORE_KEY, JSON.stringify(all));
}

/** 查詢單筆賣出的紀錄（尚未回答時回傳 undefined） */
export async function getSellPrice(
  symbol: string,
  yearMonth: string
): Promise<SellPriceEntry | undefined> {
  const all = await getAllSellPrices();
  return all[makeSellKey(symbol, yearMonth)];
}
