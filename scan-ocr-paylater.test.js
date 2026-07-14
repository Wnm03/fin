'use strict';
/**
 * scan-ocr-paylater.test.js — test untuk detectPaylaterDueNextMonth()
 * (scan-ocr.js), fungsi murni yang dipakai maybeOfferPaylaterReminder()
 * buat nawarin pengingat 🧾 Tagihan (sekali, jatuh tempo +1 bulan) waktu
 * scan struk/checkout kedeteksi metode "bayar bulan depan" (GoPay Later,
 * ShopeePayLater/Kredivo/Akulaku/Indodana versi sekali bayar, dst) — BUKAN
 * cicilan multi-bulan (itu sudah ditangani CICILAN_PATTERNS/
 * guessCheckoutCicilan yang terpisah).
 *
 * Fungsi maybeOfferPaylaterReminder() sendiri TIDAK dites di sini (dia
 * baca/tulis D.bills, askConfirm, document, dst — ranah smoke-test.js /
 * manual QA), sesuai batasan loadSource() (lihat komentar di helper).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// scan-ocr.js memakai normalizeOcrNumber() (didefinisikan di
// features-sheets-pwa-selftest.js, dimuat belakangan di urutan build.js —
// aman di app asli krn dipanggil runtime, tapi di sandbox test ini perlu
// di-stub biar guessCheckoutTotalTagihan() bisa jalan tanpa load file lain
// yang tidak relevan ke fungsi yang dites di sini).
const ctx = loadSource(['scan-ocr.js'], {
  normalizeOcrNumber(raw) {
    if (!raw) return NaN;
    return parseFloat(String(raw).replace(/\./g, '').replace(',', '.'));
  },
});

function ocrText(lines) {
  return lines.join('\n');
}

test('detectPaylaterDueNextMonth — GoPay Later (tulisan ada spasi) kedeteksi', () => {
  const text = ocrText([
    'Detail Pesanan',
    'Metode pembayaran',
    'GoPay Later',
    'Total belanja',
    'Rp154.280',
  ]);
  const r = ctx.detectPaylaterDueNextMonth(text, false);
  assert.ok(r, 'harusnya kedeteksi sbg paylater');
  assert.match(r.label, /gopay\s*later/i);
});

test('detectPaylaterDueNextMonth — ambil nominal dari "Total Tagihan" kalau ada', () => {
  const text = ocrText([
    'Metode Pembayaran: Kredivo',
    'Total Tagihan Rp1.250.000',
  ]);
  const r = ctx.detectPaylaterDueNextMonth(text, false);
  assert.ok(r);
  assert.equal(r.amount, 1250000);
});

test('detectPaylaterDueNextMonth — amount null kalau tidak ada pola "Total Tagihan/Pembayaran/Bayar" (caller pakai fallback)', () => {
  const text = ocrText([
    'Metode pembayaran',
    'GoPay Later',
    'Total belanja',
    'Rp154.280',
  ]);
  const r = ctx.detectPaylaterDueNextMonth(text, false);
  assert.ok(r);
  assert.equal(r.amount, null, '"Total belanja" bukan salah satu pola yang dikenali guessCheckoutTotalTagihan, jadi amount dari detector ini null — caller yang isi fallback dari nominal hasil OCR lainnya');
});

test('detectPaylaterDueNextMonth — TIDAK kedeteksi kalau sudah ketangkep sbg cicilan (alreadyCicilan=true)', () => {
  const text = ocrText([
    'SPayLater',
    'Rp1.150.000 x 4',
  ]);
  const r = ctx.detectPaylaterDueNextMonth(text, true);
  assert.equal(r, null, 'kalau sudah ditangani sbg cicilan multi-bulan, jangan dobel ditawarin sbg tagihan sekali bayar');
});

test('detectPaylaterDueNextMonth — transaksi tunai biasa tidak kepicu', () => {
  const text = ocrText([
    'Struk Pembayaran',
    'Total: Rp45.000',
    'Tunai',
    'Kembali: Rp5.000',
  ]);
  const r = ctx.detectPaylaterDueNextMonth(text, false);
  assert.equal(r, null);
});

test('detectPaylaterDueNextMonth — berbagai keyword paylater lain (ShopeePayLater, Akulaku, Indodana)', () => {
  assert.ok(ctx.detectPaylaterDueNextMonth('Dibayar dengan ShopeePayLater', false));
  assert.ok(ctx.detectPaylaterDueNextMonth('Metode: Akulaku PayLater', false));
  assert.ok(ctx.detectPaylaterDueNextMonth('Cicilan via Indodana', false));
});

test('detectPaylaterDueNextMonth — frasa umum "Bayar Bulan Depan" / "Tempo 30 Hari" ikut kedeteksi', () => {
  assert.ok(ctx.detectPaylaterDueNextMonth('Silakan Bayar Bulan Depan', false));
  assert.ok(ctx.detectPaylaterDueNextMonth('Termin Tempo 30 Hari', false));
});
