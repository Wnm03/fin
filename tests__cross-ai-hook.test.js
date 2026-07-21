'use strict';
// tests/cross-ai-hook.test.js — CrossAIHook (modules/cross/cross-ai-hook.js).
// Sesi 87 (Batch 8) — Finance & Vehicle Cross Integration Foundation:
// Unified AI Hook, wrapper tipis ke CrossSummaryAPI.summary(). Pola sama
// persis tests/cross-summary-api.test.js — dependency di-mock lewat
// loadSource extraGlobals (isolasi murni).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts = {}) {
  return loadSource(['modules/cross/cross-ai-hook.js'], {
    CrossSummaryAPI: opts.CrossSummaryAPI,
  }, ['CrossAIHook']);
}

function crossSummary(overrides = {}) {
  return Object.assign({
    ok: true,
    finance: { ok: true, healthScore: { score: 82, label: 'Sehat' } },
    vehicle: { ok: true, intelligence: { fleet: { totalVehicles: 2, avgHealth: 75 } }, reminder: { overdueCount: 1 } },
  }, overrides);
}

test('cross-ai-hook.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('getAIHook() — CrossSummaryAPI belum dimuat: {ok:false}, tidak throw', () => {
  const { CrossAIHook } = makeCtx({ CrossSummaryAPI: undefined });
  const hook = CrossAIHook.getAIHook();
  assert.equal(hook.ok, false);
  assert.match(hook.reason, /CrossSummaryAPI belum dimuat/);
});

test('getAIHook() — reuse 100% CrossSummaryAPI.summary(), 0 transformasi', () => {
  const cs = crossSummary();
  const CrossSummaryAPI = { summary: () => cs };
  const { CrossAIHook } = makeCtx({ CrossSummaryAPI });
  const hook = CrossAIHook.getAIHook();
  assert.equal(hook, cs);
});

test('getAIHook() — meneruskan {ok:false} dari CrossSummaryAPI.summary() apa adanya', () => {
  const CrossSummaryAPI = { summary: () => ({ ok: false, reason: 'FinanceDashboard belum dimuat' }) };
  const { CrossAIHook } = makeCtx({ CrossSummaryAPI });
  const hook = CrossAIHook.getAIHook();
  assert.equal(hook.ok, false);
  assert.equal(hook.reason, 'FinanceDashboard belum dimuat');
});
