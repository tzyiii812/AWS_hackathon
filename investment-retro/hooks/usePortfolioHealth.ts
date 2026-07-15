/**
 * usePortfolioHealth — 計算投資組合健康度分數
 *
 * === 評分維度（每項 0~100，最終加權平均） ===
 *
 * 1. 集中度 (Concentration) — 單一股票占比是否過高
 *    - 最大持股占比 ≤ 15% → 100
 *    - 15%~30% → 線性遞減 70~100
 *    - 30%~50% → 線性遞減 40~70
 *    - > 50% → 線性遞減 0~40
 *
 * 2. 產業分散 (Sector Diversification) — 產業數量與單一產業占比
 *    - 5 個以上產業且最大占比 ≤ 30% → 100
 *    - 根據產業數和最大產業占比加權計算
 *
 * 3. ETF 與個股比例 (ETF Ratio) — ETF 占比越高分散效果越好
 *    - ETF 占比 20%~60% → 100（理想範圍）
 *    - 偏離此範圍按距離扣分
 *
 * 4. 波動風險 (Volatility) — 近期動能/乖離程度
 *    - 全部持股距年線乖離的絕對值加權平均
 *    - 乖離越小越穩定
 *
 * 5. 配息覆蓋 (Dividend Coverage) — 有配息的持股占比與殖利率
 *    - 有配息持股占比高且平均殖利率合理 → 高分
 *
 * === 等級映射 ===
 *   95~100 A+  |  90~94 A  |  85~89 A-
 *   80~84  B+  |  70~79 B  |  60~69 B-
 *   50~59  C+  |  40~49 C  |  < 40  C-
 */

import { useEffect, useMemo, useState } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';
import { usePortfolioPnL } from '@/hooks/usePortfolioPnL';
import {
  getIndustryClassification,
  getStocksBySymbols,
  type IndustryInfo,
  type StockSummary,
} from '@/services/marketData';

// === Types ===

export type Grade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-';

export type HealthDimension = {
  label: string;
  labelEn: string;
  score: number;
  grade: Grade;
  description: string;
};

export type PortfolioHealth = {
  totalScore: number;
  totalGrade: Grade;
  dimensions: {
    concentration: HealthDimension;
    sectorDiversification: HealthDimension;
    etfRatio: HealthDimension;
    volatility: HealthDimension;
    dividend: HealthDimension;
  };
  loading: boolean;
  ready: boolean;
};

// === Helpers ===

function scoreToGrade(score: number): Grade {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'A-';
  if (score >= 80) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 60) return 'B-';
  if (score >= 50) return 'C+';
  if (score >= 40) return 'C';
  return 'C-';
}

/** Linear interpolation: maps value from [min, max] to [scoreAtMin, scoreAtMax] */
function lerp(value: number, min: number, max: number, scoreAtMin: number, scoreAtMax: number): number {
  if (value <= min) return scoreAtMin;
  if (value >= max) return scoreAtMax;
  const t = (value - min) / (max - min);
  return scoreAtMin + t * (scoreAtMax - scoreAtMin);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// === Score Calculators ===

function calcConcentrationScore(weights: number[]): { score: number; description: string } {
  if (weights.length === 0) return { score: 50, description: '無持股資料' };

  const maxWeight = Math.max(...weights) * 100; // percentage

  let score: number;
  if (maxWeight <= 15) {
    score = 100;
  } else if (maxWeight <= 30) {
    score = lerp(maxWeight, 15, 30, 100, 70);
  } else if (maxWeight <= 50) {
    score = lerp(maxWeight, 30, 50, 70, 40);
  } else {
    score = lerp(maxWeight, 50, 100, 40, 0);
  }

  const description = maxWeight <= 20
    ? '持股分散良好'
    : maxWeight <= 35
      ? `最大持股占 ${maxWeight.toFixed(0)}%，略為集中`
      : `最大持股占 ${maxWeight.toFixed(0)}%，集中度偏高`;

  return { score: clamp(Math.round(score), 0, 100), description };
}

function calcSectorScore(
  holdingIndustries: Array<{ symbol: string; industry: string; weight: number }>
): { score: number; description: string } {
  if (holdingIndustries.length === 0) {
    return { score: 50, description: '無產業資料' };
  }

  // Group by industry
  const sectorWeights = new Map<string, number>();
  for (const h of holdingIndustries) {
    const current = sectorWeights.get(h.industry) ?? 0;
    sectorWeights.set(h.industry, current + h.weight);
  }

  const sectorCount = sectorWeights.size;
  const maxSectorWeight = Math.max(...sectorWeights.values()) * 100;

  // Score based on sector count (0~50 points)
  const countScore = clamp(sectorCount * 12, 0, 50); // 1 sector = 12, 4+ = 48~50

  // Score based on max sector weight (0~50 points)
  let weightScore: number;
  if (maxSectorWeight <= 30) {
    weightScore = 50;
  } else if (maxSectorWeight <= 50) {
    weightScore = lerp(maxSectorWeight, 30, 50, 50, 30);
  } else {
    weightScore = lerp(maxSectorWeight, 50, 100, 30, 0);
  }

  const score = clamp(Math.round(countScore + weightScore), 0, 100);

  const description = sectorCount >= 4 && maxSectorWeight <= 40
    ? `涵蓋 ${sectorCount} 個產業，分散良好`
    : sectorCount < 3
      ? `僅 ${sectorCount} 個產業，建議增加分散`
      : `${sectorCount} 個產業，最大占 ${maxSectorWeight.toFixed(0)}%`;

  return { score, description };
}

function calcEtfRatioScore(etfWeight: number): { score: number; description: string } {
  const pct = etfWeight * 100;

  let score: number;
  // Ideal range: 20%~60%
  if (pct >= 20 && pct <= 60) {
    score = 100;
  } else if (pct < 20) {
    // 0% → 50, 20% → 100
    score = lerp(pct, 0, 20, 50, 100);
  } else {
    // 60% → 100, 100% → 60 (too much ETF = less growth potential but not bad)
    score = lerp(pct, 60, 100, 100, 60);
  }

  const description = pct === 0
    ? '全部為個股，無 ETF 分散效果'
    : pct <= 20
      ? `ETF 占 ${pct.toFixed(0)}%，比例偏低`
      : pct <= 60
        ? `ETF 占 ${pct.toFixed(0)}%，比例適中`
        : `ETF 占 ${pct.toFixed(0)}%，個股比例較少`;

  return { score: clamp(Math.round(score), 0, 100), description };
}

function calcVolatilityScore(
  deviations: Array<{ symbol: string; deviation: number; weight: number }>
): { score: number; description: string } {
  if (deviations.length === 0) {
    return { score: 70, description: '無動能資料，預設中等' };
  }

  // Weighted average of absolute deviation from MA(year)
  const totalWeight = deviations.reduce((s, d) => s + d.weight, 0);
  if (totalWeight === 0) return { score: 70, description: '無有效權重' };

  const weightedAvgDeviation = deviations.reduce(
    (s, d) => s + Math.abs(d.deviation) * d.weight,
    0
  ) / totalWeight;

  // Low deviation = stable = high score
  let score: number;
  if (weightedAvgDeviation <= 5) {
    score = 100;
  } else if (weightedAvgDeviation <= 15) {
    score = lerp(weightedAvgDeviation, 5, 15, 100, 70);
  } else if (weightedAvgDeviation <= 30) {
    score = lerp(weightedAvgDeviation, 15, 30, 70, 40);
  } else {
    score = lerp(weightedAvgDeviation, 30, 60, 40, 10);
  }

  const description = weightedAvgDeviation <= 10
    ? '持股波動穩定'
    : weightedAvgDeviation <= 20
      ? `加權平均乖離 ${weightedAvgDeviation.toFixed(1)}%，波動適中`
      : `加權平均乖離 ${weightedAvgDeviation.toFixed(1)}%，波動偏大`;

  return { score: clamp(Math.round(score), 0, 100), description };
}

function calcDividendScore(
  dividendHoldings: Array<{ weight: number; yieldRate: number; consecutiveYears: number }>
): { score: number; description: string } {
  if (dividendHoldings.length === 0) {
    return { score: 40, description: '無配息資料' };
  }

  const totalWeight = dividendHoldings.reduce((s, d) => s + d.weight, 0);
  const coveragePct = totalWeight * 100; // 有配息的持股占比

  // Average yield weighted by position size
  const avgYield = totalWeight > 0
    ? dividendHoldings.reduce((s, d) => s + d.yieldRate * d.weight, 0) / totalWeight
    : 0;

  // Coverage score (0~50): 有配息持股占比
  const coverageScore = clamp(coveragePct * 0.6, 0, 50); // 83%+ → 50

  // Quality score (0~50): 殖利率在 3%~7% 最佳
  let qualityScore: number;
  if (avgYield >= 3 && avgYield <= 7) {
    qualityScore = 50;
  } else if (avgYield < 3) {
    qualityScore = lerp(avgYield, 0, 3, 10, 50);
  } else {
    // > 7% might be unsustainable but still okay
    qualityScore = lerp(avgYield, 7, 12, 50, 35);
  }

  const score = clamp(Math.round(coverageScore + qualityScore), 0, 100);

  const description = coveragePct >= 70 && avgYield >= 3
    ? `${coveragePct.toFixed(0)}% 持股有配息，平均殖利率 ${avgYield.toFixed(1)}%`
    : coveragePct < 30
      ? `僅 ${coveragePct.toFixed(0)}% 持股有配息`
      : `${coveragePct.toFixed(0)}% 持股有配息，殖利率 ${avgYield.toFixed(1)}%`;

  return { score, description };
}

// === Dimension Weights for total score ===
const WEIGHTS = {
  concentration: 0.25,
  sectorDiversification: 0.25,
  etfRatio: 0.15,
  volatility: 0.20,
  dividend: 0.15,
};

// === Main Hook ===

export function usePortfolioHealth(): PortfolioHealth {
  const { latest } = usePortfolio();
  const pnl = usePortfolioPnL();

  const [industryData, setIndustryData] = useState<IndustryInfo[]>([]);
  const [summaryData, setSummaryData] = useState<StockSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch market data on mount / when holdings change
  useEffect(() => {
    if (!latest || latest.holdings.length === 0) {
      setLoading(false);
      return;
    }

    const symbols = latest.holdings.map((h) => h.symbol).filter(Boolean);

    let cancelled = false;

    (async () => {
      try {
        const [industries, summaries] = await Promise.all([
          getIndustryClassification(),
          getStocksBySymbols(symbols),
        ]);
        if (!cancelled) {
          setIndustryData(industries);
          setSummaryData(summaries);
        }
      } catch {
        // Market data unavailable — we'll use partial scoring
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [latest]);

  const result = useMemo((): PortfolioHealth => {
    const emptyDimension = (label: string, labelEn: string): HealthDimension => ({
      label,
      labelEn,
      score: 0,
      grade: 'C-',
      description: '尚無資料',
    });

    const emptyResult: PortfolioHealth = {
      totalScore: 0,
      totalGrade: 'C-',
      dimensions: {
        concentration: emptyDimension('集中度', 'Concentration'),
        sectorDiversification: emptyDimension('分散程度', 'Diversification'),
        etfRatio: emptyDimension('ETF 比例', 'ETF Ratio'),
        volatility: emptyDimension('波動風險', 'Volatility'),
        dividend: emptyDimension('配息覆蓋', 'Dividend'),
      },
      loading,
      ready: false,
    };

    if (!latest || pnl.holdings.length === 0 || loading) {
      return { ...emptyResult, loading };
    }

    // Build weight map (from usePortfolioPnL)
    const totalMV = pnl.totalMarketValue;
    const holdingWeights = pnl.holdings.map((h) => ({
      symbol: h.symbol,
      weight: totalMV > 0 ? h.marketValue / totalMV : 1 / pnl.holdings.length,
    }));

    // --- 1. Concentration ---
    const weights = holdingWeights.map((h) => h.weight);
    const concentration = calcConcentrationScore(weights);

    // --- 2. Sector Diversification ---
    const industryMap = new Map(industryData.map((i) => [i.股票代號, i]));
    const holdingIndustries = holdingWeights
      .map((h) => {
        const info = industryMap.get(h.symbol);
        return {
          symbol: h.symbol,
          industry: info?.主產業 ?? '未分類',
          weight: h.weight,
        };
      });
    const sectorDiversification = calcSectorScore(holdingIndustries);

    // --- 3. ETF Ratio ---
    const etfWeight = holdingWeights
      .filter((h) => {
        const info = industryMap.get(h.symbol);
        return info?.主產業 === 'ETF/其他';
      })
      .reduce((sum, h) => sum + h.weight, 0);
    const etfRatio = calcEtfRatioScore(etfWeight);

    // --- 4. Volatility ---
    const summaryMap = new Map(summaryData.map((s) => [s.股票代號, s]));
    const deviations = holdingWeights
      .map((h) => {
        const s = summaryMap.get(h.symbol);
        const dev = s?.['距年線乖離(%)'] ?? null;
        if (dev === null) return null;
        return { symbol: h.symbol, deviation: dev, weight: h.weight };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null);
    const volatility = calcVolatilityScore(deviations);

    // --- 5. Dividend ---
    const dividendHoldings = holdingWeights
      .map((h) => {
        const s = summaryMap.get(h.symbol);
        const yieldRate = s?.['殖利率(%)'] ?? null;
        const years = s?.連續配息年數 ?? 0;
        if (yieldRate === null || yieldRate <= 0) return null;
        return { weight: h.weight, yieldRate, consecutiveYears: years };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null);
    const dividend = calcDividendScore(dividendHoldings);

    // --- Total Score ---
    const totalScore = clamp(
      Math.round(
        concentration.score * WEIGHTS.concentration +
        sectorDiversification.score * WEIGHTS.sectorDiversification +
        etfRatio.score * WEIGHTS.etfRatio +
        volatility.score * WEIGHTS.volatility +
        dividend.score * WEIGHTS.dividend
      ),
      0,
      100
    );

    return {
      totalScore,
      totalGrade: scoreToGrade(totalScore),
      dimensions: {
        concentration: {
          label: '集中度',
          labelEn: 'Concentration',
          score: concentration.score,
          grade: scoreToGrade(concentration.score),
          description: concentration.description,
        },
        sectorDiversification: {
          label: '分散程度',
          labelEn: 'Diversification',
          score: sectorDiversification.score,
          grade: scoreToGrade(sectorDiversification.score),
          description: sectorDiversification.description,
        },
        etfRatio: {
          label: 'ETF 比例',
          labelEn: 'ETF Ratio',
          score: etfRatio.score,
          grade: scoreToGrade(etfRatio.score),
          description: etfRatio.description,
        },
        volatility: {
          label: '波動風險',
          labelEn: 'Volatility',
          score: volatility.score,
          grade: scoreToGrade(volatility.score),
          description: volatility.description,
        },
        dividend: {
          label: '配息覆蓋',
          labelEn: 'Dividend',
          score: dividend.score,
          grade: scoreToGrade(dividend.score),
          description: dividend.description,
        },
      },
      loading: false,
      ready: true,
    };
  }, [latest, pnl, industryData, summaryData, loading]);

  return result;
}
