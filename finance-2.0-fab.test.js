'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// finance-2.0-fab.test.js — Sprint 2 Tahap 1 (FINANCE-2.0.md).
// FAB tambah transaksi cepat di Halaman Keuangan (#page-keuangan).
// Test ini murni struktural (baca markup mentah lewat fs, TANPA vm/DOM
// tiruan) karena FAB tidak menambah fungsi JS baru sama sekali — hanya
// markup HTML + CSS aditif yang me-reuse openTxModal() (transaksi.js,
// TIDAK disentuh/diubah) lewat mekanisme data-onclick generik yang sudah
// ada (features-helpers-global-security.js, TIDAK disentuh/diubah).
// Pola cek "index.html vs app_production.html harus identik" mengikuti
// tests/modal-html-parity.test.js yang sudah ada.

const ROOT = path.join(__dirname, '..');
const HTML_FILES = ['index.html', 'app_production.html'];

function readHtml(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function readCss() {
  return fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
}

for (const htmlFile of HTML_FILES) {
  test(`${htmlFile}: FAB Keuangan (#keuFab) ada di dalam #page-keuangan`, () => {
    const html = readHtml(htmlFile);
    const pageStart = html.indexOf('id="page-keuangan"');
    assert.ok(pageStart !== -1, `${htmlFile} harus punya #page-keuangan`);
    const fabIdx = html.indexOf('id="keuFab"');
    assert.ok(fabIdx !== -1, `${htmlFile} harus punya elemen #keuFab`);
    assert.ok(
      fabIdx > pageStart,
      `#keuFab harus berada di dalam/di bawah pembukaan #page-keuangan di ${htmlFile}`
    );
  });

  test(`${htmlFile}: FAB Keuangan berada DI LUAR #keuanganTab-kelola dan #keuanganTab-laporan (tampil di kedua tab)`, () => {
    const html = readHtml(htmlFile);
    const fabIdx = html.indexOf('id="keuFab"');
    const kelolaIdx = html.indexOf('id="keuanganTab-kelola"');
    assert.ok(fabIdx !== -1 && kelolaIdx !== -1);
    assert.ok(
      fabIdx < kelolaIdx,
      `#keuFab harus ditulis SEBELUM #keuanganTab-kelola supaya tidak ikut ` +
        `ter-toggle 'u-dnone' saat pindah tab (lihat setKeuanganTab() di tx-list-cashflow.js)`
    );
  });

  test(`${htmlFile}: tombol FAB memanggil openTxModal('income') dan openTxModal('expense') (reuse fungsi lama, tidak ada fungsi baru)`, () => {
    const html = readHtml(htmlFile);
    assert.match(html, /openTxModal\('income'\)/);
    assert.match(html, /openTxModal\('expense'\)/);
  });

  test(`${htmlFile}: FAB toggle pakai mekanisme data-onclick generik yang sudah ada (bukan fungsi JS baru)`, () => {
    const html = readHtml(htmlFile);
    const start = html.indexOf('<div class="keu-fab" id="keuFab">');
    const end = html.indexOf('<!-- KELOLA -->', start);
    assert.ok(start !== -1 && end !== -1 && end > start, 'blok markup FAB harus ditemukan');
    const fabBlock = html.slice(start, end);
    assert.match(fabBlock, /data-onclick=/);
    assert.doesNotMatch(
      fabBlock,
      /data-action=/,
      'FAB tidak boleh pakai data-action (yang butuh fungsi window.* terdaftar) — harus reuse data-onclick inline supaya tidak ada JS baru'
    );
  });
}

test('index.html dan app_production.html: markup FAB Keuangan PERSIS SAMA (app_production.html harus selalu salinan persis index.html)', () => {
  const [a, b] = HTML_FILES.map(readHtml);
  const extract = (html) => {
    const start = html.indexOf('<div class="keu-fab" id="keuFab">');
    const end = html.indexOf('<!-- KELOLA -->', start);
    assert.ok(start !== -1 && end !== -1 && end > start);
    return html.slice(start, end);
  };
  assert.equal(extract(a), extract(b));
});

test('styles.css: CSS .keu-fab* ditambahkan secara aditif, 100% pakai token design system yang sudah ada', () => {
  const css = readCss();
  assert.match(css, /\.keu-fab\{/);
  assert.match(css, /\.keu-fab-main\{/);
  assert.match(css, /\.keu-fab-action\{/);
  assert.match(css, /\.keu-fab\.open \.keu-fab-actions\{/);
  // Pastikan hanya memakai var(--...) token yang sudah ada, bukan angka
  // literal baru untuk warna/spacing/radius/font (kecuali ukuran fisik
  // tombol 52px & shadow, yang memang bukan bagian dari skala token).
  const fabBlockMatch = css.match(/\/\* ===== Finance 2\.0[\s\S]*$/);
  assert.ok(fabBlockMatch, 'blok CSS Finance 2.0 FAB harus ditemukan di akhir styles.css');
  assert.match(fabBlockMatch[0], /var\(--accent\)/);
  assert.match(fabBlockMatch[0], /var\(--surface3\)/);
  assert.match(fabBlockMatch[0], /var\(--z-dropdown\)/);
});

test('dashboard-hub-registry.js (FEATURE_REGISTRY) tidak disentuh oleh Sprint 2 Tahap 1', () => {
  const src = fs.readFileSync(path.join(ROOT, 'dashboard-hub-registry.js'), 'utf8');
  assert.doesNotMatch(src, /keuFab|keu-fab|Finance 2\.0/i);
});

test('transaksi.js (business logic openTxModal) tidak disentuh oleh Sprint 2 Tahap 1', () => {
  const src = fs.readFileSync(path.join(ROOT, 'transaksi.js'), 'utf8');
  assert.doesNotMatch(src, /keuFab|keu-fab|Finance 2\.0/i);
});
