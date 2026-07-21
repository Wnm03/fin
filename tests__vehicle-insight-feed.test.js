'use strict';
// tests/vehicle-insight-feed.test.js — VehicleInsightFeed (modules/vehicle/
// vehicle-insight-feed.js). Sesi 80 (Batch 7) — Vehicle AI Dashboard
// Integration: feed insight fleet-level + reminder due-soon. Pola sama
// persis tests/vehicle-dashboard.test.js — dependency (VehicleAIHook,
// escapeHtml) di-mock lewat loadSource extraGlobals, DOM lewat fakeDom.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeDoc(initial = {}) {
  return createFakeDocument({ vehInsightFeedBody: {}, ...initial });
}

function makeCtx(opts = {}) {
  const { document: docOverride, ...rest } = opts;
  const fakeDocument = docOverride || makeDoc();
  const ctx = loadSource(['modules/vehicle/vehicle-insight-feed.js'], {
    escapeHtml: (s) => String(s ?? ''),
    ...rest,
    document: fakeDocument,
  }, ['VehicleInsightFeed']);
  return { VehicleInsightFeed: ctx.VehicleInsightFeed, fakeDocument };
}

function makeHook(insights, all) {
  return {
    ok: true,
    intelligence: { fleet: { totalVehicles: 2, totalOverdue: 0, avgHealth: 80, vehicles: [] }, insights },
    reminder: { total: all.length, overdueCount: 0, dueSoonCount: all.filter((r) => r.severity === 'due-soon').length, infoCount: 0, service: [], tax: [], fuel: [], all },
  };
}

test('vehicle-insight-feed.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('render() — container #vehInsightFeedBody tidak ada di DOM: tidak throw', () => {
  const emptyDoc = { getElementById: () => null, querySelectorAll: () => [] };
  const { VehicleInsightFeed } = makeCtx({ document: emptyDoc, VehicleAIHook: { fleetSummary: () => makeHook([], []) } });
  assert.doesNotThrow(() => VehicleInsightFeed.render());
});

test('render() — VehicleAIHook belum dimuat: tampilkan pesan kosong, tidak throw', () => {
  const { VehicleInsightFeed, fakeDocument } = makeCtx({ VehicleAIHook: undefined });
  assert.doesNotThrow(() => VehicleInsightFeed.render());
  const html = fakeDocument.getElementById('vehInsightFeedBody').innerHTML;
  assert.match(html, /Belum ada insight/);
});

test('render() — fleetSummary() ok:false: tampilkan pesan kosong, tidak throw', () => {
  const VehicleAIHook = { fleetSummary: () => ({ ok: false, reason: 'x' }) };
  const { VehicleInsightFeed, fakeDocument } = makeCtx({ VehicleAIHook });
  assert.doesNotThrow(() => VehicleInsightFeed.render());
  const html = fakeDocument.getElementById('vehInsightFeedBody').innerHTML;
  assert.match(html, /Belum ada insight/);
});

test('render() — insights kosong & tidak ada reminder due-soon: tampilkan pesan "semua aman"', () => {
  const VehicleAIHook = { fleetSummary: () => makeHook([], []) };
  const { VehicleInsightFeed, fakeDocument } = makeCtx({ VehicleAIHook });
  VehicleInsightFeed.render();
  const html = fakeDocument.getElementById('vehInsightFeedBody').innerHTML;
  assert.match(html, /semua kondisi armada aman/);
});

test('render() — gabungan intelligence.insights + reminder severity due-soon, 0 transformasi pesan', () => {
  const insights = [{ type: 'warning', code: 'fleet_overdue', message: '2 item servis lewat jatuh tempo.' }];
  const all = [
    { type: 'tax', severity: 'due-soon', message: 'STNK Mobil B segera jatuh tempo.' },
    { type: 'service', severity: 'overdue', message: 'INI TIDAK BOLEH TAMPIL.' },
  ];
  const VehicleAIHook = { fleetSummary: () => makeHook(insights, all) };
  const { VehicleInsightFeed, fakeDocument } = makeCtx({ VehicleAIHook });
  VehicleInsightFeed.render();
  const html = fakeDocument.getElementById('vehInsightFeedBody').innerHTML;
  assert.match(html, /2 item servis lewat jatuh tempo\./);
  assert.match(html, /STNK Mobil B segera jatuh tempo\./);
  assert.doesNotMatch(html, /INI TIDAK BOLEH TAMPIL/);
});

test('render() — dibatasi maksimal 8 item', () => {
  const insights = Array.from({ length: 10 }, (_, i) => ({ type: 'info', code: `x${i}`, message: `Insight ke-${i}` }));
  const VehicleAIHook = { fleetSummary: () => makeHook(insights, []) };
  const { VehicleInsightFeed, fakeDocument } = makeCtx({ VehicleAIHook });
  VehicleInsightFeed.render();
  const html = fakeDocument.getElementById('vehInsightFeedBody').innerHTML;
  const count = (html.match(/Insight ke-/g) || []).length;
  assert.equal(count, 8);
});
