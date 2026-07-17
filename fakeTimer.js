'use strict';
/**
 * fakeTimer.js — Date.now()/setInterval()/clearInterval() palsu yang bisa
 * dimaju-mundurkan MANUAL (bukan nunggu real timer sungguhan), dipakai
 * khusus utk nge-test kode yang berpacu dgn waktu lewat interval berjalan
 * (mis. lockout PIN di keamanan-pin.js: _pinLockRemainingMs/
 * updatePinLockUI, disebut butuh infra ini di catatan CLAUDE.md bagian
 * ke-16..ke-25 tapi belum pernah ditulis).
 *
 * SENGAJA minimal — cuma method yang benar-benar dipakai kode yang dites:
 *   - `Date.now()` (BUKAN `new Date()` penuh; kalau file lain butuh method
 *     Date lain, helper ini tidak cukup, jangan dipaksa dipakai di situ).
 *   - `setInterval(fn, ms)` / `clearInterval(id)` standar, callback tanpa
 *     argumen — TIDAK auto-fire sendiri (beda dari real timer). Test harus
 *     manggil `advance(ms)` (majukan jam) lalu `fireAll()` (jalankan semua
 *     callback interval yang masih aktif) secara eksplisit, supaya
 *     deterministik & tidak nunggu waktu asli sedikit pun.
 *
 * @param {number} [startNow] - waktu epoch awal (ms), default 0.
 */
function makeFakeTimer(startNow = 0) {
  let now = startNow;
  const intervals = new Map();
  let idCounter = 1;
  return {
    Date: { now: () => now },
    setInterval: (fn, ms) => {
      const id = idCounter++;
      intervals.set(id, { fn, ms });
      return id;
    },
    clearInterval: (id) => { intervals.delete(id); },
    /** Majukan jam palsu sebanyak `ms` milidetik (TIDAK menjalankan callback apa pun sendiri). */
    advance(ms) { now += ms; },
    /** Set jam palsu ke nilai epoch tertentu langsung (bukan relatif). */
    set(ms) { now = ms; },
    /** Jalankan semua callback interval yang masih terdaftar (belum di-clearInterval), sekali. */
    fireAll() { for (const { fn } of intervals.values()) fn(); },
    /** Jumlah interval yang masih aktif (belum di-clearInterval) — buat verifikasi tidak ada leak/dobel. */
    activeIntervalCount: () => intervals.size,
  };
}

module.exports = { makeFakeTimer };
