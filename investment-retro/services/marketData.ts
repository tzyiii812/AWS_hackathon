/**
 * Market Data Service
 * 提供結構化的台股市場資料給 AI 使用。
 * 資料來源：data/ 目錄下的 JSON 檔案（由 scripts/convert-csv-to-json.js 產生）
 *
 * 時點基準由資料自動決定（見 config/appDate.ts）。
 * 更換 data/ 目錄下的 JSON 檔案後，所有查詢與計算會自動使用新資料，
 * 不需要修改程式碼。
 */

// === 型別定義 ===

export type StockSummary = {
  股票代號: string;
  股票名稱: string;
  市場: string;
  產業: string;
  收盤價: number | null;
  '總市值(億)': number | null;
  '市值比重(%)': number | null;
  '本益比(近四季)': number | null;
  股價淨值比: number | null;
  '週轉率(%)': number | null;
  '季報酬率(%)': number | null;
  '年報酬率(%)': number | null;
  '與大盤比年報酬(%)': number | null;
  '殖利率(%)': number | null;
  近20日法人買賣超: number | null;
  '外資持股率(%)': number | null;
  '法人持股率(%)': number | null;
  連續配息年數: number | null;
  最新年度現金股利: number | null;
  '股利發放率(%)': number | null;
  最近除息日: string | null;
  同學會瀏覽次數: number | null;
  同學會瀏覽人數: number | null;
  今年新高: number | null;
  今年新低: number | null;
  '今年以來(%)': number | null;
  '距年線乖離(%)': number | null;
  '買點分位(%)': number | null;
  創歷史新高: number | null;
};

export type PriceData = {
  日期: number;
  股票代號: string;
  股票名稱: string;
  開盤價: number | null;
  最高價: number | null;
  最低價: number | null;
  收盤價: number | null;
  漲跌: number | null;
  '漲幅(%)': number | null;
  成交量: number | null;
  '成交金額(千)': number | null;
  '股本(百萬)': number | null;
  '總市值(億)': number | null;
  '市值比重(%)': number | null;
  本益比: number | null;
  '本益比(近四季)': number | null;
  股價淨值比: number | null;
  '週轉率(%)': number | null;
  漲跌停: number | null;
};

export type InstitutionalData = {
  日期: number;
  股票代號: string;
  股票名稱: string;
  外資買賣超: number | null;
  投信買賣超: number | null;
  自營商買賣超: number | null;
  買賣超合計: number | null;
  '外資持股(張)': number | null;
  '外資持股比率(%)': number | null;
  '投信持股比率(%)': number | null;
  '自營商持股比率(%)': number | null;
  '法人持股比率(%)': number | null;
  '外資持股市值(百萬)': number | null;
  '法人持股市值(百萬)': number | null;
};

export type ReturnData = {
  日期: number;
  股票代號: string;
  股票名稱: string;
  還原收盤價: number | null;
  '日報酬率(%)': number | null;
  '週報酬率(%)': number | null;
  '月報酬率(%)': number | null;
  '季報酬率(%)': number | null;
  '半年報酬率(%)': number | null;
  '年報酬率(%)': number | null;
  '與大盤比年報酬率(%)': number | null;
  '殖利率(%)': number | null;
};

export type MomentumData = {
  日期: number;
  股票代號: string;
  股票名稱: string;
  今年以來新高價: number | null;
  今年以來新低價: number | null;
  '今年以來漲跌幅%': number | null;
  '近5日漲跌幅%': number | null;
  '近20日漲跌幅%': number | null;
  '近60日漲跌幅%': number | null;
  '股價乖離月線(%)': number | null;
  '股價乖離季線(%)': number | null;
  '股價乖離年線(%)': number | null;
  股價創歷史新高: number | null;
  股價創N日新高: number | null;
  股價連N日漲: number | null;
};

export type DividendInfo = {
  年度: number;
  股票代號: string;
  股票名稱: string;
  配發次數: number | null;
  '現金股利合計(元)': number | null;
  '股票股利合計(元)': number | null;
  '現金股利殖利率(%)': number | null;
  '股利發放率(%)': number | null;
  除息日: string | null;
  除權日: string | null;
  除息最後回補日: string | null;
  股東會日期: string | null;
};

export type ConsecutiveDividend = {
  年度: number;
  股票代號: string;
  股票名稱: string;
  現金股利連N年遞增: number | null;
  連續N年發放現金股利: number | null;
  現金股利排名: number | null;
  現金股利殖利率排名: number | null;
};

export type IndustryInfo = {
  股票代號: string;
  股票名稱: string;
  上市上櫃: number;
  主產業: string;
  全部產業標籤: string | null;
};

export type ForumStats = {
  日期: string;
  股票代號: string;
  股票名稱: string;
  發文則數: number | null;
  發文人數: number | null;
  看多發文: number | null;
  看空發文: number | null;
  中性發文: number | null;
  回文則數: number | null;
  回文人數: number | null;
};

export type DailySnapshot<T> = {
  date: string;
  data: T[];
};

export type HistoryData<T> = {
  dates: string[];
  data: T[];
};

// === 資料載入 (lazy loading with cache) ===

const dataCache: Record<string, unknown> = {};

async function loadJson<T>(fileName: string): Promise<T> {
  if (dataCache[fileName]) {
    return dataCache[fileName] as T;
  }

  // Dynamic import for JSON data files
  let data: T;
  switch (fileName) {
    case 'stock_summary':
      data = (await import('@/data/stock_summary.json')) as T;
      break;
    case 'price_valuation_latest':
      data = (await import('@/data/price_valuation_latest.json')) as T;
      break;
    case 'institutional_trading_latest':
      data = (await import('@/data/institutional_trading_latest.json')) as T;
      break;
    case 'return_rate_latest':
      data = (await import('@/data/return_rate_latest.json')) as T;
      break;
    case 'momentum_latest':
      data = (await import('@/data/momentum_latest.json')) as T;
      break;
    case 'dividend_info':
      data = (await import('@/data/dividend_info.json')) as T;
      break;
    case 'consecutive_dividend_stocks':
      data = (await import('@/data/consecutive_dividend_stocks.json')) as T;
      break;
    case 'consecutive_dividend_etf':
      data = (await import('@/data/consecutive_dividend_etf.json')) as T;
      break;
    case 'industry_classification':
      data = (await import('@/data/industry_classification.json')) as T;
      break;
    case 'forum_stats_latest':
      data = (await import('@/data/forum_stats_latest.json')) as T;
      break;
    case 'price_history_30d':
      data = (await import('@/data/price_history_30d.json')) as T;
      break;
    case 'return_history_30d':
      data = (await import('@/data/return_history_30d.json')) as T;
      break;
    case 'institutional_history_30d':
      data = (await import('@/data/institutional_history_30d.json')) as T;
      break;
    case 'field_dictionary':
      data = (await import('@/data/field_dictionary.json')) as T;
      break;
    case 'price_month_end':
      data = (await import('@/data/price_month_end.json')) as T;
      break;
    case 'return_month_end':
      data = (await import('@/data/return_month_end.json')) as T;
      break;
    default:
      throw new Error(`Unknown data file: ${fileName}`);
  }

  dataCache[fileName] = data;
  return data;
}

// === 公開 API ===

/** 取得所有股票的綜合摘要 (每股一列) */
export async function getStockSummary(): Promise<StockSummary[]> {
  return loadJson<StockSummary[]>('stock_summary');
}

/** 根據股票代號查詢摘要 */
export async function getStockBySymbol(symbol: string): Promise<StockSummary | undefined> {
  const all = await getStockSummary();
  return all.find((s) => s.股票代號 === symbol);
}

/** 根據多個股票代號查詢摘要 */
export async function getStocksBySymbols(symbols: string[]): Promise<StockSummary[]> {
  const all = await getStockSummary();
  const symbolSet = new Set(symbols);
  return all.filter((s) => symbolSet.has(s.股票代號));
}

/** 取得最新交易日的行情與估值 */
export async function getLatestPriceValuation(): Promise<DailySnapshot<PriceData>> {
  return loadJson<DailySnapshot<PriceData>>('price_valuation_latest');
}

/** 取得特定股票的最新行情 */
export async function getStockPrice(symbol: string): Promise<PriceData | undefined> {
  const snapshot = await getLatestPriceValuation();
  return snapshot.data.find((s) => s.股票代號 === symbol);
}

/** 取得最新交易日的法人動向 */
export async function getLatestInstitutionalTrading(): Promise<DailySnapshot<InstitutionalData>> {
  return loadJson<DailySnapshot<InstitutionalData>>('institutional_trading_latest');
}

/** 取得特定股票的法人動向 */
export async function getStockInstitutional(symbol: string): Promise<InstitutionalData | undefined> {
  const snapshot = await getLatestInstitutionalTrading();
  return snapshot.data.find((s) => s.股票代號 === symbol);
}

/** 取得最新交易日的報酬率 */
export async function getLatestReturnRate(): Promise<DailySnapshot<ReturnData>> {
  return loadJson<DailySnapshot<ReturnData>>('return_rate_latest');
}

/** 取得特定股票的報酬率 */
export async function getStockReturn(symbol: string): Promise<ReturnData | undefined> {
  const snapshot = await getLatestReturnRate();
  return snapshot.data.find((s) => s.股票代號 === symbol);
}

/** 取得最新交易日的動能/距高低 */
export async function getLatestMomentum(): Promise<DailySnapshot<MomentumData>> {
  return loadJson<DailySnapshot<MomentumData>>('momentum_latest');
}

/** 取得特定股票的動能 */
export async function getStockMomentum(symbol: string): Promise<MomentumData | undefined> {
  const snapshot = await getLatestMomentum();
  return snapshot.data.find((s) => s.股票代號 === symbol);
}

/** 取得股利資訊 */
export async function getDividendInfo(): Promise<DividendInfo[]> {
  return loadJson<DividendInfo[]>('dividend_info');
}

/** 取得特定股票的股利資訊 */
export async function getStockDividend(symbol: string): Promise<DividendInfo | undefined> {
  const all = await getDividendInfo();
  return all.find((s) => s.股票代號 === symbol);
}

/** 取得連續配息個股 */
export async function getConsecutiveDividendStocks(): Promise<ConsecutiveDividend[]> {
  return loadJson<ConsecutiveDividend[]>('consecutive_dividend_stocks');
}

/** 取得連續配息 ETF */
export async function getConsecutiveDividendETF(): Promise<ConsecutiveDividend[]> {
  return loadJson<ConsecutiveDividend[]>('consecutive_dividend_etf');
}

/** 取得產業分類 */
export async function getIndustryClassification(): Promise<IndustryInfo[]> {
  return loadJson<IndustryInfo[]>('industry_classification');
}

/** 取得特定產業的所有股票 */
export async function getStocksByIndustry(industry: string): Promise<IndustryInfo[]> {
  const all = await getIndustryClassification();
  return all.filter((s) => s.主產業 === industry);
}

/** 取得所有產業列表 */
export async function getAllIndustries(): Promise<string[]> {
  const all = await getIndustryClassification();
  return [...new Set(all.map((s) => s.主產業))];
}

/** 取得最新論壇討論統計 */
export async function getLatestForumStats(): Promise<DailySnapshot<ForumStats>> {
  return loadJson<DailySnapshot<ForumStats>>('forum_stats_latest');
}

/** 取得特定股票的論壇討論 */
export async function getStockForumStats(symbol: string): Promise<ForumStats | undefined> {
  const snapshot = await getLatestForumStats();
  return snapshot.data.find((s) => s.股票代號 === symbol);
}

/** 取得近 30 日價格歷史 */
export async function getPriceHistory30d(): Promise<HistoryData<PriceData>> {
  return loadJson<HistoryData<PriceData>>('price_history_30d');
}

/** 取得特定股票的近 30 日價格歷史 */
export async function getStockPriceHistory(symbol: string): Promise<PriceData[]> {
  const history = await getPriceHistory30d();
  return history.data.filter((s) => s.股票代號 === symbol);
}

/** 取得近 30 日報酬率歷史 */
export async function getReturnHistory30d(): Promise<HistoryData<ReturnData>> {
  return loadJson<HistoryData<ReturnData>>('return_history_30d');
}

/** 取得特定股票的近 30 日報酬率歷史 */
export async function getStockReturnHistory(symbol: string): Promise<ReturnData[]> {
  const history = await getReturnHistory30d();
  return history.data.filter((s) => s.股票代號 === symbol);
}

/** 取得近 30 日法人動向歷史 */
export async function getInstitutionalHistory30d(): Promise<HistoryData<InstitutionalData>> {
  return loadJson<HistoryData<InstitutionalData>>('institutional_history_30d');
}

/** 取得特定股票的近 30 日法人動向歷史 */
export async function getStockInstitutionalHistory(symbol: string): Promise<InstitutionalData[]> {
  const history = await getInstitutionalHistory30d();
  return history.data.filter((s) => s.股票代號 === symbol);
}

// === 複合查詢 (方便 AI 使用) ===

export type StockFullProfile = {
  summary: StockSummary | undefined;
  price: PriceData | undefined;
  institutional: InstitutionalData | undefined;
  returnRate: ReturnData | undefined;
  momentum: MomentumData | undefined;
  dividend: DividendInfo | undefined;
  forum: ForumStats | undefined;
  industry: IndustryInfo | undefined;
};

/** 取得單一股票的完整資料 (所有面向) */
export async function getStockFullProfile(symbol: string): Promise<StockFullProfile> {
  const [summary, price, institutional, returnRate, momentum, dividend, forum, industryAll] =
    await Promise.all([
      getStockBySymbol(symbol),
      getStockPrice(symbol),
      getStockInstitutional(symbol),
      getStockReturn(symbol),
      getStockMomentum(symbol),
      getStockDividend(symbol),
      getStockForumStats(symbol),
      getIndustryClassification(),
    ]);

  return {
    summary,
    price,
    institutional,
    returnRate,
    momentum,
    dividend,
    forum,
    industry: industryAll.find((i) => i.股票代號 === symbol),
  };
}

/** 取得使用者持股的完整分析資料 */
export async function getPortfolioMarketData(
  symbols: string[]
): Promise<Record<string, StockFullProfile>> {
  const profiles = await Promise.all(symbols.map((s) => getStockFullProfile(s)));
  const result: Record<string, StockFullProfile> = {};
  symbols.forEach((s, i) => {
    result[s] = profiles[i];
  });
  return result;
}

/** 取得市場排名 (依指定欄位排序) */
export async function getMarketRanking(
  field: keyof StockSummary,
  order: 'asc' | 'desc' = 'desc',
  limit = 10
): Promise<StockSummary[]> {
  const all = await getStockSummary();
  const filtered = all.filter((s) => s[field] != null);
  filtered.sort((a, b) => {
    const aVal = Number(a[field]) || 0;
    const bVal = Number(b[field]) || 0;
    return order === 'desc' ? bVal - aVal : aVal - bVal;
  });
  return filtered.slice(0, limit);
}

/** 取得欄位說明字典 (給 AI 了解欄位意義) */
export async function getFieldDictionary(): Promise<
  Array<{ 檔案: string; 欄位: string; 說明: string; 來源表: string; 取數範圍: string }>
> {
  return loadJson('field_dictionary');
}

/** 搜尋股票 (模糊比對代號或名稱) */
export async function searchStocks(query: string): Promise<StockSummary[]> {
  const all = await getStockSummary();
  const q = query.toLowerCase();
  return all.filter(
    (s) =>
      s.股票代號.toLowerCase().includes(q) ||
      s.股票名稱.toLowerCase().includes(q)
  );
}

// === 月底快照查詢 (供 Journal 損益計算使用) ===

export type MonthEndSnapshots = Record<string, DailySnapshot<PriceData>>;
export type MonthEndReturns = Record<string, DailySnapshot<ReturnData>>;

/** 取得所有月份的月底行情快照 (key = YYYYMM) */
export async function getPriceMonthEnd(): Promise<MonthEndSnapshots> {
  return loadJson<MonthEndSnapshots>('price_month_end');
}

/** 取得所有月份的月底報酬率快照 (key = YYYYMM) */
export async function getReturnMonthEnd(): Promise<MonthEndReturns> {
  return loadJson<MonthEndReturns>('return_month_end');
}

/**
 * 取得特定月份的股票收盤價
 * @param yearMonth 格式 "YYYY-MM" 或 "YYYYMM"
 * @param symbol 股票代號
 */
export async function getStockPriceAtMonth(
  yearMonth: string,
  symbol: string
): Promise<PriceData | undefined> {
  const monthKey = yearMonth.replace('-', '').slice(0, 6);
  const monthEnd = await getPriceMonthEnd();
  const snapshot = monthEnd[monthKey];
  if (!snapshot) return undefined;
  return snapshot.data.find((s) => s.股票代號 === symbol);
}

/**
 * 取得特定月份所有股票的收盤價快照
 * @param yearMonth 格式 "YYYY-MM" 或 "YYYYMM"
 */
export async function getAllPricesAtMonth(
  yearMonth: string
): Promise<DailySnapshot<PriceData> | undefined> {
  const monthKey = yearMonth.replace('-', '').slice(0, 6);
  const monthEnd = await getPriceMonthEnd();
  return monthEnd[monthKey];
}

/**
 * 取得特定月份的股票報酬率
 * @param yearMonth 格式 "YYYY-MM" 或 "YYYYMM"
 * @param symbol 股票代號
 */
export async function getStockReturnAtMonth(
  yearMonth: string,
  symbol: string
): Promise<ReturnData | undefined> {
  const monthKey = yearMonth.replace('-', '').slice(0, 6);
  const monthEnd = await getReturnMonthEnd();
  const snapshot = monthEnd[monthKey];
  if (!snapshot) return undefined;
  return snapshot.data.find((s) => s.股票代號 === symbol);
}

/**
 * 計算持股在特定月份的市值與損益
 * @param yearMonth 格式 "YYYY-MM"
 * @param holdings 持股列表 [{symbol, shares, avgCost}]
 */
export async function calculatePortfolioPnLAtMonth(
  yearMonth: string,
  holdings: Array<{ symbol: string; shares: number; avgCost?: number | null }>
): Promise<{
  totalMarketValue: number;
  totalCost: number;
  totalPnL: number;
  holdingDetails: Array<{
    symbol: string;
    name: string;
    shares: number;
    price: number | null;
    marketValue: number;
    cost: number;
    pnl: number;
  }>;
  dataDate: string | null;
}> {
  const monthKey = yearMonth.replace('-', '').slice(0, 6);
  const monthEnd = await getPriceMonthEnd();
  const snapshot = monthEnd[monthKey];

  if (!snapshot) {
    return {
      totalMarketValue: 0,
      totalCost: 0,
      totalPnL: 0,
      holdingDetails: [],
      dataDate: null,
    };
  }

  const priceMap = new Map(snapshot.data.map((p) => [p.股票代號, p]));
  let totalMarketValue = 0;
  let totalCost = 0;
  const holdingDetails: Array<{
    symbol: string;
    name: string;
    shares: number;
    price: number | null;
    marketValue: number;
    cost: number;
    pnl: number;
  }> = [];

  for (const h of holdings) {
    const priceData = priceMap.get(h.symbol);
    const price = priceData?.收盤價 ?? null;
    const marketValue = price != null ? price * h.shares : 0;
    const cost = h.avgCost != null ? h.avgCost * h.shares : 0;
    const pnl = marketValue - cost;

    totalMarketValue += marketValue;
    totalCost += cost;

    holdingDetails.push({
      symbol: h.symbol,
      name: priceData?.股票名稱 ?? h.symbol,
      shares: h.shares,
      price,
      marketValue,
      cost,
      pnl,
    });
  }

  return {
    totalMarketValue,
    totalCost,
    totalPnL: totalMarketValue - totalCost,
    holdingDetails,
    dataDate: snapshot.date,
  };
}

