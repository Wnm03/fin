'use strict';
// tests/cross-dashboard-card.test.js — CrossDashboardCard (modules/cross/
// cross-dashboard-card.js). Sesi 87 (Batch 8) — Finance & Vehicle Cross
// Integration Foundation: Unified Dashboard Card — Skor Kesehatan
// Finansial, Skor Kesehatan Armada, Total Perhatian Gabungan. Pola sama
// persis tests/vehicle-insight-presenter.test.js — dependency (CrossAIHook,
// escapeHtml) di-mock lewat loadSource extraGlobals (isolasi murni), UI
// (document) lewat fakeDom.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeDoc(initial = {}) {
  return createFakeDocument({ crossDashGrid: {}, ...initial });
}

function makeCtx(opts = {}) {
  const { document: docOverride, ...rest } = opts;
  const fakeDocument = docOverride || makeDoc();
  const ctx = loadSource(['modules/cross/cross-dashboard-card.js'], {
    escapeHtml: (s) => String(s ?? ''),
    ...rest,
    document: fakeDocument,
  }, ['CrossDashboardCard']);
  return { CrossDashboardCard: ctx.CrossDashboardCard, fakeDocument };
}

function fullHook(overrides = {}) {
  return Object.assign({
    ok: true,
    finance: {
      ok: true,
      budget: { ok: true, totalLimit: 1000, totalUsed: 200, overallPct: 0.2, overCount: 0 },
      healthScore: { score: 82, label: 'Sehat', parts: [] },
    },
    vehicle: {
      ok: true,
      intelligence: { fleet: { totalVehicles: 3, totalOverdue: 0, avgHealth: 85, vehicles: [] }, insights: [] },
      reminder: { total: 0, overdueCount: 0, dueSoonCount: 0, infoCount: 0, service: [], tax: [], fuel: [], all: [] },
    },
  }, overrides);
}

// ================= render() — guard =================

test('cross-dashboard-card.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('render() — container #crossDashGrid tidak ada di DOM: tidak throw', () => {
  const emptyDoc = { getElementById: () => null, querySelectorAll: () => [] };
  const { CrossDashboardCard } = makeCtx({ document: emptyDoc, CrossAIHook: { getAIHook: () => fullHook() } });
  assert.doesNotThrow(() => CrossDashboardCard.render());
});

test('render() — CrossAIHook belum dimuat: tampilkan empty state, tidak throw', () => {
  const { CrossDashboardCard, fakeDocument } = makeCtx({ CrossAIHook: undefined });
  assert.doesNotThrow(() => CrossDashboardCard.render());
  const html = fakeDocument.getElementById('crossDashGrid').innerHTML;
  assert.match(html, /belum tersedia/);
});

test('render() — getAIHook() ok:false: tampilkan empty state, tidak throw', () => {
  const CrossAIHook = { getAIHook: () => ({ ok: false, reason: 'FinanceDashboard belum dimuat' }) };
  const { CrossDashboardCard, fakeDocument } = makeCtx({ CrossAIHook });
  assert.doesNotThrow(() => CrossDashboardCard.render());
  const html = fakeDocument.getElementById('crossDashGrid').innerHTML;
  assert.match(html, /belum tersedia/);
});

// ================= render() — Skor Kesehatan Finansial Card =================

test('render() — Skor Kesehatan Finansial: hijau kalau score >= 80', () => {
  const CrossAIHook = { getAIHook: () => fullHook() };
  const { CrossDashboardCard, fakeDocument } = makeCtx({ CrossAIHook });
  CrossDashboardCard.render();
  const html = fakeDocument.getElementById('crossDashGrid').innerHTML;
  assert.match(html, /Skor Kesehatan Finansial/);
  assert.match(html, /class="findash-card-val green">82\/100/);
});

test('render() — Skor Kesehatan Finansial: — kalau finance.ok false', () => {
  const CrossAIHook = { getAIHook: () => fullHook({ finance: { ok: false, reason: 'x' } }) };
  const { CrossDashboardCard, fakeDocument } = makeCtx({ CrossAIHook });
  CrossDashboardCard.render();
  const html = fakeDocument.getElementById('crossDashGrid').innerHTML;
  assert.match(html, /class="findash-card-val">—/);
});

// ================= render() — Skor Kesehatan Armada Card =================

test('render() — Skor Kesehatan Armada: reuse avgHealth apa adanya', () => {
  const CrossAIHook = { getAIHook: () => fullHook() };
  const { CrossDashboardCard, fakeDocument } = makeCtx({ CrossAIHook });
  CrossDashboardCard.render();
  const html = fakeDocument.getElementById('crossDashGrid').innerHTML;
  assert.match(html, /Skor Kesehatan Armada/);
  assert.match(html, /class="findash-card-val green">85\/100/);
});

test('render() — Skor Kesehatan Armada: — kalau belum ada kendaraan', () => {
  const CrossAIHook = { getAIHook: () => fullHook({ vehicle: { ok: true, intelligence: { fleet: { totalVehicles: 0, avgHealth: 0 } }, reminder: {} } }) };
  const { CrossDashboardCard, fakeDocument } = makeCtx({ CrossAIHook });
  CrossDashboardCard.render();
  const html = fakeDocument.getElementById('crossDashGrid').innerHTML;
  assert.match(html, /Skor Kesehatan Armada[\s\S]*?class="findash-card-val">—/);
});

// ================= render() — Total Perhatian Gabungan Card =================

test('render() — Total Perhatian Gabungan: hijau & 0 kalau tidak ada overCount/overdueCount', () => {
  const CrossAIHook = { getAIHook: () => fullHook() };
  const { CrossDashboardCard, fakeDocument } = makeCtx({ CrossAIHook });
  CrossDashboardCard.render();
  const html = fakeDocument.getElementById('crossDashGrid').innerHTML;
  assert.match(html, /Total Perhatian Gabungan/);
  assert.match(html, /class="findash-card-val green">0/);
});

test('render() — Total Perhatian Gabungan: penjumlahan MURNI budget.overCount + vehicle.reminder.overdueCount, 0 rumus baru', () => {
  const hook = fullHook({
    finance: { ok: true, budget: { ok: true, overCount: 2 }, healthScore: { score: 60, label: 'Cukup Sehat' } },
    vehicle: {
      ok: true,
      intelligence: { fleet: { totalVehicles: 2, avgHealth: 70 } },
      reminder: { overdueCount: 3 },
    },
  });
  const CrossAIHook = { getAIHook: () => hook };
  const { CrossDashboardCard, fakeDocument } = makeCtx({ CrossAIHook });
  CrossDashboardCard.render();
  const html = fakeDocument.getElementById('crossDashGrid').innerHTML;
  assert.match(html, /class="findash-card-val orange">5/);
  assert.match(html, /2 anggaran lewat batas/);
  assert.match(html, /3 servis\/pajak\/BBM lewat jatuh tempo/);
});

test('render() — semua 3 kartu tampil dalam satu render', () => {
  const CrossAIHook = { getAIHook: () => fullHook() };
  const { CrossDashboardCard, fakeDocument } = makeCtx({ CrossAIHook });
  CrossDashboardCard.render();
  const html = fakeDocument.getElementById('crossDashGrid').innerHTML;
  ['Skor Kesehatan Finansial', 'Skor Kesehatan Armada', 'Total Perhatian Gabungan'].forEach((label) => {
    assert.match(html, new RegExp(label));
  });
});
