'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// Cakupan file ini: TanggaKeuangan._isKprLike (tangga-keuangan.js) — dulu
// KPR dideteksi dari nama cicilan (regex "kpr|rumah|properti|apartemen|ruko"),
// sekarang pakai flag eksplisit `bill.isKpr` yang diisi via checkbox "Ini KPR"
// di form Cicilan (lihat modals.js/transaksi.js). Fallback ke deteksi kata
// kunci lama HANYA dipertahankan utk cicilan lama (isKpr === undefined),
// supaya data yg dibuat sebelum patch ini tidak tiba-tiba lepas dari anak
// tangga #6 "Lunasi KPR" sebelum sempat dibuka & disimpan ulang.
//
// _isKprLike murni logic (tidak sentuh DOM), jadi cukup di-load via
// loadSource + expose, tanpa perlu stub D/document macam-macam.

function loadTangga() {
  const ctx = loadSource(['modules/finance/tangga-keuangan.js'], {}, ['TanggaKeuangan']);
  return ctx.TanggaKeuangan;
}

test('_isKprLike — isKpr:true -> true, walau nama tidak mengandung kata kunci apa pun', () => {
  const TanggaKeuangan = loadTangga();
  assert.equal(TanggaKeuangan._isKprLike({ name: 'Cicilan Motor Baru', isKpr: true }), true);
});

test('_isKprLike — isKpr:false -> false, walau nama mengandung kata "rumah"/"kpr"', () => {
  const TanggaKeuangan = loadTangga();
  assert.equal(TanggaKeuangan._isKprLike({ name: 'KPR Rumah Idaman', isKpr: false }), false);
  assert.equal(TanggaKeuangan._isKprLike({ name: 'Renovasi Rumah', isKpr: false }), false);
});

test('_isKprLike — isKpr undefined (cicilan lama sebelum checkbox ada) -> fallback ke deteksi kata kunci lama', () => {
  const TanggaKeuangan = loadTangga();
  assert.equal(TanggaKeuangan._isKprLike({ name: 'KPR BTN' }), true);
  assert.equal(TanggaKeuangan._isKprLike({ name: 'Cicilan Ruko Usaha' }), true);
  assert.equal(TanggaKeuangan._isKprLike({ name: 'Cicilan Motor' }), false);
});

test('_isKprLike — nama kosong/undefined & isKpr undefined -> false, tidak error', () => {
  const TanggaKeuangan = loadTangga();
  assert.equal(TanggaKeuangan._isKprLike({}), false);
  assert.equal(TanggaKeuangan._isKprLike({ name: undefined }), false);
});

test('compute() — anak tangga #2 (hutang kecil, bukan KPR) & #6 (KPR) membedakan lewat isKpr, bukan nama', () => {
  const TanggaKeuangan = loadTangga();
  const D = {
    accounts: [],
    bills: [
      // Nama mengandung "Rumah" tapi eksplisit ditandai BUKAN KPR (mis. cicilan renovasi) -> masuk hutang kecil (#2), bukan KPR (#6).
      { kind: 'cicilan', name: 'Cicilan Renovasi Rumah', sisaTenor: 5, isKpr: false },
      // Nama netral tapi eksplisit ditandai KPR lewat checkbox -> masuk KPR (#6), bukan hutang kecil (#2).
      { kind: 'cicilan', name: 'Cicilan Bulanan BTN', sisaTenor: 100, isKpr: true },
    ],
    targets: [], assets: [], eduFunds: [], pajakZakat: { zakatLog: [] },
  };
  const totalSaldoAkun = () => 0;
  const WorthIt = { incomeAvg: () => 0 };
  const ctx = loadSource(['modules/finance/tangga-keuangan.js'], {
    D, totalSaldoAkun, WorthIt, fmtFull: (n) => `Rp ${n}`,
  }, ['TanggaKeuangan']);
  const { steps } = ctx.TanggaKeuangan.compute();
  // Step index 1 = anak tangga #2 (Hutang Kecil bukan KPR): ada 1 hutang kecil aktif (Renovasi Rumah) -> belum selesai.
  assert.equal(steps[1].done, false);
  assert.ok(steps[1].note.includes('1 cicilan kecil'));
  // Step index 5 = anak tangga #6 (Lunasi KPR): ada 1 KPR aktif (BTN, walau namanya netral) -> belum selesai.
  assert.equal(steps[5].done, false);
  assert.ok(steps[5].note.includes('1 KPR'));
});
