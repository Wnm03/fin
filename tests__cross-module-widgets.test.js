'use strict';
// tests/cross-module-widgets.test.js — CrossModuleWidgets (modules/cross/
// cross-module-widgets.js). Sesi 89 (Batch 8) — Personal Life Dashboard
// Foundation: 2 kartu widget (Insight Tersedia/Prioritas Aktif), 100%
// reuse LifeDashboardSummaryAPI.summary(). Pola sama persis tests/
// cross-dashboard-card.test.js — dependency di-mock lewat loadSource
// extraGlobals, UI (document) lewat fakeDom.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeDoc(initial = {}) {
  return createFakeDocument({ crossWidgetsGrid: {}, ...initial });
}

function makeCtx(opts = {}) {
  const { document: docOverride, ...rest } = opts;
  const fakeDocument = docOverride || makeDoc();
  const ctx = loadSource(['modules/cross/cross-module-widgets.js'], {
    escapeHtml: (s) => String(s ?? ''),
    ...rest,
    document: fakeDocument,
  }, ['CrossModuleWidgets']);
  return { CrossModuleWidgets: ctx.CrossModuleWidgets, fakeDocument };
}

test('cross-module-widgets.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('render() — container #crossWidgetsGrid tidak ada di DOM: tidak throw', () => {
  const emptyDoc = { getElementById: () => null, querySelectorAll: () => [] };
  const { CrossModuleWidgets } = makeCtx({ document: emptyDoc, LifeDashboardSummaryAPI: { summary: () => ({ ok: true, insightCount: 0, priorityCount: 0 }) } });
  assert.doesNotThrow(() => CrossModuleWidgets.render());
});

test('render() — LifeDashboardSummaryAPI belum dimuat: empty-state, tidak throw', () => {
  const { CrossModuleWidgets, fakeDocument } = makeCtx({ LifeDashboardSummaryAPI: undefined });
  assert.doesNotThrow(() => CrossModuleWidgets.render());
  assert.match(fakeDocument.getElementById('crossWidgetsGrid').innerHTML, /belum tersedia/);
});

test('render() — summary() ok:false: empty-state, tidak throw', () => {
  const LifeDashboardSummaryAPI = { summary: () => ({ ok: false, reason: 'x' }) };
  const { CrossModuleWidgets, fakeDocument } = makeCtx({ LifeDashboardSummaryAPI });
  assert.doesNotThrow(() => CrossModuleWidgets.render());
  assert.match(fakeDocument.getElementById('crossWidgetsGrid').innerHTML, /belum tersedia/);
});

test('render() — insightCount/priorityCount 0: kartu tetap tampil dgn nilai 0, cls green', () => {
  const LifeDashboardSummaryAPI = { summary: () => ({ ok: true, insightCount: 0, priorityCount: 0 }) };
  const { CrossModuleWidgets, fakeDocument } = makeCtx({ LifeDashboardSummaryAPI });
  CrossModuleWidgets.render();
  const html = fakeDocument.getElementById('crossWidgetsGrid').innerHTML;
  assert.match(html, /Insight Tersedia/);
  assert.match(html, /Prioritas Aktif/);
  assert.match(html, /findash-card-val green/);
});

test('render() — insightCount/priorityCount > 0: nilai apa adanya, cls orange, 0 rumus baru', () => {
  const LifeDashboardSummaryAPI = { summary: () => ({ ok: true, insightCount: 6, priorityCount: 9 }) };
  const { CrossModuleWidgets, fakeDocument } = makeCtx({ LifeDashboardSummaryAPI });
  CrossModuleWidgets.render();
  const html = fakeDocument.getElementById('crossWidgetsGrid').innerHTML;
  assert.match(html, />6<\/div>/);
  assert.match(html, />9<\/div>/);
  assert.match(html, /findash-card-val orange/);
});
