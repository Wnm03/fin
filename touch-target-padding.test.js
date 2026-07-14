'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// touch-target-padding.test.js — Sprint 2 Tahap 13 (ROADMAP-v1.1.md item #7).
// Memastikan padding vertikal .chip-btn/.qs-btn diperbesar mendekati 44px
// tap target, tanpa mengubah font-size (ukuran visual teks/ikon tetap).

function readCss() {
  return fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
}

test('styles.css: .chip-btn padding vertikal diperbesar ke 11px, font-size tetap 12px', () => {
  const css = readCss();
  assert.match(css, /\.chip-btn \{ padding: 11px 14px;/);
  assert.match(css, /\.chip-btn \{[^}]*font-size: var\(--fs-label\);/);
});

test('styles.css: .qs-btn padding vertikal diperbesar ke 12px, font-size tetap var(--fs-label)', () => {
  const css = readCss();
  assert.match(css, /\.qs-btn \{[^}]*padding:12px 12px;/);
  assert.match(css, /\.qs-btn \{[^}]*font-size:var\(--fs-label\);/);
});

test('styles.css: .chip-btn & .qs-btn tidak mengubah border-radius/warna/border existing', () => {
  const css = readCss();
  assert.match(css, /\.chip-btn \{ padding: 11px 14px; border-radius: var\(--r-pill\); border: 1px solid var\(--border2\); background: var\(--surface2\); color: var\(--text2\);/);
  assert.match(css, /\.qs-btn \{ background:var\(--surface2\); border:1px solid var\(--border2\); border-radius:var\(--r-md\); padding:12px 12px;/);
});
