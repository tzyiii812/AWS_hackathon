/**
 * Market Data API Service
 * 提供後端 AI 可以呼叫的市場資料查詢 API。
 * 這個 service 將資料打包成適合 AI prompt 使用的格式。
 */

import {
  getStockFullProfile,
  getPortfolioMarketData,
  getStockSummary,
  getMarketRanking,
  searchStocks,
  getStockPriceHistory,
  getStockReturnHistory,
  getStockInstitutionalHistory,
  getAllIndustries,
  getStocksByIndustry,
  getConsecutiveDividendStocks,
  getConsecutiveDividendETF,
  getFieldDictionary,
  type StockSummary,
  type StockFullProfile,
} from './marketData';
import { APP_TODAY_ISO } from '@/config/appDate';

// === AI Context Builder ===

/**
 * 為 AI 產生使用者持股的市場分析上下文
 * 這是 AI 回答投資問題時最常需要的資料
 */
export async function buildPortfolioContext(
  holdingSymbols: string[]
): Promise<string> {
  if (holdingSymbols.length === 0) {
    return '使用者目前沒有持股資料。';
  }

  const profiles = await getPortfolioMarketData(holdingSymbols);
  const lines: string[] = [
    `## 使用者持股市場資料（資料日期：${APP_TODAY_ISO}）\n`,
  ];

  for (const symbol of holdingSymbols) {
    const p = profiles[symbol];
    if (!p || !p.summary) {
      lines.push(`### ${symbol}：查無資料\n`);
      continue;
    }

    const s = p.summary;
    lines.push(`### ${s.股票代號} ${s.股票名稱}（${s.產業}）`);
    lines.push(`- 收盤價：${s.收盤價 ?? 'N/A'}`);
    lines.push(`- 總市值：${s['總市值(億)'] ?? 'N/A'} 億`);
    lines.push(`- 本益比(近四季)：${s['本益比(近四季)'] ?? 'N/A'}`);
    lines.push(`- 股價淨值比：${s.股價淨值比 ?? 'N/A'}`);
    lines.push(`- 年報酬率：${s['年報酬率(%)'] ?? 'N/A'}%`);
    lines.push(`- 季報酬率：${s['季報酬率(%)'] ?? 'N/A'}%`);
    lines.push(`- 與大盤比年報酬：${s['與大盤比年報酬(%)'] ?? 'N/A'}%`);
    lines.push(`- 殖利率：${s['殖利率(%)'] ?? 'N/A'}%`);
    lines.push(`- 連續配息年數：${s.連續配息年數 ?? 'N/A'} 年`);

    if (p.institutional) {
      lines.push(`- 外資持股率：${p.institutional['外資持股比率(%)'] ?? 'N/A'}%`);
      lines.push(`- 法人合計買賣超：${p.institutional.買賣超合計 ?? 'N/A'} 張`);
    }

    if (p.momentum) {
      lines.push(`- 近20日漲跌幅：${p.momentum['近20日漲跌幅%'] ?? 'N/A'}%`);
      lines.push(`- 距年線乖離：${p.momentum['股價乖離年線(%)'] ?? 'N/A'}%`);
      lines.push(`- 創歷史新高：${p.momentum.股價創歷史新高 === 1 ? '是' : '否'}`);
    }

    if (p.forum) {
      lines.push(`- 論壇討論熱度：${p.forum.發文則數 ?? 0} 則 / 看多 ${p.forum.看多發文 ?? 0} / 看空 ${p.forum.看空發文 ?? 0}`);
    }

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * 為 AI 產生市場概覽上下文
 */
export async function buildMarketOverviewContext(): Promise<string> {
  const [topMcap, topReturn, topDividend, topVolume] = await Promise.all([
    getMarketRanking('總市值(億)', 'desc', 5),
    getMarketRanking('年報酬率(%)', 'desc', 5),
    getMarketRanking('殖利率(%)', 'desc', 5),
    getMarketRanking('週轉率(%)', 'desc', 5),
  ]);

  const lines: string[] = [
    `## 市場概覽（資料日期：${APP_TODAY_ISO}）\n`,
    `### 市值前 5 大`,
    ...topMcap.map((s, i) => `${i + 1}. ${s.股票代號} ${s.股票名稱}：${s['總市值(億)']} 億`),
    '',
    `### 年報酬率前 5`,
    ...topReturn.map((s, i) => `${i + 1}. ${s.股票代號} ${s.股票名稱}：${s['年報酬率(%)']}%`),
    '',
    `### 殖利率前 5`,
    ...topDividend.map((s, i) => `${i + 1}. ${s.股票代號} ${s.股票名稱}：${s['殖利率(%)']}%`),
    '',
    `### 成交活絡度前 5`,
    ...topVolume.map((s, i) => `${i + 1}. ${s.股票代號} ${s.股票名稱}：週轉率 ${s['週轉率(%)']}%`),
  ];

  return lines.join('\n');
}

/**
 * 為 AI 產生特定股票的詳細分析
 */
export async function buildStockAnalysisContext(symbol: string): Promise<string> {
  const profile = await getStockFullProfile(symbol);

  if (!profile.summary) {
    return `查無股票代號 ${symbol} 的資料。`;
  }

  const s = profile.summary;
  const lines: string[] = [
    `## ${s.股票代號} ${s.股票名稱} 完整分析（資料日期：${APP_TODAY_ISO}）\n`,
    `### 基本資料`,
    `- 市場：${s.市場}`,
    `- 產業：${s.產業}`,
    `- 收盤價：${s.收盤價}`,
    `- 總市值：${s['總市值(億)']} 億`,
    `- 市值比重：${s['市值比重(%)']}%`,
    '',
    `### 估值指標`,
    `- 本益比(近四季)：${s['本益比(近四季)'] ?? 'N/A'}`,
    `- 股價淨值比：${s.股價淨值比 ?? 'N/A'}`,
    '',
    `### 報酬表現`,
    `- 季報酬率：${s['季報酬率(%)']}%`,
    `- 年報酬率：${s['年報酬率(%)']}%`,
    `- 與大盤比年報酬：${s['與大盤比年報酬(%)']}%`,
    '',
    `### 股利`,
    `- 殖利率：${s['殖利率(%)']}%`,
    `- 連續配息年數：${s.連續配息年數} 年`,
    `- 最新年度現金股利：${s.最新年度現金股利}`,
    `- 最近除息日：${s.最近除息日 ?? 'N/A'}`,
  ];

  if (profile.institutional) {
    const inst = profile.institutional;
    lines.push('', `### 法人動向`);
    lines.push(`- 外資買賣超：${inst.外資買賣超} 張`);
    lines.push(`- 投信買賣超：${inst.投信買賣超} 張`);
    lines.push(`- 法人合計買賣超：${inst.買賣超合計} 張`);
    lines.push(`- 外資持股比率：${inst['外資持股比率(%)']}%`);
  }

  if (profile.momentum) {
    const m = profile.momentum;
    lines.push('', `### 技術面/動能`);
    lines.push(`- 今年以來漲跌幅：${m['今年以來漲跌幅%']}%`);
    lines.push(`- 近5日漲跌幅：${m['近5日漲跌幅%']}%`);
    lines.push(`- 近20日漲跌幅：${m['近20日漲跌幅%']}%`);
    lines.push(`- 近60日漲跌幅：${m['近60日漲跌幅%']}%`);
    lines.push(`- 距月線乖離：${m['股價乖離月線(%)']}%`);
    lines.push(`- 距季線乖離：${m['股價乖離季線(%)']}%`);
    lines.push(`- 距年線乖離：${m['股價乖離年線(%)']}%`);
    lines.push(`- 創歷史新高：${m.股價創歷史新高 === 1 ? '是' : '否'}`);
  }

  if (profile.forum) {
    const f = profile.forum;
    lines.push('', `### 論壇討論`);
    lines.push(`- 發文數：${f.發文則數}`);
    lines.push(`- 看多：${f.看多發文}，看空：${f.看空發文}，中性：${f.中性發文}`);
    lines.push(`- 回文數：${f.回文則數}（${f.回文人數} 人）`);
  }

  return lines.join('\n');
}

/**
 * 為 AI 產生趨勢分析上下文（近 30 日）
 */
export async function buildTrendContext(symbol: string): Promise<string> {
  const [priceHist, returnHist, instHist] = await Promise.all([
    getStockPriceHistory(symbol),
    getStockReturnHistory(symbol),
    getStockInstitutionalHistory(symbol),
  ]);

  if (priceHist.length === 0) {
    return `查無 ${symbol} 的近期走勢資料。`;
  }

  const lines: string[] = [
    `## ${symbol} 近 30 日走勢摘要\n`,
  ];

  // 價格趨勢
  const firstPrice = priceHist[0]?.收盤價 ?? 0;
  const lastPrice = priceHist[priceHist.length - 1]?.收盤價 ?? 0;
  const priceChange = lastPrice - firstPrice;
  const priceChangePercent = firstPrice > 0 ? ((priceChange / firstPrice) * 100).toFixed(2) : 'N/A';
  const highPrice = Math.max(...priceHist.map((p) => p.最高價 ?? 0));
  const lowPrice = Math.min(...priceHist.filter((p) => p.最低價 && p.最低價 > 0).map((p) => p.最低價!));

  lines.push(`### 價格`);
  lines.push(`- 30日前收盤：${firstPrice} → 最新收盤：${lastPrice}`);
  lines.push(`- 30日漲跌：${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}（${priceChangePercent}%）`);
  lines.push(`- 30日高點：${highPrice}，低點：${lowPrice}`);

  // 法人動向趨勢
  if (instHist.length > 0) {
    const totalBuySell = instHist.reduce((sum, d) => sum + (d.買賣超合計 ?? 0), 0);
    const foreignBuy = instHist.reduce((sum, d) => sum + (d.外資買賣超 ?? 0), 0);
    lines.push('', `### 法人 30 日累計`);
    lines.push(`- 法人合計：${totalBuySell > 0 ? '+' : ''}${totalBuySell.toFixed(0)} 張`);
    lines.push(`- 外資：${foreignBuy > 0 ? '+' : ''}${foreignBuy.toFixed(0)} 張`);
  }

  // 成交量趨勢
  const avgVolume = priceHist.reduce((sum, p) => sum + (p.成交量 ?? 0), 0) / priceHist.length;
  const lastVolume = priceHist[priceHist.length - 1]?.成交量 ?? 0;
  lines.push('', `### 成交量`);
  lines.push(`- 30日平均成交量：${Math.round(avgVolume).toLocaleString()} 張`);
  lines.push(`- 最新成交量：${lastVolume.toLocaleString()} 張`);
  lines.push(`- 量能變化：${lastVolume > avgVolume ? '放量' : '縮量'}（${((lastVolume / avgVolume) * 100).toFixed(0)}% of avg）`);

  return lines.join('\n');
}

/**
 * 綜合查詢：給定使用者問題相關的股票代號，返回所有 AI 需要的上下文
 */
export async function buildAIContext(params: {
  userSymbols?: string[];
  querySymbols?: string[];
  includeMarketOverview?: boolean;
  includeTrends?: boolean;
}): Promise<string> {
  const parts: string[] = [];

  // 市場概覽
  if (params.includeMarketOverview) {
    parts.push(await buildMarketOverviewContext());
  }

  // 使用者持股
  if (params.userSymbols && params.userSymbols.length > 0) {
    parts.push(await buildPortfolioContext(params.userSymbols));
  }

  // 查詢相關股票的詳細分析
  if (params.querySymbols && params.querySymbols.length > 0) {
    for (const symbol of params.querySymbols) {
      parts.push(await buildStockAnalysisContext(symbol));
      if (params.includeTrends) {
        parts.push(await buildTrendContext(symbol));
      }
    }
  }

  return parts.join('\n\n---\n\n');
}
