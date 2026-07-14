'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// shop-fab.test.js — Sprint 2 Tahap 2 (SHOP-2.0.md).
// FAB aksi cepat di Halaman Shop (#page-shop), menyamakan standar UI
// dengan Finance 2.0 (Sprint 2 Tahap 1). Pola test murni struktural
// (baca markup mentah lewat fs, TANPA vm/DOM tiruan) — sama persis
// dengan tests/finance-2.0-fab.test.js — karena FAB Shop TIDAK menambah
// fungsi/class CSS baru sama sekali: 100% reuse `.keu-fab*` (CSS) dan
// openOrderModal()/openProductModal() (JS, tidak disentuh).

const ROOT = path.join(__dirname, '..');
const HTML_FILES = ['index.html', 'app_production.html'];

function readHtml(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function readCss() {
  return fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
}

function extractShopFabBlock(html) {
  const start = html.indexOf('<div class="keu-fab" id="shopFab">');
  const end = html.indexOf('<!-- KASIR AI', start);
  assert.ok(start !== -1 && end !== -1 && end > start, 'blok markup FAB Shop harus ditemukan');
  return html.slice(start, end);
}

for (const htmlFile of HTML_FILES) {
  test(`${htmlFile}: FAB Shop (#shopFab) ada di dalam #page-shop`, () => {
    const html = readHtml(htmlFile);
    const pageStart = html.indexOf('id="page-shop"');
    assert.ok(pageStart !== -1, `${htmlFile} harus punya #page-shop`);
    const fabIdx = html.indexOf('id="shopFab"');
    assert.ok(fabIdx !== -1, `${htmlFile} harus punya elemen #shopFab`);
    assert.ok(
      fabIdx > pageStart,
      `#shopFab harus berada di dalam/di bawah pembukaan #page-shop di ${htmlFile}`
    );
  });

  test(`${htmlFile}: FAB Shop 100% reuse class CSS .keu-fab* (tidak ada class baru dibuat)`, () => {
    const block = extractShopFabBlock(readHtml(htmlFile));
    assert.match(block, /class="keu-fab" id="shopFab"/);
    assert.match(block, /class="keu-fab-actions"/);
    assert.match(block, /class="keu-fab-action"/);
    assert.match(block, /class="keu-fab-main"/);
    assert.match(block, /class="keu-fab-main-icon"/);
  });

  test(`${htmlFile}: FAB Shop berada DI LUAR semua #shopTab-* (tampil di seluruh tab Shop)`, () => {
    const html = readHtml(htmlFile);
    const fabIdx = html.indexOf('id="shopFab"');
    const kasirTabIdx = html.indexOf('id="shopTab-kasir"');
    assert.ok(fabIdx !== -1 && kasirTabIdx !== -1);
    assert.ok(
      fabIdx < kasirTabIdx,
      `#shopFab harus ditulis SEBELUM #shopTab-kasir supaya tidak ikut ` +
        `ter-toggle 'u-dnone' saat pindah tab (lihat setShopTab() di cobek-io.js)`
    );
  });

  test(`${htmlFile}: tombol FAB Shop memanggil openOrderModal() dan openProductModal() (reuse fungsi lama, tidak ada fungsi baru)`, () => {
    const block = extractShopFabBlock(readHtml(htmlFile));
    assert.match(block, /openOrderModal\(\)/);
    assert.match(block, /openProductModal\(\)/);
  });

  test(`${htmlFile}: FAB Shop toggle pakai data-onclick generik yang sudah ada (bukan data-action/fungsi baru)`, () => {
    const block = extractShopFabBlock(readHtml(htmlFile));
    assert.match(block, /data-onclick=/);
    assert.doesNotMatch(
      block,
      /data-action=/,
      'FAB Shop tidak boleh pakai data-action — harus reuse data-onclick inline supaya tidak ada JS baru'
    );
  });
}

test('index.html dan app_production.html: markup FAB Shop PERSIS SAMA (app_production.html harus selalu salinan persis index.html)', () => {
  const [a, b] = HTML_FILES.map(readHtml);
  assert.equal(extractShopFabBlock(a), extractShopFabBlock(b));
});

test('styles.css: TIDAK ada class CSS ".shop-fab*" baru dibuat (harus reuse .keu-fab yang sudah ada)', () => {
  const css = readCss();
  assert.doesNotMatch(css, /\.shop-fab/);
});

test('styles.css: hanya 1 override posisi aditif untuk FAB Shop (#page-shop .keu-fab), tidak mengubah rule .keu-fab asli', () => {
  const css = readCss();
  assert.match(css, /#page-shop \.keu-fab\{bottom:150px;\}/);
  // rule .keu-fab asli (Tahap 1) tetap ada & tidak berubah nilainya
  assert.match(css, /\.keu-fab\{position:fixed;right:var\(--sp-9\);bottom:84px;/);
});

test('cobek-io.js (openOrderModal, business logic) tidak disentuh oleh Sprint 2 Tahap 2', () => {
  const src = fs.readFileSync(path.join(ROOT, 'cobek-io.js'), 'utf8');
  assert.doesNotMatch(src, /shopFab|Sprint 2 Tahap 2/i);
});

test('cobek-tx-cart.js (openProductModal, business logic) tidak disentuh oleh Sprint 2 Tahap 2', () => {
  const src = fs.readFileSync(path.join(ROOT, 'cobek-tx-cart.js'), 'utf8');
  assert.doesNotMatch(src, /shopFab|Sprint 2 Tahap 2/i);
});

test('dashboard-hub-registry.js (FEATURE_REGISTRY) tidak disentuh oleh Sprint 2 Tahap 2', () => {
  const src = fs.readFileSync(path.join(ROOT, 'dashboard-hub-registry.js'), 'utf8');
  assert.doesNotMatch(src, /shopFab|Sprint 2 Tahap 2/i);
});
