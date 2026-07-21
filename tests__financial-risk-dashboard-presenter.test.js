'use strict';
// tests/financial-risk-dashboard-presenter.test.js —
// FinancialRiskDashboardPresenter (modules/finance/
// financial-risk-dashboard-presenter.js). Sesi 99 (Batch 10) — Financial
// Risk Dashboard: Risk Level Card, Top Factor Card, Breakdown Card. UI
// hanya presenter, 100% reuse FinancialRiskDashboardAPI.summary(). Pola
// sama persis tests/financial-health-score-presenter.test.js —
// dependency (FinancialRiskDashboardAPI, escapeHtml) di-mock lewat
// loadSource extraGlobals (isolasi murni), UI (document) lewat fakeDom.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeDoc(initial = {}) {
  return createFakeDocument({ financialRiskDashboardGrid: {}, ...initial });
}

function makeCtx(opts = {}) {
  const { document: docOverride, ...rest } = opts;
  const fakeDocument = docOverride || makeDoc();
  const ctx = loadSource(['modules/finance/financial-risk-dashboard-presenter.js'], {
    escapeHtml: (s) => String(s ?? ''),
    ...rest,
    document: fakeDocument,
  }, ['FinancialRiskDashboardPresenter']);
  return { FinancialRiskDashboardPresenter: ctx.FinancialRiskDashboardPresenter, fakeDocument };
}

function fullSummary(overrides = {}) {
  return Object.assign({
    ok: true,
    riskLevel: { count: 2, level: 'medium', label: 'Sedang' },
    riskFactors: [
      { domain: 'debt', icon: '📕', type: 'warning', code: 'debt_dsr_high', message: 'DSR lewat batas aman.' },
      { domain: 'health', icon: '❤️', type: 'warning', code: 'health_component_low', message: 'Tingkat Tabungan masih rendah.' },
    ],
  }, overrides);
}

test('financial-risk-dashboard-presenter.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('render() — container #financialRiskDashboardGrid tidak ada di DOM: tidak throw', () => {
  const emptyDoc = { getElementById: () => null, querySelectorAll: () => [] };
  const { FinancialRiskDashboardPresenter } = makeCtx({ document: emptyDoc, FinancialRiskDashboardAPI: { summary: () => fullSummary() } });
  assert.doesNotThrow(() => FinancialRiskDashboardPresenter.render());
});

test('render() — FinancialRiskDashboardAPI belum dimuat: pesan kosong, tidak throw', () => {
  const { FinancialRiskDashboardPresenter, fakeDocument } = makeCtx({ FinancialRiskDashboardAPI: undefined });
  assert.doesNotThrow(() => FinancialRiskDashboardPresenter.render());
  assert.match(fakeDocument.getElementById('financialRiskDashboardGrid').innerHTML, /belum tersedia/);
});

test('render() — summary() ok:false: pesan kosong ditampilkan', () => {
  const FinancialRiskDashboardAPI = { summary: () => ({ ok: false }) };
  const { FinancialRiskDashboardPresenter, fakeDocument } = makeCtx({ FinancialRiskDashboardAPI });
  FinancialRiskDashboardPresenter.render();
  assert.match(fakeDocument.getElementById('financialRiskDashboardGrid').innerHTML, /belum tersedia/);
});

test('render() — ok: 3 kartu (Tingkat Risiko/Faktor Utama/Sebaran Risiko) ditampilkan dari summary() apa adanya', () => {
  const summary = fullSummary();
  const FinancialRiskDashboardAPI = { summary: () => summary };
  const { FinancialRiskDashboardPresenter, fakeDocument } = makeCtx({ FinancialRiskDashboardAPI });
  FinancialRiskDashboardPresenter.render();
  const html = fakeDocument.getElementById('financialRiskDashboardGrid').innerHTML;
  assert.match(html, /Tingkat Risiko Finansial/);
  assert.match(html, /Sedang/);
  assert.match(html, /Faktor Risiko Utama/);
  assert.match(html, /DSR lewat batas aman/);
  assert.match(html, /Sebaran Risiko/);
  assert.match(html, /Utang 1/);
  assert.match(html, /Kesehatan Finansial 1/);
});

test('render() — riskFactors kosong: kartu faktor utama "Tidak ada faktor risiko terdeteksi", kartu sebaran "Belum ada data"', () => {
  const summary = fullSummary({ riskFactors: [], riskLevel: { count: 0, level: 'low', label: 'Rendah' } });
  const FinancialRiskDashboardAPI = { summary: () => summary };
  const { FinancialRiskDashboardPresenter, fakeDocument } = makeCtx({ FinancialRiskDashboardAPI });
  FinancialRiskDashboardPresenter.render();
  const html = fakeDocument.getElementById('financialRiskDashboardGrid').innerHTML;
  assert.match(html, /Tidak ada faktor risiko terdeteksi/);
  assert.match(html, /Belum ada data/);
  assert.match(html, /Rendah/);
});

test('render() — 3+ faktor: level Tinggi tampil dgn kelas red', () => {
  const summary = fullSummary({
    riskLevel: { count: 3, level: 'high', label: 'Tinggi' },
    riskFactors: [
      { domain: 'debt', icon: '📕', type: 'warning', code: 'a', message: 'a' },
      { domain: 'health', icon: '❤️', type: 'warning', code: 'b', message: 'b' },
      { domain: 'cashflow_budget', icon: '💸', type: 'warning', code: 'c', message: 'c' },
    ],
  });
  const FinancialRiskDashboardAPI = { summary: () => summary };
  const { FinancialRiskDashboardPresenter, fakeDocument } = makeCtx({ FinancialRiskDashboardAPI });
  FinancialRiskDashboardPresenter.render();
  const html = fakeDocument.getElementById('financialRiskDashboardGrid').innerHTML;
  assert.match(html, /Tinggi/);
  assert.match(html, /class="findash-card-val red"/);
});
