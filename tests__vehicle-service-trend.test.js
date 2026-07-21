'use strict';
// tests/vehicle-service-trend.test.js — VehicleServiceTrendSummary
// (modules/vehicle/vehicle-service-trend.js). Sesi 81 (Batch 7) — Vehicle
// Analytics Foundation: summary() (trend biaya servis bulanan + daftar
// reminder servis aktif apa adanya dari VehicleReminder). Pola sama
// persis tests/vehicle-ai-hook.test.js — dependency (VehicleTrendAPI,
// VehicleReminder) di-mock lewat loadSource extraGlobals (isolasi murni).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts = {}) {
  return loadSource(['modules/vehicle/vehicle-service-trend.js'], {
    VehicleTrendAPI: opts.VehicleTrendAPI,
    VehicleReminder: opts.VehicleReminder,
  }, ['VehicleServiceTrendSummary']);
}

function trend(overrides = {}) {
  return Object.assign({
    ok: true,
    type: 'service',
    months: 6,
    vehicleId: null,
    rows: [{ month: '2026-07', label: 'Jul 2026', fuel: 0, service: 200000, total: 200000 }],
    total: 200000,
  }, overrides);
}

function reminders() {
  return [
    { type: 'service', vehicleId: 'veh_1', vehicleName: 'Motor A', severity: 'overdue', categoryName: 'Oli', sisaKm: -100, message: 'x' },
    { type: 'service', vehicleId: 'veh_1', vehicleName: 'Motor A', severity: 'due-soon', categoryName: 'Ban', sisaKm: 50, message: 'y' },
    { type: 'service', vehicleId: 'veh_1', vehicleName: 'Motor A', severity: 'due-soon', categoryName: 'Rem', sisaKm: 60, message: 'z' },
  ];
}

test('vehicle-service-trend.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('summary() — VehicleTrendAPI belum dimuat: {ok:false}, tidak throw', () => {
  const { VehicleServiceTrendSummary } = makeCtx({ VehicleTrendAPI: undefined, VehicleReminder: {} });
  const result = VehicleServiceTrendSummary.summary();
  assert.equal(result.ok, false);
  assert.match(result.reason, /VehicleTrendAPI belum dimuat/);
});

test('summary() — VehicleReminder belum dimuat: {ok:false}, tidak throw', () => {
  const VehicleTrendAPI = { monthlyCostTrend: () => trend() };
  const { VehicleServiceTrendSummary } = makeCtx({ VehicleTrendAPI, VehicleReminder: undefined });
  const result = VehicleServiceTrendSummary.summary();
  assert.equal(result.ok, false);
  assert.match(result.reason, /VehicleReminder belum dimuat/);
});

test('summary() — reuse 100% VehicleTrendAPI.monthlyCostTrend(type:"service") + VehicleReminder.serviceReminders() apa adanya', () => {
  const t = trend();
  const r = reminders();
  const VehicleTrendAPI = { monthlyCostTrend: (args) => { assert.equal(args.type, 'service'); return t; } };
  const VehicleReminder = { serviceReminders: (vehicleId) => { assert.equal(vehicleId, undefined); return r; } };
  const { VehicleServiceTrendSummary } = makeCtx({ VehicleTrendAPI, VehicleReminder });
  const result = VehicleServiceTrendSummary.summary();
  assert.equal(result.ok, true);
  assert.equal(result.rows, t.rows);
  assert.equal(result.reminders, r);
});

test('summary() — vehicleId diteruskan apa adanya ke VehicleTrendAPI & VehicleReminder', () => {
  const VehicleTrendAPI = { monthlyCostTrend: (args) => { assert.equal(args.vehicleId, 'veh_1'); return trend({ vehicleId: 'veh_1' }); } };
  const VehicleReminder = { serviceReminders: (vehicleId) => { assert.equal(vehicleId, 'veh_1'); return reminders(); } };
  const { VehicleServiceTrendSummary } = makeCtx({ VehicleTrendAPI, VehicleReminder });
  const result = VehicleServiceTrendSummary.summary('veh_1');
  assert.equal(result.vehicleId, 'veh_1');
});

test('summary() — overdueCount/dueSoonCount dihitung dari severity reminders() apa adanya, 0 ambang baru', () => {
  const VehicleTrendAPI = { monthlyCostTrend: () => trend() };
  const VehicleReminder = { serviceReminders: () => reminders() };
  const { VehicleServiceTrendSummary } = makeCtx({ VehicleTrendAPI, VehicleReminder });
  const result = VehicleServiceTrendSummary.summary();
  assert.equal(result.overdueCount, 1);
  assert.equal(result.dueSoonCount, 2);
});

test('summary() — reminders kosong => overdueCount/dueSoonCount 0, tidak error', () => {
  const VehicleTrendAPI = { monthlyCostTrend: () => trend({ rows: [], total: 0 }) };
  const VehicleReminder = { serviceReminders: () => [] };
  const { VehicleServiceTrendSummary } = makeCtx({ VehicleTrendAPI, VehicleReminder });
  const result = VehicleServiceTrendSummary.summary();
  assert.equal(result.overdueCount, 0);
  assert.equal(result.dueSoonCount, 0);
  assert.equal(result.total, 0);
});
