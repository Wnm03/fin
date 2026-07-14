'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// File ini besar & bergantung ke banyak hal (D, IndexedDB, dst) untuk fungsi
// lain, tapi sameId()/uid() sendiri murni. File cuma di-load (bukan
// dijalankan top-level init-nya) supaya kedua fungsi ini bisa diambil.
// data-default.js harus dimuat lebih dulu — `let D = {...}` di file ini
// dibaca langsung dari DEFAULT_COBEK_KATEGORI/DEFAULT_ACCOUNTS/dst
// (sama seperti urutan GROUP_B di build.js). DEFAULT_CATS sendiri
// didefinisikan di renovasi.js (GROUP_A) — di luar cakupan test ini, jadi
// cukup di-stub kosong supaya `let D = {...categories:...}` tidak error.
const ctx = loadSource(
  ['data-default.js', 'features-helpers-global-security.js'],
  { DEFAULT_CATS: { income: [], expense: [] } }
);

test('sameId — membandingkan sebagai string, jadi ID angka vs string dianggap sama', () => {
  // Regresi utk bug nyata yg pernah ditemukan: LinkTx renovation module
  // gagal karena Set.has() menganggap 2 dan '2' beda. sameId() dipakai
  // supaya perbandingan ID selalu konsisten via String(), apa pun tipe aslinya.
  assert.equal(ctx.sameId(2, '2'), true);
  assert.equal(ctx.sameId('2', 2), true);
  assert.equal(ctx.sameId(2, 2), true);
  assert.equal(ctx.sameId('abc', 'abc'), true);
});

test('sameId — ID yang benar-benar beda tetap dianggap beda', () => {
  assert.equal(ctx.sameId(2, 3), false);
  assert.equal(ctx.sameId('2', '3'), false);
  assert.equal(ctx.sameId(null, undefined), false); // 'null' !== 'undefined' sbg string
});

test('uid — selalu naik (monoton) walau dipanggil berkali-kali secara beruntun', () => {
  const ids = Array.from({ length: 20 }, () => ctx.uid());
  for (let i = 1; i < ids.length; i++) {
    assert.ok(ids[i] > ids[i - 1], `uid #${i} (${ids[i]}) harus > uid #${i - 1} (${ids[i - 1]})`);
  }
  // Semua unik (tidak ada tabrakan) — inilah tujuan utama uid() dibanding Date.now() polos.
  assert.equal(new Set(ids).size, ids.length);
});
