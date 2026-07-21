'use strict';
// tests/financial-goal-api.test.js — FinancialGoalAPI (modules/finance/
// financial-goal-api.js). Sesi 94 (Batch 10) — Financial Goal Planner
// Foundation: Financial Goal, Goal Progress, Target Projection, Goal
// Recommendation, summary(). 100% reuse goalAdapterList(D) (lifeos/
// adapters/goal-adapter.js) + CashFlowProjectionAPI.summary() (Sesi 93).
// Pola sama persis tests/budget-recommendation-api.test.js — dependency
// di-mock lewat loadSource extraGlobals (isolasi murni).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts = {}) {
  const ctx = loadSource(['modules/finance/financial-goal-api.js'], {
    ...opts,
  }, ['FinancialGoalAPI']);
  return { FinancialGoalAPI: ctx.FinancialGoalAPI };
}

function goal(overrides = {}) {
  return Object.assign({
    id: 'target:1', sourceKind: 'target', sourceId: '1',
    name: 'Dana Darurat', emoji: '🚨',
    targetAmount: 10000000, currentAmount: 5000000,
    progressPct: 50, deadline: null, areaKey: 'finance',
  }, overrides);
}

function fullCashflowSummary(overrides = {}) {
  return Object.assign({
    ok: true,
    income: { ok: true, avgMonthly: 5000000, months: 3, currentMonthIncome: 5200000 },
    expense: { ok: true, avgMonthly: 3500000, months: 3, currentMonthExpense: 3600000 },
    cashBalance: { ok: true, saldoNow: 10000000, projected: 9750000, billsDue: 750000, upcomingCount: 2 },
  }, overrides);
}

test('financial-goal-api.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

// ================= _goals (via financialGoals) =================

test('financialGoals() — goalAdapterList belum dimuat: ok:false', () => {
  const { FinancialGoalAPI } = makeCtx({ goalAdapterList: undefined, D: {} });
  const r = FinancialGoalAPI.financialGoals();
  assert.equal(r.ok, false);
  assert.match(r.reason, /belum dimuat/);
});

test('financialGoals() — D belum ada: ok:false', () => {
  const { FinancialGoalAPI } = makeCtx({ goalAdapterList: () => [], D: undefined });
  const r = FinancialGoalAPI.financialGoals();
  assert.equal(r.ok, false);
  assert.match(r.reason, /D belum tersedia/);
});

test('financialGoals() — goalAdapterList(D) throw: ok:false, tidak menjatuhkan', () => {
  const goalAdapterList = () => { throw new Error('boom'); };
  const { FinancialGoalAPI } = makeCtx({ goalAdapterList, D: {} });
  assert.doesNotThrow(() => FinancialGoalAPI.financialGoals());
  const r = FinancialGoalAPI.financialGoals();
  assert.equal(r.ok, false);
});

test('financialGoals() — meneruskan goalAdapterList(D) apa adanya + count', () => {
  const goals = [goal(), goal({ id: 'target:2', progressPct: 100 })];
  const { FinancialGoalAPI } = makeCtx({ goalAdapterList: () => goals, D: {} });
  const r = FinancialGoalAPI.financialGoals();
  assert.equal(r.ok, true);
  assert.equal(r.count, 2);
  assert.deepEqual(r.goals, goals);
});

// ================= goalProgress =================

test('goalProgress() — goalAdapterList belum dimuat: ok:false diteruskan', () => {
  const { FinancialGoalAPI } = makeCtx({ goalAdapterList: undefined, D: {} });
  const r = FinancialGoalAPI.goalProgress();
  assert.equal(r.ok, false);
});

test('goalProgress() — mengelompokkan achieved/inProgress/notStarted + avgProgressPct', () => {
  const goals = [
    goal({ id: 'a', progressPct: 100 }),
    goal({ id: 'b', progressPct: 50 }),
    goal({ id: 'c', progressPct: 0 }),
  ];
  const { FinancialGoalAPI } = makeCtx({ goalAdapterList: () => goals, D: {} });
  const r = FinancialGoalAPI.goalProgress();
  assert.equal(r.ok, true);
  assert.equal(r.count, 3);
  assert.equal(r.achievedCount, 1);
  assert.equal(r.inProgressCount, 1);
  assert.equal(r.notStartedCount, 1);
  assert.equal(r.avgProgressPct, 50);
});

test('goalProgress() — list kosong: semua 0, avgProgressPct 0 (tidak NaN)', () => {
  const { FinancialGoalAPI } = makeCtx({ goalAdapterList: () => [], D: {} });
  const r = FinancialGoalAPI.goalProgress();
  assert.equal(r.ok, true);
  assert.equal(r.count, 0);
  assert.equal(r.avgProgressPct, 0);
});

// ================= targetProjection =================

test('targetProjection() — CashFlowProjectionAPI belum dimuat: ok:false', () => {
  const goals = [goal()];
  const { FinancialGoalAPI } = makeCtx({ goalAdapterList: () => goals, D: {}, CashFlowProjectionAPI: undefined });
  const r = FinancialGoalAPI.targetProjection();
  assert.equal(r.ok, false);
  assert.match(r.reason, /belum dimuat/);
});

test('targetProjection() — CashFlowProjectionAPI.summary() ok:false: diteruskan', () => {
  const goals = [goal()];
  const CashFlowProjectionAPI = { summary: () => ({ ok: false, reason: 'z' }) };
  const { FinancialGoalAPI } = makeCtx({ goalAdapterList: () => goals, D: {}, CashFlowProjectionAPI });
  const r = FinancialGoalAPI.targetProjection();
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'z');
});

test('targetProjection() — monthsNeeded = Math.ceil(remaining/surplus), surplus positif', () => {
  const goals = [goal({ targetAmount: 10000000, currentAmount: 5000000, progressPct: 50 })];
  const CashFlowProjectionAPI = { summary: () => fullCashflowSummary() }; // surplus = 5jt-3.5jt = 1.5jt
  const { FinancialGoalAPI } = makeCtx({ goalAdapterList: () => goals, D: {}, CashFlowProjectionAPI });
  const r = FinancialGoalAPI.targetProjection();
  assert.equal(r.ok, true);
  assert.equal(r.monthlySurplus, 1500000);
  assert.equal(r.projections.length, 1);
  assert.equal(r.projections[0].remaining, 5000000);
  assert.equal(r.projections[0].monthsNeeded, Math.ceil(5000000 / 1500000));
});

test('targetProjection() — surplus <=0: monthsNeeded null utk semua', () => {
  const goals = [goal()];
  const CashFlowProjectionAPI = {
    summary: () => fullCashflowSummary({
      income: { ok: true, avgMonthly: 3000000, months: 3, currentMonthIncome: 3000000 },
      expense: { ok: true, avgMonthly: 3500000, months: 3, currentMonthExpense: 3500000 },
    }),
  };
  const { FinancialGoalAPI } = makeCtx({ goalAdapterList: () => goals, D: {}, CashFlowProjectionAPI });
  const r = FinancialGoalAPI.targetProjection();
  assert.equal(r.ok, true);
  assert.equal(r.monthlySurplus, -500000);
  assert.equal(r.projections[0].monthsNeeded, null);
});

test('targetProjection() — goal progressPct 100 dilewati (tidak masuk projections)', () => {
  const goals = [goal({ progressPct: 100 })];
  const CashFlowProjectionAPI = { summary: () => fullCashflowSummary() };
  const { FinancialGoalAPI } = makeCtx({ goalAdapterList: () => goals, D: {}, CashFlowProjectionAPI });
  const r = FinancialGoalAPI.targetProjection();
  assert.equal(r.projections.length, 0);
});

test('targetProjection() — goal tanpa targetAmount (0/null) dilewati', () => {
  const goals = [goal({ targetAmount: null, currentAmount: null, progressPct: null })];
  const CashFlowProjectionAPI = { summary: () => fullCashflowSummary() };
  const { FinancialGoalAPI } = makeCtx({ goalAdapterList: () => goals, D: {}, CashFlowProjectionAPI });
  const r = FinancialGoalAPI.targetProjection();
  assert.equal(r.projections.length, 0);
});

// ================= goalRecommendation =================

test('goalRecommendation() — list kosong: array kosong', () => {
  const { FinancialGoalAPI } = makeCtx({ goalAdapterList: () => [], D: {} });
  const r = FinancialGoalAPI.goalRecommendation();
  assert.equal(Array.isArray(r) || r.length !== undefined, true);
  assert.equal(r.length, 0);
});

test('goalRecommendation() — surplus<=0 & ada goal belum tercapai: warning goal_no_surplus', () => {
  const goals = [goal({ progressPct: 50 })];
  const CashFlowProjectionAPI = {
    summary: () => fullCashflowSummary({
      income: { ok: true, avgMonthly: 1000000, months: 3, currentMonthIncome: 1000000 },
      expense: { ok: true, avgMonthly: 2000000, months: 3, currentMonthExpense: 2000000 },
    }),
  };
  const { FinancialGoalAPI } = makeCtx({ goalAdapterList: () => goals, D: {}, CashFlowProjectionAPI });
  const r = FinancialGoalAPI.goalRecommendation();
  assert.ok(r.some((x) => x.code === 'goal_no_surplus'));
});

test('goalRecommendation() — goal progress>=80% (<100%): positive goal_near_complete', () => {
  const goals = [goal({ name: 'Rumah', progressPct: 85 })];
  const CashFlowProjectionAPI = { summary: () => fullCashflowSummary() };
  const { FinancialGoalAPI } = makeCtx({ goalAdapterList: () => goals, D: {}, CashFlowProjectionAPI });
  const r = FinancialGoalAPI.goalRecommendation();
  const item = r.find((x) => x.code === 'goal_near_complete');
  assert.ok(item);
  assert.match(item.message, /Rumah/);
});

test('goalRecommendation() — goal progress 0%: info goal_not_started', () => {
  const goals = [goal({ name: 'Motor Baru', progressPct: 0 })];
  const CashFlowProjectionAPI = { summary: () => fullCashflowSummary() };
  const { FinancialGoalAPI } = makeCtx({ goalAdapterList: () => goals, D: {}, CashFlowProjectionAPI });
  const r = FinancialGoalAPI.goalRecommendation();
  const item = r.find((x) => x.code === 'goal_not_started');
  assert.ok(item);
  assert.match(item.message, /Motor Baru/);
});

test('goalRecommendation() — semua goal tercapai: positive goal_all_achieved', () => {
  const goals = [goal({ progressPct: 100 }), goal({ id: 'x2', progressPct: 100 })];
  const CashFlowProjectionAPI = { summary: () => fullCashflowSummary() };
  const { FinancialGoalAPI } = makeCtx({ goalAdapterList: () => goals, D: {}, CashFlowProjectionAPI });
  const r = FinancialGoalAPI.goalRecommendation();
  assert.ok(r.some((x) => x.code === 'goal_all_achieved'));
});

// ================= summary =================

test('summary() — ok true kalau goalProgress ok, gabungan field sesuai', () => {
  const goals = [goal()];
  const CashFlowProjectionAPI = { summary: () => fullCashflowSummary() };
  const { FinancialGoalAPI } = makeCtx({ goalAdapterList: () => goals, D: {}, CashFlowProjectionAPI });
  const r = FinancialGoalAPI.summary();
  assert.equal(r.ok, true);
  assert.equal(r.goalProgress.count, 1);
  assert.equal(r.targetProjection.ok, true);
  assert.ok(Array.isArray(r.recommendation));
});

test('summary() — goalAdapterList belum dimuat: ok false, recommendation array kosong', () => {
  const { FinancialGoalAPI } = makeCtx({ goalAdapterList: undefined, D: {} });
  const r = FinancialGoalAPI.summary();
  assert.equal(r.ok, false);
  assert.equal(r.recommendation.length, 0);
});
