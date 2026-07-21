'use strict';
// tests/lifeos-home-dashboard.test.js — LifeOSHome.render()/switchPanel()
// (lifeos/ui/lifeos-home.js). Fokus Sesi 39 "Executive Dashboard
// Integration" (target eksplisit user): satu pintu masuk yang mengonsumsi
// SEMUA 6 adapter LifeOS (area/today/goal/project/review/knowledge) —
// TIDAK membaca D/LifeOSStore langsung selain lewat adapter. Verifikasi:
// (1) kartu "Area Summary" (BARU) muncul di grid, angkanya dari
// areaAdapterList(D); (2) kartu Review sekarang data-driven lewat
// reviewAdapterIsOverdue() (bukan teks statis "Weekly/Monthly"); (3) kartu
// Today/Goals/Projects/Knowledge existing TETAP tampil dgn angka yang
// benar (backward compatible, 0 perubahan pola); (4) switchPanel()
// mencakup panel 'areas' yang baru.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

const ADAPTER_FILES = [
  'lifeos/lifeos-store.js',
  'lifeos/lifeos-registry.js',
  'lifeos/adapters/area-adapter.js',
  'lifeos/adapters/today-adapter.js',
  'lifeos/adapters/goal-adapter.js',
  'lifeos/adapters/project-adapter.js',
  'lifeos/adapters/review-adapter.js',
  'lifeos/adapters/knowledge-adapter.js',
  'lifeos/ui/lifeos-home.js',
];

function load(D, storeSeed, fakeDocument, localStorageSeed) {
  const store = { projects: [], reviewLog: [], knowledge: [], ...storeSeed };
  return loadSource(
    ADAPTER_FILES,
    {
      D,
      escapeHtml: (s) => String(s),
      document: fakeDocument,
      IDBStore: { get: async () => store, set: async () => {} },
      localStorage: {
        getItem: (k) => (localStorageSeed && localStorageSeed[k]) || null,
        setItem: () => {},
      },
    },
    ['LifeOSHome'],
  );
}

function makeFakeDocument() {
  return createFakeDocument({
    lifeOSWrap: { classList: [] },
    lifeOSHomeGrid: {},
    lifeOSPanel_today: {}, // tidak dipakai langsung (id pakai '-', lihat di bawah)
  });
}

test('LifeOSHome.render(): kartu "Area Summary" (BARU) muncul dgn angka dari areaAdapterList(D), bukan hardcode', async () => {
  const D = { transactions: [{ id: 1 }], vehicles: [{ id: 1 }, { id: 2 }] };
  const fakeDocument = makeFakeDocument();
  const ctx = load(D, {}, fakeDocument, { lifeOSVisible: '1' });
  await ctx.LifeOSHome.render();
  const html = fakeDocument.getElementById('lifeOSHomeGrid').innerHTML;
  assert.match(html, /Area Summary/);
  assert.match(html, /6 area/); // LIFEOS_AREAS punya 6 entri (finance/business/kendaraan/family/health/spiritual)
});

test('LifeOSHome.render(): kartu Review data-driven lewat reviewAdapterIsOverdue() — overdue -> teks "jatuh tempo", bukan "Weekly/Monthly" statis', async () => {
  const D = {};
  const fakeDocument = makeFakeDocument();
  // reviewLog kosong -> reviewAdapterIsOverdue() true utk weekly & monthly (belum pernah review)
  const ctx = load(D, { reviewLog: [] }, fakeDocument, { lifeOSVisible: '1' });
  await ctx.LifeOSHome.render();
  const html = fakeDocument.getElementById('lifeOSHomeGrid').innerHTML;
  assert.match(html, /2 jatuh tempo/);
  assert.doesNotMatch(html, /Weekly\/Monthly/);
});

test('LifeOSHome.render(): kartu Review -> "Up to date" kalau weekly & monthly baru saja direview', async () => {
  const D = {};
  const fakeDocument = makeFakeDocument();
  const now = new Date().toISOString();
  const ctx = load(D, { reviewLog: [{ period: 'weekly', completedAt: now }, { period: 'monthly', completedAt: now }] }, fakeDocument, { lifeOSVisible: '1' });
  await ctx.LifeOSHome.render();
  const html = fakeDocument.getElementById('lifeOSHomeGrid').innerHTML;
  assert.match(html, /Up to date/);
});

test('LifeOSHome.render(): kartu Today/Goals/Projects/Knowledge existing TETAP tampil dgn angka benar (backward compatible)', async () => {
  const D = { bills: [{ id: 1 }, { id: 2 }], targets: [{ id: 1 }] };
  const fakeDocument = makeFakeDocument();
  const ctx = load(D, { knowledge: [{ id: 'k1', createdAt: '2026-01-01' }] }, fakeDocument, { lifeOSVisible: '1' });
  await ctx.LifeOSHome.render();
  const html = fakeDocument.getElementById('lifeOSHomeGrid').innerHTML;
  assert.match(html, /Today/);
  assert.match(html, /Goals/);
  assert.match(html, /Projects/);
  assert.match(html, /Knowledge/);
  assert.match(html, /1 insight/);
});

test('LifeOSHome.render(): preferensi tersembunyi (lifeOSVisible != "1") -> grid TIDAK dihitung/diisi sama sekali', async () => {
  const D = {};
  const fakeDocument = makeFakeDocument();
  const ctx = load(D, {}, fakeDocument, {}); // localStorage kosong -> default tersembunyi
  await ctx.LifeOSHome.render();
  const html = fakeDocument.getElementById('lifeOSHomeGrid').innerHTML;
  assert.equal(html, '');
});

test("switchPanel(): daftar panel mencakup 'areas' yang baru, di samping today/goals/projects/review/knowledge", () => {
  const fakeDocument = makeFakeDocument();
  const panelEls = {};
  ['today', 'goals', 'projects', 'review', 'knowledge', 'areas'].forEach((p) => {
    panelEls['lifeOSPanel-' + p] = createFakeDocument({ ['lifeOSPanel-' + p]: {} }).getElementById('lifeOSPanel-' + p);
  });
  fakeDocument.getElementById = (id) => panelEls[id] || null;
  const ctx = load({}, {}, fakeDocument, {});
  ctx.LifeOSHome.switchPanel('areas');
  assert.equal(panelEls['lifeOSPanel-areas'].classList.contains('u-dnone'), false);
  assert.equal(panelEls['lifeOSPanel-today'].classList.contains('u-dnone'), true);
});
