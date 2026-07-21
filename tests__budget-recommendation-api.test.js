'use strict';
// tests/budget-recommendation-api.test.js — BudgetRecommendationAPI
// (modules/finance/budget-recommendation-api.js). Sesi 92 (Batch 10) —
// Budget Recommendation Foundation: Spending Analysis, Budget Suggestion,
// Budget Insight, summary(). 100% reuse FinanceIntelligence.budgetSummary()
// (sendiri 100% reuse Budget.getUsed()/getEffectiveLimit(), Sesi 74). Pola
// sama persis tests/financial-forecast-api.test.js — dependency di-mock
// lewat loadSource extraGlobals (isolasi murni).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts = {}) {
  const ctx = loadSource(['modules/finance/budget-recommendation-api.js'], {
    ...opts,
  }, ['BudgetRecommendationAPI']);
  return { BudgetRecommendationAPI: ctx.BudgetRecommendationAPI };
}

function fullBudgetSummary(overrides = {}) {
  return Object.assign({
    ok: true,
    month: 6,
    year: 2026,
    items: [
      { id: 'b1', name: 'Belanja Harian', limit: 1000000, used: 1200000, sisa: -200000, pct: 1.2, over: true },
      { id: 'b2', name: 'Transport', limit: 500000, used: 450000, sisa: 50000, pct: 0.9, over: false },
      { id: 'b3', name: 'Hiburan', limit: 500000, used: 100000, sisa: 400000, pct: 0.2, over: false },
      { id: 'b4', name: 'Listrik', limit: 300000, used: 180000, sisa: 120000, pct: 0.6, over: false },
    ],
    totalLimit: 2300000,
    totalUsed: 1930000,
    totalSisa: 370000,
    overallPct: 1930000 / 2300000,
    overCount: 1,
  }, overrides);
}

test('budget-recommendation-api.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

// ================= _budget (via fungsi publik) =================

test('spendingAnalysis() — FinanceIntelligence belum dimuat: ok:false', () => {
  const { BudgetRecommendationAPI } = makeCtx({ FinanceIntelligence: undefined });
  const r = BudgetRecommendationAPI.spendingAnalysis();
  assert.equal(r.ok, false);
  assert.match(r.reason, /belum dimuat/);
});

test('spendingAnalysis() — budgetSummary() ok:false: diteruskan apa adanya', () => {
  const FinanceIntelligence = { budgetSummary: () => ({ ok: false, reason: 'Budget belum dimuat' }) };
  const { BudgetRecommendationAPI } = makeCtx({ FinanceIntelligence });
  const r = BudgetRecommendationAPI.spendingAnalysis();
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'Budget belum dimuat');
});

// ================= spendingAnalysis =================

test('spendingAnalysis() — mengklasifikasi tiap item (over/near/underused/ok) & hitung count per kategori', () => {
  const FinanceIntelligence = { budgetSummary: () => fullBudgetSummary() };
  const { BudgetRecommendationAPI } = makeCtx({ FinanceIntelligence });
  const r = BudgetRecommendationAPI.spendingAnalysis();
  assert.equal(r.ok, true);
  assert.equal(r.items.find((it) => it.id === 'b1').category, 'over');
  assert.equal(r.items.find((it) => it.id === 'b2').category, 'near');
  assert.equal(r.items.find((it) => it.id === 'b3').category, 'underused');
  assert.equal(r.items.find((it) => it.id === 'b4').category, 'ok');
  assert.equal(r.overCount, 1);
  assert.equal(r.nearCount, 1);
  assert.equal(r.underusedCount, 1);
  assert.equal(r.okCount, 1);
});

test('spendingAnalysis() — meneruskan totalLimit/totalUsed/totalSisa/overallPct apa adanya dari budgetSummary()', () => {
  const bs = fullBudgetSummary();
  const FinanceIntelligence = { budgetSummary: () => bs };
  const { BudgetRecommendationAPI } = makeCtx({ FinanceIntelligence });
  const r = BudgetRecommendationAPI.spendingAnalysis();
  assert.equal(r.totalLimit, bs.totalLimit);
  assert.equal(r.totalUsed, bs.totalUsed);
  assert.equal(r.totalSisa, bs.totalSisa);
  assert.equal(r.overallPct, bs.overallPct);
});

test('spendingAnalysis(month, year) — parameter diteruskan apa adanya ke budgetSummary()', () => {
  let calledWith = null;
  const FinanceIntelligence = { budgetSummary: (m, y) => { calledWith = [m, y]; return fullBudgetSummary(); } };
  const { BudgetRecommendationAPI } = makeCtx({ FinanceIntelligence });
  BudgetRecommendationAPI.spendingAnalysis(3, 2025);
  assert.deepEqual(calledWith, [3, 2025]);
});

test('spendingAnalysis() — items kosong: semua count 0, tidak throw', () => {
  const FinanceIntelligence = { budgetSummary: () => fullBudgetSummary({ items: [], overCount: 0 }) };
  const { BudgetRecommendationAPI } = makeCtx({ FinanceIntelligence });
  const r = BudgetRecommendationAPI.spendingAnalysis();
  assert.equal(r.ok, true);
  assert.equal(r.items.length, 0);
  assert.equal(r.nearCount, 0);
  assert.equal(r.underusedCount, 0);
  assert.equal(r.okCount, 0);
});

// ================= budgetSuggestion =================

test('budgetSuggestion() — FinanceIntelligence belum dimuat: ok:false', () => {
  const { BudgetRecommendationAPI } = makeCtx({ FinanceIntelligence: undefined });
  const r = BudgetRecommendationAPI.budgetSuggestion();
  assert.equal(r.ok, false);
});

test('budgetSuggestion() — hanya menyertakan kategori over/near/underused, item "ok" disaring', () => {
  const FinanceIntelligence = { budgetSummary: () => fullBudgetSummary() };
  const { BudgetRecommendationAPI } = makeCtx({ FinanceIntelligence });
  const r = BudgetRecommendationAPI.budgetSuggestion();
  assert.equal(r.ok, true);
  assert.equal(r.suggestions.length, 3);
  assert.ok(!r.suggestions.some((s) => s.id === 'b4'));
});

test('budgetSuggestion() — item over: suggestedLimit = used apa adanya (0 rumus baru)', () => {
  const FinanceIntelligence = { budgetSummary: () => fullBudgetSummary() };
  const { BudgetRecommendationAPI } = makeCtx({ FinanceIntelligence });
  const r = BudgetRecommendationAPI.budgetSuggestion();
  const over = r.suggestions.find((s) => s.id === 'b1');
  assert.equal(over.suggestedLimit, 1200000);
  assert.match(over.message, /melebihi limit/);
});

test('budgetSuggestion() — item near: tidak ada suggestedLimit, pesan berisi persentase pct', () => {
  const FinanceIntelligence = { budgetSummary: () => fullBudgetSummary() };
  const { BudgetRecommendationAPI } = makeCtx({ FinanceIntelligence });
  const r = BudgetRecommendationAPI.budgetSuggestion();
  const near = r.suggestions.find((s) => s.id === 'b2');
  assert.equal(near.suggestedLimit, undefined);
  assert.match(near.message, /90%/);
});

test('budgetSuggestion() — item underused: pesan menyarankan alihkan anggaran', () => {
  const FinanceIntelligence = { budgetSummary: () => fullBudgetSummary() };
  const { BudgetRecommendationAPI } = makeCtx({ FinanceIntelligence });
  const r = BudgetRecommendationAPI.budgetSuggestion();
  const under = r.suggestions.find((s) => s.id === 'b3');
  assert.match(under.message, /dialihkan/);
});

test('budgetSuggestion() — semua item "ok": suggestions kosong', () => {
  const FinanceIntelligence = {
    budgetSummary: () => fullBudgetSummary({
      items: [{ id: 'b1', name: 'Listrik', limit: 300000, used: 180000, sisa: 120000, pct: 0.6, over: false }],
      overCount: 0,
    }),
  };
  const { BudgetRecommendationAPI } = makeCtx({ FinanceIntelligence });
  const r = BudgetRecommendationAPI.budgetSuggestion();
  assert.equal(r.suggestions.length, 0);
});

// ================= budgetInsight =================

test('budgetInsight() — FinanceIntelligence belum dimuat: object {ok:false} (bukan array)', () => {
  const { BudgetRecommendationAPI } = makeCtx({ FinanceIntelligence: undefined });
  const r = BudgetRecommendationAPI.budgetInsight();
  assert.equal(r.ok, false);
});

test('budgetInsight() — overCount>0: insight budget_over_count muncul', () => {
  const FinanceIntelligence = { budgetSummary: () => fullBudgetSummary() };
  const { BudgetRecommendationAPI } = makeCtx({ FinanceIntelligence });
  const r = BudgetRecommendationAPI.budgetInsight();
  assert.ok(r.some((i) => i.code === 'budget_over_count'));
});

test('budgetInsight() — nearCount>0: insight budget_near_count muncul', () => {
  const FinanceIntelligence = { budgetSummary: () => fullBudgetSummary() };
  const { BudgetRecommendationAPI } = makeCtx({ FinanceIntelligence });
  const r = BudgetRecommendationAPI.budgetInsight();
  assert.ok(r.some((i) => i.code === 'budget_near_count'));
});

test('budgetInsight() — underusedCount>0: insight budget_underused_count muncul (type info)', () => {
  const FinanceIntelligence = { budgetSummary: () => fullBudgetSummary() };
  const { BudgetRecommendationAPI } = makeCtx({ FinanceIntelligence });
  const r = BudgetRecommendationAPI.budgetInsight();
  const info = r.find((i) => i.code === 'budget_underused_count');
  assert.ok(info);
  assert.equal(info.type, 'info');
});

test('budgetInsight() — over 0 & near 0: insight budget_healthy (positive) muncul', () => {
  const FinanceIntelligence = {
    budgetSummary: () => fullBudgetSummary({
      items: [{ id: 'b1', name: 'Listrik', limit: 300000, used: 180000, sisa: 120000, pct: 0.6, over: false }],
      overCount: 0,
    }),
  };
  const { BudgetRecommendationAPI } = makeCtx({ FinanceIntelligence });
  const r = BudgetRecommendationAPI.budgetInsight();
  const healthy = r.find((i) => i.code === 'budget_healthy');
  assert.ok(healthy);
  assert.equal(healthy.type, 'positive');
});

// ================= summary =================

test('summary() — ok true kalau spendingAnalysis & budgetSuggestion ok, insight selalu array', () => {
  const FinanceIntelligence = { budgetSummary: () => fullBudgetSummary() };
  const { BudgetRecommendationAPI } = makeCtx({ FinanceIntelligence });
  const r = BudgetRecommendationAPI.summary();
  assert.equal(r.ok, true);
  assert.equal(r.spendingAnalysis.ok, true);
  assert.equal(r.budgetSuggestion.ok, true);
  assert.ok(Array.isArray(r.insight));
  assert.ok(r.insight.length > 0);
});

test('summary() — FinanceIntelligence belum dimuat: ok false, insight tetap array kosong', () => {
  const { BudgetRecommendationAPI } = makeCtx({ FinanceIntelligence: undefined });
  const r = BudgetRecommendationAPI.summary();
  assert.equal(r.ok, false);
  assert.ok(Array.isArray(r.insight));
  assert.equal(r.insight.length, 0);
});

// ================= _classify =================

test('_classify() — over true => "over" apa pun pct-nya', () => {
  const { BudgetRecommendationAPI } = makeCtx();
  assert.equal(BudgetRecommendationAPI._classify({ over: true, pct: 0.1 }), 'over');
});

test('_classify() — pct >= 0.8 & bukan over => "near"', () => {
  const { BudgetRecommendationAPI } = makeCtx();
  assert.equal(BudgetRecommendationAPI._classify({ over: false, pct: 0.8 }), 'near');
});

test('_classify() — pct < 0.4 => "underused"', () => {
  const { BudgetRecommendationAPI } = makeCtx();
  assert.equal(BudgetRecommendationAPI._classify({ over: false, pct: 0.39 }), 'underused');
});

test('_classify() — di antara 0.4 dan 0.8 => "ok"', () => {
  const { BudgetRecommendationAPI } = makeCtx();
  assert.equal(BudgetRecommendationAPI._classify({ over: false, pct: 0.5 }), 'ok');
});
