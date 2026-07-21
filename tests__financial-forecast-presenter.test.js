'use strict';
// tests/financial-forecast-presenter.test.js — FinancialForecastPresenter
// (modules/finance/financial-forecast-presenter.js). Sesi 91 (Batch 10) —
// Financial Forecast Foundation: Income Forecast Card, Expense Forecast
// Card, Cash Flow Projection Card. UI hanya presenter, 100% reuse
// FinancialForecastAPI.summary(). Pola sama persis
// tests/finance-dashboard.test.js — dependency (FinancialForecastAPI, fmt,
// escapeHtml) di-mock lewat loadSource extraGlobals (isolasi murni), UI
// (document) lewat fakeDom.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeDoc(initial = {}) {
  return createFakeDocument({ forecastGrid: {}, ...initial });
}

function makeCtx(opts = {}) {
  const { document: docOverride, ...rest } = opts;
  const fakeDocument = docOverride || makeDoc();
  const ctx = loadSource(['modules/finance/financial-forecast-presenter.js'], {
    escapeHtml: (s) => String(s ?? ''),
    fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
    ...rest,
    document: fakeDocument,
  }, ['FinancialForecastPresenter']);
  return { FinancialForecastPresenter: ctx.FinancialForecastPresenter, fakeDocument };
}

function fullSummary(overrides = {}) {
  return Object.assign({
    ok: true,
    income: { ok: true, avgMonthly: 5000000, months: 3, currentMonthIncome: 5200000 },
    expense: { ok: true, avgMonthly: 3500000, months: 3, currentMonthExpense: 3600000 },
    cashflowProjection: { ok: true, saldoNow: 10000000, projected: 9750000, billsDue: 750000, upcomingCount: 2 },
  }, overrides);
}

test('financial-forecast-presenter.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('render() — container #forecastGrid tidak ada di DOM: tidak throw', () => {
  const emptyDoc = { getElementById: () => null, querySelectorAll: () => [] };
  const { FinancialForecastPresenter } = makeCtx({ document: emptyDoc, FinancialForecastAPI: { summary: () => fullSummary() } });
  assert.doesNotThrow(() => FinancialForecastPresenter.render());
});

test('render() — FinancialForecastAPI belum dimuat: pesan kosong, tidak throw', () => {
  const { FinancialForecastPresenter, fakeDocument } = makeCtx({ FinancialForecastAPI: undefined });
  assert.doesNotThrow(() => FinancialForecastPresenter.render());
  assert.match(fakeDocument.getElementById('forecastGrid').innerHTML, /belum tersedia/);
});

test('render() — summary() ok:false: pesan kosong ditampilkan', () => {
  const FinancialForecastAPI = { summary: () => ({ ok: false, reason: 'x' }) };
  const { FinancialForecastPresenter, fakeDocument } = makeCtx({ FinancialForecastAPI });
  FinancialForecastPresenter.render();
  assert.match(fakeDocument.getElementById('forecastGrid').innerHTML, /belum tersedia/);
});

test('render() — ok: 3 kartu (Income/Expense/Cash Flow Projection) ditampilkan dari summary() apa adanya', () => {
  const summary = fullSummary();
  const FinancialForecastAPI = { summary: () => summary };
  const { FinancialForecastPresenter, fakeDocument } = makeCtx({ FinancialForecastAPI });
  FinancialForecastPresenter.render();
  const html = fakeDocument.getElementById('forecastGrid').innerHTML;
  assert.match(html, /Perkiraan Pemasukan/);
  assert.match(html, /Perkiraan Pengeluaran/);
  assert.match(html, /Proyeksi Saldo 30 Hari/);
  assert.match(html, /Rp 5.000.000\/bln/);
  assert.match(html, /Rp 3.500.000\/bln/);
});

test('_incomeCard(f) — f ok:false: value "—", sub = reason', () => {
  const { FinancialForecastPresenter } = makeCtx();
  const c = FinancialForecastPresenter._incomeCard({ ok: false, reason: 'x' });
  assert.equal(c.value, '—');
  assert.equal(c.sub, 'x');
});

test('_expenseCard(f) — f ok:false: value "—"', () => {
  const { FinancialForecastPresenter } = makeCtx();
  const c = FinancialForecastPresenter._expenseCard({ ok: false });
  assert.equal(c.value, '—');
});

test('_cashflowCard(f) — projected negatif: cls red, value pakai tanda minus', () => {
  const { FinancialForecastPresenter } = makeCtx();
  const c = FinancialForecastPresenter._cashflowCard({ ok: true, saldoNow: 1000000, projected: -500000, billsDue: 200000, upcomingCount: 1 });
  assert.equal(c.cls, 'red');
  assert.match(c.value, /^-/);
});

test('_cashflowCard(f) — projected positif: cls green, value tanpa tanda minus', () => {
  const { FinancialForecastPresenter } = makeCtx();
  const c = FinancialForecastPresenter._cashflowCard({ ok: true, saldoNow: 1000000, projected: 500000, billsDue: 200000, upcomingCount: 1 });
  assert.equal(c.cls, 'green');
  assert.doesNotMatch(c.value, /^-/);
});

test('_cashflowCard(f) — f ok:false: value "—"', () => {
  const { FinancialForecastPresenter } = makeCtx();
  const c = FinancialForecastPresenter._cashflowCard({ ok: false, reason: 'y' });
  assert.equal(c.value, '—');
  assert.equal(c.sub, 'y');
});
