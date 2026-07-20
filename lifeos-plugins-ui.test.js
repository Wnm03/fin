'use strict';
// tests/lifeos-plugins-ui.test.js — LifeOSPlugins (lifeos/ui/plugins.js).
// Sesi 66 (Batch 5, lanjutan Plugin System MVP Sesi 65 — konfirmasi
// eksplisit user: target "Plugin UI"). Scope MVP UI: render/list/empty
// state, register manual (showPromptModal() berantai id/nama/versi +
// showChoiceModal() areaKey opsional), unregister (askConfirm()). Pola
// test sama dgn tests/lifeos-life-objects-ui.test.js (fakeDom + loadSource
// vm). PENTING: registry MURNI in-memory (bukan LifeOSStore/D) — TIDAK
// ada lifeOSSave()/LifeOSHome.render() yang perlu dites di sini.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/loadSource');
const { createFakeDocument } = require('../helpers/fakeDom');

function load({
  fakeDocument, toast, showPromptModal, showChoiceModal, askConfirm,
} = {}) {
  return loadSource(
    [
      'lifeos/lifeos-registry.js',
      'lifeos/plugins/lifeos-plugin-manifest.js',
      'lifeos/plugins/lifeos-plugin-validation.js',
      'lifeos/plugins/lifeos-plugin-registry.js',
      'lifeos/ui/plugins.js',
    ],
    {
      document: fakeDocument,
      escapeHtml: (s) => String(s),
      toast: toast || (() => {}),
      showPromptModal,
      showChoiceModal,
      askConfirm,
    },
    ['LifeOSPlugins', 'LifeOSPluginRegistry'],
  );
}

// ---------------------------------------------------------------------
// render()
// ---------------------------------------------------------------------

test('LifeOSPlugins.render(): kosong -> empty state, tidak throw', () => {
  const fakeDocument = createFakeDocument({ lifeOSPluginsGrid: {} });
  const ctx = load({ fakeDocument });
  assert.doesNotThrow(() => ctx.LifeOSPlugins.render());
  const html = fakeDocument.getElementById('lifeOSPluginsGrid').innerHTML;
  assert.match(html, /Belum ada plugin terdaftar/);
});

test('LifeOSPlugins.render(): menampilkan seluruh plugin terdaftar (id/nama/versi/areaKey) apa adanya', () => {
  const fakeDocument = createFakeDocument({ lifeOSPluginsGrid: {} });
  const ctx = load({ fakeDocument });
  ctx.LifeOSPluginRegistry.register({ id: 'p1', name: 'Plugin Cuaca', version: '1.0.0', areaKey: 'finance' });
  ctx.LifeOSPlugins.render();
  const html = fakeDocument.getElementById('lifeOSPluginsGrid').innerHTML;
  assert.match(html, /Plugin Cuaca/);
  assert.match(html, /p1/);
  assert.match(html, /1\.0\.0/);
  assert.match(html, /finance/);
});

test('LifeOSPlugins.render(): elemen tidak ada di DOM -> tidak throw (guard awal)', () => {
  const fakeDocument = createFakeDocument({});
  fakeDocument.getElementById = () => null;
  const ctx = load({ fakeDocument });
  assert.doesNotThrow(() => ctx.LifeOSPlugins.render());
});

// ---------------------------------------------------------------------
// register()
// ---------------------------------------------------------------------

test('LifeOSPlugins.register(): manifest valid -> masuk registry, render() dipanggil', () => {
  const fakeDocument = createFakeDocument({ lifeOSPluginsGrid: {} });
  const ctx = load({ fakeDocument });
  const result = ctx.LifeOSPlugins.register('p1', 'Plugin Cuaca', '1.0.0', 'finance');
  assert.equal(result.valid, true);
  assert.equal(ctx.LifeOSPluginRegistry.has('p1'), true);
  const html = fakeDocument.getElementById('lifeOSPluginsGrid').innerHTML;
  assert.match(html, /Plugin Cuaca/);
});

test('LifeOSPlugins.register(): manifest invalid (version bukan semver) -> TIDAK masuk registry, toast error', () => {
  const fakeDocument = createFakeDocument({ lifeOSPluginsGrid: {} });
  const toastCalls = [];
  const ctx = load({ fakeDocument, toast: (m) => toastCalls.push(m) });
  const result = ctx.LifeOSPlugins.register('p1', 'Plugin Cuaca', 'bukan-semver', null);
  assert.equal(result.valid, false);
  assert.equal(ctx.LifeOSPluginRegistry.has('p1'), false);
  assert.equal(toastCalls.length, 1);
});

test('LifeOSPlugins.register(): id duplikat -> TIDAK overwrite, toast error', () => {
  const fakeDocument = createFakeDocument({ lifeOSPluginsGrid: {} });
  const toastCalls = [];
  const ctx = load({ fakeDocument, toast: (m) => toastCalls.push(m) });
  ctx.LifeOSPlugins.register('p1', 'Versi Pertama', '1.0.0', null);
  const result = ctx.LifeOSPlugins.register('p1', 'Versi Kedua', '1.0.0', null);
  assert.equal(result.valid, false);
  assert.equal(ctx.LifeOSPluginRegistry.get('p1').name, 'Versi Pertama');
  assert.equal(toastCalls.length, 1);
});

// ---------------------------------------------------------------------
// promptRegister()
// ---------------------------------------------------------------------

test('LifeOSPlugins.promptRegister(): alur lengkap (id, nama, versi, area dipilih) -> register() dipanggil dgn areaKey terpilih', async () => {
  const fakeDocument = createFakeDocument({ lifeOSPluginsGrid: {} });
  const prompts = ['p1', 'Plugin Cuaca', '1.0.0'];
  let promptIdx = 0;
  const showPromptModal = async () => prompts[promptIdx++];
  const showChoiceModal = async () => 1; // index 0 = "Tidak ada", index 1 = area pertama (finance)
  const ctx = load({ fakeDocument, showPromptModal, showChoiceModal });
  await ctx.LifeOSPlugins.promptRegister();
  assert.equal(ctx.LifeOSPluginRegistry.has('p1'), true);
  assert.equal(ctx.LifeOSPluginRegistry.get('p1').areaKey, 'finance');
});

test('LifeOSPlugins.promptRegister(): pilih "Tidak ada" (index 0) -> areaKey null', async () => {
  const fakeDocument = createFakeDocument({ lifeOSPluginsGrid: {} });
  const prompts = ['p1', 'Plugin Cuaca', '1.0.0'];
  let promptIdx = 0;
  const showPromptModal = async () => prompts[promptIdx++];
  const showChoiceModal = async () => 0;
  const ctx = load({ fakeDocument, showPromptModal, showChoiceModal });
  await ctx.LifeOSPlugins.promptRegister();
  assert.equal(ctx.LifeOSPluginRegistry.get('p1').areaKey, null);
});

test('LifeOSPlugins.promptRegister(): batal di tahap id (null) -> TIDAK register apa pun', async () => {
  const fakeDocument = createFakeDocument({ lifeOSPluginsGrid: {} });
  const showPromptModal = async () => null;
  const ctx = load({ fakeDocument, showPromptModal });
  await ctx.LifeOSPlugins.promptRegister();
  assert.deepEqual(Array.from(ctx.LifeOSPluginRegistry.list()), []);
});

test('LifeOSPlugins.promptRegister(): batal di tahap versi (nama sudah, versi null) -> TIDAK register apa pun', async () => {
  const fakeDocument = createFakeDocument({ lifeOSPluginsGrid: {} });
  const prompts = ['p1', 'Plugin Cuaca', null];
  let promptIdx = 0;
  const showPromptModal = async () => prompts[promptIdx++];
  const ctx = load({ fakeDocument, showPromptModal });
  await ctx.LifeOSPlugins.promptRegister();
  assert.deepEqual(Array.from(ctx.LifeOSPluginRegistry.list()), []);
});

test('LifeOSPlugins.promptRegister(): batal di tahap pilih area (choiceIdx null) -> TIDAK register apa pun', async () => {
  const fakeDocument = createFakeDocument({ lifeOSPluginsGrid: {} });
  const prompts = ['p1', 'Plugin Cuaca', '1.0.0'];
  let promptIdx = 0;
  const showPromptModal = async () => prompts[promptIdx++];
  const showChoiceModal = async () => null;
  const ctx = load({ fakeDocument, showPromptModal, showChoiceModal });
  await ctx.LifeOSPlugins.promptRegister();
  assert.deepEqual(Array.from(ctx.LifeOSPluginRegistry.list()), []);
});

// ---------------------------------------------------------------------
// remove()
// ---------------------------------------------------------------------

test('LifeOSPlugins.remove(): askConfirm() true -> unregister() lalu render()', async () => {
  const fakeDocument = createFakeDocument({ lifeOSPluginsGrid: {} });
  const ctx = load({ fakeDocument, askConfirm: async () => true });
  ctx.LifeOSPluginRegistry.register({ id: 'p1', name: 'Plugin Cuaca', version: '1.0.0' });
  await ctx.LifeOSPlugins.remove('p1');
  assert.equal(ctx.LifeOSPluginRegistry.has('p1'), false);
  const html = fakeDocument.getElementById('lifeOSPluginsGrid').innerHTML;
  assert.match(html, /Belum ada plugin terdaftar/);
});

test('LifeOSPlugins.remove(): askConfirm() false -> TIDAK unregister', async () => {
  const fakeDocument = createFakeDocument({ lifeOSPluginsGrid: {} });
  const ctx = load({ fakeDocument, askConfirm: async () => false });
  ctx.LifeOSPluginRegistry.register({ id: 'p1', name: 'Plugin Cuaca', version: '1.0.0' });
  await ctx.LifeOSPlugins.remove('p1');
  assert.equal(ctx.LifeOSPluginRegistry.has('p1'), true);
});
