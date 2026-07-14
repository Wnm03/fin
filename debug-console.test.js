'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// debug-console.js pakai document.getElementById/createElement, localStorage,
// window.eruda (pre-check) & bare `eruda` global (init/destroy -- di browser
// asli sama persis dgn window.eruda krn window ADALAH global object; di sini
// harus disuntik manual biar konsisten, lihat setEruda()) & toast(). Stub
// permisif bawaan loadSource() tidak stateful (localStorage/document selalu
// balik no-op baru), jadi semuanya di-mock manual lewat extraGlobals -- pola
// sama dgn error-handler.test.js/keamanan-pin.test.js.

function makeFakeLocalStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    _dump: () => Object.fromEntries(store),
  };
}

function makeFakeButton() {
  return { textContent: '' };
}

// Elemen <script> palsu: nyimpen src & handler onload/onerror supaya test
// bisa "trigger" manual simulasi berhasil/gagalnya load CDN.
function makeFakeScriptEl() {
  return { tagName: 'SCRIPT', src: '', onload: null, onerror: null };
}

function makeCtx({
  active = false,
  btnExists = true,
  hasHead = true,
  erudaPresent = undefined, // undefined = belum ada var eruda global sama sekali
} = {}) {
  const toastCalls = [];
  const fakeLocalStorage = makeFakeLocalStorage(active ? { kw_debug_console: '1' } : {});
  const btn = btnExists ? makeFakeButton() : null;
  const appendedEls = [];
  const headAppends = [];
  const docElAppends = [];
  const fakeHead = hasHead
    ? { appendChild: (el) => { headAppends.push(el); appendedEls.push(el); } }
    : null;
  const fakeDocumentElement = { appendChild: (el) => { docElAppends.push(el); appendedEls.push(el); } };
  const createdScripts = [];
  const fakeDocument = {
    getElementById: (id) => (id === 'btnToggleDebugConsole' ? btn : null),
    createElement: (tag) => {
      const el = makeFakeScriptEl();
      el.tagName = tag.toUpperCase();
      createdScripts.push(el);
      return el;
    },
    head: fakeHead,
    documentElement: fakeDocumentElement,
  };
  // window & bare global `eruda` HARUS nunjuk ke objek yg sama (meniru window
  // === global object di browser asli) -- di-set lewat fakeWindow, lalu
  // ctx.eruda (assignment setelah loadSource) disamakan manual di setEruda().
  const fakeWindow = { eruda: erudaPresent };
  const extraGlobals = {
    document: fakeDocument,
    window: fakeWindow,
    localStorage: fakeLocalStorage,
    toast: (msg) => toastCalls.push(msg),
  };
  const ctx = loadSource(['debug-console.js'], extraGlobals);
  if (erudaPresent !== undefined) ctx.eruda = erudaPresent; // sinkronkan bare global
  return {
    ctx,
    toastCalls,
    fakeLocalStorage,
    btn,
    fakeWindow,
    headAppends,
    docElAppends,
    createdScripts,
    setEruda: (obj) => { fakeWindow.eruda = obj; ctx.eruda = obj; },
  };
}

// ---------- updateDebugConsoleBtn ----------

test('updateDebugConsoleBtn — tombol tidak ada di DOM, return dini tanpa error', () => {
  const { ctx } = makeCtx({ btnExists: false });
  assert.doesNotThrow(() => ctx.updateDebugConsoleBtn());
});

test('updateDebugConsoleBtn — aktif (kw_debug_console=1), teks jadi "Matikan"', () => {
  const { ctx, btn } = makeCtx({ active: true });
  ctx.updateDebugConsoleBtn();
  assert.equal(btn.textContent, '🐞 Matikan Debug Console');
});

test('updateDebugConsoleBtn — tidak aktif (key belum ada), teks jadi "Aktifkan"', () => {
  const { ctx, btn } = makeCtx({ active: false });
  ctx.updateDebugConsoleBtn();
  assert.equal(btn.textContent, '🐞 Aktifkan Debug Console');
});

// ---------- toggleDebugConsole: mematikan (sedang aktif) ----------

test('toggleDebugConsole — sedang aktif & window.eruda ada: hapus key, panggil eruda.destroy(), toast mati, tombol terupdate', () => {
  let destroyed = false;
  const { ctx, toastCalls, fakeLocalStorage, btn } = makeCtx({
    active: true,
    erudaPresent: { destroy: () => { destroyed = true; }, init: () => {} },
  });
  ctx.toggleDebugConsole();
  assert.equal(destroyed, true);
  assert.equal(fakeLocalStorage.getItem('kw_debug_console'), null);
  assert.deepEqual(toastCalls, ['🐞 Debug console dimatikan']);
  assert.equal(btn.textContent, '🐞 Aktifkan Debug Console');
});

test('toggleDebugConsole — sedang aktif tapi window.eruda belum ada: skip destroy, tetap mati & toast', () => {
  const { ctx, toastCalls, fakeLocalStorage } = makeCtx({ active: true, erudaPresent: undefined });
  assert.doesNotThrow(() => ctx.toggleDebugConsole());
  assert.equal(fakeLocalStorage.getItem('kw_debug_console'), null);
  assert.deepEqual(toastCalls, ['🐞 Debug console dimatikan']);
});

test('toggleDebugConsole — sedang aktif, eruda.destroy() melempar error: ditangkap diam-diam, tetap lanjut mati & toast', () => {
  const { ctx, toastCalls, fakeLocalStorage, btn } = makeCtx({
    active: true,
    erudaPresent: { destroy: () => { throw new Error('boom'); } },
  });
  assert.doesNotThrow(() => ctx.toggleDebugConsole());
  assert.equal(fakeLocalStorage.getItem('kw_debug_console'), null);
  assert.deepEqual(toastCalls, ['🐞 Debug console dimatikan']);
  assert.equal(btn.textContent, '🐞 Aktifkan Debug Console');
});

// ---------- toggleDebugConsole: mengaktifkan, eruda SUDAH pernah dimuat ----------

test('toggleDebugConsole — tidak aktif, window.eruda sudah ada (pernah dimuat sebelumnya): set key, panggil eruda.init(), toast nyala, tombol terupdate, TIDAK bikin <script> baru', () => {
  let inited = false;
  const { ctx, toastCalls, fakeLocalStorage, btn, createdScripts } = makeCtx({
    active: false,
    erudaPresent: { init: () => { inited = true; }, destroy: () => {} },
  });
  ctx.toggleDebugConsole();
  assert.equal(inited, true);
  assert.equal(fakeLocalStorage.getItem('kw_debug_console'), '1');
  assert.deepEqual(toastCalls, ['🐞 Debug console diaktifkan']);
  assert.equal(btn.textContent, '🐞 Matikan Debug Console');
  assert.equal(createdScripts.length, 0);
});

test('toggleDebugConsole — tidak aktif, window.eruda ada tapi eruda.init() melempar error: ditangkap diam-diam, toast nyala tetap muncul & tombol tetap terupdate', () => {
  const { ctx, toastCalls, btn } = makeCtx({
    active: false,
    erudaPresent: { init: () => { throw new Error('gagal init'); } },
  });
  assert.doesNotThrow(() => ctx.toggleDebugConsole());
  assert.deepEqual(toastCalls, ['🐞 Debug console diaktifkan']);
  assert.equal(btn.textContent, '🐞 Matikan Debug Console');
});

// ---------- toggleDebugConsole: mengaktifkan, eruda BELUM pernah dimuat (lazy-load CDN) ----------

test('toggleDebugConsole — tidak aktif & belum ada eruda sama sekali: key kw_debug_console langsung "1" walau script belum selesai load', () => {
  const { ctx, fakeLocalStorage } = makeCtx({ active: false, erudaPresent: undefined });
  ctx.toggleDebugConsole();
  assert.equal(fakeLocalStorage.getItem('kw_debug_console'), '1');
});

test('toggleDebugConsole — lazy-load: bikin <script src="...eruda"> & di-append ke document.head kalau ada', () => {
  const { ctx, createdScripts, headAppends, docElAppends } = makeCtx({ active: false, hasHead: true });
  ctx.toggleDebugConsole();
  assert.equal(createdScripts.length, 1);
  assert.equal(createdScripts[0].src, 'https://cdn.jsdelivr.net/npm/eruda');
  assert.equal(headAppends.length, 1);
  assert.equal(docElAppends.length, 0);
  assert.equal(typeof createdScripts[0].onload, 'function');
  assert.equal(typeof createdScripts[0].onerror, 'function');
});

test('toggleDebugConsole — lazy-load: fallback ke document.documentElement kalau document.head tidak ada', () => {
  const { ctx, headAppends, docElAppends } = makeCtx({ active: false, hasHead: false });
  ctx.toggleDebugConsole();
  assert.equal(headAppends.length, 0);
  assert.equal(docElAppends.length, 1);
});

test('script.onload — sukses: panggil eruda.init() (global, bukan window.eruda), toast nyala, tombol terupdate', () => {
  let inited = false;
  const { ctx, toastCalls, btn, createdScripts } = makeCtx({ active: false });
  ctx.eruda = { init: () => { inited = true; } }; // simulasi var global "eruda" muncul setelah CDN load
  ctx.toggleDebugConsole();
  createdScripts[0].onload();
  assert.equal(inited, true);
  assert.deepEqual(toastCalls, ['🐞 Debug console diaktifkan']);
  assert.equal(btn.textContent, '🐞 Matikan Debug Console');
});

test('script.onload — eruda.init() melempar error: toast pesan gagal (bukan toast sukses), tombol tetap terupdate', () => {
  const { ctx, toastCalls, btn, createdScripts } = makeCtx({ active: false });
  ctx.eruda = { init: () => { throw new Error('rusak'); } };
  ctx.toggleDebugConsole();
  createdScripts[0].onload();
  assert.deepEqual(toastCalls, ['⚠️ Gagal menyalakan debug console: rusak']);
  assert.equal(btn.textContent, '🐞 Matikan Debug Console');
});

test('script.onerror — gagal load CDN: key kw_debug_console dihapus lagi, toast pesan butuh internet, tombol balik "Aktifkan"', () => {
  const { ctx, toastCalls, fakeLocalStorage, btn, createdScripts } = makeCtx({ active: false });
  ctx.toggleDebugConsole();
  assert.equal(fakeLocalStorage.getItem('kw_debug_console'), '1'); // sempat di-set optimis
  createdScripts[0].onerror();
  assert.equal(fakeLocalStorage.getItem('kw_debug_console'), null); // di-rollback
  assert.deepEqual(toastCalls, ['⚠️ Gagal memuat debug console (butuh internet saat pertama kali aktif)']);
  assert.equal(btn.textContent, '🐞 Aktifkan Debug Console');
});
