'use strict';
// tests/vehicle-ai-hook.test.js — VehicleAIHook (modules/vehicle/
// vehicle-ai-hook.js). Sesi 79 (Batch 7) — Vehicle AI Hook Foundation:
// Fleet Summary API (fleetSummary()) & Vehicle Insight API
// (vehicleInsight(vehicleId)), gabungan VehicleIntelligence.summary() (Sesi
// 76) + VehicleReminder.summary() (Sesi 78). Pola sama persis tests/
// vehicle-intelligence.test.js — dependency di-mock lewat loadSource
// extraGlobals (isolasi murni).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts = {}) {
  return loadSource(['modules/vehicle/vehicle-ai-hook.js'], {
    VehicleIntelligence: opts.VehicleIntelligence,
    VehicleReminder: opts.VehicleReminder,
  }, ['VehicleAIHook']);
}

function intelligenceSummary(overrides = {}) {
  return Object.assign({
    fleet: { totalVehicles: 2, totalOverdue: 1, avgHealth: 75, vehicles: [] },
    insights: [{ type: 'info', code: 'fleet_health', message: 'x' }],
  }, overrides);
}

function reminderSummary(overrides = {}) {
  return Object.assign({
    total: 3,
    overdueCount: 1,
    dueSoonCount: 2,
    infoCount: 0,
    service: [],
    tax: [],
    fuel: [],
    all: [],
  }, overrides);
}

test('vehicle-ai-hook.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

// ================= fleetSummary() =================

test('fleetSummary() — VehicleIntelligence belum dimuat: {ok:false}, tidak throw', () => {
  const { VehicleAIHook } = makeCtx({ VehicleIntelligence: undefined, VehicleReminder: {} });
  const hook = VehicleAIHook.fleetSummary();
  assert.equal(hook.ok, false);
  assert.match(hook.reason, /VehicleIntelligence belum dimuat/);
});

test('fleetSummary() — VehicleReminder belum dimuat: {ok:false}, tidak throw', () => {
  const VehicleIntelligence = { summary: () => intelligenceSummary() };
  const { VehicleAIHook } = makeCtx({ VehicleIntelligence, VehicleReminder: undefined });
  const hook = VehicleAIHook.fleetSummary();
  assert.equal(hook.ok, false);
  assert.match(hook.reason, /VehicleReminder belum dimuat/);
});

test('fleetSummary() — reuse 100% VehicleIntelligence.summary() + VehicleReminder.summary() (fleet-level, tanpa vehicleId), 0 transformasi', () => {
  const is = intelligenceSummary();
  const rs = reminderSummary();
  const VehicleIntelligence = { summary: (vehicleId) => { assert.equal(vehicleId, undefined); return is; } };
  const VehicleReminder = { summary: (vehicleId) => { assert.equal(vehicleId, undefined); return rs; } };
  const { VehicleAIHook } = makeCtx({ VehicleIntelligence, VehicleReminder });
  const hook = VehicleAIHook.fleetSummary();
  assert.equal(hook.ok, true);
  assert.equal(hook.intelligence, is);
  assert.equal(hook.reminder, rs);
});

// ================= vehicleInsight() =================

test('vehicleInsight() — VehicleIntelligence belum dimuat: {ok:false}, tidak throw', () => {
  const { VehicleAIHook } = makeCtx({ VehicleIntelligence: undefined, VehicleReminder: {} });
  const hook = VehicleAIHook.vehicleInsight('veh_1');
  assert.equal(hook.ok, false);
  assert.match(hook.reason, /VehicleIntelligence belum dimuat/);
});

test('vehicleInsight() — VehicleReminder belum dimuat: {ok:false}, tidak throw', () => {
  const VehicleIntelligence = { summary: () => intelligenceSummary({ vehicle: { ok: true } }) };
  const { VehicleAIHook } = makeCtx({ VehicleIntelligence, VehicleReminder: undefined });
  const hook = VehicleAIHook.vehicleInsight('veh_1');
  assert.equal(hook.ok, false);
  assert.match(hook.reason, /VehicleReminder belum dimuat/);
});

test('vehicleInsight() — kendaraan tidak ditemukan: reuse {ok:false} dari VehicleIntelligence.summary(id).vehicle apa adanya', () => {
  const VehicleIntelligence = { summary: () => intelligenceSummary({ vehicle: { ok: false, reason: 'Kendaraan tidak ditemukan' } }) };
  const VehicleReminder = { summary: () => reminderSummary() };
  const { VehicleAIHook } = makeCtx({ VehicleIntelligence, VehicleReminder });
  const hook = VehicleAIHook.vehicleInsight('veh_x');
  assert.equal(hook.ok, false);
  assert.equal(hook.reason, 'Kendaraan tidak ditemukan');
});

test('vehicleInsight() — reuse 100% VehicleIntelligence.summary(id) + VehicleReminder.summary(id), 0 transformasi', () => {
  const is = intelligenceSummary({ vehicle: { ok: true, name: 'Motor A' } });
  const rs = reminderSummary();
  const VehicleIntelligence = { summary: (vehicleId) => { assert.equal(vehicleId, 'veh_1'); return is; } };
  const VehicleReminder = { summary: (vehicleId) => { assert.equal(vehicleId, 'veh_1'); return rs; } };
  const { VehicleAIHook } = makeCtx({ VehicleIntelligence, VehicleReminder });
  const hook = VehicleAIHook.vehicleInsight('veh_1');
  assert.equal(hook.ok, true);
  assert.equal(hook.vehicleId, 'veh_1');
  assert.equal(hook.intelligence, is);
  assert.equal(hook.reminder, rs);
});
