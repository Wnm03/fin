'use strict';
/**
 * scan-ocr-cat-learn-key.test.js — test untuk catLearnKey() di scan-ocr.js.
 *
 * Kasus nyata: scanReceiptBelanja() scan screenshot "Detail Transaksi" GoPay
 * (bukan struk kasir fisik) — baris nama produk gagal kedeteksi sbg firstLine
 * (mode lama fallback ke SELURUH blob OCR mentah), lalu waktu transaksi
 * disimpan, catLearnKey() ambil kata PERTAMA >=4 huruf dari blob itu -- bisa
 * jadi kata generik boilerplate struk (mis. "kirim" dari "Total Ongkos
 * Kirim") -- dan diajarkan ke D.learnedItemCat sbg keyword kategori. Sekali
 * itu tersimpan, SEMUA scan lain yang kebetulan mengandung kata generik itu
 * (struk apapun yang ada ongkos kirim) ikut ke-tag salah kategori.
 *
 * Fix: (1) catLearnKey() blokir kata boilerplate generik lewat
 * CAT_LEARN_KEY_BLOCKLIST, (2) _txCatLearnSource di scanReceiptBelanja()
 * cuma diisi dari firstLine yang sudah difilter noise, tidak lagi fallback
 * ke blob mentah (lihat scan-ocr-receipt-total.test.js utk sisi lain dari
 * bug yang sama, soal nominal).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/loadSource');

const ctx = loadSource(['modules/shared/scan-ocr.js'], {}, ['catLearnKey', 'CAT_LEARN_KEY_BLOCKLIST']);

test('catLearnKey — kata boilerplate struk generik (kirim, ongkos, total, transaksi, dst) TIDAK pernah kepilih jadi key', () => {
  assert.equal(ctx.catLearnKey('Total Ongkos Kirim'), null, '"kirim"/"ongkos"/"total" semua diblokir -> tidak ada key valid tersisa');
  assert.equal(ctx.catLearnKey('Total Diskon'), null);
  assert.equal(ctx.catLearnKey('Total Transaksi'), null);
  assert.equal(ctx.catLearnKey('Metode Pembayaran'), null);
  assert.equal(ctx.catLearnKey('Rincian Transaksi'), null);
});

test('catLearnKey — nama barang asli TETAP kepilih normal (tidak ikut ke-blokir)', () => {
  assert.equal(ctx.catLearnKey('Kloset Duduk Putih'), 'kloset');
  assert.equal(ctx.catLearnKey('INA Kloset Jongkok Best Seller'), 'kloset');
});

test('catLearnKey — kalau SEMUA kata di nama itu boilerplate, hasilnya null (bukan asal ambil kata generik berikutnya)', () => {
  assert.equal(ctx.catLearnKey('Total Ongkos Kirim Pesanan'), null);
});
