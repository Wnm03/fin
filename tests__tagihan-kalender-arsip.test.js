'use strict';
// tests/tagihan-kalender-arsip.test.js — delBillArchive() (modules/finance/
// tagihan-kalender.js). Sesi 132 (audit): sebelumnya Riwayat Tagihan Lunas
// (renderBillArchive, modules/shared/modules-render.js) cuma bisa dilihat
// lewat "Riwayat Pembayaran", tidak ada cara hapus permanen entri arsipnya
// — satu-satunya jalan tidak langsung adalah hapus transaksi pembayaran
// terakhir (mengembalikan tagihan ke status AKTIF, bukan menghapusnya).
// delBillArchive() menutup gap itu: murni menghapus record D.billsArchive
// itu sendiri, TIDAK menyentuh D.transactions (riwayat pembayaran yang
// sudah tercatat tetap sah, pola sama dgn delAsset/delSparepart).
//
// File ini HANYA menguji delBillArchive() secara terisolasi (bukan seluruh
// tagihan-kalender.js — file itu belum punya test suite sebelumnya & scope-
// nya besar/lintas domain; loadSource permisif thd global lain yang tak
// dipakai fungsi ini, lihat catatan di helpers/loadSource.js).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D, opts = {}) {
  const calls = { save: 0, toast: [], renderBillArchive: 0 };
  const ctx = loadSource(['modules/finance/tagihan-kalender.js'], {
    D,
    escapeHtml: (s) => String(s == null ? '' : s),
    askConfirm: opts.askConfirm || (async () => true),
    save: () => { calls.save++; },
    toast: (msg) => calls.toast.push(msg),
    renderBillArchive: () => { calls.renderBillArchive++; },
  }, ['delBillArchive']);
  return { ctx, calls };
}

test('delBillArchive — id tidak ditemukan di D.billsArchive: tidak throw, tidak ada perubahan', async () => {
  const D = { billsArchive: [{ id: 'b1', name: 'Listrik' }] };
  const { ctx, calls } = makeCtx(D);
  await ctx.delBillArchive('tidak-ada');
  assert.equal(D.billsArchive.length, 1);
  assert.equal(calls.save, 0);
});

test('delBillArchive — user batal konfirmasi: entri arsip TETAP ada', async () => {
  const D = { billsArchive: [{ id: 'b1', name: 'Listrik' }] };
  const { ctx, calls } = makeCtx(D, { askConfirm: async () => false });
  await ctx.delBillArchive('b1');
  assert.equal(D.billsArchive.length, 1);
  assert.equal(calls.save, 0);
  assert.equal(calls.renderBillArchive, 0);
});

test('delBillArchive — user konfirmasi: entri arsip terhapus permanen, save+render dipanggil', async () => {
  const D = { billsArchive: [{ id: 'b1', name: 'Listrik' }, { id: 'b2', name: 'Internet' }] };
  const { ctx, calls } = makeCtx(D);
  await ctx.delBillArchive('b1');
  assert.equal(D.billsArchive.length, 1);
  assert.equal(D.billsArchive[0].id, 'b2');
  assert.equal(calls.save, 1);
  assert.equal(calls.renderBillArchive, 1);
  assert.ok(calls.toast.some((t) => t.includes('dihapus')));
});

test('delBillArchive — D.billsArchive kosong/undefined: tidak throw', async () => {
  const D = {};
  const { ctx } = makeCtx(D);
  await assert.doesNotReject(() => ctx.delBillArchive('apa-saja'));
});
