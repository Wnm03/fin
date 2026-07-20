'use strict';
// tests/ai-status-card.test.js — modules/ai untuk UI: AIStatusCard (ai-chat.js,
// Sesi 28 lanjutan / TODO.md #6b, "Service Layer wiring — healthCheck()").
// Kartu status di dalam "🧭 Penasihat" > tab "🩺 Insight Cepat", DI BAWAH
// AIDailyBriefingCard — murni MEMBACA AIService.healthCheck() (tidak ada
// tombol/interaksi). Fokus test: render() ambil health dari
// AIService.healthCheck() lalu tulis ke #aiStatusBody, sembunyikan diri
// (innerHTML kosong) kalau sehat & tidak ada temuan informasional, tidak
// error kalau AIService belum ter-load atau healthCheck() melempar error.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/loadSource');
const { createFakeDocument } = require('../helpers/fakeDom');

function makeCtx({ healthCheckImpl } = {}) {
  const fakeDocument = createFakeDocument({ aiStatusBody: {} });
  const AIService = {
    healthCheck: async () => {
      if (healthCheckImpl) return healthCheckImpl();
      return { ok: true, checks: {} };
    },
  };
  const c = loadSource(['ai-chat.js'], {
    document: fakeDocument,
    AIService,
    escapeHtml: (s) => String(s),
  }, ['AIStatusCard']);
  return { AIStatusCard: c.AIStatusCard, fakeDocument };
}

test('render() — body dikosongkan kalau ok:true & tidak ada temuan informasional', async () => {
  const { AIStatusCard, fakeDocument } = makeCtx();
  await AIStatusCard.render();
  assert.equal(fakeDocument.getElementById('aiStatusBody').innerHTML, '');
});

test('render() — tidak melempar error kalau AIService belum ter-load', async () => {
  const fakeDocument = createFakeDocument({ aiStatusBody: {} });
  const c = loadSource(['ai-chat.js'], { document: fakeDocument }, ['AIStatusCard']);
  await assert.doesNotReject(() => c.AIStatusCard.render());
  assert.equal(fakeDocument.getElementById('aiStatusBody').innerHTML, '');
});

test('render() — tidak melempar error kalau AIService.healthCheck() melempar error, body tidak ditulis', async () => {
  const { AIStatusCard, fakeDocument } = makeCtx({
    healthCheckImpl: () => { throw new Error('gagal'); },
  });
  await assert.doesNotReject(() => AIStatusCard.render());
  assert.equal(fakeDocument.getElementById('aiStatusBody').innerHTML, '');
});

test('render() — tidak melempar error & body dikosongkan kalau healthCheck() balik null/undefined', async () => {
  const { AIStatusCard, fakeDocument } = makeCtx({ healthCheckImpl: () => null });
  await AIStatusCard.render();
  assert.equal(fakeDocument.getElementById('aiStatusBody').innerHTML, '');
});

test('render() — menulis peringatan ok:false ke #aiStatusBody', async () => {
  const { AIStatusCard, fakeDocument } = makeCtx({
    healthCheckImpl: () => ({ ok: false, checks: {} }),
  });
  await AIStatusCard.render();
  const html = fakeDocument.getElementById('aiStatusBody').innerHTML;
  assert.match(html, /Status AI/);
  assert.match(html, /belum siap/);
});

test('render() — menulis jumlah duplicateRuleIds kalau ada', async () => {
  const { AIStatusCard, fakeDocument } = makeCtx({
    healthCheckImpl: () => ({ ok: true, checks: { duplicateRuleIds: ['a', 'b'] } }),
  });
  await AIStatusCard.render();
  const html = fakeDocument.getElementById('aiStatusBody').innerHTML;
  assert.match(html, /2 rule terdaftar dobel/);
});

test('render() — menulis jumlah orphanedStorageKeys gabungan cooldown+learningData', async () => {
  const { AIStatusCard, fakeDocument } = makeCtx({
    healthCheckImpl: () => ({
      ok: true,
      checks: {
        orphanedStorageKeys: {
          orphanedCooldownRuleIds: ['r1'],
          orphanedLearningDataRuleIds: ['r2', 'r3'],
        },
      },
    }),
  });
  await AIStatusCard.render();
  const html = fakeDocument.getElementById('aiStatusBody').innerHTML;
  assert.match(html, /3 data tersimpan milik rule yang sudah dihapus/);
});

test('render() — ok:true tapi ada brokenRecommendationRefs tetap ditampilkan (bukan silent)', async () => {
  const { AIStatusCard, fakeDocument } = makeCtx({
    healthCheckImpl: () => ({ ok: true, checks: { brokenRecommendationRefs: ['dec_1'] } }),
  });
  await AIStatusCard.render();
  const html = fakeDocument.getElementById('aiStatusBody').innerHTML;
  assert.match(html, /1 referensi rekomendasi rusak/);
});
