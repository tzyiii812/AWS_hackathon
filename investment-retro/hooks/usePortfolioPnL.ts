/**
 * usePortfolioPnL — 共用 Hook：用市場資料計算未實現損益
 *
 * === 單一持股公式 ===
 *   目前市值     = shares × currentPrice（市場資料收盤價）
 *   總成本       = shares × avgCost
 *   未實現損益   = 目前市值 - 總成本
 *   未實現報酬率 = 未實現損益 ÷ 總成本 × 100%
 *
 * === 整體投資組合公式 ===
 *   totalMarketValue    = Σ (有效 currentPrice 的持股市值)
 *   totalCost           = Σ (能同時算出 marketValue 和 cost 的持股成本)
 *   totalUnrealizedPnL  = Σ (unrealizedPnL !== null 的持股損益)  ← 不是 totalMV - totalCost
 *   totalReturnRate     = totalUnrealizedPnL ÷ calculableTotalCost × 100%
 *
 * === 邊界處理 ===
 *   - shares <= 0 → 排除，不參與任何計算
 *   - avgCost 無效 (null/NaN/Infinity/負數) → cost = null, 不參與損益加總
 *   - currentPrice 找不到 → marketValue = null, 不參與任何加總
 *   - totalCost = 0 → returnRate = null（不除以零）
 *   - 不使用 snapshot.marketValue 作為即時市值 fallback
 *
 * 此 hook 被 Home / Insights / Holdings 共用，確保計算一致。
 */

import { useEffect, useMemo, useState } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';
import { getLatestPriceValuation, type PriceData } from '@/services/marketData';

// === 型別 ===

export type HoldingPnL = {
  symbol: string;
  name: string;
  shares: number;
  avgCost: number | null;
  currentPrice: number | null;
  /** shares × currentPrice。若 currentPrice 無效則為 0（向下相容 UI） */
  marketValue: number;
  cost: number | null;
  unrealizedPnL: number | null;
  returnRate: number | null;
  weight: number;
  /** 原始 snapshot 中的市值（OCR 上傳時的值），僅供參考 */
  snapshotMarketValue: number | null;
  /** 是否有有效的目前價格 */
  hasPriceData: boolean;
  /** 是否有有效的成本資料 */
  hasCostData: boolean;
};

export type PortfolioPnLSummary = {
  /** 有效 currentPrice 的持股市值加總（找不到價格的不計入） */
  totalMarketValue: number;
  /** 能同時算出 MV 和 cost 的持股成本加總 */
  totalCost: number;
  /** 逐檔加總 unrealizedPnL !== null 的結果 */
  unrealizedPnL: number | null;
  /** totalUnrealizedPnL ÷ calculableTotalCost × 100 */
  returnRate: number | null;
  /** 有效持股數量（shares > 0） */
  holdingsCount: number;
  /** 計算後的持股清單（已排除 shares <= 0） */
  holdings: HoldingPnL[];
  /** 市場資料日期 (YYYYMMDD) */
  dataDate: string | null;
  /** 是否正在載入市場資料 */
  loading: boolean;

  // === 資料完整度資訊 ===
  /** 有效持股中找不到 currentPrice 的數量 */
  missingPriceCount: number;
  /** 有效持股中 avgCost 缺少或無效的數量 */
  missingCostCount: number;
  /** 能同時計算 marketValue、cost 與 unrealizedPnL 的持股數量 */
  calculableHoldingCount: number;
  /** missingPriceCount > 0 或 missingCostCount > 0 */
  hasIncompleteData: boolean;
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

// === Helper: 比對股票代號 ===

/**
 * 建立價格查找 Map。
 *
 * price_valuation_latest.json 中 股票代號 可能是：
 *   - number: 50, 2330, 712
 *   - string: "00631L", "00679B"
 *
 * PortfolioHolding.symbol 一律是 string: "0050", "2330", "712"
 *
 * 匹配策略：
 *   1. 以原始值的字串形式為 key（"50", "2330", "00631L"）
 *   2. 對純數字的 symbol，額外存一個補零到 4 位的 key（"50" → "0050"）
 *   3. 查找時先用原始 symbol，找不到再嘗試去掉前導零
 */
function buildPriceMap(priceData: PriceData[]): Map<string, PriceData> {
  const map = new Map<string, PriceData>();
  for (const p of priceData) {
    const rawSymbol = String(p.股票代號);
    // 存原始值
    map.set(rawSymbol, p);
    // 對純數字且不足 4 位的，補零存一份（e.g. "50" → "0050"）
    if (/^\d+$/.test(rawSymbol) && rawSymbol.length < 4) {
      map.set(rawSymbol.padStart(4, '0'), p);
    }
  }
  return map;
}

/** 從 priceMap 中查找股票，嘗試多種匹配方式 */
function lookupPrice(priceMap: Map<string, PriceData>, symbol: string): PriceData | undefined {
  // 直接匹配
  const direct = priceMap.get(symbol);
  if (direct) return direct;

  // 嘗試去掉前導零（"0050" → "50"、"0712" → "712"）
  if (/^0+\d/.test(symbol)) {
    const stripped = symbol.replace(/^0+/, '');
    const found = priceMap.get(stripped);
    if (found) return found;
  }

  return undefined;
}

// === Hook ===

export function usePortfolioPnL(): PortfolioPnLSummary {
  const { latest } = usePortfolio();
  const [priceMap, setPriceMap] = useState<Map<string, PriceData> | null>(null);
  const [dataDate, setDataDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 載入最新市場價格
  useEffect(() => {
    let active = true;

    getLatestPriceValuation()
      .then((snapshot) => {
        if (active) {
          setPriceMap(buildPriceMap(snapshot.data));
          setDataDate(snapshot.date);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  // 計算每檔持股的損益
  const result = useMemo((): PortfolioPnLSummary => {
    const emptyResult: PortfolioPnLSummary = {
      totalMarketValue: 0,
      totalCost: 0,
      unrealizedPnL: null,
      returnRate: null,
      holdingsCount: 0,
      holdings: [],
      dataDate,
      loading,
      missingPriceCount: 0,
      missingCostCount: 0,
      calculableHoldingCount: 0,
      hasIncompleteData: false,
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

    const holdings: HoldingPnL[] = [];

    for (const h of latest.holdings) {
      // --- 安全轉換 shares ---
      const shares = toValidPositiveNumber(h.shares);
      if (shares === null) continue; // shares <= 0 或無效 → 排除

      // --- 安全轉換 avgCost ---
      const avgCost = toValidNonNegativeNumber(h.avgCost);

      // --- 從市場資料取得目前價格 ---
      let currentPrice: number | null = null;
      if (priceMap && h.symbol) {
        const priceRow = lookupPrice(priceMap, h.symbol);
        if (priceRow) {
          const price = toValidNonNegativeNumber(priceRow.收盤價);
          if (price !== null && price > 0) {
            currentPrice = price;
          }
        }
      }

      // --- 計算目前市值 ---
      // 只有 currentPrice 有效時才計算
      let marketValue: number | null = null;
      const hasPriceData = currentPrice !== null;
      if (currentPrice !== null) {
        marketValue = shares * currentPrice;
      }

      // --- 計算持有成本 ---
      // 只有 avgCost 有效且 >= 0 時才計算
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
        // returnRate: cost > 0 才算，cost == 0 回傳 null
        if (cost > 0) {
          returnRate = (unrealizedPnL / cost) * 100;
        }
      }

      // --- 統計 ---
      if (!hasPriceData) missingPriceCount++;
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
        // marketValue: UI 用 .toLocaleString() 呼叫，給 0 作為安全值
        marketValue: marketValue ?? 0,
        cost,
        unrealizedPnL,
        returnRate,
        weight: 0, // 稍後計算
        snapshotMarketValue: toValidNonNegativeNumber(h.marketValue),
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
      dataDate,
      loading,
      missingPriceCount,
      missingCostCount,
      calculableHoldingCount,
      hasIncompleteData: missingPriceCount > 0 || missingCostCount > 0,
    };
  }, [latest, priceMap, dataDate, loading]);

  return result;
}
