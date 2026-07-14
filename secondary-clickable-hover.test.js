'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// secondary-clickable-hover.test.js — Sprint 2 Tahap 16 (ROADMAP-v1.1.md
// item #11). Hover elevation utk tap-target sekunder (.stat-box.clickable
// dll.), scoped ke @media (hover:hover) and (pointer:fine) yang sudah ada,
// tidak menambah media query baru.

function readCss() {
  return fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
}

test('styles.css: hover elevation ditambah utk tap-target sekunder di dalam @media (hover:hover) existing', () => {
  const css = readCss();
  assert.match(css, /\.stat-box\.clickable:hover, \.cobek-stat\.clickable:hover, \.bbm-stat\.clickable:hover, \.budget-sum-box\.clickable:hover, \.budget-item\.clickable:hover\{box-shadow:0 2px 8px rgba\(0,0,0,\.08\);\}/);
});

test('styles.css: rule :active lama utk tap-target sekunder TIDAK diubah', () => {
  const css = readCss();
  assert.match(css, /\.budget-item\.clickable:active \{ transform:scale\(0\.98\); \}/);
  assert.match(css, /\.stat-box\.clickable:active, \.cobek-stat\.clickable:active, \.bbm-stat\.clickable:active, \.budget-sum-box\.clickable:active \{ transform:scale\(0\.96\); \}/);
});

test('styles.css: jumlah blok @media (hover:hover) and (pointer:fine) tetap 2 (tidak ada blok baru)', () => {
  const css = readCss();
  const matches = css.match(/@media \(hover:hover\) and \(pointer:fine\)\{/g) || [];
  assert.equal(matches.length, 2, 'Harus tetap 2 blok existing (pinned-widgets scoped + global), tidak ada blok baru ditambahkan');
  const lastBlockStart = css.lastIndexOf('@media (hover:hover) and (pointer:fine){');
  const hoverIdx = css.indexOf('.stat-box.clickable:hover');
  assert.ok(hoverIdx > lastBlockStart, 'Rule hover baru harus berada di dalam blok global existing (yang terakhir)');
});
