'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// laporan-fab.test.js — Sprint 2 Tahap 4 (REPORTS-2.0.md).
// FAB aksi cepat di tab Laporan (#keuanganTab-laporan, di dalam
// #page-keuangan), menyamakan standar UI dengan Finance 2.0 (Sprint 2
// Tahap 1), Shop FAB (Tahap 2), dan Car Notes FAB (Tahap 3). Pola test
// murni struktural (baca markup mentah lewat fs, TANPA vm/DOM tiruan) —
// sama persis dengan test FAB sebelumnya — karena FAB Laporan TIDAK
// menambah fungsi/class CSS baru sama sekali: 100% reuse `.keu-fab*` (CSS)
// dan exportLaporanPDF()/exportCSV() (JS, tidak disentuh).
//
// Beda dari FAB sebelumnya: FAB Laporan (#laporanFab) sengaja ditaruh DI
// DALAM #keuanganTab-laporan (bukan di luar seperti #keuFab) supaya
// kontekstual — hanya tampil saat tab Laporan aktif, murni lewat toggle
// 'u-dnone' yang SUDAH ADA (setKeuanganTab() di tx-list-cashflow.js, tidak
// disentuh). #keuFab (Tahap 1) tetap tampil di kedua tab seperti
// sebelumnya, tidak diubah struktur/actionnya.

const ROOT = path.join(__dirname, '..');
const HTML_FILES = ['index.html', 'app_production.html'];

function readHtml(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function readCss() {
  return fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
}

function extractLaporanFabBlock(html) {
  const start = html.indexOf('<div class="keu-fab" id="laporanFab">');
  const end = html.indexOf('<div class="page-settings-btn">', start);
  assert.ok(start !== -1 && end !== -1 && end > start, 'blok markup FAB Laporan harus ditemukan');
  return html.slice(start, end);
}

for (const htmlFile of HTML_FILES) {
  test(`${htmlFile}: FAB Laporan (#laporanFab) ada di dalam #keuanganTab-laporan`, () => {
    const html = readHtml(htmlFile);
    const tabStart = html.indexOf('id="keuanganTab-laporan"');
    assert.ok(tabStart !== -1, `${htmlFile} harus punya #keuanganTab-laporan`);
    const fabIdx = html.indexOf('id="laporanFab"');
    assert.ok(fabIdx !== -1, `${htmlFile} harus punya elemen #laporanFab`);
    assert.ok(
      fabIdx > tabStart,
      `#laporanFab harus berada di dalam/di bawah pembukaan #keuanganTab-laporan di ${htmlFile}`
    );
  });

  test(`${htmlFile}: FAB Laporan ada di DALAM #page-keuangan (bukan halaman/page terpisah)`, () => {
    const html = readHtml(htmlFile);
    const pageStart = html.indexOf('id="page-keuangan"');
    const fabIdx = html.indexOf('id="laporanFab"');
    const shopPageIdx = html.indexOf('id="page-shop"');
    assert.ok(pageStart !== -1 && fabIdx !== -1 && shopPageIdx !== -1);
    assert.ok(
      fabIdx > pageStart && fabIdx < shopPageIdx,
      `#laporanFab harus berada di dalam #page-keuangan (Laporan adalah tab, bukan page terpisah) di ${htmlFile}`
    );
  });

  test(`${htmlFile}: FAB Laporan 100% reuse class CSS .keu-fab* (tidak ada class baru dibuat)`, () => {
    const block = extractLaporanFabBlock(readHtml(htmlFile));
    assert.match(block, /class="keu-fab" id="laporanFab"/);
    assert.match(block, /class="keu-fab-actions"/);
    assert.match(block, /class="keu-fab-action"/);
    assert.match(block, /class="keu-fab-main"/);
    assert.match(block, /class="keu-fab-main-icon"/);
  });

  test(`${htmlFile}: #laporanFab ditulis SEBELUM #laporanFabMain dan berada tepat setelah pembukaan #keuanganTab-laporan (kontekstual, bukan sebelum keuanganTab-laporan seperti #keuFab)`, () => {
    const html = readHtml(htmlFile);
    const tabIdx = html.indexOf('id="keuanganTab-laporan"');
    const fabIdx = html.indexOf('id="laporanFab"');
    const keuFabIdx = html.indexOf('id="keuFab"');
    assert.ok(tabIdx !== -1 && fabIdx !== -1 && keuFabIdx !== -1);
    assert.ok(
      fabIdx > tabIdx,
      `#laporanFab harus DI DALAM #keuanganTab-laporan (setelah pembukaannya) supaya ikut ter-toggle 'u-dnone' saat pindah tab — kontekstual hanya di tab Laporan`
    );
    assert.ok(
      keuFabIdx < tabIdx,
      `#keuFab (Tahap 1) harus tetap SEBELUM #keuanganTab-laporan (tidak diubah strukturnya) supaya tetap tampil di kedua tab`
    );
  });

  test(`${htmlFile}: tombol FAB Laporan memanggil exportLaporanPDF() dan exportCSV() (reuse fungsi lama, tidak ada fungsi baru)`, () => {
    const block = extractLaporanFabBlock(readHtml(htmlFile));
    assert.match(block, /exportLaporanPDF\(\)/);
    assert.match(block, /exportCSV\(\)/);
  });

  test(`${htmlFile}: FAB Laporan toggle pakai data-onclick generik yang sudah ada (bukan data-action/fungsi baru)`, () => {
    const block = extractLaporanFabBlock(readHtml(htmlFile));
    assert.match(block, /data-onclick=/);
    assert.doesNotMatch(
      block,
      /data-action=/,
      'FAB Laporan tidak boleh pakai data-action — harus reuse data-onclick inline supaya tidak ada JS baru'
    );
  });
}

test('index.html dan app_production.html: markup FAB Laporan PERSIS SAMA (app_production.html harus selalu salinan persis index.html)', () => {
  const [a, b] = HTML_FILES.map(readHtml);
  assert.equal(extractLaporanFabBlock(a), extractLaporanFabBlock(b));
});

test('styles.css: TIDAK ada class CSS ".laporan-fab*"/".reports-fab*" baru dibuat (harus reuse .keu-fab yang sudah ada)', () => {
  const css = readCss();
  assert.doesNotMatch(css, /\.laporan-fab/);
  assert.doesNotMatch(css, /\.reports-fab/);
});

test('styles.css: hanya 1 override posisi aditif untuk FAB Laporan (#keuanganTab-laporan .keu-fab), tidak mengubah rule .keu-fab asli maupun override Shop', () => {
  const css = readCss();
  assert.match(css, /#keuanganTab-laporan \.keu-fab\{bottom:170px;\}/);
  // rule .keu-fab asli (Tahap 1) & override Shop (Tahap 2) tetap ada & tidak berubah
  assert.match(css, /\.keu-fab\{position:fixed;right:var\(--sp-9\);bottom:84px;/);
  assert.match(css, /#page-shop \.keu-fab\{bottom:150px;\}/);
});

test('tx-list-cashflow.js (setKeuanganTab, business logic) tidak disentuh oleh Sprint 2 Tahap 4', () => {
  const src = fs.readFileSync(path.join(ROOT, 'tx-list-cashflow.js'), 'utf8');
  assert.doesNotMatch(src, /laporanFab|Sprint 2 Tahap 4/i);
});

test('features-aiwidget-reminder-gdrive-search.js (exportLaporanPDF, business logic) tidak disentuh oleh Sprint 2 Tahap 4', () => {
  const src = fs.readFileSync(path.join(ROOT, 'features-aiwidget-reminder-gdrive-search.js'), 'utf8');
  assert.doesNotMatch(src, /laporanFab|Sprint 2 Tahap 4/i);
});

test('backup-restore.js (exportCSV, business logic) tidak disentuh oleh Sprint 2 Tahap 4', () => {
  const src = fs.readFileSync(path.join(ROOT, 'backup-restore.js'), 'utf8');
  assert.doesNotMatch(src, /laporanFab|Sprint 2 Tahap 4/i);
});

test('dashboard-hub-registry.js (FEATURE_REGISTRY) tidak disentuh oleh Sprint 2 Tahap 4', () => {
  const src = fs.readFileSync(path.join(ROOT, 'dashboard-hub-registry.js'), 'utf8');
  assert.doesNotMatch(src, /laporanFab|Sprint 2 Tahap 4/i);
});

test('dashboard-hub.js tidak disentuh oleh Sprint 2 Tahap 4', () => {
  const src = fs.readFileSync(path.join(ROOT, 'dashboard-hub.js'), 'utf8');
  assert.doesNotMatch(src, /laporanFab|Sprint 2 Tahap 4/i);
});
