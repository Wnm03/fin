'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// Cakupan file ini: AsetKeluarga.{keuangan,shop,carNotes,build} di
// aset-keluarga.js — laporan gabungan lintas-modul "🏠 Aset Keluarga" (Sprint
// 2 Tahap 5). render() (baca/tulis DOM) SENGAJA tidak dites di sini (pola
// sama dgn LaporanAset.renderList() di aset.test.js — itu ranah smoke-test.js
// / manual QA), fokus hanya ke logic murni build() yang bisa dites tanpa DOM.
//
// totalSaldoAkun()/totalDebtValue()/totalCicilanOutstanding()/
// totalInventoriBisnisValue()/totalPiutangValue() di-stub sbg fungsi global
// sederhana (bukan load file aslinya) krn fungsi2 itu sendiri sudah dites
// terpisah di file lain (akun.test.js, dst) — di sini cuma perlu memastikan
// AsetKeluarga MEMANGGIL & MENJUMLAHKAN-nya dengan benar.
function buildSandbox(D, stubs) {
  return loadSource(['modules/asset/aset-keluarga.js'], {
    D,
    totalSaldoAkun: () => stubs.saldoAkun || 0,
    totalDebtValue: () => stubs.debtValue || 0,
    totalCicilanOutstanding: () => stubs.cicilan || 0,
    totalInventoriBisnisValue: () => stubs.inventori || 0,
    totalPiutangValue: () => stubs.piutang || 0,
  }, ['AsetKeluarga']);
}

test('AsetKeluarga.keuangan() — saldo akun dikurangi utang manual + utang buku + cicilan', () => {
  const D = { pajakZakat: { utangJT: 1000000 }, assets: [], vehicles: [] };
  const ctx = buildSandbox(D, { saldoAkun: 5000000, debtValue: 2000000, cicilan: 500000 });
  const r = ctx.AsetKeluarga.keuangan();
  assert.equal(r.saldoAkun, 5000000);
  assert.equal(r.utang, 1000000 + 2000000 + 500000);
  assert.equal(r.net, 5000000 - 3500000);
});

test('AsetKeluarga.keuangan() — tanpa utangJT (undefined) dianggap 0, tidak error', () => {
  const D = { pajakZakat: {}, assets: [], vehicles: [] };
  const ctx = buildSandbox(D, { saldoAkun: 1000000 });
  const r = ctx.AsetKeluarga.keuangan();
  assert.equal(r.utang, 0);
  assert.equal(r.net, 1000000);
});

test('AsetKeluarga.shop() — nilai inventori + piutang dijumlah, masing-masing tetap terekspos terpisah', () => {
  const D = { pajakZakat: {}, assets: [], vehicles: [] };
  const ctx = buildSandbox(D, { inventori: 3000000, piutang: 750000 });
  const r = ctx.AsetKeluarga.shop();
  assert.equal(r.inventori, 3000000);
  assert.equal(r.piutang, 750000);
  assert.equal(r.net, 3750000);
});

test('AsetKeluarga.carNotes() — menghitung nilai dari D.assets jenis Kendaraan, dibandingkan jumlah D.vehicles', () => {
  const D = {
    pajakZakat: {},
    vehicles: [{ id: 'v1', name: 'Vario 125' }, { id: 'v2', name: 'Beat' }],
    assets: [
      { id: 'a1', jenis: 'Kendaraan', nilai: 15000000 },
      { id: 'a2', jenis: 'Tanah', nilai: 100000000 },
    ],
  };
  const ctx = buildSandbox(D, {});
  const r = ctx.AsetKeluarga.carNotes();
  assert.equal(r.jumlahKendaraan, 2);
  assert.equal(r.jumlahAsetKendaraan, 1);
  assert.equal(r.nilaiTercatat, 15000000);
});

test('AsetKeluarga.carNotes() — belum ada kendaraan & belum ada aset Kendaraan sama sekali', () => {
  const D = { pajakZakat: {}, vehicles: [], assets: [] };
  const ctx = buildSandbox(D, {});
  const r = ctx.AsetKeluarga.carNotes();
  assert.equal(r.jumlahKendaraan, 0);
  assert.equal(r.jumlahAsetKendaraan, 0);
  assert.equal(r.nilaiTercatat, 0);
});

test('AsetKeluarga.build() — total = net keuangan + net shop + nilai kendaraan tercatat', () => {
  const D = {
    pajakZakat: { utangJT: 0 },
    vehicles: [{ id: 'v1' }],
    assets: [{ id: 'a1', jenis: 'Kendaraan', nilai: 20000000 }],
  };
  const ctx = buildSandbox(D, {
    saldoAkun: 10000000,
    debtValue: 1000000,
    cicilan: 0,
    inventori: 5000000,
    piutang: 0,
  });
  const r = ctx.AsetKeluarga.build();
  assert.equal(r.keuangan.net, 9000000);
  assert.equal(r.shop.net, 5000000);
  assert.equal(r.carNotes.nilaiTercatat, 20000000);
  assert.equal(r.total, 9000000 + 5000000 + 20000000);
});

test('AsetKeluarga.build() — total bisa negatif kalau utang lebih besar dari aset (tidak dipaksa Math.max(0,...))', () => {
  const D = { pajakZakat: { utangJT: 0 }, vehicles: [], assets: [] };
  const ctx = buildSandbox(D, { saldoAkun: 100000, debtValue: 5000000 });
  const r = ctx.AsetKeluarga.build();
  assert.ok(r.total < 0);
});
