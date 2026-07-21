'use strict';
// tests/investment-planner-presenter.test.js — InvestmentPlannerPresenter
// (modules/finance/investment-planner-presenter.js). Sesi 95 (Batch 10) —
// Investment Planner Foundation: Overview Card, Allocation Card,
// Recommendation Card. UI hanya presenter, 100% reuse
// InvestmentPlannerAPI.summary(). Pola sama persis tests/
// financial-goal-presenter.test.js — dependency (InvestmentPlannerAPI,
// fmt, escapeHtml) di-mock lewat loadSource extraGlobals (isolasi murni),
// UI (document) lewat fakeDom.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeDoc(initial = {}) {
  return createFakeDocument({ investPlannerGrid: {}, ...initial });
}

function makeCtx(opts = {}) {
  const { document: docOverride, ...rest } = opts;
  const fakeDocument = docOverride || makeDoc();
  const ctx = loadSource(['modules/finance/investment-planner-presenter.js'], {
    escapeHtml: (s) => String(s ?? ''),
    fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
    ...rest,
    document: fakeDocument,
  }, ['InvestmentPlannerPresenter']);
  return { InvestmentPlannerPresenter: ctx.InvestmentPlannerPresenter, fakeDocument };
}

function fullSummary(overrides = {}) {
  return Object.assign({
    ok: true,
    portfolioOverview: {
      ok: true, holdingsCount: 2, totalValue: 20000000, totalCost: 18000000,
      totalGainLoss: 2000000, roiPct: 11.1, totalDividend: 300000, totalRealizedGain: 100000,
    },
    assetAllocation: {
      ok: true,
      allocation: [
        { type: 'Saham', value: 15000000, pct: 75 },
        { type: 'Reksa Dana', value: 5000000, pct: 25 },
      ],
      topAllocation: { type: 'Saham', value: 15000000, pct: 75 },
    },
    watchlistAlerts: { ok: true, alerts: [], count: 0 },
    recommendation: [
      { type: 'info', code: 'invest_concentration', message: '75% portofolio terkonsentrasi di "Saham".' },
      { type: 'positive', code: 'invest_surplus_available', message: 'Ada surplus bulanan.' },
    ],
  }, overrides);
}

test('investment-planner-presenter.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('render() — container #investPlannerGrid tidak ada di DOM: tidak throw', () => {
  const emptyDoc = { getElementById: () => null, querySelectorAll: () => [] };
  const { InvestmentPlannerPresenter } = makeCtx({ document: emptyDoc, InvestmentPlannerAPI: { summary: () => fullSummary() } });
  assert.doesNotThrow(() => InvestmentPlannerPresenter.render());
});

test('render() — InvestmentPlannerAPI belum dimuat: pesan kosong, tidak throw', () => {
  const { InvestmentPlannerPresenter, fakeDocument } = makeCtx({ InvestmentPlannerAPI: undefined });
  assert.doesNotThrow(() => InvestmentPlannerPresenter.render());
  assert.match(fakeDocument.getElementById('investPlannerGrid').innerHTML, /belum tersedia/);
});

test('render() — summary() ok:false: pesan kosong ditampilkan', () => {
  const InvestmentPlannerAPI = { summary: () => ({ ok: false, reason: 'x' }) };
  const { InvestmentPlannerPresenter, fakeDocument } = makeCtx({ InvestmentPlannerAPI });
  InvestmentPlannerPresenter.render();
  assert.match(fakeDocument.getElementById('investPlannerGrid').innerHTML, /belum tersedia/);
});

test('render() — ok: 3 kartu (Portofolio/Alokasi/Rekomendasi) ditampilkan dari summary() apa adanya', () => {
  const summary = fullSummary();
  const InvestmentPlannerAPI = { summary: () => summary };
  const { InvestmentPlannerPresenter, fakeDocument } = makeCtx({ InvestmentPlannerAPI });
  InvestmentPlannerPresenter.render();
  const html = fakeDocument.getElementById('investPlannerGrid').innerHTML;
  assert.match(html, /Portofolio Investasi/);
  assert.match(html, /Alokasi Aset Terbesar/);
  assert.match(html, /Rekomendasi Investasi/);
  assert.match(html, /Saham/);
});

// ================= _overviewCard =================

test('_overviewCard(p) — p ok:false: value "—", sub = reason', () => {
  const { InvestmentPlannerPresenter } = makeCtx();
  const c = InvestmentPlannerPresenter._overviewCard({ ok: false, reason: 'x' });
  assert.equal(c.value, '—');
  assert.equal(c.sub, 'x');
});

test('_overviewCard(p) — holdingsCount 0: pesan "Belum ada portofolio"', () => {
  const { InvestmentPlannerPresenter } = makeCtx();
  const c = InvestmentPlannerPresenter._overviewCard({ ok: true, holdingsCount: 0, totalValue: 0, totalGainLoss: 0, roiPct: 0 });
  assert.match(c.value, /Belum ada portofolio/);
});

test('_overviewCard(p) — totalGainLoss>0: cls green', () => {
  const { InvestmentPlannerPresenter } = makeCtx();
  const c = InvestmentPlannerPresenter._overviewCard({ ok: true, holdingsCount: 1, totalValue: 1000000, totalGainLoss: 100000, roiPct: 10 });
  assert.equal(c.cls, 'green');
});

test('_overviewCard(p) — totalGainLoss<0: cls red', () => {
  const { InvestmentPlannerPresenter } = makeCtx();
  const c = InvestmentPlannerPresenter._overviewCard({ ok: true, holdingsCount: 1, totalValue: 900000, totalGainLoss: -100000, roiPct: -10 });
  assert.equal(c.cls, 'red');
});

// ================= _allocationCard =================

test('_allocationCard(a) — a ok:false: value "—"', () => {
  const { InvestmentPlannerPresenter } = makeCtx();
  const c = InvestmentPlannerPresenter._allocationCard({ ok: false, reason: 'y' });
  assert.equal(c.value, '—');
  assert.equal(c.sub, 'y');
});

test('_allocationCard(a) — allocation kosong: "Belum ada data"', () => {
  const { InvestmentPlannerPresenter } = makeCtx();
  const c = InvestmentPlannerPresenter._allocationCard({ ok: true, allocation: [], topAllocation: null });
  assert.match(c.value, /Belum ada data/);
});

test('_allocationCard(a) — menampilkan topAllocation apa adanya', () => {
  const { InvestmentPlannerPresenter } = makeCtx();
  const c = InvestmentPlannerPresenter._allocationCard({
    ok: true,
    allocation: [{ type: 'Saham', value: 15000000, pct: 75 }, { type: 'Emas', value: 5000000, pct: 25 }],
    topAllocation: { type: 'Saham', value: 15000000, pct: 75 },
  });
  assert.match(c.value, /Saham/);
  assert.match(c.value, /75%/);
  assert.match(c.sub, /2 jenis instrumen/);
});

// ================= _recommendationCard =================

test('_recommendationCard(r) — array kosong: "Belum ada rekomendasi"', () => {
  const { InvestmentPlannerPresenter } = makeCtx();
  const c = InvestmentPlannerPresenter._recommendationCard([]);
  assert.match(c.value, /Belum ada rekomendasi/);
});

test('_recommendationCard(r) — menampilkan item pertama sbg highlight, sisanya di sub', () => {
  const { InvestmentPlannerPresenter } = makeCtx();
  const c = InvestmentPlannerPresenter._recommendationCard([
    { type: 'warning', code: 'a', message: 'Pesan A' },
    { type: 'info', code: 'b', message: 'Pesan B' },
  ]);
  assert.equal(c.value, 'Pesan A');
  assert.equal(c.cls, 'red');
  assert.match(c.sub, /\+1 rekomendasi lain/);
});
