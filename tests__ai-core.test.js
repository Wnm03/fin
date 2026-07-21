'use strict';
// tests/ai-core.test.js — modules/ai/ai-core.js (Sesi 1/6 Smart Delivery
// Engine: AIBus + AIStore + AIContext). Fondasi murni, belum ada fitur —
// test ini memastikan 3 lapisan itu berperilaku sama seperti pola
// eie-bus.js/eie-store.js yang sudah terbukti (bus tidak crash app kalau 1
// listener error, store merge dgn default supaya field baru sesi
// berikutnya tidak `undefined` di data lama user, context read-only).
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function loadAiCore(idbData) {
  const idbCalls = [];
  const fakeIDBStore = {
    async get(key) {
      idbCalls.push(['get', key]);
      return idbData;
    },
    async set(key, value) {
      idbCalls.push(['set', key, value]);
      return true;
    },
  };
  const ctx = loadSource(
    ['modules/ai/ai-core.js'],
    { IDBStore: fakeIDBStore, D: { some: 'thing' } },
    ['AIBus', 'AIStore', 'AIContext', 'aiLoad', 'aiEnsureLoaded', 'aiSave', 'aiGetStore', 'aiInvalidateCache'],
  );
  return { ctx, idbCalls };
}

test('AIBus — on/emit memanggil listener dengan payload yang benar', () => {
  const { ctx } = loadAiCore(undefined);
  const received = [];
  ctx.AIBus.on('ai:test-event', (payload) => received.push(payload));
  ctx.AIBus.emit('ai:test-event', { foo: 'bar' });
  assert.deepEqual(received, [{ foo: 'bar' }]);
});

test('AIBus — off() menghentikan listener, listener lain tidak terganggu', () => {
  const { ctx } = loadAiCore(undefined);
  const received = [];
  const unsubscribe = ctx.AIBus.on('ai:test-event', () => received.push('a'));
  ctx.AIBus.on('ai:test-event', () => received.push('b'));
  unsubscribe();
  ctx.AIBus.emit('ai:test-event', {});
  assert.deepEqual(received, ['b']);
});

test('AIBus — error di satu listener tidak menghentikan listener lain / tidak melempar', () => {
  const { ctx } = loadAiCore(undefined);
  const received = [];
  ctx.AIBus.on('ai:test-event', () => { throw new Error('boom'); });
  ctx.AIBus.on('ai:test-event', () => received.push('ok'));
  assert.doesNotThrow(() => ctx.AIBus.emit('ai:test-event', {}));
  assert.deepEqual(received, ['ok']);
});

test('AIBus — emit ke event tanpa listener tidak error', () => {
  const { ctx } = loadAiCore(undefined);
  assert.doesNotThrow(() => ctx.AIBus.emit('ai:tidak-ada-listener', {}));
});

test('aiLoad — data kosong (belum pernah save) fallback ke default lengkap', async () => {
  const { ctx, idbCalls } = loadAiCore(undefined);
  const store = await ctx.aiLoad();
  // JSON.stringify, bukan deepEqual langsung: store berasal dari vm sandbox
  // (realm berbeda dari literal test), deepStrictEqual node menolak
  // membandingkan objek lintas-realm walau strukturnya identik.
  assert.equal(JSON.stringify(store), JSON.stringify({
    decisionLog: [], recommendations: [], learningData: {},
    ruleCooldowns: {}, lastRunAt: null,
  }));
  assert.deepEqual(idbCalls, [['get', 'ai:store']]);
});

test('aiLoad — data lama (field parsial) di-merge dengan default, tidak hilang & tidak undefined', async () => {
  const { ctx } = loadAiCore({ decisionLog: [{ id: 1 }], lastRunAt: '2026-01-01T00:00:00.000Z' });
  const store = await ctx.aiLoad();
  assert.equal(JSON.stringify(store.decisionLog), JSON.stringify([{ id: 1 }]));
  assert.equal(store.lastRunAt, '2026-01-01T00:00:00.000Z');
  // Field yang tidak ada di data lama tetap dapat default, bukan undefined.
  assert.equal(JSON.stringify(store.recommendations), '[]');
  assert.equal(JSON.stringify(store.learningData), '{}');
  assert.equal(JSON.stringify(store.ruleCooldowns), '{}');
});

test('aiEnsureLoaded — hanya load dari IDBStore SEKALI walau dipanggil berkali-kali', async () => {
  const { ctx, idbCalls } = loadAiCore({ decisionLog: [] });
  await ctx.aiEnsureLoaded();
  await ctx.aiEnsureLoaded();
  await ctx.aiEnsureLoaded();
  const getCalls = idbCalls.filter((c) => c[0] === 'get');
  assert.equal(getCalls.length, 1);
});

test('aiInvalidateCache — setelah invalidate, aiEnsureLoaded load ulang dari IDBStore', async () => {
  const { ctx, idbCalls } = loadAiCore({ decisionLog: [] });
  await ctx.aiEnsureLoaded();
  ctx.aiInvalidateCache();
  await ctx.aiEnsureLoaded();
  const getCalls = idbCalls.filter((c) => c[0] === 'get');
  assert.equal(getCalls.length, 2);
});

test('aiSave — menulis state AIStore saat ini ke IDBStore dengan key ai:store', async () => {
  const { ctx, idbCalls } = loadAiCore({ decisionLog: [] });
  await ctx.aiLoad();
  ctx.aiGetStore().lastRunAt = '2026-07-18T00:00:00.000Z';
  await ctx.aiSave();
  const setCall = idbCalls.find((c) => c[0] === 'set');
  assert.ok(setCall, 'aiSave harus memanggil IDBStore.set');
  assert.equal(setCall[1], 'ai:store');
  assert.equal(setCall[2].lastRunAt, '2026-07-18T00:00:00.000Z');
});

test('aiGetStore — mengembalikan referensi AIStore yang sama, bukan salinan', async () => {
  const { ctx } = loadAiCore({ decisionLog: [] });
  const loaded = await ctx.aiLoad();
  const got = ctx.aiGetStore();
  assert.equal(got, loaded);
});

test('AIContext.snapshot — read-only, tidak menulis apa pun, berisi generatedAt & hasAppData', () => {
  const { ctx } = loadAiCore(undefined);
  const snap = ctx.AIContext.snapshot();
  assert.equal(typeof snap.generatedAt, 'string');
  assert.equal(snap.hasAppData, true);
});

test('AIContext.snapshot — hasAppData false kalau D tidak ada', () => {
  const idbData = undefined;
  const ctx = loadSource(
    ['modules/ai/ai-core.js'],
    { IDBStore: { get: async () => idbData, set: async () => true } },
    ['AIContext'],
  );
  const snap = ctx.AIContext.snapshot();
  assert.equal(snap.hasAppData, false);
});
