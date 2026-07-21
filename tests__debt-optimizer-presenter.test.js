'use strict';
// tests/debt-optimizer-presenter.test.js — DebtOptimizerPresenter
// (modules/finance/debt-optimizer-presenter.js). Sesi 96 (Batch 10) —
// Debt Optimizer Foundation: Overview Card, DSR Card, Recommendation
// Card. UI hanya presenter, 100% reuse DebtOptimizerAPI.summary(). Pola
// sama persis tests/investment-planner-presenter.test.js — dependency
// (DebtOptimizerAPI, fmt, escapeHtml) di-mock lewat loadSource
// extraGlobals (isolasi murni), UI (document) lewat fakeDom.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeDoc(initial = {}) {
  return createFakeDocument({ debtOptimizerGrid: {}, ...initial });
}

function makeCtx(opts = {}) {
  const { document: docOverride, ...rest } = opts;
  const fakeDocument = docOverride || makeDoc();
  const ctx = loadSource(['modules/finance/debt-optimizer-presenter.js'], {
    escapeHtml: (s) => String(s ?? ''),
    fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
    ...rest,
    document: fakeDocument,
  }, ['DebtOptimizerPresenter']);
  return { DebtOptimizerPresenter: ctx.DebtOptimizerPresenter, fakeDocument };
}

function fullSummary(overrides = {}) {
  return Object.assign({
    ok: true,
    debtOverview: { ok: true, activeCount: 1, totalValue: 10000000, totalCicilanBulanan: 1500000 },
    dsr: { ok: true, totalCicilanUtang: 1500000, totalCicilanLain: 0, totalCicilan: 1500000, incAvg: 5000000, pct: 30 },
    payoffPlan: { ok: true, method: 'avalanche', extra: 0, order: [], simulation: { months: 8, totalInterest: 350000, payoffMonth: {} } },
    recommendation: [
      { type: 'info', code: 'debt_dsr_watch', message: 'DSR mendekati batas aman.' },
      { type: 'info', code: 'debt_payoff_estimate', message: 'Estimasi lunas 8 bulan lagi.' },
    ],
  }, overrides);
}

test('debt-optimizer-presenter.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('render() — container #debtOptimizerGrid tidak ada di DOM: tidak throw', () => {
  const emptyDoc = { getElementById: () => null, querySelectorAll: () => [] };
  const { DebtOptimizerPresenter } = makeCtx({ document: emptyDoc, DebtOptimizerAPI: { summary: () => fullSummary() } });
  assert.doesNotThrow(() => DebtOptimizerPresenter.render());
});

test('render() — DebtOptimizerAPI belum dimuat: pesan kosong, tidak throw', () => {
  const { DebtOptimizerPresenter, fakeDocument } = makeCtx({ DebtOptimizerAPI: undefined });
  assert.doesNotThrow(() => DebtOptimizerPresenter.render());
  assert.match(fakeDocument.getElementById('debtOptimizerGrid').innerHTML, /belum tersedia/);
});

test('render() — summary() ok:false: pesan kosong ditampilkan', () => {
  const DebtOptimizerAPI = { summary: () => ({ ok: false, reason: 'x' }) };
  const { DebtOptimizerPresenter, fakeDocument } = makeCtx({ DebtOptimizerAPI });
  DebtOptimizerPresenter.render();
  assert.match(fakeDocument.getElementById('debtOptimizerGrid').innerHTML, /belum tersedia/);
});

test('render() — ok: 3 kartu (Ringkasan/DSR/Rekomendasi) ditampilkan dari summary() apa adanya', () => {
  const summary = fullSummary();
  const DebtOptimizerAPI = { summary: () => summary };
  const { DebtOptimizerPresenter, fakeDocument } = makeCtx({ DebtOptimizerAPI });
  DebtOptimizerPresenter.render();
  const html = fakeDocument.getElementById('debtOptimizerGrid').innerHTML;
  assert.match(html, /Ringkasan Utang/);
  assert.match(html, /DSR \(Rasio Cicilan\)/);
  assert.match(html, /Rekomendasi Utang/);
  assert.match(html, /30%/);
});

// ================= _overviewCard =================

test('_overviewCard(o) — o ok:false: value "—", sub = reason', () => {
  const { DebtOptimizerPresenter } = makeCtx();
  const c = DebtOptimizerPresenter._overviewCard({ ok: false, reason: 'x' });
  assert.equal(c.value, '—');
  assert.equal(c.sub, 'x');
});

test('_overviewCard(o) — activeCount 0: pesan "Belum ada utang aktif"', () => {
  const { DebtOptimizerPresenter } = makeCtx();
  const c = DebtOptimizerPresenter._overviewCard({ ok: true, activeCount: 0, totalValue: 0, totalCicilanBulanan: 0 });
  assert.match(c.value, /Belum ada utang aktif/);
});

test('_overviewCard(o) — activeCount>0: value = totalValue, cls red', () => {
  const { DebtOptimizerPresenter } = makeCtx();
  const c = DebtOptimizerPresenter._overviewCard({ ok: true, activeCount: 2, totalValue: 10000000, totalCicilanBulanan: 1500000 });
  assert.equal(c.cls, 'red');
  assert.match(c.sub, /2 utang aktif/);
});

// ================= _dsrCard =================

test('_dsrCard(d) — d ok:false: value "—"', () => {
  const { DebtOptimizerPresenter } = makeCtx();
  const c = DebtOptimizerPresenter._dsrCard({ ok: false, reason: 'y' });
  assert.equal(c.value, '—');
  assert.equal(c.sub, 'y');
});

test('_dsrCard(d) — incAvg<=0: "Belum cukup data"', () => {
  const { DebtOptimizerPresenter } = makeCtx();
  const c = DebtOptimizerPresenter._dsrCard({ ok: true, incAvg: 0, pct: null, totalCicilan: 1500000 });
  assert.match(c.value, /Belum cukup data/);
});

test('_dsrCard(d) — pct>35: cls red', () => {
  const { DebtOptimizerPresenter } = makeCtx();
  const c = DebtOptimizerPresenter._dsrCard({ ok: true, incAvg: 5000000, pct: 40, totalCicilan: 2000000 });
  assert.equal(c.cls, 'red');
});

test('_dsrCard(d) — pct<=30: cls green', () => {
  const { DebtOptimizerPresenter } = makeCtx();
  const c = DebtOptimizerPresenter._dsrCard({ ok: true, incAvg: 5000000, pct: 20, totalCicilan: 1000000 });
  assert.equal(c.cls, 'green');
});

// ================= _recommendationCard =================

test('_recommendationCard(r) — array kosong: "Belum ada rekomendasi"', () => {
  const { DebtOptimizerPresenter } = makeCtx();
  const c = DebtOptimizerPresenter._recommendationCard([]);
  assert.match(c.value, /Belum ada rekomendasi/);
});

test('_recommendationCard(r) — menampilkan item pertama sbg highlight, sisanya di sub', () => {
  const { DebtOptimizerPresenter } = makeCtx();
  const c = DebtOptimizerPresenter._recommendationCard([
    { type: 'warning', code: 'a', message: 'Pesan A' },
    { type: 'info', code: 'b', message: 'Pesan B' },
  ]);
  assert.equal(c.value, 'Pesan A');
  assert.equal(c.cls, 'red');
  assert.match(c.sub, /\+1 rekomendasi lain/);
});
