/**
 * usePortfolioPnL — 共用 Hook：用後端 OCR 辨識的市值計算未實現損益
 *
 * === 單一持股公式 ===
 *   目前市值     = holding.marketValue（OCR 從券商截圖辨識出的市值）
 *   現價（反推） = marketValue ÷ shares
 *   總成本       = shares × avgCost
 *   未實現損益   = 目前市值 - 總成本
 *   未實現報酬率 = 未實現損益 ÷ 總成本 × 100%
 *
 * === 整體投資組合公式 ===
 *   totalMarketValue    = Σ (有效 marketValue 的持股市值)
 *   totalCost           = Σ (能同時算出 marketValue 和 cost 的持股成本)
 *   totalUnrealizedPnL  = Σ (unrealizedPnL !== null 的持股損益)
 *   totalReturnRate     = totalUnrealizedPnL ÷ calculableTotalCost × 100%
 *
 * === 邊界處理 ===
 *   - shares <= 0 → 排除，不參與任何計算
 *   - avgCost 無效 (null/NaN/Infinity/負數) → cost = null, 不參與損益加總
 *   - marketValue 無效 → 不參與市值和損益加總
 *   - totalCost = 0 → returnRate = null（不除以零）
 *
 * 此 hook 被 Home / Insights / Holdings 共用，確保計算一致。
 */

import { useMemo } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';

// === 型別 ===

export type HoldingPnL = {
  symbol: string;
  name: string;
  shares: number;
  avgCost: number | null;
  /** 由 marketValue / shares 反推的現價 */
  currentPrice: number | null;
  /** OCR 辨識的市值（直接使用） */
  marketValue: number;
  cost: number | null;
  unrealizedPnL: number | null;
  returnRate: number | null;
  weight: number;
  /** 是否有有效的市值資料 */
  hasPriceData: boolean;
  /** 是否有有效的成本資料 */
  hasCostData: boolean;
};

export type PortfolioPnLSummary = {
  /** 有效市值的持股加總 */
  totalMarketValue: number;
  /** 能同時算出 marketValue 和 cost 的持股成本加總 */
  totalCost: number;
  /** 逐檔加總 unrealizedPnL !== null 的結果 */
  unrealizedPnL: number | null;
  /** totalUnrealizedPnL ÷ calculableTotalCost × 100 */
  returnRate: number | null;
  /** 有效持股數量（shares > 0） */
  holdingsCount: number;
  /** 計算後的持股清單（已排除 shares <= 0） */
  holdings: HoldingPnL[];
  /** 快照建立日期 */
  dataDate: string | null;
  /** 是否正在載入（現在直接用 snapshot，不需另外載入） */
  loading: boolean;
  /** 錯誤訊息 */
  error: string | null;

  // === 資料完整度資訊 ===
  /** 有效持股中 marketValue 缺失的數量 */
  missingPriceCount: number;
  /** 有效持股中 avgCost 缺少或無效的數量 */
  missingCostCount: number;
  /** 能同時計算 marketValue、cost 與 unrealizedPnL 的持股數量 */
  calculableHoldingCount: number;
  /** missingPriceCount > 0 或 missingCostCount > 0 */
  hasIncompleteData: boolean;
  /** 缺少市值資料的股票代號清單（供除錯用） */
  unmatchedSymbols: string[];
};

// === Helper: 安全數值轉換 ===

/**
 * 將任意值安全轉為有效正數，無效時回傳 null。
 * 排除：NaN, Infinity, 負數, null, undefined, 空字串
 */
function toValidPositiveNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n <= 0) return null;
  return n;
}

/**
 * 將任意值安全轉為有效非負數（允許 0），無效時回傳 null。
 * 排除：NaN, Infinity, 負數, null, undefined, 空字串
 */
function toValidNonNegativeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return null;
  return n;
}

// === Hook ===

export function usePortfolioPnL(): PortfolioPnLSummary {
  const { latest, loading: portfolioLoading } = usePortfolio();

  const result = useMemo((): PortfolioPnLSummary => {
    const emptyResult: PortfolioPnLSummary = {
      totalMarketValue: 0,
      totalCost: 0,
      unrealizedPnL: null,
      returnRate: null,
      holdingsCount: 0,
      holdings: [],
      dataDate: latest?.createdAt ?? null,
      loading: portfolioLoading,
      error: null,
      missingPriceCount: 0,
      missingCostCount: 0,
      calculableHoldingCount: 0,
      hasIncompleteData: false,
      unmatchedSymbols: [],
    };

    if (!latest) return emptyResult;

    // === 逐檔計算 ===
    let totalMarketValue = 0;
    let calculableTotalCost = 0;
    let totalUnrealizedPnL = 0;
    let hasAnyPnL = false;
    let missingPriceCount = 0;
    let missingCostCount = 0;
    let calculableHoldingCount = 0;
    const unmatchedSymbols: string[] = [];

    const holdings: HoldingPnL[] = [];

    for (const h of latest.holdings) {
      // --- 安全轉換 shares ---
      const shares = toValidPositiveNumber(h.shares);
      if (shares === null) continue; // shares <= 0 或無效 → 排除

      // --- 安全轉換 avgCost ---
      const avgCost = toValidNonNegativeNumber(h.avgCost);

      // --- 直接使用 OCR 辨識的 marketValue ---
      const rawMarketValue = toValidNonNegativeNumber(h.marketValue);
      const hasPriceData = rawMarketValue !== null && rawMarketValue > 0;
      const marketValue = hasPriceData ? rawMarketValue : null;

      // --- 反推現價（供 UI 顯示用） ---
      const currentPrice = marketValue !== null && shares > 0
        ? marketValue / shares
        : null;

      // --- 計算持有成本 ---
      let cost: number | null = null;
      const hasCostData = avgCost !== null;
      if (avgCost !== null) {
        cost = shares * avgCost;
      }

      // --- 計算未實現損益 ---
      let unrealizedPnL: number | null = null;
      let returnRate: number | null = null;

      if (marketValue !== null && cost !== null) {
        unrealizedPnL = marketValue - cost;
        if (cost > 0) {
          returnRate = (unrealizedPnL / cost) * 100;
        }
      }

      // --- 統計 ---
      if (!hasPriceData) {
        missingPriceCount++;
        unmatchedSymbols.push(h.symbol);
      }
      if (!hasCostData) missingCostCount++;

      if (marketValue !== null) {
        totalMarketValue += marketValue;
      }

      if (unrealizedPnL !== null) {
        calculableHoldingCount++;
        calculableTotalCost += cost!;
        totalUnrealizedPnL += unrealizedPnL;
        hasAnyPnL = true;
      }

      // --- 組合結果 ---
      holdings.push({
        symbol: h.symbol,
        name: h.name || h.symbol,
        shares,
        avgCost,
        currentPrice,
        marketValue: marketValue ?? 0,
        cost,
        unrealizedPnL,
        returnRate,
        weight: 0, // 稍後計算
        hasPriceData,
        hasCostData,
      });
    }

    // === 計算權重 ===
    if (totalMarketValue > 0) {
      for (const holding of holdings) {
        holding.weight = (holding.marketValue / totalMarketValue) * 100;
      }
    }

    // === 整體損益 ===
    const portfolioPnL = hasAnyPnL ? totalUnrealizedPnL : null;
    const portfolioReturnRate =
      portfolioPnL !== null && calculableTotalCost > 0
        ? (portfolioPnL / calculableTotalCost) * 100
        : null;

    return {
      totalMarketValue,
      totalCost: calculableTotalCost,
      unrealizedPnL: portfolioPnL,
      returnRate: portfolioReturnRate,
      holdingsCount: holdings.length,
      holdings,
      dataDate: latest.createdAt,
      loading: portfolioLoading,
      error: null,
      missingPriceCount,
      missingCostCount,
      calculableHoldingCount,
      hasIncompleteData: missingPriceCount > 0 || missingCostCount > 0,
      unmatchedSymbols,
    };
  }, [latest, portfolioLoading]);

  return result;
}
