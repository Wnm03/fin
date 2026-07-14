'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// page-container-maxwidth.test.js — Sprint 2 Tahap 15 (ROADMAP-v1.1.md
// item #10). Memastikan .page mendapat max-width konsisten di >=1024px
// tanpa mengubah rule #page-dashboard-hub yang sudah ada (Dashboard V2 /
// Hero Dashboard scope, tidak disentuh).

function readCss() {
  return fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
}

test('styles.css: .page mendapat max-width:1080px di @media (min-width:1024px)', () => {
  const css = readCss();
  assert.match(css, /@media \(min-width:1024px\)\{\s*\.page\{max-width:1080px;margin-left:auto;margin-right:auto;\}\s*\}/);
});

test('styles.css: rule #page-dashboard-hub max-width lama TIDAK diubah', () => {
  const css = readCss();
  assert.match(css, /#page-dashboard-hub\{max-width:1080px;margin-left:auto;margin-right:auto;\}/);
});

test('styles.css: base .page (display/padding/animation) TIDAK diubah', () => {
  const css = readCss();
  assert.match(css, /\.page \{ display: none; padding: 14px 16px; animation: fadeIn var\(--dur-moderate\) var\(--ease-standard\); \}/);
});
