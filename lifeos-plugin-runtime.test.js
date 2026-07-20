'use strict';
// tests/lifeos-plugin-runtime.test.js — LifeOS Plugin Runtime MVP (Sesi 69,
// Batch 5, target eksplisit user: "Plugin Runtime" di atas Registry +
// Manifest + Loader yang sudah ada — TIDAK Marketplace, TIDAK Plugin UI
// baru). Fokus test:
// (1) load() — register manifest (reuse LifeOSPluginRegistry) + buat entri
//     runtime state='loaded'; manifest invalid tetap ditolak (delegasi ke
//     register(), 0 duplikasi validasi);
// (2) enable()/disable() — transisi state legal & ilegal, capability
//     validation (manifest.capabilities harus subset LIFEOS_PLUGIN_CAPABILITIES);
// (3) unload() — state akhir permanen dari state manapun, unregister dari
//     LifeOSPluginRegistry juga;
// (4) error isolation — hook onEnable/onDisable yang throw TIDAK merambat
//     ke pemanggil & TIDAK menjatuhkan plugin lain di runtime registry.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/loadSource');

const FILES = [
  'lifeos/lifeos-registry.js',
  'lifeos/plugins/lifeos-plugin-manifest.js',
  'lifeos/plugins/lifeos-plugin-validation.js',
  'lifeos/plugins/lifeos-plugin-registry.js',
  'lifeos/plugins/lifeos-plugin-loader.js',
  'lifeos/plugins/lifeos-plugin-runtime.js',
];

function load() {
  return loadSource(FILES, {}, [
    'LIFEOS_PLUGIN_CAPABILITIES',
    'LifeOSPluginRegistry',
    'LifeOSPluginRuntime',
  ]);
}

function validManifest(overrides = {}) {
  return { id: 'plugin-a', name: 'Plugin A', version: '1.0.0', ...overrides };
}

// ---------------------------------------------------------------------
// load()
// ---------------------------------------------------------------------

test('LifeOSPluginRuntime.load(): manifest valid -> registered ke LifeOSPluginRegistry + state "loaded"', () => {
  const ctx = load();
  const result = ctx.LifeOSPluginRuntime.load(validManifest());
  assert.equal(result.valid, true);
  assert.equal(ctx.LifeOSPluginRegistry.has('plugin-a'), true);
  assert.equal(ctx.LifeOSPluginRuntime.getState('plugin-a'), 'loaded');
});

test('LifeOSPluginRuntime.load(): manifest invalid -> ditolak, tidak ada entri runtime dibuat', () => {
  const ctx = load();
  const result = ctx.LifeOSPluginRuntime.load(validManifest({ version: 'bukan-semver' }));
  assert.equal(result.valid, false);
  assert.match(result.error, /semver/);
  assert.equal(ctx.LifeOSPluginRuntime.getState('plugin-a'), null);
});

test('LifeOSPluginRuntime.load(): id duplikat -> ditolak (delegasi ke LifeOSPluginRegistry.register())', () => {
  const ctx = load();
  ctx.LifeOSPluginRuntime.load(validManifest());
  const result = ctx.LifeOSPluginRuntime.load(validManifest({ name: 'Duplikat' }));
  assert.equal(result.valid, false);
  assert.match(result.error, /sudah terdaftar/);
});

// ---------------------------------------------------------------------
// enable() / disable() — state machine
// ---------------------------------------------------------------------

test('enable(): dari "loaded" -> "enabled"', () => {
  const ctx = load();
  ctx.LifeOSPluginRuntime.load(validManifest());
  const result = ctx.LifeOSPluginRuntime.enable('plugin-a');
  assert.equal(result.ok, true);
  assert.equal(result.state, 'enabled');
  assert.equal(ctx.LifeOSPluginRuntime.getState('plugin-a'), 'enabled');
  assert.equal(ctx.LifeOSPluginRuntime.isEnabled('plugin-a'), true);
});

test('disable(): dari "enabled" -> "disabled"', () => {
  const ctx = load();
  ctx.LifeOSPluginRuntime.load(validManifest());
  ctx.LifeOSPluginRuntime.enable('plugin-a');
  const result = ctx.LifeOSPluginRuntime.disable('plugin-a');
  assert.equal(result.ok, true);
  assert.equal(result.state, 'disabled');
  assert.equal(ctx.LifeOSPluginRuntime.isEnabled('plugin-a'), false);
});

test('enable(): re-enable dari "disabled" -> "enabled" lagi', () => {
  const ctx = load();
  ctx.LifeOSPluginRuntime.load(validManifest());
  ctx.LifeOSPluginRuntime.enable('plugin-a');
  ctx.LifeOSPluginRuntime.disable('plugin-a');
  const result = ctx.LifeOSPluginRuntime.enable('plugin-a');
  assert.equal(result.ok, true);
  assert.equal(result.state, 'enabled');
});

test('disable(): dari "loaded" (belum pernah enable) -> ditolak', () => {
  const ctx = load();
  ctx.LifeOSPluginRuntime.load(validManifest());
  const result = ctx.LifeOSPluginRuntime.disable('plugin-a');
  assert.equal(result.ok, false);
  assert.match(result.error, /tidak bisa disable/);
  assert.equal(ctx.LifeOSPluginRuntime.getState('plugin-a'), 'loaded');
});

test('enable(): dari "enabled" (sudah enabled) -> ditolak, bukan silent no-op', () => {
  const ctx = load();
  ctx.LifeOSPluginRuntime.load(validManifest());
  ctx.LifeOSPluginRuntime.enable('plugin-a');
  const result = ctx.LifeOSPluginRuntime.enable('plugin-a');
  assert.equal(result.ok, false);
  assert.match(result.error, /tidak bisa enable/);
});

test('enable()/disable()/unload(): id belum di-load -> ditolak dgn pesan jelas, tidak throw', () => {
  const ctx = load();
  const expected = 'Plugin "ghaib" belum di-load ke runtime';
  const r1 = ctx.LifeOSPluginRuntime.enable('ghaib');
  assert.equal(r1.ok, false);
  assert.equal(r1.error, expected);
  const r2 = ctx.LifeOSPluginRuntime.disable('ghaib');
  assert.equal(r2.ok, false);
  assert.equal(r2.error, expected);
  const r3 = ctx.LifeOSPluginRuntime.unload('ghaib');
  assert.equal(r3.ok, false);
  assert.equal(r3.error, expected);
});

// ---------------------------------------------------------------------
// unload() — state akhir permanen
// ---------------------------------------------------------------------

test('unload(): dari "loaded" -> unregister dari LifeOSPluginRegistry, entri runtime hilang', () => {
  const ctx = load();
  ctx.LifeOSPluginRuntime.load(validManifest());
  const result = ctx.LifeOSPluginRuntime.unload('plugin-a');
  assert.equal(result.ok, true);
  assert.equal(result.state, 'unloaded');
  assert.equal(ctx.LifeOSPluginRegistry.has('plugin-a'), false);
  assert.equal(ctx.LifeOSPluginRuntime.getState('plugin-a'), null);
});

test('unload(): dari "enabled" -> tetap bisa unload langsung (tidak wajib disable() dulu)', () => {
  const ctx = load();
  ctx.LifeOSPluginRuntime.load(validManifest());
  ctx.LifeOSPluginRuntime.enable('plugin-a');
  const result = ctx.LifeOSPluginRuntime.unload('plugin-a');
  assert.equal(result.ok, true);
  assert.equal(ctx.LifeOSPluginRegistry.has('plugin-a'), false);
});

test('unload() lalu load() lagi dgn id sama -> diterima (bukan dianggap duplikat lagi)', () => {
  const ctx = load();
  ctx.LifeOSPluginRuntime.load(validManifest());
  ctx.LifeOSPluginRuntime.unload('plugin-a');
  const result = ctx.LifeOSPluginRuntime.load(validManifest({ name: 'Versi baru' }));
  assert.equal(result.valid, true);
  assert.equal(ctx.LifeOSPluginRuntime.getState('plugin-a'), 'loaded');
});

// ---------------------------------------------------------------------
// Capability validation
// ---------------------------------------------------------------------

test('enable(): manifest.capabilities semua dikenal -> diterima', () => {
  const ctx = load();
  ctx.LifeOSPluginRuntime.load(validManifest({ capabilities: ['read-data', 'ui-panel'] }));
  const result = ctx.LifeOSPluginRuntime.enable('plugin-a');
  assert.equal(result.ok, true);
});

test('load(): manifest.capabilities berisi capability tidak dikenal -> ditolak sejak register (lapisan pertama)', () => {
  const ctx = load();
  const result = ctx.LifeOSPluginRuntime.load(validManifest({ capabilities: ['read-data', 'hack-everything'] }));
  assert.equal(result.valid, false);
  assert.match(result.error, /capability tidak dikenal/);
});

test('LIFEOS_PLUGIN_CAPABILITIES: daftar capability yang dikenal Runtime MVP', () => {
  const ctx = load();
  assert.equal(Array.from(ctx.LIFEOS_PLUGIN_CAPABILITIES).join(','), 'read-data,ui-panel,notify');
});

// ---------------------------------------------------------------------
// Error isolation — hook onEnable/onDisable
// ---------------------------------------------------------------------

test('enable(): onEnable() throw -> tidak merambat ke pemanggil, state jadi "error", lastError terisi', () => {
  const ctx = load();
  ctx.LifeOSPluginRuntime.load(validManifest(), {
    onEnable: () => { throw new Error('boom'); },
  });
  let result;
  assert.doesNotThrow(() => { result = ctx.LifeOSPluginRuntime.enable('plugin-a'); });
  assert.equal(result.ok, false);
  assert.match(result.error, /boom/);
  assert.equal(ctx.LifeOSPluginRuntime.getState('plugin-a'), 'error');
  assert.match(ctx.LifeOSPluginRuntime.lastError('plugin-a'), /boom/);
});

test('disable(): onDisable() throw -> tidak merambat, state jadi "error"', () => {
  const ctx = load();
  ctx.LifeOSPluginRuntime.load(validManifest(), {
    onDisable: () => { throw new Error('gagal disable'); },
  });
  ctx.LifeOSPluginRuntime.enable('plugin-a');
  let result;
  assert.doesNotThrow(() => { result = ctx.LifeOSPluginRuntime.disable('plugin-a'); });
  assert.equal(result.ok, false);
  assert.equal(ctx.LifeOSPluginRuntime.getState('plugin-a'), 'error');
});

test('error isolation: hook plugin A throw TIDAK menjatuhkan plugin B — B tetap enable normal', () => {
  const ctx = load();
  ctx.LifeOSPluginRuntime.load(validManifest({ id: 'plugin-a' }), {
    onEnable: () => { throw new Error('a rusak'); },
  });
  ctx.LifeOSPluginRuntime.load(validManifest({ id: 'plugin-b', name: 'Plugin B' }));

  ctx.LifeOSPluginRuntime.enable('plugin-a');
  const resultB = ctx.LifeOSPluginRuntime.enable('plugin-b');

  assert.equal(ctx.LifeOSPluginRuntime.getState('plugin-a'), 'error');
  assert.equal(resultB.ok, true);
  assert.equal(ctx.LifeOSPluginRuntime.getState('plugin-b'), 'enabled');
});

test('enable(): plugin tanpa hook onEnable -> langsung enabled, tidak error', () => {
  const ctx = load();
  ctx.LifeOSPluginRuntime.load(validManifest());
  const result = ctx.LifeOSPluginRuntime.enable('plugin-a');
  assert.equal(result.ok, true);
});

// ---------------------------------------------------------------------
// list()
// ---------------------------------------------------------------------

test('list(): balik semua entri runtime dgn id/state/manifest, urutan sesuai load()', () => {
  const ctx = load();
  ctx.LifeOSPluginRuntime.load(validManifest({ id: 'p1', name: 'P1' }));
  ctx.LifeOSPluginRuntime.load(validManifest({ id: 'p2', name: 'P2' }));
  ctx.LifeOSPluginRuntime.enable('p1');

  const list = ctx.LifeOSPluginRuntime.list();
  assert.equal(list.length, 2);
  assert.deepEqual(list.map((p) => p.id).sort(), ['p1', 'p2']);
  const p1 = list.find((p) => p.id === 'p1');
  assert.equal(p1.state, 'enabled');
  assert.equal(p1.manifest.name, 'P1');
});

test('list(): kosong kalau belum ada plugin di-load', () => {
  const ctx = load();
  assert.deepEqual(ctx.LifeOSPluginRuntime.list(), []);
});
