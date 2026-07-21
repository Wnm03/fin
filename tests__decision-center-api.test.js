'use strict';
// tests/decision-center-api.test.js — DecisionCenterAPI (modules/cross/
// decision-center-api.js). Sesi 90 (Batch 8) — Personal Decision Center
// Foundation. 100% reuse LifeDashboardSummaryAPI.summary() +
// PriorityEngine.getItems() + FinanceIntelligence.insights()/
// VehicleIntelligence.insights() difilter type==='warning'. Pola sama
// persis tests/unified-summary-api.test.js — dependency di-mock lewat
// loadSource extraGlobals.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts = {}) {
  const ctx = loadSource(['modules/cross/decision-center-api.js'], {
    ...opts,
  }, ['DecisionCenterAPI']);
  return { DecisionCenterAPI: ctx.DecisionCenterAPI };
}

test('decision-center-api.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('summary() — LifeDashboardSummaryAPI belum dimuat: ok:false', () => {
  const { DecisionCenterAPI } = makeCtx({ LifeDashboardSummaryAPI: undefined });
  const r = DecisionCenterAPI.summary();
  assert.equal(r.ok, false);
});

test('summary() — LifeDashboardSummaryAPI.summary() ok:false: diteruskan apa adanya', () => {
  const LifeDashboardSummaryAPI = { summary: () => ({ ok: false, reason: 'x' }) };
  const { DecisionCenterAPI } = makeCtx({ LifeDashboardSummaryAPI });
  const r = DecisionCenterAPI.summary();
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'x');
});

test('summary() — ok: meneruskan briefing apa adanya, priorityItems dari PriorityEngine', () => {
  const LifeDashboardSummaryAPI = { summary: () => ({ ok: true, briefing: { ok: true, text: 'Halo' }, priorityCount: 5 }) };
  const PriorityEngine = { getItems: () => ({ ok: true, items: [{ kind: 'finance', name: 'Makan' }], count: 1 }) };
  const { DecisionCenterAPI } = makeCtx({ LifeDashboardSummaryAPI, PriorityEngine });
  const r = DecisionCenterAPI.summary();
  assert.equal(r.ok, true);
  assert.equal(r.briefing.text, 'Halo');
  assert.equal(r.priorityItems.length, 1);
  assert.equal(r.priorityCount, 1);
});

test('summary() — PriorityEngine belum dimuat: priorityItems kosong, priorityCount fallback ke s.priorityCount', () => {
  const LifeDashboardSummaryAPI = { summary: () => ({ ok: true, briefing: { ok: false }, priorityCount: 7 }) };
  const { DecisionCenterAPI } = makeCtx({ LifeDashboardSummaryAPI, PriorityEngine: undefined });
  const r = DecisionCenterAPI.summary();
  assert.equal(r.priorityItems.length, 0);
  assert.equal(r.priorityCount, 7);
});

test('recommendations() — FinanceIntelligence/VehicleIntelligence belum dimuat: []', () => {
  const { DecisionCenterAPI } = makeCtx({ FinanceIntelligence: undefined, VehicleIntelligence: undefined });
  assert.equal(DecisionCenterAPI.recommendations().length, 0);
});

test('recommendations() — FILTER murni type===warning, gabungan finance+vehicle', () => {
  const FinanceIntelligence = { insights: () => [{ type: 'warning', message: 'Budget hampir habis' }, { type: 'positive', message: 'Bagus' }] };
  const VehicleIntelligence = { insights: () => [{ type: 'warning', message: 'Servis mendekati jadwal' }, { type: 'info', message: 'Info saja' }] };
  const { DecisionCenterAPI } = makeCtx({ FinanceIntelligence, VehicleIntelligence });
  const recs = DecisionCenterAPI.recommendations();
  assert.equal(recs.length, 2);
  assert.ok(recs.every((r) => r.type === 'warning'));
});

test('summary() — recommendations disertakan & recommendationCount = panjangnya', () => {
  const LifeDashboardSummaryAPI = { summary: () => ({ ok: true, briefing: { ok: false }, priorityCount: 0 }) };
  const PriorityEngine = { getItems: () => ({ ok: true, items: [], count: 0 }) };
  const FinanceIntelligence = { insights: () => [{ type: 'warning', message: 'x' }] };
  const VehicleIntelligence = { insights: () => [] };
  const { DecisionCenterAPI } = makeCtx({ LifeDashboardSummaryAPI, PriorityEngine, FinanceIntelligence, VehicleIntelligence });
  const r = DecisionCenterAPI.summary();
  assert.equal(r.recommendations.length, 1);
  assert.equal(r.recommendationCount, 1);
});
