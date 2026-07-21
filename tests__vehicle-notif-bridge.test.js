'use strict';
// tests/vehicle-notif-bridge.test.js — VehicleNotifBridge (modules/vehicle/
// vehicle-notif-bridge.js). Sesi 84 (Batch 7) — Vehicle Dashboard Final
// Integration: menutup gap wiring Service Reminder/Fuel Reminder
// (VehicleReminder, Sesi 78) ke notifikasi browser nyata
// (reminder-notif.js checkAndFireReminders()). Pola sama persis
// tests/vehicle-ai-hook.test.js — dependency (VehicleReminder) di-mock
// lewat loadSource extraGlobals (isolasi murni), bukan me-load ulang
// vehicle-reminder.js sungguhan.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(VehicleReminder) {
  return loadSource(['modules/vehicle/vehicle-notif-bridge.js'], {
    VehicleReminder,
  }, ['VehicleNotifBridge']);
}

test('items — VehicleReminder belum dimuat => array kosong', () => {
  const ctx = makeCtx(undefined);
  assert.equal(ctx.VehicleNotifBridge.items().length, 0);
});

test('items — service reminder severity overdue => 1 item, title & body sesuai', () => {
  const VehicleReminder = {
    serviceReminders: () => [{ vehicleId: 'veh_1', vehicleName: 'Motor A', categoryName: 'Oli', severity: 'overdue', message: 'Servis Oli Motor A sudah lewat jatuh tempo (300 km lewat batas).' }],
    fuelReminders: () => [],
  };
  const ctx = makeCtx(VehicleReminder);
  const out = ctx.VehicleNotifBridge.items();
  assert.equal(out.length, 1);
  assert.equal(out[0].fireKey, 'vehsvc_veh_1_Oli');
  assert.equal(out[0].title, '🔧 Servis Lewat Jatuh Tempo');
  assert.equal(out[0].body, 'Servis Oli Motor A sudah lewat jatuh tempo (300 km lewat batas).');
});

test('items — service reminder severity due-soon TIDAK ditembak', () => {
  const VehicleReminder = {
    serviceReminders: () => [{ vehicleId: 'veh_1', vehicleName: 'Motor A', categoryName: 'Oli', severity: 'due-soon', message: 'segera' }],
    fuelReminders: () => [],
  };
  const ctx = makeCtx(VehicleReminder);
  assert.equal(ctx.VehicleNotifBridge.items().length, 0);
});

test('items — fuel reminder severity overdue => 1 item, fireKey per-kendaraan (bukan per-kategori)', () => {
  const VehicleReminder = {
    serviceReminders: () => [],
    fuelReminders: () => [{ vehicleId: 'veh_2', vehicleName: 'Mobil B', severity: 'overdue', message: 'Berdasarkan histori, Mobil B kemungkinan sudah melewati estimasi jangkauan BBM sejak isi Full Tank terakhir.' }],
  };
  const ctx = makeCtx(VehicleReminder);
  const out = ctx.VehicleNotifBridge.items();
  assert.equal(out.length, 1);
  assert.equal(out[0].fireKey, 'vehfuel_veh_2');
  assert.equal(out[0].title, '⛽ Estimasi BBM Terlewati');
});

test('items — fuel reminder severity info/due-soon TIDAK ditembak', () => {
  const VehicleReminder = {
    serviceReminders: () => [],
    fuelReminders: () => [
      { vehicleId: 'veh_1', severity: 'info', message: 'belum cukup data' },
      { vehicleId: 'veh_2', severity: 'due-soon', message: 'segera' },
    ],
  };
  const ctx = makeCtx(VehicleReminder);
  assert.equal(ctx.VehicleNotifBridge.items().length, 0);
});

test('items — gabungan service+fuel overdue lintas kendaraan', () => {
  const VehicleReminder = {
    serviceReminders: () => [
      { vehicleId: 'veh_1', categoryName: 'Oli', severity: 'overdue', message: 'm1' },
      { vehicleId: 'veh_1', categoryName: 'Ban', severity: 'due-soon', message: 'm2' },
    ],
    fuelReminders: () => [
      { vehicleId: 'veh_2', severity: 'overdue', message: 'm3' },
    ],
  };
  const ctx = makeCtx(VehicleReminder);
  const out = ctx.VehicleNotifBridge.items();
  assert.equal(out.length, 2);
  assert.deepEqual(Array.from(out, (o) => o.fireKey).sort(), ['vehfuel_veh_2', 'vehsvc_veh_1_Oli']);
});

test('items — firedIds memfilter item yang sudah pernah ditembak (dedupe hari yang sama)', () => {
  const VehicleReminder = {
    serviceReminders: () => [{ vehicleId: 'veh_1', categoryName: 'Oli', severity: 'overdue', message: 'm1' }],
    fuelReminders: () => [{ vehicleId: 'veh_2', severity: 'overdue', message: 'm2' }],
  };
  const ctx = makeCtx(VehicleReminder);
  const out = ctx.VehicleNotifBridge.items(undefined, ['vehsvc_veh_1_Oli']);
  assert.equal(out.length, 1);
  assert.equal(out[0].fireKey, 'vehfuel_veh_2');
});

test('items — firedIds bukan array (undefined) => diperlakukan sbg kosong, tidak error', () => {
  const VehicleReminder = {
    serviceReminders: () => [{ vehicleId: 'veh_1', categoryName: 'Oli', severity: 'overdue', message: 'm1' }],
    fuelReminders: () => [],
  };
  const ctx = makeCtx(VehicleReminder);
  assert.equal(ctx.VehicleNotifBridge.items(undefined, undefined).length, 1);
});

test('items — vehicleId diteruskan apa adanya ke serviceReminders/fuelReminders (0 filter tambahan di bridge)', () => {
  let seenService = null;
  let seenFuel = null;
  const VehicleReminder = {
    serviceReminders: (vehicleId) => { seenService = vehicleId; return []; },
    fuelReminders: (vehicleId) => { seenFuel = vehicleId; return []; },
  };
  const ctx = makeCtx(VehicleReminder);
  ctx.VehicleNotifBridge.items('veh_9', []);
  assert.equal(seenService, 'veh_9');
  assert.equal(seenFuel, 'veh_9');
});

test('taxReminders TIDAK pernah dipanggil oleh bridge (jalur lama ad-hoc reminder-notif.js sudah menembak notif pajak)', () => {
  let taxCalled = false;
  const VehicleReminder = {
    serviceReminders: () => [],
    fuelReminders: () => [],
    taxReminders: () => { taxCalled = true; return []; },
  };
  const ctx = makeCtx(VehicleReminder);
  ctx.VehicleNotifBridge.items();
  assert.equal(taxCalled, false);
});
