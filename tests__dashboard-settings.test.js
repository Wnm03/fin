'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

// tests/dashboard-settings.test.js — S129 "Pengaturan Dashboard" (Dashboard
// Settings). Menguji modules/dashboard-hub/dashboard-hub-settings.js
// (DashboardSettings) lewat loadSource() (pola sama dgn
// tests/dashboard-hub-favorit.test.js) — D/save/localStorage/document/
// toast/askConfirm semua di-stub lewat extraGlobals, TIDAK ikut me-load
// modules-render.js yang berat (persis alasan yang sama dijelaskan di
// tests/dash-card-registry.test.js: file itu bergantung ke terlalu banyak
// modul lain buat runtime). DASH_CARD_BY_KEY/DASH_RENDER_ORDER cukup
// di-stub minimal (3 key) di sini — invarian isinya SENDIRI (DASH_CARD_DEFS
// <-> DASH_RENDER_ORDER harus sama persis) sudah dijaga terpisah oleh
// tests/dash-card-registry.test.js, bukan tanggung jawab file ini.

const DASH_CARD_BY_KEY_STUB = {
  bill: { key: 'bill', label: '🔔 Tagihan & Cicilan', elId: 'dashBillCard' },
  servisReminder: { key: 'servisReminder', label: '🔧 Pengingat Servis Kendaraan', elId: 'dashServisReminderCard' },
  fi: { key: 'fi', label: '🎯 Kebebasan Finansial', elId: 'dashFiCard' },
};
const DASH_RENDER_ORDER_STUB = ['bill', 'servisReminder', 'fi'];

function makeLocalStorageStub(initial = {}) {
  const store = { ...initial };
  return {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    _store: store,
  };
}

// Array/objek yang dibuat lewat literal ([...]) DI DALAM kode yang berjalan
// di vm context adalah instance Array milik REALM vm itu sendiri (beda dari
// Array host walau sama-sama diberi properti `Array` yang sama di sandbox —
// vm.createContext() selalu membuat intrinsic barunya sendiri). assert.
// deepEqual/deepStrictEqual (node:assert/strict) menolak menyamakan dua
// array beda realm walau isinya identik ("same structure but not
// reference-equal"). Helper ini menormalkan ke Array host biasa sebelum
// dibandingkan — bukan mengubah perilaku DashboardSettings, murni adaptasi
// harness test lintas-realm.
function toHostArray(arr) {
  return Array.from(arr);
}

function makeCtx({ D = {}, localStorageInitial = {}, askConfirmResult = true, fakeDocInitial = {}, queryGroups = {} } = {}) {
  const saveCalls = [];
  const toastCalls = [];
  const askConfirmCalls = [];
  const localStorageStub = makeLocalStorageStub(localStorageInitial);
  const fakeDocument = createFakeDocument(fakeDocInitial, queryGroups);
  const renderDashboardCalls = [];
  const ctx = loadSource(['modules/dashboard-hub/dashboard-hub-settings.js'], {
    D,
    save: (...args) => { saveCalls.push(args); },
    toast: (...args) => { toastCalls.push(args); },
    askConfirm: async (...args) => { askConfirmCalls.push(args); return askConfirmResult; },
    escapeHtml: (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    document: fakeDocument,
    localStorage: localStorageStub,
    DASH_CARD_BY_KEY: DASH_CARD_BY_KEY_STUB,
    DASH_RENDER_ORDER: DASH_RENDER_ORDER_STUB,
    renderDashboard: () => { renderDashboardCalls.push(1); },
  }, ['DashboardSettings']);
  return { ctx, D, saveCalls, toastCalls, askConfirmCalls, localStorageStub, fakeDocument, renderDashboardCalls };
}

// ---------------------------------------------------------------------------
// Compact Mode
// ---------------------------------------------------------------------------

test('isCompactMode() default false (localStorage belum pernah diset)', () => {
  const { ctx } = makeCtx();
  assert.equal(ctx.DashboardSettings.isCompactMode(), false);
});

test('toggleCompactMode(true) menyimpan ke localStorage & isCompactMode() jadi true', () => {
  const { ctx, localStorageStub, toastCalls } = makeCtx({ fakeDocInitial: { 'page-dashboard-hub': {} } });
  ctx.DashboardSettings.toggleCompactMode(true);
  assert.equal(localStorageStub.getItem('dashCompactMode'), '1');
  assert.equal(ctx.DashboardSettings.isCompactMode(), true);
  assert.equal(toastCalls.length, 1, 'harus kasih feedback toast');
});

test('toggleCompactMode(false) menyimpan "0" & isCompactMode() jadi false', () => {
  const { ctx, localStorageStub } = makeCtx({ localStorageInitial: { dashCompactMode: '1' }, fakeDocInitial: { 'page-dashboard-hub': {} } });
  ctx.DashboardSettings.toggleCompactMode(false);
  assert.equal(localStorageStub.getItem('dashCompactMode'), '0');
  assert.equal(ctx.DashboardSettings.isCompactMode(), false);
});

// ---------------------------------------------------------------------------
// Card Density
// ---------------------------------------------------------------------------

test('getDensity() default "normal" kalau belum pernah diset', () => {
  const { ctx } = makeCtx();
  assert.equal(ctx.DashboardSettings.getDensity(), 'normal');
});

test('getDensity() fallback "normal" kalau localStorage berisi value TIDAK VALID (mis. data korup)', () => {
  const { ctx } = makeCtx({ localStorageInitial: { dashCardDensity: 'ultra-mega-padat' } });
  assert.equal(ctx.DashboardSettings.getDensity(), 'normal');
});

test('setDensity("rapat") tersimpan & getDensity() mengembalikannya', () => {
  const { ctx, localStorageStub } = makeCtx({ fakeDocInitial: { 'page-dashboard-hub': {} } });
  ctx.DashboardSettings.setDensity('rapat');
  assert.equal(localStorageStub.getItem('dashCardDensity'), 'rapat');
  assert.equal(ctx.DashboardSettings.getDensity(), 'rapat');
});

test('setDensity() dgn value TIDAK VALID diabaikan (tidak menulis apa pun)', () => {
  const { ctx, localStorageStub } = makeCtx({ fakeDocInitial: { 'page-dashboard-hub': {} } });
  ctx.DashboardSettings.setDensity('super-padat-tidak-dikenal');
  assert.equal(localStorageStub.getItem('dashCardDensity'), null);
  assert.equal(ctx.DashboardSettings.getDensity(), 'normal');
});

// ---------------------------------------------------------------------------
// Default Landing Tab
// ---------------------------------------------------------------------------

test('getDefaultTab() default "ringkasan" kalau belum pernah diset', () => {
  const { ctx } = makeCtx();
  assert.equal(ctx.DashboardSettings.getDefaultTab(), 'ringkasan');
});

test('setDefaultTab("widget") tersimpan & getDefaultTab() mengembalikannya', () => {
  const { ctx, localStorageStub } = makeCtx();
  ctx.DashboardSettings.setDefaultTab('widget');
  assert.equal(localStorageStub.getItem('dashDefaultSectionTab'), 'widget');
  assert.equal(ctx.DashboardSettings.getDefaultTab(), 'widget');
});

test('setDefaultTab() dgn value TIDAK VALID diabaikan', () => {
  const { ctx, localStorageStub } = makeCtx();
  ctx.DashboardSettings.setDefaultTab('halaman-rahasia');
  assert.equal(localStorageStub.getItem('dashDefaultSectionTab'), null);
  assert.equal(ctx.DashboardSettings.getDefaultTab(), 'ringkasan');
});

// ---------------------------------------------------------------------------
// applyDashDisplayPrefs() — DOM class toggling
// ---------------------------------------------------------------------------

test('applyDashDisplayPrefs() tidak error kalau #page-dashboard-hub tidak ada di DOM (halaman lain)', () => {
  const { ctx } = makeCtx();
  assert.doesNotThrow(() => ctx.DashboardSettings.applyDashDisplayPrefs());
});

test('applyDashDisplayPrefs() menambah class dash-compact & dash-density-<value> ke #page-dashboard-hub', () => {
  const { ctx, fakeDocument } = makeCtx({ localStorageInitial: { dashCompactMode: '1', dashCardDensity: 'rapat' }, fakeDocInitial: { 'page-dashboard-hub': {} } });
  ctx.DashboardSettings.applyDashDisplayPrefs();
  const el = fakeDocument.getElementById('page-dashboard-hub');
  assert.equal(el.classList.contains('dash-compact'), true);
  assert.equal(el.classList.contains('dash-density-rapat'), true);
  assert.equal(el.classList.contains('dash-density-normal'), false);
  assert.equal(el.classList.contains('dash-density-nyaman'), false);
});

test('applyDashDisplayPrefs() dipanggil 2x dengan density berbeda tidak menumpuk class density lama', () => {
  const { ctx, fakeDocument, localStorageStub } = makeCtx({ fakeDocInitial: { 'page-dashboard-hub': {} } });
  localStorageStub.setItem('dashCardDensity', 'nyaman');
  ctx.DashboardSettings.applyDashDisplayPrefs();
  localStorageStub.setItem('dashCardDensity', 'rapat');
  ctx.DashboardSettings.applyDashDisplayPrefs();
  const el = fakeDocument.getElementById('page-dashboard-hub');
  assert.equal(el.classList.contains('dash-density-nyaman'), false);
  assert.equal(el.classList.contains('dash-density-rapat'), true);
});

// ---------------------------------------------------------------------------
// applyDashCardOrder() — urutan efektif
// ---------------------------------------------------------------------------

test('applyDashCardOrder() — D.dashCardOrder belum ada -> sama persis DASH_RENDER_ORDER (default, tidak berubah)', () => {
  const { ctx, D } = makeCtx({ D: {} });
  assert.deepEqual(toHostArray(ctx.DashboardSettings.applyDashCardOrder()), DASH_RENDER_ORDER_STUB);
  assert.equal(D.dashCardOrder, undefined, 'membaca urutan tidak boleh diam-diam menulis D');
});

test('applyDashCardOrder() — custom order VALID (semua key ada di registry) dipakai apa adanya', () => {
  const { ctx, D } = makeCtx({ D: { dashCardOrder: ['fi', 'bill', 'servisReminder'] } });
  assert.deepEqual(toHostArray(ctx.DashboardSettings.applyDashCardOrder()), ['fi', 'bill', 'servisReminder']);
});

test('applyDashCardOrder() — key SUDAH DIHAPUS dari registry (stale, mis. fitur dicabut sesi lain) otomatis gugur, TIDAK bikin error', () => {
  const { ctx } = makeCtx({ D: { dashCardOrder: ['fi', 'kartu-hantu-yang-sudah-dihapus', 'bill'] } });
  assert.deepEqual(toHostArray(ctx.DashboardSettings.applyDashCardOrder()), ['fi', 'bill', 'servisReminder']);
});

test('applyDashCardOrder() — key BARU yang belum masuk custom order (mis. kartu ditambah sesi lain) otomatis ditambahkan di akhir', () => {
  const { ctx } = makeCtx({ D: { dashCardOrder: ['fi'] } });
  assert.deepEqual(toHostArray(ctx.DashboardSettings.applyDashCardOrder()), ['fi', 'bill', 'servisReminder']);
});

test('applyDashCardOrder() — D.dashCardOrder bukan array (data korup) -> fallback ke default, tidak error', () => {
  const { ctx } = makeCtx({ D: { dashCardOrder: 'bukan-array' } });
  assert.deepEqual(toHostArray(ctx.DashboardSettings.applyDashCardOrder()), DASH_RENDER_ORDER_STUB);
});

// ---------------------------------------------------------------------------
// reorderCard()
// ---------------------------------------------------------------------------

test('reorderCard(key,"up") menukar posisi dgn tetangga sebelumnya & save() dipanggil', () => {
  const { ctx, D, saveCalls } = makeCtx({ D: { dashCardOrder: ['bill', 'servisReminder', 'fi'] } });
  ctx.DashboardSettings.reorderCard('servisReminder', 'up');
  assert.deepEqual(toHostArray(D.dashCardOrder), ['servisReminder', 'bill', 'fi']);
  assert.equal(saveCalls.length, 1);
});

test('reorderCard(key,"down") menukar posisi dgn tetangga berikutnya', () => {
  const { ctx, D } = makeCtx({ D: { dashCardOrder: ['bill', 'servisReminder', 'fi'] } });
  ctx.DashboardSettings.reorderCard('bill', 'down');
  assert.deepEqual(toHostArray(D.dashCardOrder), ['servisReminder', 'bill', 'fi']);
});

test('reorderCard(firstKey,"up") pada kartu PALING ATAS tidak melakukan apa pun (di luar batas)', () => {
  const { ctx, D, saveCalls } = makeCtx({ D: { dashCardOrder: ['bill', 'servisReminder', 'fi'] } });
  ctx.DashboardSettings.reorderCard('bill', 'up');
  assert.deepEqual(toHostArray(D.dashCardOrder), ['bill', 'servisReminder', 'fi']);
  assert.equal(saveCalls.length, 0, 'tidak boleh save() kalau tidak ada perubahan');
});

test('reorderCard(lastKey,"down") pada kartu PALING BAWAH tidak melakukan apa pun (di luar batas)', () => {
  const { ctx, D, saveCalls } = makeCtx({ D: { dashCardOrder: ['bill', 'servisReminder', 'fi'] } });
  ctx.DashboardSettings.reorderCard('fi', 'down');
  assert.deepEqual(toHostArray(D.dashCardOrder), ['bill', 'servisReminder', 'fi']);
  assert.equal(saveCalls.length, 0);
});

test('reorderCard() dgn key yang tidak dikenal tidak melakukan apa pun / tidak error', () => {
  const { ctx, D, saveCalls } = makeCtx({ D: { dashCardOrder: ['bill', 'servisReminder', 'fi'] } });
  assert.doesNotThrow(() => ctx.DashboardSettings.reorderCard('key-tidak-ada', 'up'));
  assert.deepEqual(toHostArray(D.dashCardOrder), ['bill', 'servisReminder', 'fi']);
  assert.equal(saveCalls.length, 0);
});

// ---------------------------------------------------------------------------
// renderDashCardOrderUI()
// ---------------------------------------------------------------------------

test('renderDashCardOrderUI() tidak error kalau elemen #dashCardOrderList tidak ada di DOM', () => {
  const { ctx } = makeCtx({ D: {} });
  assert.doesNotThrow(() => ctx.DashboardSettings.renderDashCardOrderUI());
});

test('renderDashCardOrderUI() mengisi innerHTML #dashCardOrderList sesuai urutan efektif, label ter-escape', () => {
  const { ctx, fakeDocument } = makeCtx({ D: { dashCardOrder: ['fi', 'bill', 'servisReminder'] }, fakeDocInitial: { dashCardOrderList: {} } });
  ctx.DashboardSettings.renderDashCardOrderUI();
  const html = fakeDocument.getElementById('dashCardOrderList').innerHTML;
  const idxFi = html.indexOf('Kebebasan Finansial');
  const idxBill = html.indexOf('Tagihan');
  const idxServis = html.indexOf('Servis Kendaraan');
  assert.ok(idxFi !== -1 && idxBill !== -1 && idxServis !== -1, 'ketiga label kartu harus muncul');
  assert.ok(idxFi < idxBill && idxBill < idxServis, 'urutan render harus ikut urutan efektif');
});

test('renderDashCardOrderUI() — tombol ▲ pada baris PERTAMA berstatus disabled, tombol ▼ pada baris TERAKHIR berstatus disabled', () => {
  const { ctx, fakeDocument } = makeCtx({ D: {}, fakeDocInitial: { dashCardOrderList: {} } });
  ctx.DashboardSettings.renderDashCardOrderUI();
  const html = fakeDocument.getElementById('dashCardOrderList').innerHTML;
  const rows = html.split('setting-item').filter((s) => s.includes('reorderCard'));
  assert.equal(rows.length, 3);
  // Tombol ▲ baris pertama (key 'bill') harus disabled; tombol ▼ baris
  // terakhir (key 'fi') harus disabled. `disabled` ditulis SEBELUM
  // `onclick` di template (lihat renderDashCardOrderUI()), jadi dicek
  // dalam <button ...> yang sama, bukan setelah onclick.
  assert.match(rows[0], /<button[^>]*disabled[^>]*reorderCard\('bill','up'\)/);
  assert.doesNotMatch(rows[0], /<button[^>]*disabled[^>]*reorderCard\('bill','down'\)/);
  assert.match(rows[2], /<button[^>]*disabled[^>]*reorderCard\('fi','down'\)/);
  assert.doesNotMatch(rows[2], /<button[^>]*disabled[^>]*reorderCard\('fi','up'\)/);
});

// ---------------------------------------------------------------------------
// resetDashboardLayout()
// ---------------------------------------------------------------------------

test('resetDashboardLayout() — user KONFIRMASI: menghapus D.dashCardOrder & 3 localStorage key, memanggil save() & renderDashboard()', async () => {
  const { ctx, D, saveCalls, localStorageStub, renderDashboardCalls, toastCalls } = makeCtx({
    D: { dashCardOrder: ['fi', 'bill', 'servisReminder'] },
    localStorageInitial: { dashCompactMode: '1', dashCardDensity: 'rapat', dashDefaultSectionTab: 'widget' },
    askConfirmResult: true,
    fakeDocInitial: { 'page-dashboard-hub': {}, 'page-dashboard': {}, dashCardOrderList: {} },
  });
  await ctx.DashboardSettings.resetDashboardLayout();
  assert.equal(D.dashCardOrder, undefined);
  assert.equal(saveCalls.length, 1);
  assert.equal(localStorageStub.getItem('dashCompactMode'), null);
  assert.equal(localStorageStub.getItem('dashCardDensity'), null);
  assert.equal(localStorageStub.getItem('dashDefaultSectionTab'), null);
  assert.equal(renderDashboardCalls.length, 1, 'harus re-render Beranda lama kalau sedang dibuka');
  assert.equal(toastCalls.length, 1);
});

test('resetDashboardLayout() — user BATAL konfirmasi: TIDAK ada yang berubah sama sekali', async () => {
  const { ctx, D, saveCalls, localStorageStub, renderDashboardCalls } = makeCtx({
    D: { dashCardOrder: ['fi', 'bill', 'servisReminder'] },
    localStorageInitial: { dashCompactMode: '1' },
    askConfirmResult: false,
  });
  await ctx.DashboardSettings.resetDashboardLayout();
  assert.deepEqual(toHostArray(D.dashCardOrder), ['fi', 'bill', 'servisReminder']);
  assert.equal(saveCalls.length, 0);
  assert.equal(localStorageStub.getItem('dashCompactMode'), '1');
  assert.equal(renderDashboardCalls.length, 0);
});

// ---------------------------------------------------------------------------
// renderSettingsUI()
// ---------------------------------------------------------------------------

test('renderSettingsUI() menyinkronkan checkbox/select ke nilai tersimpan & merender ulang urutan kartu', () => {
  const { ctx, fakeDocument } = makeCtx({
    D: { dashCardOrder: ['fi', 'bill', 'servisReminder'] },
    localStorageInitial: { dashCompactMode: '1', dashCardDensity: 'rapat', dashDefaultSectionTab: 'insight' },
    fakeDocInitial: {
      dashCompactModeToggle: { checked: false },
      dashCardDensitySelect: { value: '' },
      dashDefaultTabSelect: { value: '' },
      dashCardOrderList: {},
    },
  });
  ctx.DashboardSettings.renderSettingsUI();
  assert.equal(fakeDocument.getElementById('dashCompactModeToggle').checked, true);
  assert.equal(fakeDocument.getElementById('dashCardDensitySelect').value, 'rapat');
  assert.equal(fakeDocument.getElementById('dashDefaultTabSelect').value, 'insight');
  assert.ok(fakeDocument.getElementById('dashCardOrderList').innerHTML.includes('Kebebasan Finansial'));
});

test('renderSettingsUI() tidak error kalau semua elemen kontrol belum ada di DOM (halaman lain / belum dirender)', () => {
  const { ctx } = makeCtx({ D: {} });
  assert.doesNotThrow(() => ctx.DashboardSettings.renderSettingsUI());
});

// ---------------------------------------------------------------------------
// Integrasi wiring — pastikan renderDashboard()/renderSettings()/
// DashboardHub.js benar-benar MEMANGGIL DashboardSettings (bukan cuma modul
// baru yang berdiri sendiri tanpa terpakai).
// ---------------------------------------------------------------------------

test('modules-render.js: renderDashboard() memakai DashboardSettings.applyDashCardOrder() (guarded typeof) menggantikan pemakaian langsung DASH_RENDER_ORDER di loop kartu', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'modules/shared/modules-render.js'), 'utf8');
  assert.match(src, /DashboardSettings!==['"]undefined['"]&&typeof DashboardSettings\.applyDashCardOrder===['"]function['"]/);
  assert.match(src, /for\(const key of dashCardRenderOrder\)/);
});

test('modules-render.js: renderSettings() memanggil DashboardSettings.renderSettingsUI() (guarded typeof)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'modules/shared/modules-render.js'), 'utf8');
  assert.match(src, /typeof DashboardSettings!==['"]undefined['"]\)DashboardSettings\.renderSettingsUI\(\)/);
});

test('dashboard-hub.js: applySectionTab() default fallback memakai DashboardSettings.getDefaultTab() (guarded typeof), TIDAK menghapus fallback lama', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'modules/dashboard-hub/dashboard-hub.js'), 'utf8');
  assert.match(src, /DashboardSettings!==['"]undefined['"]&&typeof DashboardSettings\.getDefaultTab===['"]function['"]/);
  assert.match(src, /localStorage\.getItem\('dashHubSectionTab'\) \|\| dashDefaultTab/);
});

test('dashboard-hub.js: DashboardHub.render() memanggil DashboardSettings.applyDashDisplayPrefs() (guarded typeof)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'modules/dashboard-hub/dashboard-hub.js'), 'utf8');
  assert.match(src, /typeof DashboardSettings!==['"]undefined['"]\)DashboardSettings\.applyDashDisplayPrefs\(\)/);
});

test('tests/dashboard-hub-default-landing.test.js invariant TETAP UTUH: landing PAGE startup masih murni markup statis (S129 tidak menyentuh page-level landing)', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const activeMatches = [...html.matchAll(/<div class="page active" id="(page-[a-z0-9-]+)">/g)];
  assert.equal(activeMatches.length, 1);
  assert.equal(activeMatches[0][1], 'page-dashboard-hub');
});

// ---------------------------------------------------------------------------
// Markup — index.html & app_production.html
// ---------------------------------------------------------------------------

const HTML_FILES = ['index.html', 'app_production.html'];
const REQUIRED_IDS = [
  'cardDashboardSettings',
  'dashCompactModeToggle',
  'dashCardDensitySelect',
  'dashDefaultTabSelect',
  'dashCardOrderList',
];

for (const file of HTML_FILES) {
  test(`${file}: berisi UI "Pengaturan Dashboard" (semua id kontrol S129 ada)`, () => {
    const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert.match(html, /⚙️ Pengaturan Dashboard/);
    for (const id of REQUIRED_IDS) {
      assert.match(html, new RegExp(`id="${id}"`), `id="${id}" tidak ditemukan di ${file}`);
    }
  });
}

test('index.html & app_production.html tetap identik setelah S129', () => {
  const a = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const b = fs.readFileSync(path.join(__dirname, '..', 'app_production.html'), 'utf8');
  assert.equal(a, b);
});

// ---------------------------------------------------------------------------
// CSS — Compact Mode & Card Density
// ---------------------------------------------------------------------------

test('styles.css: berisi CSS Compact Mode & Card Density, DI-SCOPE ke #page-dashboard-hub', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
  assert.match(css, /#page-dashboard-hub\.dash-compact/);
  assert.match(css, /#page-dashboard-hub\.dash-density-rapat/);
  assert.match(css, /#page-dashboard-hub\.dash-density-nyaman/);
});

// ---------------------------------------------------------------------------
// build.js — file baru terdaftar di pipeline bundle
// ---------------------------------------------------------------------------

test('scripts/build.js: modules/dashboard-hub/dashboard-hub-settings.js terdaftar di GROUP_B, SETELAH modules-render.js (GROUP_A)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'scripts/build.js'), 'utf8');
  assert.match(src, /'modules\/dashboard-hub\/dashboard-hub-settings\.js'/);
});
