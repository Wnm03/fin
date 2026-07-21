'use strict';
// tests/debt-optimizer-api.test.js — DebtOptimizerAPI (modules/finance/
// debt-optimizer-api.js). Sesi 96 (Batch 10) — Debt Optimizer
// Foundation: Debt Overview, DSR, Payoff Plan, Debt Recommendation,
// summary(). 100% reuse `Debt`/`DebtStrategy` (modules/finance/
// piutang-utang.js, Sesi 16). Pola sama persis tests/
// investment-planner-api.test.js — dependency di-mock lewat loadSource
// extraGlobals (isolasi murni).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts = {}) {
  const ctx = loadSource(['modules/finance/debt-optimizer-api.js'], {
    ...opts,
  }, ['DebtOptimizerAPI']);
  return { DebtOptimizerAPI: ctx.DebtOptimizerAPI };
}

function makeDebt(overrides = {}) {
  return Object.assign({
    totalValue: () => 10000000,
    totalCicilanBulanan: () => 1500000,
  }, overrides);
}

function makeDebtStrategy(overrides = {}) {
  return Object.assign({
    activeDebts: () => [{ id: 'd1', name: 'KTA Bank', nilai: 10000000, bunga: 12, cicilanBulanan: 1500000 }],
    computeDSR: () => ({ totalCicilanUtang: 1500000, totalCicilanLain: 0, totalCicilan: 1500000, incAvg: 5000000, pct: 30 }),
    computeOrder: (list) => list.slice(),
    simulate: () => ({ months: 8, totalInterest: 350000, payoffMonth: { d1: 8 } }),
  }, overrides);
}

test('debt-optimizer-api.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

// ================= _overview (via debtOverview) =================

test('debtOverview() — Debt/DebtStrategy belum dimuat: ok:false', () => {
  const { DebtOptimizerAPI } = makeCtx({ Debt: undefined, DebtStrategy: undefined });
  const r = DebtOptimizerAPI.debtOverview();
  assert.equal(r.ok, false);
  assert.match(r.reason, /belum dimuat/);
});

test('debtOverview() — Debt.totalValue() throw: ok:false, tidak menjatuhkan', () => {
  const Debt = makeDebt({ totalValue: () => { throw new Error('boom'); } });
  const DebtStrategy = makeDebtStrategy();
  const { DebtOptimizerAPI } = makeCtx({ Debt, DebtStrategy });
  assert.doesNotThrow(() => DebtOptimizerAPI.debtOverview());
  const r = DebtOptimizerAPI.debtOverview();
  assert.equal(r.ok, false);
});

test('debtOverview() — meneruskan Debt/DebtStrategy apa adanya', () => {
  const Debt = makeDebt();
  const DebtStrategy = makeDebtStrategy();
  const { DebtOptimizerAPI } = makeCtx({ Debt, DebtStrategy });
  const r = DebtOptimizerAPI.debtOverview();
  assert.equal(r.ok, true);
  assert.equal(r.activeCount, 1);
  assert.equal(r.totalValue, 10000000);
  assert.equal(r.totalCicilanBulanan, 1500000);
});

// ================= _dsr (via dsr) =================

test('dsr() — DebtStrategy belum dimuat: ok:false', () => {
  const { DebtOptimizerAPI } = makeCtx({ DebtStrategy: undefined });
  const r = DebtOptimizerAPI.dsr();
  assert.equal(r.ok, false);
});

test('dsr() — DebtStrategy.computeDSR() throw: ok:false, tidak menjatuhkan', () => {
  const DebtStrategy = { computeDSR: () => { throw new Error('boom'); } };
  const { DebtOptimizerAPI } = makeCtx({ DebtStrategy });
  assert.doesNotThrow(() => DebtOptimizerAPI.dsr());
});

test('dsr() — meneruskan DebtStrategy.computeDSR() apa adanya', () => {
  const DebtStrategy = makeDebtStrategy();
  const { DebtOptimizerAPI } = makeCtx({ DebtStrategy });
  const r = DebtOptimizerAPI.dsr();
  assert.equal(r.ok, true);
  assert.equal(r.pct, 30);
  assert.equal(r.incAvg, 5000000);
});

// ================= payoffPlan =================

test('payoffPlan() — DebtStrategy/D belum dimuat: ok:false', () => {
  const { DebtOptimizerAPI } = makeCtx({ DebtStrategy: undefined, D: undefined });
  const r = DebtOptimizerAPI.payoffPlan();
  assert.equal(r.ok, false);
});

test('payoffPlan() — tidak ada utang aktif: order kosong, simulation.months null', () => {
  const DebtStrategy = makeDebtStrategy({ activeDebts: () => [] });
  const D = { debtStrategy: { method: 'avalanche', extra: 0 } };
  const { DebtOptimizerAPI } = makeCtx({ DebtStrategy, D });
  const r = DebtOptimizerAPI.payoffPlan();
  assert.equal(r.ok, true);
  assert.equal(r.order.length, 0);
  assert.equal(r.simulation.months, null);
});

test('payoffPlan() — method/extra dari D.debtStrategy dipakai apa adanya', () => {
  const DebtStrategy = makeDebtStrategy();
  const D = { debtStrategy: { method: 'snowball', extra: 200000 } };
  const { DebtOptimizerAPI } = makeCtx({ DebtStrategy, D });
  const r = DebtOptimizerAPI.payoffPlan();
  assert.equal(r.ok, true);
  assert.equal(r.method, 'snowball');
  assert.equal(r.extra, 200000);
  assert.equal(r.simulation.months, 8);
  assert.equal(r.simulation.totalInterest, 350000);
});

test('payoffPlan() — D.debtStrategy belum ada: default avalanche/0 (pola sama DebtStrategy.render())', () => {
  const DebtStrategy = makeDebtStrategy();
  const D = {};
  const { DebtOptimizerAPI } = makeCtx({ DebtStrategy, D });
  const r = DebtOptimizerAPI.payoffPlan();
  assert.equal(r.method, 'avalanche');
  assert.equal(r.extra, 0);
});

test('payoffPlan() — computeOrder()/simulate() throw: ok:false, tidak menjatuhkan', () => {
  const DebtStrategy = makeDebtStrategy({ computeOrder: () => { throw new Error('boom'); } });
  const D = { debtStrategy: { method: 'avalanche', extra: 0 } };
  const { DebtOptimizerAPI } = makeCtx({ DebtStrategy, D });
  assert.doesNotThrow(() => DebtOptimizerAPI.payoffPlan());
  const r = DebtOptimizerAPI.payoffPlan();
  assert.equal(r.ok, false);
});

// ================= debtRecommendation =================

test('debtRecommendation() — debtOverview ok:false: array kosong', () => {
  const { DebtOptimizerAPI } = makeCtx({ Debt: undefined, DebtStrategy: undefined });
  const r = DebtOptimizerAPI.debtRecommendation();
  assert.equal(r.length, 0);
});

test('debtRecommendation() — activeCount 0: info debt_none, berhenti (tidak cek dsr/payoff)', () => {
  const Debt = makeDebt();
  const DebtStrategy = makeDebtStrategy({ activeDebts: () => [] });
  const { DebtOptimizerAPI } = makeCtx({ Debt, DebtStrategy });
  const r = DebtOptimizerAPI.debtRecommendation();
  assert.equal(r.length, 1);
  assert.equal(r[0].code, 'debt_none');
});

test('debtRecommendation() — pct>35: warning debt_dsr_high', () => {
  const Debt = makeDebt();
  const DebtStrategy = makeDebtStrategy({ computeDSR: () => ({ incAvg: 5000000, pct: 40, totalCicilan: 2000000 }) });
  const { DebtOptimizerAPI } = makeCtx({ Debt, DebtStrategy });
  const r = DebtOptimizerAPI.debtRecommendation();
  const item = r.find((x) => x.code === 'debt_dsr_high');
  assert.ok(item);
  assert.equal(item.type, 'warning');
});

test('debtRecommendation() — pct 30<x<=35: info debt_dsr_watch', () => {
  const Debt = makeDebt();
  const DebtStrategy = makeDebtStrategy({ computeDSR: () => ({ incAvg: 5000000, pct: 33, totalCicilan: 1650000 }) });
  const { DebtOptimizerAPI } = makeCtx({ Debt, DebtStrategy });
  const r = DebtOptimizerAPI.debtRecommendation();
  const item = r.find((x) => x.code === 'debt_dsr_watch');
  assert.ok(item);
  assert.equal(item.type, 'info');
});

test('debtRecommendation() — pct<=30: positive debt_dsr_safe', () => {
  const Debt = makeDebt();
  const DebtStrategy = makeDebtStrategy({ computeDSR: () => ({ incAvg: 5000000, pct: 20, totalCicilan: 1000000 }) });
  const { DebtOptimizerAPI } = makeCtx({ Debt, DebtStrategy });
  const r = DebtOptimizerAPI.debtRecommendation();
  const item = r.find((x) => x.code === 'debt_dsr_safe');
  assert.ok(item);
  assert.equal(item.type, 'positive');
});

test('debtRecommendation() — incAvg<=0: dsr rules TIDAK muncul (tidak crash)', () => {
  const Debt = makeDebt();
  const DebtStrategy = makeDebtStrategy({ computeDSR: () => ({ incAvg: 0, pct: null, totalCicilan: 1500000 }) });
  const { DebtOptimizerAPI } = makeCtx({ Debt, DebtStrategy });
  const r = DebtOptimizerAPI.debtRecommendation();
  assert.equal(r.some((x) => x.code === 'debt_dsr_high' || x.code === 'debt_dsr_watch' || x.code === 'debt_dsr_safe'), false);
});

test('debtRecommendation() — payoffPlan.simulation.months tersedia: info debt_payoff_estimate', () => {
  const Debt = makeDebt();
  const DebtStrategy = makeDebtStrategy();
  const D = { debtStrategy: { method: 'avalanche', extra: 0 } };
  const { DebtOptimizerAPI } = makeCtx({ Debt, DebtStrategy, D });
  const r = DebtOptimizerAPI.debtRecommendation();
  const item = r.find((x) => x.code === 'debt_payoff_estimate');
  assert.ok(item);
  assert.match(item.message, /8 bulan/);
});

// ================= summary =================

test('summary() — ok true kalau debtOverview ok, gabungan field sesuai', () => {
  const Debt = makeDebt();
  const DebtStrategy = makeDebtStrategy();
  const D = { debtStrategy: { method: 'avalanche', extra: 0 } };
  const { DebtOptimizerAPI } = makeCtx({ Debt, DebtStrategy, D });
  const r = DebtOptimizerAPI.summary();
  assert.equal(r.ok, true);
  assert.equal(r.debtOverview.activeCount, 1);
  assert.equal(r.dsr.ok, true);
  assert.equal(r.payoffPlan.ok, true);
  assert.ok(Array.isArray(r.recommendation));
});

test('summary() — Debt/DebtStrategy belum dimuat: ok false, recommendation array kosong', () => {
  const { DebtOptimizerAPI } = makeCtx({ Debt: undefined, DebtStrategy: undefined });
  const r = DebtOptimizerAPI.summary();
  assert.equal(r.ok, false);
  assert.equal(r.recommendation.length, 0);
});
