'use strict';
// tests/financial-health-score-api.test.js — FinancialHealthScoreAPI
// (modules/finance/financial-health-score-api.js). Sesi 98 (Batch 10) —
// Financial Health Score Foundation: Score Overview, Component
// Breakdown, Financial Health Recommendation, summary(). 100% reuse
// `FinanceIntelligence.healthScore()`. Pola sama persis tests/
// retirement-planner-api.test.js — dependency di-mock lewat loadSource
// extraGlobals (isolasi murni).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts = {}) {
  const ctx = loadSource(['modules/finance/financial-health-score-api.js'], {
    ...opts,
  }, ['FinancialHealthScoreAPI']);
  return { FinancialHealthScoreAPI: ctx.FinancialHealthScoreAPI };
}

function makeFinanceIntelligence(overrides = {}) {
  return Object.assign({
    healthScore: () => ({
      score: 72,
      label: 'Cukup Sehat',
      parts: [
        { key: 'savings', weight: 25, score: 20 },
        { key: 'budget', weight: 25, score: 18 },
        { key: 'debt', weight: 25, score: 22 },
        { key: 'cashflow', weight: 25, score: 25 },
      ],
    }),
  }, overrides);
}

test('financial-health-score-api.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

// ================= _score (via scoreOverview) =================

test('scoreOverview() — FinanceIntelligence belum dimuat: ok:false', () => {
  const { FinancialHealthScoreAPI } = makeCtx({ FinanceIntelligence: undefined });
  const r = FinancialHealthScoreAPI.scoreOverview();
  assert.equal(r.ok, false);
  assert.match(r.reason, /belum dimuat/);
});

test('scoreOverview() — FinanceIntelligence.healthScore() throw: ok:false, tidak menjatuhkan', () => {
  const FinanceIntelligence = { healthScore: () => { throw new Error('boom'); } };
  const { FinancialHealthScoreAPI } = makeCtx({ FinanceIntelligence });
  assert.doesNotThrow(() => FinancialHealthScoreAPI.scoreOverview());
  const r = FinancialHealthScoreAPI.scoreOverview();
  assert.equal(r.ok, false);
});

test('scoreOverview() — meneruskan FinanceIntelligence.healthScore() apa adanya', () => {
  const FinanceIntelligence = makeFinanceIntelligence();
  const { FinancialHealthScoreAPI } = makeCtx({ FinanceIntelligence });
  const r = FinancialHealthScoreAPI.scoreOverview();
  assert.equal(r.ok, true);
  assert.equal(r.score, 72);
  assert.equal(r.label, 'Cukup Sehat');
  assert.equal(r.parts.length, 4);
});

// ================= componentBreakdown =================

test('componentBreakdown() — scoreOverview ok:false: diteruskan apa adanya', () => {
  const { FinancialHealthScoreAPI } = makeCtx({ FinanceIntelligence: undefined });
  const r = FinancialHealthScoreAPI.componentBreakdown();
  assert.equal(r.ok, false);
});

test('componentBreakdown() — memetakan label & pct per komponen dari parts apa adanya', () => {
  const FinanceIntelligence = makeFinanceIntelligence();
  const { FinancialHealthScoreAPI } = makeCtx({ FinanceIntelligence });
  const r = FinancialHealthScoreAPI.componentBreakdown();
  assert.equal(r.ok, true);
  assert.equal(r.items.length, 4);
  const savings = r.items.find((i) => i.key === 'savings');
  assert.equal(savings.label, 'Tingkat Tabungan');
  assert.equal(savings.weight, 25);
  assert.equal(savings.score, 20);
  assert.equal(savings.pct, 0.8);
  const cashflow = r.items.find((i) => i.key === 'cashflow');
  assert.equal(cashflow.pct, 1);
});

test('componentBreakdown() — key tidak dikenal: label fallback ke key mentah', () => {
  const FinanceIntelligence = makeFinanceIntelligence({
    healthScore: () => ({ score: 50, label: 'Waspada', parts: [{ key: 'misc', weight: 10, score: 5 }] }),
  });
  const { FinancialHealthScoreAPI } = makeCtx({ FinanceIntelligence });
  const r = FinancialHealthScoreAPI.componentBreakdown();
  assert.equal(r.items[0].label, 'misc');
});

test('componentBreakdown() — weight 0: pct 0 (tidak divide-by-zero)', () => {
  const FinanceIntelligence = makeFinanceIntelligence({
    healthScore: () => ({ score: 0, label: 'Perlu Perhatian', parts: [{ key: 'savings', weight: 0, score: 0 }] }),
  });
  const { FinancialHealthScoreAPI } = makeCtx({ FinanceIntelligence });
  const r = FinancialHealthScoreAPI.componentBreakdown();
  assert.equal(r.items[0].pct, 0);
});

// ================= financialHealthRecommendation =================

test('financialHealthRecommendation() — scoreOverview ok:false: array kosong', () => {
  const { FinancialHealthScoreAPI } = makeCtx({ FinanceIntelligence: undefined });
  const r = FinancialHealthScoreAPI.financialHealthRecommendation();
  assert.equal(r.length, 0);
});

test('financialHealthRecommendation() — score>=80: overall positive', () => {
  const FinanceIntelligence = makeFinanceIntelligence({
    healthScore: () => ({ score: 85, label: 'Sehat', parts: [{ key: 'savings', weight: 25, score: 25 }] }),
  });
  const { FinancialHealthScoreAPI } = makeCtx({ FinanceIntelligence });
  const r = FinancialHealthScoreAPI.financialHealthRecommendation();
  const overall = r.find((x) => x.code === 'health_score_overall');
  assert.ok(overall);
  assert.equal(overall.type, 'positive');
  assert.match(overall.message, /85\/100/);
});

test('financialHealthRecommendation() — 60<=score<80: overall info', () => {
  const FinanceIntelligence = makeFinanceIntelligence({
    healthScore: () => ({ score: 65, label: 'Cukup Sehat', parts: [{ key: 'savings', weight: 25, score: 20 }] }),
  });
  const { FinancialHealthScoreAPI } = makeCtx({ FinanceIntelligence });
  const r = FinancialHealthScoreAPI.financialHealthRecommendation();
  const overall = r.find((x) => x.code === 'health_score_overall');
  assert.equal(overall.type, 'info');
});

test('financialHealthRecommendation() — score<60: overall warning', () => {
  const FinanceIntelligence = makeFinanceIntelligence({
    healthScore: () => ({ score: 35, label: 'Perlu Perhatian', parts: [{ key: 'savings', weight: 25, score: 5 }] }),
  });
  const { FinancialHealthScoreAPI } = makeCtx({ FinanceIntelligence });
  const r = FinancialHealthScoreAPI.financialHealthRecommendation();
  const overall = r.find((x) => x.code === 'health_score_overall');
  assert.equal(overall.type, 'warning');
});

test('financialHealthRecommendation() — komponen dgn pct<0.5: warning health_component_low per komponen', () => {
  const FinanceIntelligence = makeFinanceIntelligence({
    healthScore: () => ({
      score: 50,
      label: 'Waspada',
      parts: [
        { key: 'savings', weight: 25, score: 10 }, // pct 0.4 -> low
        { key: 'budget', weight: 25, score: 20 },  // pct 0.8 -> ok
      ],
    }),
  });
  const { FinancialHealthScoreAPI } = makeCtx({ FinanceIntelligence });
  const r = FinancialHealthScoreAPI.financialHealthRecommendation();
  const low = r.filter((x) => x.code === 'health_component_low');
  assert.equal(low.length, 1);
  assert.match(low[0].message, /Tingkat Tabungan/);
});

test('financialHealthRecommendation() — semua komponen pct>=0.5: tidak ada health_component_low', () => {
  const FinanceIntelligence = makeFinanceIntelligence();
  const { FinancialHealthScoreAPI } = makeCtx({ FinanceIntelligence });
  const r = FinancialHealthScoreAPI.financialHealthRecommendation();
  assert.equal(r.filter((x) => x.code === 'health_component_low').length, 0);
});

// ================= summary =================

test('summary() — FinanceIntelligence belum dimuat: ok:false, sub-field tetap konsisten', () => {
  const { FinancialHealthScoreAPI } = makeCtx({ FinanceIntelligence: undefined });
  const s = FinancialHealthScoreAPI.summary();
  assert.equal(s.ok, false);
  assert.equal(s.scoreOverview.ok, false);
  assert.equal(s.componentBreakdown.ok, false);
  assert.equal(s.recommendation.length, 0);
});

test('summary() — ok: menggabungkan ke-3 fungsi apa adanya', () => {
  const FinanceIntelligence = makeFinanceIntelligence();
  const { FinancialHealthScoreAPI } = makeCtx({ FinanceIntelligence });
  const s = FinancialHealthScoreAPI.summary();
  assert.equal(s.ok, true);
  assert.equal(s.scoreOverview.score, 72);
  assert.equal(s.componentBreakdown.items.length, 4);
  assert.ok(Array.isArray(s.recommendation));
  assert.ok(s.recommendation.length >= 1);
});
