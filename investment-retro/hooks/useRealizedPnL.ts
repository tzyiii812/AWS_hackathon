/**
 * useRealizedPnL — 比對歷史快照，計算已實現損益
 *
 * === 流程 ===
 * 1. 比對相鄰兩期快照，偵測減碼/清倉
 * 2. 查詢 sellPriceStore 取得使用者確認的賣出價格
 *    - confirmed → 用使用者填的價格計算已實現損益
 *    - skipped → 不計入已實現損益
 *    - 未回答 → 列入 pendingTrades，等使用者確認
 *
 * === 公式 ===
 *   realizedPnL = soldShares × (sellPrice - avgCost)
 *
 * === 限制 ===
 * - 同月內的快速買賣（不跨快照）無法偵測
 * - avgCost 來自 OCR，本身可能有誤差
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePortfolioHistory } from '@/context/PortfolioHistoryContext';
import {
  getAllSellPrices,
  makeSellKey,
  type SellPriceRecord,
} from '@/services/sellPriceStore';
import type { PendingTrade } from '@/components/SellPricePrompt';

// === 型別 ===

export type RealizedTrade = {
  /** 賣出發生的月份 (YYYY-MM) */
  yearMonth: string;
  symbol: string;
  name: string;
  /** 賣出股數 */
  soldShares: number;
  /** 前一期的平均成本 */
  avgCost: number;
  /** 使用者確認的賣出價格 */
  sellPrice: number;
  /** 已實現損益 */
  realizedPnL: number;
  /** 是否為完全清倉 */
  isFullSell: boolean;
};

export type RealizedPnLSummary = {
  /** 所有已確認的已實現損益加總 */
  totalRealizedPnL: number | null;
  /** 已確認的賣出紀錄（時間由近到遠） */
  trades: RealizedTrade[];
  /** 已確認的賣出筆數 */
  confirmedCount: number;
  /** 使用者跳過的賣出筆數 */
  skippedCount: number;
  /** 尚未確認的賣出（需彈 Modal 詢問） */
  pendingTrades: PendingTrade[];
  /** 是否正在載入 */
  loading: boolean;
  /** 載入錯誤 */
  error: string | null;
  /** 重新載入 sellPriceStore（使用者填完價格後呼叫） */
  refresh: () => void;
};

// === 偵測所有賣出的原始結構（尚未對照 store） ===

type DetectedSell = {
  yearMonth: string;
  symbol: string;
  name: string;
  soldShares: number;
  avgCost: number;
  isFullSell: boolean;
};

// === Hook ===

export function useRealizedPnL(): RealizedPnLSummary {
  const { portfolios, loading: historyLoading } = usePortfolioHistory();
  const [sellPrices, setSellPrices] = useState<SellPriceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // 載入本地存的賣出價格紀錄
  useEffect(() => {
    let active = true;

    getAllSellPrices()
      .then((data) => {
        if (active) {
          setSellPrices(data);
          setLoading(false);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setLoading(false);
          setError(
            err instanceof Error
              ? `賣出紀錄載入失敗：${err.message}`
              : '賣出紀錄載入失敗。'
          );
        }
      });

    return () => { active = false; };
  }, [refreshKey, portfolios]);

  /** 使用者填完價格後呼叫，觸發重新讀取 store */
  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // 偵測所有賣出
  const detectedSells = useMemo((): DetectedSell[] => {
    if (portfolios.length < 2) return [];

    // 按 createdAt 排序（舊 → 新）
    const sorted = [...portfolios].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const sells: DetectedSell[] = [];

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];

      // 建立當期 holdings map
      const currMap = new Map<string, number>();
      for (const h of curr.holdings) {
        if (h.shares > 0) {
          currMap.set(h.symbol, h.shares);
        }
      }

      // 比對前期每檔持股
      for (const h of prev.holdings) {
        if (!h.shares || h.shares <= 0) continue;

        const currShares = currMap.get(h.symbol) ?? 0;
        const soldShares = h.shares - currShares;

        if (soldShares <= 0) continue;

        const avgCost = (h.avgCost != null && h.avgCost > 0) ? h.avgCost : 0;

        sells.push({
          yearMonth: curr.yearMonth,
          symbol: h.symbol,
          name: h.name || h.symbol,
          soldShares,
          avgCost,
          isFullSell: currShares === 0,
        });
      }
    }

    return sells;
  }, [portfolios]);

  // 依 sellPriceStore 狀態分類
  const result = useMemo((): RealizedPnLSummary => {
    const emptyResult: RealizedPnLSummary = {
      totalRealizedPnL: null,
      trades: [],
      confirmedCount: 0,
      skippedCount: 0,
      pendingTrades: [],
      loading: loading || historyLoading,
      error,
      refresh,
    };

    if (sellPrices === null || detectedSells.length === 0) {
      return emptyResult;
    }

    const trades: RealizedTrade[] = [];
    const pendingTrades: PendingTrade[] = [];
    let skippedCount = 0;

    for (const sell of detectedSells) {
      const key = makeSellKey(sell.symbol, sell.yearMonth);
      const entry = sellPrices[key];

      if (!entry) {
        // 尚未回答 → pending
        pendingTrades.push({
          symbol: sell.symbol,
          name: sell.name,
          yearMonth: sell.yearMonth,
          soldShares: sell.soldShares,
          isFullSell: sell.isFullSell,
          avgCost: sell.avgCost,
        });
      } else if (entry.status === 'skipped') {
        // 跳過 → 不計算
        skippedCount++;
      } else if (entry.status === 'confirmed' && entry.sellPrice != null) {
        // 已確認 → 計算已實現損益
        const realizedPnL = sell.soldShares * (entry.sellPrice - sell.avgCost);
        trades.push({
          yearMonth: sell.yearMonth,
          symbol: sell.symbol,
          name: sell.name,
          soldShares: sell.soldShares,
          avgCost: sell.avgCost,
          sellPrice: entry.sellPrice,
          realizedPnL,
          isFullSell: sell.isFullSell,
        });
      }
    }

    // 按時間由近到遠排序
    trades.sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));

    // 統計
    let totalRealizedPnL = 0;
    for (const t of trades) {
      totalRealizedPnL += t.realizedPnL;
    }

    return {
      totalRealizedPnL: trades.length > 0 ? totalRealizedPnL : null,
      trades,
      confirmedCount: trades.length,
      skippedCount,
      pendingTrades,
      loading: loading || historyLoading,
      error,
      refresh,
    };
  }, [detectedSells, sellPrices, loading, historyLoading, error, refresh]);

  return result;
}
