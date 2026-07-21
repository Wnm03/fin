'use strict';
// tests/life-dashboard-summary-api.test.js — LifeDashboardSummaryAPI
// (modules/cross/life-dashboard-summary-api.js). Sesi 89 (Batch 8) —
// Personal Life Dashboard Foundation: satu pintu masuk gabungan, 100%
// reuse UnifiedSummaryAPI.summary() + UnifiedAIBriefing.generate(). Pola
// sama persis tests/unified-summary-api.test.js — dependency di-mock
// lewat loadSource extraGlobals (isolasi murni).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts = {}) {
  return loadSource(['modules/cross/life-dashboard-summary-api.js'], {
    UnifiedSummaryAPI: opts.UnifiedSummaryAPI,
    UnifiedAIBriefing: opts.UnifiedAIBriefing,
  }, ['LifeDashboardSummaryAPI']);
}

function fullSummary(overrides = {}) {
  return Object.assign({
    ok: true,
    finance: {
      ok: true,
      budget: { ok: true, overCount: 0 },
      healthScore: { score: 82, label: 'Sehat' },
    },
    vehicle: {
      ok: true,
      intelligence: { fleet: { totalVehicles: 3, avgHealth: 85 } },
      reminder: { overdueCount: 0, dueSoonCount: 0 },
    },
    insightCount: 0,
  }, overrides);
}

test('life-dashboard-summary-api.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('summary() — UnifiedSummaryAPI belum dimuat: {ok:false}, tidak throw', () => {
  const { LifeDashboardSummaryAPI } = makeCtx({ UnifiedSummaryAPI: undefined });
  const s = LifeDashboardSummaryAPI.summary();
  assert.equal(s.ok, false);
  assert.match(s.reason, /UnifiedSummaryAPI belum dimuat/);
});

test('summary() — UnifiedSummaryAPI.summary() ok:false: diteruskan apa adanya', () => {
  const UnifiedSummaryAPI = { summary: () => ({ ok: false, reason: 'CrossAIHook belum dimuat' }) };
  const { LifeDashboardSummaryAPI } = makeCtx({ UnifiedSummaryAPI });
  const s = LifeDashboardSummaryAPI.summary();
  assert.equal(s.ok, false);
  assert.equal(s.reason, 'CrossAIHook belum dimuat');
});

test('summary() — finance/vehicle/insightCount diteruskan apa adanya dari UnifiedSummaryAPI', () => {
  const UnifiedSummaryAPI = { summary: () => fullSummary({ insightCount: 5 }) };
  const UnifiedAIBriefing = { generate: () => ({ ok: true, text: 'x', parts: [] }) };
  const { LifeDashboardSummaryAPI } = makeCtx({ UnifiedSummaryAPI, UnifiedAIBriefing });
  const s = LifeDashboardSummaryAPI.summary();
  assert.equal(s.ok, true);
  assert.equal(s.insightCount, 5);
  assert.equal(s.finance.healthScore.score, 82);
  assert.equal(s.vehicle.intelligence.fleet.avgHealth, 85);
});

test('summary() — UnifiedAIBriefing belum dimuat: briefing {ok:false}, tidak throw, summary tetap ok', () => {
  const UnifiedSummaryAPI = { summary: () => fullSummary() };
  const { LifeDashboardSummaryAPI } = makeCtx({ UnifiedSummaryAPI, UnifiedAIBriefing: undefined });
  const s = LifeDashboardSummaryAPI.summary();
  assert.equal(s.ok, true);
  assert.equal(s.briefing.ok, false);
});

test('summary() — briefing diteruskan apa adanya dari UnifiedAIBriefing.generate()', () => {
  const UnifiedSummaryAPI = { summary: () => fullSummary() };
  const UnifiedAIBriefing = { generate: () => ({ ok: true, text: 'Skor kesehatan finansial 82/100.', parts: ['a'] }) };
  const { LifeDashboardSummaryAPI } = makeCtx({ UnifiedSummaryAPI, UnifiedAIBriefing });
  const s = LifeDashboardSummaryAPI.summary();
  assert.equal(s.briefing.ok, true);
  assert.equal(s.briefing.text, 'Skor kesehatan finansial 82/100.');
});

test('summary() — priorityCount 0 kalau tidak ada budget over/reminder overdue/due-soon', () => {
  const UnifiedSummaryAPI = { summary: () => fullSummary() };
  const { LifeDashboardSummaryAPI } = makeCtx({ UnifiedSummaryAPI });
  const s = LifeDashboardSummaryAPI.summary();
  assert.equal(s.priorityCount, 0);
});

test('summary() — priorityCount: penjumlahan MURNI budget.overCount + reminder.overdueCount + reminder.dueSoonCount, 0 rumus baru', () => {
  const UnifiedSummaryAPI = { summary: () => fullSummary({
    finance: { ok: true, budget: { ok: true, overCount: 2 }, healthScore: { score: 60, label: 'Cukup Sehat' } },
    vehicle: { ok: true, intelligence: { fleet: { totalVehicles: 2, avgHealth: 70 } }, reminder: { overdueCount: 3, dueSoonCount: 4 } },
  }) };
  const { LifeDashboardSummaryAPI } = makeCtx({ UnifiedSummaryAPI });
  const s = LifeDashboardSummaryAPI.summary();
  assert.equal(s.priorityCount, 9);
});

test('summary() — finance.ok false: budgetOver dianggap 0, tidak throw', () => {
  const UnifiedSummaryAPI = { summary: () => fullSummary({
    finance: { ok: false },
    vehicle: { ok: true, intelligence: { fleet: { totalVehicles: 1, avgHealth: 90 } }, reminder: { overdueCount: 1, dueSoonCount: 0 } },
  }) };
  const { LifeDashboardSummaryAPI } = makeCtx({ UnifiedSummaryAPI });
  const s = LifeDashboardSummaryAPI.summary();
  assert.equal(s.priorityCount, 1);
});

test('summary() — vehicle.ok false: reminder counter dianggap 0, tidak throw', () => {
  const UnifiedSummaryAPI = { summary: () => fullSummary({
    finance: { ok: true, budget: { ok: true, overCount: 2 }, healthScore: { score: 60, label: 'Cukup Sehat' } },
    vehicle: { ok: false },
  }) };
  const { LifeDashboardSummaryAPI } = makeCtx({ UnifiedSummaryAPI });
  const s = LifeDashboardSummaryAPI.summary();
  assert.equal(s.priorityCount, 2);
});
