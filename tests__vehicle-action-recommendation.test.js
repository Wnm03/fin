'use strict';
// tests/vehicle-action-recommendation.test.js — VehicleActionRecommendation
// (modules/vehicle/vehicle-action-recommendation.js). Sesi 82 (Batch 7) —
// Vehicle Decision Engine Foundation: actionFor(recommendation) &
// withAction(recommendations), lookup ACTION_MAP[type][severity]. Modul
// ini 0 dependency ke modul lain, cukup load apa adanya.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx() {
  return loadSource(['modules/vehicle/vehicle-action-recommendation.js'], {}, ['VehicleActionRecommendation']);
}

test('vehicle-action-recommendation.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('actionFor() — type "service" severity "overdue"', () => {
  const { VehicleActionRecommendation } = makeCtx();
  assert.equal(VehicleActionRecommendation.actionFor({ type: 'service', severity: 'overdue' }).label, 'Jadwalkan servis sekarang');
});

test('actionFor() — type "service" severity "due-soon"', () => {
  const { VehicleActionRecommendation } = makeCtx();
  assert.equal(VehicleActionRecommendation.actionFor({ type: 'service', severity: 'due-soon' }).label, 'Rencanakan servis dalam waktu dekat');
});

test('actionFor() — type "tax" severity "overdue"/"due-soon"', () => {
  const { VehicleActionRecommendation } = makeCtx();
  assert.equal(VehicleActionRecommendation.actionFor({ type: 'tax', severity: 'overdue' }).label, 'Segera perpanjang pajak/dokumen kendaraan');
  assert.equal(VehicleActionRecommendation.actionFor({ type: 'tax', severity: 'due-soon' }).label, 'Siapkan perpanjangan pajak/dokumen kendaraan');
});

test('actionFor() — type "fuel" severity "overdue"/"due-soon"', () => {
  const { VehicleActionRecommendation } = makeCtx();
  assert.equal(VehicleActionRecommendation.actionFor({ type: 'fuel', severity: 'overdue' }).label, 'Isi BBM sekarang');
  assert.equal(VehicleActionRecommendation.actionFor({ type: 'fuel', severity: 'due-soon' }).label, 'Rencanakan isi BBM dalam waktu dekat');
});

test('actionFor() — type "insight" severity "warning"', () => {
  const { VehicleActionRecommendation } = makeCtx();
  assert.equal(VehicleActionRecommendation.actionFor({ type: 'insight', severity: 'warning' }).label, 'Tinjau kondisi kendaraan');
});

test('actionFor() — kombinasi tidak dikenal: fallback DEFAULT_LABEL, tidak throw', () => {
  const { VehicleActionRecommendation } = makeCtx();
  assert.equal(VehicleActionRecommendation.actionFor({ type: 'entah', severity: 'entah' }).label, 'Tinjau kendaraan');
  assert.equal(VehicleActionRecommendation.actionFor({}).label, 'Tinjau kendaraan');
});

test('withAction() — array kosong: [], tidak throw', () => {
  const { VehicleActionRecommendation } = makeCtx();
  assert.equal(VehicleActionRecommendation.withAction([]).length, 0);
  assert.equal(VehicleActionRecommendation.withAction(undefined).length, 0);
});

test('withAction() — menambah field action, field lain dipertahankan', () => {
  const { VehicleActionRecommendation } = makeCtx();
  const input = [{ id: 'a', type: 'service', severity: 'overdue', message: 'x' }];
  const out = VehicleActionRecommendation.withAction(input);
  assert.equal(out[0].id, 'a');
  assert.equal(out[0].message, 'x');
  assert.equal(out[0].action.label, 'Jadwalkan servis sekarang');
  assert.equal(input[0].action, undefined); // input asli tidak diubah
});
