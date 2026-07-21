'use strict';
// tests/retirement-planner-api.test.js — RetirementPlannerAPI (modules/
// finance/retirement-planner-api.js). Sesi 97 (Batch 10) — Retirement
// Planner Foundation: Retirement Overview, Gap Analysis, Contribution
// Recommendation, Retirement Recommendation, summary(). 100% reuse
// `Pensiun` (modules/shared/modules-calc.js). Pola sama persis tests/
// debt-optimizer-api.test.js — dependency di-mock lewat loadSource
// extraGlobals (isolasi murni).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts = {}) {
  const ctx = loadSource(['modules/finance/retirement-planner-api.js'], {
    ...opts,
  }, ['RetirementPlannerAPI']);
  return { RetirementPlannerAPI: ctx.RetirementPlannerAPI };
}

function makePensiun(overrides = {}) {
  return Object.assign({
    danaTerkumpul: () => 50000000,
    proyeksi: () => 400000000,
    sisaBulan: () => 240,
    rekomendasiKontribusi: () => ({ reko: 2000000, surplus: 10000000, months: 3, pct: 20 }),
  }, overrides);
}

function makeD(pensiunOverrides = {}) {
  return {
    pensiun: Object.assign({
      usiaSekarang: 30,
      usiaPensiun: 50,
      accId: 'acc1',
      targetDana: 500000000,
      kontribusiBulanan: 1000000,
    }, pensiunOverrides),
  };
}

test('retirement-planner-api.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

// ================= _overview (via retirementOverview) =================

test('retirementOverview() — Pensiun belum dimuat: ok:false', () => {
  const { RetirementPlannerAPI } = makeCtx({ Pensiun: undefined });
  const r = RetirementPlannerAPI.retirementOverview();
  assert.equal(r.ok, false);
  assert.match(r.reason, /belum dimuat/);
});

test('retirementOverview() — Pensiun.proyeksi() throw: ok:false, tidak menjatuhkan', () => {
  const Pensiun = makePensiun({ proyeksi: () => { throw new Error('boom'); } });
  const { RetirementPlannerAPI } = makeCtx({ Pensiun, D: makeD() });
  assert.doesNotThrow(() => RetirementPlannerAPI.retirementOverview());
  const r = RetirementPlannerAPI.retirementOverview();
  assert.equal(r.ok, false);
});

test('retirementOverview() — meneruskan Pensiun apa adanya + field D.pensiun', () => {
  const Pensiun = makePensiun();
  const D = makeD();
  const { RetirementPlannerAPI } = makeCtx({ Pensiun, D });
  const r = RetirementPlannerAPI.retirementOverview();
  assert.equal(r.ok, true);
  assert.equal(r.configured, true);
  assert.equal(r.terkumpul, 50000000);
  assert.equal(r.proyeksi, 400000000);
  assert.equal(r.sisaBulan, 240);
  assert.equal(r.target, 500000000);
  assert.equal(r.kontribusiBulanan, 1000000);
});

test('retirementOverview() — belum diatur (usia/target/akun kosong): configured false', () => {
  const Pensiun = makePensiun();
  const D = { pensiun: {} };
  const { RetirementPlannerAPI } = makeCtx({ Pensiun, D });
  const r = RetirementPlannerAPI.retirementOverview();
  assert.equal(r.ok, true);
  assert.equal(r.configured, false);
});

// ================= _contribution (via contributionRecommendation) =================

test('contributionRecommendation() — Pensiun belum dimuat: ok:false', () => {
  const { RetirementPlannerAPI } = makeCtx({ Pensiun: undefined });
  const r = RetirementPlannerAPI.contributionRecommendation();
  assert.equal(r.ok, false);
});

test('contributionRecommendation() — Pensiun.rekomendasiKontribusi() throw: ok:false, tidak menjatuhkan', () => {
  const Pensiun = { rekomendasiKontribusi: () => { throw new Error('boom'); } };
  const { RetirementPlannerAPI } = makeCtx({ Pensiun });
  assert.doesNotThrow(() => RetirementPlannerAPI.contributionRecommendation());
});

test('contributionRecommendation() — meneruskan Pensiun.rekomendasiKontribusi() apa adanya', () => {
  const Pensiun = makePensiun();
  const { RetirementPlannerAPI } = makeCtx({ Pensiun });
  const r = RetirementPlannerAPI.contributionRecommendation();
  assert.equal(r.ok, true);
  assert.equal(r.reko, 2000000);
  assert.equal(r.pct, 20);
});

// ================= gapAnalysis =================

test('gapAnalysis() — retirementOverview ok:false: diteruskan apa adanya', () => {
  const { RetirementPlannerAPI } = makeCtx({ Pensiun: undefined });
  const r = RetirementPlannerAPI.gapAnalysis();
  assert.equal(r.ok, false);
});

test('gapAnalysis() — target<=0: hasTarget false', () => {
  const Pensiun = makePensiun();
  const D = makeD({ targetDana: 0 });
  const { RetirementPlannerAPI } = makeCtx({ Pensiun, D });
  const r = RetirementPlannerAPI.gapAnalysis();
  assert.equal(r.ok, true);
  assert.equal(r.hasTarget, false);
});

test('gapAnalysis() — proyeksi>=target: onTrack true, gap = proyeksi-target', () => {
  const Pensiun = makePensiun({ proyeksi: () => 600000000 });
  const D = makeD({ targetDana: 500000000 });
  const { RetirementPlannerAPI } = makeCtx({ Pensiun, D });
  const r = RetirementPlannerAPI.gapAnalysis();
  assert.equal(r.onTrack, true);
  assert.equal(r.gap, 100000000);
});

test('gapAnalysis() — proyeksi<target: onTrack false, gap negatif', () => {
  const Pensiun = makePensiun({ proyeksi: () => 300000000 });
  const D = makeD({ targetDana: 500000000 });
  const { RetirementPlannerAPI } = makeCtx({ Pensiun, D });
  const r = RetirementPlannerAPI.gapAnalysis();
  assert.equal(r.onTrack, false);
  assert.equal(r.gap, -200000000);
});

// ================= retirementRecommendation =================

test('retirementRecommendation() — retirementOverview ok:false: array kosong', () => {
  const { RetirementPlannerAPI } = makeCtx({ Pensiun: undefined });
  const r = RetirementPlannerAPI.retirementRecommendation();
  assert.equal(r.length, 0);
});

test('retirementRecommendation() — belum configured: info retire_not_configured, berhenti', () => {
  const Pensiun = makePensiun();
  const D = { pensiun: {} };
  const { RetirementPlannerAPI } = makeCtx({ Pensiun, D });
  const r = RetirementPlannerAPI.retirementRecommendation();
  assert.equal(r.length, 1);
  assert.equal(r[0].code, 'retire_not_configured');
});

test('retirementRecommendation() — configured tanpa target: info retire_no_target', () => {
  const Pensiun = makePensiun();
  const D = makeD({ targetDana: 0 });
  const { RetirementPlannerAPI } = makeCtx({ Pensiun, D });
  const r = RetirementPlannerAPI.retirementRecommendation();
  const item = r.find((x) => x.code === 'retire_no_target');
  assert.ok(item);
  assert.equal(item.type, 'info');
});

test('retirementRecommendation() — onTrack true: positive retire_on_track', () => {
  const Pensiun = makePensiun({ proyeksi: () => 600000000 });
  const D = makeD({ targetDana: 500000000, kontribusiBulanan: 5000000 });
  const { RetirementPlannerAPI } = makeCtx({ Pensiun, D });
  const r = RetirementPlannerAPI.retirementRecommendation();
  const item = r.find((x) => x.code === 'retire_on_track');
  assert.ok(item);
  assert.equal(item.type, 'positive');
});

test('retirementRecommendation() — onTrack false: warning retire_gap', () => {
  const Pensiun = makePensiun({ proyeksi: () => 300000000 });
  const D = makeD({ targetDana: 500000000, kontribusiBulanan: 5000000 });
  const { RetirementPlannerAPI } = makeCtx({ Pensiun, D });
  const r = RetirementPlannerAPI.retirementRecommendation();
  const item = r.find((x) => x.code === 'retire_gap');
  assert.ok(item);
  assert.equal(item.type, 'warning');
});

test('retirementRecommendation() — reko>kontribusiBulanan: info retire_contribution_below_reko', () => {
  const Pensiun = makePensiun({ rekomendasiKontribusi: () => ({ reko: 3000000, surplus: 15000000, months: 3, pct: 20 }) });
  const D = makeD({ kontribusiBulanan: 1000000 });
  const { RetirementPlannerAPI } = makeCtx({ Pensiun, D });
  const r = RetirementPlannerAPI.retirementRecommendation();
  assert.ok(r.some((x) => x.code === 'retire_contribution_below_reko'));
});

test('retirementRecommendation() — reko<=kontribusiBulanan: retire_contribution_below_reko TIDAK muncul', () => {
  const Pensiun = makePensiun({ rekomendasiKontribusi: () => ({ reko: 500000, surplus: 2500000, months: 3, pct: 20 }) });
  const D = makeD({ kontribusiBulanan: 1000000 });
  const { RetirementPlannerAPI } = makeCtx({ Pensiun, D });
  const r = RetirementPlannerAPI.retirementRecommendation();
  assert.equal(r.some((x) => x.code === 'retire_contribution_below_reko'), false);
});

// ================= summary =================

test('summary() — ok true kalau retirementOverview ok, gabungan field sesuai', () => {
  const Pensiun = makePensiun();
  const D = makeD();
  const { RetirementPlannerAPI } = makeCtx({ Pensiun, D });
  const r = RetirementPlannerAPI.summary();
  assert.equal(r.ok, true);
  assert.equal(r.retirementOverview.configured, true);
  assert.equal(r.gapAnalysis.ok, true);
  assert.equal(r.contributionRecommendation.ok, true);
  assert.ok(Array.isArray(r.recommendation));
});

test('summary() — Pensiun belum dimuat: ok false, recommendation array kosong', () => {
  const { RetirementPlannerAPI } = makeCtx({ Pensiun: undefined });
  const r = RetirementPlannerAPI.summary();
  assert.equal(r.ok, false);
  assert.equal(r.recommendation.length, 0);
});
