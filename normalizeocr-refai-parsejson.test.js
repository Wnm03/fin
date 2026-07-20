'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource, extractFunction } = require('../helpers/loadSource');

// normalizeOcrNumber() sebelum ini cuma pernah "dites" via reimplementasi
// sederhana yg di-stub manual di tests/scan-ocr-paylater.test.js &
// tests/scan-ocr-receipt-total.test.js (lihat komentar di file2 itu) —
// bukan fungsi ASLI dari pajak-aset-ui-wrappers.js. Di sini diambil
// langsung dari source (extractFunction, murni tanpa DOM) supaya kalau
// logic separator ribuan/desimalnya berubah/rusak, ada test yg nangkep.
const normalizeOcrNumber = extractFunction('pajak-aset-ui-wrappers.js', 'normalizeOcrNumber');

test('normalizeOcrNumber — titik sbg ribuan (grup 3 digit) tanpa desimal', () => {
  assert.equal(normalizeOcrNumber('12.345.678'), 12345678);
  assert.equal(normalizeOcrNumber('100.000'), 100000);
});

test('normalizeOcrNumber — koma sbg ribuan (grup 3 digit) tanpa desimal', () => {
  assert.equal(normalizeOcrNumber('12,345,678'), 12345678);
});

test('normalizeOcrNumber — koma sbg desimal kalau grup terakhir bukan 3 digit ("3,5")', () => {
  assert.equal(normalizeOcrNumber('3,5'), 3.5);
});

test('normalizeOcrNumber — titik sbg desimal kalau grup terakhir bukan 3 digit ("12.34")', () => {
  assert.equal(normalizeOcrNumber('12.34'), 12.34);
});

test('normalizeOcrNumber — format ID (titik ribuan + koma desimal) "1.234.567,89"', () => {
  assert.equal(normalizeOcrNumber('1.234.567,89'), 1234567.89);
});

test('normalizeOcrNumber — format US (koma ribuan + titik desimal) "1,234,567.89"', () => {
  // Pemisah terakhir (paling kanan) yg menang jadi desimal, sesuai posisi
  // -- ini beda dari reimplementasi stub sederhana di test scan-ocr yg
  // cuma treat titik selalu sbg ribuan (lihat catatan di atas); fungsi
  // ASLI di sini benar krn mendeteksi lewat POSISI pemisah terakhir.
  assert.equal(normalizeOcrNumber('1,234,567.89'), 1234567.89);
});

test('normalizeOcrNumber — tanpa pemisah sama sekali', () => {
  assert.equal(normalizeOcrNumber('500000'), 500000);
});

test('normalizeOcrNumber — input kosong/null jadi NaN', () => {
  assert.ok(Number.isNaN(normalizeOcrNumber('')));
  assert.ok(Number.isNaN(normalizeOcrNumber(null)));
});

// RefAI._parseJSON() — belum pernah dites sama sekali sebelumnya walau ini
// fungsi murni (tidak sentuh DOM), dan jadi titik rawan karena mem-parse
// balasan bebas dari AI (bisa dibungkus code-fence markdown, ada teks
// pengantar/penutup, dst) -- lihat pemakaiannya di RefAI.check().
const ctx = loadSource(['modules/finance/pajak-pbb-zakat.js'], {}, ['RefAI']);

test('RefAI._parseJSON — JSON polos valid', () => {
  const out = ctx.RefAI._parseJSON('{"a":1,"b":"x"}');
  assert.deepEqual(out, { a: 1, b: 'x' });
});

test('RefAI._parseJSON — dibungkus code-fence ```json ... ```', () => {
  const out = ctx.RefAI._parseJSON('```json\n{"a":1}\n```');
  assert.deepEqual(out, { a: 1 });
});

test('RefAI._parseJSON — dibungkus code-fence polos ``` ... ``` (tanpa label json)', () => {
  const out = ctx.RefAI._parseJSON('```\n{"a":2}\n```');
  assert.deepEqual(out, { a: 2 });
});

test('RefAI._parseJSON — ada teks pengantar/penutup di luar objek JSON', () => {
  const out = ctx.RefAI._parseJSON('Berikut hasilnya:\n{"a":3}\nSemoga membantu.');
  assert.deepEqual(out, { a: 3 });
});

test('RefAI._parseJSON — teks kosong/null jadi null', () => {
  assert.equal(ctx.RefAI._parseJSON(''), null);
  assert.equal(ctx.RefAI._parseJSON(null), null);
});

test('RefAI._parseJSON — bukan JSON sama sekali jadi null (bukan throw)', () => {
  assert.equal(ctx.RefAI._parseJSON('maaf, saya tidak menemukan informasinya'), null);
});
