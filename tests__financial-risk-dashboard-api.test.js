'use strict';
// tests/financial-risk-dashboard-api.test.js — FinancialRiskDashboardAPI
// (modules/finance/financial-risk-dashboard-api.js). Sesi 99 (Batch 10)
// — Financial Risk Dashboard: Risk Factors, Risk Level, summary(). 100%
// reuse DebtOptimizerAPI.debtRecommendation()/FinancialHealthScoreAPI.
// financialHealthRecommendation()/FinanceIntelligence.insights()/
// TanggaKeuangan.compute(). Pola sama persis tests/
// financial-health-score-api.test.js — dependency di-mock lewat
// loadSource extraGlobals (isolasi murni).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts = {}) {
  const ctx = loadSource(['modules/finance/financial-risk-dashboard-api.js'], {
    ...opts,
  }, ['FinancialRiskDashboardAPI']);
  return { FinancialRiskDashboardAPI: ctx.FinancialRiskDashboardAPI };
}

test('financial-risk-dashboard-api.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

// ================= _debtRisk (via riskFactors) =================

test('riskFactors() — DebtOptimizerAPI belum dimuat: tidak menyumbang faktor, tidak throw', () => {
  const { FinancialRiskDashboardAPI } = makeCtx({ DebtOptimizerAPI: undefined });
  assert.doesNotThrow(() => FinancialRiskDashboardAPI.riskFactors());
  const r = FinancialRiskDashboardAPI.riskFactors();
  assert.equal(r.filter((f) => f.domain === 'debt').length, 0);
});

test('riskFactors() — DebtOptimizerAPI.debtRecommendation() throw: tidak menjatuhkan, tidak menyumbang faktor', () => {
  const DebtOptimizerAPI = { debtRecommendation: () => { throw new Error('boom'); } };
  const { FinancialRiskDashboardAPI } = makeCtx({ DebtOptimizerAPI });
  assert.doesNotThrow(() => FinancialRiskDashboardAPI.riskFactors());
});

test('riskFactors() — DebtOptimizerAPI warning diteruskan apa adanya dgn domain "debt"', () => {
  const DebtOptimizerAPI = {
    debtRecommendation: () => [
      { type: 'warning', code: 'debt_dsr_high', message: 'DSR lewat batas aman.' },
      { type: 'positive', code: 'debt_dsr_safe', message: 'DSR aman.' },
    ],
  };
  const { FinancialRiskDashboardAPI } = makeCtx({ DebtOptimizerAPI });
  const r = FinancialRiskDashboardAPI.riskFactors();
  const debtItems = r.filter((f) => f.domain === 'debt');
  assert.equal(debtItems.length, 1);
  assert.equal(debtItems[0].code, 'debt_dsr_high');
  assert.equal(debtItems[0].icon, '📕');
  assert.equal(debtItems[0].message, 'DSR lewat batas aman.');
});

// ================= _healthRisk (via riskFactors) =================

test('riskFactors() — FinancialHealthScoreAPI belum dimuat: tidak menyumbang faktor, tidak throw', () => {
  const { FinancialRiskDashboardAPI } = makeCtx({ FinancialHealthScoreAPI: undefined });
  assert.doesNotThrow(() => FinancialRiskDashboardAPI.riskFactors());
});

test('riskFactors() — FinancialHealthScoreAPI warning diteruskan apa adanya dgn domain "health"', () => {
  const FinancialHealthScoreAPI = {
    financialHealthRecommendation: () => [
      { type: 'warning', code: 'health_component_low', message: 'Tingkat Tabungan masih rendah.' },
      { type: 'info', code: 'health_score_overall', message: 'Skor 65/100.' },
    ],
  };
  const { FinancialRiskDashboardAPI } = makeCtx({ FinancialHealthScoreAPI });
  const r = FinancialRiskDashboardAPI.riskFactors();
  const items = r.filter((f) => f.domain === 'health');
  assert.equal(items.length, 1);
  assert.equal(items[0].code, 'health_component_low');
  assert.equal(items[0].icon, '❤️');
});

// ================= _cashflowBudgetRisk (via riskFactors) =================

test('riskFactors() — FinanceIntelligence belum dimuat: tidak menyumbang faktor, tidak throw', () => {
  const { FinancialRiskDashboardAPI } = makeCtx({ FinanceIntelligence: undefined });
  assert.doesNotThrow(() => FinancialRiskDashboardAPI.riskFactors());
});

test('riskFactors() — FinanceIntelligence warning diteruskan apa adanya dgn domain "cashflow_budget"', () => {
  const FinanceIntelligence = {
    insights: () => [
      { type: 'warning', code: 'deficit', message: 'Pengeluaran melebihi pemasukan.' },
      { type: 'warning', code: 'cashflow_negative', message: 'Proyeksi 30 hari minus.' },
      { type: 'info', code: 'health_score', message: 'Skor 65/100.' },
    ],
  };
  const { FinancialRiskDashboardAPI } = makeCtx({ FinanceIntelligence });
  const r = FinancialRiskDashboardAPI.riskFactors();
  const items = r.filter((f) => f.domain === 'cashflow_budget');
  assert.equal(items.length, 2);
  assert.ok(items.every((i) => i.icon === '💸'));
});

// ================= _emergencyFundRisk (via riskFactors) =================

test('riskFactors() — TanggaKeuangan belum dimuat: tidak menyumbang faktor, tidak throw', () => {
  const { FinancialRiskDashboardAPI } = makeCtx({ TanggaKeuangan: undefined });
  assert.doesNotThrow(() => FinancialRiskDashboardAPI.riskFactors());
});

test('riskFactors() — TanggaKeuangan.compute() throw: tidak menjatuhkan, tidak menyumbang faktor', () => {
  const TanggaKeuangan = { compute: () => { throw new Error('boom'); } };
  const { FinancialRiskDashboardAPI } = makeCtx({ TanggaKeuangan });
  assert.doesNotThrow(() => FinancialRiskDashboardAPI.riskFactors());
});

test('riskFactors() — Dana Darurat step done:true: tidak menyumbang faktor', () => {
  const TanggaKeuangan = {
    compute: () => ({ steps: [{ done: true }, { done: true }, { done: true, note: '100% dari target' }], currentStep: 4 }),
  };
  const { FinancialRiskDashboardAPI } = makeCtx({ TanggaKeuangan });
  const r = FinancialRiskDashboardAPI.riskFactors();
  assert.equal(r.filter((f) => f.domain === 'emergency_fund').length, 0);
});

test('riskFactors() — Dana Darurat step done:false: 1 faktor warning dgn note apa adanya', () => {
  const TanggaKeuangan = {
    compute: () => ({ steps: [{ done: true }, { done: true }, { done: false, note: '40% dari target' }], currentStep: 3 }),
  };
  const { FinancialRiskDashboardAPI } = makeCtx({ TanggaKeuangan });
  const r = FinancialRiskDashboardAPI.riskFactors();
  const items = r.filter((f) => f.domain === 'emergency_fund');
  assert.equal(items.length, 1);
  assert.equal(items[0].type, 'warning');
  assert.match(items[0].message, /40% dari target/);
});

// ================= riskFactors (gabungan) =================

test('riskFactors() — semua sumber tidak dimuat: array kosong', () => {
  const { FinancialRiskDashboardAPI } = makeCtx({
    DebtOptimizerAPI: undefined,
    FinancialHealthScoreAPI: undefined,
    FinanceIntelligence: undefined,
    TanggaKeuangan: undefined,
  });
  const r = FinancialRiskDashboardAPI.riskFactors();
  assert.equal(r.length, 0);
});

test('riskFactors() — gabungan dari beberapa sumber sekaligus, urutan debt->health->cashflow_budget->emergency_fund', () => {
  const DebtOptimizerAPI = { debtRecommendation: () => [{ type: 'warning', code: 'debt_dsr_high', message: 'DSR tinggi.' }] };
  const FinancialHealthScoreAPI = { financialHealthRecommendation: () => [{ type: 'warning', code: 'health_component_low', message: 'Komponen rendah.' }] };
  const FinanceIntelligence = { insights: () => [{ type: 'warning', code: 'deficit', message: 'Defisit.' }] };
  const TanggaKeuangan = { compute: () => ({ steps: [{ done: true }, { done: true }, { done: false, note: '10% dari target' }] }) };
  const { FinancialRiskDashboardAPI } = makeCtx({ DebtOptimizerAPI, FinancialHealthScoreAPI, FinanceIntelligence, TanggaKeuangan });
  const r = FinancialRiskDashboardAPI.riskFactors();
  assert.equal(r.length, 4);
  const domains = r.map((f) => f.domain);
  assert.equal(domains[0], 'debt');
  assert.equal(domains[1], 'health');
  assert.equal(domains[2], 'cashflow_budget');
  assert.equal(domains[3], 'emergency_fund');
});

// ================= riskLevel =================

test('riskLevel() — 0 faktor: level low, label Rendah', () => {
  const { FinancialRiskDashboardAPI } = makeCtx({});
  const rl = FinancialRiskDashboardAPI.riskLevel();
  assert.equal(rl.count, 0);
  assert.equal(rl.level, 'low');
  assert.equal(rl.label, 'Rendah');
});

test('riskLevel() — 1-2 faktor: level medium, label Sedang', () => {
  const DebtOptimizerAPI = { debtRecommendation: () => [{ type: 'warning', code: 'x', message: 'x' }] };
  const FinancialHealthScoreAPI = { financialHealthRecommendation: () => [{ type: 'warning', code: 'y', message: 'y' }] };
  const { FinancialRiskDashboardAPI } = makeCtx({ DebtOptimizerAPI, FinancialHealthScoreAPI });
  const rl = FinancialRiskDashboardAPI.riskLevel();
  assert.equal(rl.count, 2);
  assert.equal(rl.level, 'medium');
  assert.equal(rl.label, 'Sedang');
});

test('riskLevel() — 3+ faktor: level high, label Tinggi', () => {
  const DebtOptimizerAPI = { debtRecommendation: () => [{ type: 'warning', code: 'x', message: 'x' }] };
  const FinancialHealthScoreAPI = { financialHealthRecommendation: () => [{ type: 'warning', code: 'y', message: 'y' }] };
  const FinanceIntelligence = { insights: () => [{ type: 'warning', code: 'z', message: 'z' }] };
  const { FinancialRiskDashboardAPI } = makeCtx({ DebtOptimizerAPI, FinancialHealthScoreAPI, FinanceIntelligence });
  const rl = FinancialRiskDashboardAPI.riskLevel();
  assert.equal(rl.count, 3);
  assert.equal(rl.level, 'high');
  assert.equal(rl.label, 'Tinggi');
});

// ================= summary =================

test('summary() — selalu ok:true walau semua sumber belum dimuat', () => {
  const { FinancialRiskDashboardAPI } = makeCtx({
    DebtOptimizerAPI: undefined,
    FinancialHealthScoreAPI: undefined,
    FinanceIntelligence: undefined,
    TanggaKeuangan: undefined,
  });
  const s = FinancialRiskDashboardAPI.summary();
  assert.equal(s.ok, true);
  assert.equal(s.riskFactors.length, 0);
  assert.equal(s.riskLevel.label, 'Rendah');
});

test('summary() — menggabungkan riskFactors() & riskLevel() apa adanya', () => {
  const DebtOptimizerAPI = { debtRecommendation: () => [{ type: 'warning', code: 'x', message: 'x' }] };
  const { FinancialRiskDashboardAPI } = makeCtx({ DebtOptimizerAPI });
  const s = FinancialRiskDashboardAPI.summary();
  assert.equal(s.ok, true);
  assert.equal(s.riskFactors.length, 1);
  assert.equal(s.riskLevel.count, 1);
});
