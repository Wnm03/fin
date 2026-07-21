'use strict';
// tests/budget-recommendation-presenter.test.js — BudgetRecommendationPresenter
// (modules/finance/budget-recommendation-presenter.js). Sesi 92 (Batch 10)
// — Budget Recommendation Foundation: Over Limit Card, Underused Card, Top
// Suggestion Card. UI hanya presenter, 100% reuse
// BudgetRecommendationAPI.summary(). Pola sama persis
// tests/financial-forecast-presenter.test.js — dependency
// (BudgetRecommendationAPI, fmt, escapeHtml) di-mock lewat loadSource
// extraGlobals (isolasi murni), UI (document) lewat fakeDom.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeDoc(initial = {}) {
  return createFakeDocument({ budgetRecoGrid: {}, ...initial });
}

function makeCtx(opts = {}) {
  const { document: docOverride, ...rest } = opts;
  const fakeDocument = docOverride || makeDoc();
  const ctx = loadSource(['modules/finance/budget-recommendation-presenter.js'], {
    escapeHtml: (s) => String(s ?? ''),
    fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
    ...rest,
    document: fakeDocument,
  }, ['BudgetRecommendationPresenter']);
  return { BudgetRecommendationPresenter: ctx.BudgetRecommendationPresenter, fakeDocument };
}

function fullSpendingAnalysis(overrides = {}) {
  return Object.assign({
    ok: true,
    items: [
      { id: 'b1', name: 'Belanja Harian', limit: 1000000, used: 1200000, sisa: -200000, pct: 1.2, over: true, category: 'over' },
      { id: 'b3', name: 'Hiburan', limit: 500000, used: 100000, sisa: 400000, pct: 0.2, over: false, category: 'underused' },
    ],
    overCount: 1,
    nearCount: 0,
    underusedCount: 1,
    okCount: 0,
  }, overrides);
}

function fullBudgetSuggestion(overrides = {}) {
  return Object.assign({
    ok: true,
    suggestions: [
      { id: 'b1', name: 'Belanja Harian', category: 'over', limit: 1000000, used: 1200000, sisa: -200000, pct: 1.2, suggestedLimit: 1200000, message: '"Belanja Harian" sudah melebihi limit — pertimbangkan naikkan limit.' },
    ],
  }, overrides);
}

function fullSummary(overrides = {}) {
  return Object.assign({
    ok: true,
    spendingAnalysis: fullSpendingAnalysis(),
    budgetSuggestion: fullBudgetSuggestion(),
    insight: [],
  }, overrides);
}

test('budget-recommendation-presenter.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('render() — container #budgetRecoGrid tidak ada di DOM: tidak throw', () => {
  const emptyDoc = { getElementById: () => null, querySelectorAll: () => [] };
  const { BudgetRecommendationPresenter } = makeCtx({ document: emptyDoc, BudgetRecommendationAPI: { summary: () => fullSummary() } });
  assert.doesNotThrow(() => BudgetRecommendationPresenter.render());
});

test('render() — BudgetRecommendationAPI belum dimuat: pesan kosong, tidak throw', () => {
  const { BudgetRecommendationPresenter, fakeDocument } = makeCtx({ BudgetRecommendationAPI: undefined });
  assert.doesNotThrow(() => BudgetRecommendationPresenter.render());
  assert.match(fakeDocument.getElementById('budgetRecoGrid').innerHTML, /belum tersedia/);
});

test('render() — summary() ok:false: pesan kosong ditampilkan', () => {
  const BudgetRecommendationAPI = { summary: () => ({ ok: false, reason: 'x' }) };
  const { BudgetRecommendationPresenter, fakeDocument } = makeCtx({ BudgetRecommendationAPI });
  BudgetRecommendationPresenter.render();
  assert.match(fakeDocument.getElementById('budgetRecoGrid').innerHTML, /belum tersedia/);
});

test('render() — ok: 3 kartu ditampilkan dari summary() apa adanya', () => {
  const summary = fullSummary();
  const BudgetRecommendationAPI = { summary: () => summary };
  const { BudgetRecommendationPresenter, fakeDocument } = makeCtx({ BudgetRecommendationAPI });
  BudgetRecommendationPresenter.render();
  const html = fakeDocument.getElementById('budgetRecoGrid').innerHTML;
  assert.match(html, /Anggaran Over Limit/);
  assert.match(html, /Anggaran Kurang Terpakai/);
  assert.match(html, /Rekomendasi Utama/);
  assert.match(html, /1 kategori/);
  assert.match(html, /Belanja Harian/);
});

test('_overCard(sa) — sa ok:false: value "—", sub = reason', () => {
  const { BudgetRecommendationPresenter } = makeCtx();
  const c = BudgetRecommendationPresenter._overCard({ ok: false, reason: 'x' });
  assert.equal(c.value, '—');
  assert.equal(c.sub, 'x');
});

test('_overCard(sa) — overCount 0: cls green, sub pesan aman', () => {
  const { BudgetRecommendationPresenter } = makeCtx();
  const c = BudgetRecommendationPresenter._overCard({ ok: true, overCount: 0, items: [] });
  assert.equal(c.cls, 'green');
  assert.match(c.sub, /Tidak ada/);
});

test('_overCard(sa) — overCount > 0: cls red, sub nama kategori terbesar', () => {
  const { BudgetRecommendationPresenter } = makeCtx();
  const sa = fullSpendingAnalysis();
  const c = BudgetRecommendationPresenter._overCard(sa);
  assert.equal(c.cls, 'red');
  assert.match(c.sub, /Belanja Harian/);
});

test('_underusedCard(sa) — sa ok:false: value "—"', () => {
  const { BudgetRecommendationPresenter } = makeCtx();
  const c = BudgetRecommendationPresenter._underusedCard({ ok: false });
  assert.equal(c.value, '—');
});

test('_underusedCard(sa) — ada item underused: sub berisi nama & persentase', () => {
  const { BudgetRecommendationPresenter } = makeCtx();
  const sa = fullSpendingAnalysis();
  const c = BudgetRecommendationPresenter._underusedCard(sa);
  assert.match(c.sub, /Hiburan/);
  assert.match(c.sub, /20%/);
});

test('_underusedCard(sa) — underusedCount 0: sub pesan wajar', () => {
  const { BudgetRecommendationPresenter } = makeCtx();
  const c = BudgetRecommendationPresenter._underusedCard({ ok: true, underusedCount: 0, items: [] });
  assert.match(c.sub, /wajar/);
});

test('_topSuggestionCard(bsg) — bsg ok:false: value "—"', () => {
  const { BudgetRecommendationPresenter } = makeCtx();
  const c = BudgetRecommendationPresenter._topSuggestionCard({ ok: false, reason: 'y' });
  assert.equal(c.value, '—');
  assert.equal(c.sub, 'y');
});

test('_topSuggestionCard(bsg) — suggestions kosong: "Tidak ada saran", cls green', () => {
  const { BudgetRecommendationPresenter } = makeCtx();
  const c = BudgetRecommendationPresenter._topSuggestionCard({ ok: true, suggestions: [] });
  assert.equal(c.value, 'Tidak ada saran');
  assert.equal(c.cls, 'green');
});

test('_topSuggestionCard(bsg) — top kategori over: cls red, value = nama, sub = message apa adanya', () => {
  const { BudgetRecommendationPresenter } = makeCtx();
  const bsg = fullBudgetSuggestion();
  const c = BudgetRecommendationPresenter._topSuggestionCard(bsg);
  assert.equal(c.cls, 'red');
  assert.equal(c.value, 'Belanja Harian');
  assert.equal(c.sub, bsg.suggestions[0].message);
});

test('_topSuggestionCard(bsg) — top kategori near: cls kosong (bukan red)', () => {
  const { BudgetRecommendationPresenter } = makeCtx();
  const bsg = { ok: true, suggestions: [{ id: 'b2', name: 'Transport', category: 'near', message: 'x' }] };
  const c = BudgetRecommendationPresenter._topSuggestionCard(bsg);
  assert.equal(c.cls, '');
});
