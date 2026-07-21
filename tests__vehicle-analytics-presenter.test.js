'use strict';
// tests/vehicle-analytics-presenter.test.js — VehicleAnalyticsPresenter
// (modules/vehicle/vehicle-analytics-presenter.js). Sesi 81 (Batch 7) —
// Vehicle Analytics Foundation: Total Biaya Card, Biaya BBM Card, Biaya
// Servis Card, Tren Biaya Card. Pola sama persis tests/vehicle-insight-
// presenter.test.js — dependency (VehicleCostSummary, VehicleIntelligence,
// escapeHtml, fmt) di-mock lewat loadSource extraGlobals (isolasi murni),
// UI (document) lewat fakeDom.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeDoc(initial = {}) {
  return createFakeDocument({ vehanalyticsGrid: {}, ...initial });
}

function makeCtx(opts = {}) {
  const { document: docOverride, ...rest } = opts;
  const fakeDocument = docOverride || makeDoc();
  const ctx = loadSource(['modules/vehicle/vehicle-analytics-presenter.js'], {
    escapeHtml: (s) => String(s ?? ''),
    fmt: (n) => 'Rp' + Math.round(n || 0),
    ...rest,
    document: fakeDocument,
  }, ['VehicleAnalyticsPresenter']);
  return { VehicleAnalyticsPresenter: ctx.VehicleAnalyticsPresenter, fakeDocument };
}

function costSummary(overrides = {}) {
  return Object.assign({
    ok: true,
    vehicleId: null,
    months: 6,
    rows: [],
    total: 550000,
    avgPerMonth: 183333,
    direction: 'down',
    totalFuel: 350000,
    totalService: 200000,
    lastMonth: { month: '2026-07', label: 'Jul 2026', fuel: 150000, service: 0, total: 150000 },
    prevMonth: { month: '2026-06', label: 'Jun 2026', fuel: 100000, service: 200000, total: 300000 },
  }, overrides);
}

function fleet(totalVehicles = 3) {
  return { fleetSummary: () => ({ totalVehicles, totalOverdue: 0, avgHealth: 80, vehicles: [] }) };
}

// ================= render() — guard =================

test('vehicle-analytics-presenter.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('render() — container #vehanalyticsGrid tidak ada di DOM: tidak throw', () => {
  const emptyDoc = { getElementById: () => null, querySelectorAll: () => [] };
  const { VehicleAnalyticsPresenter } = makeCtx({ document: emptyDoc, VehicleCostSummary: { summary: () => costSummary() }, VehicleIntelligence: fleet() });
  assert.doesNotThrow(() => VehicleAnalyticsPresenter.render());
});

test('render() — VehicleCostSummary belum dimuat: tampilkan empty state, tidak throw', () => {
  const { VehicleAnalyticsPresenter, fakeDocument } = makeCtx({ VehicleCostSummary: undefined });
  assert.doesNotThrow(() => VehicleAnalyticsPresenter.render());
  const html = fakeDocument.getElementById('vehanalyticsGrid').innerHTML;
  assert.match(html, /belum tersedia/);
});

test('render() — VehicleCostSummary.summary() ok:false: tampilkan empty state, tidak throw', () => {
  const VehicleCostSummary = { summary: () => ({ ok: false, reason: 'VehicleTrendAPI belum dimuat' }) };
  const { VehicleAnalyticsPresenter, fakeDocument } = makeCtx({ VehicleCostSummary });
  assert.doesNotThrow(() => VehicleAnalyticsPresenter.render());
  const html = fakeDocument.getElementById('vehanalyticsGrid').innerHTML;
  assert.match(html, /belum tersedia/);
});

test('render() — VehicleIntelligence belum dimuat (guard totalVehicles): tampilkan "Belum ada data kendaraan"', () => {
  const VehicleCostSummary = { summary: () => costSummary() };
  const { VehicleAnalyticsPresenter, fakeDocument } = makeCtx({ VehicleCostSummary, VehicleIntelligence: undefined });
  assert.doesNotThrow(() => VehicleAnalyticsPresenter.render());
  const html = fakeDocument.getElementById('vehanalyticsGrid').innerHTML;
  assert.match(html, /Belum ada data kendaraan/);
});

test('render() — totalVehicles 0 (belum ada kendaraan): tampilkan empty state, tidak throw', () => {
  const VehicleCostSummary = { summary: () => costSummary() };
  const { VehicleAnalyticsPresenter, fakeDocument } = makeCtx({ VehicleCostSummary, VehicleIntelligence: fleet(0) });
  assert.doesNotThrow(() => VehicleAnalyticsPresenter.render());
  const html = fakeDocument.getElementById('vehanalyticsGrid').innerHTML;
  assert.match(html, /Belum ada data kendaraan/);
});

// ================= render() — kartu =================

test('render() — Total Biaya Card: value dari VehicleCostSummary.summary().total apa adanya (reuse fmt)', () => {
  const VehicleCostSummary = { summary: () => costSummary() };
  const { VehicleAnalyticsPresenter, fakeDocument } = makeCtx({ VehicleCostSummary, VehicleIntelligence: fleet() });
  VehicleAnalyticsPresenter.render();
  const html = fakeDocument.getElementById('vehanalyticsGrid').innerHTML;
  assert.match(html, /Total Biaya Kendaraan \(6 Bulan\)/);
  assert.match(html, /Rp550000/);
  assert.match(html, /Rp183333\/bulan/);
});

test('render() — Biaya BBM Card: value dari totalFuel apa adanya', () => {
  const VehicleCostSummary = { summary: () => costSummary() };
  const { VehicleAnalyticsPresenter, fakeDocument } = makeCtx({ VehicleCostSummary, VehicleIntelligence: fleet() });
  VehicleAnalyticsPresenter.render();
  const html = fakeDocument.getElementById('vehanalyticsGrid').innerHTML;
  assert.match(html, /Total Biaya BBM/);
  assert.match(html, /Rp350000/);
});

test('render() — Biaya Servis Card: value dari totalService apa adanya', () => {
  const VehicleCostSummary = { summary: () => costSummary() };
  const { VehicleAnalyticsPresenter, fakeDocument } = makeCtx({ VehicleCostSummary, VehicleIntelligence: fleet() });
  VehicleAnalyticsPresenter.render();
  const html = fakeDocument.getElementById('vehanalyticsGrid').innerHTML;
  assert.match(html, /Total Biaya Servis/);
  assert.match(html, /Rp200000/);
});

test('render() — Tren Card: "Turun" & class hijau kalau direction "down"', () => {
  const VehicleCostSummary = { summary: () => costSummary({ direction: 'down' }) };
  const { VehicleAnalyticsPresenter, fakeDocument } = makeCtx({ VehicleCostSummary, VehicleIntelligence: fleet() });
  VehicleAnalyticsPresenter.render();
  const html = fakeDocument.getElementById('vehanalyticsGrid').innerHTML;
  assert.match(html, /class="findash-card-val green">Turun/);
});

test('render() — Tren Card: "Naik" & class merah kalau direction "up"', () => {
  const VehicleCostSummary = { summary: () => costSummary({ direction: 'up' }) };
  const { VehicleAnalyticsPresenter, fakeDocument } = makeCtx({ VehicleCostSummary, VehicleIntelligence: fleet() });
  VehicleAnalyticsPresenter.render();
  const html = fakeDocument.getElementById('vehanalyticsGrid').innerHTML;
  assert.match(html, /class="findash-card-val red">Naik/);
});

test('render() — Tren Card: "Tetap" kalau direction "flat", tanpa sub kalau prevMonth null', () => {
  const VehicleCostSummary = { summary: () => costSummary({ direction: 'flat', prevMonth: null }) };
  const { VehicleAnalyticsPresenter, fakeDocument } = makeCtx({ VehicleCostSummary, VehicleIntelligence: fleet() });
  VehicleAnalyticsPresenter.render();
  const html = fakeDocument.getElementById('vehanalyticsGrid').innerHTML;
  assert.match(html, /class="findash-card-val">Tetap/);
});

test('render() — semua 4 kartu tampil dalam satu render', () => {
  const VehicleCostSummary = { summary: () => costSummary() };
  const { VehicleAnalyticsPresenter, fakeDocument } = makeCtx({ VehicleCostSummary, VehicleIntelligence: fleet() });
  VehicleAnalyticsPresenter.render();
  const html = fakeDocument.getElementById('vehanalyticsGrid').innerHTML;
  ['Total Biaya Kendaraan', 'Total Biaya BBM', 'Total Biaya Servis', 'Tren Biaya Bulan Terakhir'].forEach((label) => {
    assert.match(html, new RegExp(label));
  });
});
