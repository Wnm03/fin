'use strict';
// tests/vehicle-reminder-scheduler.test.js — VehicleReminderScheduler
// (modules/vehicle/vehicle-reminder-scheduler.js). Sesi 83 (Batch 7) —
// Vehicle Automation Foundation: schedule(vehicleId?)/summary(vehicleId?),
// 100% reuse VehicleAutomationAPI.context() -> items, SCHEDULE_MAP
// (satu-satunya "rumus" baru sesi ini). Pola sama persis tests/
// vehicle-recommendation-engine.test.js — dependency di-mock lewat
// loadSource extraGlobals (isolasi murni).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts = {}) {
  return loadSource(['modules/vehicle/vehicle-reminder-scheduler.js'], {
    VehicleAutomationAPI: opts.VehicleAutomationAPI,
  }, ['VehicleReminderScheduler']);
}

function item(overrides = {}) {
  return Object.assign({
    id: 'r1', source: 'reminder', type: 'service', vehicleId: 'veh_1',
    vehicleName: 'Motor A', severity: 'overdue', message: 'x',
    priorityScore: 100, action: { label: 'aksi' },
  }, overrides);
}

function ctxOk(items = []) {
  return { ok: true, vehicleId: null, items };
}

test('vehicle-reminder-scheduler.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('schedule() — VehicleAutomationAPI belum dimuat: [], tidak throw', () => {
  const { VehicleReminderScheduler } = makeCtx({ VehicleAutomationAPI: undefined });
  assert.equal(VehicleReminderScheduler.schedule().length, 0);
});

test('schedule() — context() {ok:false}: [], tidak throw', () => {
  const VehicleAutomationAPI = { context: () => ({ ok: false, reason: 'x' }) };
  const { VehicleReminderScheduler } = makeCtx({ VehicleAutomationAPI });
  assert.equal(VehicleReminderScheduler.schedule().length, 0);
});

test('schedule() — severity "overdue" -> bucket "today", field lain reuse apa adanya', () => {
  const items = [item({ severity: 'overdue' })];
  const VehicleAutomationAPI = { context: () => ctxOk(items) };
  const { VehicleReminderScheduler } = makeCtx({ VehicleAutomationAPI });
  const out = VehicleReminderScheduler.schedule();
  assert.equal(out.length, 1);
  assert.equal(out[0].schedule.bucket, 'today');
  assert.equal(out[0].schedule.label, 'Segera (Hari Ini)');
  assert.equal(out[0].priorityScore, 100);
  assert.equal(out[0].action.label, 'aksi');
  assert.equal(out[0].message, 'x');
});

test('schedule() — severity "due-soon" -> bucket "upcoming"', () => {
  const items = [item({ severity: 'due-soon' })];
  const VehicleAutomationAPI = { context: () => ctxOk(items) };
  const { VehicleReminderScheduler } = makeCtx({ VehicleAutomationAPI });
  assert.equal(VehicleReminderScheduler.schedule()[0].schedule.bucket, 'upcoming');
});

test('schedule() — severity "warning" -> bucket "soon"', () => {
  const items = [item({ type: 'insight', severity: 'warning' })];
  const VehicleAutomationAPI = { context: () => ctxOk(items) };
  const { VehicleReminderScheduler } = makeCtx({ VehicleAutomationAPI });
  assert.equal(VehicleReminderScheduler.schedule()[0].schedule.bucket, 'soon');
});

test('schedule() — severity tidak dikenal: fallback DEFAULT_SCHEDULE ("upcoming"), tidak throw', () => {
  const items = [item({ severity: 'entah' })];
  const VehicleAutomationAPI = { context: () => ctxOk(items) };
  const { VehicleReminderScheduler } = makeCtx({ VehicleAutomationAPI });
  assert.equal(VehicleReminderScheduler.schedule()[0].schedule.bucket, 'upcoming');
});

test('schedule(vehicleId) — vehicleId diteruskan apa adanya ke VehicleAutomationAPI.context()', () => {
  const VehicleAutomationAPI = { context: (id) => { assert.equal(id, 'veh_1'); return ctxOk([]); } };
  const { VehicleReminderScheduler } = makeCtx({ VehicleAutomationAPI });
  assert.doesNotThrow(() => VehicleReminderScheduler.schedule('veh_1'));
});

test('summary() — hitungan per bucket sesuai schedule(), total = jumlah item', () => {
  const items = [
    item({ id: 'a', severity: 'overdue' }),
    item({ id: 'b', severity: 'overdue' }),
    item({ id: 'c', type: 'insight', severity: 'warning' }),
    item({ id: 'd', type: 'tax', severity: 'due-soon' }),
  ];
  const VehicleAutomationAPI = { context: () => ctxOk(items) };
  const { VehicleReminderScheduler } = makeCtx({ VehicleAutomationAPI });
  const summary = VehicleReminderScheduler.summary();
  assert.equal(summary.total, 4);
  assert.equal(summary.counts.today, 2);
  assert.equal(summary.counts.soon, 1);
  assert.equal(summary.counts.upcoming, 1);
  assert.equal(summary.items.length, 4);
});

test('summary() — 0 item: total 0, semua counts 0, tidak throw', () => {
  const VehicleAutomationAPI = { context: () => ctxOk([]) };
  const { VehicleReminderScheduler } = makeCtx({ VehicleAutomationAPI });
  const summary = VehicleReminderScheduler.summary();
  assert.equal(summary.total, 0);
  assert.equal(summary.counts.today, 0);
  assert.equal(summary.counts.soon, 0);
  assert.equal(summary.counts.upcoming, 0);
});
