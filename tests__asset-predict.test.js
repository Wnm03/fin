'use strict';
// tests/asset-predict.test.js — Smart Delivery Engine, Sesi 5/6:
// predictAssetValue/netWorthForecast (modules/asset/aset.js).
// predictAssetValue() MEMANGGIL Penyusutan.hitung() asli (bukan
// reimplementasi) dgn tanggal masa depan — Penyusutan sendiri sudah dites
// lengkap di tests/aset.test.js, jadi di sini cukup pastikan pemanggilan &
// fallback flat-nya benar. netWorthForecast() butuh Kekayaan (modules/
// shared/modules-calc.js) — di-stub di sini (sudah dites terpisah).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D, opts = {}) {
  return loadSource(['modules/asset/aset.js'], {
    D,
    document: opts.document,
    window: opts.window || {},
    escapeHtml: (s) => String(s == null ? '' : s),
    sameId: (a, b) => String(a) === String(b),
    todayStr: () => '2026-07-18',
    dateToISO: opts.dateToISO || ((d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')),
    save: () => {},
    toast: () => {},
    Kekayaan: opts.Kekayaan,
    predictCashflow: opts.predictCashflow,
  }, ['Penyusutan']);
}

// ================= predictAssetValue =================

test('predictAssetValue — aset tidak ditemukan => ok:false', () => {
  const ctx = makeCtx({ assets: [] });
  const result = ctx.predictAssetValue({ assetId: 'tidak-ada', monthsAhead: 12 });
  assert.equal(result.ok, false);
});

test('predictAssetValue — penyusutan TIDAK aktif => flat, nilaiPrediksi = nilaiSaatIni', () => {
  const D = { assets: [{ id: 'a1', name: 'Motor', nilai: 15000000 }] };
  const ctx = makeCtx(D);
  const result = ctx.predictAssetValue({ assetId: 'a1', monthsAhead: 12 });
  assert.equal(result.ok, true);
  assert.equal(result.metode, 'flat');
  assert.equal(result.nilaiPrediksi, 15000000);
  assert.equal(result.nilaiSaatIni, 15000000);
});

test('predictAssetValue — penyusutan Garis Lurus aktif: nilaiPrediksi turun sesuai umur manfaat, konsisten dgn Penyusutan.garisLurus()', () => {
  const D = {
    assets: [{
      id: 'a1', name: 'Motor', nilai: 15000000, hargaBeli: 15000000, jumlahUnit: 1,
      tanggal: '2026-01-01',
      penyusutan: { aktif: true, metode: 'garisLurus', umurManfaatTahun: 4, nilaiResidu: 0 },
    }],
  };
  const ctx = makeCtx(D);
  const result = ctx.predictAssetValue({ assetId: 'a1', monthsAhead: 12 });
  assert.equal(result.ok, true);
  assert.equal(result.metode, 'garisLurus');
  // Cross-check langsung ke Penyusutan.garisLurus (sumber asli) dgn tanggal target yg sama.
  const expected = ctx.Penyusutan.garisLurus(15000000, 0, 4, '2026-01-01', result.targetDate);
  assert.equal(result.nilaiPrediksi, expected.nilaiBuku);
  assert.ok(result.nilaiPrediksi < 15000000); // nilai turun, bukan flat
});

test('predictAssetValue — targetDate = tanggal sekarang + monthsAhead bulan', () => {
  const D = { assets: [{ id: 'a1', name: 'X', nilai: 1000000 }] };
  const ctx = makeCtx(D);
  const result = ctx.predictAssetValue({ assetId: 'a1', monthsAhead: 6 });
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate());
  const expectedISO = target.getFullYear() + '-' + String(target.getMonth() + 1).padStart(2, '0') + '-' + String(target.getDate()).padStart(2, '0');
  assert.equal(result.targetDate, expectedISO);
});

// ================= netWorthForecast =================

test('netWorthForecast — guard: Kekayaan belum dimuat => ok:false', () => {
  const ctx = makeCtx({ assets: [] });
  const result = ctx.netWorthForecast({ monthsAhead: 6 });
  assert.equal(result.ok, false);
});

test('netWorthForecast — CAGR tersedia: compound bulanan dari actualCAGR(), tidak jatuh ke fallback cashflow', () => {
  const cagr = 0.12; // 12%/tahun
  const Kekayaan = {
    currentNetWorth: () => 100000000,
    actualCAGR: () => ({ cagr, first: {}, last: {}, years: 1, reason: null }),
  };
  const ctx = makeCtx({ assets: [] }, { Kekayaan });
  const result = ctx.netWorthForecast({ monthsAhead: 3 });
  assert.equal(result.ok, true);
  assert.equal(result.metode, 'cagr-snapshot');
  const monthlyRate = Math.pow(1 + cagr, 1 / 12) - 1;
  let nw = 100000000;
  const expected = [];
  for (let i = 0; i < 3; i++) { nw = nw * (1 + monthlyRate); expected.push(nw); }
  result.months.forEach((m, i) => assert.ok(Math.abs(m.netWorthProjected - expected[i]) < 1e-6));
  assert.ok(Math.abs(result.projectedEnd - expected[2]) < 1e-6);
});

test('netWorthForecast — CAGR TIDAK tersedia (reason terisi): fallback ke predictCashflow (cashflow-delta)', () => {
  const Kekayaan = {
    currentNetWorth: () => 50000000,
    actualCAGR: () => null, // histori snapshot belum cukup
  };
  const predictCashflow = ({ monthsAhead }) => ({
    ok: true,
    monthlyNet: 1000000,
    months: Array.from({ length: monthsAhead }, (_, i) => ({ month: `2026-${String(i + 8).padStart(2, '0')}` })),
  });
  const ctx = makeCtx({ assets: [] }, { Kekayaan, predictCashflow });
  const result = ctx.netWorthForecast({ monthsAhead: 3 });
  assert.equal(result.ok, true);
  assert.equal(result.metode, 'cashflow-delta');
  assert.equal(result.months[0].netWorthProjected, 51000000);
  assert.equal(result.months[1].netWorthProjected, 52000000);
  assert.equal(result.months[2].netWorthProjected, 53000000);
  assert.equal(result.projectedEnd, 53000000);
});

test('netWorthForecast — CAGR & predictCashflow keduanya tidak tersedia => ok:false apa adanya (tidak mengarang angka)', () => {
  const Kekayaan = { currentNetWorth: () => 50000000, actualCAGR: () => null };
  const ctx = makeCtx({ assets: [] }, { Kekayaan }); // predictCashflow sengaja tidak diberikan
  const result = ctx.netWorthForecast({ monthsAhead: 3 });
  assert.equal(result.ok, false);
});
