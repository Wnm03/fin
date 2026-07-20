'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/loadSource');

// Cakupan: resetApp() (reminder-notif.js). Sebelum ini resetApp() TIDAK
// PERNAH menyentuh IndexedDB (cuma localStorage.clear()) -- lihat
// docs/CATATAN-CEK-CLAUDE.md bagian "BELUM DIKERJAKAN". Test ini menjaga
// supaya IDBStore.clear() ikut dipanggil sebelum reload, dan tetap aman
// (tidak lempar) kalau IDBStore belum sempat dimuat / gagal.

function loadResetApp(extra = {}) {
  const calls = { askConfirmCount: 0, localStorageCleared: false, reloaded: false };
  const localStorage = { clear: () => { calls.localStorageCleared = true; } };
  const location = { reload: () => { calls.reloaded = true; } };
  const askConfirm = async () => { calls.askConfirmCount++; return true; };
  const ctx = loadSource(
    ['reminder-notif.js'],
    { askConfirm, localStorage, location, ...extra },
    ['resetApp']
  );
  return { ctx, calls };
}

test('resetApp — memanggil IDBStore.clear() SEBELUM localStorage.clear() & reload', async () => {
  const order = [];
  const fakeIDBStore = {
    clear: async () => { order.push('idb-clear'); return true; },
  };
  const { ctx, calls } = loadResetApp({
    IDBStore: fakeIDBStore,
    localStorage: { clear: () => order.push('local-clear') },
  });
  await ctx.resetApp();
  assert.deepEqual(order, ['idb-clear', 'local-clear'], 'IndexedDB harus dikosongkan sebelum localStorage.clear()');
  assert.equal(calls.askConfirmCount, 2, 'harus minta 2 konfirmasi (peringatan + final) sebelum reset');
  assert.equal(calls.reloaded, true);
});

test('resetApp — batal kalau konfirmasi pertama ditolak, IDBStore.clear() TIDAK dipanggil', async () => {
  let idbCleared = false;
  const ctx = loadSource(
    ['reminder-notif.js'],
    {
      askConfirm: async () => false,
      IDBStore: { clear: async () => { idbCleared = true; return true; } },
      localStorage: { clear: () => { throw new Error('tidak boleh kepanggil'); } },
      location: { reload: () => { throw new Error('tidak boleh kepanggil'); } },
    },
    ['resetApp']
  );
  await ctx.resetApp();
  assert.equal(idbCleared, false);
});

test('resetApp — tetap lanjut reset (tidak crash) kalau IDBStore.clear() gagal/reject', async () => {
  const { ctx, calls } = loadResetApp({
    IDBStore: { clear: async () => { throw new Error('IndexedDB rusak'); } },
  });
  await assert.doesNotReject(ctx.resetApp());
  assert.equal(calls.localStorageCleared, true, 'localStorage tetap harus dikosongkan walau IndexedDB gagal');
  assert.equal(calls.reloaded, true);
});

test('resetApp — tetap aman (tidak crash) kalau IDBStore belum dimuat sama sekali (typeof undefined)', async () => {
  const { ctx, calls } = loadResetApp(); // tidak inject IDBStore sama sekali
  await assert.doesNotReject(ctx.resetApp());
  assert.equal(calls.localStorageCleared, true);
  assert.equal(calls.reloaded, true);
});
