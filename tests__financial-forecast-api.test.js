'use strict';
// tests/financial-forecast-api.test.js — FinancialForecastAPI (modules/
// finance/financial-forecast-api.js). Sesi 91 (Batch 10) — Financial
// Forecast Foundation: Income Forecast, Expense Forecast, Cash Flow
// Projection, summary(). 100% reuse FinanceDashboard.getAIHook() (sendiri
// 100% reuse FinanceIntelligence.summary(), Sesi 74/75). Pola sama persis
// tests/decision-center-api.test.js — dependency di-mock lewat loadSource
// extraGlobals (isolasi murni).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts = {}) {
  const ctx = loadSource(['modules/finance/financial-forecast-api.js'], {
    ...opts,
  }, ['FinancialForecastAPI']);
  return { FinancialForecastAPI: ctx.FinancialForecastAPI };
}

function fullCashflow(overrides = {}) {
  return Object.assign({
    ok: true,
    incAvg: 5000000,
    expAvg: 3500000,
    saldoNow: 10000000,
    billsDue: 750000,
    upcoming: [{ id: 1 }, { id: 2 }],
    projected: 9750000,
    months: 3,
    avail: 3,
    currentMonth: { income: 5200000, expense: 3600000, net: 1600000 },
  }, overrides);
}

test('financial-forecast-api.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

// ================= _cashflow (via ketiga fungsi publik) =================

test('incomeForecast() — FinanceDashboard belum dimuat: ok:false', () => {
  const { FinancialForecastAPI } = makeCtx({ FinanceDashboard: undefined });
  const r = FinancialForecastAPI.incomeForecast();
  assert.equal(r.ok, false);
  assert.match(r.reason, /belum dimuat/);
});

test('incomeForecast() — getAIHook() ok:false: diteruskan apa adanya', () => {
  const FinanceDashboard = { getAIHook: () => ({ ok: false, reason: 'FinanceIntelligence belum dimuat' }) };
  const { FinancialForecastAPI } = makeCtx({ FinanceDashboard });
  const r = FinancialForecastAPI.incomeForecast();
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'FinanceIntelligence belum dimuat');
});

test('incomeForecast() — cashflow ok:false (computeCashflowForecast belum dimuat): diteruskan apa adanya', () => {
  const FinanceDashboard = { getAIHook: () => ({ ok: true, cashflow: { ok: false, reason: 'computeCashflowForecast belum dimuat' } }) };
  const { FinancialForecastAPI } = makeCtx({ FinanceDashboard });
  const r = FinancialForecastAPI.incomeForecast();
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'computeCashflowForecast belum dimuat');
});

test('incomeForecast() — cashflow tidak ada sama sekali: ok:false fallback', () => {
  const FinanceDashboard = { getAIHook: () => ({ ok: true }) };
  const { FinancialForecastAPI } = makeCtx({ FinanceDashboard });
  const r = FinancialForecastAPI.incomeForecast();
  assert.equal(r.ok, false);
});

test('incomeForecast() — ok: avgMonthly/months/currentMonthIncome dibaca apa adanya dari cashflow', () => {
  const cf = fullCashflow();
  const FinanceDashboard = { getAIHook: () => ({ ok: true, cashflow: cf }) };
  const { FinancialForecastAPI } = makeCtx({ FinanceDashboard });
  const r = FinancialForecastAPI.incomeForecast();
  assert.equal(r.ok, true);
  assert.equal(r.avgMonthly, cf.incAvg);
  assert.equal(r.months, cf.months);
  assert.equal(r.currentMonthIncome, cf.currentMonth.income);
});

test('expenseForecast() — FinanceDashboard belum dimuat: ok:false', () => {
  const { FinancialForecastAPI } = makeCtx({ FinanceDashboard: undefined });
  const r = FinancialForecastAPI.expenseForecast();
  assert.equal(r.ok, false);
});

test('expenseForecast() — ok: avgMonthly/months/currentMonthExpense dibaca apa adanya dari cashflow', () => {
  const cf = fullCashflow();
  const FinanceDashboard = { getAIHook: () => ({ ok: true, cashflow: cf }) };
  const { FinancialForecastAPI } = makeCtx({ FinanceDashboard });
  const r = FinancialForecastAPI.expenseForecast();
  assert.equal(r.ok, true);
  assert.equal(r.avgMonthly, cf.expAvg);
  assert.equal(r.months, cf.months);
  assert.equal(r.currentMonthExpense, cf.currentMonth.expense);
});

test('cashflowProjection() — FinanceDashboard belum dimuat: ok:false', () => {
  const { FinancialForecastAPI } = makeCtx({ FinanceDashboard: undefined });
  const r = FinancialForecastAPI.cashflowProjection();
  assert.equal(r.ok, false);
});

test('cashflowProjection() — ok: saldoNow/projected/billsDue/upcomingCount dibaca apa adanya', () => {
  const cf = fullCashflow();
  const FinanceDashboard = { getAIHook: () => ({ ok: true, cashflow: cf }) };
  const { FinancialForecastAPI } = makeCtx({ FinanceDashboard });
  const r = FinancialForecastAPI.cashflowProjection();
  assert.equal(r.ok, true);
  assert.equal(r.saldoNow, cf.saldoNow);
  assert.equal(r.projected, cf.projected);
  assert.equal(r.billsDue, cf.billsDue);
  assert.equal(r.upcomingCount, cf.upcoming.length);
});

test('cashflowProjection() — upcoming tidak ada: upcomingCount 0, tidak throw', () => {
  const cf = fullCashflow({ upcoming: undefined });
  const FinanceDashboard = { getAIHook: () => ({ ok: true, cashflow: cf }) };
  const { FinancialForecastAPI } = makeCtx({ FinanceDashboard });
  const r = FinancialForecastAPI.cashflowProjection();
  assert.equal(r.ok, true);
  assert.equal(r.upcomingCount, 0);
});

// ================= summary() =================

test('summary() — FinanceDashboard belum dimuat: ok:false, ketiga sub-hasil ok:false', () => {
  const { FinancialForecastAPI } = makeCtx({ FinanceDashboard: undefined });
  const r = FinancialForecastAPI.summary();
  assert.equal(r.ok, false);
  assert.equal(r.income.ok, false);
  assert.equal(r.expense.ok, false);
  assert.equal(r.cashflowProjection.ok, false);
});

test('summary() — ok: ketiga sub-hasil digabung apa adanya, 0 transformasi tambahan', () => {
  const cf = fullCashflow();
  const FinanceDashboard = { getAIHook: () => ({ ok: true, cashflow: cf }) };
  const { FinancialForecastAPI } = makeCtx({ FinanceDashboard });
  const r = FinancialForecastAPI.summary();
  assert.equal(r.ok, true);
  assert.equal(r.income.avgMonthly, cf.incAvg);
  assert.equal(r.expense.avgMonthly, cf.expAvg);
  assert.equal(r.cashflowProjection.projected, cf.projected);
});
