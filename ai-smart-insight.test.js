'use strict';
// tests/ai-smart-insight.test.js — cakupan pertama untuk ai-smart-insight.js
// (kartu "🤖 Insight AI" persisten). Sebelumnya nol test sama sekali.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeAiSmartInsight(D, extraGlobals = {}) {
  const ctx = loadSource(['ai-smart-insight.js'], { D, ...extraGlobals }, ['AiSmartInsight']);
  return ctx;
}

// Catatan: objek/array yang lahir di dalam sandbox vm (loadSource()) beda
// [[Prototype]]/realm dari literal host Node biasa, jadi assert.deepEqual/
// deepStrictEqual gagal walau isinya identik (sudah didokumentasikan
// berulang kali di CLAUDE.md). Dibandingkan lewat JSON round-trip.
function plain(v) {
  return JSON.parse(JSON.stringify(v));
}

// ---------- readSignals ----------
test('readSignals — D belum ada sama sekali -> semua sinyal falsy/0, tidak error', () => {
  const ctx = loadSource(['ai-smart-insight.js'], {}, ['AiSmartInsight']);
  const sig = ctx.AiSmartInsight.readSignals();
  assert.deepEqual(plain(sig), { apiKey: false, chatCount: 0, learnedCount: 0, usedInvestAI: false, usedPenyusutanAI: false });
});

test('readSignals — D ada tapi semua field kosong -> tetap aman (default kosong)', () => {
  const ctx = makeAiSmartInsight({});
  const sig = ctx.AiSmartInsight.readSignals();
  assert.deepEqual(plain(sig), { apiKey: false, chatCount: 0, learnedCount: 0, usedInvestAI: false, usedPenyusutanAI: false });
});

test('readSignals — apiKey terisi -> apiKey true', () => {
  const ctx = makeAiSmartInsight({ profile: { apiKey: 'sk-xxx' } });
  assert.equal(ctx.AiSmartInsight.readSignals().apiKey, true);
});

test('readSignals — chatCount cuma menghitung pesan role "user", bukan semua pesan', () => {
  const ctx = makeAiSmartInsight({
    chatHistory: [{ role: 'user' }, { role: 'assistant' }, { role: 'user' }, { role: 'system' }],
  });
  assert.equal(ctx.AiSmartInsight.readSignals().chatCount, 2);
});

test('readSignals — chatHistory bukan array -> chatCount 0 (bukan crash)', () => {
  const ctx = makeAiSmartInsight({ chatHistory: 'bukan array' });
  assert.equal(ctx.AiSmartInsight.readSignals().chatCount, 0);
});

test('readSignals — learnedCount dari jumlah key D.learnedItemCat', () => {
  const ctx = makeAiSmartInsight({ learnedItemCat: { indomie: 'Makanan', bensin: 'Transport' } });
  assert.equal(ctx.AiSmartInsight.readSignals().learnedCount, 2);
});

test('readSignals — usedInvestAI true kalau D.assetAllocation.risk terisi', () => {
  const ctx = makeAiSmartInsight({ assetAllocation: { risk: 'moderat' } });
  assert.equal(ctx.AiSmartInsight.readSignals().usedInvestAI, true);
});

test('readSignals — usedPenyusutanAI true kalau ada aset dengan penyusutan.aktif', () => {
  const ctx = makeAiSmartInsight({ assets: [{ name: 'Motor', penyusutan: { aktif: true } }, { name: 'Rumah' }] });
  assert.equal(ctx.AiSmartInsight.readSignals().usedPenyusutanAI, true);
});

test('readSignals — D.assets bukan array -> usedPenyusutanAI tetap false, tidak error', () => {
  const ctx = makeAiSmartInsight({ assets: null });
  assert.equal(ctx.AiSmartInsight.readSignals().usedPenyusutanAI, false);
});

// ---------- pickLevel ----------
test('pickLevel — apiKey belum aktif -> selalu level "belum" apapun sinyal lainnya', () => {
  const ctx = makeAiSmartInsight({});
  const level = ctx.AiSmartInsight.pickLevel({ apiKey: false, chatCount: 99, learnedCount: 99, usedInvestAI: true, usedPenyusutanAI: true });
  assert.equal(level.key, 'belum');
});

test('pickLevel — apiKey aktif tapi belum ada sinyal lain -> "baru" (score=1)', () => {
  const ctx = makeAiSmartInsight({});
  const level = ctx.AiSmartInsight.pickLevel({ apiKey: true, chatCount: 0, learnedCount: 0, usedInvestAI: false, usedPenyusutanAI: false });
  assert.equal(level.key, 'baru');
});

test('pickLevel — score 2-3 -> "lumayan"', () => {
  const ctx = makeAiSmartInsight({});
  // apiKey(1) + chatCount>=1(1) = score 2
  const level = ctx.AiSmartInsight.pickLevel({ apiKey: true, chatCount: 1, learnedCount: 0, usedInvestAI: false, usedPenyusutanAI: false });
  assert.equal(level.key, 'lumayan');
});

test('pickLevel — score tinggi (semua sinyal terpenuhi) -> "pintar"', () => {
  const ctx = makeAiSmartInsight({});
  const level = ctx.AiSmartInsight.pickLevel({ apiKey: true, chatCount: 10, learnedCount: 5, usedInvestAI: true, usedPenyusutanAI: true });
  assert.equal(level.key, 'pintar');
});

test('pickLevel — batas persis score=4 -> "pintar" (chatCount>=8 nambah 1 poin lagi dari chatCount>=1)', () => {
  const ctx = makeAiSmartInsight({});
  // apiKey(1)+chatCount>=1(1)+chatCount>=8(1)+learnedCount>=3(1) = 4 -> "pintar" (score>3)
  const level = ctx.AiSmartInsight.pickLevel({ apiKey: true, chatCount: 8, learnedCount: 3, usedInvestAI: false, usedPenyusutanAI: false });
  assert.equal(level.key, 'pintar');
});

// ---------- buildTips ----------
test('buildTips — apiKey belum aktif -> hanya 1 tip ajakan isi API key', () => {
  const ctx = makeAiSmartInsight({});
  const tips = ctx.AiSmartInsight.buildTips({ apiKey: false, chatCount: 0, learnedCount: 0, usedInvestAI: false, usedPenyusutanAI: false });
  assert.equal(tips.length, 1);
  assert.equal(tips[0].icon, '🔑');
});

test('buildTips — apiKey aktif tapi belum ada sinyal lain -> 3 tips (chat, kategori, aset)', () => {
  const ctx = makeAiSmartInsight({});
  const tips = ctx.AiSmartInsight.buildTips({ apiKey: true, chatCount: 0, learnedCount: 0, usedInvestAI: false, usedPenyusutanAI: false });
  assert.equal(tips.length, 3);
  assert.deepEqual(plain(tips.map(t => t.icon)), ['💬', '🏷️', '🧭']);
});

test('buildTips — semua sinyal sudah terpenuhi -> tip apresiasi tunggal (✨)', () => {
  const ctx = makeAiSmartInsight({});
  const tips = ctx.AiSmartInsight.buildTips({ apiKey: true, chatCount: 5, learnedCount: 5, usedInvestAI: true, usedPenyusutanAI: false });
  assert.equal(tips.length, 1);
  assert.equal(tips[0].icon, '✨');
});

test('buildTips — usedInvestAI ATAU usedPenyusutanAI (salah satu saja) cukup menghilangkan tip 🧭', () => {
  const ctx = makeAiSmartInsight({});
  const tips = ctx.AiSmartInsight.buildTips({ apiKey: true, chatCount: 5, learnedCount: 5, usedInvestAI: false, usedPenyusutanAI: true });
  assert.ok(!tips.some(t => t.icon === '🧭'));
});

test('buildTips — dibatasi maksimal 3 item (slice(0,3))', () => {
  const ctx = makeAiSmartInsight({});
  const tips = ctx.AiSmartInsight.buildTips({ apiKey: true, chatCount: 0, learnedCount: 0, usedInvestAI: false, usedPenyusutanAI: false });
  assert.ok(tips.length <= 3);
});

// ---------- compute ----------
test('compute — menggabungkan sinyal + level + tips jadi satu objek', () => {
  const ctx = makeAiSmartInsight({ profile: { apiKey: 'sk-x' }, chatHistory: [{ role: 'user' }] });
  const r = ctx.AiSmartInsight.compute();
  assert.equal(r.apiKey, true);
  assert.equal(r.chatCount, 1);
  assert.ok(r.level && r.level.key);
  assert.ok(Array.isArray(r.tips));
});

// ---------- render ----------
test('render — salah satu elemen kartu tidak ada -> return dini, tidak error', () => {
  const fakeDocument = createFakeDocument({});
  fakeDocument.getElementById = (id) => (id === 'aiSmartInsightCard' ? null : createFakeDocument({}).getElementById(id));
  const ctx = makeAiSmartInsight({}, { document: fakeDocument });
  assert.doesNotThrow(() => ctx.AiSmartInsight.render());
});

test('render — D belum ada -> kartu disembunyikan (class u-dnone ditambahkan)', () => {
  const fakeDocument = createFakeDocument({
    aiSmartInsightCard: createFakeElement_(),
    aiSmartInsightBadge: createFakeElement_(),
    aiSmartInsightHeadline: createFakeElement_(),
    aiSmartInsightBody: createFakeElement_(),
  });
  const ctx = loadSource(['ai-smart-insight.js'], { document: fakeDocument }, ['AiSmartInsight']);
  ctx.AiSmartInsight.render();
  const card = fakeDocument.getElementById('aiSmartInsightCard');
  assert.ok(card.classList.contains('u-dnone'));
});

test('render — D ada -> kartu ditampilkan (u-dnone dihapus), badge/headline/body terisi', () => {
  const fakeDocument = createFakeDocument({
    aiSmartInsightCard: createFakeElement_({ classList: ['u-dnone'] }),
    aiSmartInsightBadge: createFakeElement_(),
    aiSmartInsightHeadline: createFakeElement_(),
    aiSmartInsightBody: createFakeElement_(),
  });
  const ctx = loadSource(
    ['ai-smart-insight.js'],
    { document: fakeDocument, D: { profile: { apiKey: 'sk-x' }, chatHistory: [{ role: 'user' }, { role: 'user' }] }, escapeHtml: (s) => s },
    ['AiSmartInsight']
  );
  ctx.AiSmartInsight.render();
  const card = fakeDocument.getElementById('aiSmartInsightCard');
  const badge = fakeDocument.getElementById('aiSmartInsightBadge');
  const headline = fakeDocument.getElementById('aiSmartInsightHeadline');
  const body = fakeDocument.getElementById('aiSmartInsightBody');
  assert.ok(!card.classList.contains('u-dnone'));
  assert.ok(badge.textContent.length > 0);
  assert.ok(headline.textContent.length > 0);
  assert.ok(body.innerHTML.length > 0);
});

// helper lokal biar tidak bentrok nama dgn import createFakeElement di fakeDom.js
// (tests di file ini sengaja hanya import createFakeDocument)
function createFakeElement_(initial = {}) {
  return require('./helpers/fakeDom').createFakeElement(initial);
}
