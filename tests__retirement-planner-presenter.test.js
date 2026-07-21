'use strict';
// tests/retirement-planner-presenter.test.js — RetirementPlannerPresenter
// (modules/finance/retirement-planner-presenter.js). Sesi 97 (Batch 10)
// — Retirement Planner Foundation: Overview Card, Gap Card,
// Recommendation Card. UI hanya presenter, 100% reuse
// RetirementPlannerAPI.summary(). Pola sama persis tests/
// debt-optimizer-presenter.test.js — dependency (RetirementPlannerAPI,
// fmt, escapeHtml) di-mock lewat loadSource extraGlobals (isolasi
// murni), UI (document) lewat fakeDom.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeDoc(initial = {}) {
  return createFakeDocument({ retirementPlannerGrid: {}, ...initial });
}

function makeCtx(opts = {}) {
  const { document: docOverride, ...rest } = opts;
  const fakeDocument = docOverride || makeDoc();
  const ctx = loadSource(['modules/finance/retirement-planner-presenter.js'], {
    escapeHtml: (s) => String(s ?? ''),
    fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
    ...rest,
    document: fakeDocument,
  }, ['RetirementPlannerPresenter']);
  return { RetirementPlannerPresenter: ctx.RetirementPlannerPresenter, fakeDocument };
}

function fullSummary(overrides = {}) {
  return Object.assign({
    ok: true,
    retirementOverview: {
      ok: true, configured: true, terkumpul: 50000000, proyeksi: 600000000,
      sisaBulan: 240, target: 500000000, usiaSekarang: 30, usiaPensiun: 50, kontribusiBulanan: 5000000,
    },
    gapAnalysis: { ok: true, hasTarget: true, gap: 100000000, onTrack: true },
    contributionRecommendation: { ok: true, reko: 2000000, surplus: 10000000, months: 3, pct: 20 },
    recommendation: [
      { type: 'positive', code: 'retire_on_track', message: 'Proyeksi sudah melampaui target sebesar 100.000.000.' },
      { type: 'info', code: 'retire_contribution_below_reko', message: 'Kontribusi di bawah rekomendasi.' },
    ],
  }, overrides);
}

test('retirement-planner-presenter.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('render() — container #retirementPlannerGrid tidak ada di DOM: tidak throw', () => {
  const emptyDoc = { getElementById: () => null, querySelectorAll: () => [] };
  const { RetirementPlannerPresenter } = makeCtx({ document: emptyDoc, RetirementPlannerAPI: { summary: () => fullSummary() } });
  assert.doesNotThrow(() => RetirementPlannerPresenter.render());
});

test('render() — RetirementPlannerAPI belum dimuat: pesan kosong, tidak throw', () => {
  const { RetirementPlannerPresenter, fakeDocument } = makeCtx({ RetirementPlannerAPI: undefined });
  assert.doesNotThrow(() => RetirementPlannerPresenter.render());
  assert.match(fakeDocument.getElementById('retirementPlannerGrid').innerHTML, /belum tersedia/);
});

test('render() — summary() ok:false: pesan kosong ditampilkan', () => {
  const RetirementPlannerAPI = { summary: () => ({ ok: false, reason: 'x' }) };
  const { RetirementPlannerPresenter, fakeDocument } = makeCtx({ RetirementPlannerAPI });
  RetirementPlannerPresenter.render();
  assert.match(fakeDocument.getElementById('retirementPlannerGrid').innerHTML, /belum tersedia/);
});

test('render() — ok: 3 kartu (Proyeksi/Gap/Rekomendasi) ditampilkan dari summary() apa adanya', () => {
  const summary = fullSummary();
  const RetirementPlannerAPI = { summary: () => summary };
  const { RetirementPlannerPresenter, fakeDocument } = makeCtx({ RetirementPlannerAPI });
  RetirementPlannerPresenter.render();
  const html = fakeDocument.getElementById('retirementPlannerGrid').innerHTML;
  assert.match(html, /Proyeksi Dana Pensiun/);
  assert.match(html, /Surplus vs Target/);
  assert.match(html, /Rekomendasi Pensiun/);
});

// ================= _overviewCard =================

test('_overviewCard(o) — o ok:false: value "—", sub = reason', () => {
  const { RetirementPlannerPresenter } = makeCtx();
  const c = RetirementPlannerPresenter._overviewCard({ ok: false, reason: 'x' });
  assert.equal(c.value, '—');
  assert.equal(c.sub, 'x');
});

test('_overviewCard(o) — configured false: pesan "Belum diatur"', () => {
  const { RetirementPlannerPresenter } = makeCtx();
  const c = RetirementPlannerPresenter._overviewCard({ ok: true, configured: false });
  assert.match(c.value, /Belum diatur/);
});

test('_overviewCard(o) — configured true: value = proyeksi', () => {
  const { RetirementPlannerPresenter } = makeCtx();
  const c = RetirementPlannerPresenter._overviewCard({ ok: true, configured: true, terkumpul: 50000000, proyeksi: 600000000, sisaBulan: 240 });
  assert.equal(c.cls, 'purple');
  assert.match(c.sub, /Terkumpul/);
});

// ================= _gapCard =================

test('_gapCard(g) — g ok:false: value "—"', () => {
  const { RetirementPlannerPresenter } = makeCtx();
  const c = RetirementPlannerPresenter._gapCard({ ok: false, reason: 'y' });
  assert.equal(c.value, '—');
  assert.equal(c.sub, 'y');
});

test('_gapCard(g) — hasTarget false: "Belum ada target"', () => {
  const { RetirementPlannerPresenter } = makeCtx();
  const c = RetirementPlannerPresenter._gapCard({ ok: true, hasTarget: false, gap: 0, onTrack: false });
  assert.match(c.value, /Belum ada target/);
});

test('_gapCard(g) — onTrack true: cls green, label Surplus', () => {
  const { RetirementPlannerPresenter } = makeCtx();
  const c = RetirementPlannerPresenter._gapCard({ ok: true, hasTarget: true, gap: 100000000, onTrack: true });
  assert.equal(c.cls, 'green');
  assert.match(c.label, /Surplus/);
});

test('_gapCard(g) — onTrack false: cls red, label Gap', () => {
  const { RetirementPlannerPresenter } = makeCtx();
  const c = RetirementPlannerPresenter._gapCard({ ok: true, hasTarget: true, gap: -200000000, onTrack: false });
  assert.equal(c.cls, 'red');
  assert.match(c.label, /Gap/);
});

// ================= _recommendationCard =================

test('_recommendationCard(r) — array kosong: "Belum ada rekomendasi"', () => {
  const { RetirementPlannerPresenter } = makeCtx();
  const c = RetirementPlannerPresenter._recommendationCard([]);
  assert.match(c.value, /Belum ada rekomendasi/);
});

test('_recommendationCard(r) — menampilkan item pertama sbg highlight, sisanya di sub', () => {
  const { RetirementPlannerPresenter } = makeCtx();
  const c = RetirementPlannerPresenter._recommendationCard([
    { type: 'warning', code: 'a', message: 'Pesan A' },
    { type: 'info', code: 'b', message: 'Pesan B' },
  ]);
  assert.equal(c.value, 'Pesan A');
  assert.equal(c.cls, 'red');
  assert.match(c.sub, /\+1 rekomendasi lain/);
});
