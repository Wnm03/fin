'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// format-tema.js juga berisi toast/setTheme/applyEffectiveTheme yang pakai
// DOM (D, document) — di luar cakupan test murni-logika ini, cuma dimuat
// supaya file bisa jalan (fungsi itu tidak dites di sini).
const ctx = loadSource(['format-tema.js']);

test('fmt — di bawah 1.000 tampil apa adanya', () => {
  assert.equal(ctx.fmt(500), 'Rp 500');
  assert.equal(ctx.fmt(0), 'Rp 0');
});

test('fmt — ribuan dibulatkan ke "rb"', () => {
  assert.equal(ctx.fmt(1500), 'Rp 2rb'); // toFixed(0) membulatkan 1.5 -> 2
  assert.equal(ctx.fmt(15000), 'Rp 15rb');
});

test('fmt — jutaan dibulatkan 1 desimal ke "jt"', () => {
  assert.equal(ctx.fmt(1500000), 'Rp 1.5 jt');
  assert.equal(ctx.fmt(2000000), 'Rp 2.0 jt');
});

test('fmt — angka negatif diperlakukan sebagai nilai absolut', () => {
  assert.equal(ctx.fmt(-1500000), 'Rp 1.5 jt');
});

test('fmt — null/undefined dianggap 0', () => {
  assert.equal(ctx.fmt(null), 'Rp 0');
  assert.equal(ctx.fmt(undefined), 'Rp 0');
});

test('fmtFull — format rupiah penuh dengan pemisah ribuan ala id-ID', () => {
  assert.equal(ctx.fmtFull(1234567), 'Rp 1.234.567');
  assert.equal(ctx.fmtFull(-1234567), 'Rp 1.234.567'); // fmtFull selalu absolut (tanpa tanda minus)
});

test('fmtFullSigned — mempertahankan tanda minus di depan "Rp"', () => {
  assert.equal(ctx.fmtFullSigned(-1234567), '-Rp 1.234.567');
  assert.equal(ctx.fmtFullSigned(1234567), 'Rp 1.234.567');
  assert.equal(ctx.fmtFullSigned(0), 'Rp 0');
});
