'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// Cakupan file ini: bug identik dgn DashboardHub/DashboardHubSearch (Tahap 2) &
// GoldImport/GoldZakat (lihat tests/gold-emas-zakat.test.js) — `const OngkirCalc={...}`
// dideklarasikan top-level di cobek-pricing.js. Top-level `const`/`let` TIDAK
// otomatis jadi properti `window` (beda dari `function`/`var`), sedangkan
// dispatcher global data-action (features-helpers-global-security.js) mencari
// fungsi/method lewat `window[p]`. Tanpa expose eksplisit, semua tombol
// data-action="OngkirCalc.*" di modal Produk (📍 Hitung dari Jarak & Ongkir,
// toggle metode, 🔄 isi dari rata-rata BBM, simpan rute produsen, pakai hasil
// ke Biaya Transport) DIAM saat diklik — tanpa error di console, krn
// `window.OngkirCalc` cuma `undefined` (dispatcher exit diam-diam, bukan throw).
//
// BUG NYATA ditemukan saat audit teknis-debt pasca Tahap 5: OngkirCalc
// (cobek-pricing.js, GROUP_A) tidak pernah ditambahkan ke blok
// Object.assign(window,{...}) di features-sheets-pwa-selftest.js (GROUP_B) —
// padahal sibling-nya di file yang sama, PriceReko, sudah ada di situ sejak
// awal. Fix: tambahkan OngkirCalc ke daftar yang sama (lokasi paling konsisten
// dgn pola project, krn OngkirCalc dipakai lintas banyak tombol & modul
// deklarasinya sudah pasti selesai dieksekusi sebelum GROUP_B jalan — beda dgn
// DashboardHub/DashboardHubSearch yg butuh expose lokal krn dideklarasikan
// SETELAH blok Object.assign besar itu jalan dalam urutan file GROUP_B).

const SELFTEST_FILE = 'features-sheets-pwa-selftest.js';

function getExposedWindowNames() {
  const src = fs.readFileSync(path.join(__dirname, '..', SELFTEST_FILE), 'utf8');
  const m = src.match(/Object\.assign\(window,\{([\s\S]*?)\}\);/);
  assert.ok(m, 'Blok Object.assign(window,{...}) harus ditemukan di ' + SELFTEST_FILE);
  return m[1].split(',').map((s) => s.trim()).filter(Boolean);
}

test('Object.assign(window,{...}) di features-sheets-pwa-selftest.js harus menyertakan OngkirCalc', () => {
  const names = getExposedWindowNames();
  assert.ok(
    names.includes('OngkirCalc'),
    'OngkirCalc tidak ada di Object.assign(window,{...}) -> semua tombol data-action="OngkirCalc.*" ' +
    '(panel 📍 Hitung dari Jarak & Ongkir di modal Produk) akan diam saat diklik'
  );
});

test('Semua data-action="OngkirCalc.*" yang dipakai di modals.js harus punya method yang cocok di OngkirCalc (cobek-pricing.js)', () => {
  const modalsSrc = fs.readFileSync(path.join(__dirname, '..', 'modals.js'), 'utf8');
  const usedMethods = new Set();
  const re = /data-action=\\?"OngkirCalc\.([A-Za-z0-9_]+)\\?"/g;
  let m;
  while ((m = re.exec(modalsSrc))) usedMethods.add(m[1]);
  assert.ok(usedMethods.size > 0, 'Tidak ketemu data-action="OngkirCalc.*" di modals.js — cek regex kalau markup berubah');

  const pricingSrc = fs.readFileSync(path.join(__dirname, '..', 'cobek-pricing.js'), 'utf8');
  const ongkirBlockMatch = pricingSrc.match(/const OngkirCalc=\{([\s\S]*?)\n\};/);
  assert.ok(ongkirBlockMatch, 'Blok const OngkirCalc={...} tidak ketemu di cobek-pricing.js');
  const ongkirBlock = ongkirBlockMatch[1];

  for (const method of usedMethods) {
    assert.ok(
      new RegExp('(^|\\n)\\s*(async\\s+)?' + method + '\\s*\\(').test(ongkirBlock),
      `OngkirCalc.${method} dipakai lewat data-action tapi tidak ketemu method-nya di OngkirCalc`
    );
  }
});
