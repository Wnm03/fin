'use strict';
// scripts/build-preview.js — bikin 1 file HTML self-contained (semua JS
// di-inline langsung, tidak ada <script src="...">) dari index.html, supaya
// bisa dibuka/di-preview langsung tanpa server statis (mis. sbg artifact).
// TIDAK dipanggil otomatis dari build.js/npm run check -- ini murni
// tooling preview, dijalankan manual: `node scripts/build-preview.js`.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC_HTML = path.join(ROOT, 'index.html');
const OUT_HTML = path.join(ROOT, 'keluarga-w-preview.html');

// Urutan HARUS sama dgn urutan <script src=...> di index.html.
const INLINE_FILES = ['app-bundle-a.min.js', 'smoke-test.js', 'app-bundle-b.min.js', 'tangga-keuangan.js'];

function main() {
  let html = fs.readFileSync(SRC_HTML, 'utf8');
  let count = 0;
  for (const file of INLINE_FILES) {
    const jsPath = path.join(ROOT, file);
    const js = fs.readFileSync(jsPath, 'utf8');
    // Cocokkan <script src="FILE?v=NNN" ...></script> apa pun atribut lainnya (onerror/defer).
    const re = new RegExp(`<script src="${file.replace(/\./g, '\\.')}\\?v=\\d+"[^>]*></script>`);
    if (!re.test(html)) {
      throw new Error(`build-preview: tag <script src="${file}?v=..."> tidak ditemukan di index.html`);
    }
    html = html.replace(re, `<script>\n${js}\n</script>`);
    count++;
  }
  fs.writeFileSync(OUT_HTML, html, 'utf8');
  console.log(`✓ ${OUT_HTML} ditulis (${count} file di-inline: ${INLINE_FILES.join(', ')})`);
}

main();
