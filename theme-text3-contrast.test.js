'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// theme-text3-contrast.test.js — ROADMAP-v1.1.md item 1 (High Priority,
// KNOWN-ISSUES.md §1.1): perbaikan kontras `--text3` di seluruh tema warna
// agar memenuhi WCAG AA (>=4.5:1) terhadap `--bg` maupun `--surface2`.
// Test ini murni struktural (baca styles.css lewat fs, TANPA vm/DOM tiruan)
// karena perubahan hanya value hex `--text3` per tema (value-preserving
// pada properti lain), pola sama dengan tests/finance-2.0-fab.test.js.
// Rumus kontras: WCAG relative luminance + contrast ratio standar.

const ROOT = path.join(__dirname, '..');

function readCss() {
  return fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
}

function hex2rgb(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function linear(c) {
  const cs = c / 255;
  return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

function luminance([r, g, b]) {
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function contrast(hexA, hexB) {
  const lA = luminance(hex2rgb(hexA));
  const lB = luminance(hex2rgb(hexB));
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

// Daftar tema & variabel warna relevan diambil langsung dari styles.css
// (bukan hardcode independen) supaya test tetap valid jika tema lain
// ditambahkan di masa depan, selama pola `[data-theme="x"] { ... }` dan
// urutan deklarasi `--bg`/`--surface2`/`--text3` tetap sama.
function extractThemes(css) {
  const themeRegex = /\[data-theme="([a-z0-9-]+)"\]\s*\{([^}]*)\}/g;
  const themes = {};
  let m;
  while ((m = themeRegex.exec(css)) !== null) {
    const [, name, body] = m;
    const get = (varName) => {
      const re = new RegExp(`--${varName}:(#[0-9a-fA-F]{6});`);
      const mm = body.match(re);
      return mm ? mm[1] : null;
    };
    themes[name] = { bg: get('bg'), surface2: get('surface2'), text3: get('text3') };
  }
  return themes;
}

const css = readCss();
const themes = extractThemes(css);
const themeNames = Object.keys(themes);

test('styles.css: menemukan minimal beberapa tema dengan --text3', () => {
  assert.ok(themeNames.length > 0, 'harus ada minimal 1 blok [data-theme="..."] dengan --bg/--surface2/--text3');
});

for (const name of themeNames) {
  const t = themes[name];

  test(`tema "${name}": --text3 terdefinisi lengkap (bg, surface2, text3)`, () => {
    assert.ok(t.bg, `--bg harus ada di tema ${name}`);
    assert.ok(t.surface2, `--surface2 harus ada di tema ${name}`);
    assert.ok(t.text3, `--text3 harus ada di tema ${name}`);
  });

  test(`tema "${name}": kontras --text3 vs --bg >= 4.5:1 (WCAG AA)`, () => {
    const ratio = contrast(t.text3, t.bg);
    assert.ok(
      ratio >= 4.5,
      `tema ${name}: kontras --text3(${t.text3}) vs --bg(${t.bg}) = ${ratio.toFixed(2)}:1, harus >= 4.5:1`
    );
  });

  test(`tema "${name}": kontras --text3 vs --surface2 >= 4.5:1 (WCAG AA)`, () => {
    const ratio = contrast(t.text3, t.surface2);
    assert.ok(
      ratio >= 4.5,
      `tema ${name}: kontras --text3(${t.text3}) vs --surface2(${t.surface2}) = ${ratio.toFixed(2)}:1, harus >= 4.5:1`
    );
  });
}

test('styles.css: tidak ada class/selector baru bernama text3-fix/contrast-fix (guard: perubahan murni value token)', () => {
  assert.ok(!/\.text3-fix|\.contrast-fix/.test(css), 'tidak boleh ada class baru untuk perbaikan ini — murni ubah value --text3 existing');
});

test('styles.css: variabel lain per tema (bg/surface/accent/text/text2/border) tidak ikut berubah selain --text3', () => {
  // Guard longgar: pastikan token --text2 & --accent tiap tema masih format hex valid
  // (tidak terhapus/rusak akibat proses edit --text3).
  for (const name of themeNames) {
    const blockMatch = css.match(new RegExp(`\\[data-theme="${name}"\\]\\s*\\{([^}]*)\\}`));
    assert.ok(blockMatch, `blok tema ${name} harus tetap utuh`);
    assert.match(blockMatch[1], /--text2:#[0-9a-fA-F]{6};/, `--text2 tema ${name} harus tetap ada & valid`);
    assert.match(blockMatch[1], /--accent:#[0-9a-fA-F]{6};/, `--accent tema ${name} harus tetap ada & valid`);
  }
});
