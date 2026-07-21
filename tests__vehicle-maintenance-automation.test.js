'use strict';
// tests/vehicle-maintenance-automation.test.js — VehicleMaintenanceAutomation
// (modules/vehicle/vehicle-maintenance-automation.js). Sesi 83 (Batch 7)
// — Vehicle Automation Foundation: tasks(vehicleId?)/plan(vehicleId?),
// 100% reuse VehicleReminderScheduler.schedule() -> filter type
// 'service'. Pola sama persis tests/vehicle-recommendation-engine.test.js
// — dependency di-mock lewat loadSource extraGlobals (isolasi murni).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts = {}) {
  return loadSource(['modules/vehicle/vehicle-maintenance-automation.js'], {
    VehicleReminderScheduler: opts.VehicleReminderScheduler,
  }, ['VehicleMaintenanceAutomation']);
}

function item(overrides = {}) {
  return Object.assign({
    id: 'r1', type: 'service', vehicleId: 'veh_1', severity: 'overdue',
    message: 'x', schedule: { bucket: 'today', label: 'Segera (Hari Ini)' },
  }, overrides);
}

test('vehicle-maintenance-automation.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('tasks() — VehicleReminderScheduler belum dimuat: [], tidak throw', () => {
  const { VehicleMaintenanceAutomation } = makeCtx({ VehicleReminderScheduler: undefined });
  assert.equal(VehicleMaintenanceAutomation.tasks().length, 0);
});

test('tasks() — hanya type "service" yang masuk, type lain dilewati', () => {
  const items = [
    item({ id: 'a', type: 'service' }),
    item({ id: 'b', type: 'tax' }),
    item({ id: 'c', type: 'fuel' }),
    item({ id: 'd', type: 'insight' }),
  ];
  const VehicleReminderScheduler = { schedule: () => items };
  const { VehicleMaintenanceAutomation } = makeCtx({ VehicleReminderScheduler });
  const tasks = VehicleMaintenanceAutomation.tasks();
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].id, 'a');
});

test('tasks() — field item reuse apa adanya (0 transformasi)', () => {
  const items = [item({ message: 'Servis Oli Mesin sudah lewat jatuh tempo.' })];
  const VehicleReminderScheduler = { schedule: () => items };
  const { VehicleMaintenanceAutomation } = makeCtx({ VehicleReminderScheduler });
  const tasks = VehicleMaintenanceAutomation.tasks();
  assert.equal(tasks[0].message, 'Servis Oli Mesin sudah lewat jatuh tempo.');
  assert.equal(tasks[0].schedule.bucket, 'today');
});

test('tasks(vehicleId) — vehicleId diteruskan apa adanya ke VehicleReminderScheduler.schedule()', () => {
  const VehicleReminderScheduler = { schedule: (id) => { assert.equal(id, 'veh_1'); return []; } };
  const { VehicleMaintenanceAutomation } = makeCtx({ VehicleReminderScheduler });
  assert.doesNotThrow(() => VehicleMaintenanceAutomation.tasks('veh_1'));
});

test('plan() — total sesuai jumlah tasks(), tasks disertakan apa adanya', () => {
  const items = [item({ id: 'a' }), item({ id: 'b' }), item({ id: 'c', type: 'tax' })];
  const VehicleReminderScheduler = { schedule: () => items };
  const { VehicleMaintenanceAutomation } = makeCtx({ VehicleReminderScheduler });
  const plan = VehicleMaintenanceAutomation.plan();
  assert.equal(plan.total, 2);
  assert.equal(plan.tasks.length, 2);
});

test('plan() — 0 task: total 0, tidak throw', () => {
  const VehicleReminderScheduler = { schedule: () => [] };
  const { VehicleMaintenanceAutomation } = makeCtx({ VehicleReminderScheduler });
  const plan = VehicleMaintenanceAutomation.plan();
  assert.equal(plan.total, 0);
  assert.equal(plan.tasks.length, 0);
});
