'use strict';
// tests/lifeos-nav.test.js — lifeOSNavigateToSource() (lifeos/lifeos-nav.js).
// Fokus: bagian pindah-halaman HARUS delegasi ke dashHubNavigateToFeature()
// (dashboard-hub.js) — bukan navBtns/navIndex lokal (dulu duplikat persis
// dgn logic showPage+PAGE_NAV_IDX di dashboard-hub.js) — sementara highlight
// kartu Setelan (_lifeOSHighlightSettingsCard, cardSelector) TETAP jalan
// seperti sebelumnya krn beda kebutuhan dari goTo generik dashHubNavigateToFeature.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/loadSource');
const { createFakeDocument } = require('../helpers/fakeDom');

function makeDoc(initial = {}, queryGroups = {}) {
  return createFakeDocument(initial, queryGroups);
}

function loadLifeOSNav(extraGlobals = {}) {
  const { document: docOverride, ...rest } = extraGlobals;
  const fakeDocument = docOverride || makeDoc();
  const calls = { showPage: [], dashHub: [], toast: [] };
  const ctx = loadSource(
    ['modules/dashboard-hub/dashboard-hub.js', 'lifeos/lifeos-nav.js'],
    {
      FEATURE_REGISTRY: undefined,
      showPage: (...args) => calls.showPage.push(args),
      toast: (...args) => calls.toast.push(args),
      setTimeout: (fn) => { fn(); return 0; },
      ...rest,
      document: fakeDocument,
    },
    ['lifeOSNavigateToSource', 'LIFEOS_NAV_MAP'],
  );
  // dashHubNavigateToFeature juga panggil showPage lewat sandbox yang sama,
  // tapi kita mau bedakan panggilan LANGSUNG dari lifeos-nav.js (fallback)
  // vs yang lewat dashHubNavigateToFeature — cukup pastikan showPage tetap
  // ke-record apa adanya, dan cek arg page-nya benar.
  return { ctx, fakeDocument, calls };
}

test('lifeos-nav.js + dashboard-hub.js tetap berhasil diload bareng tanpa error', () => {
  assert.doesNotThrow(() => loadLifeOSNav());
});

test('sourceKind "bills": showPage terpanggil dgn page "settings" (lewat dashHubNavigateToFeature, bukan navBtns/navIndex lokal)', () => {
  const fakeDocument = makeDoc({}, { '.nav-item': [] });
  const { ctx, calls } = loadLifeOSNav({ document: fakeDocument });
  ctx.lifeOSNavigateToSource('bills');
  assert.equal(calls.showPage.length, 1);
  assert.equal(calls.showPage[0][0], 'settings');
});

test('LIFEOS_NAV_MAP entri page-based TIDAK lagi punya field navIndex (dipindah ke PAGE_NAV_IDX via dashHubNavigateToFeature)', () => {
  const { ctx } = loadLifeOSNav();
  const expectedPage = {
    bills: 'settings', reminders: 'settings',
    selfcare: 'dashboard-hub', payroll: 'dashboard-hub',
    target: 'settings', eduFund: 'settings',
    fi: 'dashboard-hub',
  };
  for (const key of Object.keys(expectedPage)) {
    assert.equal(ctx.LIFEOS_NAV_MAP[key].navIndex, undefined, `${key} tidak boleh punya navIndex lagi`);
    assert.equal(ctx.LIFEOS_NAV_MAP[key].page, expectedPage[key]);
  }
});

test('sourceKind "reminders": kartu Setelan (#reminderList) tetap disorot + dibuka (stg-group & card-collapse) seperti sebelumnya', () => {
  const reminderList = { closest: () => card };
  const card = {
    classList: { contains: (c) => c === 'card-collapse', add() {}, remove() {}, toggle() {} },
    id: 'cardReminder',
    style: {},
    closest: (sel) => (sel === '.stg-group' ? grp : null),
    scrollIntoView: () => { scrolled = true; },
  };
  const grp = { id: 'grpToday', classList: { contains: () => false } };
  let scrolled = false;
  let toggledGroup = null;
  let toggledCard = null;

  const fakeDocument = {
    getElementById: () => null,
    querySelectorAll: () => [],
    querySelector: (sel) => (sel === '#reminderList' ? reminderList : null),
  };

  const { ctx } = loadLifeOSNav({
    document: fakeDocument,
    toggleStgGroup: (id) => { toggledGroup = id; },
    toggleSingleCardCollapse: (id) => { toggledCard = id; },
  });

  ctx.lifeOSNavigateToSource('reminders');
  assert.equal(toggledGroup, 'grpToday', 'stg-group yang collapsed harus dibuka');
  assert.equal(toggledCard, 'cardReminder', 'card-collapse yang collapsed harus dibuka');
  assert.equal(scrolled, true, 'kartu target harus di-scrollIntoView');
});

test('sourceKind "selfcare": showPage terpanggil dgn page "dashboard-hub" (lewat dashHubNavigateToFeature)', () => {
  const fakeDocument = makeDoc({}, { '.nav-item': [] });
  const { ctx, calls } = loadLifeOSNav({ document: fakeDocument });
  ctx.lifeOSNavigateToSource('selfcare');
  assert.equal(calls.showPage.length, 1);
  assert.equal(calls.showPage[0][0], 'dashboard-hub');
});

test('sourceKind "selfcare": kartu #refleksiCard tetap disorot + di-scroll (reuse _lifeOSHighlightSettingsCard generik, bukan mekanisme baru)', () => {
  const refleksiCard = { closest: () => card };
  const card = {
    classList: { contains: () => false, add() {}, remove() {}, toggle() {} },
    id: 'refleksiCard',
    style: {},
    closest: () => null, // bukan di dalam .stg-tabpanel/.stg-group (bukan halaman Setelan)
    scrollIntoView: () => { scrolled = true; },
  };
  let scrolled = false;

  const fakeDocument = {
    getElementById: () => null,
    querySelectorAll: () => [],
    querySelector: (sel) => (sel === '#refleksiCard' ? refleksiCard : null),
  };

  const { ctx } = loadLifeOSNav({ document: fakeDocument });
  ctx.lifeOSNavigateToSource('selfcare');
  assert.equal(scrolled, true, 'kartu refleksiCard harus di-scrollIntoView walau bukan di halaman Setelan');
});

test('sourceKind "payroll": showPage terpanggil dgn page "dashboard-hub", cardSelector #dashAbsensiCard', () => {
  const fakeDocument = makeDoc({}, { '.nav-item': [] });
  const { ctx, calls } = loadLifeOSNav({ document: fakeDocument });
  ctx.lifeOSNavigateToSource('payroll');
  assert.equal(calls.showPage.length, 1);
  assert.equal(calls.showPage[0][0], 'dashboard-hub');
  assert.equal(ctx.LIFEOS_NAV_MAP.payroll.cardSelector, '#dashAbsensiCard');
});

test('sourceKind "tukang" (openFn): TIDAK memanggil showPage sama sekali, langsung Tukang.openModal()', () => {
  let opened = false;
  const { ctx, calls } = loadLifeOSNav({ Tukang: { openModal: () => { opened = true; } } });
  ctx.lifeOSNavigateToSource('tukang');
  assert.equal(opened, true);
  assert.equal(calls.showPage.length, 0);
});

test('sourceKind "tukang": Tukang tidak tersedia (belum ter-load) -> tidak throw, tidak error', () => {
  const { ctx } = loadLifeOSNav();
  assert.doesNotThrow(() => ctx.lifeOSNavigateToSource('tukang'));
});

test('sourceKind "wishlist" (openFn): TIDAK memanggil showPage sama sekali, langsung WorthIt.open()', () => {
  let opened = false;
  const { ctx, calls } = loadLifeOSNav({ WorthIt: { open: () => { opened = true; } } });
  ctx.lifeOSNavigateToSource('wishlist');
  assert.equal(opened, true);
  assert.equal(calls.showPage.length, 0);
});

test('sourceKind "pensiun" (openFn): reuse goToList() apa adanya (targetId, page, navIdx null, keuTabName "asetproyek")', () => {
  const calls = { goToList: [] };
  const { ctx } = loadLifeOSNav({ goToList: (...args) => calls.goToList.push(args) });
  ctx.lifeOSNavigateToSource('pensiun');
  assert.equal(calls.goToList.length, 1);
  assert.deepEqual(calls.goToList[0], ['pensiunBody', 'keuangan', null, null, null, 'asetproyek']);
});

test('sourceKind "pensiun": goToList tidak tersedia (belum ter-load) -> tidak throw, tidak error', () => {
  const { ctx } = loadLifeOSNav();
  assert.doesNotThrow(() => ctx.lifeOSNavigateToSource('pensiun'));
});

test('sourceKind "debt" (openFn): reuse goToList() apa adanya (targetId, page, navIdx null, keuTabName "utangpiutang")', () => {
  const calls = { goToList: [] };
  const { ctx } = loadLifeOSNav({ goToList: (...args) => calls.goToList.push(args) });
  ctx.lifeOSNavigateToSource('debt');
  assert.equal(calls.goToList.length, 1);
  assert.deepEqual(calls.goToList[0], ['debtList', 'keuangan', null, null, null, 'utangpiutang']);
});

test('sourceKind "debt": goToList tidak tersedia (belum ter-load) -> tidak throw, tidak error', () => {
  const { ctx } = loadLifeOSNav();
  assert.doesNotThrow(() => ctx.lifeOSNavigateToSource('debt'));
});

test('sourceKind "fi": showPage terpanggil dgn page "dashboard-hub", cardSelector #dashFiCard', () => {
  const fakeDocument = makeDoc({}, { '.nav-item': [] });
  const { ctx, calls } = loadLifeOSNav({ document: fakeDocument });
  ctx.lifeOSNavigateToSource('fi');
  assert.equal(calls.showPage.length, 1);
  assert.equal(calls.showPage[0][0], 'dashboard-hub');
  assert.equal(ctx.LIFEOS_NAV_MAP.fi.cardSelector, '#dashFiCard');
});

test('sourceKind "renovasi" (openFn, Projects — lifeos/ui/projects.js LifeOSProjects.open()): TIDAK memanggil showPage sama sekali, langsung Renov.openDetail(sourceId)', () => {
  // Ditambahkan Sesi 54 (Batch 3, audit LifeOS Projects) — sebelumnya sourceKind
  // 'renovasi' TIDAK punya test di file ini sama sekali (gap dicatat di
  // docs/NEXT_SESSION.md), padahal ini satu-satunya sourceKind yang dipetakan
  // untuk jalur LifeOSProjects.open() -> lifeOSNavigateToSource().
  const opened = [];
  const { ctx, calls } = loadLifeOSNav({ Renov: { openDetail: (id) => opened.push(id) } });
  ctx.lifeOSNavigateToSource('renovasi', 'r1');
  assert.deepEqual(opened, ['r1']);
  assert.equal(calls.showPage.length, 0);
});

test('sourceKind "renovasi": Renov tidak tersedia (belum ter-load) -> tidak throw, tidak error', () => {
  const { ctx } = loadLifeOSNav();
  assert.doesNotThrow(() => ctx.lifeOSNavigateToSource('renovasi', 'r1'));
});

test('sourceKind "generic": tidak error, toast peringatan "belum ada halaman lama"', () => {
  const { ctx, calls } = loadLifeOSNav();
  assert.doesNotThrow(() => ctx.lifeOSNavigateToSource('generic'));
  assert.equal(calls.toast.length, 1);
});

test('sourceKind tidak dikenal: tidak error, toast peringatan ke pengembang', () => {
  const { ctx, calls } = loadLifeOSNav();
  assert.doesNotThrow(() => ctx.lifeOSNavigateToSource('tidak-ada-begini'));
  assert.equal(calls.toast.length, 1);
});

test('dashHubNavigateToFeature tidak tersedia (fallback): tetap showPage(conf.page) langsung, tidak throw', () => {
  const fakeDocument = makeDoc({}, { '.nav-item': [] });
  const calls = { showPage: [] };
  const ctx = loadSource(
    ['lifeos/lifeos-nav.js'], // dashboard-hub.js SENGAJA tidak di-load
    {
      showPage: (...args) => calls.showPage.push(args),
      setTimeout: (fn) => { fn(); return 0; },
      document: fakeDocument,
    },
    ['lifeOSNavigateToSource'],
  );
  assert.doesNotThrow(() => ctx.lifeOSNavigateToSource('bills'));
  assert.equal(calls.showPage.length, 1);
  assert.equal(calls.showPage[0][0], 'settings');
});
