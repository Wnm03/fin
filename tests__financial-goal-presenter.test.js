'use strict';
// tests/financial-goal-presenter.test.js — FinancialGoalPresenter
// (modules/finance/financial-goal-presenter.js). Sesi 94 (Batch 10) —
// Financial Goal Planner Foundation: Progress Card, Projection Card,
// Recommendation Card. UI hanya presenter, 100% reuse
// FinancialGoalAPI.summary(). Pola sama persis tests/
// cashflow-projection-presenter.test.js — dependency (FinancialGoalAPI,
// fmt, escapeHtml) di-mock lewat loadSource extraGlobals (isolasi murni),
// UI (document) lewat fakeDom.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeDoc(initial = {}) {
  return createFakeDocument({ financialGoalGrid: {}, ...initial });
}

function makeCtx(opts = {}) {
  const { document: docOverride, ...rest } = opts;
  const fakeDocument = docOverride || makeDoc();
  const ctx = loadSource(['modules/finance/financial-goal-presenter.js'], {
    escapeHtml: (s) => String(s ?? ''),
    fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
    ...rest,
    document: fakeDocument,
  }, ['FinancialGoalPresenter']);
  return { FinancialGoalPresenter: ctx.FinancialGoalPresenter, fakeDocument };
}

function fullSummary(overrides = {}) {
  return Object.assign({
    ok: true,
    goalProgress: { ok: true, count: 3, achievedCount: 1, inProgressCount: 1, notStartedCount: 1, avgProgressPct: 50 },
    targetProjection: {
      ok: true,
      monthlySurplus: 1500000,
      projections: [
        { id: 'target:1', sourceKind: 'target', name: 'Dana Darurat', emoji: '🚨', targetAmount: 10000000, currentAmount: 5000000, remaining: 5000000, monthsNeeded: 4 },
        { id: 'target:2', sourceKind: 'target', name: 'Motor Baru', emoji: '🎯', targetAmount: 20000000, currentAmount: 1000000, remaining: 19000000, monthsNeeded: 13 },
      ],
    },
    recommendation: [
      { type: 'positive', code: 'goal_near_complete', message: '"Dana Darurat" sudah 80% tercapai — hampir sampai target.' },
      { type: 'info', code: 'goal_not_started', message: '"Motor Baru" belum ada progres.' },
    ],
  }, overrides);
}

test('financial-goal-presenter.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('render() — container #financialGoalGrid tidak ada di DOM: tidak throw', () => {
  const emptyDoc = { getElementById: () => null, querySelectorAll: () => [] };
  const { FinancialGoalPresenter } = makeCtx({ document: emptyDoc, FinancialGoalAPI: { summary: () => fullSummary() } });
  assert.doesNotThrow(() => FinancialGoalPresenter.render());
});

test('render() — FinancialGoalAPI belum dimuat: pesan kosong, tidak throw', () => {
  const { FinancialGoalPresenter, fakeDocument } = makeCtx({ FinancialGoalAPI: undefined });
  assert.doesNotThrow(() => FinancialGoalPresenter.render());
  assert.match(fakeDocument.getElementById('financialGoalGrid').innerHTML, /belum tersedia/);
});

test('render() — summary() ok:false: pesan kosong ditampilkan', () => {
  const FinancialGoalAPI = { summary: () => ({ ok: false, reason: 'x' }) };
  const { FinancialGoalPresenter, fakeDocument } = makeCtx({ FinancialGoalAPI });
  FinancialGoalPresenter.render();
  assert.match(fakeDocument.getElementById('financialGoalGrid').innerHTML, /belum tersedia/);
});

test('render() — ok: 3 kartu (Progres/Proyeksi/Rekomendasi) ditampilkan dari summary() apa adanya', () => {
  const summary = fullSummary();
  const FinancialGoalAPI = { summary: () => summary };
  const { FinancialGoalPresenter, fakeDocument } = makeCtx({ FinancialGoalAPI });
  FinancialGoalPresenter.render();
  const html = fakeDocument.getElementById('financialGoalGrid').innerHTML;
  assert.match(html, /Progres Target Keuangan/);
  assert.match(html, /Proyeksi Target Terdekat/);
  assert.match(html, /Rekomendasi Goal/);
  assert.match(html, /50% rata-rata/);
  assert.match(html, /Dana Darurat/);
});

// ================= _progressCard =================

test('_progressCard(p) — p ok:false: value "—", sub = reason', () => {
  const { FinancialGoalPresenter } = makeCtx();
  const c = FinancialGoalPresenter._progressCard({ ok: false, reason: 'x' });
  assert.equal(c.value, '—');
  assert.equal(c.sub, 'x');
});

test('_progressCard(p) — count 0: pesan "Belum ada target"', () => {
  const { FinancialGoalPresenter } = makeCtx();
  const c = FinancialGoalPresenter._progressCard({ ok: true, count: 0, achievedCount: 0, inProgressCount: 0, notStartedCount: 0, avgProgressPct: 0 });
  assert.match(c.value, /Belum ada target/);
});

test('_progressCard(p) — avgProgressPct>=80: cls green', () => {
  const { FinancialGoalPresenter } = makeCtx();
  const c = FinancialGoalPresenter._progressCard({ ok: true, count: 2, achievedCount: 2, inProgressCount: 0, notStartedCount: 0, avgProgressPct: 90 });
  assert.equal(c.cls, 'green');
});

test('_progressCard(p) — avgProgressPct<=20: cls red', () => {
  const { FinancialGoalPresenter } = makeCtx();
  const c = FinancialGoalPresenter._progressCard({ ok: true, count: 2, achievedCount: 0, inProgressCount: 1, notStartedCount: 1, avgProgressPct: 10 });
  assert.equal(c.cls, 'red');
});

// ================= _projectionCard =================

test('_projectionCard(t) — t ok:false: value "—"', () => {
  const { FinancialGoalPresenter } = makeCtx();
  const c = FinancialGoalPresenter._projectionCard({ ok: false, reason: 'y' });
  assert.equal(c.value, '—');
  assert.equal(c.sub, 'y');
});

test('_projectionCard(t) — projections kosong: "Semua target tercapai"', () => {
  const { FinancialGoalPresenter } = makeCtx();
  const c = FinancialGoalPresenter._projectionCard({ ok: true, monthlySurplus: 1000000, projections: [] });
  assert.match(c.value, /Semua target tercapai/);
  assert.equal(c.cls, 'green');
});

test('_projectionCard(t) — semua monthsNeeded null: "Belum bisa diproyeksikan"', () => {
  const { FinancialGoalPresenter } = makeCtx();
  const c = FinancialGoalPresenter._projectionCard({
    ok: true, monthlySurplus: -100000,
    projections: [{ id: '1', name: 'X', targetAmount: 1, currentAmount: 0, remaining: 1, monthsNeeded: null }],
  });
  assert.match(c.value, /Belum bisa diproyeksikan/);
  assert.equal(c.cls, 'red');
});

test('_projectionCard(t) — pilih goal dgn monthsNeeded tercepat', () => {
  const { FinancialGoalPresenter } = makeCtx();
  const c = FinancialGoalPresenter._projectionCard({
    ok: true, monthlySurplus: 1000000,
    projections: [
      { id: '1', name: 'Lambat', targetAmount: 1, currentAmount: 0, remaining: 100, monthsNeeded: 20 },
      { id: '2', name: 'Cepat', targetAmount: 1, currentAmount: 0, remaining: 5, monthsNeeded: 2 },
    ],
  });
  assert.match(c.value, /Cepat/);
  assert.match(c.value, /2 bln lagi/);
});

// ================= _recommendationCard =================

test('_recommendationCard(r) — array kosong: "Belum ada rekomendasi"', () => {
  const { FinancialGoalPresenter } = makeCtx();
  const c = FinancialGoalPresenter._recommendationCard([]);
  assert.match(c.value, /Belum ada rekomendasi/);
});

test('_recommendationCard(r) — 1 item warning: cls red', () => {
  const { FinancialGoalPresenter } = makeCtx();
  const c = FinancialGoalPresenter._recommendationCard([{ type: 'warning', code: 'x', message: 'pesan' }]);
  assert.equal(c.cls, 'red');
  assert.equal(c.value, 'pesan');
  assert.equal(c.sub, '');
});

test('_recommendationCard(r) — >1 item: sub menunjukkan sisa jumlah', () => {
  const { FinancialGoalPresenter } = makeCtx();
  const c = FinancialGoalPresenter._recommendationCard([
    { type: 'positive', code: 'a', message: 'pesan utama' },
    { type: 'info', code: 'b', message: 'lain' },
  ]);
  assert.equal(c.cls, 'green');
  assert.match(c.sub, /\+1 rekomendasi lain/);
});
