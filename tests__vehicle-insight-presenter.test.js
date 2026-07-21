'use strict';
// tests/vehicle-insight-presenter.test.js — VehicleInsightPresenter
// (modules/vehicle/vehicle-insight-presenter.js). Sesi 79 (Batch 7) —
// Vehicle AI Hook Foundation: Reminder Aktif Card, Reminder Lewat Jatuh
// Tempo Card, Reminder Segera Jatuh Tempo Card. Pola sama persis tests/
// vehicle-dashboard.test.js — dependency (VehicleAIHook, escapeHtml)
// di-mock lewat loadSource extraGlobals (isolasi murni), UI (document)
// lewat fakeDom.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeDoc(initial = {}) {
  return createFakeDocument({ vehinsightGrid: {}, ...initial });
}

function makeCtx(opts = {}) {
  const { document: docOverride, ...rest } = opts;
  const fakeDocument = docOverride || makeDoc();
  const ctx = loadSource(['modules/vehicle/vehicle-insight-presenter.js'], {
    escapeHtml: (s) => String(s ?? ''),
    ...rest,
    document: fakeDocument,
  }, ['VehicleInsightPresenter']);
  return { VehicleInsightPresenter: ctx.VehicleInsightPresenter, fakeDocument };
}

function fullHook(overrides = {}) {
  return Object.assign({
    ok: true,
    intelligence: { fleet: { totalVehicles: 3, totalOverdue: 0, avgHealth: 85, vehicles: [] }, insights: [] },
    reminder: { total: 0, overdueCount: 0, dueSoonCount: 0, infoCount: 0, service: [], tax: [], fuel: [], all: [] },
  }, overrides);
}

// ================= render() — guard =================

test('vehicle-insight-presenter.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('render() — container #vehinsightGrid tidak ada di DOM: tidak throw', () => {
  const emptyDoc = { getElementById: () => null, querySelectorAll: () => [] };
  const { VehicleInsightPresenter } = makeCtx({ document: emptyDoc, VehicleAIHook: { fleetSummary: () => fullHook() } });
  assert.doesNotThrow(() => VehicleInsightPresenter.render());
});

test('render() — VehicleAIHook belum dimuat: tampilkan empty state, tidak throw', () => {
  const { VehicleInsightPresenter, fakeDocument } = makeCtx({ VehicleAIHook: undefined });
  assert.doesNotThrow(() => VehicleInsightPresenter.render());
  const html = fakeDocument.getElementById('vehinsightGrid').innerHTML;
  assert.match(html, /belum tersedia/);
});

test('render() — fleetSummary() ok:false: tampilkan empty state, tidak throw', () => {
  const VehicleAIHook = { fleetSummary: () => ({ ok: false, reason: 'VehicleIntelligence belum dimuat' }) };
  const { VehicleInsightPresenter, fakeDocument } = makeCtx({ VehicleAIHook });
  assert.doesNotThrow(() => VehicleInsightPresenter.render());
  const html = fakeDocument.getElementById('vehinsightGrid').innerHTML;
  assert.match(html, /belum tersedia/);
});

test('render() — totalVehicles 0 (belum ada kendaraan): tampilkan empty state, tidak throw', () => {
  const VehicleAIHook = { fleetSummary: () => fullHook({ intelligence: { fleet: { totalVehicles: 0, totalOverdue: 0, avgHealth: 0, vehicles: [] }, insights: [] } }) };
  const { VehicleInsightPresenter, fakeDocument } = makeCtx({ VehicleAIHook });
  assert.doesNotThrow(() => VehicleInsightPresenter.render());
  const html = fakeDocument.getElementById('vehinsightGrid').innerHTML;
  assert.match(html, /Belum ada data kendaraan/);
});

// ================= render() — Reminder Aktif Card =================

test('render() — Reminder Aktif Card: hijau kalau total 0', () => {
  const VehicleAIHook = { fleetSummary: () => fullHook() };
  const { VehicleInsightPresenter, fakeDocument } = makeCtx({ VehicleAIHook });
  VehicleInsightPresenter.render();
  const html = fakeDocument.getElementById('vehinsightGrid').innerHTML;
  assert.match(html, /Reminder Aktif/);
  assert.match(html, /class="findash-card-val green">0/);
});

test('render() — Reminder Aktif Card: oranye & tampilkan jumlah kalau total > 0', () => {
  const VehicleAIHook = { fleetSummary: () => fullHook({ reminder: { total: 5, overdueCount: 2, dueSoonCount: 3, infoCount: 0, service: [], tax: [], fuel: [], all: [] } }) };
  const { VehicleInsightPresenter, fakeDocument } = makeCtx({ VehicleAIHook });
  VehicleInsightPresenter.render();
  const html = fakeDocument.getElementById('vehinsightGrid').innerHTML;
  assert.match(html, /class="findash-card-val orange">5/);
});

// ================= render() — Reminder Lewat Jatuh Tempo Card =================

test('render() — Overdue Card: merah & tampilkan jumlah kalau overdueCount > 0', () => {
  const VehicleAIHook = { fleetSummary: () => fullHook({ reminder: { total: 2, overdueCount: 2, dueSoonCount: 0, infoCount: 0, service: [], tax: [], fuel: [], all: [] } }) };
  const { VehicleInsightPresenter, fakeDocument } = makeCtx({ VehicleAIHook });
  VehicleInsightPresenter.render();
  const html = fakeDocument.getElementById('vehinsightGrid').innerHTML;
  assert.match(html, /Reminder Lewat Jatuh Tempo/);
  assert.match(html, /class="findash-card-val red">2/);
});

// ================= render() — Reminder Segera Jatuh Tempo Card =================

test('render() — Due Soon Card: oranye & tampilkan jumlah kalau dueSoonCount > 0', () => {
  const VehicleAIHook = { fleetSummary: () => fullHook({ reminder: { total: 4, overdueCount: 0, dueSoonCount: 4, infoCount: 0, service: [], tax: [], fuel: [], all: [] } }) };
  const { VehicleInsightPresenter, fakeDocument } = makeCtx({ VehicleAIHook });
  VehicleInsightPresenter.render();
  const html = fakeDocument.getElementById('vehinsightGrid').innerHTML;
  assert.match(html, /Reminder Segera Jatuh Tempo/);
  assert.match(html, /class="findash-card-val orange">4/);
});

test('render() — semua 3 kartu tampil dalam satu render', () => {
  const VehicleAIHook = { fleetSummary: () => fullHook() };
  const { VehicleInsightPresenter, fakeDocument } = makeCtx({ VehicleAIHook });
  VehicleInsightPresenter.render();
  const html = fakeDocument.getElementById('vehinsightGrid').innerHTML;
  ['Reminder Aktif', 'Reminder Lewat Jatuh Tempo', 'Reminder Segera Jatuh Tempo'].forEach((label) => {
    assert.match(html, new RegExp(label));
  });
});
