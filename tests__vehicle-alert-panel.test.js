'use strict';
// tests/vehicle-alert-panel.test.js — VehicleAlertPanel (modules/vehicle/
// vehicle-alert-panel.js). Sesi 80 (Batch 7) — Vehicle AI Dashboard
// Integration: daftar reminder severity 'overdue', silent kalau kosong.
// Pola sama persis tests/vehicle-dashboard.test.js — dependency
// (VehicleAIHook, escapeHtml) di-mock lewat loadSource extraGlobals, DOM
// lewat fakeDom.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeDoc(initial = {}) {
  return createFakeDocument({ vehAlertBody: {}, ...initial });
}

function makeCtx(opts = {}) {
  const { document: docOverride, ...rest } = opts;
  const fakeDocument = docOverride || makeDoc();
  const ctx = loadSource(['modules/vehicle/vehicle-alert-panel.js'], {
    escapeHtml: (s) => String(s ?? ''),
    ...rest,
    document: fakeDocument,
  }, ['VehicleAlertPanel']);
  return { VehicleAlertPanel: ctx.VehicleAlertPanel, fakeDocument };
}

function reminderAll(items) {
  return {
    ok: true,
    intelligence: { fleet: { totalVehicles: 2, totalOverdue: 0, avgHealth: 80, vehicles: [] }, insights: [] },
    reminder: { total: items.length, overdueCount: items.filter((i) => i.severity === 'overdue').length, dueSoonCount: 0, infoCount: 0, service: [], tax: [], fuel: [], all: items },
  };
}

test('vehicle-alert-panel.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('render() — container #vehAlertBody tidak ada di DOM: tidak throw', () => {
  const emptyDoc = { getElementById: () => null, querySelectorAll: () => [] };
  const { VehicleAlertPanel } = makeCtx({ document: emptyDoc, VehicleAIHook: { fleetSummary: () => reminderAll([]) } });
  assert.doesNotThrow(() => VehicleAlertPanel.render());
});

test('render() — VehicleAIHook belum dimuat: body dikosongkan, tidak throw', () => {
  const { VehicleAlertPanel, fakeDocument } = makeCtx({ VehicleAIHook: undefined });
  assert.doesNotThrow(() => VehicleAlertPanel.render());
  assert.equal(fakeDocument.getElementById('vehAlertBody').innerHTML, '');
});

test('render() — fleetSummary() ok:false: body dikosongkan, tidak throw', () => {
  const VehicleAIHook = { fleetSummary: () => ({ ok: false, reason: 'x' }) };
  const { VehicleAlertPanel, fakeDocument } = makeCtx({ VehicleAIHook });
  assert.doesNotThrow(() => VehicleAlertPanel.render());
  assert.equal(fakeDocument.getElementById('vehAlertBody').innerHTML, '');
});

test('render() — tidak ada reminder severity overdue: body dikosongkan (silent), tidak throw', () => {
  const VehicleAIHook = { fleetSummary: () => reminderAll([{ type: 'service', severity: 'due-soon', message: 'x' }]) };
  const { VehicleAlertPanel, fakeDocument } = makeCtx({ VehicleAIHook });
  VehicleAlertPanel.render();
  assert.equal(fakeDocument.getElementById('vehAlertBody').innerHTML, '');
});

test('render() — filter HANYA severity overdue dari reminder.all apa adanya, 0 recompute', () => {
  const items = [
    { type: 'service', severity: 'overdue', message: 'Servis Motor A lewat jatuh tempo.' },
    { type: 'tax', severity: 'due-soon', message: 'Pajak Mobil B segera.' },
    { type: 'fuel', severity: 'overdue', message: 'BBM Motor A hampir habis.' },
  ];
  const VehicleAIHook = { fleetSummary: () => reminderAll(items) };
  const { VehicleAlertPanel, fakeDocument } = makeCtx({ VehicleAIHook });
  VehicleAlertPanel.render();
  const html = fakeDocument.getElementById('vehAlertBody').innerHTML;
  assert.match(html, /Butuh Perhatian Segera/);
  assert.match(html, /Servis Motor A lewat jatuh tempo/);
  assert.match(html, /BBM Motor A hampir habis/);
  assert.doesNotMatch(html, /Pajak Mobil B segera/);
});

test('render() — ikon per type (service/tax/fuel) tampil sesuai item', () => {
  const items = [
    { type: 'tax', severity: 'overdue', message: 'STNK Mobil B lewat jatuh tempo.' },
  ];
  const VehicleAIHook = { fleetSummary: () => reminderAll(items) };
  const { VehicleAlertPanel, fakeDocument } = makeCtx({ VehicleAIHook });
  VehicleAlertPanel.render();
  const html = fakeDocument.getElementById('vehAlertBody').innerHTML;
  assert.match(html, /📋/);
});
