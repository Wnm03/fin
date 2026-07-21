'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// ripple-position.js mengecek `typeof document!=='undefined'` sebelum memasang listener --
// di vm context (Node, tanpa DOM) itu langsung false, jadi file ini aman dimuat apa adanya
// tanpa perlu stub `document`. Yang dites di sini murni computeRipplePercent() (kalkulasi
// posisi %, tanpa DOM sama sekali) — sisi event/DOM (setupRipplePositionTracking) di luar
// cakupan harness loadSource ini (butuh browser asli utk verifikasi end-to-end).
const ctx = loadSource(['modules/shared/ripple-position.js'], {}, ['RIPPLE_SELECTOR']);

test('computeRipplePercent — titik sentuh di tengah elemen menghasilkan 50%/50%', () => {
  const rect = { left: 100, top: 200, width: 80, height: 40 };
  const r = ctx.computeRipplePercent(rect, 140, 220); // tengah: 100+40, 200+20
  assert.equal(r.x, '50.0%');
  assert.equal(r.y, '50.0%');
});

test('computeRipplePercent — titik sentuh di pojok kiri-atas menghasilkan 0%/0%', () => {
  const rect = { left: 100, top: 200, width: 80, height: 40 };
  const r = ctx.computeRipplePercent(rect, 100, 200);
  assert.equal(r.x, '0.0%');
  assert.equal(r.y, '0.0%');
});

test('computeRipplePercent — titik sentuh di pojok kanan-bawah menghasilkan 100%/100%', () => {
  const rect = { left: 100, top: 200, width: 80, height: 40 };
  const r = ctx.computeRipplePercent(rect, 180, 240);
  assert.equal(r.x, '100.0%');
  assert.equal(r.y, '100.0%');
});

test('computeRipplePercent — posisi di luar batas elemen di-clamp ke 0-100 (subpixel/rounding)', () => {
  const rect = { left: 100, top: 200, width: 80, height: 40 };
  const outsideLeft = ctx.computeRipplePercent(rect, 90, 195); // sedikit di luar kiri-atas
  assert.equal(outsideLeft.x, '0.0%');
  assert.equal(outsideLeft.y, '0.0%');
  const outsideRight = ctx.computeRipplePercent(rect, 200, 260); // sedikit di luar kanan-bawah
  assert.equal(outsideRight.x, '100.0%');
  assert.equal(outsideRight.y, '100.0%');
});

test('computeRipplePercent — rect tidak valid (width/height 0, elemen belum ke-layout) balikin null', () => {
  assert.equal(ctx.computeRipplePercent({ left: 0, top: 0, width: 0, height: 0 }, 5, 5), null);
  assert.equal(ctx.computeRipplePercent(null, 5, 5), null);
  assert.equal(ctx.computeRipplePercent(undefined, 5, 5), null);
});

test('applyRipplePosition — set custom property --ripple-x/--ripple-y ke elemen via getBoundingClientRect()', () => {
  const setCalls = [];
  const fakeEl = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    style: { setProperty: (k, v) => setCalls.push([k, v]) },
  };
  ctx.applyRipplePosition(fakeEl, 25, 75);
  assert.deepEqual(setCalls, [['--ripple-x', '25.0%'], ['--ripple-y', '75.0%']]);
});

test('applyRipplePosition — elemen tanpa getBoundingClientRect (bukan elemen DOM asli) tidak error & tidak nge-set apa pun', () => {
  const setCalls = [];
  assert.doesNotThrow(() => ctx.applyRipplePosition({ style: { setProperty: (k, v) => setCalls.push([k, v]) } }, 1, 1));
  assert.doesNotThrow(() => ctx.applyRipplePosition(null, 1, 1));
  assert.equal(setCalls.length, 0);
});

test('RIPPLE_SELECTOR — daftar selector sama persis dengan yang dipakai styles.css Tahap 7 (ripple asli)', () => {
  const fs = require('node:fs');
  const css = fs.readFileSync(require('node:path').join(__dirname, '..', 'styles.css'), 'utf8');
  // Ambil daftar selector dari rule `.btn::after, .chip-btn::after, ...` di styles.css,
  // lalu bandingkan (tanpa "::after") dengan RIPPLE_SELECTOR di ripple-position.js -- kalau
  // salah satu file diubah tanpa yang lain, ripple akan berhenti muncul di sebagian tombol
  // (::after tidak ke-attach) atau posisi tidak pernah ke-set (listener tidak match).
  const m = css.match(/\.btn::after,[\s\S]*?\{/);
  assert.ok(m, 'Tidak ketemu rule ::after ripple di styles.css -- selector mungkin sudah berubah nama');
  const cssSelectors = m[0].replace(/\{$/, '').split(',').map((s) => s.trim().replace('::after', '')).sort();
  const jsSelectors = ctx.RIPPLE_SELECTOR.split(',').map((s) => s.trim()).sort();
  assert.deepEqual(jsSelectors, cssSelectors, 'RIPPLE_SELECTOR di ripple-position.js harus persis sama dgn daftar selector ::after ripple di styles.css');
});
