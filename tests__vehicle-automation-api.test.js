'use strict';
// tests/vehicle-automation-api.test.js — VehicleAutomationAPI (modules/
// vehicle/vehicle-automation-api.js). Sesi 83 (Batch 7) — Vehicle
// Automation Foundation: titik masuk tunggal `context(vehicleId?)`, 100%
// reuse VehicleRecommendationEngine.recommendations() ->
// VehiclePriorityScoring.rank() -> VehicleActionRecommendation.
// withAction() (pipeline Decision Engine Sesi 82). Pola sama persis
// tests/vehicle-decision-api.test.js — dependency di-mock lewat
// loadSource extraGlobals (isolasi murni).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts = {}) {
  return loadSource(['modules/vehicle/vehicle-automation-api.js'], {
    VehicleRecommendationEngine: opts.VehicleRecommendationEngine,
    VehiclePriorityScoring: opts.VehiclePriorityScoring,
    VehicleActionRecommendation: opts.VehicleActionRecommendation,
  }, ['VehicleAutomationAPI']);
}

function rec(overrides = {}) {
  return Object.assign({
    id: 'r1', source: 'reminder', type: 'service', vehicleId: 'veh_1',
    vehicleName: 'Motor A', severity: 'overdue', message: 'x',
  }, overrides);
}

test('vehicle-automation-api.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('context() — VehicleRecommendationEngine belum dimuat: {ok:false}, tidak throw', () => {
  const { VehicleAutomationAPI } = makeCtx({ VehicleRecommendationEngine: undefined });
  const ctx = VehicleAutomationAPI.context();
  assert.equal(ctx.ok, false);
  assert.match(ctx.reason, /Vehicle Decision Engine belum dimuat/);
});

test('context() — VehiclePriorityScoring belum dimuat: {ok:false}, tidak throw', () => {
  const VehicleRecommendationEngine = { recommendations: () => [] };
  const { VehicleAutomationAPI } = makeCtx({ VehicleRecommendationEngine, VehiclePriorityScoring: undefined });
  assert.equal(VehicleAutomationAPI.context().ok, false);
});

test('context() — VehicleActionRecommendation belum dimuat: {ok:false}, tidak throw', () => {
  const VehicleRecommendationEngine = { recommendations: () => [] };
  const VehiclePriorityScoring = { rank: (r) => r };
  const { VehicleAutomationAPI } = makeCtx({ VehicleRecommendationEngine, VehiclePriorityScoring, VehicleActionRecommendation: undefined });
  assert.equal(VehicleAutomationAPI.context().ok, false);
});

test('context() — tanpa vehicleId: pipeline recommendations()->rank()->withAction() dijalankan berurutan, 0 transformasi', () => {
  const recs = [rec()];
  let rankCalled = false;
  const VehicleRecommendationEngine = { recommendations: (id) => { assert.equal(id, undefined); return recs; } };
  const VehiclePriorityScoring = {
    rank: (r) => { rankCalled = true; assert.equal(r, recs); return r.map((x) => ({ ...x, priorityScore: 100 })); },
  };
  const VehicleActionRecommendation = {
    withAction: (r) => { assert.equal(rankCalled, true); return r.map((x) => ({ ...x, action: { label: 'aksi' } })); },
  };
  const { VehicleAutomationAPI } = makeCtx({ VehicleRecommendationEngine, VehiclePriorityScoring, VehicleActionRecommendation });
  const ctx = VehicleAutomationAPI.context();
  assert.equal(ctx.ok, true);
  assert.equal(ctx.vehicleId, null);
  assert.equal(ctx.items.length, 1);
  assert.equal(ctx.items[0].priorityScore, 100);
  assert.equal(ctx.items[0].action.label, 'aksi');
});

test('context(vehicleId) — vehicleId diteruskan ke recommendations(), tersimpan di ctx.vehicleId', () => {
  const VehicleRecommendationEngine = { recommendations: (id) => { assert.equal(id, 'veh_1'); return []; } };
  const VehiclePriorityScoring = { rank: (r) => r };
  const VehicleActionRecommendation = { withAction: (r) => r };
  const { VehicleAutomationAPI } = makeCtx({ VehicleRecommendationEngine, VehiclePriorityScoring, VehicleActionRecommendation });
  const ctx = VehicleAutomationAPI.context('veh_1');
  assert.equal(ctx.ok, true);
  assert.equal(ctx.vehicleId, 'veh_1');
  assert.equal(ctx.items.length, 0);
});
