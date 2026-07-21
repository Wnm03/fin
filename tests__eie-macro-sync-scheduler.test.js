'use strict';
// tests/eie-macro-sync-scheduler.test.js — MacroSyncService
// (services/macro-sync-service.js) & EIEScheduler (scheduler/eie-scheduler.js).
// Keduanya sebelumnya 0 test. Tipis (orkestrasi), tapi EIEScheduler jadi
// satu2nya titik masuk kalau nanti FASE 2 background-refresh diaktifkan
// (lihat catatan "BELUM DIKERJAKAN" di docs/CATATAN-CEK-CLAUDE.md) --
// penting dipastikan start()/stop()/isRunning() tidak dobel-timer dan
// error di tengah recompute tidak bikin app crash.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function loadMacroSync(overrides = {}) {
  const calls = [];
  const ctx = loadSource(
    ['economic-intelligence/services/macro-sync-service.js'],
    {
      eieEnsureLoaded: async () => calls.push('ensureLoaded'),
      MacroDataAdapter: { refresh: async () => calls.push('refresh') },
      EIEScoringEngine: { recomputeAndPersist: async () => { calls.push('recompute'); return { snapshot: {}, insights: [] }; } },
      ...overrides,
    },
    ['MacroSyncService'],
  );
  return { MacroSyncService: ctx.MacroSyncService, calls };
}

test('syncAndRecompute — urutan: ensureLoaded -> refresh macro -> recomputeAndPersist, dalam urutan itu', async () => {
  const { MacroSyncService, calls } = loadMacroSync();
  const result = await MacroSyncService.syncAndRecompute();
  assert.deepEqual(calls, ['ensureLoaded', 'refresh', 'recompute']);
  assert.deepEqual(result, { snapshot: {}, insights: [] });
});

test('recomputeOnly — TIDAK memanggil refresh macro sama sekali, langsung recompute dari cache', async () => {
  const { MacroSyncService, calls } = loadMacroSync();
  await MacroSyncService.recomputeOnly();
  assert.deepEqual(calls, ['ensureLoaded', 'recompute']);
});

test('syncAndRecompute — kalau MacroDataAdapter.refresh() gagal (reject), recomputeAndPersist TIDAK ikut terpanggil', async () => {
  const { MacroSyncService, calls } = loadMacroSync({
    MacroDataAdapter: { refresh: async () => { calls.push('refresh'); throw new Error('gagal fetch'); } },
  });
  await assert.rejects(() => MacroSyncService.syncAndRecompute(), /gagal fetch/);
  assert.deepEqual(calls, ['ensureLoaded', 'refresh']);
});

// --- EIEScheduler ---

function loadScheduler(recomputeOnlyImpl) {
  const timers = {}; // id -> callback
  let nextId = 1;
  const warnings = [];
  const ctx = loadSource(
    ['economic-intelligence/scheduler/eie-scheduler.js'],
    {
      MacroSyncService: { recomputeOnly: recomputeOnlyImpl || (async () => {}) },
      setInterval: (fn) => { const id = nextId++; timers[id] = fn; return id; },
      clearInterval: (id) => { delete timers[id]; },
      console: { warn: (...a) => warnings.push(a) },
    },
    ['EIEScheduler'],
  );
  return { EIEScheduler: ctx.EIEScheduler, timers, warnings, fire: (id) => timers[id] && timers[id]() };
}

test('EIEScheduler — belum start(), isRunning() false; setelah start() jadi true', () => {
  const { EIEScheduler } = loadScheduler();
  assert.equal(EIEScheduler.isRunning(), false);
  EIEScheduler.start();
  assert.equal(EIEScheduler.isRunning(), true);
});

test('EIEScheduler.start — dipanggil 2x tidak membuat timer kedua (tidak dobel-polling)', () => {
  const { EIEScheduler, timers } = loadScheduler();
  EIEScheduler.start();
  EIEScheduler.start();
  assert.equal(Object.keys(timers).length, 1);
});

test('EIEScheduler.stop — menghentikan timer, isRunning() jadi false lagi', () => {
  const { EIEScheduler, timers } = loadScheduler();
  EIEScheduler.start();
  EIEScheduler.stop();
  assert.equal(EIEScheduler.isRunning(), false);
  assert.equal(Object.keys(timers).length, 0);
});

test('EIEScheduler.stop — dipanggil padahal belum start() tidak throw (no-op aman)', () => {
  const { EIEScheduler } = loadScheduler();
  assert.doesNotThrow(() => EIEScheduler.stop());
});

test('EIEScheduler — saat timer "menyala", memanggil MacroSyncService.recomputeOnly()', () => {
  let called = false;
  const { EIEScheduler, timers, fire } = loadScheduler(async () => { called = true; });
  EIEScheduler.start();
  const id = Object.keys(timers)[0];
  fire(id);
  assert.equal(called, true);
});

test('EIEScheduler — recomputeOnly() gagal (reject) di dalam timer TIDAK melempar unhandled, cuma di-warn', async () => {
  const { EIEScheduler, timers, warnings, fire } = loadScheduler(async () => { throw new Error('boom'); });
  EIEScheduler.start();
  const id = Object.keys(timers)[0];
  fire(id);
  // beri kesempatan microtask promise rejection ke-catch sebelum diassert
  await new Promise((r) => setImmediate(r));
  assert.equal(warnings.length, 1);
});
