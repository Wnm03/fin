'use strict';
// tests/financial-health-score-presenter.test.js —
// FinancialHealthScorePresenter (modules/finance/
// financial-health-score-presenter.js). Sesi 98 (Batch 10) — Financial
// Health Score Foundation: Score Card, Breakdown Card, Recommendation
// Card. UI hanya presenter, 100% reuse FinancialHealthScoreAPI.summary().
// Pola sama persis tests/retirement-planner-presenter.test.js —
// dependency (FinancialHealthScoreAPI, fmt, escapeHtml) di-mock lewat
// loadSource extraGlobals (isolasi murni), UI (document) lewat fakeDom.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeDoc(initial = {}) {
  return createFakeDocument({ financialHealthScoreGrid: {}, ...initial });
}

function makeCtx(opts = {}) {
  const { document: docOverride, ...rest } = opts;
  const fakeDocument = docOverride || makeDoc();
  const ctx = loadSource(['modules/finance/financial-health-score-presenter.js'], {
    escapeHtml: (s) => String(s ?? ''),
    fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
    ...rest,
    document: fakeDocument,
  }, ['FinancialHealthScorePresenter']);
  return { FinancialHealthScorePresenter: ctx.FinancialHealthScorePresenter, fakeDocument };
}

function fullSummary(overrides = {}) {
  return Object.assign({
    ok: true,
    scoreOverview: { ok: true, score: 72, label: 'Cukup Sehat', parts: [] },
    componentBreakdown: {
      ok: true,
      items: [
        { key: 'savings', label: 'Tingkat Tabungan', weight: 25, score: 10, pct: 0.4 },
        { key: 'budget', label: 'Kepatuhan Anggaran', weight: 25, score: 22, pct: 0.88 },
        { key: 'debt', label: 'Rasio Utang', weight: 25, score: 20, pct: 0.8 },
        { key: 'cashflow', label: 'Proyeksi Arus Kas', weight: 25, score: 25, pct: 1 },
      ],
    },
    recommendation: [
      { type: 'info', code: 'health_score_overall', message: 'Skor kesehatan finansial 72/100 (Cukup Sehat).' },
      { type: 'warning', code: 'health_component_low', message: 'Tingkat Tabungan masih rendah — kontribusi 40% dari bobot maksimal.' },
    ],
  }, overrides);
}

test('financial-health-score-presenter.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('render() — container #financialHealthScoreGrid tidak ada di DOM: tidak throw', () => {
  const emptyDoc = { getElementById: () => null, querySelectorAll: () => [] };
  const { FinancialHealthScorePresenter } = makeCtx({ document: emptyDoc, FinancialHealthScoreAPI: { summary: () => fullSummary() } });
  assert.doesNotThrow(() => FinancialHealthScorePresenter.render());
});

test('render() — FinancialHealthScoreAPI belum dimuat: pesan kosong, tidak throw', () => {
  const { FinancialHealthScorePresenter, fakeDocument } = makeCtx({ FinancialHealthScoreAPI: undefined });
  assert.doesNotThrow(() => FinancialHealthScorePresenter.render());
  assert.match(fakeDocument.getElementById('financialHealthScoreGrid').innerHTML, /belum tersedia/);
});

test('render() — summary() ok:false: pesan kosong ditampilkan', () => {
  const FinancialHealthScoreAPI = { summary: () => ({ ok: false, reason: 'x' }) };
  const { FinancialHealthScorePresenter, fakeDocument } = makeCtx({ FinancialHealthScoreAPI });
  FinancialHealthScorePresenter.render();
  assert.match(fakeDocument.getElementById('financialHealthScoreGrid').innerHTML, /belum tersedia/);
});

test('render() — ok: 3 kartu (Skor/Komponen Terlemah/Rekomendasi) ditampilkan dari summary() apa adanya', () => {
  const summary = fullSummary();
  const FinancialHealthScoreAPI = { summary: () => summary };
  const { FinancialHealthScorePresenter, fakeDocument } = makeCtx({ FinancialHealthScoreAPI });
  FinancialHealthScorePresenter.render();
  const html = fakeDocument.getElementById('financialHealthScoreGrid').innerHTML;
  assert.match(html, /Skor Kesehatan Finansial/);
  assert.match(html, /72\/100/);
  assert.match(html, /Komponen Terlemah/);
  assert.match(html, /Tingkat Tabungan/);
  assert.match(html, /Rekomendasi Kesehatan Finansial/);
});

test('render() — scoreOverview ok:false: kartu skor tampil "—" dgn reason sbg sub', () => {
  const summary = fullSummary({ scoreOverview: { ok: false, reason: 'FinanceIntelligence belum dimuat' } });
  const FinancialHealthScoreAPI = { summary: () => summary };
  const { FinancialHealthScorePresenter, fakeDocument } = makeCtx({ FinancialHealthScoreAPI });
  FinancialHealthScorePresenter.render();
  const html = fakeDocument.getElementById('financialHealthScoreGrid').innerHTML;
  assert.match(html, /FinanceIntelligence belum dimuat/);
});

test('render() — componentBreakdown kosong: kartu komponen "Belum ada data"', () => {
  const summary = fullSummary({ componentBreakdown: { ok: true, items: [] } });
  const FinancialHealthScoreAPI = { summary: () => summary };
  const { FinancialHealthScorePresenter, fakeDocument } = makeCtx({ FinancialHealthScoreAPI });
  FinancialHealthScorePresenter.render();
  const html = fakeDocument.getElementById('financialHealthScoreGrid').innerHTML;
  assert.match(html, /Belum ada data/);
});

test('render() — recommendation kosong: kartu rekomendasi "Belum ada rekomendasi"', () => {
  const summary = fullSummary({ recommendation: [] });
  const FinancialHealthScoreAPI = { summary: () => summary };
  const { FinancialHealthScorePresenter, fakeDocument } = makeCtx({ FinancialHealthScoreAPI });
  FinancialHealthScorePresenter.render();
  const html = fakeDocument.getElementById('financialHealthScoreGrid').innerHTML;
  assert.match(html, /Belum ada rekomendasi/);
});
