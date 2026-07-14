'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// dashboard-hub-pinnedwidgets.test.js — Sprint 1 Tahap 6 (PINNED-WIDGETS.md).
// Modernisasi Pinned Widgets MURNI CSS (scoped ke descendant selector
// "#dashboardHubPinnedWrap ...") — tidak ada modul JS baru, tidak ada
// perubahan markup index.html/app_production.html. Test di sini murni
// struktural terhadap styles.css + memastikan markup widget lama
// (id/urutan/konten) tetap sama persis, pola sama dgn
// tests/dashboard-hub-quickactions.test.js.

const HTML_FILES = ['index.html', 'app_production.html'];

function readHtml(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

function readCss() {
  return fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
}

for (const file of HTML_FILES) {
  test(`${file}: #dashboardHubPinnedWrap & 6 widget lama tetap ada, urutan tidak berubah`, () => {
    const html = readHtml(file);
    const wrapIdx = html.indexOf('id="dashboardHubPinnedWrap"');
    assert.notEqual(wrapIdx, -1, 'Pinned Widgets wrap harus tetap ada');

    const widgetIds = ['advisorCard', 'lifeBalanceCard', 'refleksiCard', 'dashFiCard', 'dashPensiunCard', 'dashAbsensiCard'];
    const positions = widgetIds.map((id) => html.indexOf(`id="${id}"`));
    positions.forEach((pos, i) => assert.notEqual(pos, -1, `Widget ${widgetIds[i]} harus tetap ada`));
    for (let i = 1; i < positions.length; i++) {
      assert.ok(positions[i - 1] < positions[i], `Urutan widget tidak boleh berubah (${widgetIds[i - 1]} harus sebelum ${widgetIds[i]})`);
    }
    // Semua widget harus ada DI DALAM wrap (setelah id wrap muncul di markup).
    positions.forEach((pos, i) => assert.ok(wrapIdx < pos, `${widgetIds[i]} harus di dalam #dashboardHubPinnedWrap`));
  });

  test(`${file}: markup tiap widget (judul, data-action, id child) tidak berubah oleh Tahap 6`, () => {
    const html = readHtml(file);
    // Sampel elemen kunci per widget — memastikan konten/event/data TIDAK
    // ikut disentuh oleh modernisasi visual (hanya bungkus .card/.card-title
    // yang berubah lewat CSS, bukan markup ini).
    assert.match(html, /<div class="card u-mb12" id="advisorCard"/);
    assert.match(html, /data-action="Advisor\.setTab" data-args='\["coach"\]'/);
    assert.match(html, /<div class="card u-mb12" id="lifeBalanceCard">/);
    assert.match(html, /data-action="LifeBalance\.openHistoryModal"/);
    assert.match(html, /<div class="card u-mb12 u-pointer" id="refleksiCard" data-action="Refleksi\.open">/);
    assert.match(html, /<div class="card u-mb12" id="dashFiCard">/);
    assert.match(html, /data-action="openFiSettingsModal"/);
    assert.match(html, /<div class="card u-mb12" id="dashPensiunCard">/);
    assert.match(html, /<div class="card u-mb12" id="dashAbsensiCard">/);
    assert.match(html, /data-action="openAbsensiModal"/);
  });

  test(`${file}: Hero Card, Quick Actions, Summary Cards, Dashboard Grid tetap ada persis (di luar cakupan Tahap 6)`, () => {
    const html = readHtml(file);
    assert.match(html, /<div class="dashhub-hero" id="dashHubHeroCard">/);
    assert.match(html, /<div class="dashhub-qa-row" id="dashHubQuickActions">/);
    assert.match(html, /<div class="dashhub-summary-grid" id="dashHubSummaryGrid"><\/div>/);
    assert.match(html, /<div class="dashhub-grid" id="dashboardHubGrid"><\/div>/);
  });
}

test('index.html & app_production.html tetap identik setelah Tahap 6', () => {
  assert.equal(readHtml('index.html'), readHtml('app_production.html'));
});

// ---------------------------------------------------------------------------
// CSS: aturan modernisasi harus scoped ke #dashboardHubPinnedWrap (tidak
// menyentuh base .card/.card-title global), dan hanya pakai token yang sudah
// ada di :root (tidak ada token baru) — pola sama dgn QUICK-ACTIONS.md §3.
// ---------------------------------------------------------------------------

test('styles.css: base .card/.card-title global TIDAK diubah oleh Tahap 6', () => {
  const css = readCss();
  // Baris definisi dasar .card & .card-title (dipakai ~40+ kartu lain di
  // seluruh app) harus tetap sama persis seperti sebelum Tahap 6.
  // Nilai border-radius dimigrasi ke var(--r-2xl) di ROADMAP-v1.1.md Item 4
  // (Sprint 2 Tahap 11) — value-preserving (--r-2xl tetap 16px), guard ini
  // diupdate mengikuti, bukan menandakan .card berubah struktur/nilai.
  assert.match(css, /\.card \{ background: var\(--surface2\); border-radius: var\(--r-2xl\); padding: 16px; margin-bottom: 12px; border: 1px solid var\(--border\); position: relative;/);
  assert.match(css, /\.card-title \{ font-size:var\(--fs-label\); font-weight: 700; color: var\(--text2\); text-transform: uppercase;/);
});

test('styles.css: modernisasi Pinned Widgets di-scope ke "#dashboardHubPinnedWrap" (descendant selector, bukan rename .card global)', () => {
  const css = readCss();
  assert.match(css, /#dashboardHubPinnedWrap \.card\{/, 'Harus ada override scoped utk .card di dalam Pinned Widgets');
  assert.match(css, /#dashboardHubPinnedWrap \.card-title\{/, 'Harus ada override scoped utk .card-title di dalam Pinned Widgets');
});

test('styles.css: aturan Pinned Widgets hanya pakai token yang sudah ada di :root', () => {
  const css = readCss();
  const start = css.indexOf('#dashboardHubPinnedWrap .card{');
  assert.notEqual(start, -1);
  const end = css.indexOf('/* Dashboard Hub — Tahap 5 (Responsive');
  assert.notEqual(end, -1);
  const block = css.slice(start, end);
  const usedTokens = [...block.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((m) => m[1]);
  assert.ok(usedTokens.length > 0, 'Harus ada token dipakai');
  for (const t of usedTokens) {
    assert.match(css, new RegExp(t.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\s*:'), `Token ${t} harus terdefinisi di :root`);
  }
});

test('styles.css: responsive breakpoint 600px & 1024px ada untuk Pinned Widgets (grid 2/3 kolom)', () => {
  const css = readCss();
  const start = css.indexOf('#dashboardHubPinnedWrap .card{');
  const end = css.indexOf('/* Dashboard Hub — Tahap 5 (Responsive');
  const block = css.slice(start, end);
  assert.match(block, /@media \(min-width:600px\)\{[\s\S]*#dashboardHubPinnedWrap\{display:grid/);
  assert.match(block, /@media \(min-width:1024px\)\{[\s\S]*#dashboardHubPinnedWrap\{grid-template-columns:repeat\(3,1fr\);\}/);
});
