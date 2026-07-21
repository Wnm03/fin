'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

// dashboard-hub-search-integration.test.js — Tahap 2 (Final) blueprint-dashboard-hub.md
// §5 Langkah 5. Test INTEGRASI RINGAN: menyambungkan dashboard-hub-registry.js +
// dashboard-hub.js + dashboard-hub-search.js dalam SATU sandbox (bukan fake registry
// kecil seperti tests/dashboard-hub-search.test.js) untuk memverifikasi jalur nyata
// input -> render -> klik hasil -> DashboardHub.open() -> showPage(), plus 2 guard
// regresi (Global Search & MODAL_HTML) sesuai permintaan sesi ini. Test UNIT murni
// utk masing2 fungsi TETAP di tests/dashboard-hub-search.test.js &
// tests/dashboard-hub.test.js — file ini tidak mengulanginya.

const ROOT = path.join(__dirname, '..');

function makeIntegration() {
  const fakeDocument = createFakeDocument();
  const navItems = Array.from({ length: 7 }, () => ({}));
  const calls = { showPage: [] };
  const ctx = loadSource(
    ['modules/dashboard-hub/dashboard-hub-registry.js', 'modules/dashboard-hub/dashboard-hub.js', 'modules/dashboard-hub/dashboard-hub-search.js'],
    {
      document: fakeDocument,
      escapeHtml: (s) => String(s === null || s === undefined ? '' : s),
      showPage: (...args) => calls.showPage.push(args),
      setKeuanganTab: () => {},
      setShopTab: () => {},
      setCnTab: () => {},
      setPajakTab: () => {},
      toggleStgGroup: () => {},
      setTimeout: (fn) => { fn(); return 0; }, // sinkron, sama pola dgn dashboard-hub.test.js
    },
    ['DashboardHub', 'DashboardHubSearch', 'FEATURE_REGISTRY']
  );
  fakeDocument.querySelectorAll = (sel) => (sel === '.nav-item' ? navItems : []);
  const originalGetById = fakeDocument.getElementById;
  fakeDocument.getElementById = (id) => {
    const el = originalGetById(id);
    if (typeof el.scrollIntoView !== 'function') el.scrollIntoView = () => {};
    return el;
  };
  return { ctx, fakeDocument, calls };
}

// ---------- input -> render menghasilkan hasil ----------

test('integrasi — input (DashboardHubSearch.render) menampilkan hasil nyata dari FEATURE_REGISTRY asli', () => {
  const { ctx, fakeDocument } = makeIntegration();

  ctx.DashboardHubSearch.render('sewa kios');

  const resultsEl = fakeDocument.getElementById('dashHubSearchResults');
  assert.equal(resultsEl.classList.contains('u-dnone'), false);
  assert.match(resultsEl.innerHTML, /Sewa Kios/);
  assert.match(resultsEl.innerHTML, /data-action="DashboardHubSearch\.select"/);
  assert.match(resultsEl.innerHTML, /shop-sewakios/);
});

// ---------- klik hasil -> DashboardHub.open() ----------

test('integrasi — klik hasil (data-action/data-args yang ke-render) memanggil DashboardHub.open() dgn key yang benar & jalan sampai showPage()', () => {
  const { ctx, fakeDocument, calls } = makeIntegration();

  ctx.DashboardHubSearch.render('sewa kios');
  const html = fakeDocument.getElementById('dashHubSearchResults').innerHTML;

  // Ambil featureKey persis dari data-args yang di-render (bukan ditebak manual)
  // supaya test ini benar2 memverifikasi APA YANG DIRENDER bisa diklik, bukan cuma
  // "select() bisa dipanggil manual".
  const m = html.match(/data-args='(\[[^']+\])'/);
  assert.ok(m, 'data-args tidak ditemukan di hasil render');
  const [featureKey] = JSON.parse(m[1]);
  assert.equal(featureKey, 'shop-sewakios');

  ctx.DashboardHubSearch.select(featureKey);

  // DashboardHub.open('shop-sewakios') -> target { page:'keuangan', tab:'kelola', goTo:'sewaKiosList' }
  // (dashboard-hub-registry.js) -> dashHubNavigateToFeature() -> showPage('keuangan', ...)
  assert.equal(calls.showPage.length, 1);
  assert.equal(calls.showPage[0][0], 'keuangan');

  // hasil pencarian ikut ditutup setelah navigasi (sesuai spesifikasi Langkah 3)
  const resultsEl = fakeDocument.getElementById('dashHubSearchResults');
  assert.equal(resultsEl.innerHTML, '');
  assert.equal(resultsEl.classList.contains('u-dnone'), true);
});

// ---------- Sesi 27 (TODO.md #6b, Tahap 2 Navigation wiring) ----------
// Registry entry dash-ai-rekomendasi/dash-ai-ringkasan-harian (Sesi 22) &
// dash-lifeos sudah ADA di FEATURE_REGISTRY & lolos test struktural generik
// (tests/dashboard-hub-registry.test.js), TAPI belum ada test yang
// memverifikasi jalur nyata search -> select -> DashboardHub.open() ->
// showPage() end-to-end utk ketiganya secara spesifik (beda dari cek
// struktural yang cuma validasi bentuk target, bukan perilaku navigasi
// beneran) — 3 test ini menutup gap itu, pola SAMA PERSIS dgn test
// "shop-sewakios" di atas, TIDAK ada mekanisme baru.

test('Sesi 27 — search "rekomendasi ai" -> select() -> DashboardHub.open("dash-ai-rekomendasi") -> showPage("dashboard-hub")', () => {
  const { ctx, fakeDocument, calls } = makeIntegration();

  ctx.DashboardHubSearch.render('rekomendasi ai');
  const html = fakeDocument.getElementById('dashHubSearchResults').innerHTML;
  const m = html.match(/data-args='(\[[^']+\])'/);
  assert.ok(m, 'data-args tidak ditemukan di hasil render "rekomendasi ai"');
  const [featureKey] = JSON.parse(m[1]);
  assert.equal(featureKey, 'dash-ai-rekomendasi');

  ctx.DashboardHubSearch.select(featureKey);

  assert.equal(calls.showPage.length, 1);
  assert.equal(calls.showPage[0][0], 'dashboard-hub');
});

test('Sesi 27 — search "ringkasan harian" -> select() -> DashboardHub.open("dash-ai-ringkasan-harian") -> showPage("dashboard-hub")', () => {
  const { ctx, fakeDocument, calls } = makeIntegration();

  ctx.DashboardHubSearch.render('ringkasan harian');
  const html = fakeDocument.getElementById('dashHubSearchResults').innerHTML;
  const m = html.match(/data-args='(\[[^']+\])'/);
  assert.ok(m, 'data-args tidak ditemukan di hasil render "ringkasan harian"');
  const [featureKey] = JSON.parse(m[1]);
  assert.equal(featureKey, 'dash-ai-ringkasan-harian');

  ctx.DashboardHubSearch.select(featureKey);

  assert.equal(calls.showPage.length, 1);
  assert.equal(calls.showPage[0][0], 'dashboard-hub');
});

test('Sesi 27 — search "life os" -> select() -> DashboardHub.open("dash-lifeos") -> showPage("dashboard-hub")', () => {
  const { ctx, fakeDocument, calls } = makeIntegration();

  ctx.DashboardHubSearch.render('life os');
  const html = fakeDocument.getElementById('dashHubSearchResults').innerHTML;
  const m = html.match(/data-args='(\[[^']+\])'/);
  assert.ok(m, 'data-args tidak ditemukan di hasil render "life os"');
  const [featureKey] = JSON.parse(m[1]);
  assert.equal(featureKey, 'dash-lifeos');

  ctx.DashboardHubSearch.select(featureKey);

  assert.equal(calls.showPage.length, 1);
  assert.equal(calls.showPage[0][0], 'dashboard-hub');
});

// ---------- empty state ----------

test('integrasi — query tidak cocok apa pun di FEATURE_REGISTRY asli => empty-state, tidak error', () => {
  const { ctx, fakeDocument } = makeIntegration();

  assert.doesNotThrow(() => ctx.DashboardHubSearch.render('zzz-tidak-ada-fitur-seperti-ini-zzz'));

  const html = fakeDocument.getElementById('dashHubSearchResults').innerHTML;
  assert.match(html, /Tidak ada fitur yang cocok/);
});

// ---------- Langkah 4 (ADR-001 §5): kategori ber-target ikut dicari ----------

test('Langkah 4 — kategori BER-target ("AI") muncul di hasil search dgn format identik hasil fitur (key/label/desc/catKey/catLabel/catIcon/target)', () => {
  const { ctx } = makeIntegration();

  // "kecerdasan" cuma ada di cat.desc kategori AI ("Kecerdasan buatan lintas
  // fitur"), tidak ada di label/desc fitur ai-chat/ai-kategorisasi/ai-scan-ocr
  // manapun — query ini SENGAJA dipilih supaya cuma cocok ke entry kategori,
  // bukan salah satu leaf-nya.
  const results = ctx.DashboardHubSearch.search('kecerdasan');

  assert.equal(results.length, 1, 'query ini seharusnya cuma cocok ke 1 entry: kategori AI itu sendiri');
  // Objek hasil datang dari sandbox vm (realm beda dari host) — dibandingkan
  // per-field, bukan assert.deepEqual (yang di mode strict = deepStrictEqual
  // dan gagal krn prototype Object/Array beda realm meski isinya sama; lihat
  // pola sama di tests/dashboard-hub.test.js utk PAGE_NAV_IDX).
  const r = results[0];
  assert.equal(r.key, 'ai');
  assert.equal(r.label, 'AI');
  assert.equal(r.desc, 'Kecerdasan buatan lintas fitur');
  assert.equal(r.catKey, 'ai');
  assert.equal(r.catLabel, 'AI');
  assert.equal(r.catIcon, '🤖');
  assert.deepEqual({ ...r.target }, { page: 'ai' });
});

test('Langkah 4 — select() atas hasil kategori memanggil DashboardHub.open(cat.key) & jalan sampai showPage() lewat target kategori (app-level open)', () => {
  const { ctx, fakeDocument, calls } = makeIntegration();

  ctx.DashboardHubSearch.render('kecerdasan');
  const html = fakeDocument.getElementById('dashHubSearchResults').innerHTML;
  const m = html.match(/data-args='(\[[^']+\])'/);
  assert.ok(m, 'data-args tidak ditemukan di hasil render kategori');
  const [key] = JSON.parse(m[1]);
  assert.equal(key, 'ai', 'data-args hasil kategori harus berisi cat.key, bukan salah satu f.key di dalamnya');

  ctx.DashboardHubSearch.select(key);

  // DashboardHub.open('ai') -> cat 'ai' ketemu di cat.key & punya target
  // {page:'ai'} (Langkah 2+3) -> app-level open -> showPage('ai', ...).
  assert.equal(calls.showPage.length, 1);
  assert.equal(calls.showPage[0][0], 'ai');

  // Perilaku select() lama (tutup hasil pencarian) tetap berlaku, tidak
  // diubah, sama utk hasil kategori maupun fitur.
  const resultsEl = fakeDocument.getElementById('dashHubSearchResults');
  assert.equal(resultsEl.innerHTML, '');
  assert.equal(resultsEl.classList.contains('u-dnone'), true);
});

test('Langkah 4 — kategori TANPA target ("Personal") TIDAK PERNAH muncul di hasil search, walau query cocok ke label/desc kategori itu', () => {
  const { ctx } = makeIntegration();

  // "non-finansial" cuma ada di cat.desc kategori Personal ("Fitur
  // non-finansial keluarga"), tidak ada di label/desc fitur per-* manapun —
  // kalau kategori tanpa target IKUT ke-search, query ini akan menghasilkan
  // >=1 match; yang benar HARUS 0 match sama sekali.
  const results = ctx.DashboardHubSearch.search('non-finansial');
  assert.equal(results.length, 0);
});

test('Langkah 4 — query yang cocok ke LABEL kategori tanpa target ("Personal") juga tidak memunculkan kategori itu (hanya fitur di dalamnya yang boleh cocok, kalau memang cocok)', () => {
  const { ctx } = makeIntegration();
  const results = ctx.DashboardHubSearch.search('personal');
  for (const r of results) {
    assert.notEqual(r.key, 'personal', 'kategori "personal" (tanpa target) tidak boleh muncul sbg entry hasil apa pun');
  }
});

test('guard — Global Search (openGlobalSearch) tidak tersentuh: id/elemen berbeda dari Feature Search, fungsi tetap ada persis 1x', () => {
  const src = fs.readFileSync(path.join(ROOT, 'global-search.js'), 'utf8');
  const defs = src.match(/function openGlobalSearch\(\)/g) || [];
  assert.equal(defs.length, 1, 'openGlobalSearch harus tetap terdefinisi persis 1x (tidak dihapus/diduplikasi)');
  // Global Search pakai id globalSearchInput/globalSearchResults, BUKAN
  // dashHubSearchInput/dashHubSearchResults milik Feature Search — dua search
  // ini harus tetap direpresentasikan sbg 2 entry berbeda (blueprint §2).
  assert.match(src, /globalSearchInput/);
  assert.match(src, /globalSearchResults/);
  assert.doesNotMatch(src, /dashHubSearchInput|dashHubSearchResults/);
});

test('guard — dashboard-hub-search.js sama sekali tidak mereferensikan globalSearchInput/globalSearchResults/openGlobalSearch', () => {
  const src = fs.readFileSync(path.join(ROOT, 'modules/dashboard-hub/dashboard-hub-search.js'), 'utf8');
  assert.doesNotMatch(src, /globalSearchInput|globalSearchResults|openGlobalSearch\(/);
});

// ---------- guard: tidak mengubah MODAL_HTML ----------

test('guard — MODAL_HTML[] di modals.js & document.write(MODAL_HTML[i]) di kedua HTML tetap sinkron pada baseline (73) — Feature Search tidak menambah modal baru', () => {
  const modalCtx = loadSource(['modules/shared/modals.js'], {}, ['MODAL_HTML']);
  assert.ok(Array.isArray(modalCtx.MODAL_HTML));
  const modalCount = modalCtx.MODAL_HTML.length;
  // NOTE (Sesi 124): baseline naik dari 71->72 krn billMultiScanModal (OCR Multi Item
  // Tagihan) ditambahkan sesi ini -- TIDAK terkait Feature Search, guard ini cuma perlu
  // disamakan ke jumlah modal terbaru yang sah.
  // NOTE (Sesi 125): baseline naik lagi 72->73 krn universalOcrModal (Scan Universal
  // Bank/E-Wallet/Bibit/Jago) ditambahkan sesi ini -- juga TIDAK terkait Feature Search.
  assert.equal(modalCount, 73, 'MODAL_HTML berubah jumlah — seharusnya Tahap 2 Feature Search tidak menambah modal baru sama sekali');

  for (const htmlFile of ['index.html', 'app_production.html']) {
    const htmlSrc = fs.readFileSync(path.join(ROOT, htmlFile), 'utf8');
    const writes = [...htmlSrc.matchAll(/document\.write\(MODAL_HTML\[(\d+)\]\)/g)];
    assert.equal(writes.length, modalCount, `${htmlFile}: jumlah document.write(MODAL_HTML[i]) berubah`);
  }
});

test('guard — markup Feature Search (dashHubSearchInput/dashHubSearchResults) TIDAK berada di dalam MODAL_HTML manapun, murni container biasa di halaman', () => {
  const modalCtx = loadSource(['modules/shared/modals.js'], {}, ['MODAL_HTML']);
  const joined = modalCtx.MODAL_HTML.join('\n');
  assert.doesNotMatch(joined, /dashHubSearchInput|dashHubSearchResults/);
});
