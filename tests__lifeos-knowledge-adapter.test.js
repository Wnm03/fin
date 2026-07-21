'use strict';
// tests/lifeos-knowledge-adapter.test.js — knowledgeAdapterCatatanRef()/
// knowledgeAdapterList()/knowledgeAdapterByTag() (lifeos/adapters/
// knowledge-adapter.js). Fokus: (1) knowledgeAdapterCatatanRef() SEKARANG
// registry-driven — dibaca dari LIFEOS_KNOWLEDGE_REF_SOURCE
// (lifeos-registry.js), dispatch ke KNOWLEDGE_REF_SOURCE_BUILDERS per
// `key`, bukan hardcode `D.catatan` di badan fungsi — pola sama dgn
// tests/lifeos-project-adapter.test.js (projectAdapterLegacyList() vs
// LIFEOS_PROJECT_LEGACY_SOURCE, 1 objek bukan array); (2) sumber existing
// (catatan) tetap menghasilkan bentuk output yang SAMA PERSIS dgn sebelum
// migrasi; (3) knowledgeAdapterList()/knowledgeAdapterByTag()
// (LifeOSStore.knowledge) TIDAK berubah sama sekali.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function load() {
  return loadSource(
    ['lifeos/lifeos-registry.js', 'lifeos/adapters/knowledge-adapter.js'],
    {},
    ['LIFEOS_KNOWLEDGE_REF_SOURCE', 'KNOWLEDGE_REF_SOURCE_BUILDERS'],
  );
}

test('knowledgeAdapterCatatanRef(): LIFEOS_KNOWLEDGE_REF_SOURCE.key punya builder di KNOWLEDGE_REF_SOURCE_BUILDERS', () => {
  const ctx = load();
  const builder = ctx.KNOWLEDGE_REF_SOURCE_BUILDERS[ctx.LIFEOS_KNOWLEDGE_REF_SOURCE.key];
  assert.equal(typeof builder, 'function');
});

test('knowledgeAdapterCatatanRef(): dibaca dari D[dArr registry], bukan hardcode "catatan"', () => {
  const ctx = load();
  const D = { catatan: { pinNote: 'rahasia', tags: ['a', 'b'] } };
  const result = ctx.knowledgeAdapterCatatanRef(D);
  assert.equal(result.pinNote, 'rahasia');
  assert.deepEqual(Array.from(result.tags), ['a', 'b']);
});

test('knowledgeAdapterCatatanRef(): D.catatan belum ada -> objek kosong, tidak throw', () => {
  const ctx = load();
  assert.doesNotThrow(() => ctx.knowledgeAdapterCatatanRef({}));
  assert.equal(Object.keys(ctx.knowledgeAdapterCatatanRef({})).length, 0);
});

test('knowledgeAdapterCatatanRef(): kalau dArr di registry diganti, adapter otomatis ikut baca array D yang baru (bukti benar-benar dibaca dari registry)', () => {
  const ctx = load();
  ctx.LIFEOS_KNOWLEDGE_REF_SOURCE.dArr = 'catatanBaru';
  const D = { catatanBaru: { pinNote: 'baru' } };
  const result = ctx.knowledgeAdapterCatatanRef(D);
  assert.equal(result.pinNote, 'baru');
});

test('knowledgeAdapterCatatanRef(): key registry tanpa builder terdaftar -> objek kosong, TIDAK throw', () => {
  const ctx = load();
  ctx.LIFEOS_KNOWLEDGE_REF_SOURCE.key = 'belumAda';
  const D = { catatan: { pinNote: 'rahasia' } };
  assert.doesNotThrow(() => ctx.knowledgeAdapterCatatanRef(D));
  assert.equal(Object.keys(ctx.knowledgeAdapterCatatanRef(D)).length, 0);
});

test('knowledgeAdapterList(): TIDAK berubah — sort terbaru dulu berdasar createdAt', () => {
  const ctx = load();
  const store = {
    knowledge: [
      { id: 'k1', createdAt: '2026-07-01T00:00:00Z', tags: ['x'] },
      { id: 'k2', createdAt: '2026-07-10T00:00:00Z', tags: ['y'] },
    ],
  };
  const result = ctx.knowledgeAdapterList(store);
  assert.equal(result[0].id, 'k2');
  assert.equal(result[1].id, 'k1');
});

test('knowledgeAdapterList(): LifeOSStore.knowledge belum ada -> array kosong, tidak throw', () => {
  const ctx = load();
  assert.doesNotThrow(() => ctx.knowledgeAdapterList({}));
  assert.equal(ctx.knowledgeAdapterList({}).length, 0);
});

test('knowledgeAdapterByTag(): TIDAK berubah — filter entry yang punya tag tsb, tetap terurut terbaru dulu', () => {
  const ctx = load();
  const store = {
    knowledge: [
      { id: 'k1', createdAt: '2026-07-01T00:00:00Z', tags: ['finance'] },
      { id: 'k2', createdAt: '2026-07-10T00:00:00Z', tags: ['health'] },
      { id: 'k3', createdAt: '2026-07-05T00:00:00Z', tags: ['finance', 'goal'] },
    ],
  };
  const result = ctx.knowledgeAdapterByTag(store, 'finance');
  assert.equal(result.length, 2);
  assert.equal(result[0].id, 'k3');
  assert.equal(result[1].id, 'k1');
});
