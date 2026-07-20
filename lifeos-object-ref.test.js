'use strict';
// tests/lifeos-object-ref.test.js — LIFEOS_OBJECT_REF_SOURCES
// (lifeos-registry.js) + lifeOSObjectRefResolve()/Exists()/Validate()
// (lifeos-object-ref.js). Sesi 58 (Batch 4, keputusan produk FINAL —
// docs/PRODUCT_DECISIONS.md § LifeOS — Life Object sourceRef): sourceRef
// = {domain, id} HANYA boleh menunjuk ke domain terdaftar (goal/project/
// knowledge/review, lalu finance Sesi 71 + financeAccount/financeCategory
// Sesi 73) — BUKAN referensi antar Life Object, BUKAN generic resolver
// bebas, BUKAN recursive, BUKAN wildcard domain. Fokus test:
// (1) bentuk registry (label/resolver/exists per domain, TEPAT 7 domain
// terdaftar — tidak lebih, tidak wildcard); (2) resolver/exists per
// domain reuse adapter yang SUDAH ADA (goalAdapterList/
// projectAdapterFindOne/knowledgeAdapterList/LifeOSStore.reviewLog/
// D.transactions/D.accounts/D.categories), TIDAK ada agregasi baru;
// (3) domain tak terdaftar aman (null/false, tidak throw); (4) validator
// menolak (valid:false + error) utk sourceRef tidak lengkap/domain tak
// terdaftar/id kosong/id tidak ketemu, dan TIDAK PERNAH membuat/menulis
// apa pun sendiri.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/loadSource');

const FILES = [
  'lifeos/lifeos-store.js',
  'lifeos/lifeos-registry.js',
  'lifeos/adapters/goal-adapter.js',
  'lifeos/adapters/project-adapter.js',
  'lifeos/adapters/knowledge-adapter.js',
  'lifeos/lifeos-object-ref.js',
];

function load(D) {
  return loadSource(FILES, { D }, ['LIFEOS_OBJECT_REF_SOURCES']);
}

async function loadWithStore(D, storeSeed) {
  const store = { projects: [], reviewLog: [], knowledge: [], ...storeSeed };
  const ctx = loadSource(
    FILES,
    { D, IDBStore: { get: async () => store, set: async () => {} } },
    ['LIFEOS_OBJECT_REF_SOURCES'],
  );
  await ctx.lifeOSLoad();
  return ctx;
}

// ---------------------------------------------------------------------
// Bentuk registry
// ---------------------------------------------------------------------

test('LIFEOS_OBJECT_REF_SOURCES: TEPAT 7 domain terdaftar (finance/financeAccount/financeCategory/goal/knowledge/project/review) — tidak lebih, bukan wildcard', () => {
  const ctx = load({});
  assert.deepEqual(Object.keys(ctx.LIFEOS_OBJECT_REF_SOURCES).sort(), ['finance', 'financeAccount', 'financeCategory', 'goal', 'knowledge', 'project', 'review']);
});

test('LIFEOS_OBJECT_REF_SOURCES: tiap entry punya label(string), resolver(function), exists(function)', () => {
  const ctx = load({});
  for (const domain of Object.keys(ctx.LIFEOS_OBJECT_REF_SOURCES)) {
    const entry = ctx.LIFEOS_OBJECT_REF_SOURCES[domain];
    assert.equal(typeof entry.label, 'string');
    assert.equal(typeof entry.resolver, 'function');
    assert.equal(typeof entry.exists, 'function');
  }
});

// ---------------------------------------------------------------------
// Resolver / exists per domain — reuse adapter yang sudah ada
// ---------------------------------------------------------------------

test('lifeOSObjectRefResolve("goal", id): resolve via goalAdapterList(D) apa adanya', () => {
  const D = { targets: [{ id: 't1', name: 'Dana Darurat', amount: 1000, saved: 500 }] };
  const ctx = load(D);
  const result = ctx.lifeOSObjectRefResolve('goal', 'target:t1');
  assert.ok(result);
  assert.equal(result.name, 'Dana Darurat');
  assert.equal(result.sourceKind, 'target');
});

test('lifeOSObjectRefResolve("goal", id): id tidak ketemu -> null (bukan throw)', () => {
  const D = { targets: [{ id: 't1', name: 'Dana Darurat', amount: 1000, saved: 500 }] };
  const ctx = load(D);
  assert.equal(ctx.lifeOSObjectRefResolve('goal', 'target:tidak-ada'), null);
});

test('lifeOSObjectRefExists("goal", id): true kalau ketemu, false kalau tidak', () => {
  const D = { targets: [{ id: 't1', name: 'Dana Darurat', amount: 1000, saved: 500 }] };
  const ctx = load(D);
  assert.equal(ctx.lifeOSObjectRefExists('goal', 'target:t1'), true);
  assert.equal(ctx.lifeOSObjectRefExists('goal', 'target:tidak-ada'), false);
});

test('lifeOSObjectRefResolve("project", id): resolve legacy (renovasi) via projectAdapterFindOne(D, store, id)', async () => {
  const D = { renovProjects: [{ id: 'r1', name: 'Renovasi Kios A', createdAt: '2026-01-01', items: [] }] };
  const ctx = await loadWithStore(D, {});
  const result = ctx.lifeOSObjectRefResolve('project', 'renovasi:r1');
  assert.ok(result);
  assert.equal(result.name, 'Renovasi Kios A');
});

test('lifeOSObjectRefResolve("project", id): resolve generic (LifeOSStore.projects) via projectAdapterFindOne', async () => {
  const D = {};
  const ctx = await loadWithStore(D, { projects: [{ id: 'p1', name: 'Project Generik', areaKey: 'business', status: 'active', createdAt: '2026-01-01', checklist: [] }] });
  const result = ctx.lifeOSObjectRefResolve('project', 'generic:p1');
  assert.ok(result);
  assert.equal(result.name, 'Project Generik');
});

test('lifeOSObjectRefResolve("knowledge", id): resolve via knowledgeAdapterList(store)', async () => {
  const D = {};
  const ctx = await loadWithStore(D, { knowledge: [{ id: 'k1', title: 'Catatan A', createdAt: '2026-01-01' }] });
  const result = ctx.lifeOSObjectRefResolve('knowledge', 'k1');
  assert.ok(result);
  assert.equal(result.title, 'Catatan A');
});

test('lifeOSObjectRefResolve("review", id): resolve via LifeOSStore.reviewLog', async () => {
  const D = {};
  const ctx = await loadWithStore(D, { reviewLog: [{ id: 'sess1', period: 'weekly', completedAt: '2026-01-01' }] });
  const result = ctx.lifeOSObjectRefResolve('review', 'sess1');
  assert.ok(result);
  assert.equal(result.period, 'weekly');
});

test('lifeOSObjectRefResolve("finance", id): resolve via D.transactions apa adanya (tanpa adapter terpisah)', () => {
  const D = { transactions: [{ id: 'tx1', type: 'expense', category: 'Makan', amount: 25000, date: '2026-07-19' }] };
  const ctx = load(D);
  const result = ctx.lifeOSObjectRefResolve('finance', 'tx1');
  assert.ok(result);
  assert.equal(result.category, 'Makan');
  assert.equal(result.amount, 25000);
});

test('lifeOSObjectRefResolve("finance", id): id tidak ketemu -> null (bukan throw)', () => {
  const D = { transactions: [{ id: 'tx1', type: 'expense', category: 'Makan', amount: 25000, date: '2026-07-19' }] };
  const ctx = load(D);
  assert.equal(ctx.lifeOSObjectRefResolve('finance', 'tidak-ada'), null);
});

test('lifeOSObjectRefExists("finance", id): true kalau ketemu, false kalau tidak', () => {
  const D = { transactions: [{ id: 'tx1', type: 'expense', category: 'Makan', amount: 25000, date: '2026-07-19' }] };
  const ctx = load(D);
  assert.equal(ctx.lifeOSObjectRefExists('finance', 'tx1'), true);
  assert.equal(ctx.lifeOSObjectRefExists('finance', 'tidak-ada'), false);
});

test('lifeOSObjectRefResolve("finance", id): D belum ter-load (typeof D undefined) -> null, tidak throw', () => {
  const ctx = loadSource(FILES, {}, ['LIFEOS_OBJECT_REF_SOURCES']);
  assert.doesNotThrow(() => ctx.lifeOSObjectRefResolve('finance', 'tx1'));
  assert.equal(ctx.lifeOSObjectRefResolve('finance', 'tx1'), null);
});

test('lifeOSObjectRefResolve("finance", id): D.transactions belum ada (undefined) -> null, tidak throw', () => {
  const ctx = load({});
  assert.doesNotThrow(() => ctx.lifeOSObjectRefResolve('finance', 'tx1'));
  assert.equal(ctx.lifeOSObjectRefResolve('finance', 'tx1'), null);
});

test('lifeOSObjectRefValidate(): sourceRef domain "finance" valid (id ketemu di D.transactions) -> {valid:true}', () => {
  const D = { transactions: [{ id: 'tx1', type: 'expense', category: 'Makan', amount: 25000, date: '2026-07-19' }] };
  const ctx = load(D);
  const result = ctx.lifeOSObjectRefValidate({ domain: 'finance', id: 'tx1' });
  assert.equal(result.valid, true);
});

test('lifeOSObjectRefValidate(): sourceRef domain "finance" id tidak ketemu -> valid:false + error', () => {
  const D = { transactions: [] };
  const ctx = load(D);
  const result = ctx.lifeOSObjectRefValidate({ domain: 'finance', id: 'tx-tidak-ada' });
  assert.equal(result.valid, false);
  assert.match(result.error, /tidak ditemukan/);
});

// ---------------------------------------------------------------------
// financeAccount (Sesi 73, Batch 6 — Finance Account & Finance Category
// Foundation) — sama pola dgn domain "finance": baca D.accounts apa
// adanya, TIDAK ada adapter terpisah.
// ---------------------------------------------------------------------

test('lifeOSObjectRefResolve("financeAccount", id): resolve via D.accounts apa adanya (tanpa adapter terpisah)', () => {
  const D = { accounts: [{ id: 'acc_cash', name: 'Cash', emoji: '💵', balance: 0 }] };
  const ctx = load(D);
  const result = ctx.lifeOSObjectRefResolve('financeAccount', 'acc_cash');
  assert.ok(result);
  assert.equal(result.name, 'Cash');
});

test('lifeOSObjectRefResolve("financeAccount", id): id tidak ketemu -> null (bukan throw)', () => {
  const D = { accounts: [{ id: 'acc_cash', name: 'Cash', emoji: '💵', balance: 0 }] };
  const ctx = load(D);
  assert.equal(ctx.lifeOSObjectRefResolve('financeAccount', 'tidak-ada'), null);
});

test('lifeOSObjectRefExists("financeAccount", id): true kalau ketemu, false kalau tidak', () => {
  const D = { accounts: [{ id: 'acc_cash', name: 'Cash', emoji: '💵', balance: 0 }] };
  const ctx = load(D);
  assert.equal(ctx.lifeOSObjectRefExists('financeAccount', 'acc_cash'), true);
  assert.equal(ctx.lifeOSObjectRefExists('financeAccount', 'tidak-ada'), false);
});

test('lifeOSObjectRefResolve("financeAccount", id): D belum ter-load (typeof D undefined) -> null, tidak throw', () => {
  const ctx = loadSource(FILES, {}, ['LIFEOS_OBJECT_REF_SOURCES']);
  assert.doesNotThrow(() => ctx.lifeOSObjectRefResolve('financeAccount', 'acc_cash'));
  assert.equal(ctx.lifeOSObjectRefResolve('financeAccount', 'acc_cash'), null);
});

test('lifeOSObjectRefResolve("financeAccount", id): D.accounts belum ada (undefined) -> null, tidak throw', () => {
  const ctx = load({});
  assert.doesNotThrow(() => ctx.lifeOSObjectRefResolve('financeAccount', 'acc_cash'));
  assert.equal(ctx.lifeOSObjectRefResolve('financeAccount', 'acc_cash'), null);
});

test('lifeOSObjectRefValidate(): sourceRef domain "financeAccount" valid (id ketemu di D.accounts) -> {valid:true}', () => {
  const D = { accounts: [{ id: 'acc_cash', name: 'Cash', emoji: '💵', balance: 0 }] };
  const ctx = load(D);
  const result = ctx.lifeOSObjectRefValidate({ domain: 'financeAccount', id: 'acc_cash' });
  assert.equal(result.valid, true);
});

test('lifeOSObjectRefValidate(): sourceRef domain "financeAccount" id tidak ketemu -> valid:false + error', () => {
  const D = { accounts: [] };
  const ctx = load(D);
  const result = ctx.lifeOSObjectRefValidate({ domain: 'financeAccount', id: 'acc-tidak-ada' });
  assert.equal(result.valid, false);
  assert.match(result.error, /tidak ditemukan/);
});

// ---------------------------------------------------------------------
// financeCategory (Sesi 73, Batch 6 — sama pola) — baca
// D.categories.income + D.categories.expense apa adanya, resolver
// menempel field `type` non-destruktif ke hasil.
// ---------------------------------------------------------------------

test('lifeOSObjectRefResolve("financeCategory", id): resolve via D.categories.income apa adanya (tanpa adapter terpisah)', () => {
  const D = { categories: { income: [{ id: 'cat_gi', name: 'Gaji toko', emoji: '💼', subs: [] }], expense: [] } };
  const ctx = load(D);
  const result = ctx.lifeOSObjectRefResolve('financeCategory', 'cat_gi');
  assert.ok(result);
  assert.equal(result.name, 'Gaji toko');
  assert.equal(result.type, 'income');
});

test('lifeOSObjectRefResolve("financeCategory", id): resolve via D.categories.expense apa adanya', () => {
  const D = { categories: { income: [], expense: [{ id: 'cat_mk', name: 'Makan', emoji: '🍽️', subs: [] }] } };
  const ctx = load(D);
  const result = ctx.lifeOSObjectRefResolve('financeCategory', 'cat_mk');
  assert.ok(result);
  assert.equal(result.name, 'Makan');
  assert.equal(result.type, 'expense');
});

test('lifeOSObjectRefResolve("financeCategory", id): id tidak ketemu -> null (bukan throw)', () => {
  const D = { categories: { income: [{ id: 'cat_gi', name: 'Gaji toko', emoji: '💼', subs: [] }], expense: [] } };
  const ctx = load(D);
  assert.equal(ctx.lifeOSObjectRefResolve('financeCategory', 'tidak-ada'), null);
});

test('lifeOSObjectRefExists("financeCategory", id): true kalau ketemu, false kalau tidak', () => {
  const D = { categories: { income: [{ id: 'cat_gi', name: 'Gaji toko', emoji: '💼', subs: [] }], expense: [] } };
  const ctx = load(D);
  assert.equal(ctx.lifeOSObjectRefExists('financeCategory', 'cat_gi'), true);
  assert.equal(ctx.lifeOSObjectRefExists('financeCategory', 'tidak-ada'), false);
});

test('lifeOSObjectRefResolve("financeCategory", id): D belum ter-load (typeof D undefined) -> null, tidak throw', () => {
  const ctx = loadSource(FILES, {}, ['LIFEOS_OBJECT_REF_SOURCES']);
  assert.doesNotThrow(() => ctx.lifeOSObjectRefResolve('financeCategory', 'cat_gi'));
  assert.equal(ctx.lifeOSObjectRefResolve('financeCategory', 'cat_gi'), null);
});

test('lifeOSObjectRefResolve("financeCategory", id): D.categories belum ada (undefined) -> null, tidak throw', () => {
  const ctx = load({});
  assert.doesNotThrow(() => ctx.lifeOSObjectRefResolve('financeCategory', 'cat_gi'));
  assert.equal(ctx.lifeOSObjectRefResolve('financeCategory', 'cat_gi'), null);
});

test('lifeOSObjectRefValidate(): sourceRef domain "financeCategory" valid (id ketemu di D.categories.expense) -> {valid:true}', () => {
  const D = { categories: { income: [], expense: [{ id: 'cat_mk', name: 'Makan', emoji: '🍽️', subs: [] }] } };
  const ctx = load(D);
  const result = ctx.lifeOSObjectRefValidate({ domain: 'financeCategory', id: 'cat_mk' });
  assert.equal(result.valid, true);
});

test('lifeOSObjectRefValidate(): sourceRef domain "financeCategory" id tidak ketemu -> valid:false + error', () => {
  const D = { categories: { income: [], expense: [] } };
  const ctx = load(D);
  const result = ctx.lifeOSObjectRefValidate({ domain: 'financeCategory', id: 'cat-tidak-ada' });
  assert.equal(result.valid, false);
  assert.match(result.error, /tidak ditemukan/);
});

test('lifeOSObjectRefResolve()/Exists(): domain tidak terdaftar -> null/false, tidak throw (bukan generic resolver)', () => {
  const ctx = load({});
  assert.doesNotThrow(() => ctx.lifeOSObjectRefResolve('plugin', 'x'));
  assert.equal(ctx.lifeOSObjectRefResolve('plugin', 'x'), null);
  assert.equal(ctx.lifeOSObjectRefExists('lifeObject', 'x'), false);
});

test('lifeOSObjectRefResolve("goal", id): D belum ter-load (typeof D undefined) -> null, tidak throw', () => {
  const ctx = loadSource(FILES, {}, ['LIFEOS_OBJECT_REF_SOURCES']);
  assert.doesNotThrow(() => ctx.lifeOSObjectRefResolve('goal', 'target:t1'));
  assert.equal(ctx.lifeOSObjectRefResolve('goal', 'target:t1'), null);
});

// ---------------------------------------------------------------------
// Validator — create/update gate
// ---------------------------------------------------------------------

test('lifeOSObjectRefValidate(): sourceRef valid (domain terdaftar, id ketemu) -> {valid:true}', () => {
  const D = { targets: [{ id: 't1', name: 'Dana Darurat', amount: 1000, saved: 500 }] };
  const ctx = load(D);
  const result = ctx.lifeOSObjectRefValidate({ domain: 'goal', id: 'target:t1' });
  assert.equal(result.valid, true);
  assert.equal(result.error, undefined);
});

test('lifeOSObjectRefValidate(): sourceRef null/bukan object -> valid:false + error', () => {
  const ctx = load({});
  assert.equal(ctx.lifeOSObjectRefValidate(null).valid, false);
  assert.equal(ctx.lifeOSObjectRefValidate(undefined).valid, false);
  assert.equal(ctx.lifeOSObjectRefValidate('goal:t1').valid, false);
});

test('lifeOSObjectRefValidate(): domain tidak terdaftar (mis. referensi Life Object lain / wildcard) -> valid:false + error', () => {
  const ctx = load({});
  const result = ctx.lifeOSObjectRefValidate({ domain: 'lifeObject', id: 'obj1' });
  assert.equal(result.valid, false);
  assert.match(result.error, /tidak terdaftar/);
});

test('lifeOSObjectRefValidate(): id kosong -> valid:false + error', () => {
  const ctx = load({});
  const result = ctx.lifeOSObjectRefValidate({ domain: 'goal', id: '' });
  assert.equal(result.valid, false);
  assert.match(result.error, /id wajib diisi/);
});

test('lifeOSObjectRefValidate(): id tidak ketemu di domain (exists() false) -> valid:false + error', () => {
  const D = { targets: [] };
  const ctx = load(D);
  const result = ctx.lifeOSObjectRefValidate({ domain: 'goal', id: 'target:tidak-ada' });
  assert.equal(result.valid, false);
  assert.match(result.error, /tidak ditemukan/);
});

test('lifeOSObjectRefValidate(): TIDAK PERNAH menulis apa pun — LifeOSStore.knowledge tetap kosong setelah validate dipanggil berkali-kali', async () => {
  const ctx = await loadWithStore({}, {});
  ctx.lifeOSObjectRefValidate({ domain: 'knowledge', id: 'k-tidak-ada' });
  ctx.lifeOSObjectRefValidate({ domain: 'review', id: 'r-tidak-ada' });
  assert.deepEqual(ctx.lifeOSGetStore().knowledge, []);
  assert.deepEqual(ctx.lifeOSGetStore().reviewLog, []);
});
