'use strict';
// tests/lifeos-life-objects-ui.test.js — LifeOSLifeObjects (lifeos/ui/
// life-objects.js). Sesi 61 (Fase 1) + Sesi 62 (Fase 2) + Sesi 63 (Update
// UI) — lihat docs/NEXT_SESSION.md & docs/PRODUCT_DECISIONS.md §
// "LifeOS — Life Object UI (FINAL — Sesi 59)". Scope Fase 1: render/list/
// empty state, create kind:"generic", archive/delete, jump-to-source
// Option (C). Scope Fase 2: create kind:"ref" 2-modal showChoiceModal()
// (domain lalu id). Scope Update UI: edit nama/areaKey (sourceRef/kind
// TIDAK diedit).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/loadSource');
const { createFakeDocument } = require('../helpers/fakeDom');

function makeStoreHarness(initialObjects) {
  const store = { projects: [], reviewLog: [], knowledge: [], objects: initialObjects || [] };
  const saveCalls = [];
  const lifeOSGetStore = () => store;
  const lifeOSSave = () => {
    saveCalls.push(1);
    return Promise.resolve();
  };
  return { store, saveCalls, lifeOSGetStore, lifeOSSave };
}

function load({
  D = {}, fakeDocument, store, lifeOSGetStore, lifeOSSave, uidSeq,
  toast, showAlertModal, showPromptModal, showChoiceModal, askConfirm,
  lifeOSNavigateToSource, LifeOSHome, editTx, fmtFull, openAccModal, openCatModal,
} = {}) {
  let uidCounter = 0;
  return loadSource(
    [
      'lifeos/lifeos-registry.js',
      'lifeos/adapters/goal-adapter.js',
      'lifeos/adapters/project-adapter.js',
      'lifeos/adapters/knowledge-adapter.js',
      'lifeos/lifeos-object-ref.js',
      'lifeos/services/life-object-service.js',
      'lifeos/ui/life-objects.js',
    ],
    {
      D,
      document: fakeDocument,
      escapeHtml: (s) => String(s),
      lifeOSGetStore,
      lifeOSSave,
      uid: () => (uidSeq ? uidSeq[uidCounter++] : `uid-${++uidCounter}`),
      toast: toast || (() => {}),
      showAlertModal,
      showPromptModal,
      showChoiceModal,
      askConfirm,
      lifeOSNavigateToSource,
      LifeOSHome,
      editTx,
      fmtFull,
      openAccModal,
      openCatModal,
    },
    ['LifeOSLifeObjects', 'lifeObjectServiceCreate', 'lifeObjectServiceUpdate', 'lifeObjectServiceDelete', 'lifeObjectServiceGet', 'lifeObjectServiceList'],
  );
}

test('LifeOSLifeObjects.render(): kosong -> empty state, tidak throw', () => {
  const { store, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const ctx = load({ fakeDocument, store, lifeOSGetStore, lifeOSSave });
  assert.doesNotThrow(() => ctx.LifeOSLifeObjects.render());
  const html = fakeDocument.getElementById('lifeOSLifeObjectsGrid').innerHTML;
  assert.match(html, /Belum ada Life Object/);
});

test('LifeOSLifeObjects.render(): menampilkan seluruh object apa adanya (generic & ref)', () => {
  const { store, lifeOSGetStore, lifeOSSave } = makeStoreHarness([
    { id: 'o1', name: 'Rencana Umroh', areaKey: 'spiritual', kind: 'generic', sourceRef: null },
    { id: 'o2', name: 'Goal Terkait', areaKey: 'finance', kind: 'ref', sourceRef: { domain: 'goal', id: 'g1' } },
  ]);
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const ctx = load({ fakeDocument, store, lifeOSGetStore, lifeOSSave });
  ctx.LifeOSLifeObjects.render();
  const html = fakeDocument.getElementById('lifeOSLifeObjectsGrid').innerHTML;
  assert.match(html, /Rencana Umroh/);
  assert.match(html, /Goal Terkait/);
});

test('LifeOSLifeObjects.render(): elemen tidak ada di DOM -> tidak throw (guard awal)', () => {
  const fakeDocument = createFakeDocument({});
  fakeDocument.getElementById = () => null;
  const { store, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const ctx = load({ fakeDocument, store, lifeOSGetStore, lifeOSSave });
  assert.doesNotThrow(() => ctx.LifeOSLifeObjects.render());
});

test('LifeOSLifeObjects.createGeneric(): valid -> lifeObjectServiceCreate() lalu render() + LifeOSHome.render()', async () => {
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  let homeRenderCalls = 0;
  const LifeOSHome = { render() { homeRenderCalls++; } };
  const ctx = load({ fakeDocument, store, lifeOSGetStore, lifeOSSave, uidSeq: ['new-1'], LifeOSHome });
  const result = await ctx.LifeOSLifeObjects.createGeneric('Rencana Umroh', 'spiritual');
  assert.equal(result.valid, true);
  assert.equal(store.objects.length, 1);
  assert.equal(store.objects[0].kind, 'generic');
  assert.equal(store.objects[0].sourceRef, null);
  assert.equal(saveCalls.length, 1);
  assert.equal(homeRenderCalls, 1);
  const html = fakeDocument.getElementById('lifeOSLifeObjectsGrid').innerHTML;
  assert.match(html, /Rencana Umroh/);
});

test('LifeOSLifeObjects.createGeneric(): gagal validasi (field wajib kosong) -> TIDAK menulis ke store, toast error, render tetap empty state', async () => {
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const toastCalls = [];
  const ctx = load({ fakeDocument, store, lifeOSGetStore, lifeOSSave, toast: (m) => toastCalls.push(m) });
  const result = await ctx.LifeOSLifeObjects.createGeneric('', 'spiritual');
  assert.equal(result.valid, false);
  assert.equal(store.objects.length, 0);
  assert.equal(saveCalls.length, 0);
  assert.equal(toastCalls.length, 1);
});

test('LifeOSLifeObjects.remove(): askConfirm() true -> lifeObjectServiceDelete() lalu render() + LifeOSHome.render()', async () => {
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([
    { id: 'o1', name: 'Satu', areaKey: 'finance', kind: 'generic', sourceRef: null },
  ]);
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  let homeRenderCalls = 0;
  const LifeOSHome = { render() { homeRenderCalls++; } };
  const ctx = load({
    fakeDocument, store, lifeOSGetStore, lifeOSSave, LifeOSHome,
    askConfirm: async () => true,
  });
  await ctx.LifeOSLifeObjects.remove('o1');
  assert.equal(store.objects.length, 0);
  assert.equal(saveCalls.length, 1);
  assert.equal(homeRenderCalls, 1);
});

test('LifeOSLifeObjects.remove(): askConfirm() false -> TIDAK memanggil lifeObjectServiceDelete()/lifeOSSave()', async () => {
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([
    { id: 'o1', name: 'Satu', areaKey: 'finance', kind: 'generic', sourceRef: null },
  ]);
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const ctx = load({ fakeDocument, store, lifeOSGetStore, lifeOSSave, askConfirm: async () => false });
  await ctx.LifeOSLifeObjects.remove('o1');
  assert.equal(store.objects.length, 1);
  assert.equal(saveCalls.length, 0);
});

test('LifeOSLifeObjects.open(): kind generic -> toast, tidak memanggil navigasi apa pun', () => {
  const { store, lifeOSGetStore, lifeOSSave } = makeStoreHarness([
    { id: 'o1', name: 'Satu', areaKey: 'finance', kind: 'generic', sourceRef: null },
  ]);
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const toastCalls = [];
  const ctx = load({ fakeDocument, store, lifeOSGetStore, lifeOSSave, toast: (m) => toastCalls.push(m) });
  ctx.LifeOSLifeObjects.open('o1');
  assert.equal(toastCalls.length, 1);
});

test('LifeOSLifeObjects.open(): kind ref domain "goal" -> resolve via LIFEOS_OBJECT_REF_SOURCES lalu reuse lifeOSNavigateToSource() apa adanya', () => {
  const D = { targets: [] };
  const store = { projects: [], reviewLog: [], knowledge: [], objects: [
    { id: 'o1', name: 'Goal Terkait', areaKey: 'finance', kind: 'ref', sourceRef: { domain: 'goal', id: 'g1' } },
  ] };
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const navCalls = [];
  // Stub goalAdapterList supaya LIFEOS_OBJECT_REF_SOURCES.goal.resolver() ketemu.
  const goalAdapterList = () => [{ id: 'g1', sourceKind: 'target', sourceId: 't1' }];
  const ctx = loadSource(
    [
      'lifeos/lifeos-registry.js',
      'lifeos/lifeos-object-ref.js',
      'lifeos/services/life-object-service.js',
      'lifeos/ui/life-objects.js',
    ],
    {
      D,
      document: fakeDocument,
      escapeHtml: (s) => String(s),
      lifeOSGetStore: () => store,
      lifeOSSave: () => Promise.resolve(),
      uid: () => 'uid-x',
      toast: () => {},
      goalAdapterList,
      lifeOSNavigateToSource: (sourceKind, sourceId) => navCalls.push([sourceKind, sourceId]),
    },
    ['LifeOSLifeObjects'],
  );
  ctx.LifeOSLifeObjects.open('o1');
  assert.deepEqual(navCalls, [['target', 't1']]);
});

test('LifeOSLifeObjects.open(): kind ref domain "knowledge" -> mapping lokal, showAlertModal() dgn title/content knowledge entry', () => {
  const store = {
    projects: [], reviewLog: [], knowledge: [{ id: 'k1', title: 'Insight X', content: 'Isi lengkap', tags: [] }],
    objects: [{ id: 'o1', name: 'Ref Knowledge', areaKey: 'finance', kind: 'ref', sourceRef: { domain: 'knowledge', id: 'k1' } }],
  };
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const alertCalls = [];
  const ctx = load({
    fakeDocument, store, lifeOSGetStore: () => store, lifeOSSave: () => Promise.resolve(),
    showAlertModal: (msg, opts) => alertCalls.push([msg, opts]),
  });
  ctx.LifeOSLifeObjects.open('o1');
  assert.equal(alertCalls.length, 1);
  assert.equal(alertCalls[0][0], 'Isi lengkap');
  assert.equal(alertCalls[0][1].title, 'Insight X');
});

test('LifeOSLifeObjects.open(): sourceRef "busuk" (domain/id tidak ketemu) -> toast "Referensi tidak ditemukan", tidak throw', () => {
  const store = {
    projects: [], reviewLog: [], knowledge: [],
    objects: [{ id: 'o1', name: 'Ref Rusak', areaKey: 'finance', kind: 'ref', sourceRef: { domain: 'knowledge', id: 'tidak-ada' } }],
  };
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const toastCalls = [];
  const ctx = load({ fakeDocument, store, lifeOSGetStore: () => store, lifeOSSave: () => Promise.resolve(), toast: (m) => toastCalls.push(m) });
  assert.doesNotThrow(() => ctx.LifeOSLifeObjects.open('o1'));
  assert.equal(toastCalls.length, 1);
  assert.match(toastCalls[0], /tidak ditemukan/);
});

// ---- Domain "finance" (Sesi 71, Batch 6 — Finance Domain Foundation) ----

test('LifeOSLifeObjects.open(): kind ref domain "finance" -> mapping lokal, reuse editTx() apa adanya (BUKAN showAlertModal)', () => {
  const D = { transactions: [{ id: 'tx1', type: 'expense', category: 'Makan', amount: 25000, date: '2026-07-19' }] };
  const store = {
    projects: [], reviewLog: [], knowledge: [],
    objects: [{ id: 'o1', name: 'Ref Transaksi', areaKey: 'finance', kind: 'ref', sourceRef: { domain: 'finance', id: 'tx1' } }],
  };
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const editTxCalls = [];
  const alertCalls = [];
  const ctx = load({
    D, fakeDocument, store, lifeOSGetStore: () => store, lifeOSSave: () => Promise.resolve(),
    editTx: (id) => editTxCalls.push(id),
    showAlertModal: (msg, opts) => alertCalls.push([msg, opts]),
  });
  ctx.LifeOSLifeObjects.open('o1');
  assert.deepEqual(editTxCalls, ['tx1']);
  assert.equal(alertCalls.length, 0);
});

test('LifeOSLifeObjects.open(): domain "finance" sourceRef busuk (id tidak ketemu) -> toast, editTx TIDAK dipanggil', () => {
  const D = { transactions: [] };
  const store = {
    projects: [], reviewLog: [], knowledge: [],
    objects: [{ id: 'o1', name: 'Ref Rusak', areaKey: 'finance', kind: 'ref', sourceRef: { domain: 'finance', id: 'tx-tidak-ada' } }],
  };
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const editTxCalls = [];
  const toastCalls = [];
  const ctx = load({
    D, fakeDocument, store, lifeOSGetStore: () => store, lifeOSSave: () => Promise.resolve(),
    editTx: (id) => editTxCalls.push(id),
    toast: (m) => toastCalls.push(m),
  });
  assert.doesNotThrow(() => ctx.LifeOSLifeObjects.open('o1'));
  assert.equal(editTxCalls.length, 0);
  assert.match(toastCalls[0], /tidak ditemukan/);
});

test('LifeOSLifeObjects._refSourceItems(): domain "finance" -> REUSE D.transactions apa adanya, {id,label} dari category+amount+date', () => {
  const D = { transactions: [{ id: 'tx1', category: 'Makan', subcategory: 'Restoran', amount: 25000, date: '2026-07-19' }] };
  const store = { projects: [], reviewLog: [], knowledge: [], objects: [] };
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const ctx = load({
    D, fakeDocument, store, lifeOSGetStore: () => store, lifeOSSave: () => Promise.resolve(),
    fmtFull: (n) => 'Rp ' + n,
  });
  const items = ctx.LifeOSLifeObjects._refSourceItems('finance');
  assert.equal(items.length, 1);
  assert.equal(items[0].id, 'tx1');
  assert.match(items[0].label, /Makan/);
  assert.match(items[0].label, /Restoran/);
  assert.match(items[0].label, /Rp 25000/);
  assert.match(items[0].label, /2026-07-19/);
});

test('LifeOSLifeObjects._refSourceItems(): domain "finance" tanpa D.transactions -> [] (aman, tidak throw)', () => {
  const store = { projects: [], reviewLog: [], knowledge: [], objects: [] };
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const ctx = load({ fakeDocument, store, lifeOSGetStore: () => store, lifeOSSave: () => Promise.resolve() });
  assert.doesNotThrow(() => ctx.LifeOSLifeObjects._refSourceItems('finance'));
  assert.equal(ctx.LifeOSLifeObjects._refSourceItems('finance').length, 0);
});

// ---- Domain "financeAccount"/"financeCategory" (Sesi 73, Batch 6 —
// Finance Account & Finance Category Foundation) ----

test('LifeOSLifeObjects.open(): kind ref domain "financeAccount" -> mapping lokal, reuse openAccModal(idx) apa adanya (BUKAN showAlertModal)', () => {
  const D = { accounts: [{ id: 'acc_cash', name: 'Cash', emoji: '💵', balance: 0 }, { id: 'acc_bri', name: 'BRI', emoji: '🏦', balance: 0 }] };
  const store = {
    projects: [], reviewLog: [], knowledge: [],
    objects: [{ id: 'o1', name: 'Ref Akun', areaKey: 'finance', kind: 'ref', sourceRef: { domain: 'financeAccount', id: 'acc_bri' } }],
  };
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const openAccModalCalls = [];
  const alertCalls = [];
  const ctx = load({
    D, fakeDocument, store, lifeOSGetStore: () => store, lifeOSSave: () => Promise.resolve(),
    openAccModal: (idx) => openAccModalCalls.push(idx),
    showAlertModal: (msg, opts) => alertCalls.push([msg, opts]),
  });
  ctx.LifeOSLifeObjects.open('o1');
  assert.deepEqual(openAccModalCalls, [1]);
  assert.equal(alertCalls.length, 0);
});

test('LifeOSLifeObjects.open(): domain "financeAccount" sourceRef busuk (id tidak ketemu) -> toast, openAccModal TIDAK dipanggil', () => {
  const D = { accounts: [] };
  const store = {
    projects: [], reviewLog: [], knowledge: [],
    objects: [{ id: 'o1', name: 'Ref Rusak', areaKey: 'finance', kind: 'ref', sourceRef: { domain: 'financeAccount', id: 'acc-tidak-ada' } }],
  };
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const openAccModalCalls = [];
  const toastCalls = [];
  const ctx = load({
    D, fakeDocument, store, lifeOSGetStore: () => store, lifeOSSave: () => Promise.resolve(),
    openAccModal: (idx) => openAccModalCalls.push(idx),
    toast: (m) => toastCalls.push(m),
  });
  assert.doesNotThrow(() => ctx.LifeOSLifeObjects.open('o1'));
  assert.equal(openAccModalCalls.length, 0);
  assert.match(toastCalls[0], /tidak ditemukan/);
});

test('LifeOSLifeObjects._refSourceItems(): domain "financeAccount" -> REUSE D.accounts apa adanya, {id,label} dari emoji+name', () => {
  const D = { accounts: [{ id: 'acc_cash', name: 'Cash', emoji: '💵', balance: 0 }] };
  const store = { projects: [], reviewLog: [], knowledge: [], objects: [] };
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const ctx = load({ D, fakeDocument, store, lifeOSGetStore: () => store, lifeOSSave: () => Promise.resolve() });
  const items = ctx.LifeOSLifeObjects._refSourceItems('financeAccount');
  assert.equal(items.length, 1);
  assert.equal(items[0].id, 'acc_cash');
  assert.match(items[0].label, /💵/);
  assert.match(items[0].label, /Cash/);
});

test('LifeOSLifeObjects._refSourceItems(): domain "financeAccount" tanpa D.accounts -> [] (aman, tidak throw)', () => {
  const store = { projects: [], reviewLog: [], knowledge: [], objects: [] };
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const ctx = load({ fakeDocument, store, lifeOSGetStore: () => store, lifeOSSave: () => Promise.resolve() });
  assert.doesNotThrow(() => ctx.LifeOSLifeObjects._refSourceItems('financeAccount'));
  assert.equal(ctx.LifeOSLifeObjects._refSourceItems('financeAccount').length, 0);
});

test('LifeOSLifeObjects.open(): kind ref domain "financeCategory" -> mapping lokal, reuse openCatModal(idx,type) apa adanya (BUKAN showAlertModal)', () => {
  const D = { categories: { income: [], expense: [{ id: 'cat_ki', name: 'Kiriman istri', emoji: '👩', subs: [] }, { id: 'cat_mk', name: 'Makan', emoji: '🍽️', subs: [] }] } };
  const store = {
    projects: [], reviewLog: [], knowledge: [],
    objects: [{ id: 'o1', name: 'Ref Kategori', areaKey: 'finance', kind: 'ref', sourceRef: { domain: 'financeCategory', id: 'cat_mk' } }],
  };
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const openCatModalCalls = [];
  const alertCalls = [];
  const ctx = load({
    D, fakeDocument, store, lifeOSGetStore: () => store, lifeOSSave: () => Promise.resolve(),
    openCatModal: (idx, type) => openCatModalCalls.push([idx, type]),
    showAlertModal: (msg, opts) => alertCalls.push([msg, opts]),
  });
  ctx.LifeOSLifeObjects.open('o1');
  assert.deepEqual(openCatModalCalls, [[1, 'expense']]);
  assert.equal(alertCalls.length, 0);
});

test('LifeOSLifeObjects.open(): domain "financeCategory" sourceRef busuk (id tidak ketemu) -> toast, openCatModal TIDAK dipanggil', () => {
  const D = { categories: { income: [], expense: [] } };
  const store = {
    projects: [], reviewLog: [], knowledge: [],
    objects: [{ id: 'o1', name: 'Ref Rusak', areaKey: 'finance', kind: 'ref', sourceRef: { domain: 'financeCategory', id: 'cat-tidak-ada' } }],
  };
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const openCatModalCalls = [];
  const toastCalls = [];
  const ctx = load({
    D, fakeDocument, store, lifeOSGetStore: () => store, lifeOSSave: () => Promise.resolve(),
    openCatModal: (idx, type) => openCatModalCalls.push([idx, type]),
    toast: (m) => toastCalls.push(m),
  });
  assert.doesNotThrow(() => ctx.LifeOSLifeObjects.open('o1'));
  assert.equal(openCatModalCalls.length, 0);
  assert.match(toastCalls[0], /tidak ditemukan/);
});

test('LifeOSLifeObjects._refSourceItems(): domain "financeCategory" -> REUSE D.categories.income+expense apa adanya, gabung keduanya', () => {
  const D = { categories: { income: [{ id: 'cat_gi', name: 'Gaji toko', emoji: '💼', subs: [] }], expense: [{ id: 'cat_mk', name: 'Makan', emoji: '🍽️', subs: [] }] } };
  const store = { projects: [], reviewLog: [], knowledge: [], objects: [] };
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const ctx = load({ D, fakeDocument, store, lifeOSGetStore: () => store, lifeOSSave: () => Promise.resolve() });
  const items = ctx.LifeOSLifeObjects._refSourceItems('financeCategory');
  assert.equal(items.length, 2);
  assert.equal(items[0].id, 'cat_gi');
  assert.match(items[0].label, /Pemasukan/);
  assert.equal(items[1].id, 'cat_mk');
  assert.match(items[1].label, /Pengeluaran/);
});

test('LifeOSLifeObjects._refSourceItems(): domain "financeCategory" tanpa D.categories -> [] (aman, tidak throw)', () => {
  const store = { projects: [], reviewLog: [], knowledge: [], objects: [] };
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const ctx = load({ fakeDocument, store, lifeOSGetStore: () => store, lifeOSSave: () => Promise.resolve() });
  assert.doesNotThrow(() => ctx.LifeOSLifeObjects._refSourceItems('financeCategory'));
  assert.equal(ctx.LifeOSLifeObjects._refSourceItems('financeCategory').length, 0);
});

test('LifeOSLifeObjects.createRef(): domain "financeAccount" -> sourceRef ke D.accounts, lifeObjectServiceCreate({kind:"ref"}) sukses', async () => {
  const D = { accounts: [{ id: 'acc_cash', name: 'Cash', emoji: '💵', balance: 0 }] };
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  let homeRenderCalls = 0;
  const LifeOSHome = { render() { homeRenderCalls++; } };
  const ctx = load({ D, fakeDocument, store, lifeOSGetStore, lifeOSSave, uidSeq: ['new-1'], LifeOSHome });
  const result = await ctx.LifeOSLifeObjects.createRef('Ref Akun', 'finance', { domain: 'financeAccount', id: 'acc_cash' });
  assert.equal(result.valid, true);
  assert.equal(store.objects.length, 1);
  assert.equal(store.objects[0].kind, 'ref');
  assert.equal(store.objects[0].sourceRef.domain, 'financeAccount');
  assert.equal(store.objects[0].sourceRef.id, 'acc_cash');
  assert.equal(saveCalls.length, 1);
  assert.equal(homeRenderCalls, 1);
});

test('LifeOSLifeObjects.createRef(): domain "financeAccount" sourceRef id tidak ketemu di D.accounts -> TIDAK menulis ke store, toast error', async () => {
  const D = { accounts: [] };
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const toastCalls = [];
  const ctx = load({ D, fakeDocument, store, lifeOSGetStore, lifeOSSave, toast: (m) => toastCalls.push(m) });
  const result = await ctx.LifeOSLifeObjects.createRef('Ref Rusak', 'finance', { domain: 'financeAccount', id: 'acc-tidak-ada' });
  assert.equal(result.valid, false);
  assert.equal(store.objects.length, 0);
  assert.equal(saveCalls.length, 0);
  assert.equal(toastCalls.length, 1);
});

test('LifeOSLifeObjects.createRef(): domain "financeCategory" -> sourceRef ke D.categories, lifeObjectServiceCreate({kind:"ref"}) sukses', async () => {
  const D = { categories: { income: [{ id: 'cat_gi', name: 'Gaji toko', emoji: '💼', subs: [] }], expense: [] } };
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  let homeRenderCalls = 0;
  const LifeOSHome = { render() { homeRenderCalls++; } };
  const ctx = load({ D, fakeDocument, store, lifeOSGetStore, lifeOSSave, uidSeq: ['new-1'], LifeOSHome });
  const result = await ctx.LifeOSLifeObjects.createRef('Ref Kategori', 'finance', { domain: 'financeCategory', id: 'cat_gi' });
  assert.equal(result.valid, true);
  assert.equal(store.objects.length, 1);
  assert.equal(store.objects[0].kind, 'ref');
  assert.equal(store.objects[0].sourceRef.domain, 'financeCategory');
  assert.equal(store.objects[0].sourceRef.id, 'cat_gi');
  assert.equal(saveCalls.length, 1);
  assert.equal(homeRenderCalls, 1);
});

test('LifeOSLifeObjects.createRef(): domain "financeCategory" sourceRef id tidak ketemu -> TIDAK menulis ke store, toast error', async () => {
  const D = { categories: { income: [], expense: [] } };
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const toastCalls = [];
  const ctx = load({ D, fakeDocument, store, lifeOSGetStore, lifeOSSave, toast: (m) => toastCalls.push(m) });
  const result = await ctx.LifeOSLifeObjects.createRef('Ref Rusak', 'finance', { domain: 'financeCategory', id: 'cat-tidak-ada' });
  assert.equal(result.valid, false);
  assert.equal(store.objects.length, 0);
  assert.equal(saveCalls.length, 0);
  assert.equal(toastCalls.length, 1);
});

// ---- Fase 2 (Sesi 62): create kind:"ref" 2-modal showChoiceModal() ----

test('LifeOSLifeObjects._refSourceItems(): domain "knowledge" -> REUSE knowledgeAdapterList() apa adanya, {id,label} dari title', () => {
  const store = {
    projects: [], reviewLog: [],
    knowledge: [{ id: 'k1', title: 'Insight X', content: 'isi', tags: [] }],
    objects: [],
  };
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const ctx = load({ fakeDocument, store, lifeOSGetStore: () => store, lifeOSSave: () => Promise.resolve() });
  const items = ctx.LifeOSLifeObjects._refSourceItems('knowledge');
  assert.equal(items.length, 1);
  assert.equal(items[0].id, 'k1');
  assert.equal(items[0].label, 'Insight X');
});

test('LifeOSLifeObjects._refSourceItems(): domain "review" -> dari LifeOSStore.reviewLog apa adanya', () => {
  const store = {
    projects: [], knowledge: [],
    reviewLog: [{ id: 'r1', period: 'weekly', completedAt: '2026-07-01' }],
    objects: [],
  };
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const ctx = load({ fakeDocument, store, lifeOSGetStore: () => store, lifeOSSave: () => Promise.resolve() });
  const items = ctx.LifeOSLifeObjects._refSourceItems('review');
  assert.equal(items.length, 1);
  assert.equal(items[0].id, 'r1');
  assert.match(items[0].label, /weekly/);
});

test('LifeOSLifeObjects._refSourceItems(): domain "goal" tanpa goalAdapterList ter-load -> [] (aman, tidak throw)', () => {
  const store = { projects: [], reviewLog: [], knowledge: [], objects: [] };
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const ctx = load({ fakeDocument, store, lifeOSGetStore: () => store, lifeOSSave: () => Promise.resolve() });
  assert.equal(ctx.LifeOSLifeObjects._refSourceItems('goal').length, 0);
});

test('LifeOSLifeObjects.createRef(): valid -> lifeObjectServiceCreate({kind:"ref"}) lalu render() + LifeOSHome.render()', async () => {
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  store.knowledge.push({ id: 'k1', title: 'Insight X', content: 'isi', tags: [] });
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  let homeRenderCalls = 0;
  const LifeOSHome = { render() { homeRenderCalls++; } };
  const ctx = load({ fakeDocument, store, lifeOSGetStore, lifeOSSave, uidSeq: ['new-1'], LifeOSHome });
  const result = await ctx.LifeOSLifeObjects.createRef('Ref Knowledge', 'finance', { domain: 'knowledge', id: 'k1' });
  assert.equal(result.valid, true);
  assert.equal(store.objects.length, 1);
  assert.equal(store.objects[0].kind, 'ref');
  assert.equal(store.objects[0].sourceRef.domain, 'knowledge');
  assert.equal(store.objects[0].sourceRef.id, 'k1');
  assert.equal(saveCalls.length, 1);
  assert.equal(homeRenderCalls, 1);
});

test('LifeOSLifeObjects.createRef(): sourceRef gagal validasi (domain tidak terdaftar) -> TIDAK menulis ke store, toast error', async () => {
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const toastCalls = [];
  const ctx = load({ fakeDocument, store, lifeOSGetStore, lifeOSSave, toast: (m) => toastCalls.push(m) });
  const result = await ctx.LifeOSLifeObjects.createRef('Ref Aneh', 'finance', { domain: 'tidak-ada', id: 'x' });
  assert.equal(result.valid, false);
  assert.equal(store.objects.length, 0);
  assert.equal(saveCalls.length, 0);
  assert.equal(toastCalls.length, 1);
});

test('LifeOSLifeObjects.createRef(): domain "finance" -> sourceRef ke D.transactions, lifeObjectServiceCreate({kind:"ref"}) sukses', async () => {
  const D = { transactions: [{ id: 'tx1', type: 'expense', category: 'Makan', amount: 25000, date: '2026-07-19' }] };
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  let homeRenderCalls = 0;
  const LifeOSHome = { render() { homeRenderCalls++; } };
  const ctx = load({ D, fakeDocument, store, lifeOSGetStore, lifeOSSave, uidSeq: ['new-1'], LifeOSHome });
  const result = await ctx.LifeOSLifeObjects.createRef('Ref Transaksi', 'finance', { domain: 'finance', id: 'tx1' });
  assert.equal(result.valid, true);
  assert.equal(store.objects.length, 1);
  assert.equal(store.objects[0].kind, 'ref');
  assert.equal(store.objects[0].sourceRef.domain, 'finance');
  assert.equal(store.objects[0].sourceRef.id, 'tx1');
  assert.equal(saveCalls.length, 1);
  assert.equal(homeRenderCalls, 1);
});

test('LifeOSLifeObjects.createRef(): domain "finance" sourceRef id tidak ketemu di D.transactions -> TIDAK menulis ke store, toast error', async () => {
  const D = { transactions: [] };
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const toastCalls = [];
  const ctx = load({ D, fakeDocument, store, lifeOSGetStore, lifeOSSave, toast: (m) => toastCalls.push(m) });
  const result = await ctx.LifeOSLifeObjects.createRef('Ref Rusak', 'finance', { domain: 'finance', id: 'tx-tidak-ada' });
  assert.equal(result.valid, false);
  assert.equal(store.objects.length, 0);
  assert.equal(saveCalls.length, 0);
  assert.equal(toastCalls.length, 1);
});

test('LifeOSLifeObjects.promptCreateRef(): alur lengkap 2-modal (domain "knowledge" -> id -> nama -> area) -> createRef() sukses', async () => {
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  store.knowledge.push({ id: 'k1', title: 'Insight X', content: 'isi', tags: [] });
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  let homeRenderCalls = 0;
  const LifeOSHome = { render() { homeRenderCalls++; } };
  const choiceCalls = [];
  const showChoiceModal = async (opts) => {
    choiceCalls.push(opts);
    if (choiceCalls.length === 1) return opts.choices.findIndex((c) => c.label === 'Knowledge');
    if (choiceCalls.length === 2) return 0; // pilih item pertama (k1)
    return 0; // pilih area pertama
  };
  const showPromptModal = async () => 'Ref Knowledge Saya';
  const ctx = load({
    fakeDocument, store, lifeOSGetStore, lifeOSSave, uidSeq: ['new-1'], LifeOSHome,
    showChoiceModal, showPromptModal,
  });
  await ctx.LifeOSLifeObjects.promptCreateRef();
  assert.equal(store.objects.length, 1);
  assert.equal(store.objects[0].kind, 'ref');
  assert.equal(store.objects[0].sourceRef.domain, 'knowledge');
  assert.equal(store.objects[0].sourceRef.id, 'k1');
  assert.equal(store.objects[0].name, 'Ref Knowledge Saya');
  assert.equal(saveCalls.length, 1);
  assert.equal(homeRenderCalls, 1);
});

test('LifeOSLifeObjects.promptCreateRef(): domain dipilih tapi belum ada data -> toast, TIDAK lanjut ke modal berikutnya', async () => {
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const toastCalls = [];
  let choiceCallCount = 0;
  const showChoiceModal = async (opts) => {
    choiceCallCount++;
    return opts.choices.findIndex((c) => c.label === 'Knowledge');
  };
  const ctx = load({
    fakeDocument, store, lifeOSGetStore, lifeOSSave, showChoiceModal,
    toast: (m) => toastCalls.push(m),
  });
  await ctx.LifeOSLifeObjects.promptCreateRef();
  assert.equal(choiceCallCount, 1);
  assert.equal(store.objects.length, 0);
  assert.equal(saveCalls.length, 0);
  assert.equal(toastCalls.length, 1);
  assert.match(toastCalls[0], /Belum ada data/);
});

test('LifeOSLifeObjects.promptCreateRef(): batal di modal pilih domain (null) -> TIDAK memanggil apa pun lagi', async () => {
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  let showPromptModalCalls = 0;
  const showChoiceModal = async () => null;
  const showPromptModal = async () => { showPromptModalCalls++; return 'x'; };
  const ctx = load({ fakeDocument, store, lifeOSGetStore, lifeOSSave, showChoiceModal, showPromptModal });
  await ctx.LifeOSLifeObjects.promptCreateRef();
  assert.equal(showPromptModalCalls, 0);
  assert.equal(store.objects.length, 0);
  assert.equal(saveCalls.length, 0);
});

// ---- Builder filter transaksi finance (Sesi 72, Batch 6 lanjutan) ----

test('LifeOSLifeObjects._refSourceItems(): domain "finance" dgn filter {type:"expense"} -> hanya transaksi expense', () => {
  const D = {
    transactions: [
      { id: 'tx1', type: 'expense', category: 'Makan', amount: 25000, date: '2026-07-19' },
      { id: 'tx2', type: 'income', category: 'Gaji', amount: 5000000, date: '2026-07-01' },
    ],
  };
  const store = { projects: [], reviewLog: [], knowledge: [], objects: [] };
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const ctx = load({ D, fakeDocument, store, lifeOSGetStore: () => store, lifeOSSave: () => Promise.resolve() });
  const items = ctx.LifeOSLifeObjects._refSourceItems('finance', { type: 'expense' });
  assert.equal(items.length, 1);
  assert.equal(items[0].id, 'tx1');
});

test('LifeOSLifeObjects._refSourceItems(): domain "finance" dgn filter {type:"income"} -> hanya transaksi income', () => {
  const D = {
    transactions: [
      { id: 'tx1', type: 'expense', category: 'Makan', amount: 25000, date: '2026-07-19' },
      { id: 'tx2', type: 'income', category: 'Gaji', amount: 5000000, date: '2026-07-01' },
    ],
  };
  const store = { projects: [], reviewLog: [], knowledge: [], objects: [] };
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const ctx = load({ D, fakeDocument, store, lifeOSGetStore: () => store, lifeOSSave: () => Promise.resolve() });
  const items = ctx.LifeOSLifeObjects._refSourceItems('finance', { type: 'income' });
  assert.equal(items.length, 1);
  assert.equal(items[0].id, 'tx2');
});

test('LifeOSLifeObjects._refSourceItems(): domain "finance" TANPA filter -> semua transaksi (kompatibel Sesi 71)', () => {
  const D = {
    transactions: [
      { id: 'tx1', type: 'expense', category: 'Makan', amount: 25000, date: '2026-07-19' },
      { id: 'tx2', type: 'income', category: 'Gaji', amount: 5000000, date: '2026-07-01' },
    ],
  };
  const store = { projects: [], reviewLog: [], knowledge: [], objects: [] };
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const ctx = load({ D, fakeDocument, store, lifeOSGetStore: () => store, lifeOSSave: () => Promise.resolve() });
  assert.equal(ctx.LifeOSLifeObjects._refSourceItems('finance').length, 2);
});

test('LifeOSLifeObjects.promptCreateRef(): domain "finance" -> modal filter tipe extra (Pengeluaran) -> id -> nama -> area -> createRef() sukses', async () => {
  const D = {
    transactions: [
      { id: 'tx1', type: 'expense', category: 'Makan', amount: 25000, date: '2026-07-19' },
      { id: 'tx2', type: 'income', category: 'Gaji', amount: 5000000, date: '2026-07-01' },
    ],
  };
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  let homeRenderCalls = 0;
  const LifeOSHome = { render() { homeRenderCalls++; } };
  const choiceCalls = [];
  const showChoiceModal = async (opts) => {
    choiceCalls.push(opts);
    if (choiceCalls.length === 1) return opts.choices.findIndex((c) => c.label === 'Transaksi'); // pilih domain finance
    if (choiceCalls.length === 2) return opts.choices.findIndex((c) => c.label === 'Pengeluaran'); // filter expense
    if (choiceCalls.length === 3) return 0; // pilih item pertama hasil filter (tx1)
    return 0; // pilih area pertama
  };
  const showPromptModal = async () => 'Ref Transaksi Saya';
  const ctx = load({
    D, fakeDocument, store, lifeOSGetStore, lifeOSSave, uidSeq: ['new-1'], LifeOSHome,
    showChoiceModal, showPromptModal,
  });
  await ctx.LifeOSLifeObjects.promptCreateRef();
  assert.equal(choiceCalls.length, 4);
  assert.equal(store.objects.length, 1);
  assert.equal(store.objects[0].sourceRef.domain, 'finance');
  assert.equal(store.objects[0].sourceRef.id, 'tx1');
  assert.equal(saveCalls.length, 1);
  assert.equal(homeRenderCalls, 1);
});

test('LifeOSLifeObjects.promptCreateRef(): domain "finance" -> filter "Semua" -> daftar item TIDAK dipersempit', async () => {
  const D = {
    transactions: [
      { id: 'tx1', type: 'expense', category: 'Makan', amount: 25000, date: '2026-07-19' },
      { id: 'tx2', type: 'income', category: 'Gaji', amount: 5000000, date: '2026-07-01' },
    ],
  };
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const choiceCalls = [];
  let itemChoicesSeen = null;
  const showChoiceModal = async (opts) => {
    choiceCalls.push(opts);
    if (choiceCalls.length === 1) return opts.choices.findIndex((c) => c.label === 'Transaksi');
    if (choiceCalls.length === 2) return opts.choices.findIndex((c) => c.label === 'Semua');
    if (choiceCalls.length === 3) { itemChoicesSeen = opts.choices; return 1; } // pilih tx2
    return 0;
  };
  const showPromptModal = async () => 'Ref X';
  const ctx = load({
    D, fakeDocument, store, lifeOSGetStore, lifeOSSave, uidSeq: ['new-1'],
    showChoiceModal, showPromptModal,
  });
  await ctx.LifeOSLifeObjects.promptCreateRef();
  assert.equal(itemChoicesSeen.length, 2);
  assert.equal(store.objects[0].sourceRef.id, 'tx2');
});

test('LifeOSLifeObjects.promptCreateRef(): batal di modal filter tipe finance (null) -> TIDAK lanjut ke modal item', async () => {
  const D = { transactions: [{ id: 'tx1', type: 'expense', category: 'Makan', amount: 25000, date: '2026-07-19' }] };
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const choiceCalls = [];
  const showChoiceModal = async (opts) => {
    choiceCalls.push(opts);
    if (choiceCalls.length === 1) return opts.choices.findIndex((c) => c.label === 'Transaksi');
    return null; // batal di modal filter
  };
  const ctx = load({ D, fakeDocument, store, lifeOSGetStore, lifeOSSave, showChoiceModal });
  await ctx.LifeOSLifeObjects.promptCreateRef();
  assert.equal(choiceCalls.length, 2);
  assert.equal(store.objects.length, 0);
  assert.equal(saveCalls.length, 0);
});

// ---- Update UI (Sesi 63): edit nama/areaKey ----

test('LifeOSLifeObjects.update(): valid -> lifeObjectServiceUpdate() lalu render() + LifeOSHome.render()', async () => {
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([
    { id: 'o1', name: 'Nama Lama', areaKey: 'finance', kind: 'generic', sourceRef: null },
  ]);
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  let homeRenderCalls = 0;
  const LifeOSHome = { render() { homeRenderCalls++; } };
  const ctx = load({ fakeDocument, store, lifeOSGetStore, lifeOSSave, LifeOSHome });
  const result = await ctx.LifeOSLifeObjects.update('o1', 'Nama Baru', 'spiritual');
  assert.equal(result.valid, true);
  assert.equal(store.objects[0].name, 'Nama Baru');
  assert.equal(store.objects[0].areaKey, 'spiritual');
  assert.equal(saveCalls.length, 1);
  assert.equal(homeRenderCalls, 1);
  const html = fakeDocument.getElementById('lifeOSLifeObjectsGrid').innerHTML;
  assert.match(html, /Nama Baru/);
});

test('LifeOSLifeObjects.update(): kind "ref" -> sourceRef/kind TIDAK berubah, hanya nama/areaKey', async () => {
  const { store, lifeOSGetStore, lifeOSSave } = makeStoreHarness([
    { id: 'o1', name: 'Ref Lama', areaKey: 'finance', kind: 'ref', sourceRef: { domain: 'knowledge', id: 'k1' } },
  ]);
  store.knowledge.push({ id: 'k1', title: 'Insight X', content: 'isi', tags: [] });
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const ctx = load({ fakeDocument, store, lifeOSGetStore, lifeOSSave });
  const result = await ctx.LifeOSLifeObjects.update('o1', 'Ref Baru', 'spiritual');
  assert.equal(result.valid, true);
  assert.equal(store.objects[0].kind, 'ref');
  assert.equal(store.objects[0].sourceRef.domain, 'knowledge');
  assert.equal(store.objects[0].sourceRef.id, 'k1');
  assert.equal(store.objects[0].name, 'Ref Baru');
});

test('LifeOSLifeObjects.update(): id tidak ditemukan -> TIDAK throw, toast error, TIDAK panggil render/LifeOSHome', async () => {
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const toastCalls = [];
  let homeRenderCalls = 0;
  const LifeOSHome = { render() { homeRenderCalls++; } };
  const ctx = load({ fakeDocument, store, lifeOSGetStore, lifeOSSave, LifeOSHome, toast: (m) => toastCalls.push(m) });
  const result = await ctx.LifeOSLifeObjects.update('tidak-ada', 'X', 'finance');
  assert.equal(result.valid, false);
  assert.equal(saveCalls.length, 0);
  assert.equal(toastCalls.length, 1);
  assert.equal(homeRenderCalls, 0);
});

test('LifeOSLifeObjects.promptEdit(): alur lengkap (prefill nama dari obj.name) -> update() sukses', async () => {
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([
    { id: 'o1', name: 'Nama Lama', areaKey: 'finance', kind: 'generic', sourceRef: null },
  ]);
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  const promptCalls = [];
  const showPromptModal = async (opts) => { promptCalls.push(opts); return 'Nama Diedit'; };
  const showChoiceModal = async () => 0;
  const ctx = load({ fakeDocument, store, lifeOSGetStore, lifeOSSave, showPromptModal, showChoiceModal });
  await ctx.LifeOSLifeObjects.promptEdit('o1');
  assert.equal(promptCalls.length, 1);
  assert.equal(promptCalls[0].defaultValue, 'Nama Lama');
  assert.equal(store.objects[0].name, 'Nama Diedit');
  assert.equal(saveCalls.length, 1);
});

test('LifeOSLifeObjects.promptEdit(): batal di prompt nama (null) -> TIDAK lanjut ke pilih area, TIDAK menulis', async () => {
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([
    { id: 'o1', name: 'Nama Lama', areaKey: 'finance', kind: 'generic', sourceRef: null },
  ]);
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  let choiceCalls = 0;
  const showPromptModal = async () => null;
  const showChoiceModal = async () => { choiceCalls++; return 0; };
  const ctx = load({ fakeDocument, store, lifeOSGetStore, lifeOSSave, showPromptModal, showChoiceModal });
  await ctx.LifeOSLifeObjects.promptEdit('o1');
  assert.equal(choiceCalls, 0);
  assert.equal(store.objects[0].name, 'Nama Lama');
  assert.equal(saveCalls.length, 0);
});

test('LifeOSLifeObjects.promptEdit(): id tidak ditemukan -> TIDAK memanggil modal apa pun', async () => {
  const { store, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const fakeDocument = createFakeDocument({ lifeOSLifeObjectsGrid: {} });
  let promptCalls = 0;
  const showPromptModal = async () => { promptCalls++; return 'x'; };
  const ctx = load({ fakeDocument, store, lifeOSGetStore, lifeOSSave, showPromptModal });
  await ctx.LifeOSLifeObjects.promptEdit('tidak-ada');
  assert.equal(promptCalls, 0);
});
