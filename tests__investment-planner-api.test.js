'use strict';
// tests/investment-planner-api.test.js — InvestmentPlannerAPI (modules/
// finance/investment-planner-api.js). Sesi 95 (Batch 10) — Investment
// Planner Foundation: Portfolio Overview, Asset Allocation, Watchlist
// Alerts, Investment Recommendation, summary(). 100% reuse `Investment`
// (modules/asset/investasi.js) + `FinancialGoalAPI._surplus()` (Sesi 94).
// Pola sama persis tests/financial-goal-api.test.js — dependency
// di-mock lewat loadSource extraGlobals (isolasi murni).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts = {}) {
  const ctx = loadSource(['modules/finance/investment-planner-api.js'], {
    ...opts,
  }, ['InvestmentPlannerAPI']);
  return { InvestmentPlannerAPI: ctx.InvestmentPlannerAPI };
}

function portfolioSummary(overrides = {}) {
  return Object.assign({
    holdingsCount: 2,
    totalValue: 20000000,
    totalCost: 18000000,
    totalGainLoss: 2000000,
    roiPct: (2000000 / 18000000) * 100,
    totalDividend: 300000,
    totalRealizedGain: 100000,
  }, overrides);
}

function allocationList(overrides) {
  return overrides || [
    { type: 'Saham', value: 15000000, pct: 75 },
    { type: 'Reksa Dana', value: 5000000, pct: 25 },
  ];
}

test('investment-planner-api.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

// ================= _portfolio (via portfolioOverview) =================

test('portfolioOverview() — Investment belum dimuat: ok:false', () => {
  const { InvestmentPlannerAPI } = makeCtx({ Investment: undefined });
  const r = InvestmentPlannerAPI.portfolioOverview();
  assert.equal(r.ok, false);
  assert.match(r.reason, /belum dimuat/);
});

test('portfolioOverview() — Investment.portfolioSummary() throw: ok:false, tidak menjatuhkan', () => {
  const Investment = { portfolioSummary: () => { throw new Error('boom'); } };
  const { InvestmentPlannerAPI } = makeCtx({ Investment });
  assert.doesNotThrow(() => InvestmentPlannerAPI.portfolioOverview());
  const r = InvestmentPlannerAPI.portfolioOverview();
  assert.equal(r.ok, false);
});

test('portfolioOverview() — meneruskan Investment.portfolioSummary() apa adanya', () => {
  const summary = portfolioSummary();
  const Investment = { portfolioSummary: () => summary };
  const { InvestmentPlannerAPI } = makeCtx({ Investment });
  const r = InvestmentPlannerAPI.portfolioOverview();
  assert.equal(r.ok, true);
  assert.equal(r.holdingsCount, 2);
  assert.equal(r.totalValue, 20000000);
  assert.equal(r.roiPct, summary.roiPct);
});

// ================= _allocation (via assetAllocation) =================

test('assetAllocation() — Investment belum dimuat: ok:false', () => {
  const { InvestmentPlannerAPI } = makeCtx({ Investment: undefined });
  const r = InvestmentPlannerAPI.assetAllocation();
  assert.equal(r.ok, false);
});

test('assetAllocation() — list kosong: topAllocation null', () => {
  const Investment = { assetAllocation: () => [] };
  const { InvestmentPlannerAPI } = makeCtx({ Investment });
  const r = InvestmentPlannerAPI.assetAllocation();
  assert.equal(r.ok, true);
  assert.deepEqual(r.allocation, []);
  assert.equal(r.topAllocation, null);
});

test('assetAllocation() — topAllocation = item bernilai terbesar (murni reduce max)', () => {
  const list = allocationList();
  const Investment = { assetAllocation: () => list };
  const { InvestmentPlannerAPI } = makeCtx({ Investment });
  const r = InvestmentPlannerAPI.assetAllocation();
  assert.equal(r.ok, true);
  assert.deepEqual(r.allocation, list);
  assert.equal(r.topAllocation.type, 'Saham');
  assert.equal(r.topAllocation.value, 15000000);
});

// ================= watchlistAlerts =================

test('watchlistAlerts() — Investment belum dimuat: ok:false', () => {
  const { InvestmentPlannerAPI } = makeCtx({ Investment: undefined });
  const r = InvestmentPlannerAPI.watchlistAlerts();
  assert.equal(r.ok, false);
});

test('watchlistAlerts() — meneruskan Investment.watchlistAlerts() apa adanya + count', () => {
  const alerts = [{ id: 'w1', name: 'BBCA', lastPrice: 9000, targetPrice: 9500 }];
  const Investment = { watchlistAlerts: () => alerts };
  const { InvestmentPlannerAPI } = makeCtx({ Investment });
  const r = InvestmentPlannerAPI.watchlistAlerts();
  assert.equal(r.ok, true);
  assert.equal(r.count, 1);
  assert.deepEqual(r.alerts, alerts);
});

// ================= _surplus =================

test('_surplus() — FinancialGoalAPI belum dimuat: ok:false', () => {
  const { InvestmentPlannerAPI } = makeCtx({ FinancialGoalAPI: undefined });
  const r = InvestmentPlannerAPI._surplus();
  assert.equal(r.ok, false);
  assert.match(r.reason, /belum dimuat/);
});

test('_surplus() — FinancialGoalAPI._surplus() throw: ok:false, tidak menjatuhkan', () => {
  const FinancialGoalAPI = { _surplus: () => { throw new Error('boom'); } };
  const { InvestmentPlannerAPI } = makeCtx({ FinancialGoalAPI });
  assert.doesNotThrow(() => InvestmentPlannerAPI._surplus());
});

test('_surplus() — meneruskan FinancialGoalAPI._surplus() apa adanya', () => {
  const FinancialGoalAPI = { _surplus: () => ({ ok: true, monthlySurplus: 1500000 }) };
  const { InvestmentPlannerAPI } = makeCtx({ FinancialGoalAPI });
  const r = InvestmentPlannerAPI._surplus();
  assert.equal(r.ok, true);
  assert.equal(r.monthlySurplus, 1500000);
});

// ================= investmentRecommendation =================

test('investmentRecommendation() — portfolioOverview ok:false: array kosong', () => {
  const { InvestmentPlannerAPI } = makeCtx({ Investment: undefined });
  const r = InvestmentPlannerAPI.investmentRecommendation();
  assert.equal(r.length, 0);
});

test('investmentRecommendation() — holdingsCount 0: info invest_no_holdings', () => {
  const Investment = { portfolioSummary: () => portfolioSummary({ holdingsCount: 0, totalValue: 0, totalCost: 0, totalGainLoss: 0, roiPct: 0 }), assetAllocation: () => [], watchlistAlerts: () => [] };
  const { InvestmentPlannerAPI } = makeCtx({ Investment });
  const r = InvestmentPlannerAPI.investmentRecommendation();
  assert.ok(r.some((x) => x.code === 'invest_no_holdings'));
});

test('investmentRecommendation() — roiPct<0: warning invest_negative_roi', () => {
  const Investment = {
    portfolioSummary: () => portfolioSummary({ roiPct: -5.2 }),
    assetAllocation: () => allocationList(),
    watchlistAlerts: () => [],
  };
  const { InvestmentPlannerAPI } = makeCtx({ Investment });
  const r = InvestmentPlannerAPI.investmentRecommendation();
  const item = r.find((x) => x.code === 'invest_negative_roi');
  assert.ok(item);
  assert.equal(item.type, 'warning');
});

test('investmentRecommendation() — roiPct>=10: positive invest_good_roi', () => {
  const Investment = {
    portfolioSummary: () => portfolioSummary({ roiPct: 15 }),
    assetAllocation: () => allocationList(),
    watchlistAlerts: () => [],
  };
  const { InvestmentPlannerAPI } = makeCtx({ Investment });
  const r = InvestmentPlannerAPI.investmentRecommendation();
  const item = r.find((x) => x.code === 'invest_good_roi');
  assert.ok(item);
  assert.equal(item.type, 'positive');
});

test('investmentRecommendation() — topAllocation.pct>=70 & holdingsCount>1: info invest_concentration', () => {
  const Investment = {
    portfolioSummary: () => portfolioSummary({ holdingsCount: 2, roiPct: 5 }),
    assetAllocation: () => allocationList(),
    watchlistAlerts: () => [],
  };
  const { InvestmentPlannerAPI } = makeCtx({ Investment });
  const r = InvestmentPlannerAPI.investmentRecommendation();
  const item = r.find((x) => x.code === 'invest_concentration');
  assert.ok(item);
  assert.match(item.message, /Saham/);
});

test('investmentRecommendation() — holdingsCount===1: concentration TIDAK muncul walau pct>=70', () => {
  const Investment = {
    portfolioSummary: () => portfolioSummary({ holdingsCount: 1, roiPct: 5 }),
    assetAllocation: () => allocationList(),
    watchlistAlerts: () => [],
  };
  const { InvestmentPlannerAPI } = makeCtx({ Investment });
  const r = InvestmentPlannerAPI.investmentRecommendation();
  assert.equal(r.some((x) => x.code === 'invest_concentration'), false);
});

test('investmentRecommendation() — watchlist alerts>0: info invest_watchlist_alert', () => {
  const Investment = {
    portfolioSummary: () => portfolioSummary({ roiPct: 5 }),
    assetAllocation: () => allocationList(),
    watchlistAlerts: () => [{ id: 'w1', name: 'BBCA' }],
  };
  const { InvestmentPlannerAPI } = makeCtx({ Investment });
  const r = InvestmentPlannerAPI.investmentRecommendation();
  const item = r.find((x) => x.code === 'invest_watchlist_alert');
  assert.ok(item);
  assert.match(item.message, /1 instrumen/);
});

test('investmentRecommendation() — monthlySurplus>0: positive invest_surplus_available', () => {
  const Investment = {
    portfolioSummary: () => portfolioSummary({ roiPct: 5 }),
    assetAllocation: () => allocationList(),
    watchlistAlerts: () => [],
  };
  const FinancialGoalAPI = { _surplus: () => ({ ok: true, monthlySurplus: 1000000 }) };
  const { InvestmentPlannerAPI } = makeCtx({ Investment, FinancialGoalAPI });
  const r = InvestmentPlannerAPI.investmentRecommendation();
  assert.ok(r.some((x) => x.code === 'invest_surplus_available'));
});

test('investmentRecommendation() — monthlySurplus<=0: invest_surplus_available TIDAK muncul', () => {
  const Investment = {
    portfolioSummary: () => portfolioSummary({ roiPct: 5 }),
    assetAllocation: () => allocationList(),
    watchlistAlerts: () => [],
  };
  const FinancialGoalAPI = { _surplus: () => ({ ok: true, monthlySurplus: -100000 }) };
  const { InvestmentPlannerAPI } = makeCtx({ Investment, FinancialGoalAPI });
  const r = InvestmentPlannerAPI.investmentRecommendation();
  assert.equal(r.some((x) => x.code === 'invest_surplus_available'), false);
});

test('investmentRecommendation() — FinancialGoalAPI tidak tersedia: tetap jalan tanpa error, tidak crash', () => {
  const Investment = {
    portfolioSummary: () => portfolioSummary({ roiPct: 5 }),
    assetAllocation: () => allocationList(),
    watchlistAlerts: () => [],
  };
  const { InvestmentPlannerAPI } = makeCtx({ Investment, FinancialGoalAPI: undefined });
  assert.doesNotThrow(() => InvestmentPlannerAPI.investmentRecommendation());
});

// ================= summary =================

test('summary() — ok true kalau portfolioOverview ok, gabungan field sesuai', () => {
  const Investment = {
    portfolioSummary: () => portfolioSummary(),
    assetAllocation: () => allocationList(),
    watchlistAlerts: () => [],
  };
  const FinancialGoalAPI = { _surplus: () => ({ ok: true, monthlySurplus: 1000000 }) };
  const { InvestmentPlannerAPI } = makeCtx({ Investment, FinancialGoalAPI });
  const r = InvestmentPlannerAPI.summary();
  assert.equal(r.ok, true);
  assert.equal(r.portfolioOverview.holdingsCount, 2);
  assert.equal(r.assetAllocation.ok, true);
  assert.equal(r.watchlistAlerts.ok, true);
  assert.ok(Array.isArray(r.recommendation));
});

test('summary() — Investment belum dimuat: ok false, recommendation array kosong', () => {
  const { InvestmentPlannerAPI } = makeCtx({ Investment: undefined });
  const r = InvestmentPlannerAPI.summary();
  assert.equal(r.ok, false);
  assert.equal(r.recommendation.length, 0);
});
