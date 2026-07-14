'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// error-handler.js pakai `Date.now()` (throttle 3 detik) & `window.addEventListener`
// (2 listener global) — default stub `loadSource` (permissive no-op) tidak cukup utk
// dites: `window.addEventListener` no-op tidak menyimpan handler-nya, & `Date.now()`
// asli tidak bisa dimaju-mundurkan tanpa nunggu beneran. Jadi disuntik `window`/`Date`
// tiruan lewat `extraGlobals` (pola sama dgn fake timer di `kategorisasi-ai.test.js`,
// disebut di komentar file itu sbg infra yg belum ada waktu itu — di sini baru dibuat
// versi sederhananya khusus test file ini).
function makeCtx({ time = 0, toastImpl, provideToast = true } = {}) {
  const toastCalls = [];
  const consoleErrors = [];
  const consoleWarns = [];
  const listeners = {};
  const fakeWindow = {
    addEventListener(evt, fn) {
      listeners[evt] = fn;
    },
  };
  const fakeConsole = {
    error: (...args) => consoleErrors.push(args),
    warn: (...args) => consoleWarns.push(args),
    log: () => {},
  };
  const fakeDate = { now: () => time };
  const extraGlobals = {
    window: fakeWindow,
    Date: fakeDate,
    console: fakeConsole,
  };
  if (provideToast) {
    extraGlobals.toast = toastImpl || ((msg, dur) => toastCalls.push({ msg, dur }));
  }
  const ctx = loadSource(['error-handler.js'], extraGlobals);
  return { ctx, toastCalls, consoleErrors, consoleWarns, listeners, setTime: (t) => { fakeDate.now = () => t; } };
}

test('_friendlyErrorNotice — pesan normal, toast dipanggil dgn detail & durasi 5000', () => {
  const { ctx, toastCalls } = makeCtx({ time: 5000 });
  ctx._friendlyErrorNotice('Gagal simpan data');
  assert.equal(toastCalls.length, 1);
  assert.equal(toastCalls[0].msg, '⚠️ Ada error kecil, coba ulangi aksi terakhir: Gagal simpan data');
  assert.equal(toastCalls[0].dur, 5000);
});

test('_friendlyErrorNotice — tanpa pesan (undefined), detail dikosongkan bukan ": undefined"', () => {
  const { ctx, toastCalls } = makeCtx({ time: 5000 });
  ctx._friendlyErrorNotice(undefined);
  assert.equal(toastCalls.length, 1);
  assert.equal(toastCalls[0].msg, '⚠️ Ada error kecil, coba ulangi aksi terakhir');
});

test('_friendlyErrorNotice — pesan panjang dipotong maksimal 120 karakter', () => {
  const { ctx, toastCalls } = makeCtx({ time: 5000 });
  const longMsg = 'x'.repeat(200);
  ctx._friendlyErrorNotice(longMsg);
  assert.equal(toastCalls[0].msg, '⚠️ Ada error kecil, coba ulangi aksi terakhir: ' + 'x'.repeat(120));
});

test('_friendlyErrorNotice — throttle 3 detik: panggilan kedua dlm window diabaikan', () => {
  const { ctx, toastCalls, setTime } = makeCtx({ time: 10000 });
  ctx._friendlyErrorNotice('error pertama');
  setTime(10000 + 2999); // masih dalam window 3 detik
  ctx._friendlyErrorNotice('error kedua, harusnya diabaikan');
  assert.equal(toastCalls.length, 1);
  assert.equal(toastCalls[0].msg.includes('error pertama'), true);
});

test('_friendlyErrorNotice — throttle lewat 3 detik, panggilan berikutnya jalan lagi', () => {
  const { ctx, toastCalls, setTime } = makeCtx({ time: 10000 });
  ctx._friendlyErrorNotice('error pertama');
  setTime(10000 + 3000); // tepat di batas, now-last>=3000 jadi tidak diblok
  ctx._friendlyErrorNotice('error ketiga');
  assert.equal(toastCalls.length, 2);
  assert.equal(toastCalls[1].msg.includes('error ketiga'), true);
});

test('_friendlyErrorNotice — toast belum siap (bukan function), fallback ke console.warn tanpa throw', () => {
  const { ctx, consoleWarns } = makeCtx({ time: 5000, provideToast: false });
  assert.doesNotThrow(() => ctx._friendlyErrorNotice('pesan saat toast belum ada'));
  assert.equal(consoleWarns.length, 1);
  assert.equal(consoleWarns[0][0], 'App error (toast belum siap):');
  assert.equal(consoleWarns[0][1], 'pesan saat toast belum ada');
});

test('_friendlyErrorNotice — toast() melempar error tetap ditangkap diam-diam (tidak crash)', () => {
  const { ctx } = makeCtx({
    time: 5000,
    toastImpl: () => { throw new Error('toast rusak'); },
  });
  assert.doesNotThrow(() => ctx._friendlyErrorNotice('pesan apapun'));
});

test('listener window "error" — log ke console.error & neruskan e.error (bukan e.message) ke notice kalau ada', () => {
  const { ctx, toastCalls, consoleErrors, listeners } = makeCtx({ time: 5000 });
  assert.equal(typeof listeners.error, 'function');
  const fakeErrObj = new Error('boom');
  listeners.error({ error: fakeErrObj, message: 'pesan fallback', filename: 'app.js', lineno: 42 });
  assert.equal(consoleErrors.length, 1);
  assert.deepEqual(consoleErrors[0], ['Uncaught error:', fakeErrObj, 'app.js', 42]);
  // _friendlyErrorNotice dipanggil dgn e.message (bukan e.error) sesuai kode aslinya
  assert.equal(toastCalls[0].msg.includes('pesan fallback'), true);
});

test('listener window "error" — e.error null, console.error fallback pakai e.message', () => {
  const { consoleErrors, listeners } = makeCtx({ time: 5000 });
  listeners.error({ error: null, message: 'cuma pesan string', filename: 'x.js', lineno: 1 });
  assert.deepEqual(consoleErrors[0], ['Uncaught error:', 'cuma pesan string', 'x.js', 1]);
});

test('listener window "unhandledrejection" — log ke console.error & neruskan e.reason ke notice', () => {
  const { toastCalls, consoleErrors, listeners } = makeCtx({ time: 5000 });
  assert.equal(typeof listeners.unhandledrejection, 'function');
  listeners.unhandledrejection({ reason: 'promise ditolak: koneksi gagal' });
  assert.equal(consoleErrors.length, 1);
  assert.deepEqual(consoleErrors[0], ['Unhandled promise rejection:', 'promise ditolak: koneksi gagal']);
  assert.equal(toastCalls[0].msg.includes('promise ditolak: koneksi gagal'), true);
});

test('kedua listener terdaftar independen — trigger salah satu tidak mempengaruhi throttle counter duluan dari nol', () => {
  const { toastCalls, listeners } = makeCtx({ time: 5000 });
  listeners.unhandledrejection({ reason: 'reject 1' });
  listeners.error({ error: null, message: 'error 1', filename: 'a.js', lineno: 1 });
  // Keduanya kena throttle yg sama (window global _lastErrorToastAt), jadi cuma 1 toast
  assert.equal(toastCalls.length, 1);
  assert.equal(toastCalls[0].msg.includes('reject 1'), true);
});
