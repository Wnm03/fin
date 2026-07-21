'use strict';
// tests/personal-overview-presenter.test.js — PersonalOverviewPresenter
// (modules/cross/personal-overview-presenter.js). Sesi 89 (Batch 8) —
// Personal Life Dashboard Foundation: headline card, silent kalau tidak
// ada apa pun buat ditampilkan. Pola sama persis tests/
// unified-briefing-presenter.test.js — dependency (LifeDashboardSummaryAPI,
// escapeHtml) di-mock lewat loadSource extraGlobals, UI (document) lewat
// fakeDom.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeDoc(initial = {}) {
  return createFakeDocument({ personalOverviewBody: {}, ...initial });
}

function makeCtx(opts = {}) {
  const { document: docOverride, ...rest } = opts;
  const fakeDocument = docOverride || makeDoc();
  const ctx = loadSource(['modules/cross/personal-overview-presenter.js'], {
    escapeHtml: (s) => String(s ?? ''),
    ...rest,
    document: fakeDocument,
  }, ['PersonalOverviewPresenter']);
  return { PersonalOverviewPresenter: ctx.PersonalOverviewPresenter, fakeDocument };
}

test('personal-overview-presenter.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('render() — container #personalOverviewBody tidak ada di DOM: tidak throw', () => {
  const emptyDoc = { getElementById: () => null, querySelectorAll: () => [] };
  const { PersonalOverviewPresenter } = makeCtx({ document: emptyDoc, LifeDashboardSummaryAPI: { summary: () => ({ ok: true, briefing: { ok: true, text: 'x' }, priorityCount: 0 }) } });
  assert.doesNotThrow(() => PersonalOverviewPresenter.render());
});

test('render() — LifeDashboardSummaryAPI belum dimuat: body dikosongkan, tidak throw', () => {
  const { PersonalOverviewPresenter, fakeDocument } = makeCtx({ LifeDashboardSummaryAPI: undefined });
  assert.doesNotThrow(() => PersonalOverviewPresenter.render());
  assert.equal(fakeDocument.getElementById('personalOverviewBody').innerHTML, '');
});

test('render() — summary() ok:false: body dikosongkan (silent), tidak throw', () => {
  const LifeDashboardSummaryAPI = { summary: () => ({ ok: false, reason: 'UnifiedSummaryAPI belum dimuat' }) };
  const { PersonalOverviewPresenter, fakeDocument } = makeCtx({ LifeDashboardSummaryAPI });
  assert.doesNotThrow(() => PersonalOverviewPresenter.render());
  assert.equal(fakeDocument.getElementById('personalOverviewBody').innerHTML, '');
});

test('render() — briefing tidak ok & priorityCount 0: body dikosongkan (silent)', () => {
  const LifeDashboardSummaryAPI = { summary: () => ({ ok: true, briefing: { ok: false }, priorityCount: 0 }) };
  const { PersonalOverviewPresenter, fakeDocument } = makeCtx({ LifeDashboardSummaryAPI });
  PersonalOverviewPresenter.render();
  assert.equal(fakeDocument.getElementById('personalOverviewBody').innerHTML, '');
});

test('render() — briefing ok & priorityCount 0: tampilkan teks briefing apa adanya + pesan aman', () => {
  const LifeDashboardSummaryAPI = { summary: () => ({ ok: true, briefing: { ok: true, text: 'Skor kesehatan finansial 82/100 (Sehat).' }, priorityCount: 0 }) };
  const { PersonalOverviewPresenter, fakeDocument } = makeCtx({ LifeDashboardSummaryAPI });
  PersonalOverviewPresenter.render();
  const html = fakeDocument.getElementById('personalOverviewBody').innerHTML;
  assert.match(html, /Ringkasan Hidup Pribadi/);
  assert.match(html, /Skor kesehatan finansial 82\/100 \(Sehat\)\./);
  assert.match(html, /Semua aman, tidak ada yang mendesak/);
});

test('render() — priorityCount > 0: tampilkan jumlah apa adanya, 0 rumus baru', () => {
  const LifeDashboardSummaryAPI = { summary: () => ({ ok: true, briefing: { ok: true, text: 'Ringkasan x.' }, priorityCount: 7 }) };
  const { PersonalOverviewPresenter, fakeDocument } = makeCtx({ LifeDashboardSummaryAPI });
  PersonalOverviewPresenter.render();
  const html = fakeDocument.getElementById('personalOverviewBody').innerHTML;
  assert.match(html, /7 hal butuh perhatian dari Finance/);
});
