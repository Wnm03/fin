'use strict';
// tests/ai-recommend-card.test.js — modules/ai untuk UI: AIRecommendCard
// (ai-chat.js, Sesi 14, TODO.md #1). Widget kecil di dalam kartu "🧭
// Penasihat" > tab "🩺 Insight Cepat", khusus rekomendasi dari AIDecision
// (mesin Rule/Cross-Module Tahap 4) — TERPISAH dari FinCoach (rule-based
// lama, tidak dites ulang di sini). Fokus test: render() ambil
// recommendations dari AIDecision.decide() lalu tulis ke #aiRecommendBody,
// act() manggil AIDecision.learn.recordOutcome(ruleId,outcome) SUNGGUHAN
// (sebelum sesi ini cuma dipanggil dari test unit ai-decision-engine, tidak
// pernah dari UI), dan dismiss (LS_KEY) menyembunyikan id yang sudah
// direspon dari render berikutnya — pola disalin dari FinCoach.dismiss()/
// dismissedIds() yang sudah ada, bukan mekanisme baru.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/loadSource');
const { createFakeDocument } = require('../helpers/fakeDom');

function makeLocalStorage(seed = {}) {
  const store = Object.assign({}, seed);
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    _dump: () => store,
  };
}

function makeCtx({ decideResult, recordOutcomeImpl, localStorageSeed, getConfidenceImpl, getStatsImpl } = {}) {
  const fakeDocument = createFakeDocument({ aiRecommendBody: {} });
  const recordOutcomeCalls = [];
  const toastCalls = [];
  const learn = {
    recordOutcome: async (ruleId, outcome) => {
      recordOutcomeCalls.push([ruleId, outcome]);
      if (recordOutcomeImpl) return recordOutcomeImpl(ruleId, outcome);
      return { accepted: 1, rejected: 0, ignored: 0 };
    },
  };
  // getConfidenceImpl opsional — kalau tidak diberikan, learn TIDAK punya getConfidence sama
  // sekali (mensimulasikan versi AIDecision lama), supaya guard di AIRecommendCard.render()
  // ikut tertes (skip sorting, urutan asli dari decide() dipakai apa adanya).
  if (getConfidenceImpl) learn.getConfidence = async (ruleId) => getConfidenceImpl(ruleId);
  // getStatsImpl opsional (Sesi 42, Tahap 6 lanjutan) — sama pola: kalau tidak diberikan,
  // learn TIDAK punya getStats sama sekali (mensimulasikan versi AIDecision lama), supaya
  // guard baris statistik di AIRecommendCard.render() ikut tertes (baris statistik skip,
  // tidak error).
  if (getStatsImpl) learn.getStats = async (ruleId) => getStatsImpl(ruleId);
  const AIDecision = {
    decide: async () => decideResult || { decisions: [], triggered: [], recommendations: [], simulated: false },
    learn,
  };
  const localStorage = makeLocalStorage(localStorageSeed);
  const c = loadSource(['ai-chat.js'], {
    document: fakeDocument,
    localStorage,
    AIDecision,
    escapeHtml: (s) => String(s),
    toast: (...args) => toastCalls.push(args),
  }, ['AIRecommendCard']);
  return { AIRecommendCard: c.AIRecommendCard, fakeDocument, recordOutcomeCalls, toastCalls, localStorage };
}

function rec(overrides = {}) {
  return Object.assign({
    id: 'dec_1_r-test', ruleId: 'r-test', title: 'Judul', reason: 'Alasan singkat',
    confidence: 0.5, priority: 'MEDIUM', affectedModules: ['finance'], estimatedImpact: {}, actions: [],
  }, overrides);
}

test('render() — tidak melempar error & body dikosongkan kalau tidak ada rekomendasi', async () => {
  const { AIRecommendCard, fakeDocument } = makeCtx({ decideResult: { recommendations: [] } });
  await AIRecommendCard.render();
  assert.equal(fakeDocument.getElementById('aiRecommendBody').innerHTML, '');
});

test('render() — tidak melempar error kalau AIDecision belum ter-load', async () => {
  const fakeDocument = createFakeDocument({ aiRecommendBody: {} });
  const c = loadSource(['ai-chat.js'], { document: fakeDocument, localStorage: makeLocalStorage() }, ['AIRecommendCard']);
  await assert.doesNotReject(() => c.AIRecommendCard.render());
});

test('render() — menulis title/reason + tombol Terima/Tolak/Abaikan (dgn ruleId) ke #aiRecommendBody, maksimal 2', async () => {
  const { AIRecommendCard, fakeDocument } = makeCtx({
    decideResult: { recommendations: [rec({ id: 'd1', ruleId: 'r-1', title: 'A', reason: 'Alasan A' }), rec({ id: 'd2', ruleId: 'r-2', title: 'B', reason: 'Alasan B' }), rec({ id: 'd3', ruleId: 'r-3', title: 'C', reason: 'Alasan C' })] },
  });
  await AIRecommendCard.render();
  const html = fakeDocument.getElementById('aiRecommendBody').innerHTML;
  assert.match(html, /Alasan A/);
  assert.match(html, /Alasan B/);
  assert.doesNotMatch(html, /Alasan C/); // dipotong ke 2 teratas
  assert.match(html, /AIRecommendCard\.act/);
  assert.match(html, /d1.*r-1.*accepted/);
  assert.match(html, /d1.*r-1.*rejected/);
  assert.match(html, /d1.*r-1.*ignored/);
});

test('render() — rekomendasi yang id-nya sudah didismiss (localStorage) TIDAK ditampilkan lagi', async () => {
  const { AIRecommendCard, fakeDocument } = makeCtx({
    decideResult: { recommendations: [rec({ id: 'd1', reason: 'Sudah direspon' }), rec({ id: 'd2', reason: 'Belum direspon' })] },
    localStorageSeed: { kw_ai_recommend_dismissed: JSON.stringify(['d1']) },
  });
  await AIRecommendCard.render();
  const html = fakeDocument.getElementById('aiRecommendBody').innerHTML;
  assert.doesNotMatch(html, /Sudah direspon/);
  assert.match(html, /Belum direspon/);
});

test('act(id, ruleId, "accepted") — memanggil AIDecision.learn.recordOutcome(ruleId,"accepted"), lalu dismiss & re-render (item hilang), toast tampil', async () => {
  const { AIRecommendCard, fakeDocument, recordOutcomeCalls, toastCalls, localStorage } = makeCtx({
    decideResult: { recommendations: [rec({ id: 'd1', ruleId: 'r-9' })] },
  });
  await AIRecommendCard.act('d1', 'r-9', 'accepted');
  assert.deepEqual(recordOutcomeCalls, [['r-9', 'accepted']]);
  assert.equal(toastCalls.length, 1);
  assert.deepEqual(JSON.parse(localStorage.getItem('kw_ai_recommend_dismissed')), ['d1']);
  // re-render otomatis terpanggil di dalam act() -> body sudah tidak berisi rekomendasi ini lagi
  assert.equal(fakeDocument.getElementById('aiRecommendBody').innerHTML, '');
});

test('act(id, ruleId, "ignored") — outcome "ignored" tetap tercatat & di-dismiss, TIDAK error', async () => {
  const { AIRecommendCard, recordOutcomeCalls } = makeCtx({ decideResult: { recommendations: [] } });
  await assert.doesNotReject(() => AIRecommendCard.act('dX', 'r-ignore', 'ignored'));
  assert.deepEqual(recordOutcomeCalls, [['r-ignore', 'ignored']]);
});

// Sesi 32 (Tahap 6, TARGET sesi ini) — tombol "✗ Tolak" (outcome 'rejected'): sebelum sesi ini
// 'rejected' TIDAK PERNAH bisa dipicu dari UI nyata manapun (hanya dari test unit
// ai-decision-engine), padahal getConfidence() butuh 'rejected' > 0 supaya confidence adaptif
// benar-benar bisa turun dari histori pemakaian nyata.
test('act(id, ruleId, "rejected") — memanggil AIDecision.learn.recordOutcome(ruleId,"rejected"), lalu dismiss & re-render, toast berbeda dari accepted/ignored', async () => {
  const { AIRecommendCard, fakeDocument, recordOutcomeCalls, toastCalls, localStorage } = makeCtx({
    decideResult: { recommendations: [rec({ id: 'd1', ruleId: 'r-9' })] },
  });
  await AIRecommendCard.act('d1', 'r-9', 'rejected');
  assert.deepEqual(recordOutcomeCalls, [['r-9', 'rejected']]);
  assert.equal(toastCalls.length, 1);
  assert.match(toastCalls[0][0], /Tolak|👎|dicatat/i);
  assert.deepEqual(JSON.parse(localStorage.getItem('kw_ai_recommend_dismissed')), ['d1']);
  assert.equal(fakeDocument.getElementById('aiRecommendBody').innerHTML, '');
});

test('act() — kalau recordOutcome("rejected") melempar error, rekomendasi TETAP di-dismiss, tidak throw', async () => {
  const { AIRecommendCard, localStorage } = makeCtx({
    decideResult: { recommendations: [] },
    recordOutcomeImpl: () => { throw new Error('IDB gagal'); },
  });
  await assert.doesNotReject(() => AIRecommendCard.act('d1', 'r-err', 'rejected'));
  assert.deepEqual(JSON.parse(localStorage.getItem('kw_ai_recommend_dismissed')), ['d1']);
});

test('act() — kalau recordOutcome() melempar error, rekomendasi TETAP di-dismiss (tidak menjatuhkan act()), tidak throw', async () => {
  const { AIRecommendCard, localStorage } = makeCtx({
    decideResult: { recommendations: [] },
    recordOutcomeImpl: () => { throw new Error('IDB gagal'); },
  });
  await assert.doesNotReject(() => AIRecommendCard.act('d1', 'r-err', 'accepted'));
  assert.deepEqual(JSON.parse(localStorage.getItem('kw_ai_recommend_dismissed')), ['d1']);
});

// Sesi 19 (TODO.md Tahap 6) — getConfidence() dipakai buat urutan tampil rekomendasi.
test('render() — mengurutkan rekomendasi berdasar confidence gabungan (weight × getConfidence adaptif), bukan urutan trigger asli', async () => {
  const confidenceByRule = { 'r-low-learned': 0.1, 'r-high-learned': 0.9 };
  const { AIRecommendCard, fakeDocument } = makeCtx({
    // Urutan trigger asli: A (weight-confidence tinggi tapi histori jelek) duluan, B belakangan.
    decideResult: {
      recommendations: [
        rec({ id: 'd1', ruleId: 'r-low-learned', title: 'A-histori-jelek', reason: 'Alasan A', confidence: 0.9 }),
        rec({ id: 'd2', ruleId: 'r-high-learned', title: 'B-histori-bagus', reason: 'Alasan B', confidence: 0.5 }),
      ],
    },
    getConfidenceImpl: (ruleId) => confidenceByRule[ruleId] ?? 0.5,
  });
  await AIRecommendCard.render();
  const html = fakeDocument.getElementById('aiRecommendBody').innerHTML;
  // Skor gabungan: A = 0.9*0.1 = 0.09, B = 0.5*0.9 = 0.45 -> B seharusnya tampil lebih dulu
  // walau urutan trigger asli dari decide() adalah A dulu.
  assert.ok(html.indexOf('Alasan B') < html.indexOf('Alasan A'), 'B (confidence gabungan lebih tinggi) harus tampil sebelum A');
});

test('render() — kalau AIDecision.learn.getConfidence tidak tersedia (versi lama), urutan asli dari decide() dipakai apa adanya, tidak error', async () => {
  const { AIRecommendCard, fakeDocument } = makeCtx({
    decideResult: {
      recommendations: [
        rec({ id: 'd1', ruleId: 'r-1', title: 'A', reason: 'Alasan A', confidence: 0.2 }),
        rec({ id: 'd2', ruleId: 'r-2', title: 'B', reason: 'Alasan B', confidence: 0.9 }),
      ],
    },
    // getConfidenceImpl sengaja tidak diberikan -> learn.getConfidence tidak ada sama sekali.
  });
  await assert.doesNotReject(() => AIRecommendCard.render());
  const html = fakeDocument.getElementById('aiRecommendBody').innerHTML;
  assert.ok(html.indexOf('Alasan A') < html.indexOf('Alasan B'), 'tanpa getConfidence, urutan trigger asli (A dulu) tidak berubah');
});

test('render() — kalau getConfidence() melempar error utk 1 rule, sorting dibatalkan (fallback ke urutan asli), tidak error', async () => {
  const { AIRecommendCard, fakeDocument } = makeCtx({
    decideResult: {
      recommendations: [
        rec({ id: 'd1', ruleId: 'r-1', title: 'A', reason: 'Alasan A' }),
        rec({ id: 'd2', ruleId: 'r-2', title: 'B', reason: 'Alasan B' }),
      ],
    },
    getConfidenceImpl: () => { throw new Error('IDB gagal'); },
  });
  await assert.doesNotReject(() => AIRecommendCard.render());
  const html = fakeDocument.getElementById('aiRecommendBody').innerHTML;
  assert.match(html, /Alasan A/);
  assert.match(html, /Alasan B/);
});

// Sesi 42 (Tahap 6 AI Learning lanjutan, TARGET sesi ini, keputusan final
// docs/PRODUCT_DECISIONS.md § "Tahap 6 AI Learning lanjutan") — baris statistik
// Terima/Tolak/Abaikan per rule, reuse AIDecision.learn.getStats(ruleId) SAJA
// (tidak ada storage/helper baru).
test('render() — rule dgn histori (getStats sum>0) tampilkan baris statistik Terima/Tolak/Abaikan', async () => {
  const { AIRecommendCard, fakeDocument } = makeCtx({
    decideResult: { recommendations: [rec({ id: 'd1', ruleId: 'r-1', title: 'A', reason: 'Alasan A' })] },
    getStatsImpl: (ruleId) => (ruleId === 'r-1' ? { accepted: 3, rejected: 1, ignored: 2 } : { accepted: 0, rejected: 0, ignored: 0 }),
  });
  await AIRecommendCard.render();
  const html = fakeDocument.getElementById('aiRecommendBody').innerHTML;
  assert.match(html, /Terima 3/);
  assert.match(html, /Tolak 1/);
  assert.match(html, /Abaikan 2/);
});

test('render() — rule TANPA histori (getStats sum===0) TIDAK menampilkan baris statistik sama sekali (bukan 0/0/0)', async () => {
  const { AIRecommendCard, fakeDocument } = makeCtx({
    decideResult: { recommendations: [rec({ id: 'd1', ruleId: 'r-baru', title: 'A', reason: 'Alasan A' })] },
    getStatsImpl: () => ({ accepted: 0, rejected: 0, ignored: 0 }),
  });
  await AIRecommendCard.render();
  const html = fakeDocument.getElementById('aiRecommendBody').innerHTML;
  assert.doesNotMatch(html, /Terima 0/);
  assert.doesNotMatch(html, /📊/);
});

test('render() — kalau AIDecision.learn.getStats tidak tersedia (versi lama), render tetap jalan tanpa baris statistik, tidak error', async () => {
  const { AIRecommendCard, fakeDocument } = makeCtx({
    decideResult: { recommendations: [rec({ id: 'd1', ruleId: 'r-1', title: 'A', reason: 'Alasan A' })] },
    // getStatsImpl sengaja tidak diberikan -> learn.getStats tidak ada sama sekali.
  });
  await assert.doesNotReject(() => AIRecommendCard.render());
  const html = fakeDocument.getElementById('aiRecommendBody').innerHTML;
  assert.match(html, /Alasan A/);
  assert.doesNotMatch(html, /📊/);
});

test('render() — kalau getStats() melempar error utk 1 rule, render tetap jalan tanpa baris statistik, tidak error', async () => {
  const { AIRecommendCard, fakeDocument } = makeCtx({
    decideResult: { recommendations: [rec({ id: 'd1', ruleId: 'r-1', title: 'A', reason: 'Alasan A' })] },
    getStatsImpl: () => { throw new Error('IDB gagal'); },
  });
  await assert.doesNotReject(() => AIRecommendCard.render());
  const html = fakeDocument.getElementById('aiRecommendBody').innerHTML;
  assert.match(html, /Alasan A/);
  assert.doesNotMatch(html, /📊/);
});

test('render() — rekomendasi TANPA ruleId (falsy) dilewati dari lookup statistik, tidak error, tidak tampilkan baris statistik', async () => {
  const { AIRecommendCard, fakeDocument } = makeCtx({
    decideResult: { recommendations: [rec({ id: 'd1', ruleId: null, title: 'A', reason: 'Alasan A' })] },
    getStatsImpl: () => ({ accepted: 5, rejected: 0, ignored: 0 }),
  });
  await assert.doesNotReject(() => AIRecommendCard.render());
  const html = fakeDocument.getElementById('aiRecommendBody').innerHTML;
  assert.match(html, /Alasan A/);
  assert.doesNotMatch(html, /📊/);
});
