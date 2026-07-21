'use strict';
// tests/vehicle-daily-brief.test.js — VehicleDailyBrief (modules/vehicle/
// vehicle-daily-brief.js). Sesi 80 (Batch 7) — Vehicle AI Dashboard
// Integration: ringkasan harian 1-2 kalimat, silent kalau 0 kendaraan.
// Pola sama persis tests/vehicle-dashboard.test.js — dependency
// (VehicleAIHook, escapeHtml) di-mock lewat loadSource extraGlobals, DOM
// lewat fakeDom.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeDoc(initial = {}) {
  return createFakeDocument({ vehBriefBody: {}, ...initial });
}

function makeCtx(opts = {}) {
  const { document: docOverride, ...rest } = opts;
  const fakeDocument = docOverride || makeDoc();
  const ctx = loadSource(['modules/vehicle/vehicle-daily-brief.js'], {
    escapeHtml: (s) => String(s ?? ''),
    ...rest,
    document: fakeDocument,
  }, ['VehicleDailyBrief']);
  return { VehicleDailyBrief: ctx.VehicleDailyBrief, fakeDocument };
}

function fullHook(overrides = {}) {
  return Object.assign({
    ok: true,
    intelligence: { fleet: { totalVehicles: 3, totalOverdue: 0, avgHealth: 85, vehicles: [] }, insights: [] },
    reminder: { total: 0, overdueCount: 0, dueSoonCount: 0, infoCount: 0, service: [], tax: [], fuel: [], all: [] },
  }, overrides);
}

test('vehicle-daily-brief.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('render() — container #vehBriefBody tidak ada di DOM: tidak throw', () => {
  const emptyDoc = { getElementById: () => null, querySelectorAll: () => [] };
  const { VehicleDailyBrief } = makeCtx({ document: emptyDoc, VehicleAIHook: { fleetSummary: () => fullHook() } });
  assert.doesNotThrow(() => VehicleDailyBrief.render());
});

test('render() — VehicleAIHook belum dimuat: body dikosongkan, tidak throw', () => {
  const { VehicleDailyBrief, fakeDocument } = makeCtx({ VehicleAIHook: undefined });
  assert.doesNotThrow(() => VehicleDailyBrief.render());
  assert.equal(fakeDocument.getElementById('vehBriefBody').innerHTML, '');
});

test('render() — fleetSummary() ok:false: body dikosongkan, tidak throw', () => {
  const VehicleAIHook = { fleetSummary: () => ({ ok: false, reason: 'x' }) };
  const { VehicleDailyBrief, fakeDocument } = makeCtx({ VehicleAIHook });
  assert.doesNotThrow(() => VehicleDailyBrief.render());
  assert.equal(fakeDocument.getElementById('vehBriefBody').innerHTML, '');
});

test('render() — totalVehicles 0: body dikosongkan (silent), tidak throw', () => {
  const VehicleAIHook = { fleetSummary: () => fullHook({ intelligence: { fleet: { totalVehicles: 0, totalOverdue: 0, avgHealth: 0, vehicles: [] }, insights: [] } }) };
  const { VehicleDailyBrief, fakeDocument } = makeCtx({ VehicleAIHook });
  VehicleDailyBrief.render();
  assert.equal(fakeDocument.getElementById('vehBriefBody').innerHTML, '');
});

test('render() — ada kendaraan: tampilkan jumlah kendaraan & skor kesehatan apa adanya', () => {
  const VehicleAIHook = { fleetSummary: () => fullHook() };
  const { VehicleDailyBrief, fakeDocument } = makeCtx({ VehicleAIHook });
  VehicleDailyBrief.render();
  const html = fakeDocument.getElementById('vehBriefBody').innerHTML;
  assert.match(html, /3 kendaraan/);
  assert.match(html, /85\/100/);
  assert.match(html, /Tidak ada reminder aktif/);
});

test('render() — totalOverdue > 0: sebutkan jumlah servis lewat jatuh tempo', () => {
  const VehicleAIHook = { fleetSummary: () => fullHook({ intelligence: { fleet: { totalVehicles: 2, totalOverdue: 4, avgHealth: 50, vehicles: [] }, insights: [] } }) };
  const { VehicleDailyBrief, fakeDocument } = makeCtx({ VehicleAIHook });
  VehicleDailyBrief.render();
  const html = fakeDocument.getElementById('vehBriefBody').innerHTML;
  assert.match(html, /4 item servis sudah lewat jatuh tempo/);
});

test('render() — reminder.total > 0: sebutkan jumlah reminder aktif & overdueCount', () => {
  const VehicleAIHook = { fleetSummary: () => fullHook({ reminder: { total: 5, overdueCount: 2, dueSoonCount: 3, infoCount: 0, service: [], tax: [], fuel: [], all: [] } }) };
  const { VehicleDailyBrief, fakeDocument } = makeCtx({ VehicleAIHook });
  VehicleDailyBrief.render();
  const html = fakeDocument.getElementById('vehBriefBody').innerHTML;
  assert.match(html, /5 reminder aktif \(2 lewat jatuh tempo\)/);
});
