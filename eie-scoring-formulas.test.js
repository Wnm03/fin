'use strict';
// tests/eie-scoring-formulas.test.js — domain/scoring-formulas.js
// (calcEES/calcPEHS/calcERI) sebelumnya 0 test sama sekali walau file ini
// eksplisit didesain "100% unit-testable tanpa mock browser API/IndexedDB"
// (lihat komentar di kepala file source). Pure function murni -> di-load
// langsung via loadSource(), sama pola dgn tests/status-classifier.test.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/loadSource');

function load() {
  return loadSource(
    ['economic-intelligence/domain/scoring-formulas.js'],
    {},
    ['calcEES', 'calcPEHS', 'calcERI'],
  );
}

// --- calcEES (Economic Exposure Score) ---

test('calcEES — user tanpa eksposur sama sekali (semua 0, buffer darurat penuh) -> skor rendah', () => {
  const { calcEES } = load();
  const r = calcEES({ emergencyFundMonths: 6, incomeStabilityScore: 100 });
  assert.equal(r.score, 0);
  assert.equal(r.breakdown.bufferInverse, 0);
  assert.equal(r.breakdown.incomeStabilityRisk, 0);
});

test('calcEES — debtToIncomeRatio tinggi + floatingRateDebtRatio ikut menaikkan debtExposure', () => {
  const { calcEES } = load();
  const r = calcEES({ debtToIncomeRatio: 1, floatingRateDebtRatio: 1 });
  // 1*100*0.6 + 1*100*0.4 = 100, di-clamp tetap 100
  assert.equal(r.breakdown.debtExposure, 100);
});

test('calcEES — marketExposure = proporsi aset volatil (saham/reksadana/crypto) dari total aset', () => {
  const { calcEES } = load();
  const r = calcEES({
    savingsTotal: 0, investmentTotal: 100000,
    investmentBreakdown: { saham: 30000, reksadana: 20000, crypto: 0, deposito: 50000 },
  });
  assert.equal(r.breakdown.marketExposure, 50); // (30k+20k)/100k = 50%
});

test('calcEES — totalAsset 0 tidak boleh divide-by-zero (marketExposure jadi 0, bukan NaN)', () => {
  const { calcEES } = load();
  const r = calcEES({});
  assert.equal(r.breakdown.marketExposure, 0);
  assert.equal(r.score, clampedDefaultEESScore());
  function clampedDefaultEESScore() {
    // emergencyFundMonths undefined -> bufferInverse=100, incomeStabilityScore
    // undefined -> incomeStabilityRisk=100 -> score = 0.20*100 + 0.10*100 = 30
    return 30;
  }
});

test('calcEES — semua eksposur maksimum -> skor di-clamp ke 100, tidak lebih', () => {
  const { calcEES } = load();
  const r = calcEES({
    debtToIncomeRatio: 5, floatingRateDebtRatio: 5, importDependencyRatio: 5,
    savingsTotal: 0, investmentTotal: 100, investmentBreakdown: { saham: 100 },
    emergencyFundMonths: 0, incomeStabilityScore: 0, commodityImportRatio: 5,
  });
  assert.equal(r.score, 100);
});

// --- calcPEHS (Personal Economic Health Score) ---

test('calcPEHS — income 0 -> savingsRateScore 0 (bukan divide-by-zero/NaN)', () => {
  const { calcPEHS } = load();
  const r = calcPEHS({ incomeMonthly: 0, cashflowNet: 500000 });
  assert.equal(r.breakdown.savingsRateScore, 0);
});

test('calcPEHS — savings rate 20% dari income -> savingsRateScore maksimal (100)', () => {
  const { calcPEHS } = load();
  const r = calcPEHS({ incomeMonthly: 10000000, cashflowNet: 2000000 });
  assert.equal(r.breakdown.savingsRateScore, 100);
});

test('calcPEHS — cashflow negatif dihitung dari rasio thd pengeluaran, tidak dianggap savings', () => {
  const { calcPEHS } = load();
  const r = calcPEHS({ incomeMonthly: 10000000, cashflowNet: -1000000, expenseMonthly: 5000000 });
  assert.equal(r.breakdown.cashflowScore, 80); // 100 + (-1jt/5jt*100) = 100-20=80
});

test('calcPEHS — cashflow negatif & expenseMonthly 0 -> cashflowScore netral 50 (bukan NaN)', () => {
  const { calcPEHS } = load();
  const r = calcPEHS({ incomeMonthly: 1000000, cashflowNet: -1, expenseMonthly: 0 });
  assert.equal(r.breakdown.cashflowScore, 50);
});

test('calcPEHS — debtToIncomeRatio 0.4 (40%) -> debtHealthScore turun ke 0', () => {
  const { calcPEHS } = load();
  const r = calcPEHS({ debtToIncomeRatio: 0.4 });
  assert.equal(r.breakdown.debtHealthScore, 0);
});

test('calcPEHS — netWorthTrendScore/goalProgressScore default netral 50 kalau belum tersedia dari adapter', () => {
  const { calcPEHS } = load();
  const r = calcPEHS({});
  assert.equal(r.breakdown.netWorthTrendScore, 50);
  assert.equal(r.breakdown.goalProgressScore, 50);
});

// --- calcERI (Economic Risk Index) ---

test('calcERI — semua indikator macro flat (changePct 0) -> ERI 0', () => {
  const { calcERI } = load();
  const flat = { changePct: 0 };
  const r = calcERI({ usdidr: flat, inflasi: flat, bi_rate: flat, ihsg: flat, bbm: flat, emas: flat });
  assert.equal(r.score, 0);
});

test('calcERI — indikator hilang/tidak ada di snapshot dianggap 0 (tidak throw)', () => {
  const { calcERI } = load();
  const r = calcERI({});
  assert.equal(r.score, 0);
});

test('calcERI — changePct sebesar nilai sensitivity masing2 indikator -> sub-skor itu 100', () => {
  const { calcERI } = load();
  const r = calcERI({ usdidr: { changePct: 8 }, inflasi: { changePct: -25 } }); // arah minus tetap dihitung abs
  assert.equal(r.breakdown.fxVolatilityScore, 100);
  assert.equal(r.breakdown.inflationTrendScore, 100);
});

test('calcERI — melebihi sensitivity tetap di-clamp ke 100, bukan lebih', () => {
  const { calcERI } = load();
  const r = calcERI({ ihsg: { changePct: 999 } });
  assert.equal(r.breakdown.marketVolatilityScore, 100);
  assert.ok(r.score <= 100);
});
