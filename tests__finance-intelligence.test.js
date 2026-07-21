'use strict';
// tests/finance-intelligence.test.js — FinanceIntelligence (modules/finance/
// finance-intelligence.js). Sesi 74 (Batch 6) — Finance Intelligence
// Foundation: Cash Flow Summary, Budget Summary, Income vs Expense,
// Financial Health Score, Insight dasar. Pola sama persis
// tests/finance-predict.test.js — dependency (computeCashflowForecast,
// Budget, totalSaldoAkun, totalDebtValue) di-mock lewat loadSource
// extraGlobals (isolasi murni), bukan me-load ulang budget.js/akun.js/
// tx-list-cashflow.js/pajak-aset-ui-wrappers.js sungguhan (yang masing2
// sudah/akan dites terpisah di file test-nya sendiri) — di sini fokus ke
// lapisan agregasi FinanceIntelligence sendiri.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D, opts = {}) {
  return loadSource(['modules/finance/finance-intelligence.js'], {
    D,
    curMonth: opts.curMonth,
    curYear: opts.curYear,
    computeCashflowForecast: opts.computeCashflowForecast,
    Budget: opts.Budget,
    totalSaldoAkun: opts.totalSaldoAkun,
    totalDebtValue: opts.totalDebtValue,
  }, ['FinanceIntelligence']);
}

function baseD(overrides = {}) {
  return Object.assign({
    transactions: [],
    budgets: [],
  }, overrides);
}

// ================= incomeVsExpense =================

test('incomeVsExpense — default range bulan berjalan (curMonth/curYear), hitung income/expense/net/savingsRate', () => {
  const now = new Date();
  const D = baseD({
    transactions: [
      { type: 'income', amount: 10000000, date: new Date(now.getFullYear(), now.getMonth(), 5).toISOString() },
      { type: 'expense', amount: 4000000, date: new Date(now.getFullYear(), now.getMonth(), 10).toISOString() },
      { type: 'expense', amount: 1000000, date: new Date(now.getFullYear(), now.getMonth() - 1, 10).toISOString() }, // bulan lalu, harus di-exclude
    ],
  });
  const ctx = makeCtx(D, { curMonth: now.getMonth(), curYear: now.getFullYear() });
  const result = ctx.FinanceIntelligence.incomeVsExpense();
  assert.equal(result.income, 10000000);
  assert.equal(result.expense, 4000000);
  assert.equal(result.net, 6000000);
  assert.equal(result.savingsRate, 0.6);
  assert.equal(result.txCount, 2);
});

test('incomeVsExpense — range eksplisit {from,to} dipakai apa adanya, mengabaikan curMonth/curYear', () => {
  const D = baseD({
    transactions: [
      { type: 'income', amount: 1000000, date: '2026-01-15' },
      { type: 'income', amount: 2000000, date: '2026-03-15' }, // di luar range
    ],
  });
  const ctx = makeCtx(D, { curMonth: 2, curYear: 2026 });
  const result = ctx.FinanceIntelligence.incomeVsExpense({ from: '2026-01-01', to: '2026-01-31' });
  assert.equal(result.income, 1000000);
});

test('incomeVsExpense — income 0 => savingsRate 0 (bukan NaN/Infinity)', () => {
  const D = baseD({ transactions: [{ type: 'expense', amount: 500000, date: new Date().toISOString() }] });
  const ctx = makeCtx(D);
  const result = ctx.FinanceIntelligence.incomeVsExpense();
  assert.equal(result.income, 0);
  assert.equal(result.savingsRate, 0);
});

// ================= cashflowSummary =================

test('cashflowSummary — guard: computeCashflowForecast belum dimuat => ok:false', () => {
  const ctx = makeCtx(baseD());
  const result = ctx.FinanceIntelligence.cashflowSummary();
  assert.equal(result.ok, false);
});

test('cashflowSummary — reuse computeCashflowForecast() apa adanya + currentMonth dari incomeVsExpense()', () => {
  const now = new Date();
  const D = baseD({
    transactions: [{ type: 'income', amount: 3000000, date: now.toISOString() }],
  });
  const cf = { incAvg: 9000000, expAvg: 3000000, saldoNow: 5000000, billsDue: 0, upcoming: [], projected: 11000000, months: 3, avail: 3 };
  const ctx = makeCtx(D, { computeCashflowForecast: () => cf });
  const result = ctx.FinanceIntelligence.cashflowSummary();
  assert.equal(result.ok, true);
  assert.equal(result.projected, 11000000);
  assert.equal(result.saldoNow, 5000000);
  assert.equal(result.currentMonth.income, 3000000);
});

// ================= budgetSummary =================

test('budgetSummary — guard: Budget/D.budgets belum ada => ok:false', () => {
  const ctx = makeCtx(baseD({ budgets: undefined }));
  const result = ctx.FinanceIntelligence.budgetSummary();
  assert.equal(result.ok, false);
});

test('budgetSummary — reuse Budget.getUsed()/getEffectiveLimit() apa adanya, agregasi total & overCount', () => {
  const D = baseD({
    budgets: [
      { id: 'b1', name: 'Makan' },
      { id: 'b2', name: 'Transport' },
    ],
  });
  const BudgetMock = {
    getEffectiveLimit: (b) => (b.id === 'b1' ? 1000000 : 500000),
    getUsed: (b) => (b.id === 'b1' ? 1200000 : 200000), // b1 over, b2 tidak
  };
  const ctx = makeCtx(D, { Budget: BudgetMock });
  const result = ctx.FinanceIntelligence.budgetSummary();
  assert.equal(result.ok, true);
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].over, true);
  assert.equal(result.items[1].over, false);
  assert.equal(result.totalLimit, 1500000);
  assert.equal(result.totalUsed, 1400000);
  assert.equal(result.overCount, 1);
});

test('budgetSummary — totalLimit 0 => overallPct 0 (bukan NaN)', () => {
  const D = baseD({ budgets: [] });
  const ctx = makeCtx(D, { Budget: { getEffectiveLimit: () => 0, getUsed: () => 0 } });
  const result = ctx.FinanceIntelligence.budgetSummary();
  assert.equal(result.overallPct, 0);
});

// ================= healthScore =================

test('healthScore — semua service tersedia & sehat => skor tinggi, label "Sehat"', () => {
  const now = new Date();
  const D = baseD({
    transactions: [
      { type: 'income', amount: 10000000, date: now.toISOString() },
      { type: 'expense', amount: 3000000, date: now.toISOString() },
    ],
    budgets: [{ id: 'b1', name: 'Makan' }],
  });
  const ctx = makeCtx(D, {
    Budget: { getEffectiveLimit: () => 1000000, getUsed: () => 200000 },
    totalSaldoAkun: () => 10000000,
    totalDebtValue: () => 0,
    computeCashflowForecast: () => ({ projected: 5000000 }),
  });
  const result = ctx.FinanceIntelligence.healthScore();
  // savings 0.7*25=17.5 + budget (1-0.2)*25=20 + debt 25 + cashflow 25 = 87.5/100 -> 88 (dibulatkan)
  assert.equal(result.score, 88);
  assert.equal(result.label, 'Sehat');
  assert.equal(result.parts.length, 4);
});

test('healthScore — defisit & anggaran lewat & utang > saldo & proyeksi minus => skor 0, label "Perlu Perhatian"', () => {
  const now = new Date();
  const D = baseD({
    transactions: [
      { type: 'income', amount: 1000000, date: now.toISOString() },
      { type: 'expense', amount: 5000000, date: now.toISOString() },
    ],
    budgets: [{ id: 'b1', name: 'Makan' }],
  });
  const ctx = makeCtx(D, {
    Budget: { getEffectiveLimit: () => 1000000, getUsed: () => 2000000 },
    totalSaldoAkun: () => 1000000,
    totalDebtValue: () => 5000000,
    computeCashflowForecast: () => ({ projected: -100000 }),
  });
  const result = ctx.FinanceIntelligence.healthScore();
  assert.equal(result.score, 0);
  assert.equal(result.label, 'Perlu Perhatian');
});

test('healthScore — service parsial (hanya income vs expense) tetap dihitung, skor diskalakan dari bobot tersedia', () => {
  const now = new Date();
  const D = baseD({
    transactions: [{ type: 'income', amount: 1000000, date: now.toISOString() }],
    budgets: [],
  });
  const ctx = makeCtx(D); // Budget/totalSaldoAkun/totalDebtValue/computeCashflowForecast semua undefined
  const result = ctx.FinanceIntelligence.healthScore();
  assert.equal(result.parts.length, 1);
  assert.equal(result.parts[0].key, 'savings');
  assert.equal(result.score, 100); // savingsRate 1.0 (semua income, tidak ada expense) -> 25/25 -> 100%
});

// ================= insights =================

test('insights — defisit bulan ini => insight "deficit" muncul', () => {
  const now = new Date();
  const D = baseD({
    transactions: [
      { type: 'income', amount: 1000000, date: now.toISOString() },
      { type: 'expense', amount: 2000000, date: now.toISOString() },
    ],
  });
  const ctx = makeCtx(D);
  const result = ctx.FinanceIntelligence.insights();
  assert.ok(result.some((i) => i.code === 'deficit'));
});

test('insights — savings rate >= 20% => insight "good_savings" muncul (bukan deficit)', () => {
  const now = new Date();
  const D = baseD({
    transactions: [
      { type: 'income', amount: 10000000, date: now.toISOString() },
      { type: 'expense', amount: 5000000, date: now.toISOString() },
    ],
  });
  const ctx = makeCtx(D);
  const result = ctx.FinanceIntelligence.insights();
  assert.ok(result.some((i) => i.code === 'good_savings'));
  assert.ok(!result.some((i) => i.code === 'deficit'));
});

test('insights — anggaran over => insight "budget_over" dgn overCount benar', () => {
  const now = new Date();
  const D = baseD({
    transactions: [{ type: 'income', amount: 5000000, date: now.toISOString() }],
    budgets: [{ id: 'b1', name: 'Makan' }, { id: 'b2', name: 'Hiburan' }],
  });
  const ctx = makeCtx(D, {
    Budget: { getEffectiveLimit: () => 500000, getUsed: (b) => (b.id === 'b1' ? 900000 : 900000) },
  });
  const result = ctx.FinanceIntelligence.insights();
  const found = result.find((i) => i.code === 'budget_over');
  assert.ok(found);
  assert.match(found.message, /^2 anggaran/);
});

test('insights — proyeksi cashflow minus => insight "cashflow_negative" muncul', () => {
  const ctx = makeCtx(baseD(), { computeCashflowForecast: () => ({ projected: -50000 }) });
  const result = ctx.FinanceIntelligence.insights();
  assert.ok(result.some((i) => i.code === 'cashflow_negative'));
});

test('insights — selalu menyertakan 1 insight "health_score" di akhir', () => {
  const ctx = makeCtx(baseD());
  const result = ctx.FinanceIntelligence.insights();
  const last = result[result.length - 1];
  assert.equal(last.code, 'health_score');
  assert.equal(last.type, 'info');
});

// ================= summary =================

test('summary — gabungan 5 fungsi (cashflow/budget/incomeVsExpense/healthScore/insights), 0 logic tambahan', () => {
  const now = new Date();
  const D = baseD({
    transactions: [{ type: 'income', amount: 2000000, date: now.toISOString() }],
    budgets: [],
  });
  const ctx = makeCtx(D);
  const result = ctx.FinanceIntelligence.summary();
  assert.ok('cashflow' in result);
  assert.ok('budget' in result);
  assert.ok('incomeVsExpense' in result);
  assert.ok('healthScore' in result);
  assert.ok(Array.isArray(result.insights));
  assert.equal(result.incomeVsExpense.income, 2000000);
});
