'use strict';
// tests/unified-briefing-presenter.test.js — UnifiedBriefingPresenter
// (modules/cross/unified-briefing-presenter.js). Sesi 88 (Batch 8) —
// Unified AI Briefing Foundation: Dashboard Briefing Presenter, silent
// kalau tidak ada apa pun buat diceritakan. Pola sama persis tests/
// vehicle-daily-brief.test.js — dependency (UnifiedAIBriefing, escapeHtml)
// di-mock lewat loadSource extraGlobals, UI (document) lewat fakeDom.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeDoc(initial = {}) {
  return createFakeDocument({ crossBriefBody: {}, aiUnifiedBriefBody: {}, ...initial });
}

function makeCtx(opts = {}) {
  const { document: docOverride, ...rest } = opts;
  const fakeDocument = docOverride || makeDoc();
  const ctx = loadSource(['modules/cross/unified-briefing-presenter.js'], {
    escapeHtml: (s) => String(s ?? ''),
    ...rest,
    document: fakeDocument,
  }, ['UnifiedBriefingPresenter']);
  return { UnifiedBriefingPresenter: ctx.UnifiedBriefingPresenter, fakeDocument };
}

test('unified-briefing-presenter.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('render() — container #crossBriefBody tidak ada di DOM: tidak throw', () => {
  const emptyDoc = { getElementById: () => null, querySelectorAll: () => [] };
  const { UnifiedBriefingPresenter } = makeCtx({ document: emptyDoc, UnifiedAIBriefing: { generate: () => ({ ok: true, text: 'x' }) } });
  assert.doesNotThrow(() => UnifiedBriefingPresenter.render());
});

test('render() — UnifiedAIBriefing belum dimuat: body dikosongkan, tidak throw', () => {
  const { UnifiedBriefingPresenter, fakeDocument } = makeCtx({ UnifiedAIBriefing: undefined });
  assert.doesNotThrow(() => UnifiedBriefingPresenter.render());
  assert.equal(fakeDocument.getElementById('crossBriefBody').innerHTML, '');
});

test('render() — generate() ok:false: body dikosongkan (silent), tidak throw', () => {
  const UnifiedAIBriefing = { generate: () => ({ ok: false, reason: 'Tidak ada data untuk briefing' }) };
  const { UnifiedBriefingPresenter, fakeDocument } = makeCtx({ UnifiedAIBriefing });
  assert.doesNotThrow(() => UnifiedBriefingPresenter.render());
  assert.equal(fakeDocument.getElementById('crossBriefBody').innerHTML, '');
});

test('render() — generate() ok:true: tampilkan teks briefing apa adanya', () => {
  const UnifiedAIBriefing = { generate: () => ({ ok: true, text: 'Skor kesehatan finansial 82/100 (Sehat).', parts: [] }) };
  const { UnifiedBriefingPresenter, fakeDocument } = makeCtx({ UnifiedAIBriefing });
  UnifiedBriefingPresenter.render();
  const html = fakeDocument.getElementById('crossBriefBody').innerHTML;
  assert.match(html, /Ringkasan Harian Finance/);
  assert.match(html, /Skor kesehatan finansial 82\/100 \(Sehat\)\./);
});

// --- S111 (Batch 13): AI Daily Briefing Integration — wiring container kedua
// #aiUnifiedBriefBody (kartu "🧭 Penasihat"/AI Chat), 100% reuse generate() yang
// sama, TIDAK ada pemanggilan generate() tambahan, TIDAK ada rumus baru.

test('render() — generate() ok:true: #aiUnifiedBriefBody (AI Chat/Penasihat) ikut terisi teks yang SAMA', () => {
  const UnifiedAIBriefing = { generate: () => ({ ok: true, text: 'Skor kesehatan finansial 82/100 (Sehat).', parts: [] }) };
  const { UnifiedBriefingPresenter, fakeDocument } = makeCtx({ UnifiedAIBriefing });
  UnifiedBriefingPresenter.render();
  const crossHtml = fakeDocument.getElementById('crossBriefBody').innerHTML;
  const chatHtml = fakeDocument.getElementById('aiUnifiedBriefBody').innerHTML;
  assert.match(chatHtml, /Ringkasan Harian Finance/);
  assert.match(chatHtml, /Skor kesehatan finansial 82\/100 \(Sehat\)\./);
  assert.equal(chatHtml, crossHtml); // identik — bukan generate() kedua/rumus beda
});

test('render() — hanya #aiUnifiedBriefBody ada di halaman (crossBriefBody tidak ada): tetap terisi, tidak throw', () => {
  const UnifiedAIBriefing = { generate: () => ({ ok: true, text: 'Skor kesehatan finansial 82/100 (Sehat).', parts: [] }) };
  const onlyChatDoc = createFakeDocument({ aiUnifiedBriefBody: {} });
  const { UnifiedBriefingPresenter, fakeDocument } = makeCtx({ UnifiedAIBriefing, document: onlyChatDoc });
  assert.doesNotThrow(() => UnifiedBriefingPresenter.render());
  assert.match(fakeDocument.getElementById('aiUnifiedBriefBody').innerHTML, /Skor kesehatan finansial 82\/100 \(Sehat\)\./);
});

test('render() — hanya #crossBriefBody ada di halaman (Dashboard Hub, aiUnifiedBriefBody tidak ada): tidak throw, perilaku lama tidak berubah', () => {
  const UnifiedAIBriefing = { generate: () => ({ ok: true, text: 'Skor kesehatan finansial 82/100 (Sehat).', parts: [] }) };
  const onlyCrossDoc = createFakeDocument({ crossBriefBody: {} });
  const { UnifiedBriefingPresenter, fakeDocument } = makeCtx({ UnifiedAIBriefing, document: onlyCrossDoc });
  assert.doesNotThrow(() => UnifiedBriefingPresenter.render());
  assert.match(fakeDocument.getElementById('crossBriefBody').innerHTML, /Skor kesehatan finansial 82\/100 \(Sehat\)\./);
});

test('render() — generate() ok:false: KEDUA container dikosongkan (silent independen)', () => {
  const UnifiedAIBriefing = { generate: () => ({ ok: false, reason: 'Tidak ada data untuk briefing' }) };
  const { UnifiedBriefingPresenter, fakeDocument } = makeCtx({ UnifiedAIBriefing });
  UnifiedBriefingPresenter.render();
  assert.equal(fakeDocument.getElementById('crossBriefBody').innerHTML, '');
  assert.equal(fakeDocument.getElementById('aiUnifiedBriefBody').innerHTML, '');
});

test('render() — UnifiedAIBriefing belum dimuat: KEDUA container dikosongkan', () => {
  const { UnifiedBriefingPresenter, fakeDocument } = makeCtx({ UnifiedAIBriefing: undefined });
  assert.doesNotThrow(() => UnifiedBriefingPresenter.render());
  assert.equal(fakeDocument.getElementById('crossBriefBody').innerHTML, '');
  assert.equal(fakeDocument.getElementById('aiUnifiedBriefBody').innerHTML, '');
});
