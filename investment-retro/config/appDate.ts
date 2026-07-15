/**
 * App Date Configuration
 *
 * 本 App 的「現在」由資料包中最新的交易日自動決定。
 * 當你更換 data/ 下的 JSON 資料時，日期基準會自動跟著更新，
 * 不需要手動改這個檔案。
 *
 * 所有需要使用「今天日期」的地方都從這裡取得，
 * 確保 AI 分析、資料基準、顯示都一致。
 */

import priceLatest from '@/data/price_valuation_latest.json';

// 從最新行情資料的 date 欄位自動偵測（格式 YYYYMMDD）
const latestDateCompact: string = (priceLatest as { date: string }).date;

// 轉成各種常用格式
function compactToISO(compact: string): string {
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
}

function compactToYearMonth(compact: string): string {
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}`;
}

/** 格式化日期字串 YYYYMMDD（對應資料表日期格式） */
export const APP_TODAY_COMPACT = latestDateCompact;

/** 格式化日期字串 YYYY-MM-DD */
export const APP_TODAY_ISO = compactToISO(latestDateCompact);

/** 年月 YYYY-MM */
export const APP_CURRENT_YEAR_MONTH = compactToYearMonth(latestDateCompact);

/** 年份 */
export const APP_CURRENT_YEAR = Number(latestDateCompact.slice(0, 4));

/** App 的「今天」 */
export const APP_TODAY = new Date(`${APP_TODAY_ISO}T23:59:59+08:00`);

/** 取得 App 基準的 Date.now() 替代 */
export function appNow(): number {
  return APP_TODAY.getTime();
}

/** 取得 App 基準的 new Date() 替代 */
export function appToday(): Date {
  return new Date(APP_TODAY);
}

/** 取得 App 基準的 ISO 日期字串 */
export function appTodayISO(): string {
  return APP_TODAY_ISO;
}
