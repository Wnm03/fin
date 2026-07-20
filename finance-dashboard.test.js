'use strict';
// tests/finance-dashboard.test.js — FinanceDashboard (modules/finance/
// finance-dashboard.js). Sesi 75 (Batch 6) — Finance Dashboard & AI Hook
// Foundation: Net Worth Card, Cash Flow Card, Budget Card, Financial
// Health Card, getAIHook(). Pola sama persis tests/finance-intelligence.test.js
// — dependency (FinanceIntelligence, totalSaldoAkun, totalDebtValue, fmt)
// di-mock lewat loadSource extraGlobals (isolasi murni), UI (document) lewat
// fakeDom (pola sama tests/dashboard-hub-summary.test.js).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/loadSource');
const { createFakeDocument } = require('../helpers/fakeDom');

function makeDoc(initial = {}) {
  return createFakeDocument({ findashGrid: {}, ...initial });
}

function makeCtx(opts = {}) {
  const { document: docOverride, ...rest } = opts;
  const fakeDocument = docOverride || makeDoc();
  const ctx = loadSource(['modules/finance/finance-dashboard.js'], {
    escapeHtml: (s) => String(s ?? ''),
    fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
    ...rest,
    document: fakeDocument,
  }, ['FinanceDashboard']);
  return { FinanceDashboard: ctx.FinanceDashboard, fakeDocument };
}

function fullSummary(overrides = {}) {
  return Object.assign({
    cashflow: { ok: true, projected: 500000, currentMonth: { net: 2000000 } },
    budget: { ok: true, totalUsed: 800000, totalLimit: 1000000, overallPct: 0.8, overCount: 0 },
    incomeVsExpense: { income: 10000000, expense: 8000000, net: 2000000, savingsRate: 0.2 },
    healthScore: { score: 85, label: 'Sehat', parts: [] },
    insights: [],
  }, overrides);
}

// ================= getAIHook =================

test('finance-dashboard.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('getAIHook() — FinanceIntelligence belum dimuat: {ok:false}, tidak throw', () => {
  const { FinanceDashboard } = makeCtx({ FinanceIntelligence: undefined });
  const hook = FinanceDashboard.getAIHook();
  assert.equal(hook.ok, false);
  assert.match(hook.reason, /belum dimuat/);
});

test('getAIHook() — reuse 100% FinanceIntelligence.summary(), 0 transformasi', () => {
  const summary = fullSummary();
  const FinanceIntelligence = { summary: () => summary };
  const { FinanceDashboard } = makeCtx({ FinanceIntelligence });
  const hook = FinanceDashboard.getAIHook();
  assert.equal(hook.ok, true);
  assert.equal(hook.cashflow, summary.cashflow);
  assert.equal(hook.budget, summary.budget);
  assert.equal(hook.healthScore, summary.healthScore);
  assert.equal(hook.incomeVsExpense, summary.incomeVsExpense);
});

// ================= render() — guard =================

test('render() — container #findashGrid tidak ada di DOM: tidak error, tidak melempar', () => {
  const emptyDoc = { getElementById: () => null, querySelectorAll: () => [] };
  const { FinanceDashboard } = makeCtx({ document: emptyDoc, FinanceIntelligence: { summary: () => fullSummary() } });
  assert.doesNotThrow(() => FinanceDashboard.render());
});

test('render() — FinanceIntelligence belum dimuat: tampilkan empty state, tidak throw', () => {
  const { FinanceDashboard, fakeDocument } = makeCtx({ FinanceIntelligence: undefined });
  assert.doesNotThrow(() => FinanceDashboard.render());
  const html = fakeDocument.getElementById('findashGrid').innerHTML;
  assert.match(html, /belum tersedia/);
});

// ================= render() — Net Worth Card =================

test('render() — Net Worth Card: saldo - utang, hijau kalau positif', () => {
  const FinanceIntelligence = { summary: () => fullSummary() };
  const totalSaldoAkun = () => 15000000;
  const totalDebtValue = () => 5000000;
  const { FinanceDashboard, fakeDocument } = makeCtx({ FinanceIntelligence, totalSaldoAkun, totalDebtValue });
  FinanceDashboard.render();
  const html = fakeDocument.getElementById('findashGrid').innerHTML;
  assert.match(html, /Kekayaan Bersih/);
  assert.match(html, /Rp 10.000.000/);
  assert.match(html, /class="findash-card-val green"/);
});

test('render() — Net Worth Card: merah kalau utang melebihi saldo (net negatif)', () => {
  const FinanceIntelligence = { summary: () => fullSummary() };
  const totalSaldoAkun = () => 2000000;
  const totalDebtValue = () => 5000000;
  const { FinanceDashboard, fakeDocument } = makeCtx({ FinanceIntelligence, totalSaldoAkun, totalDebtValue });
  FinanceDashboard.render();
  const html = fakeDocument.getElementById('findashGrid').innerHTML;
  assert.match(html, /class="findash-card-val red"/);
});

test('render() — Net Worth Card: totalSaldoAkun/totalDebtValue belum dimuat -> "—", tidak throw', () => {
  const FinanceIntelligence = { summary: () => fullSummary() };
  const { FinanceDashboard, fakeDocument } = makeCtx({ FinanceIntelligence });
  assert.doesNotThrow(() => FinanceDashboard.render());
  const html = fakeDocument.getElementById('findashGrid').innerHTML;
  assert.match(html, /Kekayaan Bersih/);
});

// ================= render() — Cash Flow Card =================

test('render() — Cash Flow Card: net bulan berjalan & proyeksi 30 hari dari summary().cashflow apa adanya', () => {
  const FinanceIntelligence = { summary: () => fullSummary() };
  const { FinanceDashboard, fakeDocument } = makeCtx({ FinanceIntelligence });
  FinanceDashboard.render();
  const html = fakeDocument.getElementById('findashGrid').innerHTML;
  assert.match(html, /Arus Kas Bulan Ini/);
  assert.match(html, /Rp 2.000.000/);
  assert.match(html, /Proyeksi 30 hari/);
});

test('render() — Cash Flow Card: cashflow.ok false -> "—" + alasan, tidak throw', () => {
  const FinanceIntelligence = { summary: () => fullSummary({ cashflow: { ok: false, reason: 'computeCashflowForecast belum dimuat' } }) };
  const { FinanceDashboard, fakeDocument } = makeCtx({ FinanceIntelligence });
  assert.doesNotThrow(() => FinanceDashboard.render());
  const html = fakeDocument.getElementById('findashGrid').innerHTML;
  assert.match(html, /Arus Kas/);
  assert.match(html, /computeCashflowForecast belum dimuat/);
});

// ================= render() — Budget Card =================

test('render() — Budget Card: persen pemakaian & nominal dari summary().budget apa adanya', () => {
  const FinanceIntelligence = { summary: () => fullSummary() };
  const { FinanceDashboard, fakeDocument } = makeCtx({ FinanceIntelligence });
  FinanceDashboard.render();
  const html = fakeDocument.getElementById('findashGrid').innerHTML;
  assert.match(html, /Pemakaian Anggaran/);
  assert.match(html, />80%</);
  assert.match(html, /Rp 800.000 dari Rp 1.000.000/);
});

test('render() — Budget Card: overCount > 0 -> merah & tampilkan jumlah lewat batas', () => {
  const FinanceIntelligence = { summary: () => fullSummary({ budget: { ok: true, totalUsed: 1200000, totalLimit: 1000000, overallPct: 1.2, overCount: 2 } }) };
  const { FinanceDashboard, fakeDocument } = makeCtx({ FinanceIntelligence });
  FinanceDashboard.render();
  const html = fakeDocument.getElementById('findashGrid').innerHTML;
  assert.match(html, /2 lewat batas/);
});

// ================= render() — Financial Health Card =================

test('render() — Financial Health Card: skor & label dari summary().healthScore apa adanya', () => {
  const FinanceIntelligence = { summary: () => fullSummary({ healthScore: { score: 42, label: 'Waspada', parts: [] } }) };
  const { FinanceDashboard, fakeDocument } = makeCtx({ FinanceIntelligence });
  FinanceDashboard.render();
  const html = fakeDocument.getElementById('findashGrid').innerHTML;
  assert.match(html, /Skor Kesehatan Finansial/);
  assert.match(html, /42\/100/);
  assert.match(html, /Waspada/);
});

test('render() — semua 4 kartu tampil dalam satu render (Net Worth, Cash Flow, Budget, Health)', () => {
  const FinanceIntelligence = { summary: () => fullSummary() };
  const totalSaldoAkun = () => 15000000;
  const totalDebtValue = () => 5000000;
  const { FinanceDashboard, fakeDocument } = makeCtx({ FinanceIntelligence, totalSaldoAkun, totalDebtValue });
  FinanceDashboard.render();
  const html = fakeDocument.getElementById('findashGrid').innerHTML;
  ['Kekayaan Bersih', 'Arus Kas Bulan Ini', 'Pemakaian Anggaran', 'Skor Kesehatan Finansial'].forEach((label) => {
    assert.match(html, new RegExp(label));
  });
});
