'use strict';
// tests/vehicle-automation-presenter.test.js — VehicleAutomationPresenter
// (modules/vehicle/vehicle-automation-presenter.js). Sesi 83 (Batch 7) —
// Vehicle Automation Foundation: Total Item Terjadwal Card, Segera (Hari
// Ini) Card, Servis Terjadwal Card, Pajak/Dokumen Terjadwal Card. Pola
// sama persis tests/vehicle-analytics-presenter.test.js — dependency
// (VehicleReminderScheduler, VehicleMaintenanceAutomation,
// VehicleTaxDocumentAutomation, VehicleIntelligence, escapeHtml) di-mock
// lewat loadSource extraGlobals (isolasi murni), UI (document) lewat
// fakeDom.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeDoc(initial = {}) {
  return createFakeDocument({ vehAutomationGrid: {}, ...initial });
}

function makeCtx(opts = {}) {
  const { document: docOverride, ...rest } = opts;
  const fakeDocument = docOverride || makeDoc();
  const ctx = loadSource(['modules/vehicle/vehicle-automation-presenter.js'], {
    escapeHtml: (s) => String(s ?? ''),
    ...rest,
    document: fakeDocument,
  }, ['VehicleAutomationPresenter']);
  return { VehicleAutomationPresenter: ctx.VehicleAutomationPresenter, fakeDocument };
}

function scheduleSummary(overrides = {}) {
  return Object.assign({
    total: 4,
    counts: { today: 2, soon: 1, upcoming: 1 },
    items: [],
  }, overrides);
}

function fleet(totalVehicles = 3) {
  return { fleetSummary: () => ({ totalVehicles, totalOverdue: 0, avgHealth: 80, vehicles: [] }) };
}

function deps(overrides = {}) {
  return Object.assign({
    VehicleReminderScheduler: { summary: () => scheduleSummary() },
    VehicleMaintenanceAutomation: { plan: () => ({ total: 2, tasks: [] }) },
    VehicleTaxDocumentAutomation: { plan: () => ({ total: 1, tasks: [] }) },
    VehicleIntelligence: fleet(),
  }, overrides);
}

test('vehicle-automation-presenter.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('render() — container #vehAutomationGrid tidak ada di DOM: tidak throw', () => {
  const emptyDoc = { getElementById: () => null, querySelectorAll: () => [] };
  const { VehicleAutomationPresenter } = makeCtx({ document: emptyDoc, ...deps() });
  assert.doesNotThrow(() => VehicleAutomationPresenter.render());
});

test('render() — VehicleReminderScheduler belum dimuat: empty state, tidak throw', () => {
  const { VehicleAutomationPresenter, fakeDocument } = makeCtx({ ...deps(), VehicleReminderScheduler: undefined });
  assert.doesNotThrow(() => VehicleAutomationPresenter.render());
  assert.match(fakeDocument.getElementById('vehAutomationGrid').innerHTML, /belum tersedia/);
});

test('render() — VehicleMaintenanceAutomation belum dimuat: empty state, tidak throw', () => {
  const { VehicleAutomationPresenter, fakeDocument } = makeCtx({ ...deps(), VehicleMaintenanceAutomation: undefined });
  assert.doesNotThrow(() => VehicleAutomationPresenter.render());
  assert.match(fakeDocument.getElementById('vehAutomationGrid').innerHTML, /belum tersedia/);
});

test('render() — VehicleTaxDocumentAutomation belum dimuat: empty state, tidak throw', () => {
  const { VehicleAutomationPresenter, fakeDocument } = makeCtx({ ...deps(), VehicleTaxDocumentAutomation: undefined });
  assert.doesNotThrow(() => VehicleAutomationPresenter.render());
  assert.match(fakeDocument.getElementById('vehAutomationGrid').innerHTML, /belum tersedia/);
});

test('render() — 0 kendaraan: empty state "Belum ada data kendaraan", tidak throw', () => {
  const { VehicleAutomationPresenter, fakeDocument } = makeCtx({ ...deps({ VehicleIntelligence: fleet(0) }) });
  VehicleAutomationPresenter.render();
  assert.match(fakeDocument.getElementById('vehAutomationGrid').innerHTML, /Belum ada data kendaraan/);
});

test('render() — 4 kartu ditampilkan dgn nilai reuse apa adanya dari summary()/plan()', () => {
  const { VehicleAutomationPresenter, fakeDocument } = makeCtx({ ...deps() });
  VehicleAutomationPresenter.render();
  const html = fakeDocument.getElementById('vehAutomationGrid').innerHTML;
  assert.match(html, /Total Item Terjadwal/);
  assert.match(html, />4</);
  assert.match(html, /Segera \(Hari Ini\)/);
  assert.match(html, />2</);
  assert.match(html, /Servis Terjadwal/);
  assert.match(html, />2</);
  assert.match(html, /Pajak\/Dokumen Terjadwal/);
  assert.match(html, />1</);
});

test('render() — counts.today 0: class "red" TIDAK dipakai pada kartu Segera (Hari Ini)', () => {
  const { VehicleAutomationPresenter, fakeDocument } = makeCtx({
    ...deps({ VehicleReminderScheduler: { summary: () => scheduleSummary({ total: 0, counts: { today: 0, soon: 0, upcoming: 0 } }) } }),
  });
  VehicleAutomationPresenter.render();
  const html = fakeDocument.getElementById('vehAutomationGrid').innerHTML;
  assert.doesNotMatch(html, /findash-card-val red/);
});

test('render() — counts.today > 0: class "red" dipakai pada kartu Segera (Hari Ini)', () => {
  const { VehicleAutomationPresenter, fakeDocument } = makeCtx({ ...deps() });
  VehicleAutomationPresenter.render();
  const html = fakeDocument.getElementById('vehAutomationGrid').innerHTML;
  assert.match(html, /findash-card-val red/);
});
