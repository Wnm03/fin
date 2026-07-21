'use strict';
// tests/ai-daily-briefing-card.test.js — modules/ai untuk UI: AIDailyBriefingCard
// (ai-chat.js, lanjutan Sesi 15 / TODO.md #2, "Dashboard/nav wiring dailyBriefing()").
// Kartu ringkasan di dalam "🧭 Penasihat" > tab "🩺 Insight Cepat", DI BAWAH
// AIRecommendCard — murni MEMBACA AIService.dailyBriefing() (tidak ada tombol/
// interaksi, tidak ada localStorage dismiss, beda dari AIRecommendCard). Fokus
// test: render() ambil briefing dari AIService.dailyBriefing() lalu tulis ke
// #aiBriefingBody, sembunyikan diri (innerHTML kosong) kalau tidak ada apa pun
// buat ditampilkan (0 keputusan terbaru & tidak ada deliverySummary), tidak
// error kalau AIService belum ter-load atau dailyBriefing() melempar error.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeCtx({ dailyBriefingImpl } = {}) {
  const fakeDocument = createFakeDocument({ aiBriefingBody: {} });
  const AIService = {
    dailyBriefing: async (opts) => {
      if (dailyBriefingImpl) return dailyBriefingImpl(opts);
      return { generatedAt: new Date().toISOString(), recentDecisions: [], deliverySummary: null, recommendations: [] };
    },
  };
  const c = loadSource(['ai-chat.js'], {
    document: fakeDocument,
    AIService,
    escapeHtml: (s) => String(s),
    fmt: (n) => 'Rp' + n,
  }, ['AIDailyBriefingCard']);
  return { AIDailyBriefingCard: c.AIDailyBriefingCard, fakeDocument };
}

test('render() — body dikosongkan kalau tidak ada keputusan terbaru & tidak ada deliverySummary', async () => {
  const { AIDailyBriefingCard, fakeDocument } = makeCtx();
  await AIDailyBriefingCard.render();
  assert.equal(fakeDocument.getElementById('aiBriefingBody').innerHTML, '');
});

test('render() — tidak melempar error kalau AIService belum ter-load', async () => {
  const fakeDocument = createFakeDocument({ aiBriefingBody: {} });
  const c = loadSource(['ai-chat.js'], { document: fakeDocument }, ['AIDailyBriefingCard']);
  await assert.doesNotReject(() => c.AIDailyBriefingCard.render());
  assert.equal(fakeDocument.getElementById('aiBriefingBody').innerHTML, '');
});

test('render() — tidak melempar error kalau AIService.dailyBriefing() melempar error, body tidak ditulis', async () => {
  const { AIDailyBriefingCard, fakeDocument } = makeCtx({
    dailyBriefingImpl: () => { throw new Error('IDB gagal'); },
  });
  await assert.doesNotReject(() => AIDailyBriefingCard.render());
  assert.equal(fakeDocument.getElementById('aiBriefingBody').innerHTML, '');
});

test('render() — tidak melempar error & body dikosongkan kalau dailyBriefing() balik null/undefined', async () => {
  const { AIDailyBriefingCard, fakeDocument } = makeCtx({ dailyBriefingImpl: () => null });
  await AIDailyBriefingCard.render();
  assert.equal(fakeDocument.getElementById('aiBriefingBody').innerHTML, '');
});

test('render() — menulis jumlah keputusan terbaru ke #aiBriefingBody', async () => {
  const { AIDailyBriefingCard, fakeDocument } = makeCtx({
    dailyBriefingImpl: () => ({
      recentDecisions: [{ id: 'd1' }, { id: 'd2' }, { id: 'd3' }],
      deliverySummary: null,
    }),
  });
  await AIDailyBriefingCard.render();
  const html = fakeDocument.getElementById('aiBriefingBody').innerHTML;
  assert.match(html, /3 keputusan AI terbaru/);
  assert.match(html, /Ringkasan Harian AI/);
});

test('render() — menulis ringkasan deliverySummary (sourceOrderId + totalPenjualan) kalau ada', async () => {
  const { AIDailyBriefingCard, fakeDocument } = makeCtx({
    dailyBriefingImpl: () => ({
      recentDecisions: [],
      deliverySummary: { sourceOrderId: 42, profit: { totalPenjualan: 150000 } },
    }),
  });
  await AIDailyBriefingCard.render();
  const html = fakeDocument.getElementById('aiBriefingBody').innerHTML;
  assert.match(html, /#42/);
  assert.match(html, /Rp150000/);
  assert.match(html, /0 keputusan AI terbaru/); // tetap ditampilkan meski 0, krn deliverySummary ada
});

test('render() — deliverySummary tanpa field profit tidak melempar error, totalPenjualan dianggap 0', async () => {
  const { AIDailyBriefingCard, fakeDocument } = makeCtx({
    dailyBriefingImpl: () => ({
      recentDecisions: [],
      deliverySummary: { sourceOrderId: 7, profit: null },
    }),
  });
  await assert.doesNotReject(() => AIDailyBriefingCard.render());
  const html = fakeDocument.getElementById('aiBriefingBody').innerHTML;
  assert.match(html, /#7/);
  assert.match(html, /Rp0/);
});

test('render() — dipanggil dgn limit:5 ke AIService.dailyBriefing()', async () => {
  let capturedOpts = null;
  const { AIDailyBriefingCard } = makeCtx({
    dailyBriefingImpl: (opts) => { capturedOpts = opts; return { recentDecisions: [], deliverySummary: null }; },
  });
  await AIDailyBriefingCard.render();
  assert.equal(capturedOpts.limit, 5);
});
