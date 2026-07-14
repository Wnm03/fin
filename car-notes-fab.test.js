'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// car-notes-fab.test.js — Sprint 2 Tahap 3 (CAR-NOTES-2.0.md).
// FAB aksi cepat di Halaman Car Notes (#page-carnotes), menyamakan standar
// UI dengan Finance 2.0 (Sprint 2 Tahap 1) dan Shop FAB (Sprint 2 Tahap 2).
// Pola test murni struktural (baca markup mentah lewat fs, TANPA vm/DOM
// tiruan) — sama persis dengan tests/finance-2.0-fab.test.js dan
// tests/shop-fab.test.js — karena FAB Car Notes TIDAK menambah fungsi/class
// CSS baru sama sekali: 100% reuse `.keu-fab*` (CSS) dan
// openBbmModal()/openServisModal() (JS, tidak disentuh). Berbeda dari Shop
// FAB, Car Notes TIDAK butuh override posisi CSS sama sekali karena halaman
// ini tidak punya elemen fixed lain yang bisa tumpang tindih (tidak ada
// `.kasir-floatbar` di Car Notes).

const ROOT = path.join(__dirname, '..');
const HTML_FILES = ['index.html', 'app_production.html'];

function readHtml(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function readCss() {
  return fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
}

function extractCarNotesFabBlock(html) {
  const start = html.indexOf('<div class="keu-fab" id="carNotesFab">');
  const end = html.indexOf('<!-- BBM TAB', start);
  assert.ok(start !== -1 && end !== -1 && end > start, 'blok markup FAB Car Notes harus ditemukan');
  return html.slice(start, end);
}

for (const htmlFile of HTML_FILES) {
  test(`${htmlFile}: FAB Car Notes (#carNotesFab) ada di dalam #page-carnotes`, () => {
    const html = readHtml(htmlFile);
    const pageStart = html.indexOf('id="page-carnotes"');
    assert.ok(pageStart !== -1, `${htmlFile} harus punya #page-carnotes`);
    const fabIdx = html.indexOf('id="carNotesFab"');
    assert.ok(fabIdx !== -1, `${htmlFile} harus punya elemen #carNotesFab`);
    assert.ok(
      fabIdx > pageStart,
      `#carNotesFab harus berada di dalam/di bawah pembukaan #page-carnotes di ${htmlFile}`
    );
  });

  test(`${htmlFile}: FAB Car Notes 100% reuse class CSS .keu-fab* (tidak ada class baru dibuat)`, () => {
    const block = extractCarNotesFabBlock(readHtml(htmlFile));
    assert.match(block, /class="keu-fab" id="carNotesFab"/);
    assert.match(block, /class="keu-fab-actions"/);
    assert.match(block, /class="keu-fab-action"/);
    assert.match(block, /class="keu-fab-main"/);
    assert.match(block, /class="keu-fab-main-icon"/);
  });

  test(`${htmlFile}: FAB Car Notes berada DI LUAR #cnTab-bbm dan #cnTab-servis (tampil di kedua tab)`, () => {
    const html = readHtml(htmlFile);
    const fabIdx = html.indexOf('id="carNotesFab"');
    const bbmTabIdx = html.indexOf('id="cnTab-bbm"');
    const servisTabIdx = html.indexOf('id="cnTab-servis"');
    assert.ok(fabIdx !== -1 && bbmTabIdx !== -1 && servisTabIdx !== -1);
    assert.ok(
      fabIdx < bbmTabIdx && fabIdx < servisTabIdx,
      `#carNotesFab harus ditulis SEBELUM #cnTab-bbm dan #cnTab-servis supaya tidak ikut ` +
        `ter-toggle 'u-dnone' saat pindah tab (lihat setCnTab() di vehicle-core.js)`
    );
  });

  test(`${htmlFile}: tombol FAB Car Notes memanggil openBbmModal() dan openServisModal() (reuse fungsi lama, tidak ada fungsi baru)`, () => {
    const block = extractCarNotesFabBlock(readHtml(htmlFile));
    assert.match(block, /openBbmModal\(\)/);
    assert.match(block, /openServisModal\(\)/);
  });

  test(`${htmlFile}: FAB Car Notes toggle pakai data-onclick generik yang sudah ada (bukan data-action/fungsi baru)`, () => {
    const block = extractCarNotesFabBlock(readHtml(htmlFile));
    assert.match(block, /data-onclick=/);
    assert.doesNotMatch(
      block,
      /data-action=/,
      'FAB Car Notes tidak boleh pakai data-action — harus reuse data-onclick inline supaya tidak ada JS baru'
    );
  });
}

test('index.html dan app_production.html: markup FAB Car Notes PERSIS SAMA (app_production.html harus selalu salinan persis index.html)', () => {
  const [a, b] = HTML_FILES.map(readHtml);
  assert.equal(extractCarNotesFabBlock(a), extractCarNotesFabBlock(b));
});

test('styles.css: TIDAK ada class CSS ".car-notes-fab*" / ".carnotes-fab*" baru dibuat (harus reuse .keu-fab yang sudah ada)', () => {
  const css = readCss();
  assert.doesNotMatch(css, /\.car-notes-fab/);
  assert.doesNotMatch(css, /\.carnotes-fab/);
});

test('styles.css: TIDAK ada override posisi baru untuk #page-carnotes .keu-fab (halaman Car Notes tidak butuh override, tidak ada elemen fixed lain yang bentrok)', () => {
  const css = readCss();
  assert.doesNotMatch(css, /#page-carnotes \.keu-fab/);
  // rule .keu-fab asli (Tahap 1) & override Shop (Tahap 2) tetap ada & tidak berubah
  assert.match(css, /\.keu-fab\{position:fixed;right:var\(--sp-9\);bottom:84px;/);
  assert.match(css, /#page-shop \.keu-fab\{bottom:150px;\}/);
});

test('vehicle-core.js (openBbmModal, business logic) tidak disentuh oleh Sprint 2 Tahap 3', () => {
  const src = fs.readFileSync(path.join(ROOT, 'vehicle-core.js'), 'utf8');
  assert.doesNotMatch(src, /carNotesFab|Sprint 2 Tahap 3/i);
});

test('sparepart-servis.js (openServisModal, business logic) tidak disentuh oleh Sprint 2 Tahap 3', () => {
  const src = fs.readFileSync(path.join(ROOT, 'sparepart-servis.js'), 'utf8');
  assert.doesNotMatch(src, /carNotesFab|Sprint 2 Tahap 3/i);
});

test('dashboard-hub-registry.js (FEATURE_REGISTRY) tidak disentuh oleh Sprint 2 Tahap 3', () => {
  const src = fs.readFileSync(path.join(ROOT, 'dashboard-hub-registry.js'), 'utf8');
  assert.doesNotMatch(src, /carNotesFab|Sprint 2 Tahap 3/i);
});

test('dashboard-hub.js tidak disentuh oleh Sprint 2 Tahap 3', () => {
  const src = fs.readFileSync(path.join(ROOT, 'dashboard-hub.js'), 'utf8');
  assert.doesNotMatch(src, /carNotesFab|Sprint 2 Tahap 3/i);
});
