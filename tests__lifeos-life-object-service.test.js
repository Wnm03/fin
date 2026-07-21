'use strict';
// tests/lifeos-life-object-service.test.js — lifeObjectServiceCreate/Update/
// Delete/Get/List (lifeos/services/life-object-service.js). Sesi 58 (Batch
// 4, lanjutan Sesi 57 — registry+resolver+validator sourceRef). Scope MVP:
// CRUD service layer Life Object, HANYA kind:"generic"|"ref" (kind lain
// ditolak eksplisit), TIDAK ada UI baru (lihat docs/NEXT_SESSION.md) — jadi
// file test ini berdiri sendiri (tidak dipasangkan dgn *-ui.test.js seperti
// project/review/knowledge, karena memang tidak ada UI di sesi ini).
//
// Fokus test:
// (1) create(): kind:'generic' default (sourceRef selalu null, kind:'ref'
//     dipaksa sourceRef ikut sourceRef yg dioper), field wajib (name/
//     areaKey) & kind tak dikenal ditolak sebelum menulis apa pun;
// (2) create() kind:'ref': WAJIB lolos lifeOSObjectRefValidate() (reuse
//     penuh dari lifeos-object-ref.js, 0 duplikasi logic validasi) —
//     sourceRef invalid/kosong -> {valid:false,error}, TIDAK PERNAH
//     menulis ke store.objects, TIDAK PERNAH memanggil lifeOSSave();
// (3) update(): partial update (field yg tidak dioper tetap nilai lama),
//     ganti kind generic<->ref ikut aturan sourceRef yg sama dgn create(),
//     validasi gagal -> object TIDAK berubah sama sekali (bukan partial
//     mutation), TIDAK memanggil lifeOSSave(); id tidak ketemu -> error;
// (4) delete()/get()/list(): pola sama dgn project-service.js (delete
//     filter by id, tidak throw kalau id tidak ada; get() null kalau tidak
//     ketemu; list() salinan array store.objects apa adanya).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const FILES = [
  'lifeos/lifeos-registry.js',
  'lifeos/adapters/goal-adapter.js',
  'lifeos/adapters/project-adapter.js',
  'lifeos/adapters/knowledge-adapter.js',
  'lifeos/lifeos-object-ref.js',
  'lifeos/services/life-object-service.js',
];

const EXPOSE = [
  'LIFEOS_OBJECT_REF_SOURCES',
  'lifeObjectServiceCreate',
  'lifeObjectServiceUpdate',
  'lifeObjectServiceDelete',
  'lifeObjectServiceGet',
  'lifeObjectServiceList',
];

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

function load({ D = {}, lifeOSGetStore, lifeOSSave, uidSeq } = {}) {
  let uidCounter = 0;
  return loadSource(FILES, {
    D,
    lifeOSGetStore,
    lifeOSSave,
    uid: () => (uidSeq ? uidSeq[uidCounter++] : `uid-${++uidCounter}`),
  }, EXPOSE);
}

// ---------------------------------------------------------------------
// create() — kind:'generic'
// ---------------------------------------------------------------------

test('lifeObjectServiceCreate(): kind default "generic" -> sourceRef null, field lengkap tersimpan, lifeOSSave() 1x', async () => {
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const ctx = load({ lifeOSGetStore, lifeOSSave, uidSeq: ['o1'] });

  const result = await ctx.lifeObjectServiceCreate({ name: 'Wishlist Umroh', areaKey: 'spiritual' });
  assert.equal(result.valid, true);
  assert.equal(result.object.id, 'o1');
  assert.equal(result.object.name, 'Wishlist Umroh');
  assert.equal(result.object.areaKey, 'spiritual');
  assert.equal(result.object.kind, 'generic');
  assert.equal(result.object.sourceRef, null);
  assert.equal(typeof result.object.createdAt, 'string');
  assert.equal(store.objects.length, 1);
  assert.equal(saveCalls.length, 1);
});

test('lifeObjectServiceCreate(): kind:"generic" eksplisit dgn sourceRef "nyasar" ikut dioper -> tetap dipaksa null (diabaikan)', async () => {
  const { store, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const ctx = load({ lifeOSGetStore, lifeOSSave, uidSeq: ['o1'] });

  const result = await ctx.lifeObjectServiceCreate({
    name: 'X', areaKey: 'finance', kind: 'generic', sourceRef: { domain: 'goal', id: 'target:t1' },
  });
  assert.equal(result.valid, true);
  assert.equal(result.object.sourceRef, null);
  assert.equal(store.objects[0].sourceRef, null);
});

test('lifeObjectServiceCreate(): name kosong -> {valid:false,error}, TIDAK menulis, TIDAK memanggil lifeOSSave()', async () => {
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const ctx = load({ lifeOSGetStore, lifeOSSave });

  const result = await ctx.lifeObjectServiceCreate({ name: '', areaKey: 'finance' });
  assert.equal(result.valid, false);
  assert.match(result.error, /name wajib diisi/);
  assert.equal(store.objects.length, 0);
  assert.equal(saveCalls.length, 0);
});

test('lifeObjectServiceCreate(): areaKey kosong -> {valid:false,error}, TIDAK menulis', async () => {
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const ctx = load({ lifeOSGetStore, lifeOSSave });

  const result = await ctx.lifeObjectServiceCreate({ name: 'X', areaKey: '' });
  assert.equal(result.valid, false);
  assert.match(result.error, /areaKey wajib diisi/);
  assert.equal(store.objects.length, 0);
  assert.equal(saveCalls.length, 0);
});

test('lifeObjectServiceCreate(): kind tidak dikenal (mis. "plugin") -> {valid:false,error}, TIDAK menulis (kind lain belum didesain)', async () => {
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const ctx = load({ lifeOSGetStore, lifeOSSave });

  const result = await ctx.lifeObjectServiceCreate({ name: 'X', areaKey: 'finance', kind: 'plugin' });
  assert.equal(result.valid, false);
  assert.match(result.error, /tidak didukung/);
  assert.equal(store.objects.length, 0);
  assert.equal(saveCalls.length, 0);
});

// ---------------------------------------------------------------------
// create() — kind:'ref' (reuse lifeOSObjectRefValidate())
// ---------------------------------------------------------------------

test('lifeObjectServiceCreate(): kind:"ref" dgn sourceRef valid (domain terdaftar & id ketemu) -> tersimpan apa adanya', async () => {
  const D = { targets: [{ id: 't1', name: 'Dana Darurat', amount: 1000, saved: 500 }] };
  const { store, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const ctx = load({ D, lifeOSGetStore, lifeOSSave, uidSeq: ['o1'] });

  const result = await ctx.lifeObjectServiceCreate({
    name: 'Link ke Goal', areaKey: 'finance', kind: 'ref', sourceRef: { domain: 'goal', id: 'target:t1' },
  });
  assert.equal(result.valid, true);
  assert.equal(result.object.kind, 'ref');
  assert.deepEqual(result.object.sourceRef, { domain: 'goal', id: 'target:t1' });
  assert.equal(store.objects.length, 1);
});

test('lifeObjectServiceCreate(): kind:"ref" domain tidak terdaftar -> {valid:false,error} dari lifeOSObjectRefValidate(), TIDAK membuat object', async () => {
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const ctx = load({ lifeOSGetStore, lifeOSSave });

  const result = await ctx.lifeObjectServiceCreate({
    name: 'X', areaKey: 'finance', kind: 'ref', sourceRef: { domain: 'lifeObject', id: 'obj1' },
  });
  assert.equal(result.valid, false);
  assert.match(result.error, /tidak terdaftar/);
  assert.equal(store.objects.length, 0);
  assert.equal(saveCalls.length, 0);
});

test('lifeObjectServiceCreate(): kind:"ref" id tidak ketemu di domain -> {valid:false,error}, TIDAK membuat object', async () => {
  const D = { targets: [] };
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const ctx = load({ D, lifeOSGetStore, lifeOSSave });

  const result = await ctx.lifeObjectServiceCreate({
    name: 'X', areaKey: 'finance', kind: 'ref', sourceRef: { domain: 'goal', id: 'target:tidak-ada' },
  });
  assert.equal(result.valid, false);
  assert.match(result.error, /tidak ditemukan/);
  assert.equal(store.objects.length, 0);
  assert.equal(saveCalls.length, 0);
});

test('lifeObjectServiceCreate(): kind:"ref" tanpa sourceRef (null) -> {valid:false,error}, TIDAK membuat object', async () => {
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const ctx = load({ lifeOSGetStore, lifeOSSave });

  const result = await ctx.lifeObjectServiceCreate({ name: 'X', areaKey: 'finance', kind: 'ref' });
  assert.equal(result.valid, false);
  assert.match(result.error, /sourceRef wajib diisi/);
  assert.equal(store.objects.length, 0);
  assert.equal(saveCalls.length, 0);
});

// ---------------------------------------------------------------------
// update()
// ---------------------------------------------------------------------

test('lifeObjectServiceUpdate(): partial update (hanya name) -> field lain tetap, lifeOSSave() 1x', async () => {
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([
    { id: 'o1', name: 'Lama', areaKey: 'finance', kind: 'generic', sourceRef: null, createdAt: '2026-01-01' },
  ]);
  const ctx = load({ lifeOSGetStore, lifeOSSave });

  const result = await ctx.lifeObjectServiceUpdate('o1', { name: 'Baru' });
  assert.equal(result.valid, true);
  assert.equal(result.object.name, 'Baru');
  assert.equal(result.object.areaKey, 'finance');
  assert.equal(result.object.kind, 'generic');
  assert.equal(saveCalls.length, 1);
});

test('lifeObjectServiceUpdate(): ganti kind generic -> ref dgn sourceRef valid -> tersimpan', async () => {
  const D = { targets: [{ id: 't1', name: 'Dana Darurat', amount: 1000, saved: 500 }] };
  const { store, lifeOSGetStore, lifeOSSave } = makeStoreHarness([
    { id: 'o1', name: 'X', areaKey: 'finance', kind: 'generic', sourceRef: null, createdAt: '2026-01-01' },
  ]);
  const ctx = load({ D, lifeOSGetStore, lifeOSSave });

  const result = await ctx.lifeObjectServiceUpdate('o1', { kind: 'ref', sourceRef: { domain: 'goal', id: 'target:t1' } });
  assert.equal(result.valid, true);
  assert.equal(result.object.kind, 'ref');
  assert.deepEqual(result.object.sourceRef, { domain: 'goal', id: 'target:t1' });
});

test('lifeObjectServiceUpdate(): ganti kind ref -> generic -> sourceRef dipaksa null', async () => {
  const { store, lifeOSGetStore, lifeOSSave } = makeStoreHarness([
    { id: 'o1', name: 'X', areaKey: 'finance', kind: 'ref', sourceRef: { domain: 'goal', id: 'target:t1' }, createdAt: '2026-01-01' },
  ]);
  const ctx = load({ lifeOSGetStore, lifeOSSave });

  const result = await ctx.lifeObjectServiceUpdate('o1', { kind: 'generic' });
  assert.equal(result.valid, true);
  assert.equal(result.object.kind, 'generic');
  assert.equal(result.object.sourceRef, null);
});

test('lifeObjectServiceUpdate(): sourceRef baru invalid (kind tetap "ref") -> {valid:false,error}, object TIDAK berubah sama sekali, TIDAK memanggil lifeOSSave()', async () => {
  const D = { targets: [{ id: 't1', name: 'Dana Darurat', amount: 1000, saved: 500 }] };
  const original = { id: 'o1', name: 'X', areaKey: 'finance', kind: 'ref', sourceRef: { domain: 'goal', id: 'target:t1' }, createdAt: '2026-01-01' };
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([{ ...original, sourceRef: { ...original.sourceRef } }]);
  const ctx = load({ D, lifeOSGetStore, lifeOSSave });

  const result = await ctx.lifeObjectServiceUpdate('o1', { sourceRef: { domain: 'goal', id: 'target:tidak-ada' } });
  assert.equal(result.valid, false);
  assert.match(result.error, /tidak ditemukan/);
  assert.deepEqual(store.objects[0], original);
  assert.equal(saveCalls.length, 0);
});

test('lifeObjectServiceUpdate(): id tidak ditemukan -> {valid:false,error}, tidak throw, TIDAK memanggil lifeOSSave()', async () => {
  const { saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([]);
  const ctx = load({ lifeOSGetStore, lifeOSSave });

  const result = await ctx.lifeObjectServiceUpdate('tidak-ada', { name: 'X' });
  assert.equal(result.valid, false);
  assert.match(result.error, /tidak ditemukan/);
  assert.equal(saveCalls.length, 0);
});

// ---------------------------------------------------------------------
// delete() / get() / list()
// ---------------------------------------------------------------------

test('lifeObjectServiceDelete(): object terhapus bersih by id, object lain tidak ikut terhapus; id tidak ketemu -> tidak throw, lifeOSSave() tetap dipanggil', async () => {
  const { store, saveCalls, lifeOSGetStore, lifeOSSave } = makeStoreHarness([
    { id: 'o1', name: 'A', areaKey: 'finance', kind: 'generic', sourceRef: null, createdAt: '2026-01-01' },
    { id: 'o2', name: 'B', areaKey: 'finance', kind: 'generic', sourceRef: null, createdAt: '2026-01-01' },
  ]);
  const ctx = load({ lifeOSGetStore, lifeOSSave });

  await ctx.lifeObjectServiceDelete('o1');
  assert.equal(store.objects.length, 1);
  assert.equal(store.objects[0].id, 'o2');
  assert.equal(saveCalls.length, 1);

  await assert.doesNotReject(ctx.lifeObjectServiceDelete('tidak-ada'));
  assert.equal(saveCalls.length, 2);
});

test('lifeObjectServiceGet(): ketemu -> return object apa adanya; tidak ketemu -> null', () => {
  const { lifeOSGetStore, lifeOSSave } = makeStoreHarness([
    { id: 'o1', name: 'A', areaKey: 'finance', kind: 'generic', sourceRef: null, createdAt: '2026-01-01' },
  ]);
  const ctx = load({ lifeOSGetStore, lifeOSSave });

  assert.equal(ctx.lifeObjectServiceGet('o1').name, 'A');
  assert.equal(ctx.lifeObjectServiceGet('tidak-ada'), null);
});

test('lifeObjectServiceList(): kembalikan semua objects apa adanya (salinan array)', () => {
  const { store, lifeOSGetStore, lifeOSSave } = makeStoreHarness([
    { id: 'o1', name: 'A', areaKey: 'finance', kind: 'generic', sourceRef: null, createdAt: '2026-01-01' },
    { id: 'o2', name: 'B', areaKey: 'business', kind: 'generic', sourceRef: null, createdAt: '2026-01-01' },
  ]);
  const ctx = load({ lifeOSGetStore, lifeOSSave });

  const list = ctx.lifeObjectServiceList();
  assert.equal(list.length, 2);
  assert.equal(list[0].id, 'o1');
  assert.equal(list[1].id, 'o2');
  assert.notEqual(list, store.objects); // salinan, bukan reference asli
});
