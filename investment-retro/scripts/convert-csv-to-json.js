/**
 * 將 Delivery_Hackathon_DataPackage CSV 檔案轉為 JSON，
 * 放入 data/ 目錄讓前端 AI 可直接使用。
 *
 * 大型日頻資料只取最後一個交易日（最新快照），
 * 小型靜態資料完整轉入。
 *
 * Usage:
 *   node scripts/convert-csv-to-json.js [CSV資料夾路徑]
 *
 * 預設會搜尋上層目錄中符合 Delivery_Hackathon_DataPackage* 的資料夾。
 * 更換新的資料包後只要重跑這個腳本，整個 App 的資料和日期基準就會自動更新。
 */

const fs = require('fs');
const path = require('path');

// 允許透過參數指定 CSV 目錄，否則自動搜尋
function findDataDir() {
  const argPath = process.argv[2];
  if (argPath) {
    const resolved = path.resolve(argPath);
    if (fs.existsSync(resolved)) return resolved;
    console.error(`指定路徑不存在: ${resolved}`);
    process.exit(1);
  }

  // 自動搜尋上層目錄中的 DataPackage 資料夾
  const parentDir = path.resolve(__dirname, '../..');
  const entries = fs.readdirSync(parentDir);
  const match = entries
    .filter((e) => e.startsWith('Delivery_Hackathon_DataPackage'))
    .sort()
    .pop(); // 取最新的

  if (match) return path.join(parentDir, match);

  console.error('找不到 Delivery_Hackathon_DataPackage* 資料夾，請指定路徑作為參數。');
  process.exit(1);
}

const DATA_DIR = findDataDir();
const OUT_DIR = path.resolve(__dirname, '../data');

console.log(`📂 資料來源：${DATA_DIR}`);
console.log(`📁 輸出目錄：${OUT_DIR}\n`);

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function parseCsv(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, ''); // Remove BOM
  const lines = raw.split('\n').filter((l) => l.trim());
  if (lines.length === 0) return [];

  const headers = lines[0].split(',');
  // 這些欄位必須保持字串，不可轉為 number
  const KEEP_AS_STRING = new Set(['股票代號', '日期', '除息日', '除權日', '除息最後回補日', '股東會日期', '最近除息日']);

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      const key = headers[j].trim();
      const val = (values[j] || '').trim();
      if (val === '') {
        row[key] = null;
      } else if (KEEP_AS_STRING.has(key)) {
        row[key] = val;
      } else if (!isNaN(val) && val !== '') {
        row[key] = Number(val);
      } else {
        row[key] = val;
      }
    }
    rows.push(row);
  }
  return rows;
}

function getLatestDate(rows, dateField = '日期') {
  let maxDate = '';
  for (const row of rows) {
    const d = String(row[dateField] || '');
    if (d > maxDate) maxDate = d;
  }
  return maxDate;
}

function filterByDate(rows, date, dateField = '日期') {
  return rows.filter((r) => String(r[dateField]) === date);
}

console.log('Converting CSV data to JSON...\n');

// ===== 小型靜態資料：完整轉入 =====

// 07 - Industry Classification
const industry = parseCsv(path.join(DATA_DIR, '07_Industry_Classification_Mapping.csv'));
fs.writeFileSync(path.join(OUT_DIR, 'industry_classification.json'), JSON.stringify(industry, null, 2));
console.log(`✓ industry_classification.json (${industry.length} rows)`);

// 09 - Wide Table Summary (每股一列)
const wideTable = parseCsv(path.join(DATA_DIR, '09_Wide_Table_Summary_One_Row_Per_Stock_2025.csv'));
fs.writeFileSync(path.join(OUT_DIR, 'stock_summary.json'), JSON.stringify(wideTable, null, 2));
console.log(`✓ stock_summary.json (${wideTable.length} rows)`);

// 05 - Dividend / Ex-Dividend
const dividend = parseCsv(path.join(DATA_DIR, '05_Dividend_Ex_Dividend_2025.csv'));
fs.writeFileSync(path.join(OUT_DIR, 'dividend_info.json'), JSON.stringify(dividend, null, 2));
console.log(`✓ dividend_info.json (${dividend.length} rows)`);

// 06 - Consecutive Dividend Stocks
const consecutiveStocks = parseCsv(path.join(DATA_DIR, '06_Consecutive_Dividend_Stocks_2025.csv'));
fs.writeFileSync(path.join(OUT_DIR, 'consecutive_dividend_stocks.json'), JSON.stringify(consecutiveStocks, null, 2));
console.log(`✓ consecutive_dividend_stocks.json (${consecutiveStocks.length} rows)`);

// 06b - Consecutive Dividend ETF
const consecutiveEtf = parseCsv(path.join(DATA_DIR, '06b_Consecutive_Dividend_ETF_2025.csv'));
fs.writeFileSync(path.join(OUT_DIR, 'consecutive_dividend_etf.json'), JSON.stringify(consecutiveEtf, null, 2));
console.log(`✓ consecutive_dividend_etf.json (${consecutiveEtf.length} rows)`);

// 00 - Field Dictionary
const dictionary = parseCsv(path.join(DATA_DIR, '00_Field_Dictionary_and_Usage_Notes.csv'));
fs.writeFileSync(path.join(OUT_DIR, 'field_dictionary.json'), JSON.stringify(dictionary, null, 2));
console.log(`✓ field_dictionary.json (${dictionary.length} rows)`);

// ===== 大型日頻資料：只取最新日 =====

// 01 - Price & Valuation (latest day)
console.log('\nProcessing large daily files (latest snapshot only)...');
const priceAll = parseCsv(path.join(DATA_DIR, '01_Price_Valuation_2025.csv'));
const latestPriceDate = getLatestDate(priceAll);
const priceLatest = filterByDate(priceAll, latestPriceDate);
fs.writeFileSync(path.join(OUT_DIR, 'price_valuation_latest.json'), JSON.stringify({ date: latestPriceDate, data: priceLatest }, null, 2));
console.log(`✓ price_valuation_latest.json (date=${latestPriceDate}, ${priceLatest.length} stocks)`);

// 02 - Institutional Trading (latest day)
const instAll = parseCsv(path.join(DATA_DIR, '02_Institutional_Trading_2025.csv'));
const latestInstDate = getLatestDate(instAll);
const instLatest = filterByDate(instAll, latestInstDate);
fs.writeFileSync(path.join(OUT_DIR, 'institutional_trading_latest.json'), JSON.stringify({ date: latestInstDate, data: instLatest }, null, 2));
console.log(`✓ institutional_trading_latest.json (date=${latestInstDate}, ${instLatest.length} stocks)`);

// 03 - Return Rate (latest day)
const returnAll = parseCsv(path.join(DATA_DIR, '03_Return_Rate_2025.csv'));
const latestReturnDate = getLatestDate(returnAll);
const returnLatest = filterByDate(returnAll, latestReturnDate);
fs.writeFileSync(path.join(OUT_DIR, 'return_rate_latest.json'), JSON.stringify({ date: latestReturnDate, data: returnLatest }, null, 2));
console.log(`✓ return_rate_latest.json (date=${latestReturnDate}, ${returnLatest.length} stocks)`);

// 04 - Distance from High/Low Momentum (latest day)
const momentumAll = parseCsv(path.join(DATA_DIR, '04_Distance_from_High_Low_Momentum_2025.csv'));
const latestMomentumDate = getLatestDate(momentumAll);
const momentumLatest = filterByDate(momentumAll, latestMomentumDate);
fs.writeFileSync(path.join(OUT_DIR, 'momentum_latest.json'), JSON.stringify({ date: latestMomentumDate, data: momentumLatest }, null, 2));
console.log(`✓ momentum_latest.json (date=${latestMomentumDate}, ${momentumLatest.length} stocks)`);

// 10 - Forum Posts (latest day)
const forumAll = parseCsv(path.join(DATA_DIR, '10_Forum_Posts_Replies_Daily_Stats_2025.csv'));
const latestForumDate = getLatestDate(forumAll, '日期');
const forumLatest = filterByDate(forumAll, latestForumDate, '日期');
fs.writeFileSync(path.join(OUT_DIR, 'forum_stats_latest.json'), JSON.stringify({ date: latestForumDate, data: forumLatest }, null, 2));
console.log(`✓ forum_stats_latest.json (date=${latestForumDate}, ${forumLatest.length} stocks)`);

// ===== 額外：為每檔股票建立近30日歷史(用於趨勢分析) =====
console.log('\nBuilding 30-day history for trend analysis...');

// 取得所有日期排序
const allDates = [...new Set(priceAll.map((r) => String(r['日期'])))].sort();
const last30Dates = allDates.slice(-30);

const priceHistory30 = priceAll.filter((r) => last30Dates.includes(String(r['日期'])));
fs.writeFileSync(path.join(OUT_DIR, 'price_history_30d.json'), JSON.stringify({ dates: last30Dates, data: priceHistory30 }, null, 2));
console.log(`✓ price_history_30d.json (${last30Dates.length} days, ${priceHistory30.length} rows)`);

const returnHistory30 = returnAll.filter((r) => last30Dates.includes(String(r['日期'])));
fs.writeFileSync(path.join(OUT_DIR, 'return_history_30d.json'), JSON.stringify({ dates: last30Dates, data: returnHistory30 }, null, 2));
console.log(`✓ return_history_30d.json (${last30Dates.length} days, ${returnHistory30.length} rows)`);

const instHistory30 = instAll.filter((r) => last30Dates.includes(String(r['日期'])));
fs.writeFileSync(path.join(OUT_DIR, 'institutional_history_30d.json'), JSON.stringify({ dates: last30Dates, data: instHistory30 }, null, 2));
console.log(`✓ institutional_history_30d.json (${last30Dates.length} days, ${instHistory30.length} rows)`);

// ===== 月底快照：每月最後一個交易日（供 Journal 損益計算）=====
console.log('\nBuilding month-end snapshots...');

function getMonthEndData(rows, dateField = '日期') {
  // 找出每月最後一個交易日
  const monthLastDate = {};
  for (const row of rows) {
    const d = String(row[dateField] || '');
    if (!d) continue;
    const month = d.slice(0, 6); // YYYYMM
    if (!monthLastDate[month] || d > monthLastDate[month]) {
      monthLastDate[month] = d;
    }
  }

  // 按月份分組，只取月底那天
  const result = {};
  for (const row of rows) {
    const d = String(row[dateField] || '');
    const month = d.slice(0, 6);
    if (d === monthLastDate[month]) {
      if (!result[month]) result[month] = { date: d, data: [] };
      result[month].data.push(row);
    }
  }

  return result;
}

const priceMonthEnd = getMonthEndData(priceAll);
fs.writeFileSync(path.join(OUT_DIR, 'price_month_end.json'), JSON.stringify(priceMonthEnd));
const priceMonths = Object.keys(priceMonthEnd).sort();
console.log(`✓ price_month_end.json (${priceMonths.length} months: ${priceMonths[0]}~${priceMonths[priceMonths.length - 1]})`);

const returnMonthEnd = getMonthEndData(returnAll);
fs.writeFileSync(path.join(OUT_DIR, 'return_month_end.json'), JSON.stringify(returnMonthEnd));
const returnMonths = Object.keys(returnMonthEnd).sort();
console.log(`✓ return_month_end.json (${returnMonths.length} months: ${returnMonths[0]}~${returnMonths[returnMonths.length - 1]})`);

console.log('\n✅ All conversions complete! Data saved to:', OUT_DIR);
console.log(`📅 資料基準日（最新交易日）：${latestPriceDate}`);
console.log('   更換 CSV 後重跑此腳本，所有日期和計算會自動更新。');
