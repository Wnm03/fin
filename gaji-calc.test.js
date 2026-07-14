'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

// fmtFull DIBUAT identity (bukan format rupiah asli) supaya assertion di
// bawah bisa cek ANGKA HASIL PERSIS lewat textContent, tanpa terikat ke
// format string "Rp ..." yang sudah dites terpisah di format-angka.test.js.
function setupCalcGaji(values) {
  const fakeDocument = createFakeDocument({
    gcTotal: {}, gcBreakdown: {}, gcSaveBtn: {},
    ...values,
  });
  const ctx = loadSource(['gaji-calc.js'], {
    document: fakeDocument,
    D: { profile: {} },
    fmtFull: (n) => String(Math.round(n)),
  });
  return { ctx, fakeDocument };
}

test('calcGaji — pokok murni (jam kerja × upah/jam), tanpa lembur/bonus/potongan', () => {
  const { ctx, fakeDocument } = setupCalcGaji({
    gcUpahJam: { value: '20000' },
    gcJamKerja: { value: '7' },
    gcLemburJam: { value: '' },
    gcLemburRate: { value: '' },
    gcBonus: { value: '' },
    gcPotongan: { value: '' },
  });
  ctx.calcGaji();
  assert.equal(fakeDocument.getElementById('gcTotal').textContent, '140000'); // 20000 x 7
  assert.equal(fakeDocument.getElementById('gcSaveBtn').disabled, false);
});

test('calcGaji — lembur & bonus menambah, potongan mengurangi total', () => {
  const { ctx, fakeDocument } = setupCalcGaji({
    gcUpahJam: { value: '20000' },
    gcJamKerja: { value: '7' },
    gcLemburJam: { value: '2' },
    gcLemburRate: { value: '15000' },
    gcBonus: { value: '50000' },
    gcPotongan: { value: '30000' },
  });
  ctx.calcGaji();
  // pokok 140.000 + lembur (2x15.000=30.000) + bonus 50.000 - potongan 30.000 = 190.000
  assert.equal(fakeDocument.getElementById('gcTotal').textContent, '190000');
});

test('calcGaji — total tidak boleh negatif (dibatasi ke 0) & tombol simpan otomatis nonaktif', () => {
  const { ctx, fakeDocument } = setupCalcGaji({
    gcUpahJam: { value: '0' },
    gcJamKerja: { value: '0' },
    gcLemburJam: { value: '' },
    gcLemburRate: { value: '' },
    gcBonus: { value: '' },
    gcPotongan: { value: '100000' }, // potongan lebih besar dari pemasukan
  });
  ctx.calcGaji();
  assert.equal(fakeDocument.getElementById('gcTotal').textContent, '0');
  assert.equal(fakeDocument.getElementById('gcSaveBtn').disabled, true);
});

test('calcGaji — total positif membuat tombol simpan aktif', () => {
  const { ctx, fakeDocument } = setupCalcGaji({
    gcUpahJam: { value: '20000' },
    gcJamKerja: { value: '1' },
    gcLemburJam: { value: '' },
    gcLemburRate: { value: '' },
    gcBonus: { value: '' },
    gcPotongan: { value: '' },
  });
  ctx.calcGaji();
  assert.equal(fakeDocument.getElementById('gcSaveBtn').disabled, false);
});

test('calcGaji — input bukan angka (kosong/rusak) diperlakukan sebagai 0, bukan NaN', () => {
  const { ctx, fakeDocument } = setupCalcGaji({
    gcUpahJam: { value: 'abc' },
    gcJamKerja: { value: '7' },
    gcLemburJam: { value: '' },
    gcLemburRate: { value: '' },
    gcBonus: { value: '' },
    gcPotongan: { value: '' },
  });
  ctx.calcGaji();
  assert.equal(fakeDocument.getElementById('gcTotal').textContent, '0');
});
