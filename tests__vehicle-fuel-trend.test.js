'use strict';
// tests/vehicle-fuel-trend.test.js — VehicleFuelTrendSummary (modules/
// vehicle/vehicle-fuel-trend.js). Sesi 81 (Batch 7) — Vehicle Analytics
// Foundation: summary() (trend biaya BBM bulanan + efisiensi BBM saat ini
// apa adanya dari VehicleIntelligence). Pola sama persis tests/vehicle-
// ai-hook.test.js — dependency (VehicleTrendAPI, VehicleIntelligence)
// di-mock lewat loadSource extraGlobals (isolasi murni).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts = {}) {
  return loadSource(['modules/vehicle/vehicle-fuel-trend.js'], {
    VehicleTrendAPI: opts.VehicleTrendAPI,
    VehicleIntelligence: opts.VehicleIntelligence,
  }, ['VehicleFuelTrendSummary']);
}

function trend(overrides = {}) {
  return Object.assign({
    ok: true,
    type: 'fuel',
    months: 6,
    vehicleId: null,
    rows: [{ month: '2026-07', label: 'Jul 2026', fuel: 150000, service: 0, total: 150000 }],
    total: 150000,
  }, overrides);
}

test('vehicle-fuel-trend.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('summary() — VehicleTrendAPI belum dimuat: {ok:false}, tidak throw', () => {
  const { VehicleFuelTrendSummary } = makeCtx({ VehicleTrendAPI: undefined });
  const result = VehicleFuelTrendSummary.summary('veh_1');
  assert.equal(result.ok, false);
  assert.match(result.reason, /VehicleTrendAPI belum dimuat/);
});

test('summary() — reuse 100% VehicleTrendAPI.monthlyCostTrend(type:"fuel") apa adanya', () => {
  const t = trend();
  const VehicleTrendAPI = {
    monthlyCostTrend: (args) => {
      assert.equal(args.type, 'fuel');
      return t;
    },
  };
  const { VehicleFuelTrendSummary } = makeCtx({ VehicleTrendAPI });
  const result = VehicleFuelTrendSummary.summary();
  assert.equal(result.ok, true);
  assert.equal(result.rows, t.rows);
  assert.equal(result.total, 150000);
});

test('summary() — tanpa vehicleId: current tetap null (bukan {ok:false} palsu, fuelEfficiency per-desain per-kendaraan)', () => {
  const VehicleTrendAPI = { monthlyCostTrend: () => trend() };
  const { VehicleFuelTrendSummary } = makeCtx({ VehicleTrendAPI });
  const result = VehicleFuelTrendSummary.summary();
  assert.equal(result.current, null);
});

test('summary() — dengan vehicleId: current = reuse 100% VehicleIntelligence.vehicleOverview(id).fuel apa adanya', () => {
  const fuel = { ok: true, vehicleId: 'veh_1', kmPerLiter: 40, rpPerKm: 250, estMonthlyCost: 300000 };
  const VehicleTrendAPI = { monthlyCostTrend: (args) => { assert.equal(args.vehicleId, 'veh_1'); return trend({ vehicleId: 'veh_1' }); } };
  const VehicleIntelligence = { vehicleOverview: (id) => { assert.equal(id, 'veh_1'); return { ok: true, name: 'Motor A', fuel }; } };
  const { VehicleFuelTrendSummary } = makeCtx({ VehicleTrendAPI, VehicleIntelligence });
  const result = VehicleFuelTrendSummary.summary('veh_1');
  assert.equal(result.current, fuel);
});

test('summary() — vehicleId diberikan tapi VehicleIntelligence belum dimuat: current {ok:false}, trend BBM tetap dikembalikan', () => {
  const VehicleTrendAPI = { monthlyCostTrend: () => trend({ vehicleId: 'veh_1' }) };
  const { VehicleFuelTrendSummary } = makeCtx({ VehicleTrendAPI, VehicleIntelligence: undefined });
  const result = VehicleFuelTrendSummary.summary('veh_1');
  assert.equal(result.ok, true);
  assert.equal(result.current.ok, false);
  assert.match(result.current.reason, /VehicleIntelligence belum dimuat/);
  assert.equal(result.total, 150000);
});

test('summary() — kendaraan tidak ditemukan: current reuse {ok:false} vehicleOverview() apa adanya', () => {
  const VehicleTrendAPI = { monthlyCostTrend: () => trend({ vehicleId: 'veh_x' }) };
  const VehicleIntelligence = { vehicleOverview: () => ({ ok: false, reason: 'Kendaraan tidak ditemukan' }) };
  const { VehicleFuelTrendSummary } = makeCtx({ VehicleTrendAPI, VehicleIntelligence });
  const result = VehicleFuelTrendSummary.summary('veh_x');
  assert.equal(result.current.ok, false);
  assert.equal(result.current.reason, 'Kendaraan tidak ditemukan');
});
