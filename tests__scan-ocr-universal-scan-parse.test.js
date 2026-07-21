'use strict';
/**
 * scan-ocr-universal-scan-parse.test.js — test untuk fungsi murni UniversalScan
 * (scan-ocr.js, Sesi 125): detectScreenType() + parseBankScreen()/parseWalletScreen()/
 * parseBibitScreen()/parseJagoPocketScreen(). Dipakai buat isi ➕/Edit Akun (accModal)
 * otomatis dari screenshot Bank/E-Wallet/Bibit/Jago (Kantong) -- beda dari
 * scanAssetPortfolio() (portofolio ASET) & parseBillMultiItems() (item TAGIHAN).
 *
 * Hanya fungsi MURNI (teks -> data, tidak baca/tulis DOM) yang dites di sini --
 * UniversalScan.scan()/render()/importSelected() (baca/tulis document/D.accounts)
 * ranah smoke-test.js / manual QA, sesuai batasan loadSource() (lihat komentar di
 * tests/helpers/loadSource.js, pola sama persis tests/scan-ocr-multi-item-parse.test.js).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// scan-ocr.js memakai normalizeOcrNumber() (didefinisikan di
// pajak-aset-ui-wrappers.js, dimuat belakangan di urutan build.js -- aman di app
// asli krn dipanggil runtime, tapi di sandbox test ini perlu di-stub, pola sama
// persis tests/scan-ocr-multi-item-parse.test.js & tests/scan-ocr-paylater.test.js).
const ctx = loadSource(['modules/shared/scan-ocr.js'], {
  normalizeOcrNumber(raw) {
    if (!raw) return NaN;
    return parseFloat(String(raw).replace(/\./g, '').replace(',', '.'));
  },
});

function ocrText(lines) {
  return lines.join('\n');
}

// ---------- detectScreenType ----------

test('detectScreenType — layar Bank BKE Mobile (Total Saldo + No. Rekening) kedeteksi "bank"', () => {
  const text = ocrText([
    'Wisnu Nur Muhamad',
    'No. Rekening: 9017 9154 1957',
    'Total Saldo',
    'Rp 205.241',
    'Tabungan',
    'Rp 205.241',
    'Deposito',
    'Rp 0',
    'Top Up & Tagihan',
    'Top Up E-Wallet',
    'Tarik Tunai',
  ]);
  assert.equal(ctx.detectScreenType(text), 'bank');
});

test('detectScreenType — layar GoPay kedeteksi "wallet"', () => {
  const text = ocrText([
    'gopay',
    'Perlindungan kuat',
    'Rp 154.834',
    '500 Coins',
    'Top up',
    'Tarik Tunai',
  ]);
  assert.equal(ctx.detectScreenType(text), 'wallet');
});

test('detectScreenType — layar Kantong Jago (banyak kantong sekaligus) kedeteksi "jago_pocket"', () => {
  const text = ocrText([
    'Cari Kantong',
    'Semua',
    'Aset Saya',
    'Rp11.826.355',
    'Kantong Utama',
    'Rp0',
    'Kantong Utama Wadiah',
    'GoPay Tabungan',
    'Rp154.834',
    "Pakai akad Wadi'ah",
  ]);
  assert.equal(ctx.detectScreenType(text), 'jago_pocket');
});

test('detectScreenType — layar Bibit (Total Investasi/Portofolio) kedeteksi "bibit"', () => {
  const text = ocrText([
    'Portofolio Saya',
    'Total Investasi',
    'Rp 10.500.000',
    'Reksa Dana Pasar Uang',
    'Imbal Hasil',
  ]);
  assert.equal(ctx.detectScreenType(text), 'bibit');
});

test('detectScreenType — teks tidak dikenal (bukan salah satu dari 4 layar) balik null', () => {
  const text = ocrText(['Struk Belanja', 'Indomaret', 'Total Rp45.000']);
  assert.equal(ctx.detectScreenType(text), null);
});

// ---------- parseBankScreen ----------

test('parseBankScreen — ambil nominal dari "Total Saldo" & nama dari baris sebelum "No. Rekening"', () => {
  const text = ocrText([
    'Wisnu Nur Muhamad',
    'No. Rekening: 9017 9154 1957',
    'Total Saldo',
    'Rp 205.241',
  ]);
  const r = ctx.parseBankScreen(text);
  assert.ok(r);
  assert.equal(r.nama, 'Wisnu Nur Muhamad');
  assert.equal(r.nominal, 205241);
});

test('parseBankScreen — fallback ke "Saldo" polos kalau "Total Saldo" tidak ada', () => {
  const text = ocrText(['Bank ABC', 'No. Rekening: 123456', 'Saldo Rp1.000.000']);
  const r = ctx.parseBankScreen(text);
  assert.equal(r.nominal, 1000000);
});

test('parseBankScreen — nominal null kalau tidak ada pola saldo yang cocok', () => {
  const text = ocrText(['Bank ABC', 'No. Rekening: 123456']);
  const r = ctx.parseBankScreen(text);
  assert.equal(r.nominal, null);
});

// ---------- parseWalletScreen ----------

test('parseWalletScreen — kedetek brand "GoPay" & nominal Rp di awal', () => {
  const text = ocrText(['gopay', 'Perlindungan kuat', 'Rp 154.834', '500 Coins']);
  const r = ctx.parseWalletScreen(text);
  assert.ok(r);
  assert.equal(r.nama, 'GoPay');
  assert.equal(r.nominal, 154834);
});

test('parseWalletScreen — kedetek brand "DANA"', () => {
  const text = ocrText(['dana', 'Saldo DANA', 'Rp 500.000']);
  const r = ctx.parseWalletScreen(text);
  assert.equal(r.nama, 'DANA');
  assert.equal(r.nominal, 500000);
});

test('parseWalletScreen — fallback nama "E-Wallet" kalau brand tidak dikenali', () => {
  const text = ocrText(['E-Wallet Lain', 'Rp 75.000']);
  const r = ctx.parseWalletScreen(text);
  assert.equal(r.nama, 'E-Wallet');
  assert.equal(r.nominal, 75000);
});

// ---------- parseBibitScreen ----------

test('parseBibitScreen — ambil nominal dari "Total Investasi"', () => {
  const text = ocrText(['Portofolio Saya', 'Total Investasi', 'Rp 10.500.000']);
  const r = ctx.parseBibitScreen(text);
  assert.ok(r);
  assert.equal(r.nama, 'Bibit');
  assert.equal(r.nominal, 10500000);
});

test('parseBibitScreen — fallback ke "Portofolio" polos', () => {
  const text = ocrText(['Portofolio Rp2.000.000']);
  const r = ctx.parseBibitScreen(text);
  assert.equal(r.nominal, 2000000);
});

// ---------- parseJagoPocketScreen ----------

test('parseJagoPocketScreen — screenshot Kantong Jago, ambil beberapa kantong sekaligus, "Aset Saya" (total) TIDAK ikut jadi item', () => {
  const text = ocrText([
    'Cari Kantong',
    'Semua',
    'Aset Saya',
    'Rp11.826.355',
    'Kantong Utama',
    'Rp0',
    'Kantong Utama Wadiah',
    'GoPay Tabungan',
    'Rp154.834',
    "Pakai akad Wadi'ah",
    'mas sihab',
    'Rp0',
    'Kantong Bayar Wadiah',
    'uang toko',
    'Rp0',
    'Kantong Bayar Wadiah',
    'Reksa Dana',
    'Rp11.671.521',
  ]);
  const items = ctx.parseJagoPocketScreen(text);
  const names = items.map((it) => it.nama);
  assert.ok(!names.includes('Aset Saya'), '"Aset Saya" (label total) tidak boleh ikut jadi item kantong');
  const gopay = items.find((it) => it.nama === 'GoPay Tabungan');
  assert.ok(gopay, 'kantong "GoPay Tabungan" harus terbaca');
  assert.equal(gopay.nominal, 154834);
  const reksa = items.find((it) => it.nama === 'Reksa Dana');
  assert.ok(reksa);
  assert.equal(reksa.nominal, 11671521);
});

test('parseJagoPocketScreen — teks kosong/tanpa pola Rp balik array kosong', () => {
  // NOTE: pakai .length===0, BUKAN assert.deepEqual(x,[]) -- array hasil sandbox vm beda
  // realm dari array literal di test ini (Array.prototype beda antar-realm/vm.Script dkk),
  // jadi deepEqual antar-realm bisa gagal walau isinya sama-sama kosong (pola sama persis
  // tests/scan-ocr-multi-item-parse.test.js).
  assert.equal(ctx.parseJagoPocketScreen('').length, 0);
  assert.equal(ctx.parseJagoPocketScreen('Tidak ada nominal di sini').length, 0);
});
