/**
 * Seed Script: 模擬年輕使用者 (帳號 1) 的完整使用紀錄
 *
 * 人物設定：
 * - 25歲台灣年輕上班族，剛開始學投資約1年
 * - 月薪約4.5萬，每月可投資約1~1.5萬
 * - 投資風格：定期定額為主，偶爾加碼
 * - 偏好：ETF（0050、00878、00919）+ 少量個股（2330台積電、2891中信金）
 * - 目標：存第一桶金、買 iPhone、出國旅行基金
 *
 * 使用方式：
 *   node scripts/seed-user1.mjs
 *
 * 需要環境：帳號 "1" 已在 Cognito 註冊，密碼為 "Test1234"
 */

const API_BASE = 'https://p9qp37v2vb.execute-api.us-east-1.amazonaws.com';
const COGNITO_ENDPOINT = 'https://cognito-idp.us-east-1.amazonaws.com/';
const CLIENT_ID = '7hkhtohqd42ii21h874uqblq4s';

const USERNAME = '1@inv.local';
const PASSWORD = 'Aa123456';

// ─── Auth ──────────────────────────────────────────────────────────────────────

async function signIn() {
  const res = await fetch(COGNITO_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-amz-json-1.1',
      'x-amz-target': 'AWSCognitoIdentityProviderService.InitiateAuth',
    },
    body: JSON.stringify({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: { USERNAME, PASSWORD },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('Login failed:', data);
    throw new Error(`Login failed: ${data.message || data.__type}`);
  }

  if (data.AuthenticationResult?.AccessToken) {
    console.log('✅ 登入成功');
    return data.AuthenticationResult.AccessToken;
  }

  throw new Error(`Unexpected auth response: ${JSON.stringify(data)}`);
}

// ─── API helpers ───────────────────────────────────────────────────────────────

async function apiRequest(path, token, options = {}) {
  const headers = {
    authorization: `Bearer ${token}`,
    accept: 'application/json',
    'content-type': 'application/json',
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const text = await res.text();
  let parsed = text ? JSON.parse(text) : {};

  // Unwrap Lambda payload
  if (parsed.statusCode && parsed.body && typeof parsed.body === 'string') {
    parsed = JSON.parse(parsed.body);
  }

  if (!res.ok) {
    console.error(`API Error [${path}]:`, parsed);
    throw new Error(`API ${res.status}: ${parsed.message || 'Unknown error'}`);
  }

  return parsed;
}

// ─── Seed: AI Profile (投資風格) ───────────────────────────────────────────────

async function seedAIProfile(token) {
  console.log('\n📊 設定 AI 投資風格...');

  const profile = {
    analysisPriority: 'growth',          // 看重成長
    drawdownTolerance: 'medium_low',     // 可承受中低程度下跌
    investmentStyle: 'dca',              // 定期定額
    goalTradeoff: 'balanced',            // 平衡目標與成長
    investmentHorizon: 'three_to_five_years', // 3-5年投資期限
  };

  const result = await apiRequest('/user/ai-profile', token, {
    method: 'PATCH',
    body: JSON.stringify(profile),
  });

  console.log('  ✅ AI 偏好已設定:', Object.keys(profile).join(', '));
  return result;
}

// ─── Seed: Goals (目標) ────────────────────────────────────────────────────────

async function seedGoals(token) {
  console.log('\n🎯 建立投資目標...');

  const goals = [
    {
      icon: '💰',
      name: '第一桶金',
      targetAmount: 1000000,
      description: '存到人生第一個一百萬！預計3年內達成，靠定期定額+年終加碼',
    },
    {
      icon: '✈️',
      name: '日本旅遊基金',
      targetAmount: 60000,
      description: '2026年和朋友去日本自由行10天，預算6萬',
    },
    {
      icon: '📱',
      name: 'iPhone 17 Pro',
      targetAmount: 45000,
      description: '等今年秋天出新機就換，用投資收益買',
    },
  ];

  for (const goal of goals) {
    const result = await apiRequest('/goals', token, {
      method: 'POST',
      body: JSON.stringify(goal),
    });
    console.log(`  ✅ 已建立目標: ${goal.icon} ${goal.name} (${goal.targetAmount.toLocaleString()} 元)`);
  }
}

// ─── Seed: Portfolio Snapshots (每月投資組合紀錄) ───────────────────────────────
// 
// 模擬時間軸 (2025年1月~12月)：
// - 1月開始用 app，第一筆定期定額 0050 + 00878
// - 2~3月 持續定期定額
// - 4月 大跌趁機加碼台積電
// - 5月 繼續定期定額，加入 00919
// - 6月 0050 分割 (1→4)，順便加碼
// - 7~8月 穩定定期定額
// - 9月 加碼 2891 中信金（看好金融股配息）
// - 10月 獲利了結部分 2330
// - 11~12月 持續累積

async function seedPortfolios(token) {
  console.log('\n📈 建立每月投資組合紀錄...');

  // 0050 在6月分割 1→4，分割前價格約180，分割後約45
  const portfolios = [
    // ─── 2025-01: 第一筆投入 ───
    {
      yearMonth: '2025-01',
      note: '第一次用 app 記錄！定期定額開始',
      holdings: [
        { symbol: '0050', name: '元大台灣50', shares: 1, avgCost: 195.0, marketValue: 201.3, pnl: 6.3 },
        { symbol: '00878', name: '國泰永續高股息', shares: 500, avgCost: 21.5, marketValue: 11140.0, pnl: 390.0 },
      ],
      totalCost: 10945,
      totalMarketValue: 11341.3,
      totalPnL: 396.3,
    },
    // ─── 2025-02: 加碼定期定額 ───
    {
      yearMonth: '2025-02',
      note: '過年紅包拿去投資了',
      holdings: [
        { symbol: '0050', name: '元大台灣50', shares: 2, avgCost: 195.0, marketValue: 385.0, pnl: -5.0 },
        { symbol: '00878', name: '國泰永續高股息', shares: 1000, avgCost: 21.8, marketValue: 22400.0, pnl: 600.0 },
      ],
      totalCost: 22190,
      totalMarketValue: 22785.0,
      totalPnL: 595.0,
    },
    // ─── 2025-03: 市場開始回檔 ───
    {
      yearMonth: '2025-03',
      note: '市場跌了不少…但還是照計畫扣款',
      holdings: [
        { symbol: '0050', name: '元大台灣50', shares: 3, avgCost: 190.0, marketValue: 518.25, pnl: -51.75 },
        { symbol: '00878', name: '國泰永續高股息', shares: 1500, avgCost: 21.7, marketValue: 31650.0, pnl: -900.0 },
      ],
      totalCost: 33120,
      totalMarketValue: 32168.25,
      totalPnL: -951.75,
    },
    // ─── 2025-04: 大跌加碼台積電！ ───
    {
      yearMonth: '2025-04',
      note: '台積電跌到900以下！手刀加碼1股，也多買了一些ETF',
      holdings: [
        { symbol: '0050', name: '元大台灣50', shares: 4, avgCost: 188.0, marketValue: 674.4, pnl: -77.6 },
        { symbol: '00878', name: '國泰永續高股息', shares: 2000, avgCost: 21.5, marketValue: 40620.0, pnl: -2380.0 },
        { symbol: '2330', name: '台積電', shares: 1, avgCost: 905.0, marketValue: 908.0, pnl: 3.0 },
      ],
      totalCost: 44505,
      totalMarketValue: 42202.4,
      totalPnL: -2454.6,
    },
    // ─── 2025-05: 反彈開始，加入00919 ───
    {
      yearMonth: '2025-05',
      note: '朋友推薦 00919 高息 ETF，小試身手',
      holdings: [
        { symbol: '0050', name: '元大台灣50', shares: 5, avgCost: 187.0, marketValue: 898.75, pnl: -36.25 },
        { symbol: '00878', name: '國泰永續高股息', shares: 2500, avgCost: 21.4, marketValue: 51075.0, pnl: -2425.0 },
        { symbol: '2330', name: '台積電', shares: 1, avgCost: 905.0, marketValue: 967.0, pnl: 62.0 },
        { symbol: '00919', name: '群益台灣精選高息', shares: 500, avgCost: 21.8, marketValue: 11090.0, pnl: 190.0 },
      ],
      totalCost: 56535,
      totalMarketValue: 64030.75,
      totalPnL: -2209.25,
    },
    // ─── 2025-06: 0050分割 1→4，也加碼了一些 ───
    {
      yearMonth: '2025-06',
      note: '0050 分割了！1股變4股，價格變1/4。趁便宜多買一些',
      holdings: [
        { symbol: '0050', name: '元大台灣50', shares: 30, avgCost: 47.0, marketValue: 1450.8, pnl: 40.8 },
        { symbol: '00878', name: '國泰永續高股息', shares: 3000, avgCost: 21.3, marketValue: 62700.0, pnl: -1200.0 },
        { symbol: '2330', name: '台積電', shares: 1, avgCost: 905.0, marketValue: 1060.0, pnl: 155.0 },
        { symbol: '00919', name: '群益台灣精選高息', shares: 1000, avgCost: 21.6, marketValue: 21460.0, pnl: -140.0 },
      ],
      totalCost: 87410,
      totalMarketValue: 86670.8,
      totalPnL: -1144.2,
    },
    // ─── 2025-07: 穩定成長 ───
    {
      yearMonth: '2025-07',
      note: '穩穩扣，台積電漲回來了！',
      holdings: [
        { symbol: '0050', name: '元大台灣50', shares: 40, avgCost: 47.2, marketValue: 2062.0, pnl: 174.0 },
        { symbol: '00878', name: '國泰永續高股息', shares: 3500, avgCost: 21.3, marketValue: 73675.0, pnl: -775.0 },
        { symbol: '2330', name: '台積電', shares: 1, avgCost: 905.0, marketValue: 1160.0, pnl: 255.0 },
        { symbol: '00919', name: '群益台灣精選高息', shares: 1500, avgCost: 21.5, marketValue: 31950.0, pnl: -300.0 },
      ],
      totalCost: 99930,
      totalMarketValue: 108847.0,
      totalPnL: -646.0,
    },
    // ─── 2025-08: 加碼台積電 ───
    {
      yearMonth: '2025-08',
      note: '領到年中獎金！再買一股台積電',
      holdings: [
        { symbol: '0050', name: '元大台灣50', shares: 50, avgCost: 47.5, marketValue: 2625.0, pnl: 250.0 },
        { symbol: '00878', name: '國泰永續高股息', shares: 4000, avgCost: 21.2, marketValue: 81400.0, pnl: -2400.0 },
        { symbol: '2330', name: '台積電', shares: 2, avgCost: 1030.0, marketValue: 2320.0, pnl: 260.0 },
        { symbol: '00919', name: '群益台灣精選高息', shares: 2000, avgCost: 21.4, marketValue: 42660.0, pnl: -140.0 },
      ],
      totalCost: 113135,
      totalMarketValue: 129005.0,
      totalPnL: -2030.0,
    },
    // ─── 2025-09: 加入金融股 2891 ───
    {
      yearMonth: '2025-09',
      note: '開始佈局金融股，中信金配息不錯。台積電超猛',
      holdings: [
        { symbol: '0050', name: '元大台灣50', shares: 60, avgCost: 48.0, marketValue: 3468.0, pnl: 588.0 },
        { symbol: '00878', name: '國泰永續高股息', shares: 4500, avgCost: 21.2, marketValue: 96120.0, pnl: 720.0 },
        { symbol: '2330', name: '台積電', shares: 2, avgCost: 1030.0, marketValue: 2610.0, pnl: 550.0 },
        { symbol: '00919', name: '群益台灣精選高息', shares: 2500, avgCost: 21.4, marketValue: 53200.0, pnl: -300.0 },
        { symbol: '2891', name: '中信金', shares: 200, avgCost: 41.5, marketValue: 8580.0, pnl: 280.0 },
      ],
      totalCost: 126630,
      totalMarketValue: 163978.0,
      totalPnL: 1838.0,
    },
    // ─── 2025-10: 台積電大漲，賣掉一股獲利 ───
    {
      yearMonth: '2025-10',
      note: '台積電到1500了！賣一股落袋為安，獲利470元',
      holdings: [
        { symbol: '0050', name: '元大台灣50', shares: 70, avgCost: 48.2, marketValue: 4532.5, pnl: 1098.5 },
        { symbol: '00878', name: '國泰永續高股息', shares: 5000, avgCost: 21.2, marketValue: 108600.0, pnl: 2600.0 },
        { symbol: '2330', name: '台積電', shares: 1, avgCost: 1030.0, marketValue: 1500.0, pnl: 470.0 },
        { symbol: '00919', name: '群益台灣精選高息', shares: 3000, avgCost: 21.4, marketValue: 64710.0, pnl: 510.0 },
        { symbol: '2891', name: '中信金', shares: 400, avgCost: 41.8, marketValue: 16740.0, pnl: 20.0 },
      ],
      totalCost: 138850,
      totalMarketValue: 196082.5,
      totalPnL: 4698.5,
    },
    // ─── 2025-11: 持續定期定額 ───
    {
      yearMonth: '2025-11',
      note: '雙11沒花錢買東西，都存起來定期定額',
      holdings: [
        { symbol: '0050', name: '元大台灣50', shares: 80, avgCost: 48.5, marketValue: 4988.0, pnl: 1108.0 },
        { symbol: '00878', name: '國泰永續高股息', shares: 5500, avgCost: 21.2, marketValue: 114565.0, pnl: -1045.0 },
        { symbol: '2330', name: '台積電', shares: 1, avgCost: 1030.0, marketValue: 1440.0, pnl: 410.0 },
        { symbol: '00919', name: '群益台灣精選高息', shares: 3500, avgCost: 21.4, marketValue: 75145.0, pnl: 255.0 },
        { symbol: '2891', name: '中信金', shares: 500, avgCost: 42.0, marketValue: 21725.0, pnl: 725.0 },
      ],
      totalCost: 150290,
      totalMarketValue: 217863.0,
      totalPnL: 1453.0,
    },
    // ─── 2025-12: 年末紀錄，台積電 + 金融股都漲 ───
    {
      yearMonth: '2025-12',
      note: '2025年結算！從0開始到快20萬了，明年繼續加油 💪',
      holdings: [
        { symbol: '0050', name: '元大台灣50', shares: 90, avgCost: 48.8, marketValue: 5904.0, pnl: 1512.0 },
        { symbol: '00878', name: '國泰永續高股息', shares: 6000, avgCost: 21.2, marketValue: 130260.0, pnl: 3060.0 },
        { symbol: '2330', name: '台積電', shares: 1, avgCost: 1030.0, marketValue: 1550.0, pnl: 520.0 },
        { symbol: '00919', name: '群益台灣精選高息', shares: 4000, avgCost: 21.4, marketValue: 89600.0, pnl: 4000.0 },
        { symbol: '2891', name: '中信金', shares: 600, avgCost: 42.2, marketValue: 30120.0, pnl: 4800.0 },
      ],
      totalCost: 162710,
      totalMarketValue: 257434.0,
      totalPnL: 13892.0,
    },
  ];

  for (const p of portfolios) {
    const payload = {
      holdings: p.holdings,
      screenshotKeys: [],
      note: p.note,
      currency: 'TWD',
      broker: '國泰證券',
      totalMarketValue: p.totalMarketValue,
      totalCost: p.totalCost,
      totalPnL: p.totalPnL,
      yearMonth: p.yearMonth,
    };

    await apiRequest('/portfolio', token, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    console.log(`  ✅ ${p.yearMonth}: ${p.holdings.length} 檔持股, 市值 ${p.totalMarketValue.toLocaleString()} 元`);
  }
}

// ─── Seed: Sell Prices (已實現損益) ─────────────────────────────────────────────

async function seedSellPrices(token) {
  console.log('\n💸 建立賣出紀錄...');

  // 10月賣掉 1 股台積電
  const records = {
    '2330_2025-10': {
      symbol: '2330',
      yearMonth: '2025-10',
      sellPrice: 1500,
      status: 'confirmed',
      soldShares: 1,
      updatedAt: '2025-10-28T10:30:00.000Z',
    },
  };

  await apiRequest('/user/sell-prices', token, {
    method: 'PUT',
    body: JSON.stringify({ records, merge: true }),
  });

  console.log('  ✅ 已記錄: 2330 台積電 賣出 1股 @1500 (2025-10)');
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Investment Retro — 使用者 1 種子資料');
  console.log('═══════════════════════════════════════════\n');
  console.log('👤 人物設定: 25歲上班族，月薪4.5萬');
  console.log('   投資風格: 定期定額為主，偶爾看好加碼');
  console.log('   偏好標的: 0050, 00878, 00919, 2330, 2891');
  console.log('');

  try {
    const token = await signIn();

    await seedAIProfile(token);
    await seedGoals(token);
    await seedPortfolios(token);
    await seedSellPrices(token);

    console.log('\n═══════════════════════════════════════════');
    console.log('🎉 所有種子資料已成功寫入！');
    console.log('   - AI投資風格: 定期定額 + 看重成長');
    console.log('   - 目標: 3 個 (第一桶金/日本旅遊/iPhone)');
    console.log('   - 投資組合: 12 個月份快照');
    console.log('   - 已實現損益: 1 筆賣出紀錄');
    console.log('');
  } catch (err) {
    console.error('\n❌ 錯誤:', err.message);
    process.exit(1);
  }
}

main();
