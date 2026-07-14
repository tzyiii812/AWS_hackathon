export type Holding = {
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
  price: number;
  marketValue: number;
  pnl: number;
  pnlPercent: number;
  weight: number;
};

export const HOLDINGS: Holding[] = [
  { symbol: '2330', name: '台積電', shares: 200, avgCost: 710, price: 840, marketValue: 168000, pnl: 26000, pnlPercent: 18.31, weight: 24.6 },
  { symbol: '0050', name: '元大台灣50', shares: 1000, avgCost: 120, price: 132, marketValue: 132000, pnl: 12000, pnlPercent: 10.0, weight: 19.3 },
  { symbol: '00878', name: '國泰永續高股息', shares: 3000, avgCost: 18, price: 21.2, marketValue: 63600, pnl: 9600, pnlPercent: 17.78, weight: 9.3 },
  { symbol: '2884', name: '玉山金', shares: 5000, avgCost: 25, price: 27.5, marketValue: 137500, pnl: 12500, pnlPercent: 10.0, weight: 20.2 },
  { symbol: '00919', name: '群益精選高息', shares: 800, avgCost: 21, price: 24.5, marketValue: 19600, pnl: 2800, pnlPercent: 16.67, weight: 2.9 },
  { symbol: '2412', name: '中華電信', shares: 500, avgCost: 120, price: 124, marketValue: 62000, pnl: 2000, pnlPercent: 3.33, weight: 9.1 },
];

export const PORTFOLIO_SUMMARY = {
  totalMarketValue: 682300,
  totalCost: 610000,
  totalPnL: 72300,
  totalPnLPercent: 11.85,
  holdingCount: HOLDINGS.length,
};
