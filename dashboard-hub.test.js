'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadSource } = require('./helpers/loadSource');
const { createFakeElement } = require('./helpers/fakeDom');

// dashboard-hub.js baca/tulis DOM (getElementById/querySelectorAll) — bukan
// modul murni — jadi dites pakai document tiruan sendiri (pola sama dgn
// tests/bbm-renderlist.test.js), bukan pakai stub permisif default dari
// loadSource(). Test ini SENGAJA tidak menyentuh dashboard-hub-registry.js
// (FEATURE_REGISTRY asli) — dipakai FEATURE_REGISTRY tiruan kecil di sini
// supaya test tidak ikut berubah kalau taksonomi Tahap 0 direvisi nanti.

const SRC = fs.readFileSync(path.join(__dirname, '..', 'dashboard-hub.js'), 'utf8');

// document tiruan: getElementById auto-vivify (butuh utk id goTo/group yang
// muncul on-the-fly dari target registry), querySelectorAll dikontrol manual
// per selector (sama dgn kebutuhan dashHubNavigateToFeature).
function makeDashDocument(opts = {}) {
  const els = new Map();
  function ensure(id, init) {
    if (!els.has(id)) els.set(id, createFakeElement(init));
    return els.get(id);
  }
  const grid = ensure('dashboardHubGrid');
  const navItems = opts.navItems || Array.from({ length: 7 }, () => createFakeElement());
  const keuTabs = opts.keuTabs || Array.from({ length: 2 }, () => createFakeElement());
  const shopTabs = opts.shopTabs || Array.from({ length: 6 }, () => createFakeElement());
  const cnTabs = opts.cnTabs || Array.from({ length: 2 }, () => createFakeElement());
  const pajakTabs = opts.pajakTabs || Array.from({ length: 2 }, () => createFakeElement());
  const scrollCalls = [];
  return {
    scrollCalls,
    navItems, keuTabs, shopTabs, cnTabs, pajakTabs,
    getElementById: (id) => {
      if (id === 'dashboardHubGrid') return grid;
      return ensure(id, { scrollIntoView: () => scrollCalls.push(id) });
    },
    querySelectorAll: (sel) => {
      if (sel === '.nav-item') return navItems;
      if (sel === '#page-keuangan .cn-tab') return keuTabs;
      if (sel === '#page-shop .cn-tab') return shopTabs;
      if (sel === '#page-carnotes .cn-tab') return cnTabs;
      if (sel === '#page-pajak .cn-tab') return pajakTabs;
      return [];
    },
  };
}

// withConsoleWarnSpy — pasang spy sementara di console.warn (global host,
// yang SAMA dgn console yang dipakai kode di dalam sandbox vm, krn
// loadSource menaruh referensi `console` host langsung ke sandbox — lihat
// tests/helpers/loadSource.js), jalankan fn, lalu SELALU kembalikan
// console.warn asli di finally (aman walau fn melempar exception) — dipakai
// test resolusi kategori Langkah 3 (ADR-001 §4) di bawah.
function withConsoleWarnSpy(fn) {
  const calls = [];
  const original = console.warn;
  console.warn = (...args) => calls.push(args);
  try {
    fn();
  } finally {
    console.warn = original;
  }
  return calls;
}

function makeHub(FEATURE_REGISTRY, opts = {}) {
  const fakeDocument = makeDashDocument(opts);
  const calls = { showPage: [], setKeuanganTab: [], setShopTab: [], setCnTab: [], setPajakTab: [], toggleStgGroup: [] };
  const ctx = loadSource(['dashboard-hub.js'], {
    document: fakeDocument,
    FEATURE_REGISTRY,
    escapeHtml: (s) => String(s === null || s === undefined ? '' : s),
    showPage: (...args) => calls.showPage.push(args),
    setKeuanganTab: (...args) => calls.setKeuanganTab.push(args),
    setShopTab: (...args) => calls.setShopTab.push(args),
    setCnTab: (...args) => calls.setCnTab.push(args),
    setPajakTab: (...args) => calls.setPajakTab.push(args),
    toggleStgGroup: (...args) => calls.toggleStgGroup.push(args),
    // dijalankan SINKRON (bukan antri) supaya goTo/action bisa langsung
    // diverifikasi tanpa perlu event-loop nyata — pola sama dgn
    // tests/keamanan-pin.test.js.
    setTimeout: (fn) => { fn(); return 0; },
    window: opts.window || {},
  }, ['DashboardHub', 'PAGE_NAV_IDX']);
  return { DashboardHub: ctx.DashboardHub, PAGE_NAV_IDX: ctx.PAGE_NAV_IDX, fakeDocument, calls };
}

function registry(overrides) {
  return [
    {
      key: 'keuangan', label: 'Keuangan', icon: '💰', desc: 'desc',
      navIdx: 99, // SENGAJA salah/tidak valid, lihat test PAGE_NAV_IDX di bawah
      features: [
        { key: 'keu-transaksi', label: 'Transaksi', desc: 'Catat transaksi', target: { page: 'keuangan', tab: 'kelola', action: 'openTxModal' } },
      ],
    },
    {
      key: 'dashboard', label: 'Dashboard', icon: '🏠', desc: 'desc',
      target: { page: 'dashboard' }, // ADR-001 §5/Langkah 2: kategori dgn target
      navIdx: 0,
      features: [
        { key: 'dash-fi', label: 'FI', desc: 'Kebebasan Finansial', target: { page: 'dashboard', goTo: 'dashFiCard' } },
      ],
    },
    {
      key: 'personal', label: 'Personal', icon: '🌱', desc: 'desc',
      navIdx: 6,
      features: [
        { key: 'per-worthit', label: 'Worth It?', desc: 'Cek layak beli', target: { action: 'WorthIt.open' } },
        { key: 'per-edufund', label: 'Dana Pendidikan', desc: 'Target biaya sekolah', target: { page: 'settings', group: 'stgGroup2', goTo: 'eduFundList' } },
      ],
    },
    ...(overrides || []),
  ];
}

test('dashboard-hub.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeHub(registry()));
});

test('DashboardHub.render() tidak melempar exception & grid terisi dari FEATURE_REGISTRY', () => {
  const { DashboardHub, fakeDocument } = makeHub(registry());
  assert.doesNotThrow(() => DashboardHub.render());
  const html = fakeDocument.getElementById('dashboardHubGrid').innerHTML;
  assert.match(html, /Transaksi/);
  assert.match(html, /Catat transaksi/);
  assert.match(html, /dashHubCat-keuangan/);
  assert.match(html, /dashHubCat-dashboard/);
  assert.match(html, /Worth It\?/);
});

test('DashboardHub.render() — FEATURE_REGISTRY kosong => empty state, tidak error', () => {
  const { DashboardHub, fakeDocument } = makeHub([]);
  assert.doesNotThrow(() => DashboardHub.render());
  assert.match(fakeDocument.getElementById('dashboardHubGrid').innerHTML, /Belum ada data fitur/);
});

test('render() — data-action/data-args kartu fitur sesuai pola dispatcher global (data-action="DashboardHub.open")', () => {
  const { DashboardHub, fakeDocument } = makeHub(registry());
  DashboardHub.render();
  const html = fakeDocument.getElementById('dashboardHubGrid').innerHTML;
  assert.match(html, /data-action="DashboardHub\.open"/);
  assert.match(html, /data-args='\["keu-transaksi"\]'/);
});

// BUGFIX (aksesibilitas): bintang favorit (★) di tiap kartu fitur cuma
// berisi ikon, tanpa teks -- sebelumnya tidak punya aria-label sama sekali
// sehingga findMissingAriaLabels() (features-sheets-pwa-selftest.js) & tes
// navigasi halaman menandainya sbg pelanggaran ("screen reader tidak akan
// bisa menjelaskan fungsi tombol ini"). Fix: setiap elemen
// .dashhub-fav-star sekarang selalu punya aria-label yang menyebutkan nama
// fitur & status favoritnya.
test('render() — setiap bintang favorit (.dashhub-fav-star) punya aria-label (aksesibilitas screen reader)', () => {
  const { DashboardHub, fakeDocument } = makeHub(registry());
  DashboardHub.render();
  const html = fakeDocument.getElementById('dashboardHubGrid').innerHTML;
  const starDivs = html.match(/<div class="dashhub-fav-star[^>]*>/g) || [];
  assert.ok(starDivs.length > 0, 'harus ada setidaknya satu bintang favorit di grid fixture');
  for (const div of starDivs) {
    assert.match(div, /aria-label="[^"]+"/, 'setiap .dashhub-fav-star harus punya aria-label: ' + div);
  }
});


test('source dashboard-hub.js memakai PAGE_NAV_IDX, TIDAK memakai cat.navIdx utk resolve nav-item', () => {
  // "cat.navIdx" boleh muncul di KOMENTAR (menjelaskan kenapa itu tidak
  // dipakai) — yang tidak boleh adalah munculnya sbg KODE nyata, jadi baris
  // komentar dibuang dulu sebelum dicek.
  const codeOnly = SRC.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  assert.doesNotMatch(codeOnly, /navItems\[cat\.navIdx\]/, 'dashboard-hub.js tidak boleh pakai cat.navIdx sbg index nav-item (lihat keputusan Opsi 1)');
  assert.match(SRC, /const PAGE_NAV_IDX\s*=/, 'PAGE_NAV_IDX harus ada sbg lookup lokal');
  assert.match(SRC, /navItems\[PAGE_NAV_IDX\[target\.page\]\]/, 'showPage harus di-resolve lewat PAGE_NAV_IDX[target.page]');
});

test('PAGE_NAV_IDX — nilainya sesuai urutan 7 nav-item nyata di DOM (dashboard/keuangan/shop/ai/carnotes/pajak/settings)', () => {
  const { PAGE_NAV_IDX } = makeHub(registry());
  // PAGE_NAV_IDX datang dari sandbox vm (realm beda, prototype Object beda),
  // jadi disalin ke object polos di realm host dulu sebelum deepEqual.
  assert.deepEqual({ ...PAGE_NAV_IDX }, {
    dashboard: 0, keuangan: 1, shop: 2, ai: 3, carnotes: 4, pajak: 5, settings: 6,
  });
});

test('DashboardHub.open() — navigasi PAKAI PAGE_NAV_IDX[target.page], BUKAN cat.navIdx (perilaku, bukan cuma teks source)', () => {
  // Kategori 'keuangan' di fixture sengaja navIdx:99 (tidak valid/di luar
  // jangkauan array navItems). Kalau kode masih (salah) pakai cat.navIdx,
  // showPage akan dipanggil dgn navItems[99] === undefined. Yang benar:
  // navItems[PAGE_NAV_IDX.keuangan] === navItems[1].
  const { DashboardHub, fakeDocument, calls } = makeHub(registry());
  DashboardHub.open('keu-transaksi');
  assert.equal(calls.showPage.length, 1);
  const [pageArg, elArg] = calls.showPage[0];
  assert.equal(pageArg, 'keuangan');
  assert.equal(elArg, fakeDocument.navItems[1], 'harus navItems[PAGE_NAV_IDX.keuangan]=navItems[1], bukan navItems[cat.navIdx]=navItems[99]');
});

test('DashboardHub.open() — target {page, tab, action}: showPage + setKeuanganTab + action modal semua terpanggil dgn arg benar', () => {
  const openTxModal = [];
  const { DashboardHub, fakeDocument, calls } = makeHub(registry(), {
    window: { openTxModal: (...a) => openTxModal.push(a) },
  });
  DashboardHub.open('keu-transaksi');
  assert.equal(calls.showPage[0][0], 'keuangan');
  assert.equal(calls.setKeuanganTab.length, 1);
  assert.equal(calls.setKeuanganTab[0][0], 'kelola');
  assert.equal(calls.setKeuanganTab[0][1], fakeDocument.keuTabs[0]);
  assert.equal(openTxModal.length, 1);
});

test('DashboardHub.open() — target {page, goTo}: elemen goTo di-scrollIntoView', () => {
  const { DashboardHub, fakeDocument } = makeHub(registry());
  DashboardHub.open('dash-fi');
  assert.deepEqual(fakeDocument.scrollCalls, ['dashFiCard']);
});

test('DashboardHub.open() — target {action} (modal-only, tanpa page): TIDAK memanggil showPage, action namespaced terpanggil dgn `this` benar', () => {
  const open = [];
  const WorthIt = { open(...a) { open.push({ args: a, self: this }); } };
  const { DashboardHub, calls } = makeHub(registry(), { window: { WorthIt } });
  DashboardHub.open('per-worthit');
  assert.equal(calls.showPage.length, 0);
  assert.equal(open.length, 1);
  assert.equal(open[0].self, WorthIt, 'this harus WorthIt saat memanggil WorthIt.open()');
});

test('DashboardHub.open() — target {page:"settings", group, goTo}: toggleStgGroup terpanggil kalau grup belum "open"', () => {
  const { DashboardHub, fakeDocument, calls } = makeHub(registry());
  DashboardHub.open('per-edufund');
  assert.equal(calls.showPage[0][0], 'settings');
  assert.equal(calls.toggleStgGroup.length, 1);
  assert.equal(calls.toggleStgGroup[0][0], 'stgGroup2');
  assert.deepEqual(fakeDocument.scrollCalls, ['eduFundList']);
});

test('DashboardHub.open() — grup yang sudah class "open": toggleStgGroup TIDAK dipanggil lagi (hindari toggle ganda jadi tertutup)', () => {
  const { DashboardHub, fakeDocument, calls } = makeHub(registry(), {});
  // paksa elemen grup sudah "open" SEBELUM open() dipanggil
  fakeDocument.getElementById('stgGroup2').classList.add('open');
  DashboardHub.open('per-edufund');
  assert.equal(calls.toggleStgGroup.length, 0);
});

test('DashboardHub.open() — featureKey tidak ditemukan: tidak error, tidak memanggil showPage', () => {
  const { DashboardHub, calls } = makeHub(registry());
  assert.doesNotThrow(() => DashboardHub.open('key-tidak-ada'));
  assert.equal(calls.showPage.length, 0);
});

// ---------- Langkah 3 (ADR-001 §4): resolusi kategori di DashboardHub.open() ----------

test('DashboardHub.open() — category key DENGAN target ("dashboard"): app-level open, showPage terpanggil dgn target kategori (bukan target salah satu leaf-nya)', () => {
  const { DashboardHub, fakeDocument, calls } = makeHub(registry());
  DashboardHub.open('dashboard');
  assert.equal(calls.showPage.length, 1);
  const [pageArg, elArg] = calls.showPage[0];
  assert.equal(pageArg, 'dashboard');
  assert.equal(elArg, fakeDocument.navItems[0], 'harus navItems[PAGE_NAV_IDX.dashboard]=navItems[0]');
  // §4 poin 1: begitu cat.key ketemu & punya target, resolusi SELESAI di situ
  // — tidak boleh lanjut cari 'dashboard' lagi sbg f.key (lagipula invariant
  // uniqueness §2.1 menjamin tidak akan pernah ada f.key yang sama).
  assert.equal(calls.showPage.length, 1, 'tidak boleh showPage terpanggil dobel dari lanjut ke pencarian leaf');
});

test('DashboardHub.open() — category key TANPA target ("personal"): console.warn sesuai kontrak ADR-001 §4 poin 1, TIDAK showPage, TIDAK error', () => {
  const { DashboardHub, calls } = makeHub(registry());
  let warnCalls;
  assert.doesNotThrow(() => {
    warnCalls = withConsoleWarnSpy(() => DashboardHub.open('personal'));
  });
  assert.equal(calls.showPage.length, 0, 'kategori tanpa target tidak boleh memicu navigasi apa pun');
  assert.equal(warnCalls.length, 1);
  assert.match(warnCalls[0][0], /bukan target yang bisa dibuka langsung/, 'pesan warn kategori-tanpa-target harus beda dari pesan "key tidak ditemukan" (§4 poin 1)');
  assert.equal(warnCalls[0][1], 'personal');
});

test('DashboardHub.open() — key benar-benar tidak dikenal: console.warn "tidak ditemukan" (perilaku lama), PESANNYA BEDA dari kategori-tanpa-target', () => {
  const { DashboardHub, calls } = makeHub(registry());
  const warnCalls = withConsoleWarnSpy(() => DashboardHub.open('key-tidak-ada-sama-sekali'));
  assert.equal(calls.showPage.length, 0);
  assert.equal(warnCalls.length, 1);
  assert.match(warnCalls[0][0], /tidak ditemukan di FEATURE_REGISTRY/);
  assert.doesNotMatch(warnCalls[0][0], /bukan target yang bisa dibuka langsung/, 'key tak dikenal TIDAK BOLEH dipesankan sama dgn kategori-tanpa-target (§4 poin 1)');
  assert.equal(warnCalls[0][1], 'key-tidak-ada-sama-sekali');
});

test('DashboardHub.open() — backward compat: seluruh f.key yang sudah ada di fixture tetap resolve ke leaf-nya (bukan ketabrak resolusi cat.key baru)', () => {
  // Menjalankan ULANG semua skenario feature-key existing (transaksi modal,
  // goTo, action modal-only, settings-group) lewat DashboardHub.open() yang
  // BARU, memastikan Langkah 3 100% backward-compatible utk featureKey lama
  // — bukan cuma re-run test lama yang sama persis, tapi re-assert eksplisit
  // di sini supaya regresi kompatibilitas kelihatan lokal ke Langkah 3.
  const openTxModal = [];
  const WorthIt = { open(...a) { openTxModal.push(a); } };
  const { DashboardHub, fakeDocument, calls } = makeHub(registry(), {
    window: { openTxModal: (...a) => openTxModal.push(a), WorthIt },
  });

  DashboardHub.open('keu-transaksi');
  assert.equal(calls.showPage[0][0], 'keuangan');
  assert.equal(calls.setKeuanganTab.length, 1);

  DashboardHub.open('dash-fi');
  assert.deepEqual(fakeDocument.scrollCalls, ['dashFiCard']);

  DashboardHub.open('per-worthit');
  assert.equal(calls.showPage.length, 2, 'per-worthit modal-only tidak boleh memicu showPage tambahan');
});
