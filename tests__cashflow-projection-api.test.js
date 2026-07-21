'use strict';
// tests/cashflow-projection-api.test.js — CashFlowProjectionAPI (modules/
// finance/cashflow-projection-api.js). Sesi 93 (Batch 10) — Cash Flow
// Projection Foundation: Income Projection, Expense Projection, Cash
// Balance Forecast, summary(). 100% reuse FinancialForecastAPI.summary()
// (sendiri 100% reuse FinanceDashboard.getAIHook()/FinanceIntelligence,
// Sesi 74/75/91). Pola sama persis tests/financial-forecast-api.test.js —
// dependency di-mock lewat loadSource extraGlobals (isolasi murni).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts = {}) {
  const ctx = loadSource(['modules/finance/cashflow-projection-api.js'], {
    ...opts,
  }, ['CashFlowProjectionAPI']);
  return { CashFlowProjectionAPI: ctx.CashFlowProjectionAPI };
}

function fullForecastSummary(overrides = {}) {
  return Object.assign({
    ok: true,
    income: { ok: true, avgMonthly: 5000000, months: 3, currentMonthIncome: 5200000 },
    expense: { ok: true, avgMonthly: 3500000, months: 3, currentMonthExpense: 3600000 },
    cashflowProjection: { ok: true, saldoNow: 10000000, projected: 9750000, billsDue: 750000, upcomingCount: 2 },
  }, overrides);
}

test('cashflow-projection-api.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

// ================= _forecast (via ketiga fungsi publik) =================

test('incomeProjection() — FinancialForecastAPI belum dimuat: ok:false', () => {
  const { CashFlowProjectionAPI } = makeCtx({ FinancialForecastAPI: undefined });
  const r = CashFlowProjectionAPI.incomeProjection();
  assert.equal(r.ok, false);
  assert.match(r.reason, /belum dimuat/);
});

test('incomeProjection() — summary() ok:false: diteruskan apa adanya', () => {
  const FinancialForecastAPI = { summary: () => ({ ok: false, reason: 'FinanceDashboard belum dimuat' }) };
  const { CashFlowProjectionAPI } = makeCtx({ FinancialForecastAPI });
  const r = CashFlowProjectionAPI.incomeProjection();
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'FinanceDashboard belum dimuat');
});

test('incomeProjection() — summary() null: fallback ok:false generik', () => {
  const FinancialForecastAPI = { summary: () => null };
  const { CashFlowProjectionAPI } = makeCtx({ FinancialForecastAPI });
  const r = CashFlowProjectionAPI.incomeProjection();
  assert.equal(r.ok, false);
});

// ================= incomeProjection =================

test('incomeProjection() — meneruskan avgMonthly/months/currentMonthIncome apa adanya', () => {
  const FinancialForecastAPI = { summary: () => fullForecastSummary() };
  const { CashFlowProjectionAPI } = makeCtx({ FinancialForecastAPI });
  const r = CashFlowProjectionAPI.incomeProjection();
  assert.equal(r.ok, true);
  assert.equal(r.avgMonthly, 5000000);
  assert.equal(r.months, 3);
  assert.equal(r.currentMonthIncome, 5200000);
});

// ================= expenseProjection =================

test('expenseProjection() — FinancialForecastAPI belum dimuat: ok:false', () => {
  const { CashFlowProjectionAPI } = makeCtx({ FinancialForecastAPI: undefined });
  const r = CashFlowProjectionAPI.expenseProjection();
  assert.equal(r.ok, false);
});

test('expenseProjection() — meneruskan avgMonthly/months/currentMonthExpense apa adanya', () => {
  const FinancialForecastAPI = { summary: () => fullForecastSummary() };
  const { CashFlowProjectionAPI } = makeCtx({ FinancialForecastAPI });
  const r = CashFlowProjectionAPI.expenseProjection();
  assert.equal(r.ok, true);
  assert.equal(r.avgMonthly, 3500000);
  assert.equal(r.months, 3);
  assert.equal(r.currentMonthExpense, 3600000);
});

// ================= cashBalanceForecast =================

test('cashBalanceForecast() — FinancialForecastAPI belum dimuat: ok:false', () => {
  const { CashFlowProjectionAPI } = makeCtx({ FinancialForecastAPI: undefined });
  const r = CashFlowProjectionAPI.cashBalanceForecast();
  assert.equal(r.ok, false);
});

test('cashBalanceForecast() — meneruskan saldoNow/projected/billsDue/upcomingCount apa adanya', () => {
  const FinancialForecastAPI = { summary: () => fullForecastSummary() };
  const { CashFlowProjectionAPI } = makeCtx({ FinancialForecastAPI });
  const r = CashFlowProjectionAPI.cashBalanceForecast();
  assert.equal(r.ok, true);
  assert.equal(r.saldoNow, 10000000);
  assert.equal(r.projected, 9750000);
  assert.equal(r.billsDue, 750000);
  assert.equal(r.upcomingCount, 2);
});

test('cashBalanceForecast() — 0 recompute: projected diambil apa adanya walau saldoNow+avg tidak konsisten secara manual', () => {
  const FinancialForecastAPI = {
    summary: () => fullForecastSummary({ cashflowProjection: { ok: true, saldoNow: 1, projected: 999999999, billsDue: 0, upcomingCount: 0 } }),
  };
  const { CashFlowProjectionAPI } = makeCtx({ FinancialForecastAPI });
  const r = CashFlowProjectionAPI.cashBalanceForecast();
  assert.equal(r.projected, 999999999);
});

// ================= summary =================

test('summary() — ok true kalau ketiga fungsi ok, field diteruskan apa adanya', () => {
  const FinancialForecastAPI = { summary: () => fullForecastSummary() };
  const { CashFlowProjectionAPI } = makeCtx({ FinancialForecastAPI });
  const r = CashFlowProjectionAPI.summary();
  assert.equal(r.ok, true);
  assert.equal(r.income.avgMonthly, 5000000);
  assert.equal(r.expense.avgMonthly, 3500000);
  assert.equal(r.cashBalance.projected, 9750000);
});

test('summary() — FinancialForecastAPI belum dimuat: ok false', () => {
  const { CashFlowProjectionAPI } = makeCtx({ FinancialForecastAPI: undefined });
  const r = CashFlowProjectionAPI.summary();
  assert.equal(r.ok, false);
  assert.equal(r.income.ok, false);
  assert.equal(r.expense.ok, false);
  assert.equal(r.cashBalance.ok, false);
});

test('summary() — FinancialForecastAPI.summary() ok:false: ketiga sub-fungsi diteruskan ok:false yang sama', () => {
  const FinancialForecastAPI = { summary: () => ({ ok: false, reason: 'z' }) };
  const { CashFlowProjectionAPI } = makeCtx({ FinancialForecastAPI });
  const r = CashFlowProjectionAPI.summary();
  assert.equal(r.ok, false);
  assert.equal(r.income.reason, 'z');
  assert.equal(r.expense.reason, 'z');
  assert.equal(r.cashBalance.reason, 'z');
});
