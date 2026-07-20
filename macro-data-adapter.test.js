'use strict';
// tests/macro-data-adapter.test.js — Test MacroDataAdapter, khusus fase 2:
// refresh() sekarang benar2 auto-fetch 2 indikator (usdidr via API publik,
// ihsg via AI+web search) alih2 cuma fallback cache seperti fase 1. Fokus
// test: kedua auto-fetch guard SENDIRI2 (gagal satu tidak menghalangi yang
// lain / tidak melempar ke caller), validasi rentang nilai wajar sebelum
// ditulis ke store, dan skip diam2 kalau prasyaratnya tidak ada (fetch/AI
// key belum ada) — bukan re-implementasi rumus, load source ASLI (pola sama
// seperti test EIE lain, lihat tests/helpers/loadSource.js).
const { test } = require('node:test');
const assert = require('node:assert');
const { loadSource } = require('../helpers/loadSource');

function makeFakeIDBStore(initial = {}) {
  const data = { ...initial };
  return {
    async get(key) { return data[key]; },
    async set(key, value) { data[key] = value; return true; },
    _raw: data,
  };
}

function loadAdapter({ storeSeed = {}, fetchImpl, callAIProviderRawImpl, D } = {}) {
  const IDBStore = makeFakeIDBStore(storeSeed);
  const extraGlobals = { IDBStore };
  if (fetchImpl) extraGlobals.fetch = fetchImpl;
  if (callAIProviderRawImpl) extraGlobals.callAIProviderRaw = callAIProviderRawImpl;
  if (D) extraGlobals.D = D;
  const ctx = loadSource(
    [
      'economic-intelligence/eie-bus.js',
      'economic-intelligence/eie-store.js',
      'economic-intelligence/adapters/macro-data-adapter.js',
    ],
    extraGlobals,
    ['MacroDataAdapter', 'eieGetStore', 'eieEnsureLoaded'],
  );
  return { ctx, IDBStore };
}

test('MacroDataAdapter._autoFetchUsdIdr() — sukses: tulis ke cache dgn source auto-api', async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({ result: 'success', rates: { IDR: 16321 } }),
  });
  const { ctx } = loadAdapter({ fetchImpl });
  await ctx.eieEnsureLoaded();
  const snap = await ctx.MacroDataAdapter._autoFetchUsdIdr();
  assert.ok(snap, 'harus balikin snapshot kalau fetch sukses');
  assert.strictEqual(snap.value, 16321);
  const cache = ctx.MacroDataAdapter.getLatest();
  assert.strictEqual(cache.usdidr.source, 'auto-api');
  assert.strictEqual(cache.usdidr.isStale, false);
});

test('MacroDataAdapter._autoFetchUsdIdr() — gagal (network error): tidak melempar, balikin null, cache tidak berubah', async () => {
  const fetchImpl = async () => { throw new Error('offline'); };
  const { ctx } = loadAdapter({ fetchImpl });
  await ctx.eieEnsureLoaded();
  const snap = await ctx.MacroDataAdapter._autoFetchUsdIdr();
  assert.strictEqual(snap, null);
  const cache = ctx.MacroDataAdapter.getLatest();
  assert.strictEqual(cache.usdidr.source, 'seed-belum-disinkron', 'gagal fetch -> tetap fallback seed/cache lama');
});

test('MacroDataAdapter._autoFetchUsdIdr() — nilai di luar rentang wajar (mis. API ngaco/rusak) ditolak, tidak ditulis ke store', async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({ result: 'success', rates: { IDR: 1 } }), // jelas tidak masuk akal
  });
  const { ctx } = loadAdapter({ fetchImpl });
  await ctx.eieEnsureLoaded();
  const snap = await ctx.MacroDataAdapter._autoFetchUsdIdr();
  assert.strictEqual(snap, null);
  const cache = ctx.MacroDataAdapter.getLatest();
  assert.strictEqual(cache.usdidr.source, 'seed-belum-disinkron');
});

test('MacroDataAdapter._autoFetchIhsgViaAI() — tanpa API key AI (D.profile.apiKey kosong): diam2 skip, tidak error', async () => {
  const D = { profile: {} };
  const { ctx } = loadAdapter({ D });
  await ctx.eieEnsureLoaded();
  const snap = await ctx.MacroDataAdapter._autoFetchIhsgViaAI();
  assert.strictEqual(snap, null);
});

test('MacroDataAdapter._autoFetchIhsgViaAI() — dgn API key & balasan AI valid: parse JSON, tulis ke cache source auto-ai', async () => {
  const D = { profile: { apiKey: 'sk-test-123', apiProvider: 'claude' } };
  const callAIProviderRawImpl = async () => ({ ok: true, text: '{"value": 7345.6}' });
  const { ctx } = loadAdapter({ D, callAIProviderRawImpl });
  await ctx.eieEnsureLoaded();
  const snap = await ctx.MacroDataAdapter._autoFetchIhsgViaAI();
  assert.ok(snap);
  assert.strictEqual(snap.value, 7345.6);
  const cache = ctx.MacroDataAdapter.getLatest();
  assert.strictEqual(cache.ihsg.source, 'auto-ai');
});

test('MacroDataAdapter._autoFetchIhsgViaAI() — balasan AI dibungkus markdown code-fence tetap bisa diparse', async () => {
  const D = { profile: { apiKey: 'sk-test-123' } };
  const callAIProviderRawImpl = async () => ({ ok: true, text: '```json\n{"value": 7200.1}\n```' });
  const { ctx } = loadAdapter({ D, callAIProviderRawImpl });
  await ctx.eieEnsureLoaded();
  const snap = await ctx.MacroDataAdapter._autoFetchIhsgViaAI();
  assert.ok(snap);
  assert.strictEqual(snap.value, 7200.1);
});

test('MacroDataAdapter._autoFetchIhsgViaAI() — balasan AI di luar rentang wajar (mis. halusinasi) ditolak', async () => {
  const D = { profile: { apiKey: 'sk-test-123' } };
  const callAIProviderRawImpl = async () => ({ ok: true, text: '{"value": 999999}' });
  const { ctx } = loadAdapter({ D, callAIProviderRawImpl });
  await ctx.eieEnsureLoaded();
  const snap = await ctx.MacroDataAdapter._autoFetchIhsgViaAI();
  assert.strictEqual(snap, null);
  const cache = ctx.MacroDataAdapter.getLatest();
  assert.strictEqual(cache.ihsg.source, 'seed-belum-disinkron', 'nilai halusinasi tidak boleh ditulis ke store');
});

test('MacroDataAdapter._autoFetchIhsgViaAI() — callAIProviderRaw gagal (mis. API key salah): tidak melempar, balikin null', async () => {
  const D = { profile: { apiKey: 'sk-salah' } };
  const callAIProviderRawImpl = async () => ({ ok: false, errMsg: 'HTTP 401' });
  const { ctx } = loadAdapter({ D, callAIProviderRawImpl });
  await ctx.eieEnsureLoaded();
  const snap = await ctx.MacroDataAdapter._autoFetchIhsgViaAI();
  assert.strictEqual(snap, null);
});

test('MacroDataAdapter.refresh() — 1 indikator gagal tidak menghalangi yang lain (Promise.allSettled), selalu balikin getLatest()', async () => {
  const D = { profile: { apiKey: 'sk-test-123' } };
  const fetchImpl = async () => ({ ok: true, json: async () => ({ result: 'success', rates: { IDR: 16400 } }) });
  const callAIProviderRawImpl = async () => { throw new Error('AI down'); };
  const { ctx } = loadAdapter({ D, fetchImpl, callAIProviderRawImpl });
  await ctx.eieEnsureLoaded();
  const latest = await ctx.MacroDataAdapter.refresh();
  assert.strictEqual(latest.usdidr.source, 'auto-api', 'usdidr tetap sukses walau ihsg (AI) gagal');
  assert.strictEqual(latest.ihsg.source, 'seed-belum-disinkron', 'ihsg gagal -> fallback seed, tidak ikut gagalkan refresh() keseluruhan');
});

test('MacroDataAdapter.refresh() — tanpa fetch/D sama sekali (lingkungan lama) tetap tidak melempar, balikin cache seed', async () => {
  const { ctx } = loadAdapter({});
  await ctx.eieEnsureLoaded();
  const latest = await ctx.MacroDataAdapter.refresh();
  assert.strictEqual(latest.usdidr.source, 'seed-belum-disinkron');
  assert.strictEqual(latest.ihsg.source, 'seed-belum-disinkron');
});
