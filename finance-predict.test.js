'use strict';
// tests/finance-predict.test.js — Smart Delivery Engine, Sesi 5/6:
// predictIncome/predictExpense/predictCashflow (modules/finance/
// tx-list-cashflow.js). Ketiganya MEMBUNGKUS computeCashflowForecast()
// yang sudah ada (sudah dites di tests/tx-list-cashflow-deltx.test.js) —
// test di sini fokus ke lapisan proyeksi bulan-demi-bulan di atasnya, jadi
// input D dibuat sederhana (angka averaging computeCashflowForecast sudah
// pasti benar, tidak diulang di sini) — cukup transaksi bulan berjalan +
// totalSaldoAkun tetap, months default (BudgetReko tidak diberikan -> 3).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/loadSource');

function makeCtx(D, opts = {}) {
  return loadSource(['modules/finance/tx-list-cashflow.js'], {
    D,
    totalSaldoAkun: opts.totalSaldoAkun || (() => 1000000),
    BudgetReko: opts.BudgetReko,
  });
}

function baseD(overrides = {}) {
  const now = new Date();
  return Object.assign({
    transactions: [
      { type: 'income', amount: 9000000, date: now.toISOString() },
      { type: 'expense', amount: 3000000, date: now.toISOString() },
    ],
    bills: [],
  }, overrides);
}

// ================= predictIncome =================

test('predictIncome — guard: computeCashflowForecast belum dimuat => ok:false', () => {
  const ctx = makeCtx(baseD());
  // hapus computeCashflowForecast dari context supaya guard teruji
  ctx.computeCashflowForecast = undefined;
  const result = ctx.predictIncome({ monthsAhead: 3 });
  assert.equal(result.ok, false);
});

test('predictIncome — monthlyAvg = incAvg (rata2 3 bulan default), months berisi N entri flat', () => {
  const ctx = makeCtx(baseD());
  const result = ctx.predictIncome({ monthsAhead: 3 });
  assert.equal(result.ok, true);
  assert.equal(result.monthlyAvg, 9000000 / 3);
  assert.equal(result.basedOnMonths, 3);
  assert.equal(result.months.length, 3);
  result.months.forEach((m) => assert.equal(m.amount, 9000000 / 3));
});

test('predictIncome — month label berurutan YYYY-MM mulai bulan depan', () => {
  const ctx = makeCtx(baseD());
  const result = ctx.predictIncome({ monthsAhead: 2 });
  const now = new Date();
  const next1 = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const expected1 = next1.getFullYear() + '-' + String(next1.getMonth() + 1).padStart(2, '0');
  assert.equal(result.months[0].month, expected1);
});

test('predictIncome — default monthsAhead=3 kalau tidak diisi', () => {
  const ctx = makeCtx(baseD());
  const result = ctx.predictIncome();
  assert.equal(result.months.length, 3);
});

// ================= predictExpense =================

test('predictExpense — monthlyAvg = expAvg, TIDAK memasukkan billsDue', () => {
  const now = new Date();
  const in10 = new Date(now); in10.setDate(in10.getDate() + 10);
  const D = baseD({ bills: [{ amount: 500000, nextDue: in10.toISOString() }] });
  const ctx = makeCtx(D);
  const result = ctx.predictExpense({ monthsAhead: 4 });
  assert.equal(result.ok, true);
  assert.equal(result.monthlyAvg, 3000000 / 3);
  assert.equal(result.months.length, 4);
});

// ================= predictCashflow =================

test('predictCashflow — bulan pertama dikurangi billsDue, bulan berikutnya tidak', () => {
  const now = new Date();
  const in10 = new Date(now); in10.setDate(in10.getDate() + 10);
  const D = baseD({ bills: [{ amount: 200000, nextDue: in10.toISOString() }] });
  const ctx = makeCtx(D, { totalSaldoAkun: () => 5000000 });
  const result = ctx.predictCashflow({ monthsAhead: 3 });
  assert.equal(result.ok, true);
  const incAvg = 9000000 / 3, expAvg = 3000000 / 3, monthlyNet = incAvg - expAvg;
  const m1 = 5000000 + monthlyNet - 200000;
  const m2 = m1 + monthlyNet;
  const m3 = m2 + monthlyNet;
  assert.equal(result.months[0].saldoProjected, m1);
  assert.equal(result.months[1].saldoProjected, m2);
  assert.equal(result.months[2].saldoProjected, m3);
  assert.equal(result.projectedEnd, m3);
  assert.equal(result.monthlyNet, monthlyNet);
});

test('predictCashflow — surplus tiap bulan sama dgn incAvg/expAvg dari computeCashflowForecast', () => {
  const ctx = makeCtx(baseD());
  const result = ctx.predictCashflow({ monthsAhead: 2 });
  result.months.forEach((m) => {
    assert.equal(m.income, 9000000 / 3);
    assert.equal(m.expense, 3000000 / 3);
  });
});

test('predictCashflow — guard: computeCashflowForecast belum dimuat => ok:false', () => {
  const ctx = makeCtx(baseD());
  ctx.computeCashflowForecast = undefined;
  const result = ctx.predictCashflow({ monthsAhead: 3 });
  assert.equal(result.ok, false);
});
