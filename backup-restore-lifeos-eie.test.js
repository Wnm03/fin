'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Cakupan file ini: BUGFIX-INTEGRASI — LifeOS (`lifeos:store`) & EIE
// (`eie:store`) disimpan di IndexedDB terpisah dari D (lihat
// lifeos/lifeos-store.js / economic-intelligence/eie-store.js), dan
// SEBELUMNYA tidak pernah ikut ke jalur backup/restore (`backup-restore.js`)
// sama sekali walau `{...D}` di buildBackupPayload() terlihat lengkap.
// Test ini menjalankan fungsi ASLI `buildBackupPayload()` &
// `applyRestoredData()` dari backup-restore.js (bukan reimplementasi logic
// di test), dgn dependency lain di-stub minimal (pola sama dgn
// tests/helpers/loadSource.js, tapi custom karena butuh inject IDBStore
// palsu + stub applyRestoredDataMigrations/runDataMigrations supaya tidak
// perlu memuat seluruh rantai data-default.js/features-helpers-global-security.js).

const ROOT = path.join(__dirname, '..');

function extractFn(src, fnName) {
  const asyncMarker = `async function ${fnName}(`;
  const plainMarker = `function ${fnName}(`;
  let start = src.indexOf(asyncMarker);
  if (start === -1) start = src.indexOf(plainMarker);
  if (start === -1) throw new Error(`"${plainMarker}" tidak ditemukan`);
  const braceOpen = src.indexOf('{', start);
  let depth = 1;
  let i = braceOpen + 1;
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') depth--;
    i++;
  }
  return src.slice(start, i);
}

function makeFakeIdbStore(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    async get(key) { return map.has(key) ? map.get(key) : undefined; },
    async set(key, value) { map.set(key, value); return true; },
    _dump() { return Object.fromEntries(map); },
  };
}

function buildSandbox({ D, idbSeed = {} } = {}) {
  const src = fs.readFileSync(path.join(ROOT, 'backup-restore.js'), 'utf8');
  const buildBackupPayloadSrc = extractFn(src, 'buildBackupPayload');
  const applyRestoredDataSrc = extractFn(src, 'applyRestoredData');

  const calls = { lifeOSInvalidateCache: 0, eieInvalidateCache: 0, applyRestoredDataMigrations: 0, runDataMigrations: 0, init: 0 };
  const idbStore = makeFakeIdbStore(idbSeed);

  const sandbox = {
    console,
    JSON,
    Object,
    D,
    IDBStore: idbStore,
    // Stub dependensi lain yang dipanggil applyRestoredData() tapi di luar
    // cakupan test ini (sudah/akan dites terpisah di file lain).
    applyRestoredDataMigrations: () => { calls.applyRestoredDataMigrations++; },
    runDataMigrations: () => { calls.runDataMigrations++; },
    saveFlush: () => {},
    init: () => { calls.init++; },
    save: () => {},
    safeSetItem: () => {},
    askConfirm: async () => true,
    showAlertModal: async () => {},
    SCHEMA_VERSION: D.schemaVersion || 1,
    lifeOSInvalidateCache: () => { calls.lifeOSInvalidateCache++; },
    eieInvalidateCache: () => { calls.eieInvalidateCache++; },
  };
  const context = vm.createContext(sandbox);
  new vm.Script(`${buildBackupPayloadSrc}\n${applyRestoredDataSrc}\nthis.buildBackupPayload=buildBackupPayload;\nthis.applyRestoredData=applyRestoredData;`,
    { filename: 'backup-restore.js#extracted' }).runInContext(context);
  return { context, idbStore, calls };
}

test('buildBackupPayload — menyertakan _lifeosStore & _eieStore dari IndexedDB kalau ada isinya', async () => {
  const D = { profile: { apiKey: 'rahasia' }, chatHistory: [{ role: 'user', text: 'halo' }], transactions: [] };
  const { context } = buildSandbox({
    D,
    idbSeed: {
      'lifeos:store': { projects: [{ id: 'p1' }], reviewLog: [], knowledge: [] },
      'eie:store': { macroCache: {}, insights: [{ id: 'i1' }], notificationsEnabled: true },
    },
  });
  const backupD = await context.buildBackupPayload();
  assert.deepEqual(backupD._lifeosStore, { projects: [{ id: 'p1' }], reviewLog: [], knowledge: [] });
  assert.deepEqual(backupD._eieStore, { macroCache: {}, insights: [{ id: 'i1' }], notificationsEnabled: true });
  // Perilaku lama tetap utuh: chatHistory dikosongkan, apiKey disaring.
  assert.equal(backupD.chatHistory.length, 0);
  assert.equal(backupD.profile.apiKey, undefined);
});

test('buildBackupPayload — IndexedDB kosong (belum pernah pakai LifeOS/EIE) -> tidak menambah field _lifeosStore/_eieStore', async () => {
  const D = { transactions: [] };
  const { context } = buildSandbox({ D, idbSeed: {} });
  const backupD = await context.buildBackupPayload();
  assert.equal('_lifeosStore' in backupD, false);
  assert.equal('_eieStore' in backupD, false);
});

test('applyRestoredData — menulis _lifeosStore/_eieStore dari file backup ke IndexedDB, TIDAK ikut nyangkut sbg field di D, & invalidate cache session', async () => {
  const D = { transactions: [] };
  const { context, idbStore, calls } = buildSandbox({ D, idbSeed: {} });
  const imp = {
    transactions: [{ id: 't1' }],
    _lifeosStore: { projects: [{ id: 'proj-restored' }], reviewLog: [], knowledge: [] },
    _eieStore: { macroCache: {}, insights: [{ id: 'insight-restored' }], notificationsEnabled: true },
  };
  const ok = await context.applyRestoredData(imp);
  assert.equal(ok, true);
  assert.deepEqual(await idbStore.get('lifeos:store'), imp._lifeosStore);
  assert.deepEqual(await idbStore.get('eie:store'), imp._eieStore);
  assert.equal('_lifeosStore' in context.D, false, 'D tidak boleh kebawa field _lifeosStore');
  assert.equal('_eieStore' in context.D, false, 'D tidak boleh kebawa field _eieStore');
  assert.equal(calls.lifeOSInvalidateCache, 1);
  assert.equal(calls.eieInvalidateCache, 1);
});

test('applyRestoredData — file backup LAMA tanpa _lifeosStore/_eieStore -> restore tetap sukses, tidak menulis apa pun ke IndexedDB, tidak invalidate cache', async () => {
  const D = { transactions: [] };
  const { context, idbStore, calls } = buildSandbox({ D, idbSeed: {} });
  const imp = { transactions: [{ id: 't1' }], accounts: [{ id: 'a1' }] };
  const ok = await context.applyRestoredData(imp);
  assert.equal(ok, true);
  assert.equal(await idbStore.get('lifeos:store'), undefined);
  assert.equal(await idbStore.get('eie:store'), undefined);
  assert.equal(calls.lifeOSInvalidateCache, 0);
  assert.equal(calls.eieInvalidateCache, 0);
});

test('applyRestoredData — imp bukan object -> ditolak (perilaku lama tetap utuh)', async () => {
  const D = { transactions: [] };
  const { context } = buildSandbox({ D, idbSeed: {} });
  const ok = await context.applyRestoredData(null);
  assert.equal(ok, false);
});
