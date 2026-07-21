'use strict';
// tests/recommendation-panel.test.js — RecommendationPanel (modules/cross/
// recommendation-panel.js). Sesi 90 (Batch 8) — Personal Decision Center
// Foundation. UI hanya presenter, 100% reuse DecisionCenterAPI.summary()
// -> s.recommendations. Pola sama persis tests/life-priority-panel.test.js
// — dependency di-mock lewat loadSource extraGlobals, UI (document) lewat
// fakeDom.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeDoc(initial = {}) {
  return createFakeDocument({ recommendationPanelBody: {}, ...initial });
}

function makeCtx(opts = {}) {
  const { document: docOverride, ...rest } = opts;
  const fakeDocument = docOverride || makeDoc();
  const ctx = loadSource(['modules/cross/recommendation-panel.js'], {
    escapeHtml: (s) => String(s ?? ''),
    ...rest,
    document: fakeDocument,
  }, ['RecommendationPanel']);
  return { RecommendationPanel: ctx.RecommendationPanel, fakeDocument };
}

test('recommendation-panel.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('render() — container #recommendationPanelBody tidak ada di DOM: tidak throw', () => {
  const emptyDoc = { getElementById: () => null, querySelectorAll: () => [] };
  const { RecommendationPanel } = makeCtx({ document: emptyDoc, DecisionCenterAPI: { summary: () => ({ ok: true, recommendations: [] }) } });
  assert.doesNotThrow(() => RecommendationPanel.render());
});

test('render() — DecisionCenterAPI belum dimuat: body dikosongkan, tidak throw', () => {
  const { RecommendationPanel, fakeDocument } = makeCtx({ DecisionCenterAPI: undefined });
  assert.doesNotThrow(() => RecommendationPanel.render());
  assert.equal(fakeDocument.getElementById('recommendationPanelBody').innerHTML, '');
});

test('render() — summary() ok:false: body dikosongkan (silent)', () => {
  const DecisionCenterAPI = { summary: () => ({ ok: false }) };
  const { RecommendationPanel, fakeDocument } = makeCtx({ DecisionCenterAPI });
  assert.doesNotThrow(() => RecommendationPanel.render());
  assert.equal(fakeDocument.getElementById('recommendationPanelBody').innerHTML, '');
});

test('render() — recommendations kosong: body dikosongkan (silent)', () => {
  const DecisionCenterAPI = { summary: () => ({ ok: true, recommendations: [] }) };
  const { RecommendationPanel, fakeDocument } = makeCtx({ DecisionCenterAPI });
  RecommendationPanel.render();
  assert.equal(fakeDocument.getElementById('recommendationPanelBody').innerHTML, '');
});

test('render() — recommendations ada: tampilkan pesan apa adanya, ikon warning', () => {
  const DecisionCenterAPI = { summary: () => ({ ok: true, recommendations: [{ type: 'warning', message: 'Budget hampir habis' }] }) };
  const { RecommendationPanel, fakeDocument } = makeCtx({ DecisionCenterAPI });
  RecommendationPanel.render();
  const html = fakeDocument.getElementById('recommendationPanelBody').innerHTML;
  assert.match(html, /Budget hampir habis/);
  assert.match(html, /🟡/);
  assert.match(html, /Rekomendasi/);
});

// --- S114 (Batch 13): Unified Recommendation Panel Integration —
// getRecommendations() sbg pintu data publik (dipakai render() & AI Chat).

test('getRecommendations() — DecisionCenterAPI belum dimuat: {ok:false, recommendations:[]}', () => {
  const { RecommendationPanel } = makeCtx({ DecisionCenterAPI: undefined });
  const r = RecommendationPanel.getRecommendations();
  assert.equal(r.ok, false);
  assert.equal(r.recommendations.length, 0);
});

test('getRecommendations() — summary() ok:false: {ok:false, recommendations:[]}', () => {
  const DecisionCenterAPI = { summary: () => ({ ok: false }) };
  const { RecommendationPanel } = makeCtx({ DecisionCenterAPI });
  const r = RecommendationPanel.getRecommendations();
  assert.equal(r.ok, false);
  assert.equal(r.recommendations.length, 0);
});

test('getRecommendations() — recommendations bukan array: {ok:false, recommendations:[]}', () => {
  const DecisionCenterAPI = { summary: () => ({ ok: true, recommendations: null }) };
  const { RecommendationPanel } = makeCtx({ DecisionCenterAPI });
  const r = RecommendationPanel.getRecommendations();
  assert.equal(r.ok, false);
  assert.equal(r.recommendations.length, 0);
});

test('getRecommendations() — summary() ok:true: meneruskan recommendations apa adanya (0 transformasi)', () => {
  const recs = [{ type: 'warning', message: 'Budget hampir habis' }, { type: 'warning', message: 'Servis lewat jatuh tempo' }];
  const DecisionCenterAPI = { summary: () => ({ ok: true, recommendations: recs }) };
  const { RecommendationPanel } = makeCtx({ DecisionCenterAPI });
  const r = RecommendationPanel.getRecommendations();
  assert.equal(r.ok, true);
  assert.equal(r.recommendations.length, 2);
  assert.equal(r.recommendations[0].message, 'Budget hampir habis');
  assert.equal(r.recommendations[1].message, 'Servis lewat jatuh tempo');
});

test('render() — tetap reuse getRecommendations() (refactor internal, perilaku render() 0 berubah)', () => {
  const DecisionCenterAPI = { summary: () => ({ ok: true, recommendations: [{ type: 'info', message: 'Semua aman' }] }) };
  const { RecommendationPanel, fakeDocument } = makeCtx({ DecisionCenterAPI });
  RecommendationPanel.render();
  const html = fakeDocument.getElementById('recommendationPanelBody').innerHTML;
  assert.match(html, /Semua aman/);
  assert.match(html, /ℹ️/);
});
