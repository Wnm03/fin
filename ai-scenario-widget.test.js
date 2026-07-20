'use strict';
// tests/ai-scenario-widget.test.js — modules/ai untuk UI: AIScenarioWidget
// (ai-chat.js, Sesi 48, kandidat Batch 2 #1 "UI wiring simulateScenarios()").
// Tombol "📊 Bandingkan Skenario Pengiriman" di dalam "🧭 Penasihat" > tab
// "🔍 Laporan AI", DI BAWAH tombol AISimulateWidget. Fokus test:
// buildScenariosFromPendingCobek() murni (filter+map dari D.cobek, TIDAK
// menyentuh DOM), run() panggil AIService.simulateScenarios() dgn skenario
// hasil build itu, tulis hasil ke #aiScenarioBody, tidak error kalau
// AIService/D belum ter-load atau simulateScenarios() melempar error, guard
// `running` mencegah panggilan dobel, pesan kosong kalau tidak ada order
// Cobek pending.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/loadSource');
const { createFakeDocument } = require('../helpers/fakeDom');

function makeCtx({ simulateScenariosImpl, D } = {}) {
  const fakeDocument = createFakeDocument({ aiScenarioBody: {}, aiScenarioBtn: {} });
  let capturedScenarios;
  const AIService = {
    simulateScenarios: async (scenarios) => {
      capturedScenarios = scenarios;
      if (simulateScenariosImpl) return simulateScenariosImpl(scenarios);
      return scenarios.map((s) => ({
        name: s.name, ctx: s.ctx, result: { recommendations: [] }, error: null,
      }));
    },
  };
  const c = loadSource(['ai-chat.js'], {
    document: fakeDocument,
    AIService,
    D,
    escapeHtml: (s) => String(s),
    toast: () => {},
  }, ['AIScenarioWidget']);
  return { AIScenarioWidget: c.AIScenarioWidget, fakeDocument, getScenarios: () => capturedScenarios };
}

const pendingD = {
  cobek: [
    { id: 1, items: [{ productId: 'p1', qty: 1 }], total: 100000, diskon: 0, delivered: false },
    { id: 2, items: [{ productId: 'p2', qty: 1 }], total: 200000, diskon: 5000, delivered: false },
    { id: 3, items: [{ productId: 'p3', qty: 1 }], total: 300000, diskon: 0, delivered: true },
  ],
};

// Catatan: JSON.stringify (bukan deepEqual langsung) krn array dibuat di
// realm vm sandbox berbeda (lihat tests/ai-service.test.js sekitar baris
// 213/320 utk penjelasan sama) — bukan bug di implementasi.
test('buildScenariosFromPendingCobek() — balik [] kalau D belum ada', () => {
  const { AIScenarioWidget } = makeCtx();
  assert.equal(JSON.stringify(AIScenarioWidget.buildScenariosFromPendingCobek()), '[]');
});

test('buildScenariosFromPendingCobek() — balik [] kalau D.cobek bukan array', () => {
  const { AIScenarioWidget } = makeCtx({ D: {} });
  assert.equal(JSON.stringify(AIScenarioWidget.buildScenariosFromPendingCobek()), '[]');
});

test('buildScenariosFromPendingCobek() — hanya order dgn delivered===false, urut id descending', () => {
  const { AIScenarioWidget } = makeCtx({ D: pendingD });
  const scenarios = AIScenarioWidget.buildScenariosFromPendingCobek();
  assert.equal(scenarios.length, 2);
  assert.equal(scenarios[0].name, 'Order Cobek #2');
  assert.equal(scenarios[1].name, 'Order Cobek #1');
});

test('buildScenariosFromPendingCobek() — ctx.delivery berisi totalPenjualan+diskon apa adanya', () => {
  const { AIScenarioWidget } = makeCtx({ D: pendingD });
  const scenarios = AIScenarioWidget.buildScenariosFromPendingCobek();
  assert.equal(JSON.stringify(scenarios[0].ctx), JSON.stringify({ delivery: { totalPenjualan: 200000, diskon: 5000 } }));
  assert.equal(JSON.stringify(scenarios[1].ctx), JSON.stringify({ delivery: { totalPenjualan: 100000, diskon: 0 } }));
});

test('run() — memanggil AIService.simulateScenarios() dgn skenario dari order pending', async () => {
  const { AIScenarioWidget, getScenarios } = makeCtx({ D: pendingD });
  await AIScenarioWidget.run();
  const scenarios = getScenarios();
  assert.equal(scenarios.length, 2);
  assert.equal(scenarios[0].name, 'Order Cobek #2');
});

test('run() — tidak melempar error kalau AIService belum ter-load', async () => {
  const fakeDocument = createFakeDocument({ aiScenarioBody: {}, aiScenarioBtn: {} });
  const c = loadSource(['ai-chat.js'], { document: fakeDocument, D: pendingD, toast: () => {} }, ['AIScenarioWidget']);
  await assert.doesNotReject(() => c.AIScenarioWidget.run());
});

test('run() — tidak melempar error kalau D tidak ada order pending (pesan kosong, simulateScenarios TIDAK dipanggil)', async () => {
  let called = false;
  const { AIScenarioWidget, fakeDocument } = makeCtx({
    D: { cobek: [] },
    simulateScenariosImpl: () => { called = true; return []; },
  });
  await AIScenarioWidget.run();
  assert.equal(called, false);
  const html = fakeDocument.getElementById('aiScenarioBody').innerHTML;
  assert.match(html, /Tidak ada order Cobek pending/);
});

test('run() — tidak melempar error kalau AIService.simulateScenarios() melempar error', async () => {
  const { AIScenarioWidget, fakeDocument } = makeCtx({
    D: pendingD,
    simulateScenariosImpl: () => { throw new Error('gagal skenario'); },
  });
  await assert.doesNotReject(() => AIScenarioWidget.run());
  assert.equal(fakeDocument.getElementById('aiScenarioBtn').disabled, false);
});

test('run() — menulis daftar hasil (nama+jumlah rule terpicu) ke #aiScenarioBody', async () => {
  const { AIScenarioWidget, fakeDocument } = makeCtx({
    D: pendingD,
    simulateScenariosImpl: (scenarios) => scenarios.map((s) => ({
      name: s.name,
      ctx: s.ctx,
      result: { recommendations: [{ id: 'r1', title: 'Margin tipis' }] },
      error: null,
    })),
  });
  await AIScenarioWidget.run();
  const html = fakeDocument.getElementById('aiScenarioBody').innerHTML;
  assert.match(html, /Order Cobek #2/);
  assert.match(html, /Order Cobek #1/);
  assert.match(html, /1 rule terpicu/);
  assert.match(html, /Margin tipis/);
});

test('run() — menandai skenario error individual TANPA menjatuhkan skenario lain', async () => {
  const { AIScenarioWidget, fakeDocument } = makeCtx({
    D: pendingD,
    simulateScenariosImpl: (scenarios) => [
      { name: scenarios[0].name, ctx: scenarios[0].ctx, result: null, error: 'boom' },
      { name: scenarios[1].name, ctx: scenarios[1].ctx, result: { recommendations: [] }, error: null },
    ],
  });
  await AIScenarioWidget.run();
  const html = fakeDocument.getElementById('aiScenarioBody').innerHTML;
  assert.match(html, /gagal: boom/);
  assert.match(html, /tidak ada rule terpicu/);
});

test('run() — tombol disabled selama berjalan lalu di-enable lagi setelah selesai', async () => {
  const { AIScenarioWidget, fakeDocument } = makeCtx({ D: pendingD });
  const p = AIScenarioWidget.run();
  await p;
  assert.equal(fakeDocument.getElementById('aiScenarioBtn').disabled, false);
});

test('run() — guard running mencegah panggilan dobel bersamaan', async () => {
  let callCount = 0;
  const { AIScenarioWidget } = makeCtx({
    D: pendingD,
    simulateScenariosImpl: (scenarios) => {
      callCount += 1;
      return new Promise((resolve) => setTimeout(() => resolve(scenarios.map((s) => ({
        name: s.name, ctx: s.ctx, result: { recommendations: [] }, error: null,
      }))), 10));
    },
  });
  const p1 = AIScenarioWidget.run();
  const p2 = AIScenarioWidget.run();
  await Promise.all([p1, p2]);
  assert.equal(callCount, 1);
});
