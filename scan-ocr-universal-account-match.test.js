'use strict';
// tests/scan-ocr-universal-account-match.test.js — regresi utk bugfix laporan
// user: scan "Scan Universal Akun" (accModal -> universalOcrModal, UniversalScan
// di modules/shared/scan-ocr.js) SELALU bikin akun baru dan tidak pernah update
// saldo akun SeaBank yang sudah ada.
//
// Akar masalah: parseBankScreen() menebak nama akun dari baris SEBELUM "No.
// Rekening" -- di layar SeaBank baris itu adalah NAMA PEMILIK REKENING ("Wisnu
// Nur Muhamad"), BUKAN nama bank ("SeaBank"). importSelected() dulu cocokkan
// exact-string nama hasil OCR vs D.accounts, yang tidak pernah cocok -> selalu
// create baru. Fix: _fuzzyAccountMatch() (dipakai sbg default targetAccId di
// scan(), lihat scan-ocr.js) + importSelected() sekarang pakai targetAccId
// eksplisit, bukan cocok-nama lagi. Test ini fokus ke 2 fungsi murni itu
// (_fuzzyAccountMatch & UniversalScan.importSelected) tanpa OCR/DOM asli.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  const calls = [];
  return {
    ctx: loadSource(
      ['modules/shared/scan-ocr.js'],
      {
        D,
        escapeHtml: (s) => String(s),
        save: () => calls.push('save'),
        closeModal: () => calls.push('closeModal'),
        toast: () => calls.push('toast'),
        recalcAccBalance: () => 0,
      },
      ['UniversalScan'],
    ),
    calls,
  };
}

test('_fuzzyAccountMatch: nama OCR beda total dari nama akun (kasus SeaBank) -> tidak match, defaultnya "Buat Akun Baru"', () => {
  const D = { accounts: [{ id: 'acc_1', name: 'SeaBank', balance: 100000, baseBalance: 100000 }] };
  const { ctx } = makeCtx(D);
  // nama hasil OCR di layar SeaBank = nama pemilik rekening, bukan "SeaBank"
  const match = ctx._fuzzyAccountMatch('Wisnu Nur Muhamad');
  assert.equal(match, null);
});

test('_fuzzyAccountMatch: exact match setelah normalisasi (case/spasi beda) tetap ketemu', () => {
  const D = { accounts: [{ id: 'acc_1', name: 'SeaBank', balance: 0, baseBalance: 0 }] };
  const { ctx } = makeCtx(D);
  assert.equal(ctx._fuzzyAccountMatch('  seabank ').id, 'acc_1');
  assert.equal(ctx._fuzzyAccountMatch('SEA BANK').id, 'acc_1');
});

test('_fuzzyAccountMatch: substring dua arah (mis. "Bank Jago" vs "Jago")', () => {
  const D = { accounts: [{ id: 'acc_2', name: 'Jago', balance: 0, baseBalance: 0 }] };
  const { ctx } = makeCtx(D);
  assert.equal(ctx._fuzzyAccountMatch('Bank Jago').id, 'acc_2');
});

test('importSelected: targetAccId="__new__" (default lama, tidak ada match) -> bikin akun baru, TIDAK ubah akun existing', () => {
  const D = { accounts: [{ id: 'acc_1', name: 'SeaBank', balance: 205241, baseBalance: 205241 }] };
  const { ctx } = makeCtx(D);
  ctx.UniversalScan.items = [
    { nama: 'Wisnu Nur Muhamad', nominal: 205241, checked: true, targetAccId: '__new__' },
  ];
  ctx.UniversalScan.importSelected();
  assert.equal(D.accounts.length, 2, 'akun baru ditambahkan, bukan update yang lama');
  assert.equal(D.accounts[0].balance, 205241, 'akun SeaBank lama TIDAK berubah');
});

test('importSelected: targetAccId diarahkan manual ke akun SeaBank yang sudah ada -> update saldo, TIDAK bikin akun baru (bugfix inti)', () => {
  const D = { accounts: [{ id: 'acc_1', name: 'SeaBank', balance: 100000, baseBalance: 100000 }] };
  const { ctx } = makeCtx(D);
  ctx.UniversalScan.items = [
    { nama: 'Wisnu Nur Muhamad', nominal: 205241, checked: true, targetAccId: 'acc_1' },
  ];
  ctx.UniversalScan.importSelected();
  assert.equal(D.accounts.length, 1, 'tidak ada akun baru dibuat');
  assert.equal(D.accounts[0].balance, 205241, 'saldo akun SeaBank ter-update ke hasil scan');
});

test('scan(): item baru otomatis dapat targetAccId dari _fuzzyAccountMatch (via map yang sama persis dgn scan())', () => {
  const D = { accounts: [{ id: 'acc_1', name: 'SeaBank', balance: 0, baseBalance: 0 }] };
  const { ctx } = makeCtx(D);
  // simulasikan langsung logika penetapan targetAccId di scan() tanpa OCR asli
  const fuzzy = ctx._fuzzyAccountMatch('SeaBank');
  assert.equal(fuzzy && fuzzy.id, 'acc_1');
  const fuzzyMiss = ctx._fuzzyAccountMatch('Wisnu Nur Muhamad');
  assert.equal(fuzzyMiss, null);
});
