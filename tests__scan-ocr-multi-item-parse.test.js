'use strict';
/**
 * scan-ocr-multi-item-parse.test.js — test untuk parseBillMultiItems(text)
 * (scan-ocr.js), parser MULTI-ITEM untuk screenshot "Rincian Tagihan"
 * (mis. Tagihan Kartu Kredit/PayLater marketplace) yang punya banyak baris
 * transaksi sekaligus dalam 1 foto -- beda dari scanReceipt()/
 * scanBuktiTransfer() dkk yang cuma ambil 1 nominal per foto.
 *
 * Hanya fungsi MURNI (parseBillMultiItems + regex pendukungnya) yang dites
 * di sini -- BillMultiScan (baca/tulis document/D.bills) ranah
 * smoke-test.js / manual QA, sesuai batasan loadSource() (lihat komentar
 * di tests/helpers/loadSource.js).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// scan-ocr.js memakai normalizeOcrNumber() (didefinisikan di
// pajak-aset-ui-wrappers.js, dimuat belakangan di urutan build.js -- aman
// di app asli krn dipanggil runtime, tapi di sandbox test ini perlu
// di-stub, pola sama persis tests/scan-ocr-paylater.test.js &
// tests/scan-ocr-receipt-total.test.js).
const ctx = loadSource(['modules/shared/scan-ocr.js'], {
  normalizeOcrNumber(raw) {
    if (!raw) return NaN;
    return parseFloat(String(raw).replace(/\./g, '').replace(',', '.'));
  },
});

function ocrText(lines) {
  return lines.join('\n');
}

test('parseBillMultiItems — screenshot Tagihan Tokopedia Card (Rincian Tagihan), 7 baris transaksi', () => {
  const text = ocrText([
    'Rincian Tagihan',
    '',
    'PT Tokopedia : TERM 3/3',
    '23 Jun 2026',
    '-Rp87.724',
    '',
    'PAYMENT_NBMB_***1234',
    '28 Jun 2026',
    '+Rp463.585',
    '',
    'PT Tokopedia : TERM 3/3',
    '29 Jun 2026',
    '-Rp48.333',
    '',
    'Retail IDN Jakarta PT Tokopedia',
    '11 Jul 2026',
    '-Rp72.500',
    '',
    'Retail IDN Jakarta PT Tokopedia',
    '11 Jul 2026',
    '-Rp132.890',
    '',
    'TTS by TKPD ***1234 : 4/12',
    '14 Jul 2026',
    '-Rp222.022',
    '',
    'E-STATEMENT FEE',
    '15 Jul 2026',
    '-Rp5.000',
    '',
    'Total Tagihan',
    'Rp568.469',
    'Bayar Sekarang',
  ]);
  const items = ctx.parseBillMultiItems(text);
  assert.equal(items.length, 7, 'harus dapat 7 item transaksi, TIDAK ikut baris "Total Tagihan"');
  assert.equal(items[0].nama, 'PT Tokopedia : TERM 3/3');
  assert.equal(items[0].tanggal, '2026-06-23');
  assert.equal(items[0].nominal, 87724);
  assert.equal(items[0].checked, true, 'item transaksi biasa harus default TERCENTANG');
});

test('parseBillMultiItems — default UNCHECKED utk PAYMENT/PEMBAYARAN/E-STATEMENT, checked utk item lain', () => {
  const text = ocrText([
    'PAYMENT_NBMB_***1234',
    '28 Jun 2026',
    '+Rp463.585',
    '',
    'Pembayaran Tagihan Sebelumnya',
    '1 Jul 2026',
    '-Rp100.000',
    '',
    'E-STATEMENT FEE',
    '15 Jul 2026',
    '-Rp5.000',
    '',
    'Retail IDN Jakarta PT Tokopedia',
    '11 Jul 2026',
    '-Rp72.500',
  ]);
  const items = ctx.parseBillMultiItems(text);
  assert.equal(items.length, 4);
  assert.equal(items.find(it => it.nama === 'PAYMENT_NBMB_***1234').checked, false);
  assert.equal(items.find(it => it.nama === 'Pembayaran Tagihan Sebelumnya').checked, false);
  assert.equal(items.find(it => it.nama === 'E-STATEMENT FEE').checked, false);
  assert.equal(items.find(it => it.nama === 'Retail IDN Jakarta PT Tokopedia').checked, true);
});

test('parseBillMultiItems — toleran thd noise OCR (baris kosong ganda, spasi ganda, urutan tetap terbaca)', () => {
  const text = ocrText([
    '',
    '   ',
    'Retail   IDN  Jakarta',
    '',
    '',
    '11  Jul   2026',
    '',
    '  -Rp72.500  ',
    '',
    '',
  ]);
  const items = ctx.parseBillMultiItems(text);
  assert.equal(items.length, 1);
  assert.equal(items[0].nominal, 72500);
  assert.equal(items[0].tanggal, '2026-07-11');
  assert.match(items[0].nama, /Retail\s+IDN\s+Jakarta/);
});

test('parseBillMultiItems — teks kosong/tidak ada nominal terbaca -> array kosong', () => {
  // NOTE: pakai .length===0, BUKAN assert.deepEqual(x,[]) -- array hasil sandbox vm beda
  // realm dari array host Node (sama seperti catatan teknis tests/vehicle-reminder.test.js
  // dkk), jadi deepEqual antar-realm bisa gagal walau isinya sama-sama kosong.
  assert.equal(ctx.parseBillMultiItems('').length, 0);
  assert.equal(ctx.parseBillMultiItems(null).length, 0);
  const noAmount = ctx.parseBillMultiItems(ocrText(['Rincian Tagihan', 'Retail IDN Jakarta', '11 Jul 2026']));
  assert.equal(noAmount.length, 0);
});

test('parseBillMultiItems — tanggal tidak terbaca tetap masuk item dgn tanggal null (bukan gagal total)', () => {
  const text = ocrText([
    'Biaya Admin Bulanan',
    '-Rp15.000',
  ]);
  const items = ctx.parseBillMultiItems(text);
  assert.equal(items.length, 1);
  assert.equal(items[0].tanggal, null);
  assert.equal(items[0].nominal, 15000);
  assert.equal(items[0].nama, 'Biaya Admin Bulanan');
});
