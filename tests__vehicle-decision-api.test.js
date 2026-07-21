'use strict';
// tests/vehicle-decision-api.test.js — VehicleDecisionAPI (modules/
// vehicle/vehicle-decision-api.js). Sesi 82 (Batch 7) — Vehicle Decision
// Engine Foundation: titik masuk tunggal `context(vehicleId?)`, 100%
// reuse VehicleAIHook.fleetSummary()/vehicleInsight(vehicleId). Pola sama
// persis tests/vehicle-ai-hook.test.js — dependency di-mock lewat
// loadSource extraGlobals (isolasi murni).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts = {}) {
  return loadSource(['modules/vehicle/vehicle-decision-api.js'], {
    VehicleAIHook: opts.VehicleAIHook,
  }, ['VehicleDecisionAPI']);
}

function hookOk(overrides = {}) {
  return Object.assign({
    ok: true,
    intelligence: { fleet: { totalVehicles: 2 }, insights: [] },
    reminder: { total: 0, overdueCount: 0, dueSoonCount: 0, infoCount: 0, service: [], tax: [], fuel: [], all: [] },
  }, overrides);
}

test('vehicle-decision-api.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('context() — VehicleAIHook belum dimuat: {ok:false}, tidak throw', () => {
  const { VehicleDecisionAPI } = makeCtx({ VehicleAIHook: undefined });
  const ctx = VehicleDecisionAPI.context();
  assert.equal(ctx.ok, false);
  assert.match(ctx.reason, /VehicleAIHook belum dimuat/);
});

test('context() — tanpa vehicleId: reuse VehicleAIHook.fleetSummary(), 0 transformasi', () => {
  const hook = hookOk();
  const VehicleAIHook = {
    fleetSummary: () => hook,
    vehicleInsight: () => { throw new Error('tidak boleh dipanggil tanpa vehicleId'); },
  };
  const { VehicleDecisionAPI } = makeCtx({ VehicleAIHook });
  const ctx = VehicleDecisionAPI.context();
  assert.equal(ctx.ok, true);
  assert.equal(ctx.vehicleId, null);
  assert.equal(ctx.intelligence, hook.intelligence);
  assert.equal(ctx.reminder, hook.reminder);
});

test('context(vehicleId) — reuse VehicleAIHook.vehicleInsight(vehicleId), 0 transformasi', () => {
  const hook = hookOk();
  const VehicleAIHook = {
    fleetSummary: () => { throw new Error('tidak boleh dipanggil dgn vehicleId'); },
    vehicleInsight: (id) => { assert.equal(id, 'veh_1'); return hook; },
  };
  const { VehicleDecisionAPI } = makeCtx({ VehicleAIHook });
  const ctx = VehicleDecisionAPI.context('veh_1');
  assert.equal(ctx.ok, true);
  assert.equal(ctx.vehicleId, 'veh_1');
  assert.equal(ctx.intelligence, hook.intelligence);
  assert.equal(ctx.reminder, hook.reminder);
});

test('context(vehicleId) — kendaraan tidak ditemukan: reuse {ok:false} dari VehicleAIHook.vehicleInsight() apa adanya', () => {
  const VehicleAIHook = { vehicleInsight: () => ({ ok: false, reason: 'Kendaraan tidak ditemukan' }) };
  const { VehicleDecisionAPI } = makeCtx({ VehicleAIHook });
  const ctx = VehicleDecisionAPI.context('veh_x');
  assert.equal(ctx.ok, false);
  assert.equal(ctx.reason, 'Kendaraan tidak ditemukan');
});
