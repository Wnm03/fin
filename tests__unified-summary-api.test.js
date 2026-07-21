'use strict';
// tests/unified-summary-api.test.js — UnifiedSummaryAPI (modules/cross/
// unified-summary-api.js). Sesi 88 (Batch 8) — Unified AI Briefing
// Foundation: Unified Summary API, reuse CrossAIHook.getAIHook() +
// insightCount (penjumlahan panjang array insight finance+vehicle). Pola
// sama persis tests/cross-summary-api.test.js — dependency di-mock lewat
// loadSource extraGlobals (isolasi murni).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts = {}) {
  return loadSource(['modules/cross/unified-summary-api.js'], {
    CrossAIHook: opts.CrossAIHook,
  }, ['UnifiedSummaryAPI']);
}

function crossHook(overrides = {}) {
  return Object.assign({
    ok: true,
    finance: {
      ok: true,
      budget: { ok: true, overCount: 0 },
      healthScore: { score: 82, label: 'Sehat' },
      insights: [{ type: 'info', code: 'health_score', message: 'x' }],
    },
    vehicle: {
      ok: true,
      intelligence: { fleet: { totalVehicles: 2, avgHealth: 75 }, insights: [{ type: 'warning', code: 'fleet_overdue', message: 'y' }] },
      reminder: { overdueCount: 0 },
    },
  }, overrides);
}

test('unified-summary-api.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('summary() — CrossAIHook belum dimuat: {ok:false}, tidak throw', () => {
  const { UnifiedSummaryAPI } = makeCtx({ CrossAIHook: undefined });
  const s = UnifiedSummaryAPI.summary();
  assert.equal(s.ok, false);
  assert.match(s.reason, /CrossAIHook belum dimuat/);
});

test('summary() — CrossAIHook.getAIHook() ok:false: diteruskan apa adanya', () => {
  const CrossAIHook = { getAIHook: () => ({ ok: false, reason: 'FinanceDashboard belum dimuat' }) };
  const { UnifiedSummaryAPI } = makeCtx({ CrossAIHook });
  const s = UnifiedSummaryAPI.summary();
  assert.equal(s.ok, false);
  assert.equal(s.reason, 'FinanceDashboard belum dimuat');
});

test('summary() — reuse 100% finance/vehicle dari CrossAIHook.getAIHook(), 0 transformasi', () => {
  const hook = crossHook();
  const CrossAIHook = { getAIHook: () => hook };
  const { UnifiedSummaryAPI } = makeCtx({ CrossAIHook });
  const s = UnifiedSummaryAPI.summary();
  assert.equal(s.ok, true);
  assert.equal(s.finance, hook.finance);
  assert.equal(s.vehicle, hook.vehicle);
});

test('summary() — insightCount = penjumlahan MURNI panjang finance.insights + vehicle.intelligence.insights', () => {
  const CrossAIHook = { getAIHook: () => crossHook() };
  const { UnifiedSummaryAPI } = makeCtx({ CrossAIHook });
  const s = UnifiedSummaryAPI.summary();
  assert.equal(s.insightCount, 2);
});

test('summary() — insightCount 0 kalau kedua sisi 0 insight', () => {
  const CrossAIHook = { getAIHook: () => crossHook({
    finance: { ok: true, budget: { ok: true, overCount: 0 }, healthScore: { score: 50, label: 'x' }, insights: [] },
    vehicle: { ok: true, intelligence: { fleet: { totalVehicles: 1, avgHealth: 60 }, insights: [] }, reminder: { overdueCount: 0 } },
  }) };
  const { UnifiedSummaryAPI } = makeCtx({ CrossAIHook });
  const s = UnifiedSummaryAPI.summary();
  assert.equal(s.insightCount, 0);
});

test('summary() — finance.ok false: insightCount hanya dari vehicle', () => {
  const CrossAIHook = { getAIHook: () => crossHook({ finance: { ok: false, reason: 'x' } }) };
  const { UnifiedSummaryAPI } = makeCtx({ CrossAIHook });
  const s = UnifiedSummaryAPI.summary();
  assert.equal(s.insightCount, 1);
});
