'use strict';
// tests/lifeos-project-adapter.test.js — projectAdapterList()/
// projectAdapterFindOne() (lifeos/adapters/project-adapter.js). Fokus:
// (1) bagian legacy (renovasi) SEKARANG registry-driven — dibaca dari
// LIFEOS_PROJECT_LEGACY_SOURCE (lifeos-registry.js), dispatch ke
// PROJECT_LEGACY_SOURCE_BUILDERS per `key`, bukan hardcode string
// 'renovasi'/'business'/'renovProjects' di badan fungsi — sama pola dgn
// tests/lifeos-goal-adapter.test.js; (2) bagian generic
// (LifeOSStore.projects) TIDAK berubah sama sekali; (3) output digabung
// [...legacy, ...generic] persis seperti sebelum migrasi (0 perubahan
// bentuk data).
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/loadSource');

function load() {
  return loadSource(
    ['lifeos/lifeos-registry.js', 'lifeos/adapters/project-adapter.js'],
    {},
    ['LIFEOS_PROJECT_LEGACY_SOURCE', 'PROJECT_LEGACY_SOURCE_BUILDERS'],
  );
}

test('projectAdapterList(): registry-driven — key legacy dibaca dari LIFEOS_PROJECT_LEGACY_SOURCE, builder terdaftar di PROJECT_LEGACY_SOURCE_BUILDERS', () => {
  const ctx = load();
  assert.equal(ctx.LIFEOS_PROJECT_LEGACY_SOURCE.key, 'renovasi');
  assert.equal(typeof ctx.PROJECT_LEGACY_SOURCE_BUILDERS[ctx.LIFEOS_PROJECT_LEGACY_SOURCE.key], 'function');
});

test('projectAdapterList(): legacy (renovasi) dipetakan dari D[dArr registry], bukan hardcode nama array', () => {
  const ctx = load();
  const D = {
    renovProjects: [
      { id: 'r1', name: 'Renovasi Kios A', createdAt: '2026-01-01', items: [{ id: 'i1' }, { id: 'i2' }] },
    ],
  };
  const result = ctx.projectAdapterList(D, {});
  const p = result.find((x) => x.kind === 'renovasi');
  assert.equal(p.id, 'renovasi:r1');
  assert.equal(p.name, 'Renovasi Kios A');
  assert.equal(p.areaKey, 'business');
  assert.equal(p.status, 'active');
  assert.equal(p.checklistCount, 2);
  assert.equal(p.sourceRef.arr, 'renovProjects');
  assert.equal(p.sourceRef.id, 'r1');
});

test('projectAdapterList(): kalau LIFEOS_PROJECT_LEGACY_SOURCE.key diganti ke key tanpa builder terdaftar, sumber legacy dilewati aman (tidak throw, hasil kosong)', () => {
  const ctx = load();
  ctx.LIFEOS_PROJECT_LEGACY_SOURCE.key = 'belumAda';
  const D = { renovProjects: [{ id: 'r1', name: 'Renovasi X', items: [] }] };
  assert.doesNotThrow(() => ctx.projectAdapterList(D, {}));
  const result = ctx.projectAdapterList(D, {});
  assert.equal(result.some((p) => p.kind === 'renovasi'), false);
});

test('projectAdapterList(): kalau dArr di registry diganti, adapter otomatis ikut baca array D yang baru (bukti benar-benar dibaca dari registry, bukan hardcode)', () => {
  const ctx = load();
  ctx.LIFEOS_PROJECT_LEGACY_SOURCE.dArr = 'renovProjectsBaru';
  const D = { renovProjectsBaru: [{ id: 'r9', name: 'Sumber Baru', items: [] }] };
  const result = ctx.projectAdapterList(D, {});
  const p = result.find((x) => x.kind === 'renovasi');
  assert.equal(p.id, 'renovasi:r9');
  assert.equal(p.sourceRef.arr, 'renovProjectsBaru');
  assert.equal(p.sourceRef.id, 'r9');
});

test('projectAdapterList(): D kosong/belum ada -> legacy kosong, tidak throw', () => {
  const ctx = load();
  assert.doesNotThrow(() => ctx.projectAdapterList({}, {}));
  assert.equal(ctx.projectAdapterList({}, {}).length, 0);
});

test('projectAdapterList(): generic (LifeOSStore.projects) TIDAK berubah — tetap dipetakan apa adanya, tidak lewat registry', () => {
  const ctx = load();
  const store = {
    projects: [
      { id: 'g1', name: 'Proyek Generik', areaKey: 'family', status: 'planned', dueDate: '2026-08-01', createdAt: '2026-02-01', checklist: [{ id: 'c1' }] },
    ],
  };
  const result = ctx.projectAdapterList({}, store);
  const p = result.find((x) => x.kind === 'generic');
  assert.equal(p.id, 'generic:g1');
  assert.equal(p.name, 'Proyek Generik');
  assert.equal(p.areaKey, 'family');
  assert.equal(p.status, 'planned');
  assert.equal(p.dueDate, '2026-08-01');
  assert.equal(p.checklistCount, 1);
  assert.equal(p.sourceRef, null);
});

test('projectAdapterList(): hasil gabungan = [...legacy, ...generic], urutan tetap sama seperti sebelum migrasi', () => {
  const ctx = load();
  const D = { renovProjects: [{ id: 'r1', name: 'Legacy', items: [] }] };
  const store = { projects: [{ id: 'g1', name: 'Generic', areaKey: 'finance', status: 'active' }] };
  const result = ctx.projectAdapterList(D, store);
  assert.equal(result.map((p) => p.kind).join(','), 'renovasi,generic');
});

test('projectAdapterFindOne(): balikin 1 project sesuai id gabungan (legacy maupun generic), null kalau tidak ketemu', () => {
  const ctx = load();
  const D = { renovProjects: [{ id: 'r1', name: 'Legacy', items: [] }] };
  const store = { projects: [{ id: 'g1', name: 'Generic', areaKey: 'finance', status: 'active' }] };
  assert.equal(ctx.projectAdapterFindOne(D, store, 'renovasi:r1').name, 'Legacy');
  assert.equal(ctx.projectAdapterFindOne(D, store, 'generic:g1').name, 'Generic');
  assert.equal(ctx.projectAdapterFindOne(D, store, 'tidak-ada'), null);
});
