'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { extractFunction } = require('./helpers/loadSource');

// Diambil langsung dari source file asli (bukan disalin manual) via
// extractFunction, karena features-sheets-pwa-selftest.js sendiri
// membutuhkan seluruh modul app lain ter-load dulu (baris "expose ke
// window" di akhir file) — di luar cakupan test murni-logika ini.
const parsePzNum = extractFunction('features-sheets-pwa-selftest.js', 'parsePzNum');
const parseDecStr = extractFunction('features-sheets-pwa-selftest.js', 'parseDecStr');

test('parsePzNum — buang semua karakter non-digit (termasuk "Rp", titik ribuan)', () => {
  assert.equal(parsePzNum('Rp 1.234.567'), 1234567);
  assert.equal(parsePzNum('1.234.567'), 1234567);
  assert.equal(parsePzNum('500'), 500);
});

test('parsePzNum — tanda minus di mana pun tetap membuat hasil negatif', () => {
  assert.equal(parsePzNum('-Rp 500'), -500);
  assert.equal(parsePzNum('Rp -500'), -500);
});

test('parsePzNum — null/undefined/string kosong jadi 0', () => {
  assert.equal(parsePzNum(null), 0);
  assert.equal(parsePzNum(undefined), 0);
  assert.equal(parsePzNum(''), 0);
});

test('parseDecStr — koma sbg desimal kalau tidak ada titik ("3,5" -> 3.5)', () => {
  assert.equal(parseDecStr('3,5'), 3.5);
});

test('parseDecStr — titik desimal + koma ribuan ("1,234.56" -> 1234.56)', () => {
  assert.equal(parseDecStr('1,234.56'), 1234.56);
});

test('parseDecStr — null/undefined/kosong jadi null (bukan 0 — beda dari parsePzNum!)', () => {
  assert.equal(parseDecStr(null), null);
  assert.equal(parseDecStr(undefined), null);
  assert.equal(parseDecStr(''), null);
});

test('parseDecStr — input yang tidak mengandung angka sama sekali jadi null', () => {
  assert.equal(parseDecStr('abc'), null);
});
