'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// window-expose-audit.test.js — Guard OTOMATIS untuk kelas bug berulang:
// modul (`const Nama={...}`) dipakai lewat data-action="Nama.method" di HTML,
// tapi `Nama` lupa di-expose ke `window` (top-level `const`/`let`/class TIDAK
// otomatis jadi properti `window`, beda dari top-level `function`/`var`).
// Dispatcher global data-action (features-helpers-global-security.js) selalu
// lookup lewat `window[p]`, jadi kalau lupa expose, tombolnya DIAM saat
// diklik — tanpa error di console.
//
// Bug ini sudah ditemukan berulang di sesi-sesi sebelumnya secara manual
// (FinCoach, DashboardHub/DashboardHubSearch, 6 modul LifeOS ui/*, OngkirCalc
// — lihat tests/ongkir-window-expose.test.js & tests/pricereko-widget-window-
// expose.test.js utk kasus spesifik yang sudah pernah kejadian). File ini
// BUKAN pengganti test spesifik itu — ini jaring pengaman UMUM yang mengecek
// SEMUA data-action di seluruh source (bukan cuma satu modul yang pernah
// bermasalah), supaya modul BARU yang lupa di-expose ketauan otomatis lewat
// `npm test`, tanpa perlu audit manual browser lagi (smoke-test.js browser
// mengecek hal yang sama, tapi cuma jalan manual/opt-in `?dev=1`, bukan
// bagian `npm test`).
//
// Cara kerja (murni analisis statis, tanpa DOM/browser):
// 1. Baca urutan file source asli dari scripts/build.js (GROUP_A+GROUP_B) —
//    supaya daftar file SELALU sinkron otomatis kalau ada file baru
//    ditambahkan/dihapus dari build, tidak pernah hardcode manual di sini.
// 2. Kumpulkan semua identifier yang "ke-expose ke window" dari seluruh file:
//    - top-level `function Nama(...)` / `async function Nama(...)` (auto
//      jadi window.Nama saat dimuat sbg <script>, ini BUKAN bug).
//    - top-level `var Nama = ...` (juga auto jadi window.Nama).
//    - assignment eksplisit `window.Nama = ...`.
//    - `Object.assign(window, { Nama, Lain, ... })`.
// 3. Kumpulkan semua root identifier yang dipakai lewat `data-action="Nama"`
//    atau `data-action="Nama.method"` di index.html + seluruh file source
//    (banyak modal/kartu di-render dari template literal JS, bukan cuma
//    HTML statis) — baris komentar `//` diabaikan supaya contoh dokumentasi
//    tidak ikut ke-scan sebagai referensi asli (pola sama dgn bugfix
//    smoke-test.js 2026-07-13, lihat docs/CATATAN-CEK-CLAUDE.md).
// 4. Setiap root identifier yang dipakai tapi TIDAK ada di daftar
//    "ke-expose" = bug nyata (tombol akan diam saat diklik).

const ROOT = path.join(__dirname, '..', '..');

function readSourceOrder() {
  const buildSrc = fs.readFileSync(path.join(ROOT, 'scripts/build.js'), 'utf8');
  function extractGroup(name) {
    const m = buildSrc.match(new RegExp(name + '\\s*=\\s*\\[([\\s\\S]*?)\\];'));
    assert.ok(m, `Tidak bisa menemukan ${name} di scripts/build.js — format build.js berubah?`);
    return m[1]
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith('//'))
      .map((s) => s.replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
  }
  return [...extractGroup('GROUP_A'), ...extractGroup('GROUP_B')];
}

function stripLineComments(txt) {
  return txt.split('\n').map((line) => line.replace(/\/\/.*$/, '')).join('\n');
}

function collectExposedNames(sourceFiles, fileTexts) {
  const exposed = new Set();
  for (const f of sourceFiles) {
    const txt = fileTexts[f];
    if (!txt) continue;
    let m;
    const fnRe = /^(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/gm;
    while ((m = fnRe.exec(txt))) exposed.add(m[1]);
    const varRe = /^var\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=/gm;
    while ((m = varRe.exec(txt))) exposed.add(m[1]);
    const winRe = /window\.([A-Za-z_$][A-Za-z0-9_$]*)\s*=/g;
    while ((m = winRe.exec(txt))) exposed.add(m[1]);
    const assignRe = /Object\.assign\(\s*window\s*,\s*\{([\s\S]*?)\}\s*\)/g;
    while ((m = assignRe.exec(txt))) {
      m[1].split(',').forEach((part) => {
        const name = part.split(':')[0].trim();
        if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) exposed.add(name);
      });
    }
  }
  return exposed;
}

function collectUsedRoots(sourceFiles, fileTexts, htmlTxt) {
  const usedRoots = new Map(); // root -> lokasi pertama ditemukan (utk pesan error)
  function scan(txt, label) {
    txt = stripLineComments(txt);
    const re = /data-action=\\?["']([A-Za-z_$][A-Za-z0-9_$.]*)\\?["']/g;
    let m;
    while ((m = re.exec(txt))) {
      const root = m[1].split('.')[0];
      if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(root) && !usedRoots.has(root)) {
        usedRoots.set(root, label);
      }
    }
  }
  scan(htmlTxt, 'index.html');
  for (const f of sourceFiles) {
    if (fileTexts[f]) scan(fileTexts[f], f);
  }
  return usedRoots;
}

test('Semua root data-action="Modul(.method)" di index.html & seluruh source ke-expose ke window (tidak ada modul yang diam saat diklik)', () => {
  const sourceFiles = readSourceOrder();
  const fileTexts = {};
  for (const f of sourceFiles) {
    const full = path.join(ROOT, f);
    if (fs.existsSync(full)) fileTexts[f] = fs.readFileSync(full, 'utf8');
  }
  const htmlTxt = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

  const exposed = collectExposedNames(sourceFiles, fileTexts);
  const usedRoots = collectUsedRoots(sourceFiles, fileTexts, htmlTxt);

  const missing = [];
  for (const [root, label] of usedRoots) {
    if (!exposed.has(root)) {
      missing.push(`"${root}" dipakai via data-action (pertama ketemu di ${label}) tapi TIDAK ke-expose ke window`);
    }
  }

  assert.deepEqual(
    missing,
    [],
    'Modul berikut dipakai lewat data-action tapi lupa di-expose ke window (tombolnya akan diam saat diklik):\n' +
    missing.join('\n') +
    '\n\nFix: tambahkan ke blok Object.assign(window,{...}) di app-bootstrap.js, ' +
    'atau tambahkan `if(typeof window!==\'undefined\')window.Nama=Nama;` di akhir file modulnya.'
  );
});
