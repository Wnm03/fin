'use strict';
// tests/lifeos-plugin-system.test.js — LifeOS Plugin System MVP (Sesi 65,
// Batch 5, keputusan eksplisit user: Plugin System, scope MVP saja —
// Registry, Manifest, Loader, Validation. TIDAK ada Plugin UI/Marketplace/
// Runtime kompleks). Fokus test:
// (1) lifeOSPluginCreateManifest() — bentuk objek manifest yang konsisten;
// (2) lifeOSPluginValidateManifest() — tolak manifest bukan object, field
//     wajib kosong/bukan string, version bukan semver, areaKey tidak
//     terdaftar di LIFEOS_AREAS — TIDAK PERNAH throw;
// (3) LifeOSPluginRegistry — register() menolak manifest invalid & id
//     duplikat (bukan overwrite diam-diam), unregister()/get()/list()/
//     has() konsisten;
// (4) lifeOSPluginLoad() — batch register, satu manifest gagal tidak
//     menghentikan proses, hasil loaded/rejected lengkap.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/loadSource');

const FILES = [
  'lifeos/lifeos-registry.js',
  'lifeos/plugins/lifeos-plugin-manifest.js',
  'lifeos/plugins/lifeos-plugin-validation.js',
  'lifeos/plugins/lifeos-plugin-registry.js',
  'lifeos/plugins/lifeos-plugin-loader.js',
];

function load() {
  return loadSource(FILES, {}, [
    'LIFEOS_PLUGIN_MANIFEST_REQUIRED_FIELDS',
    'LIFEOS_PLUGIN_MANIFEST_OPTIONAL_FIELDS',
    'LifeOSPluginRegistry',
  ]);
}

function validManifest(overrides = {}) {
  return { id: 'plugin-a', name: 'Plugin A', version: '1.0.0', ...overrides };
}

// ---------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------

test('lifeOSPluginCreateManifest(): bentuk objek konsisten, areaKey/description default kalau tidak diisi', () => {
  const ctx = load();
  const manifest = ctx.lifeOSPluginCreateManifest({ id: 'p1', name: 'Plugin 1', version: '1.0.0' });
  assert.equal(manifest.id, 'p1');
  assert.equal(manifest.name, 'Plugin 1');
  assert.equal(manifest.version, '1.0.0');
  assert.equal(manifest.areaKey, null);
  assert.equal(manifest.description, '');
});

test('lifeOSPluginCreateManifest(): areaKey/description dipakai kalau diisi', () => {
  const ctx = load();
  const manifest = ctx.lifeOSPluginCreateManifest({ id: 'p1', name: 'Plugin 1', version: '1.0.0', areaKey: 'finance', description: 'contoh' });
  assert.equal(manifest.areaKey, 'finance');
  assert.equal(manifest.description, 'contoh');
});

test('LIFEOS_PLUGIN_MANIFEST_REQUIRED_FIELDS/OPTIONAL_FIELDS: bentuk tetap (id/name/version wajib, areaKey/description/capabilities opsional)', () => {
  const ctx = load();
  assert.deepEqual(Array.from(ctx.LIFEOS_PLUGIN_MANIFEST_REQUIRED_FIELDS), ['id', 'name', 'version']);
  assert.deepEqual(Array.from(ctx.LIFEOS_PLUGIN_MANIFEST_OPTIONAL_FIELDS), ['areaKey', 'description', 'capabilities']);
});

// ---------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------

test('lifeOSPluginValidateManifest(): manifest valid -> {valid:true}', () => {
  const ctx = load();
  const result = ctx.lifeOSPluginValidateManifest(validManifest());
  assert.equal(result.valid, true);
  assert.equal(result.error, undefined);
});

test('lifeOSPluginValidateManifest(): manifest null/undefined/bukan object/array -> valid:false, tidak throw', () => {
  const ctx = load();
  assert.doesNotThrow(() => ctx.lifeOSPluginValidateManifest(null));
  assert.equal(ctx.lifeOSPluginValidateManifest(null).valid, false);
  assert.equal(ctx.lifeOSPluginValidateManifest(undefined).valid, false);
  assert.equal(ctx.lifeOSPluginValidateManifest('plugin-a').valid, false);
  assert.equal(ctx.lifeOSPluginValidateManifest(['plugin-a']).valid, false);
});

test('lifeOSPluginValidateManifest(): field wajib (id/name/version) kosong atau bukan string -> valid:false + error', () => {
  const ctx = load();
  assert.match(ctx.lifeOSPluginValidateManifest(validManifest({ id: '' })).error, /id wajib diisi/);
  assert.match(ctx.lifeOSPluginValidateManifest(validManifest({ name: '' })).error, /name wajib diisi/);
  assert.match(ctx.lifeOSPluginValidateManifest(validManifest({ version: '' })).error, /version wajib diisi/);
  assert.match(ctx.lifeOSPluginValidateManifest(validManifest({ id: 123 })).error, /id wajib diisi/);
});

test('lifeOSPluginValidateManifest(): version bukan format semver "x.y.z" -> valid:false + error', () => {
  const ctx = load();
  assert.equal(ctx.lifeOSPluginValidateManifest(validManifest({ version: '1.0' })).valid, false);
  assert.equal(ctx.lifeOSPluginValidateManifest(validManifest({ version: 'v1.0.0' })).valid, false);
  assert.equal(ctx.lifeOSPluginValidateManifest(validManifest({ version: '1.0.0' })).valid, true);
});

test('lifeOSPluginValidateManifest(): areaKey tidak diisi (undefined/null) -> valid tetap true', () => {
  const ctx = load();
  assert.equal(ctx.lifeOSPluginValidateManifest(validManifest()).valid, true);
  assert.equal(ctx.lifeOSPluginValidateManifest(validManifest({ areaKey: null })).valid, true);
});

test('lifeOSPluginValidateManifest(): areaKey terdaftar di LIFEOS_AREAS -> valid:true, tidak terdaftar -> valid:false + error', () => {
  const ctx = load();
  assert.equal(ctx.lifeOSPluginValidateManifest(validManifest({ areaKey: 'finance' })).valid, true);
  const result = ctx.lifeOSPluginValidateManifest(validManifest({ areaKey: 'domain-tidak-ada' }));
  assert.equal(result.valid, false);
  assert.match(result.error, /tidak terdaftar di LIFEOS_AREAS/);
});

test('lifeOSPluginValidateManifest(): LIFEOS_AREAS belum ter-load -> areaKey manapun ditolak aman, tidak throw', () => {
  const ctx = loadSource([
    'lifeos/plugins/lifeos-plugin-manifest.js',
    'lifeos/plugins/lifeos-plugin-validation.js',
  ]);
  assert.doesNotThrow(() => ctx.lifeOSPluginValidateManifest(validManifest({ areaKey: 'finance' })));
  assert.equal(ctx.lifeOSPluginValidateManifest(validManifest({ areaKey: 'finance' })).valid, false);
});

// ---------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------

test('LifeOSPluginRegistry.register(): manifest valid -> {valid:true, plugin}, tersimpan & bisa diambil via get()/list()', () => {
  const ctx = load();
  const result = ctx.LifeOSPluginRegistry.register(validManifest());
  assert.equal(result.valid, true);
  assert.deepEqual(result.plugin, validManifest());
  assert.deepEqual(ctx.LifeOSPluginRegistry.get('plugin-a'), validManifest());
  assert.deepEqual(Array.from(ctx.LifeOSPluginRegistry.list()), [validManifest()]);
  assert.equal(ctx.LifeOSPluginRegistry.has('plugin-a'), true);
});

test('LifeOSPluginRegistry.register(): manifest invalid -> valid:false, TIDAK masuk registry', () => {
  const ctx = load();
  const result = ctx.LifeOSPluginRegistry.register(validManifest({ version: 'bukan-semver' }));
  assert.equal(result.valid, false);
  assert.equal(ctx.LifeOSPluginRegistry.has('plugin-a'), false);
  assert.deepEqual(Array.from(ctx.LifeOSPluginRegistry.list()), []);
});

test('LifeOSPluginRegistry.register(): id duplikat DITOLAK (bukan overwrite diam-diam)', () => {
  const ctx = load();
  ctx.LifeOSPluginRegistry.register(validManifest({ name: 'Versi Pertama' }));
  const result = ctx.LifeOSPluginRegistry.register(validManifest({ name: 'Versi Kedua' }));
  assert.equal(result.valid, false);
  assert.match(result.error, /sudah terdaftar/);
  assert.equal(ctx.LifeOSPluginRegistry.get('plugin-a').name, 'Versi Pertama');
});

test('LifeOSPluginRegistry.unregister(): hapus plugin terdaftar -> true, id tidak ada -> false, tidak throw', () => {
  const ctx = load();
  ctx.LifeOSPluginRegistry.register(validManifest());
  assert.equal(ctx.LifeOSPluginRegistry.unregister('plugin-a'), true);
  assert.equal(ctx.LifeOSPluginRegistry.has('plugin-a'), false);
  assert.equal(ctx.LifeOSPluginRegistry.unregister('plugin-tidak-ada'), false);
});

test('LifeOSPluginRegistry.get()/has(): id tidak terdaftar -> null/false, tidak throw', () => {
  const ctx = load();
  assert.doesNotThrow(() => ctx.LifeOSPluginRegistry.get('tidak-ada'));
  assert.equal(ctx.LifeOSPluginRegistry.get('tidak-ada'), null);
  assert.equal(ctx.LifeOSPluginRegistry.has('tidak-ada'), false);
});

test('LifeOSPluginRegistry setelah unregister lalu register ulang id yang sama -> diterima (bukan duplikat lagi)', () => {
  const ctx = load();
  ctx.LifeOSPluginRegistry.register(validManifest({ name: 'Versi Pertama' }));
  ctx.LifeOSPluginRegistry.unregister('plugin-a');
  const result = ctx.LifeOSPluginRegistry.register(validManifest({ name: 'Versi Baru' }));
  assert.equal(result.valid, true);
  assert.equal(ctx.LifeOSPluginRegistry.get('plugin-a').name, 'Versi Baru');
});

// ---------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------

test('lifeOSPluginLoad(): batch manifest valid semua -> semua masuk loaded, rejected kosong', () => {
  const ctx = load();
  const result = ctx.lifeOSPluginLoad([
    validManifest({ id: 'p1', name: 'Plugin 1' }),
    validManifest({ id: 'p2', name: 'Plugin 2' }),
  ]);
  assert.deepEqual(Array.from(result.loaded).sort(), ['p1', 'p2']);
  assert.deepEqual(Array.from(result.rejected), []);
  assert.equal(ctx.LifeOSPluginRegistry.list().length, 2);
});

test('lifeOSPluginLoad(): satu manifest invalid tidak menghentikan batch — sisanya tetap diproses', () => {
  const ctx = load();
  const result = ctx.lifeOSPluginLoad([
    validManifest({ id: 'p1', name: 'Plugin 1' }),
    validManifest({ id: 'p2', name: 'Plugin 2', version: 'invalid' }),
    validManifest({ id: 'p3', name: 'Plugin 3' }),
  ]);
  assert.deepEqual(Array.from(result.loaded).sort(), ['p1', 'p3']);
  assert.equal(result.rejected.length, 1);
  assert.equal(result.rejected[0].id, 'p2');
  assert.match(result.rejected[0].error, /semver/);
});

test('lifeOSPluginLoad(): id duplikat dalam satu batch -> yang pertama loaded, yang kedua rejected', () => {
  const ctx = load();
  const result = ctx.lifeOSPluginLoad([
    validManifest({ id: 'p1', name: 'Pertama' }),
    validManifest({ id: 'p1', name: 'Kedua' }),
  ]);
  assert.deepEqual(Array.from(result.loaded), ['p1']);
  assert.equal(result.rejected.length, 1);
  assert.equal(result.rejected[0].id, 'p1');
  assert.equal(ctx.LifeOSPluginRegistry.get('p1').name, 'Pertama');
});

test('lifeOSPluginLoad(): array kosong/undefined -> loaded & rejected kosong, tidak throw', () => {
  const ctx = load();
  const r1 = ctx.lifeOSPluginLoad([]);
  assert.deepEqual([Array.from(r1.loaded), Array.from(r1.rejected)], [[], []]);
  assert.doesNotThrow(() => ctx.lifeOSPluginLoad(undefined));
  const r2 = ctx.lifeOSPluginLoad(undefined);
  assert.deepEqual([Array.from(r2.loaded), Array.from(r2.rejected)], [[], []]);
});
