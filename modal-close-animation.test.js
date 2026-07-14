'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadSource } = require('./helpers/loadSource.js');
const { createFakeDocument, createFakeElement } = require('./helpers/fakeDom.js');

// modal-close-animation.test.js — ROADMAP-v1.1.md item #2 (High Priority,
// KNOWN-ISSUES.md §5.1): exit/closing animation untuk overlay & bottom
// sheet. Sebelumnya closeModal() di modal-navigasi.js langsung melepas
// class 'open' (display:none instan). Sekarang closeModal() menambah class
// 'closing' dulu (dipakai animasi keluar overlayOut/slideDown di
// styles.css), lalu baru melepas 'open'+'closing' setelah animationend
// (atau fallback setTimeout kalau browser tidak kirim animationend, mis.
// prefers-reduced-motion / elemen tidak actually animasi).
//
// Test ini pakai loadSource() (vm) + fakeDom.js langsung (BUKAN
// permissive stub), karena closeModal/openModal murni baca/tulis
// classList & panggil setTimeout/addEventListener — persis kasus yang
// fakeDom.js didesain untuk itu (lihat catatan di helpers/fakeDom.js).

const ROOT = path.join(__dirname, '..');

function makeManualTimer() {
  const queue = [];
  return {
    setTimeout: (fn) => { queue.push(fn); return queue.length; },
    clearTimeout: () => {},
    flush() { const fns = queue.splice(0); fns.forEach((fn) => fn()); },
    pendingCount() { return queue.length; },
  };
}

function makeEnv(initialClasses) {
  const el = createFakeElement({ classList: initialClasses });
  const bodyEl = createFakeElement();
  const fakeDocument = createFakeDocument();
  fakeDocument.body = bodyEl;
  // modal-navigasi.js daftar top-level document.addEventListener('keydown', ...)
  // utk shortcut Escape (kode lama, tidak disentuh perubahan ini) — perlu
  // stub no-op supaya modul bisa di-load lewat fakeDocument.
  fakeDocument.addEventListener = () => {};
  fakeDocument.getElementById = (id) => {
    if (id === 'testModal') return el;
    if (id === 'missingModal') return null;
    return createFakeElement();
  };
  const timer = makeManualTimer();
  const ctx = loadSource(['modal-navigasi.js'], {
    document: fakeDocument,
    setTimeout: timer.setTimeout,
    clearTimeout: timer.clearTimeout,
  });
  return { ctx, el, bodyEl, timer };
}

test('closeModal — menambah .closing & TIDAK langsung melepas .open (delay utk animasi keluar)', () => {
  const { ctx, el } = makeEnv(['open']);
  ctx.closeModal('testModal');
  assert.equal(el.classList.contains('open'), true, '.open belum boleh dilepas sebelum animasi keluar selesai');
  assert.equal(el.classList.contains('closing'), true, '.closing harus ditambahkan supaya CSS overlayOut/slideDown bisa main');
});

test('closeModal — setelah fallback timeout, .open dan .closing dilepas (modal benar2 tertutup)', () => {
  const { ctx, el, timer } = makeEnv(['open']);
  ctx.closeModal('testModal');
  timer.flush();
  assert.equal(el.classList.contains('open'), false);
  assert.equal(el.classList.contains('closing'), false);
});

test('closeModal — animationend menyelesaikan penutupan tanpa harus menunggu fallback timer', () => {
  const { ctx, el, timer } = makeEnv(['open']);
  let onAnimEnd = null;
  el.addEventListener = (evt, fn) => { if (evt === 'animationend') onAnimEnd = fn; };
  el.removeEventListener = () => {};
  ctx.closeModal('testModal');
  assert.ok(onAnimEnd, 'listener animationend harus terpasang saat closeModal dipanggil');
  onAnimEnd({ target: el });
  assert.equal(el.classList.contains('open'), false);
  assert.equal(el.classList.contains('closing'), false);
  // Fallback timer yang telat menyusul tidak boleh error atau menutup ulang.
  assert.doesNotThrow(() => timer.flush());
});

test('closeModal lalu openModal (dibuka ulang cepat) — modal yang dibuka ulang TIDAK ikut ditutup oleh timer closeModal lama', () => {
  const { ctx, el, timer } = makeEnv(['open']);
  ctx.closeModal('testModal');
  assert.equal(el.classList.contains('closing'), true);
  ctx.openModal('testModal'); // user tap lagi sebelum animasi keluar selesai
  assert.equal(el.classList.contains('open'), true);
  assert.equal(el.classList.contains('closing'), false, 'openModal harus melepas .closing supaya timer closeModal lama tidak ikut menutupnya');
  timer.flush(); // timer closeModal yang lama akhirnya jalan
  assert.equal(el.classList.contains('open'), true, 'modal yang sudah dibuka ulang harus TETAP terbuka, bukan ikut tertutup');
});

test('closeModal dipanggil 2x berturut-turut (double-tap tombol ✕) aman, tidak error / tidak dobel', () => {
  const { ctx, el, timer } = makeEnv(['open']);
  ctx.closeModal('testModal');
  assert.doesNotThrow(() => ctx.closeModal('testModal'));
  timer.flush();
  assert.equal(el.classList.contains('open'), false);
  assert.equal(el.classList.contains('closing'), false);
});

test('closeModal — id modal yang tidak ada di DOM tidak melempar error (guard elemen null)', () => {
  const { ctx } = makeEnv(['open']);
  assert.doesNotThrow(() => ctx.closeModal('missingModal'));
});

test('openModal — membuka modal baru tetap menambah .open seperti semula (tidak ada regresi perilaku lama)', () => {
  const { ctx, el } = makeEnv([]);
  ctx.openModal('testModal');
  assert.equal(el.classList.contains('open'), true);
  assert.equal(el.classList.contains('closing'), false);
});

// --- Bagian CSS: pastikan keyframes/rule exit animation benar2 ditambahkan
// di styles.css, 100% pakai token durasi/easing yang sudah ada (bukan
// angka literal baru), reverse simetris dari overlayIn/slideUp yang sudah
// ada sejak Tahap 7 (lihat styles.css baris ~266-269).

function readCss() {
  return fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
}

// Brace-counting (bukan regex [^}]*) karena keyframes overlayIn/slideUp/
// overlayOut/slideDown punya nested from{...}/to{...} braces di dalamnya.
function extractBlock(css, startMarker) {
  const start = css.indexOf(startMarker);
  if (start === -1) return null;
  const braceOpen = css.indexOf('{', start);
  let depth = 1;
  let i = braceOpen + 1;
  while (i < css.length && depth > 0) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') depth--;
    i++;
  }
  return css.slice(braceOpen + 1, i - 1);
}

test('styles.css — punya keyframes overlayOut & slideDown (animasi keluar, reverse dari overlayIn/slideUp)', () => {
  const css = readCss();
  assert.match(css, /@keyframes\s+overlayOut\s*\{/);
  assert.match(css, /@keyframes\s+slideDown\s*\{/);
});

test('styles.css — .overlay.closing & .calc-overlay.closing memakai token durasi/easing yang sudah ada (bukan angka literal baru)', () => {
  const css = readCss();
  const overlayClosingRule = extractBlock(css, '.overlay.closing, .calc-overlay.closing');
  assert.ok(overlayClosingRule, 'rule .overlay.closing / .calc-overlay.closing harus ada');
  assert.match(overlayClosingRule, /var\(--dur-moderate\)/);
  assert.match(overlayClosingRule, /var\(--ease-standard\)/);

  const modalClosingRule = extractBlock(css, '.overlay.closing .modal, .calc-overlay.closing .calc-modal');
  assert.ok(modalClosingRule, 'rule .overlay.closing .modal / .calc-overlay.closing .calc-modal harus ada');
  assert.match(modalClosingRule, /var\(--dur-slow\)/);
  assert.match(modalClosingRule, /var\(--ease-emphasized\)/);
});

test('styles.css — slideDown adalah reverse simetris dari slideUp (translateY 40px / opacity .4, sama persis nilainya)', () => {
  const css = readCss();
  const slideUp = extractBlock(css, '@keyframes slideUp');
  const slideDown = extractBlock(css, '@keyframes slideDown');
  assert.ok(slideUp && slideDown);
  assert.match(slideUp, /translateY\(40px\)/);
  assert.match(slideDown, /translateY\(40px\)/);
  assert.match(slideUp, /opacity:\s*\.4/);
  assert.match(slideDown, /opacity:\s*\.4/);
});
