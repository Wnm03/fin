'use strict';
/**
 * scan-ocr-receipt-total.test.js — test untuk RECEIPT_TOTAL_LABEL_RE +
 * extractLabeledAmount(text, RECEIPT_TOTAL_LABEL_RE) di scan-ocr.js.
 *
 * Kasus nyata: screenshot "Detail Pesanan" marketplace (Tokopedia/Shopee dkk)
 * yang isinya harga produk + rincian ongkir/voucher/asuransi/diskon + baris
 * "Total belanja" di akhir. scanReceipt()/scanReceiptBelanja() dulu cuma
 * ambil Math.max(...nums) dari SEMUA angka di struk -- salah ambil harga
 * produk (lebih besar) padahal yang beneran dibayar (lebih kecil, karena
 * voucher/diskon) ada di baris "Total belanja". Fix-nya: kalau baris
 * berlabel total akhir ketemu, prioritaskan itu drpd angka terbesar.
 *
 * Hanya fungsi murni (extractLabeledAmount + regex) yang dites di sini --
 * scanReceiptBelanja() sendiri baca/tulis document/D, ranah smoke-test.js.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/loadSource');

const ctx = loadSource(['modules/shared/scan-ocr.js'], {
  normalizeOcrNumber(raw) {
    if (!raw) return NaN;
    return parseFloat(String(raw).replace(/\./g, '').replace(',', '.'));
  },
}, ['RECEIPT_TOTAL_LABEL_RE']);

function ocrText(lines) {
  return lines.join('\n');
}

test('RECEIPT_TOTAL_LABEL_RE + extractLabeledAmount — ambil "Total belanja" dari screenshot Detail Pesanan Tokopedia, BUKAN harga produk yg lebih besar', () => {
  const text = ocrText([
    'Detail Pesanan',
    'Selesai',
    'Detail Produk',
    'INA Kloset Jongkok Best Seller Putih & Biru Muda',
    '1 x Rp200.000',
    'Rincian Pembayaran',
    'Metode pembayaran',
    'GoPay Later',
    'Subtotal harga produk',
    'Rp200.000',
    'Voucher dari platform',
    '-Rp42.000',
    'Total ongkos kirim',
    'Rp54.500',
    'Voucher ongkir platform',
    '-Rp54.500',
    'Asuransi pengiriman',
    'Rp1.600',
    'Biaya jasa aplikasi',
    'Rp1.000',
    'Diskon metode pembayaran',
    '-Rp6.320',
    'Total belanja',
    'Rp154.280',
  ]);
  const n = ctx.extractLabeledAmount(text, ctx.RECEIPT_TOTAL_LABEL_RE);
  assert.equal(n, 154280, 'harus ambil Total belanja (154.280), bukan harga produk (200.000) atau angka lain');
});

test('RECEIPT_TOTAL_LABEL_RE — TIDAK match "Subtotal harga produk" (bukan cuma substring "total")', () => {
  assert.equal(ctx.RECEIPT_TOTAL_LABEL_RE.test('Subtotal harga produk'), false);
});

test('RECEIPT_TOTAL_LABEL_RE — TIDAK match "Total ongkos kirim" (biar ongkir tidak ketangkep sbg total akhir)', () => {
  assert.equal(ctx.RECEIPT_TOTAL_LABEL_RE.test('Total ongkos kirim'), false);
});

test('RECEIPT_TOTAL_LABEL_RE — match varian umum lain: Total Tagihan, Total Pembayaran, Total Bayar, Total yang harus dibayar', () => {
  assert.ok(ctx.RECEIPT_TOTAL_LABEL_RE.test('Total Tagihan'));
  assert.ok(ctx.RECEIPT_TOTAL_LABEL_RE.test('Total Pembayaran'));
  assert.ok(ctx.RECEIPT_TOTAL_LABEL_RE.test('Total Bayar'));
  assert.ok(ctx.RECEIPT_TOTAL_LABEL_RE.test('Total yang harus dibayar'));
});

test('RECEIPT_TOTAL_LABEL_RE + extractLabeledAmount — screenshot GoPay "Detail Transaksi" pakai label "Total Transaksi", harus ambil itu (154.280) BUKAN harga barang (200.000)', () => {
  const text = ocrText([
    'Detail Transaksi',
    '-Rp154.280',
    'Pembayaran',
    '22 Jun 2026, 08:17 WIB',
    'Rincian transaksi',
    'ID Transaksi GCL-TKP3235866197',
    '1 X Kloset',
    'Rp200.000',
    'Total Ongkos Kirim',
    'Rp56.100',
    'Total Diskon',
    'Rp101.820',
    'Total Transaksi',
    'Rp154.280',
    'Metode bayar',
    'GoPay Later',
    'Rp154.280',
  ]);
  const n = ctx.extractLabeledAmount(text, ctx.RECEIPT_TOTAL_LABEL_RE);
  assert.equal(n, 154280, 'harus ambil Total Transaksi (154.280), bukan harga barang Kloset (200.000)');
});

test('RECEIPT_TOTAL_LABEL_RE — TIDAK match "Total Ongkos Kirim" tapi match "Total Transaksi"', () => {
  assert.equal(ctx.RECEIPT_TOTAL_LABEL_RE.test('Total Ongkos Kirim'), false);
  assert.ok(ctx.RECEIPT_TOTAL_LABEL_RE.test('Total Transaksi'));
});

test('extractLabeledAmount — fallback null kalau tidak ada baris "Total xxx" berlabel sama sekali (struk kasir polos), caller pakai Math.max nums', () => {
  const text = ocrText(['Struk Pembayaran', 'Total: Rp45.000', 'Tunai', 'Kembali: Rp5.000']);
  // "Total:" langsung diikuti ":" bukan salah satu kata kunci -> tidak match by design,
  // ini kasus struk kasir generik yang tetap harus fallback ke logika lama (max nums).
  const n = ctx.extractLabeledAmount(text, ctx.RECEIPT_TOTAL_LABEL_RE);
  assert.equal(n, null);
});
