'use strict';
// tests/cross-summary-api.test.js — CrossSummaryAPI (modules/cross/
// finance-vehicle-cross-summary.js). Sesi 87 (Batch 8) — Finance & Vehicle
// Cross Integration Foundation: Cross Summary API, gabungan
// FinanceDashboard.getAIHook() + VehicleAIHook.fleetSummary(). Pola sama
// persis tests/vehicle-ai-hook.test.js — dependency di-mock lewat
// loadSource extraGlobals (isolasi murni).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts = {}) {
  return loadSource(['modules/cross/finance-vehicle-cross-summary.js'], {
    FinanceDashboard: opts.FinanceDashboard,
    VehicleAIHook: opts.VehicleAIHook,
  }, ['CrossSummaryAPI']);
}

function financeHook(overrides = {}) {
  return Object.assign({
    ok: true,
    cashflow: { ok: true, projected: 100, currentMonth: { net: 50 } },
    budget: { ok: true, totalLimit: 1000, totalUsed: 200, overallPct: 0.2, overCount: 0 },
    incomeVsExpense: { income: 500, expense: 300, net: 200, savingsRate: 0.4 },
    healthScore: { score: 82, label: 'Sehat', parts: [] },
    insights: [{ type: 'info', code: 'health_score', message: 'x' }],
  }, overrides);
}

function vehicleFleetHook(overrides = {}) {
  return Object.assign({
    ok: true,
    intelligence: { fleet: { totalVehicles: 2, totalOverdue: 1, avgHealth: 75, vehicles: [] }, insights: [] },
    reminder: { total: 3, overdueCount: 1, dueSoonCount: 2, infoCount: 0, service: [], tax: [], fuel: [], all: [] },
  }, overrides);
}

test('cross-summary-api.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('summary() — FinanceDashboard belum dimuat: {ok:false}, tidak throw', () => {
  const { CrossSummaryAPI } = makeCtx({ FinanceDashboard: undefined, VehicleAIHook: {} });
  const s = CrossSummaryAPI.summary();
  assert.equal(s.ok, false);
  assert.match(s.reason, /FinanceDashboard belum dimuat/);
});

test('summary() — VehicleAIHook belum dimuat: {ok:false}, tidak throw', () => {
  const FinanceDashboard = { getAIHook: () => financeHook() };
  const { CrossSummaryAPI } = makeCtx({ FinanceDashboard, VehicleAIHook: undefined });
  const s = CrossSummaryAPI.summary();
  assert.equal(s.ok, false);
  assert.match(s.reason, /VehicleAIHook belum dimuat/);
});

test('summary() — reuse 100% FinanceDashboard.getAIHook() + VehicleAIHook.fleetSummary(), 0 transformasi', () => {
  const fh = financeHook();
  const vh = vehicleFleetHook();
  const FinanceDashboard = { getAIHook: () => fh };
  const VehicleAIHook = { fleetSummary: () => vh };
  const { CrossSummaryAPI } = makeCtx({ FinanceDashboard, VehicleAIHook });
  const s = CrossSummaryAPI.summary();
  assert.equal(s.ok, true);
  assert.equal(s.finance, fh);
  assert.equal(s.vehicle, vh);
});

test('summary() — VehicleAIHook.fleetSummary() dipanggil TANPA parameter (fleet-level)', () => {
  const FinanceDashboard = { getAIHook: () => financeHook() };
  const VehicleAIHook = { fleetSummary: (...args) => { assert.equal(args.length, 0); return vehicleFleetHook(); } };
  const { CrossSummaryAPI } = makeCtx({ FinanceDashboard, VehicleAIHook });
  assert.doesNotThrow(() => CrossSummaryAPI.summary());
});
