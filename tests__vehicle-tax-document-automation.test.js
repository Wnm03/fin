'use strict';
// tests/vehicle-tax-document-automation.test.js — VehicleTaxDocumentAutomation
// (modules/vehicle/vehicle-tax-document-automation.js). Sesi 83 (Batch 7)
// — Vehicle Automation Foundation: tasks(vehicleId?)/plan(vehicleId?),
// 100% reuse VehicleReminderScheduler.schedule() -> filter type 'tax'.
// Pola sama persis tests/vehicle-maintenance-automation.test.js —
// dependency di-mock lewat loadSource extraGlobals (isolasi murni).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts = {}) {
  return loadSource(['modules/vehicle/vehicle-tax-document-automation.js'], {
    VehicleReminderScheduler: opts.VehicleReminderScheduler,
  }, ['VehicleTaxDocumentAutomation']);
}

function item(overrides = {}) {
  return Object.assign({
    id: 'r1', type: 'tax', vehicleId: 'veh_1', severity: 'overdue',
    message: 'x', schedule: { bucket: 'today', label: 'Segera (Hari Ini)' },
  }, overrides);
}

test('vehicle-tax-document-automation.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('tasks() — VehicleReminderScheduler belum dimuat: [], tidak throw', () => {
  const { VehicleTaxDocumentAutomation } = makeCtx({ VehicleReminderScheduler: undefined });
  assert.equal(VehicleTaxDocumentAutomation.tasks().length, 0);
});

test('tasks() — hanya type "tax" yang masuk, type lain dilewati', () => {
  const items = [
    item({ id: 'a', type: 'tax' }),
    item({ id: 'b', type: 'service' }),
    item({ id: 'c', type: 'fuel' }),
    item({ id: 'd', type: 'insight' }),
  ];
  const VehicleReminderScheduler = { schedule: () => items };
  const { VehicleTaxDocumentAutomation } = makeCtx({ VehicleReminderScheduler });
  const tasks = VehicleTaxDocumentAutomation.tasks();
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].id, 'a');
});

test('tasks() — field item reuse apa adanya (0 transformasi)', () => {
  const items = [item({ message: 'Pajak STNK sudah lewat jatuh tempo.' })];
  const VehicleReminderScheduler = { schedule: () => items };
  const { VehicleTaxDocumentAutomation } = makeCtx({ VehicleReminderScheduler });
  const tasks = VehicleTaxDocumentAutomation.tasks();
  assert.equal(tasks[0].message, 'Pajak STNK sudah lewat jatuh tempo.');
  assert.equal(tasks[0].schedule.bucket, 'today');
});

test('tasks(vehicleId) — vehicleId diteruskan apa adanya ke VehicleReminderScheduler.schedule()', () => {
  const VehicleReminderScheduler = { schedule: (id) => { assert.equal(id, 'veh_1'); return []; } };
  const { VehicleTaxDocumentAutomation } = makeCtx({ VehicleReminderScheduler });
  assert.doesNotThrow(() => VehicleTaxDocumentAutomation.tasks('veh_1'));
});

test('plan() — total sesuai jumlah tasks(), tasks disertakan apa adanya', () => {
  const items = [item({ id: 'a' }), item({ id: 'b' }), item({ id: 'c', type: 'service' })];
  const VehicleReminderScheduler = { schedule: () => items };
  const { VehicleTaxDocumentAutomation } = makeCtx({ VehicleReminderScheduler });
  const plan = VehicleTaxDocumentAutomation.plan();
  assert.equal(plan.total, 2);
  assert.equal(plan.tasks.length, 2);
});

test('plan() — 0 task: total 0, tidak throw', () => {
  const VehicleReminderScheduler = { schedule: () => [] };
  const { VehicleTaxDocumentAutomation } = makeCtx({ VehicleReminderScheduler });
  const plan = VehicleTaxDocumentAutomation.plan();
  assert.equal(plan.total, 0);
  assert.equal(plan.tasks.length, 0);
});
