'use strict';
// tests/eie-insight-feed.test.js — EIEInsightFeed.render() (ui/eie-insight-feed.js).
// Fokus: baris rekomendasi ("→ ...") sekarang HARUS dibungkus data-action=
// "dashHubNavigateToFeature" + data-args berisi rec.target APA ADANYA (bukan
// mekanisme navigasi baru) — dan tetap fallback aman (teks statis, tanpa
// data-action) kalau rec/rec.target tidak ada. recommendation-service.js
// di-load ASLI (bukan disalin ulang) supaya rec.target yang dicek benar2
// datang dari EIE_RECOMMENDATIONS yang sebenarnya.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function loadFeed({ insights, extraGlobals = {}, useRealRecommendationService = true } = {}) {
  const fakeDocument = createFakeDocument({ eieInsightFeed: {} });
  const files = ['helper-teks.js']; // escapeHtml
  // recommendation-service.js deklarasi top-level `const RecommendationService`
  // -> kalau di-load, itu SELALU menang atas override lewat extraGlobals (const
  // baru di context yang sama menimpa binding lama). Jadi utk test yang perlu
  // RecommendationService palsu (mis. simulasi target kosong), file aslinya
  // SENGAJA tidak ikut di-load di sini.
  if (useRealRecommendationService) files.push('economic-intelligence/services/recommendation-service.js');
  files.push('economic-intelligence/ui/eie-insight-feed.js');
  const ctx = loadSource(
    files,
    {
      InsightGenerator: { list: async () => insights || [] },
      document: fakeDocument,
      ...extraGlobals,
    },
    ['EIEInsightFeed'],
  );
  return { EIEInsightFeed: ctx.EIEInsightFeed, fakeDocument };
}

test('render() — insight dgn recommendationId yang punya target: baris rekomendasi dibungkus data-action=dashHubNavigateToFeature + data-args=target', async () => {
  const { EIEInsightFeed, fakeDocument } = loadFeed({
    insights: [
      { severity: 'warning', message: 'Dana darurat menipis', recommendationId: 'REC-BOOST-EMERGENCY-FUND', dismissed: false },
    ],
  });
  await EIEInsightFeed.render();
  const html = fakeDocument.getElementById('eieInsightFeed').innerHTML;
  assert.match(html, /data-action="dashHubNavigateToFeature"/);
  assert.match(html, /data-args='\[\{&quot;page&quot;:&quot;dashboard-hub&quot;,&quot;goTo&quot;:&quot;lifeBalanceCard&quot;\}\]'/);
  assert.match(html, /→ Tambah alokasi ke Target Dana Darurat/);
  assert.match(html, /class="u-pointer"/, 'baris rekomendasi harus punya class cursor:pointer supaya terlihat bisa diklik');
});

test('render() — recommendationId dgn target {page, tab}: data-args ikut membawa tab-nya', async () => {
  const { EIEInsightFeed, fakeDocument } = loadFeed({
    insights: [
      { severity: 'critical', message: 'Biaya impor naik', recommendationId: 'REC-REVIEW-BUDGET-IMPORT', dismissed: false },
    ],
  });
  await EIEInsightFeed.render();
  const html = fakeDocument.getElementById('eieInsightFeed').innerHTML;
  assert.match(html, /data-args='\[\{&quot;page&quot;:&quot;keuangan&quot;,&quot;tab&quot;:&quot;laporan&quot;\}\]'/);
});

test('render() — insight TANPA recommendationId: tidak ada baris rekomendasi sama sekali, tidak error', async () => {
  const { EIEInsightFeed, fakeDocument } = loadFeed({
    insights: [{ severity: 'info', message: 'Sekadar info', recommendationId: null, dismissed: false }],
  });
  await assert.doesNotReject(() => EIEInsightFeed.render());
  const html = fakeDocument.getElementById('eieInsightFeed').innerHTML;
  assert.doesNotMatch(html, /data-action="dashHubNavigateToFeature"/);
  assert.doesNotMatch(html, /→/);
});

test('render() — recommendationId dikenal tapi seandainya target kosong: tetap tampil sbg teks statis (fallback aman, bukan tombol mati)', async () => {
  const { EIEInsightFeed, fakeDocument } = loadFeed({
    useRealRecommendationService: false,
    extraGlobals: {
      RecommendationService: { getById: () => ({ label: 'Rekomendasi tanpa target', target: null }) },
    },
    insights: [{ severity: 'info', message: 'Uji fallback', recommendationId: 'REC-APA-SAJA', dismissed: false }],
  });
  await EIEInsightFeed.render();
  const html = fakeDocument.getElementById('eieInsightFeed').innerHTML;
  assert.match(html, /→ Rekomendasi tanpa target/);
  assert.doesNotMatch(html, /data-action="dashHubNavigateToFeature"/);
});

test('render() — dismissed insight difilter, tidak ikut dirender (perilaku lama tetap dipertahankan)', async () => {
  const { EIEInsightFeed, fakeDocument } = loadFeed({
    insights: [
      { severity: 'warning', message: 'Sudah di-dismiss', recommendationId: 'REC-BOOST-EMERGENCY-FUND', dismissed: true },
    ],
  });
  await EIEInsightFeed.render();
  const html = fakeDocument.getElementById('eieInsightFeed').innerHTML;
  assert.match(html, /Belum ada insight/);
});

test('render() — elemen #eieInsightFeed tidak ada di DOM: tidak throw', async () => {
  const emptyDoc = { getElementById: () => null };
  const { EIEInsightFeed } = loadFeed({ insights: [], extraGlobals: { document: emptyDoc } });
  await assert.doesNotReject(() => EIEInsightFeed.render());
});
