'use strict';
// tests/lifeos-projects-ui.test.js — LifeOSProjects (lifeos/ui/projects.js)
// + projectServiceCreate/AddChecklistItem/ToggleChecklistItem/SetStatus/Delete
// (lifeos/services/project-service.js). Ditambahkan Sesi 54 (Batch 3,
// kandidat #3) — hasil audit `docs/NEXT_SESSION.md`/`docs/PROJECT_STATE.md`
// § LifeOS "Projects — Ada, belum diaudit detail": kedua file ini sebelumnya
// 0 test sama sekali (dicek via grep, tidak ada `tests/*.test.js` yang
// me-`loadSource` salah satu dari keduanya) — pola gap yang sama persis
// dgn LifeOS Knowledge (Sesi 52) & Review (Sesi 53).
//
// Tidak ada bug ditemukan selama audit — sesi ini murni menambah test yang
// sebelumnya nol, TIDAK ada perubahan kode aplikasi. Fokus:
// (1) LifeOSProjects.render() murni konsumsi projectAdapterList(D, store)
//     (adapter registry-driven yang sudah tertes sendiri di
//     tests/lifeos-project-adapter.test.js) — TIDAK baca D/store langsung
//     selain lewat adapter; guard elemen tidak ada -> tidak throw;
// (2) LifeOSProjects.open(): cari project via projectAdapterFindOne(),
//     delegasi penuh ke lifeOSNavigateToSource(p.kind, sourceRef?.id) —
//     project tidak ketemu -> no-op (tidak throw, tidak panggil nav);
//     lifeOSNavigateToSource belum ter-load (guard typeof) -> tidak throw;
// (3) LifeOSProjects.createGeneric(): delegasi penuh ke
//     projectServiceCreate() lalu re-render (efek terlihat lewat
//     panggilan ulang render, bukan cek internal);
// (4) project-service.js — tiap fungsi murni terhadap store yang dioper
//     lifeOSGetStore() (di-stub) + memanggil lifeOSSave() (di-stub,
//     dicatat pemanggilannya) tepat 1x per operasi sukses, TIDAK dipanggil
//     kalau project/item tidak ketemu.
//
// Catatan audit (BUKAN bug, dicatat di NEXT_SESSION.md sbg hal yg perlu
// dicek): jalur open() -> lifeOSNavigateToSource() untuk sourceKind
// 'renovasi' SEBELUMNYA tidak ada test-nya di tests/lifeos-nav.test.js
// (hanya 'generic' & sourceKind lain yang dites) — gap ini ditutup di
// tests/lifeos-nav.test.js (bukan file ini), bukan diduplikasi ke sini.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeStoreHarness(initialProjects) {
  const store = { projects: initialProjects || [], reviewLog: [], knowledge: [] };
  const saveCalls = [];
  const lifeOSGetStore = () => store;
  const lifeOSSave = () => {
    saveCalls.push(1);
    return Promise.resolve();
  };
  return { store, saveCalls, lifeOSGetStore, lifeOSSave };
}

function load({ D = {}, fakeDocument, lifeOSGetStore, lifeOSSave, uidSeq, navCalls, includeNav = false } = {}) {
  let uidCounter = 0;
  const files = [
    'lifeos/lifeos-registry.js',
    'lifeos/adapters/project-adapter.js',
    'lifeos/services/project-service.js',
    'lifeos/ui/projects.js',
  ];
  const extra = {
    D,
    document: fakeDocument,
    escapeHtml: (s) => String(s),
    lifeOSGetStore,
    lifeOSSave,
    uid: () => (uidSeq ? uidSeq[uidCounter++] : `uid-${++uidCounter}`),
  };
  if (includeNav) {
    extra.lifeOSNavigateToSource = (...args) => navCalls.push(args);
  }
  return loadSource(files, extra, ['LifeOSProjects', 'projectServiceCreate', 'projectServiceAddChecklistItem', 'projectServiceToggleChecklistItem', 'projectServiceSetStatus', 'projectServiceDelete']);
}

// ---------- LifeOSProjects.render() ----------

test('LifeOSProjects.render(): tidak ada project sama sekali -> empty state', () => {
  const { lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const fakeDocument = createFakeDocument({ lifeOSProjectsGrid: {} });
  const ctx = load({ D: {}, fakeDocument, lifeOSGetStore, lifeOSSave });
  ctx.LifeOSProjects.render();
  const html = fakeDocument.getElementById('lifeOSProjectsGrid').innerHTML;
  assert.match(html, /Belum ada project/);
});

test('LifeOSProjects.render(): project generic & renovasi digabung apa adanya dari projectAdapterList(D, store) — label & jumlah checklist benar', () => {
  const D = {
    renovProjects: [{ id: 'r1', name: 'Renovasi Dapur', createdAt: '2026-01-01', items: [{ id: 'i1' }, { id: 'i2' }, { id: 'i3' }] }],
  };
  const { store, lifeOSGetStore, lifeOSSave } = makeStoreHarness([
    { id: 'g1', name: 'Belajar Investasi', areaKey: 'finance', status: 'active', dueDate: null, checklist: [{ id: 'c1', text: 'baca buku', done: false }], createdAt: '2026-02-01' },
  ]);
  const fakeDocument = createFakeDocument({ lifeOSProjectsGrid: {} });
  const ctx = load({ D, fakeDocument, lifeOSGetStore, lifeOSSave });
  ctx.LifeOSProjects.render();
  const html = fakeDocument.getElementById('lifeOSProjectsGrid').innerHTML;
  assert.match(html, /Renovasi Dapur/);
  assert.match(html, /🔧 Renovasi · 3 item/);
  assert.match(html, /Belajar Investasi/);
  assert.match(html, /📋 Project · 1 item/);
  assert.match(html, /data-action="LifeOSProjects\.open"/);
  assert.match(html, /data-args='\["renovasi:r1"\]'/);
  assert.match(html, /data-args='\["generic:g1"\]'/);
  assert.equal(store.projects.length, 1); // render() tidak menulis apa pun ke store
});

test('LifeOSProjects.render(): nama kosong (undefined) -> tidak throw, fallback string kosong lewat escapeHtml(p.name || \'\')', () => {
  const { lifeOSGetStore, lifeOSSave } = makeStoreHarness([
    { id: 'g1', name: undefined, areaKey: 'finance', status: 'active', dueDate: null, checklist: [], createdAt: '2026-02-01' },
  ]);
  const fakeDocument = createFakeDocument({ lifeOSProjectsGrid: {} });
  const ctx = load({ D: {}, fakeDocument, lifeOSGetStore, lifeOSSave });
  assert.doesNotThrow(() => ctx.LifeOSProjects.render());
});

test('LifeOSProjects.render(): #lifeOSProjectsGrid tidak ada di DOM -> tidak throw (guard awal)', () => {
  const fakeDocument = createFakeDocument({});
  fakeDocument.getElementById = () => null;
  const { lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const ctx = load({ D: {}, fakeDocument, lifeOSGetStore, lifeOSSave });
  assert.doesNotThrow(() => ctx.LifeOSProjects.render());
});

// ---------- LifeOSProjects.open() ----------

test('LifeOSProjects.open(): project ketemu (kind renovasi) -> delegasi ke lifeOSNavigateToSource(kind, sourceRef.id) apa adanya', () => {
  const D = { renovProjects: [{ id: 'r1', name: 'Renovasi Dapur', createdAt: '2026-01-01', items: [] }] };
  const { lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const fakeDocument = createFakeDocument({});
  const navCalls = [];
  const ctx = load({ D, fakeDocument, lifeOSGetStore, lifeOSSave, navCalls, includeNav: true });
  ctx.LifeOSProjects.open('renovasi:r1');
  assert.equal(navCalls.length, 1);
  assert.deepEqual(navCalls[0], ['renovasi', 'r1']);
});

test('LifeOSProjects.open(): project ketemu (kind generic) -> sourceRef null, lifeOSNavigateToSource dipanggil dgn sourceId null', () => {
  const { lifeOSGetStore, lifeOSSave } = makeStoreHarness([
    { id: 'g1', name: 'Belajar Investasi', areaKey: 'finance', status: 'active', dueDate: null, checklist: [], createdAt: '2026-02-01' },
  ]);
  const fakeDocument = createFakeDocument({});
  const navCalls = [];
  const ctx = load({ D: {}, fakeDocument, lifeOSGetStore, lifeOSSave, navCalls, includeNav: true });
  ctx.LifeOSProjects.open('generic:g1');
  assert.equal(navCalls.length, 1);
  assert.deepEqual(navCalls[0], ['generic', null]);
});

test('LifeOSProjects.open(): project TIDAK ketemu -> tidak throw, lifeOSNavigateToSource TIDAK dipanggil', () => {
  const { lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const fakeDocument = createFakeDocument({});
  const navCalls = [];
  const ctx = load({ D: {}, fakeDocument, lifeOSGetStore, lifeOSSave, navCalls, includeNav: true });
  assert.doesNotThrow(() => ctx.LifeOSProjects.open('generic:tidak-ada'));
  assert.equal(navCalls.length, 0);
});

test('LifeOSProjects.open(): lifeOSNavigateToSource belum ter-load (guard typeof) -> tidak throw', () => {
  const { lifeOSGetStore, lifeOSSave } = makeStoreHarness([
    { id: 'g1', name: 'X', areaKey: 'finance', status: 'active', dueDate: null, checklist: [], createdAt: '2026-02-01' },
  ]);
  const fakeDocument = createFakeDocument({});
  const ctx = load({ D: {}, fakeDocument, lifeOSGetStore, lifeOSSave, includeNav: false });
  assert.doesNotThrow(() => ctx.LifeOSProjects.open('generic:g1'));
});

// ---------- LifeOSProjects.createGeneric() ----------

test('LifeOSProjects.createGeneric(): delegasi ke projectServiceCreate() lalu re-render (project baru langsung tampil)', async () => {
  const { store, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const fakeDocument = createFakeDocument({ lifeOSProjectsGrid: {} });
  const ctx = load({ D: {}, fakeDocument, lifeOSGetStore, lifeOSSave, uidSeq: ['new-1'] });
  await ctx.LifeOSProjects.createGeneric('Nabung Umroh', 'finance');
  assert.equal(store.projects.length, 1);
  assert.equal(store.projects[0].id, 'new-1');
  assert.equal(store.projects[0].name, 'Nabung Umroh');
  const html = fakeDocument.getElementById('lifeOSProjectsGrid').innerHTML;
  assert.match(html, /Nabung Umroh/);
});

// ---------- project-service.js ----------

test('projectServiceCreate(): project baru tersimpan dgn field default lengkap (kind generic, status active, checklist/goalIds kosong)', async () => {
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const ctx = load({ lifeOSGetStore, lifeOSSave, uidSeq: ['p1'] });
  const project = await ctx.projectServiceCreate({ name: 'Renovasi Kamar', areaKey: 'home' });
  assert.equal(project.id, 'p1');
  assert.equal(project.name, 'Renovasi Kamar');
  assert.equal(project.areaKey, 'home');
  assert.equal(project.kind, 'generic');
  assert.equal(project.sourceRef, null);
  assert.equal(project.status, 'active');
  assert.equal(project.dueDate, null);
  assert.equal(project.checklist.length, 0);
  assert.equal(project.goalIds.length, 0);
  assert.equal(typeof project.createdAt, 'string');
  assert.equal(store.projects.length, 1);
  assert.equal(saveCalls.length, 1);
});

test('projectServiceCreate(): dueDate custom diterima apa adanya', async () => {
  const { lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const ctx = load({ lifeOSGetStore, lifeOSSave, uidSeq: ['p1'] });
  const project = await ctx.projectServiceCreate({ name: 'X', areaKey: 'finance', dueDate: '2026-12-31' });
  assert.equal(project.dueDate, '2026-12-31');
});

test('projectServiceAddChecklistItem(): item baru ditambahkan (done:false); projectId tidak ketemu -> null, TIDAK memanggil lifeOSSave()', async () => {
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([
    { id: 'p1', name: 'X', areaKey: 'finance', kind: 'generic', sourceRef: null, status: 'active', dueDate: null, checklist: [], goalIds: [], createdAt: '2026-01-01' },
  ]);
  const ctx = load({ lifeOSGetStore, lifeOSSave, uidSeq: ['item-1'] });

  const p = await ctx.projectServiceAddChecklistItem('p1', 'Beli cat');
  assert.equal(p.checklist.length, 1);
  assert.equal(p.checklist[0].id, 'item-1');
  assert.equal(p.checklist[0].text, 'Beli cat');
  assert.equal(p.checklist[0].done, false);
  assert.equal(saveCalls.length, 1);

  const missing = await ctx.projectServiceAddChecklistItem('tidak-ada', 'x');
  assert.equal(missing, null);
  assert.equal(saveCalls.length, 1); // tidak nambah
  assert.equal(store.projects[0].checklist.length, 1);
});

test('projectServiceToggleChecklistItem(): toggle done bolak-balik; projectId/itemId tidak ketemu -> null, TIDAK memanggil lifeOSSave()', async () => {
  const { saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([
    { id: 'p1', name: 'X', areaKey: 'finance', kind: 'generic', sourceRef: null, status: 'active', dueDate: null, checklist: [{ id: 'c1', text: 'Beli cat', done: false }], goalIds: [], createdAt: '2026-01-01' },
  ]);
  const ctx = load({ lifeOSGetStore, lifeOSSave });

  const toggled1 = await ctx.projectServiceToggleChecklistItem('p1', 'c1');
  assert.equal(toggled1.done, true);
  assert.equal(saveCalls.length, 1);

  const toggled2 = await ctx.projectServiceToggleChecklistItem('p1', 'c1');
  assert.equal(toggled2.done, false);
  assert.equal(saveCalls.length, 2);

  const missingProject = await ctx.projectServiceToggleChecklistItem('tidak-ada', 'c1');
  assert.equal(missingProject, null);
  const missingItem = await ctx.projectServiceToggleChecklistItem('p1', 'tidak-ada');
  assert.equal(missingItem, null);
  assert.equal(saveCalls.length, 2); // 2 percobaan gagal di atas tidak nambah
});

test('projectServiceSetStatus(): status diubah apa adanya (active/done/paused); projectId tidak ketemu -> null, TIDAK memanggil lifeOSSave()', async () => {
  const { saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([
    { id: 'p1', name: 'X', areaKey: 'finance', kind: 'generic', sourceRef: null, status: 'active', dueDate: null, checklist: [], goalIds: [], createdAt: '2026-01-01' },
  ]);
  const ctx = load({ lifeOSGetStore, lifeOSSave });

  const p = await ctx.projectServiceSetStatus('p1', 'done');
  assert.equal(p.status, 'done');
  assert.equal(saveCalls.length, 1);

  const missing = await ctx.projectServiceSetStatus('tidak-ada', 'paused');
  assert.equal(missing, null);
  assert.equal(saveCalls.length, 1);
});

test('projectServiceDelete(): project terhapus bersih dari array (filter by id), project lain tidak ikut terhapus; id tidak ketemu -> tidak throw, lifeOSSave() tetap dipanggil (tidak ada guard)', async () => {
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([
    { id: 'p1', name: 'A', areaKey: 'finance', kind: 'generic', sourceRef: null, status: 'active', dueDate: null, checklist: [], goalIds: [], createdAt: '2026-01-01' },
    { id: 'p2', name: 'B', areaKey: 'finance', kind: 'generic', sourceRef: null, status: 'active', dueDate: null, checklist: [], goalIds: [], createdAt: '2026-01-01' },
  ]);
  const ctx = load({ lifeOSGetStore, lifeOSSave });

  await ctx.projectServiceDelete('p1');
  assert.equal(store.projects.length, 1);
  assert.equal(store.projects[0].id, 'p2');
  assert.equal(saveCalls.length, 1);

  await ctx.projectServiceDelete('tidak-ada');
  assert.equal(store.projects.length, 1); // tidak berubah
  assert.equal(saveCalls.length, 2); // tapi lifeOSSave() tetap terpanggil (filter() selalu jalan, tidak ada guard "ketemu dulu")
});
