'use strict';
// tests/vehicle-dashboard.test.js — VehicleDashboard (modules/vehicle/
// vehicle-dashboard.js). Sesi 77 (Batch 7) — Vehicle Dashboard Foundation:
// Total Kendaraan Card, Servis Lewat Jatuh Tempo Card, Skor Kesehatan
// Armada Card, getAIHook(). Pola sama persis tests/finance-dashboard.test.js
// — dependency (VehicleIntelligence, escapeHtml) di-mock lewat loadSource
// extraGlobals (isolasi murni), UI (document) lewat fakeDom (pola sama
// tests/dashboard-hub-summary.test.js).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeDoc(initial = {}) {
  return createFakeDocument({ vehdashGrid: {}, ...initial });
}

function makeCtx(opts = {}) {
  const { document: docOverride, ...rest } = opts;
  const fakeDocument = docOverride || makeDoc();
  const ctx = loadSource(['modules/vehicle/vehicle-dashboard.js'], {
    escapeHtml: (s) => String(s ?? ''),
    ...rest,
    document: fakeDocument,
  }, ['VehicleDashboard']);
  return { VehicleDashboard: ctx.VehicleDashboard, fakeDocument };
}

function fullSummary(overrides = {}) {
  return Object.assign({
    fleet: {
      totalVehicles: 3,
      totalOverdue: 0,
      avgHealth: 85,
      vehicles: [
        { vehicleId: 'veh_1', name: 'Motor A', healthScore: 90, healthLabel: 'Sehat', overdueCount: 0 },
        { vehicleId: 'veh_2', name: 'Mobil B', healthScore: 80, healthLabel: 'Sehat', overdueCount: 0 },
        { vehicleId: 'veh_3', name: 'Motor C', healthScore: 85, healthLabel: 'Sehat', overdueCount: 0 },
      ],
    },
    insights: [],
  }, overrides);
}

// ================= getAIHook =================

test('vehicle-dashboard.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('getAIHook() — VehicleIntelligence belum dimuat: {ok:false}, tidak throw', () => {
  const { VehicleDashboard } = makeCtx({ VehicleIntelligence: undefined });
  const hook = VehicleDashboard.getAIHook();
  assert.equal(hook.ok, false);
  assert.match(hook.reason, /belum dimuat/);
});

test('getAIHook() — reuse 100% VehicleIntelligence.summary() (fleet-level, tanpa vehicleId), 0 transformasi', () => {
  const summary = fullSummary();
  const VehicleIntelligence = { summary: (vehicleId) => { assert.equal(vehicleId, undefined); return summary; } };
  const { VehicleDashboard } = makeCtx({ VehicleIntelligence });
  const hook = VehicleDashboard.getAIHook();
  assert.equal(hook.ok, true);
  assert.equal(hook.fleet, summary.fleet);
  assert.equal(hook.insights, summary.insights);
});

// ================= render() — guard =================

test('render() — container #vehdashGrid tidak ada di DOM: tidak error, tidak melempar', () => {
  const emptyDoc = { getElementById: () => null, querySelectorAll: () => [] };
  const { VehicleDashboard } = makeCtx({ document: emptyDoc, VehicleIntelligence: { summary: () => fullSummary() } });
  assert.doesNotThrow(() => VehicleDashboard.render());
});

test('render() — VehicleIntelligence belum dimuat: tampilkan empty state, tidak throw', () => {
  const { VehicleDashboard, fakeDocument } = makeCtx({ VehicleIntelligence: undefined });
  assert.doesNotThrow(() => VehicleDashboard.render());
  const html = fakeDocument.getElementById('vehdashGrid').innerHTML;
  assert.match(html, /belum tersedia/);
});

test('render() — totalVehicles 0 (belum ada kendaraan): tampilkan empty state, tidak throw', () => {
  const VehicleIntelligence = { summary: () => fullSummary({ fleet: { totalVehicles: 0, totalOverdue: 0, avgHealth: 0, vehicles: [] } }) };
  const { VehicleDashboard, fakeDocument } = makeCtx({ VehicleIntelligence });
  assert.doesNotThrow(() => VehicleDashboard.render());
  const html = fakeDocument.getElementById('vehdashGrid').innerHTML;
  assert.match(html, /Belum ada data kendaraan/);
});

// ================= render() — Total Kendaraan Card =================

test('render() — Total Kendaraan Card: dari fleet.totalVehicles apa adanya', () => {
  const VehicleIntelligence = { summary: () => fullSummary() };
  const { VehicleDashboard, fakeDocument } = makeCtx({ VehicleIntelligence });
  VehicleDashboard.render();
  const html = fakeDocument.getElementById('vehdashGrid').innerHTML;
  assert.match(html, /Total Kendaraan/);
  assert.match(html, /findash-card-val">3</);
});

// ================= render() — Servis Lewat Jatuh Tempo Card =================

test('render() — Servis Card: hijau kalau totalOverdue 0', () => {
  const VehicleIntelligence = { summary: () => fullSummary({ fleet: { totalVehicles: 2, totalOverdue: 0, avgHealth: 90, vehicles: [] } }) };
  const { VehicleDashboard, fakeDocument } = makeCtx({ VehicleIntelligence });
  VehicleDashboard.render();
  const html = fakeDocument.getElementById('vehdashGrid').innerHTML;
  assert.match(html, /Servis Lewat Jatuh Tempo/);
  assert.match(html, /class="findash-card-val green">0/);
});

test('render() — Servis Card: merah & tampilkan jumlah kalau totalOverdue > 0', () => {
  const VehicleIntelligence = { summary: () => fullSummary({ fleet: { totalVehicles: 2, totalOverdue: 3, avgHealth: 60, vehicles: [] } }) };
  const { VehicleDashboard, fakeDocument } = makeCtx({ VehicleIntelligence });
  VehicleDashboard.render();
  const html = fakeDocument.getElementById('vehdashGrid').innerHTML;
  assert.match(html, /class="findash-card-val red">3/);
});

// ================= render() — Skor Kesehatan Armada Card =================

test('render() — Health Card: skor dari fleet.avgHealth apa adanya, hijau kalau >=80', () => {
  const VehicleIntelligence = { summary: () => fullSummary({ fleet: { totalVehicles: 2, totalOverdue: 0, avgHealth: 85, vehicles: [] } }) };
  const { VehicleDashboard, fakeDocument } = makeCtx({ VehicleIntelligence });
  VehicleDashboard.render();
  const html = fakeDocument.getElementById('vehdashGrid').innerHTML;
  assert.match(html, /Skor Kesehatan Armada/);
  assert.match(html, /85\/100/);
  assert.match(html, /class="findash-card-val green"/);
});

test('render() — Health Card: merah kalau avgHealth < 40', () => {
  const VehicleIntelligence = { summary: () => fullSummary({ fleet: { totalVehicles: 2, totalOverdue: 5, avgHealth: 30, vehicles: [] } }) };
  const { VehicleDashboard, fakeDocument } = makeCtx({ VehicleIntelligence });
  VehicleDashboard.render();
  const html = fakeDocument.getElementById('vehdashGrid').innerHTML;
  assert.match(html, /class="findash-card-val red">30\/100/);
});

test('render() — semua 3 kartu tampil dalam satu render (Total Kendaraan, Servis, Health)', () => {
  const VehicleIntelligence = { summary: () => fullSummary() };
  const { VehicleDashboard, fakeDocument } = makeCtx({ VehicleIntelligence });
  VehicleDashboard.render();
  const html = fakeDocument.getElementById('vehdashGrid').innerHTML;
  ['Total Kendaraan', 'Servis Lewat Jatuh Tempo', 'Skor Kesehatan Armada'].forEach((label) => {
    assert.match(html, new RegExp(label));
  });
});
