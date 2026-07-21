'use strict';
// tests/cashflow-projection-presenter.test.js — CashFlowProjectionPresenter
// (modules/finance/cashflow-projection-presenter.js). Sesi 93 (Batch 10)
// — Cash Flow Projection Foundation: Income Projection Card, Expense
// Projection Card, Cash Balance Forecast Card. UI hanya presenter, 100%
// reuse CashFlowProjectionAPI.summary(). Pola sama persis
// tests/financial-forecast-presenter.test.js — dependency
// (CashFlowProjectionAPI, fmt, escapeHtml) di-mock lewat loadSource
// extraGlobals (isolasi murni), UI (document) lewat fakeDom.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeDoc(initial = {}) {
  return createFakeDocument({ cashflowProjGrid: {}, ...initial });
}

function makeCtx(opts = {}) {
  const { document: docOverride, ...rest } = opts;
  const fakeDocument = docOverride || makeDoc();
  const ctx = loadSource(['modules/finance/cashflow-projection-presenter.js'], {
    escapeHtml: (s) => String(s ?? ''),
    fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
    ...rest,
    document: fakeDocument,
  }, ['CashFlowProjectionPresenter']);
  return { CashFlowProjectionPresenter: ctx.CashFlowProjectionPresenter, fakeDocument };
}

function fullSummary(overrides = {}) {
  return Object.assign({
    ok: true,
    income: { ok: true, avgMonthly: 5000000, months: 3, currentMonthIncome: 5200000 },
    expense: { ok: true, avgMonthly: 3500000, months: 3, currentMonthExpense: 3600000 },
    cashBalance: { ok: true, saldoNow: 10000000, projected: 9750000, billsDue: 750000, upcomingCount: 2 },
  }, overrides);
}

test('cashflow-projection-presenter.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('render() — container #cashflowProjGrid tidak ada di DOM: tidak throw', () => {
  const emptyDoc = { getElementById: () => null, querySelectorAll: () => [] };
  const { CashFlowProjectionPresenter } = makeCtx({ document: emptyDoc, CashFlowProjectionAPI: { summary: () => fullSummary() } });
  assert.doesNotThrow(() => CashFlowProjectionPresenter.render());
});

test('render() — CashFlowProjectionAPI belum dimuat: pesan kosong, tidak throw', () => {
  const { CashFlowProjectionPresenter, fakeDocument } = makeCtx({ CashFlowProjectionAPI: undefined });
  assert.doesNotThrow(() => CashFlowProjectionPresenter.render());
  assert.match(fakeDocument.getElementById('cashflowProjGrid').innerHTML, /belum tersedia/);
});

test('render() — summary() ok:false: pesan kosong ditampilkan', () => {
  const CashFlowProjectionAPI = { summary: () => ({ ok: false, reason: 'x' }) };
  const { CashFlowProjectionPresenter, fakeDocument } = makeCtx({ CashFlowProjectionAPI });
  CashFlowProjectionPresenter.render();
  assert.match(fakeDocument.getElementById('cashflowProjGrid').innerHTML, /belum tersedia/);
});

test('render() — ok: 3 kartu (Income/Expense/Cash Balance) ditampilkan dari summary() apa adanya', () => {
  const summary = fullSummary();
  const CashFlowProjectionAPI = { summary: () => summary };
  const { CashFlowProjectionPresenter, fakeDocument } = makeCtx({ CashFlowProjectionAPI });
  CashFlowProjectionPresenter.render();
  const html = fakeDocument.getElementById('cashflowProjGrid').innerHTML;
  assert.match(html, /Proyeksi Pemasukan/);
  assert.match(html, /Proyeksi Pengeluaran/);
  assert.match(html, /Proyeksi Saldo Kas/);
  assert.match(html, /Rp 5.000.000\/bln/);
  assert.match(html, /Rp 3.500.000\/bln/);
});

test('_incomeCard(f) — f ok:false: value "—", sub = reason', () => {
  const { CashFlowProjectionPresenter } = makeCtx();
  const c = CashFlowProjectionPresenter._incomeCard({ ok: false, reason: 'x' });
  assert.equal(c.value, '—');
  assert.equal(c.sub, 'x');
});

test('_expenseCard(f) — f ok:false: value "—"', () => {
  const { CashFlowProjectionPresenter } = makeCtx();
  const c = CashFlowProjectionPresenter._expenseCard({ ok: false });
  assert.equal(c.value, '—');
});

test('_cashBalanceCard(f) — projected negatif: cls red, value pakai tanda minus', () => {
  const { CashFlowProjectionPresenter } = makeCtx();
  const c = CashFlowProjectionPresenter._cashBalanceCard({ ok: true, saldoNow: 1000000, projected: -500000, billsDue: 200000, upcomingCount: 1 });
  assert.equal(c.cls, 'red');
  assert.match(c.value, /^-/);
});

test('_cashBalanceCard(f) — projected positif: cls green, value tanpa tanda minus', () => {
  const { CashFlowProjectionPresenter } = makeCtx();
  const c = CashFlowProjectionPresenter._cashBalanceCard({ ok: true, saldoNow: 1000000, projected: 500000, billsDue: 200000, upcomingCount: 1 });
  assert.equal(c.cls, 'green');
  assert.doesNotMatch(c.value, /^-/);
});

test('_cashBalanceCard(f) — f ok:false: value "—"', () => {
  const { CashFlowProjectionPresenter } = makeCtx();
  const c = CashFlowProjectionPresenter._cashBalanceCard({ ok: false, reason: 'y' });
  assert.equal(c.value, '—');
  assert.equal(c.sub, 'y');
});
