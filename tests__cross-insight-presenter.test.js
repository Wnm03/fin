'use strict';
// tests/cross-insight-presenter.test.js — CrossInsightPresenter
// (modules/cross/cross-insight-presenter.js). Sesi 87 (Batch 8) — Finance
// & Vehicle Cross Integration Foundation: Shared Insight Presenter, feed
// gabungan FinanceIntelligence.insights() + VehicleIntelligence.insights()
// (fleet-level). Pola sama persis tests/vehicle-insight-presenter.test.js
// — dependency di-mock lewat loadSource extraGlobals (isolasi murni), UI
// (document) lewat fakeDom.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeDoc(initial = {}) {
  return createFakeDocument({ crossInsightBody: {}, ...initial });
}

function makeCtx(opts = {}) {
  const { document: docOverride, ...rest } = opts;
  const fakeDocument = docOverride || makeDoc();
  const ctx = loadSource(['modules/cross/cross-insight-presenter.js'], {
    escapeHtml: (s) => String(s ?? ''),
    ...rest,
    document: fakeDocument,
  }, ['CrossInsightPresenter']);
  return { CrossInsightPresenter: ctx.CrossInsightPresenter, fakeDocument };
}

test('cross-insight-presenter.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('render() — container #crossInsightBody tidak ada di DOM: tidak throw', () => {
  const emptyDoc = { getElementById: () => null, querySelectorAll: () => [] };
  const { CrossInsightPresenter } = makeCtx({ document: emptyDoc });
  assert.doesNotThrow(() => CrossInsightPresenter.render());
});

test('render() — FinanceIntelligence & VehicleIntelligence belum dimuat: body kosong, tidak throw', () => {
  const { CrossInsightPresenter, fakeDocument } = makeCtx({ FinanceIntelligence: undefined, VehicleIntelligence: undefined });
  assert.doesNotThrow(() => CrossInsightPresenter.render());
  assert.equal(fakeDocument.getElementById('crossInsightBody').innerHTML, '');
});

test('render() — kedua sisi 0 insight: body kosong (SILENT), tidak throw', () => {
  const FinanceIntelligence = { insights: () => [] };
  const VehicleIntelligence = { insights: () => [] };
  const { CrossInsightPresenter, fakeDocument } = makeCtx({ FinanceIntelligence, VehicleIntelligence });
  CrossInsightPresenter.render();
  assert.equal(fakeDocument.getElementById('crossInsightBody').innerHTML, '');
});

test('render() — hanya FinanceIntelligence.insights() tersedia: tampilkan insight finance saja', () => {
  const FinanceIntelligence = { insights: () => [{ type: 'warning', code: 'deficit', message: 'Pengeluaran melebihi pemasukan.' }] };
  const { CrossInsightPresenter, fakeDocument } = makeCtx({ FinanceIntelligence, VehicleIntelligence: undefined });
  CrossInsightPresenter.render();
  const html = fakeDocument.getElementById('crossInsightBody').innerHTML;
  assert.match(html, /Pengeluaran melebihi pemasukan/);
});

test('render() — hanya VehicleIntelligence.insights() tersedia: tampilkan insight vehicle saja', () => {
  const VehicleIntelligence = { insights: (vehicleId) => { assert.equal(vehicleId, undefined); return [{ type: 'info', code: 'fleet_health', message: 'Rata-rata skor kesehatan armada: 80/100.' }]; } };
  const { CrossInsightPresenter, fakeDocument } = makeCtx({ FinanceIntelligence: undefined, VehicleIntelligence });
  CrossInsightPresenter.render();
  const html = fakeDocument.getElementById('crossInsightBody').innerHTML;
  assert.match(html, /Rata-rata skor kesehatan armada/);
});

test('render() — gabungan finance + vehicle: keduanya tampil, urutan finance dulu baru vehicle, 0 duplikasi', () => {
  const FinanceIntelligence = { insights: () => [{ type: 'warning', code: 'deficit', message: 'Insight finance A' }] };
  const VehicleIntelligence = { insights: () => [{ type: 'warning', code: 'fleet_overdue', message: 'Insight vehicle B' }] };
  const { CrossInsightPresenter, fakeDocument } = makeCtx({ FinanceIntelligence, VehicleIntelligence });
  CrossInsightPresenter.render();
  const html = fakeDocument.getElementById('crossInsightBody').innerHTML;
  assert.match(html, /Insight finance A/);
  assert.match(html, /Insight vehicle B/);
  assert.ok(html.indexOf('Insight finance A') < html.indexOf('Insight vehicle B'));
});

test('render() — ikon per type: warning=🟡, positive=🟢, info=ℹ️', () => {
  const FinanceIntelligence = {
    insights: () => [
      { type: 'warning', code: 'a', message: 'Pesan warning' },
      { type: 'positive', code: 'b', message: 'Pesan positive' },
      { type: 'info', code: 'c', message: 'Pesan info' },
    ],
  };
  const { CrossInsightPresenter, fakeDocument } = makeCtx({ FinanceIntelligence, VehicleIntelligence: undefined });
  CrossInsightPresenter.render();
  const html = fakeDocument.getElementById('crossInsightBody').innerHTML;
  assert.match(html, /🟡 Pesan warning/);
  assert.match(html, /🟢 Pesan positive/);
  assert.match(html, /ℹ️ Pesan info/);
});
