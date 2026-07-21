'use strict';
// tests/vehicle-recommendation-engine.test.js — VehicleRecommendationEngine
// (modules/vehicle/vehicle-recommendation-engine.js). Sesi 82 (Batch 7) —
// Vehicle Decision Engine Foundation: recommendations(vehicleId?), 100%
// reuse VehicleDecisionAPI.context() -> reminder.all (severity 'overdue'/
// 'due-soon') + insights (type 'warning'). Pola sama persis tests/
// vehicle-ai-hook.test.js — dependency di-mock lewat loadSource
// extraGlobals (isolasi murni).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts = {}) {
  return loadSource(['modules/vehicle/vehicle-recommendation-engine.js'], {
    VehicleDecisionAPI: opts.VehicleDecisionAPI,
  }, ['VehicleRecommendationEngine']);
}

function reminderItem(overrides = {}) {
  return Object.assign({
    type: 'service',
    vehicleId: 'veh_1',
    vehicleName: 'Motor A',
    severity: 'overdue',
    categoryName: 'Oli Mesin',
    message: 'Servis Oli Mesin Motor A sudah lewat jatuh tempo.',
  }, overrides);
}

function ctxOk(overrides = {}) {
  return Object.assign({
    ok: true,
    vehicleId: null,
    intelligence: { insights: [] },
    reminder: { all: [] },
  }, overrides);
}

test('vehicle-recommendation-engine.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('recommendations() — VehicleDecisionAPI belum dimuat: [], tidak throw', () => {
  const { VehicleRecommendationEngine } = makeCtx({ VehicleDecisionAPI: undefined });
  assert.equal(VehicleRecommendationEngine.recommendations().length, 0);
});

test('recommendations() — context() {ok:false}: [], tidak throw', () => {
  const VehicleDecisionAPI = { context: () => ({ ok: false, reason: 'x' }) };
  const { VehicleRecommendationEngine } = makeCtx({ VehicleDecisionAPI });
  assert.equal(VehicleRecommendationEngine.recommendations().length, 0);
});

test('recommendations() — reminder severity "info" dilewati (bukan overdue/due-soon)', () => {
  const VehicleDecisionAPI = { context: () => ctxOk({ reminder: { all: [reminderItem({ severity: 'info' })] } }) };
  const { VehicleRecommendationEngine } = makeCtx({ VehicleDecisionAPI });
  assert.equal(VehicleRecommendationEngine.recommendations().length, 0);
});

test('recommendations() — reminder severity "overdue"/"due-soon" masuk, field reuse apa adanya', () => {
  const items = [reminderItem({ severity: 'overdue' }), reminderItem({ type: 'fuel', severity: 'due-soon', categoryName: undefined, message: 'x' })];
  const VehicleDecisionAPI = { context: () => ctxOk({ reminder: { all: items } }) };
  const { VehicleRecommendationEngine } = makeCtx({ VehicleDecisionAPI });
  const recs = VehicleRecommendationEngine.recommendations();
  assert.equal(recs.length, 2);
  assert.equal(recs[0].source, 'reminder');
  assert.equal(recs[0].type, 'service');
  assert.equal(recs[0].severity, 'overdue');
  assert.equal(recs[0].vehicleId, 'veh_1');
  assert.equal(recs[0].vehicleName, 'Motor A');
  assert.equal(recs[0].message, items[0].message);
});

test('recommendations() — insight type "info"/"positive" dilewati, hanya "warning" masuk', () => {
  const insights = [
    { type: 'info', code: 'a', message: 'info x' },
    { type: 'positive', code: 'b', message: 'positive x' },
    { type: 'warning', code: 'c', message: 'warning x' },
  ];
  const VehicleDecisionAPI = { context: () => ctxOk({ intelligence: { insights } }) };
  const { VehicleRecommendationEngine } = makeCtx({ VehicleDecisionAPI });
  const recs = VehicleRecommendationEngine.recommendations();
  assert.equal(recs.length, 1);
  assert.equal(recs[0].source, 'insight');
  assert.equal(recs[0].type, 'insight');
  assert.equal(recs[0].severity, 'warning');
  assert.equal(recs[0].message, 'warning x');
});

test('recommendations(vehicleId) — pakai intelligence.vehicleInsights (bukan insights fleet-level)', () => {
  const VehicleDecisionAPI = {
    context: (id) => {
      assert.equal(id, 'veh_1');
      return ctxOk({
        vehicleId: 'veh_1',
        intelligence: {
          insights: [{ type: 'warning', code: 'fleet_x', message: 'fleet-level, tidak boleh muncul' }],
          vehicleInsights: [{ type: 'warning', code: 'veh_x', message: 'vehicle-level, harus muncul' }],
        },
      });
    },
  };
  const { VehicleRecommendationEngine } = makeCtx({ VehicleDecisionAPI });
  const recs = VehicleRecommendationEngine.recommendations('veh_1');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].message, 'vehicle-level, harus muncul');
  assert.equal(recs[0].vehicleId, 'veh_1');
});

test('recommendations() — gabungan reminder + insight dalam 1 array', () => {
  const VehicleDecisionAPI = {
    context: () => ctxOk({
      reminder: { all: [reminderItem()] },
      intelligence: { insights: [{ type: 'warning', code: 'x', message: 'y' }] },
    }),
  };
  const { VehicleRecommendationEngine } = makeCtx({ VehicleDecisionAPI });
  const recs = VehicleRecommendationEngine.recommendations();
  assert.equal(recs.length, 2);
  assert.equal(recs.filter((r) => r.source === 'reminder').length, 1);
  assert.equal(recs.filter((r) => r.source === 'insight').length, 1);
});
