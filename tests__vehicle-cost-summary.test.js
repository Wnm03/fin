'use strict';
// tests/vehicle-cost-summary.test.js — VehicleCostSummary (modules/vehicle/
// vehicle-cost-summary.js). Sesi 81 (Batch 7) — Vehicle Analytics
// Foundation: summary() (total/rata-rata/arah tren biaya kendaraan,
// gabungan BBM+servis). Pola sama persis tests/vehicle-ai-hook.test.js —
// dependency (VehicleTrendAPI) di-mock lewat loadSource extraGlobals
// (isolasi murni).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts = {}) {
  return loadSource(['modules/vehicle/vehicle-cost-summary.js'], {
    VehicleTrendAPI: opts.VehicleTrendAPI,
  }, ['VehicleCostSummary']);
}

function trend(overrides = {}) {
  return Object.assign({
    ok: true,
    type: 'all',
    months: 3,
    vehicleId: null,
    rows: [
      { month: '2026-05', label: 'Mei 2026', fuel: 100000, service: 0, total: 100000 },
      { month: '2026-06', label: 'Jun 2026', fuel: 100000, service: 200000, total: 300000 },
      { month: '2026-07', label: 'Jul 2026', fuel: 150000, service: 0, total: 150000 },
    ],
    total: 550000,
  }, overrides);
}

test('vehicle-cost-summary.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('summary() — VehicleTrendAPI belum dimuat: {ok:false}, tidak throw', () => {
  const { VehicleCostSummary } = makeCtx({ VehicleTrendAPI: undefined });
  const result = VehicleCostSummary.summary();
  assert.equal(result.ok, false);
  assert.match(result.reason, /VehicleTrendAPI belum dimuat/);
});

test('summary() — reuse 100% VehicleTrendAPI.monthlyCostTrend(type:"all") apa adanya, 0 recompute SUM per bulan', () => {
  const t = trend();
  const VehicleTrendAPI = {
    monthlyCostTrend: (args) => {
      assert.equal(args.type, 'all');
      assert.equal(args.vehicleId, undefined);
      assert.equal(args.months, 6);
      return t;
    },
  };
  const { VehicleCostSummary } = makeCtx({ VehicleTrendAPI });
  const result = VehicleCostSummary.summary();
  assert.equal(result.ok, true);
  assert.equal(result.rows, t.rows);
  assert.equal(result.total, 550000);
});

test('summary() — vehicleId & months diteruskan apa adanya ke VehicleTrendAPI', () => {
  const t = trend({ vehicleId: 'veh_1', months: 2, rows: trend().rows.slice(0, 2) });
  const VehicleTrendAPI = {
    monthlyCostTrend: (args) => {
      assert.equal(args.vehicleId, 'veh_1');
      assert.equal(args.months, 2);
      return t;
    },
  };
  const { VehicleCostSummary } = makeCtx({ VehicleTrendAPI });
  const result = VehicleCostSummary.summary('veh_1', 2);
  assert.equal(result.vehicleId, 'veh_1');
});

test('summary() — avgPerMonth = total / jumlah baris rows', () => {
  const VehicleTrendAPI = { monthlyCostTrend: () => trend() };
  const { VehicleCostSummary } = makeCtx({ VehicleTrendAPI });
  const result = VehicleCostSummary.summary();
  assert.equal(result.avgPerMonth, 550000 / 3);
});

test('summary() — avgPerMonth 0 kalau rows kosong (months=0 edge-case), tidak NaN', () => {
  const VehicleTrendAPI = { monthlyCostTrend: () => trend({ rows: [], total: 0, months: 0 }) };
  const { VehicleCostSummary } = makeCtx({ VehicleTrendAPI });
  const result = VehicleCostSummary.summary();
  assert.equal(result.avgPerMonth, 0);
  assert.equal(result.direction, 'flat');
  assert.equal(result.lastMonth, null);
  assert.equal(result.prevMonth, null);
});

test('summary() — direction "up" kalau bulan terakhir > bulan sebelumnya', () => {
  const VehicleTrendAPI = { monthlyCostTrend: () => trend() }; // 300000 -> 150000 turun, jadi test lain
  const { VehicleCostSummary } = makeCtx({ VehicleTrendAPI });
  const result = VehicleCostSummary.summary();
  // rows terakhir: Jun 300000, Jul 150000 => turun
  assert.equal(result.direction, 'down');
  assert.equal(result.lastMonth.month, '2026-07');
  assert.equal(result.prevMonth.month, '2026-06');
});

test('summary() — direction "up" eksplisit kalau bulan terakhir naik dari sebelumnya', () => {
  const t = trend({
    rows: [
      { month: '2026-06', label: 'Jun 2026', fuel: 50000, service: 0, total: 50000 },
      { month: '2026-07', label: 'Jul 2026', fuel: 200000, service: 0, total: 200000 },
    ],
    total: 250000,
  });
  const VehicleTrendAPI = { monthlyCostTrend: () => t };
  const { VehicleCostSummary } = makeCtx({ VehicleTrendAPI });
  const result = VehicleCostSummary.summary();
  assert.equal(result.direction, 'up');
});

test('summary() — direction "flat" kalau bulan terakhir sama dgn sebelumnya', () => {
  const t = trend({
    rows: [
      { month: '2026-06', label: 'Jun 2026', fuel: 50000, service: 0, total: 50000 },
      { month: '2026-07', label: 'Jul 2026', fuel: 50000, service: 0, total: 50000 },
    ],
    total: 100000,
  });
  const VehicleTrendAPI = { monthlyCostTrend: () => t };
  const { VehicleCostSummary } = makeCtx({ VehicleTrendAPI });
  const result = VehicleCostSummary.summary();
  assert.equal(result.direction, 'flat');
});

test('summary() — direction "flat" kalau cuma 1 baris (tidak ada bulan sebelumnya utk dibandingkan)', () => {
  const t = trend({ rows: [{ month: '2026-07', label: 'Jul 2026', fuel: 50000, service: 0, total: 50000 }], total: 50000 });
  const VehicleTrendAPI = { monthlyCostTrend: () => t };
  const { VehicleCostSummary } = makeCtx({ VehicleTrendAPI });
  const result = VehicleCostSummary.summary();
  assert.equal(result.direction, 'flat');
  assert.equal(result.prevMonth, null);
});

test('summary() — totalFuel/totalService breakdown = SUM field fuel/service tiap rows apa adanya', () => {
  const VehicleTrendAPI = { monthlyCostTrend: () => trend() };
  const { VehicleCostSummary } = makeCtx({ VehicleTrendAPI });
  const result = VehicleCostSummary.summary();
  assert.equal(result.totalFuel, 100000 + 100000 + 150000);
  assert.equal(result.totalService, 0 + 200000 + 0);
});
