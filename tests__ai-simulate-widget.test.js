'use strict';
// tests/ai-simulate-widget.test.js — modules/ai untuk UI: AISimulateWidget
// (ai-chat.js, Sesi 28 lanjutan / TODO.md #6b, "Service Layer wiring —
// simulate()"). Tombol "🧪 Simulasi Cepat (What-If)" di dalam "🧭 Penasihat" >
// tab "🔍 Laporan AI", DI BAWAH tombol Buat/Perbarui Analisis. Fokus test:
// run() panggil AIService.simulate({}) (TANPA ctx tambahan) lalu tulis hasil
// ke #aiSimulateBody, tidak error kalau AIService belum ter-load atau
// simulate() melempar error, guard `running` mencegah panggilan dobel.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeCtx({ simulateImpl } = {}) {
  const fakeDocument = createFakeDocument({ aiSimulateBody: {}, aiSimulateBtn: {} });
  let capturedCtx;
  const AIService = {
    simulate: async (ctx) => {
      capturedCtx = ctx;
      if (simulateImpl) return simulateImpl(ctx);
      return { decisions: [], triggered: [], recommendations: [], simulated: true };
    },
  };
  const c = loadSource(['ai-chat.js'], {
    document: fakeDocument,
    AIService,
    escapeHtml: (s) => String(s),
    toast: () => {},
  }, ['AISimulateWidget']);
  return { AISimulateWidget: c.AISimulateWidget, fakeDocument, getCtx: () => capturedCtx };
}

test('run() — memanggil AIService.simulate() dengan ctx kosong {}', async () => {
  const { AISimulateWidget, getCtx } = makeCtx();
  await AISimulateWidget.run();
  const ctx = getCtx();
  assert.equal(typeof ctx, 'object');
  assert.equal(Object.keys(ctx).length, 0);
});

test('run() — tidak melempar error kalau AIService belum ter-load', async () => {
  const fakeDocument = createFakeDocument({ aiSimulateBody: {}, aiSimulateBtn: {} });
  const c = loadSource(['ai-chat.js'], { document: fakeDocument, toast: () => {} }, ['AISimulateWidget']);
  await assert.doesNotReject(() => c.AISimulateWidget.run());
});

test('run() — tidak melempar error kalau AIService.simulate() melempar error', async () => {
  const { AISimulateWidget, fakeDocument } = makeCtx({
    simulateImpl: () => { throw new Error('gagal simulasi'); },
  });
  await assert.doesNotReject(() => AISimulateWidget.run());
  assert.equal(fakeDocument.getElementById('aiSimulateBtn').disabled, false);
});

test('run() — menulis pesan "tidak ada rule terpicu" kalau recommendations kosong', async () => {
  const { AISimulateWidget, fakeDocument } = makeCtx();
  await AISimulateWidget.run();
  const html = fakeDocument.getElementById('aiSimulateBody').innerHTML;
  assert.match(html, /tidak ada rule yang terpicu/);
});

test('run() — menulis daftar recommendations (title+reason) ke #aiSimulateBody', async () => {
  const { AISimulateWidget, fakeDocument } = makeCtx({
    simulateImpl: () => ({
      decisions: [],
      triggered: [],
      recommendations: [
        { id: 'sim_0_r1', title: 'Cicilan mendekati limit', reason: 'Sisa limit tipis' },
        { id: 'sim_1_r2', title: 'Stok menipis' },
      ],
      simulated: true,
    }),
  });
  await AISimulateWidget.run();
  const html = fakeDocument.getElementById('aiSimulateBody').innerHTML;
  assert.match(html, /2 rule terpicu/);
  assert.match(html, /Cicilan mendekati limit/);
  assert.match(html, /Sisa limit tipis/);
  assert.match(html, /Stok menipis/);
});

test('run() — tombol disabled selama berjalan lalu di-enable lagi setelah selesai', async () => {
  const { AISimulateWidget, fakeDocument } = makeCtx();
  const p = AISimulateWidget.run();
  await p;
  assert.equal(fakeDocument.getElementById('aiSimulateBtn').disabled, false);
});

test('run() — guard running mencegah panggilan dobel bersamaan', async () => {
  let callCount = 0;
  const { AISimulateWidget } = makeCtx({
    simulateImpl: () => {
      callCount += 1;
      return new Promise((resolve) => setTimeout(() => resolve({ recommendations: [] }), 10));
    },
  });
  const p1 = AISimulateWidget.run();
  const p2 = AISimulateWidget.run();
  await Promise.all([p1, p2]);
  assert.equal(callCount, 1);
});
