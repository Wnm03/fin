'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// Cakupan file ini: bug identik dgn OngkirCalc (lihat tests/ongkir-window-expose.test.js) &
// DashboardHub/DashboardHubSearch/FinCoach/LifeOS — `const PriceRekoWidget={...}` dan
// `const StockRekoWidget={...}` dideklarasikan top-level di cobek-pricing.js. Top-level
// `const`/`let` TIDAK otomatis jadi properti `window` (beda dari `function`/`var`), sedangkan
// dispatcher global data-action (features-helpers-global-security.js) mencari fungsi/method
// lewat `window[p]`. Tanpa expose eksplisit, semua tombol data-action="PriceRekoWidget.*"/
// "StockRekoWidget.*" di widget "🤖 Rekomendasi Harga Jual AI" & "📦 Rekomendasi Restock AI"
// (tab Shop → Etalase) DIAM saat diklik — termasuk tombol utama "🧮 Terapkan ke Semua Produk"
// (PriceRekoWidget.applyBulk) — tanpa error di console, krn window.PriceRekoWidget cuma
// `undefined` (dispatcher exit diam-diam, bukan throw).
//
// BUG NYATA ditemukan lewat verifikasi browser nyata (Playwright + Chrome headless, real click,
// bukan cuma baca kode): smoke-test bawaan app melaporkan
// "data-action merujuk modul/fungsi yang TIDAK ke-expose ke window: [PriceRekoWidget.applyBulk,
// StockRekoWidget.applyAll]". Fix: tambahkan PriceRekoWidget & StockRekoWidget ke
// Object.assign(window,{...}) yang sama tempat PriceReko/OngkirCalc (sibling-nya di file yang
// sama) sudah ada.

const SELFTEST_FILE = 'features-sheets-pwa-selftest.js';

function getExposedWindowNames() {
  const src = fs.readFileSync(path.join(__dirname, '..', SELFTEST_FILE), 'utf8');
  const m = src.match(/Object\.assign\(window,\{([\s\S]*?)\}\);/);
  assert.ok(m, 'Blok Object.assign(window,{...}) harus ditemukan di ' + SELFTEST_FILE);
  return m[1].split(',').map((s) => s.trim()).filter(Boolean);
}

test('Object.assign(window,{...}) harus menyertakan PriceRekoWidget', () => {
  const names = getExposedWindowNames();
  assert.ok(
    names.includes('PriceRekoWidget'),
    'PriceRekoWidget tidak ada di Object.assign(window,{...}) -> tombol "🧮 Terapkan ke Semua Produk" ' +
    '(data-action="PriceRekoWidget.applyBulk") dan tombol ✅/🔍 per-baris akan diam saat diklik'
  );
});

test('Object.assign(window,{...}) harus menyertakan StockRekoWidget', () => {
  const names = getExposedWindowNames();
  assert.ok(
    names.includes('StockRekoWidget'),
    'StockRekoWidget tidak ada di Object.assign(window,{...}) -> tombol widget "📦 Rekomendasi Restock AI" ' +
    '(data-action="StockRekoWidget.applyAll"/"openStockRekoWidgetDetail") akan diam saat diklik'
  );
});

test('Semua data-action="PriceRekoWidget.*"/"StockRekoWidget.*" yang dipakai di index.html harus punya method yang cocok di cobek-pricing.js', () => {
  const htmlSrc = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const usedMethods = new Set();
  const re = /data-action="(PriceRekoWidget|StockRekoWidget)\.([A-Za-z0-9_]+)"/g;
  let m;
  while ((m = re.exec(htmlSrc))) usedMethods.add(m[1] + '.' + m[2]);
  assert.ok(usedMethods.size > 0, 'Tidak ketemu data-action="PriceRekoWidget.*"/"StockRekoWidget.*" di index.html — cek regex kalau markup berubah');

  const pricingSrc = fs.readFileSync(path.join(__dirname, '..', 'cobek-pricing.js'), 'utf8');

  for (const full of usedMethods) {
    const [modName, method] = full.split('.');
    const blockMatch = pricingSrc.match(new RegExp('const ' + modName + '=\\{([\\s\\S]*?)\\n\\};'));
    assert.ok(blockMatch, `Blok const ${modName}={...} tidak ketemu di cobek-pricing.js`);
    assert.ok(
      new RegExp('(^|\\n)\\s*(async\\s+)?' + method + '\\s*\\(').test(blockMatch[1]),
      `${full} dipakai lewat data-action tapi tidak ketemu method-nya di cobek-pricing.js`
    );
  }
});
