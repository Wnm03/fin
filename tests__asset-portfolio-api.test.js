'use strict';
// tests/asset-portfolio-api.test.js — AssetPortfolioAPI (modules/asset/
// asset-portfolio-api.js). S101 (Batch 10) — Asset Portfolio Foundation:
// Portfolio Composition, Allocation Breakdown, Investment Allocation
// pass-through, Net Worth Snapshot, summary(). 100% reuse
// Aset.totalValue() / Investment.portfolioSummary() /
// Investment.assetAllocation() / totalSaldoAkun() /
// Kekayaan.currentNetWorth(). Pola sama persis
// tests/financial-goal-api.test.js — dependency di-mock lewat loadSource
// extraGlobals (isolasi murni).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts = {}) {
  const ctx = loadSource(['modules/asset/asset-portfolio-api.js'], {
    ...opts,
  }, ['AssetPortfolioAPI']);
  return { AssetPortfolioAPI: ctx.AssetPortfolioAPI };
}

function fullDeps(overrides = {}) {
  return Object.assign({
    totalSaldoAkun: () => 5000000,
    Aset: { totalValue: () => 20000000 },
    Investment: {
      portfolioSummary: () => ({ holdingsCount: 2, totalValue: 8000000, totalCost: 6000000, totalGainLoss: 2000000, roiPct: 33.33, totalDividend: 100000, totalRealizedGain: 0 }),
      assetAllocation: () => ([
        { type: 'Saham', value: 5000000, pct: 62.5 },
        { type: 'Emas', value: 3000000, pct: 37.5 },
      ]),
    },
    Kekayaan: { currentNetWorth: () => 30000000 },
    D: { assets: [{ id: 1, nilai: 10000000 }, { id: 2, nilai: 10000000 }] },
  }, overrides);
}

test('asset-portfolio-api.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

// ================= portfolioComposition =================

test('portfolioComposition() — totalSaldoAkun belum dimuat: ok:false', () => {
  const { AssetPortfolioAPI } = makeCtx(fullDeps({ totalSaldoAkun: undefined }));
  const r = AssetPortfolioAPI.portfolioComposition();
  assert.equal(r.ok, false);
  assert.match(r.reason, /totalSaldoAkun belum dimuat/);
});

test('portfolioComposition() — Aset belum dimuat: ok:false', () => {
  const { AssetPortfolioAPI } = makeCtx(fullDeps({ Aset: undefined }));
  const r = AssetPortfolioAPI.portfolioComposition();
  assert.equal(r.ok, false);
  assert.match(r.reason, /Aset belum dimuat/);
});

test('portfolioComposition() — Investment belum dimuat: ok:false', () => {
  const { AssetPortfolioAPI } = makeCtx(fullDeps({ Investment: undefined }));
  const r = AssetPortfolioAPI.portfolioComposition();
  assert.equal(r.ok, false);
  assert.match(r.reason, /Investment belum dimuat/);
});

test('portfolioComposition() — totalSaldoAkun() throw: ok:false, tidak menjatuhkan', () => {
  const { AssetPortfolioAPI } = makeCtx(fullDeps({ totalSaldoAkun: () => { throw new Error('boom'); } }));
  const r = AssetPortfolioAPI.portfolioComposition();
  assert.equal(r.ok, false);
  assert.match(r.reason, /gagal dipanggil/);
});

test('portfolioComposition() — semua dependency ada: totalValue = cash+asset+investment', () => {
  const { AssetPortfolioAPI } = makeCtx(fullDeps());
  const r = AssetPortfolioAPI.portfolioComposition();
  assert.equal(r.ok, true);
  assert.equal(r.cashValue, 5000000);
  assert.equal(r.assetValue, 20000000);
  assert.equal(r.investmentValue, 8000000);
  assert.equal(r.totalValue, 33000000);
  assert.equal(r.assetCount, 2);
  assert.equal(r.investmentHoldingsCount, 2);
});

test('portfolioComposition() — D.assets tidak ada: assetCount 0 (tidak error)', () => {
  const { AssetPortfolioAPI } = makeCtx(fullDeps({ D: undefined }));
  const r = AssetPortfolioAPI.portfolioComposition();
  assert.equal(r.ok, true);
  assert.equal(r.assetCount, 0);
});

// ================= allocationBreakdown =================

test('allocationBreakdown() — meneruskan ok:false dari portfolioComposition()', () => {
  const { AssetPortfolioAPI } = makeCtx(fullDeps({ Aset: undefined }));
  const r = AssetPortfolioAPI.allocationBreakdown();
  assert.equal(r.ok, false);
});

test('allocationBreakdown() — pct per kategori dihitung dari totalValue, diurutkan desc', () => {
  const { AssetPortfolioAPI } = makeCtx(fullDeps());
  const r = AssetPortfolioAPI.allocationBreakdown();
  assert.equal(r.ok, true);
  assert.equal(r.totalValue, 33000000);
  assert.equal(r.breakdown.length, 3);
  // Urutan desc by value: Aset Fisik (20jt) > Investasi (8jt) > Kas (5jt)
  assert.equal(r.breakdown[0].category, 'Aset Fisik');
  assert.equal(r.breakdown[1].category, 'Investasi');
  assert.equal(r.breakdown[2].category, 'Kas / Akun');
  const sumPct = r.breakdown.reduce((s, b) => s + b.pct, 0);
  assert.ok(Math.abs(sumPct - 100) < 0.0001);
});

test('allocationBreakdown() — totalValue 0: semua pct 0 (guard div-by-zero)', () => {
  const { AssetPortfolioAPI } = makeCtx(fullDeps({
    totalSaldoAkun: () => 0,
    Aset: { totalValue: () => 0 },
    Investment: { portfolioSummary: () => ({ totalValue: 0, holdingsCount: 0 }), assetAllocation: () => [] },
  }));
  const r = AssetPortfolioAPI.allocationBreakdown();
  assert.equal(r.ok, true);
  r.breakdown.forEach((b) => assert.equal(b.pct, 0));
});

// ================= investmentAllocation (pass-through) =================

test('investmentAllocation() — Investment belum dimuat: ok:false', () => {
  const { AssetPortfolioAPI } = makeCtx(fullDeps({ Investment: undefined }));
  const r = AssetPortfolioAPI.investmentAllocation();
  assert.equal(r.ok, false);
  assert.match(r.reason, /Investment belum dimuat/);
});

test('investmentAllocation() — meneruskan Investment.assetAllocation() apa adanya', () => {
  const { AssetPortfolioAPI } = makeCtx(fullDeps());
  const r = AssetPortfolioAPI.investmentAllocation();
  assert.equal(r.ok, true);
  assert.deepEqual(r.breakdown, [
    { type: 'Saham', value: 5000000, pct: 62.5 },
    { type: 'Emas', value: 3000000, pct: 37.5 },
  ]);
});

test('investmentAllocation() — Investment.assetAllocation() throw: ok:false', () => {
  const { AssetPortfolioAPI } = makeCtx(fullDeps({
    Investment: { assetAllocation: () => { throw new Error('boom'); } },
  }));
  const r = AssetPortfolioAPI.investmentAllocation();
  assert.equal(r.ok, false);
  assert.match(r.reason, /gagal dipanggil/);
});

// ================= netWorthSnapshot =================

test('netWorthSnapshot() — Kekayaan belum dimuat: ok:false', () => {
  const { AssetPortfolioAPI } = makeCtx(fullDeps({ Kekayaan: undefined }));
  const r = AssetPortfolioAPI.netWorthSnapshot();
  assert.equal(r.ok, false);
  assert.match(r.reason, /Kekayaan belum dimuat/);
});

test('netWorthSnapshot() — netWorth apa adanya, portfolioValue dari portfolioComposition()', () => {
  const { AssetPortfolioAPI } = makeCtx(fullDeps());
  const r = AssetPortfolioAPI.netWorthSnapshot();
  assert.equal(r.ok, true);
  assert.equal(r.netWorth, 30000000);
  assert.equal(r.portfolioValue, 33000000);
});

test('netWorthSnapshot() — portfolioComposition gagal: portfolioValue null (tidak ikut menjatuhkan)', () => {
  const { AssetPortfolioAPI } = makeCtx(fullDeps({ Aset: undefined }));
  const r = AssetPortfolioAPI.netWorthSnapshot();
  assert.equal(r.ok, true);
  assert.equal(r.portfolioValue, null);
});

// ================= summary =================

test('summary() — ok true & menggabungkan seluruh sub-hasil, tidak ada logic tambahan', () => {
  const { AssetPortfolioAPI } = makeCtx(fullDeps());
  const r = AssetPortfolioAPI.summary();
  assert.equal(r.ok, true);
  assert.equal(r.composition.totalValue, 33000000);
  assert.equal(r.allocation.breakdown.length, 3);
  assert.equal(r.investmentAllocation.breakdown.length, 2);
  assert.equal(r.netWorth.netWorth, 30000000);
});

test('summary() — dependency dasar hilang: ok false, sub-hasil tetap objek (tidak throw)', () => {
  const { AssetPortfolioAPI } = makeCtx(fullDeps({ totalSaldoAkun: undefined }));
  assert.doesNotThrow(() => AssetPortfolioAPI.summary());
  const r = AssetPortfolioAPI.summary();
  assert.equal(r.ok, false);
});
