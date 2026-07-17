'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadSource } = require('./helpers/loadSource');
const { createFakeElement } = require('./helpers/fakeDom');

// dashboard-hub-sectiontabs.test.js — Fase 1, split tab 🧭 Dashboard Hub
// (landing page), lihat CLAUDE.md "AUDIT + RENCANA KERJA BERTAHAP — Split
// tab 🧭 Dashboard Hub". SENGAJA TIDAK ada wrapper <div id="dashHubTab-xxx">
// baru (0 reorder DOM) — DashboardHub.setSectionTab()/applySectionTab() di
// dashboard-hub.js toggle class u-dnone LANGSUNG ke id section yang sudah
// ada, pola sama dgn setMainTab()/applyMainTab() (test struktural di sini
// mengikuti pola tests/dashboard-hub-quickactions.test.js /
// tests/dashboard-hub-pinnedwidgets.test.js — cek posisi & markup, BUKAN
// visibility runtime, krn itu bergantung getComputedStyle browser nyata).

const HTML_FILES = ['index.html', 'app_production.html'];

function readHtml(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

function readCss() {
  return fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
}

// ---------------------------------------------------------------------------
// 1. Markup — nav .dhb-subtabs ada, tepat 3 tombol, posisi setelah Favorit &
//    sebelum tab switcher Fitur/Pinned lama, Hero/Tangga/Quick Actions/Search
//    tidak tersentuh.
// ---------------------------------------------------------------------------

for (const file of HTML_FILES) {
  test(`${file}: #dashboardHub .dhb-subtabs ada, tepat di antara Favorit dan tab switcher Fitur/Pinned lama`, () => {
    const html = readHtml(file);
    const favIdx = html.indexOf('id="dashHubFavoritSection"');
    const subtabsIdx = html.indexOf('class="cn-tabs dhb-subtabs"');
    const mainTabsRowIdx = html.indexOf('id="dashHubMainTabsRow"');
    assert.notEqual(favIdx, -1, 'Favorit section harus tetap ada');
    assert.notEqual(subtabsIdx, -1, 'Nav .dhb-subtabs harus ada');
    assert.notEqual(mainTabsRowIdx, -1, 'Tab switcher Fitur/Pinned lama harus tetap ada');
    assert.ok(favIdx < subtabsIdx, 'Nav .dhb-subtabs harus SETELAH Favorit');
    assert.ok(subtabsIdx < mainTabsRowIdx, 'Nav .dhb-subtabs harus SEBELUM tab switcher Fitur/Pinned lama');
  });

  test(`${file}: berisi tepat 3 tombol .dhb-subtab dgn id & data-args yang benar`, () => {
    const html = readHtml(file);
    const btnMatches = [...html.matchAll(/class="dhb-subtab( active)?" id="dashHubSectionTabBtn-([a-z]+)" data-action="DashboardHub\.setSectionTab" data-args='\["([a-z]+)"\]'/g)];
    assert.equal(btnMatches.length, 3, 'Harus tepat 3 tombol .dhb-subtab');
    const order = btnMatches.map((m) => m[2]);
    assert.deepEqual(order, ['ringkasan', 'fitur', 'insight'], 'Urutan tombol harus Ringkasan → Fitur → Insight');
    btnMatches.forEach((m) => assert.equal(m[2], m[3], `id dashHubSectionTabBtn-${m[2]} harus konsisten dgn data-args ["${m[3]}"]`));
    // Cuma tombol pertama (ringkasan) yang default aktif.
    assert.equal(btnMatches[0][1], ' active', 'Tombol Ringkasan harus default active');
    assert.equal(btnMatches[1][1], undefined, 'Tombol Fitur TIDAK boleh default active');
    assert.equal(btnMatches[2][1], undefined, 'Tombol Insight TIDAK boleh default active');
  });

  test(`${file}: Hero Card, Tangga Ternak Uang, Quick Actions & Search TIDAK tersentuh (tetap selalu tampil, di atas nav .dhb-subtabs)`, () => {
    const html = readHtml(file);
    const heroIdx = html.indexOf('id="dashHubHeroCard"');
    const tanggaIdx = html.indexOf('id="tanggaKeuanganCard"');
    const qaIdx = html.indexOf('id="dashHubQuickActions"');
    const searchIdx = html.indexOf('id="dashHubSearchInput"');
    const subtabsIdx = html.indexOf('class="cn-tabs dhb-subtabs"');
    [heroIdx, tanggaIdx, qaIdx, searchIdx].forEach((idx) => assert.notEqual(idx, -1));
    assert.ok(heroIdx < tanggaIdx && tanggaIdx < qaIdx && qaIdx < searchIdx && searchIdx < subtabsIdx,
      'Urutan Hero → Tangga Ternak Uang → Quick Actions → Search → nav .dhb-subtabs tidak boleh berubah');
  });

  test(`${file}: section yang dikelompokkan (Summary/Analytics/Favorit/tab switcher/LifeOS/EIE) semua tetap ada, tidak dihapus/dipindah keluar #page-dashboard-hub`, () => {
    const html = readHtml(file);
    const pageStart = html.indexOf('id="page-dashboard-hub"');
    const pageBlock = html.slice(pageStart, html.indexOf('<!-- mainApp -->'));
    ['dashHubSummaryGrid', 'dashHubAnalyticsRow', 'dashHubFavoritSection', 'dashHubMainTabsRow',
      'dashHubMainGridCard', 'dashboardHubPinnedWrap', 'lifeOSWrap', 'eieWrap'].forEach((id) => {
      assert.notEqual(pageBlock.indexOf(`id="${id}"`), -1, `#${id} harus tetap ada di dalam #page-dashboard-hub`);
    });
  });
}

test('index.html & app_production.html tetap identik setelah Fase 1 (split Dashboard Hub)', () => {
  assert.equal(readHtml('index.html'), readHtml('app_production.html'));
});

// ---------------------------------------------------------------------------
// 2. CSS: token yang dipakai .dhb-subtabs/.dhb-subtab harus semuanya SUDAH
//    ADA di :root (tidak ada token baru), pola sama dgn split Laporan/
//    Kelola/Pajak.
// ---------------------------------------------------------------------------

test('styles.css: .dhb-subtabs/.dhb-subtab hanya pakai token yang sudah ada', () => {
  const css = readCss();
  assert.match(css, /\.dhb-subtabs\s*\{/);
  assert.match(css, /\.dhb-subtab\s*\{/);
  assert.match(css, /\.dhb-subtab\.active\s*\{/);
  const block = css.slice(css.indexOf('.dhb-subtabs'), css.indexOf('.dhb-subtabs') + 500);
  const usedTokens = [...block.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((m) => m[1]);
  assert.ok(usedTokens.length > 0, 'Harus ada token dipakai');
  for (const t of usedTokens) {
    assert.match(css, new RegExp(t.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\s*:'), `Token ${t} harus terdefinisi di :root`);
  }
});

// ---------------------------------------------------------------------------
// 3. Perilaku DashboardHub.setSectionTab()/applySectionTab() — dijalankan
//    lewat loadSource() + document/localStorage tiruan (pola sama dgn
//    tests/dashboard-hub.test.js), memverifikasi toggle class u-dnone yang
//    benar per sub-tab & persist ke localStorage (key dashHubSectionTab).
// ---------------------------------------------------------------------------

function makeFakeLocalStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    _dump: () => Object.fromEntries(store),
  };
}

const RINGKASAN_IDS = ['dashHubSummaryGrid', 'dashHubAnalyticsRow'];
const FITUR_IDS = ['dashHubFavoritSection', 'dashHubMainTabsRow', 'dashHubMainGridCard', 'dashboardHubPinnedWrap'];
const INSIGHT_IDS = ['lifeOSWrap', 'eieWrap'];
const ALL_SECTION_IDS = [...RINGKASAN_IDS, ...FITUR_IDS, ...INSIGHT_IDS];
const BTN_IDS = ['dashHubSectionTabBtn-ringkasan', 'dashHubSectionTabBtn-fitur', 'dashHubSectionTabBtn-insight'];

function makeSectionTabDocument() {
  const els = new Map();
  function ensure(id) {
    if (!els.has(id)) els.set(id, createFakeElement());
    return els.get(id);
  }
  [...ALL_SECTION_IDS, ...BTN_IDS, 'dashHubMainGridCard', 'dashboardHubPinnedWrap',
    'dashHubMainTabBtn-fitur', 'dashHubMainTabBtn-pinned', 'dashHubFavoritSection', 'dashHubFavoritList']
    .forEach(ensure);
  return {
    els,
    getElementById: (id) => ensure(id),
    querySelectorAll: () => [],
  };
}

function loadHub(localStorage) {
  const fakeDocument = makeSectionTabDocument();
  const ctx = loadSource(['dashboard-hub.js'], {
    document: fakeDocument,
    localStorage,
    escapeHtml: (s) => String(s === null || s === undefined ? '' : s),
  }, ['DashboardHub']);
  return { DashboardHub: ctx.DashboardHub, fakeDocument };
}

test('DashboardHub.applySectionTab("ringkasan"): hanya section Ringkasan yang tampil (u-dnone dilepas), Fitur & Insight disembunyikan', () => {
  const { DashboardHub, fakeDocument } = loadHub(makeFakeLocalStorage());
  DashboardHub.applySectionTab('ringkasan');
  RINGKASAN_IDS.forEach((id) => assert.equal(fakeDocument.getElementById(id).classList.contains('u-dnone'), false, `${id} harus TAMPIL`));
  FITUR_IDS.forEach((id) => assert.equal(fakeDocument.getElementById(id).classList.contains('u-dnone'), true, `${id} harus disembunyikan`));
  INSIGHT_IDS.forEach((id) => assert.equal(fakeDocument.getElementById(id).classList.contains('u-dnone'), true, `${id} harus disembunyikan`));
  assert.equal(fakeDocument.getElementById('dashHubSectionTabBtn-ringkasan').classList.contains('active'), true);
  assert.equal(fakeDocument.getElementById('dashHubSectionTabBtn-fitur').classList.contains('active'), false);
});

test('DashboardHub.applySectionTab("insight"): hanya Life OS & EIE yang tampil', () => {
  const { DashboardHub, fakeDocument } = loadHub(makeFakeLocalStorage());
  DashboardHub.applySectionTab('insight');
  INSIGHT_IDS.forEach((id) => assert.equal(fakeDocument.getElementById(id).classList.contains('u-dnone'), false, `${id} harus TAMPIL`));
  RINGKASAN_IDS.forEach((id) => assert.equal(fakeDocument.getElementById(id).classList.contains('u-dnone'), true));
  FITUR_IDS.forEach((id) => assert.equal(fakeDocument.getElementById(id).classList.contains('u-dnone'), true));
  assert.equal(fakeDocument.getElementById('dashHubSectionTabBtn-insight').classList.contains('active'), true);
});

test('DashboardHub.applySectionTab("fitur"): tetap menghormati dashHubMainTab (Semua Fitur vs Pinned Widget) yang sudah dipilih user sebelumnya', () => {
  const { DashboardHub, fakeDocument } = loadHub(makeFakeLocalStorage({ dashHubMainTab: 'pinned' }));
  DashboardHub.applySectionTab('fitur');
  // Grup "fitur" level teratas harus tampil...
  assert.equal(fakeDocument.getElementById('dashHubFavoritSection').classList.contains('u-dnone'), false);
  assert.equal(fakeDocument.getElementById('dashHubMainTabsRow').classList.contains('u-dnone'), false);
  // ...tapi di dalamnya, applyMainTab('pinned') tetap menang: grid Semua
  // Fitur disembunyikan, Pinned Widget yang tampil (BUKAN ketimpa tampil
  // keduanya oleh toggle generik applySectionTab).
  assert.equal(fakeDocument.getElementById('dashHubMainGridCard').classList.contains('u-dnone'), true, 'Semua Fitur harus tetap disembunyikan krn dashHubMainTab=pinned');
  assert.equal(fakeDocument.getElementById('dashboardHubPinnedWrap').classList.contains('u-dnone'), false, 'Pinned Widget harus tampil krn dashHubMainTab=pinned');
});

test('DashboardHub.setSectionTab("insight"): menyimpan pilihan ke localStorage (key dashHubSectionTab) & langsung menerapkannya', () => {
  const localStorage = makeFakeLocalStorage();
  const { DashboardHub, fakeDocument } = loadHub(localStorage);
  DashboardHub.setSectionTab('insight');
  assert.equal(localStorage.getItem('dashHubSectionTab'), 'insight');
  assert.equal(fakeDocument.getElementById('lifeOSWrap').classList.contains('u-dnone'), false);
  assert.equal(fakeDocument.getElementById('dashHubSummaryGrid').classList.contains('u-dnone'), true);
});
