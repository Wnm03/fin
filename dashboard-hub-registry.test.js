'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadSource } = require('./helpers/loadSource');

const ROOT = path.join(__dirname, '..');
const INDEX_HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const APP_PRODUCTION_HTML = fs.readFileSync(path.join(ROOT, 'app_production.html'), 'utf8');

// Tab yang TERVERIFIKASI ada per page (lihat komentar "TAB REFERENSI" di
// dashboard-hub-registry.js) — dipakai buat cross-check target.tab.
const KNOWN_TABS = {
  keuangan: ['kelola', 'laporan'],
  shop: ['kasir', 'jual', 'etalase', 'produsen', 'riwayat', 'pelanggan'],
  carnotes: ['bbm', 'servis'],
  pajak: ['zakat', 'pajak'],
};
const KNOWN_PAGES = ['dashboard', 'dashboard-hub', 'keuangan', 'shop', 'carnotes', 'pajak', 'ai', 'settings'];

function ctx() {
  return loadSource(['dashboard-hub-registry.js'], {}, ['FEATURE_REGISTRY']);
}

// collectNavEntries — satu-satunya tempat yang tahu cara menyisir
// FEATURE_REGISTRY jadi daftar NavEntry datar (ADR-001 §2): setiap kategori
// (cat.target OPSIONAL — belum diisi sampai Langkah 2, tapi kalau nanti ada,
// harus lolos validasi yang SAMA persis dengan fitur, §5) dan setiap fitur
// (f.target WAJIB). SENGAJA tidak memutasi FEATURE_REGISTRY (tidak push/
// assign ke objek cat/f manapun) — cuma membaca & mengumpulkan ke array
// baru — supaya aman dipanggil berkali-kali dari banyak test tanpa efek
// samping lintas-test (lihat test "tidak memutasi" di bawah).
function collectNavEntries(FEATURE_REGISTRY) {
  const entries = [];
  for (const cat of FEATURE_REGISTRY) {
    entries.push({
      scope: 'cat',
      key: cat.key,
      label: cat.label,
      target: cat.target, // opsional
      catKey: cat.key,
      catLabel: cat.label,
    });
    for (const f of cat.features) {
      entries.push({
        scope: 'feature',
        key: f.key,
        label: f.label,
        target: f.target, // wajib (divalidasi terpisah di test struktur dasar)
        catKey: cat.key,
        catLabel: cat.label,
      });
    }
  }
  return entries;
}

function idExistsInHtml(id) {
  const needle = `id="${id}"`;
  return INDEX_HTML.includes(needle) && APP_PRODUCTION_HTML.includes(needle);
}

// Ambil substring blok "<div class="page"... id="X">...</div>" yang balanced
// (brace-counting per-tag <div>), dipakai buat memastikan target.goTo BENAR-
// BENAR ada di DALAM page yang ditunjuk target.page — bukan cuma ada di
// suatu tempat di HTML (id="page-<page>" nyata ada tidak cukup, karena id
// goTo bisa saja nyasar tersisa/pindah ke page LAIN — lihat insiden registry
// Tahap 3b: target.page masih 'dashboard' padahal elemen goTo-nya sudah
// dipindah ke 'dashboard-hub').
function extractPageBlock(html, pageId) {
  const re = new RegExp(`<div class="page[^"]*" id="${pageId}">`);
  const m = html.match(re);
  if (!m) return null;
  const start = m.index;
  let i = start + m[0].length;
  let depth = 1;
  while (i < html.length && depth > 0) {
    if (html.startsWith('<div', i)) { depth++; i += 4; continue; }
    if (html.startsWith('</div>', i)) { depth--; i += 6; continue; }
    i++;
  }
  return html.slice(start, i);
}

function allSourceJsText() {
  // Gabungan seluruh file .js di root project (bukan node_modules/tests/
  // archive/backups) — dipakai buat verifikasi target.action beneran ada.
  return fs.readdirSync(ROOT)
    .filter((f) => f.endsWith('.js') && !f.endsWith('.min.js'))
    .map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8'))
    .join('\n');
}

test('FEATURE_REGISTRY — struktur dasar', () => {
  const { FEATURE_REGISTRY } = ctx();
  assert.ok(Array.isArray(FEATURE_REGISTRY));
  assert.ok(FEATURE_REGISTRY.length >= 10, 'blueprint §1 menyebut 10 kategori');

  // ADR-001 §2.1: "key" unik secara GLOBAL lintas SELURUH registry — cat.key
  // dan f.key berbagi SATU ruang nama datar, bukan dua ruang nama yang
  // kebetulan tidak pernah tabrakan. Satu Set dipakai untuk keduanya.
  const allKeys = new Set();
  for (const cat of FEATURE_REGISTRY) {
    assert.equal(typeof cat.key, 'string');
    assert.ok(cat.key.length > 0);
    assert.ok(!allKeys.has(cat.key), `key duplikat (ruang nama global cat+feature): ${cat.key}`);
    allKeys.add(cat.key);

    assert.equal(typeof cat.label, 'string');
    assert.ok(cat.label.length > 0);
    assert.equal(typeof cat.icon, 'string');
    assert.ok(cat.icon.length > 0);
    assert.equal(typeof cat.desc, 'string');
    assert.ok(cat.desc.length > 0 && cat.desc.length <= 60);
    assert.ok(Array.isArray(cat.features));
    assert.ok(cat.features.length > 0, `kategori ${cat.key} tidak boleh kosong (aturan blueprint §1: bukan kategori aspiratif)`);
    // target OPSIONAL di level kategori (ADR-001 §5) — kalau diisi, bentuknya
    // wajib object (shape Target yang sama dgn leaf), divalidasi field-per-
    // field bersama f.target di test-test target.* di bawah (via
    // collectNavEntries), bukan cuma dicek "ada"-nya di sini.
    if (cat.target !== undefined) {
      assert.equal(typeof cat.target, 'object');
      assert.ok(cat.target !== null, `kategori ${cat.key}: target tidak boleh null (hapus field-nya kalau memang tidak openable)`);
    }

    for (const f of cat.features) {
      assert.equal(typeof f.key, 'string');
      assert.ok(f.key.length > 0);
      assert.ok(!allKeys.has(f.key), `key duplikat (ruang nama global cat+feature): ${f.key}`);
      allKeys.add(f.key);

      assert.equal(typeof f.label, 'string');
      assert.ok(f.label.length > 0);
      assert.equal(typeof f.desc, 'string');
      assert.ok(f.desc.length > 0);
      assert.equal(typeof f.target, 'object');
      assert.ok(f.target !== null);
    }
  }
});

test('FEATURE_REGISTRY — invariant ADR-001 §2.1: key unik GLOBAL lintas cat.key + f.key (satu himpunan datar, bukan dua himpunan terpisah)', () => {
  // Test eksplisit terpisah dari "struktur dasar" di atas supaya invariant
  // ini py nama/pesan kegagalan sendiri yang jelas menunjuk ke ADR, dan
  // supaya kalau ada yang menyederhanakan test "struktur dasar" nanti,
  // invariant global-uniqueness ini tidak ikut hilang tanpa sadar.
  const { FEATURE_REGISTRY } = ctx();
  const entries = collectNavEntries(FEATURE_REGISTRY);
  const seen = new Map(); // key -> scope, buat pesan error yang bisa nunjuk lokasi tabrakan
  const dupes = [];
  for (const e of entries) {
    if (seen.has(e.key)) {
      dupes.push(`"${e.key}" dipakai sbg ${seen.get(e.key)} DAN ${e.scope} (kategori "${e.catLabel}")`);
    } else {
      seen.set(e.key, e.scope);
    }
  }
  assert.deepEqual(dupes, [], `key tidak unik secara global:\n${dupes.join('\n')}`);
  assert.equal(seen.size, entries.length, 'jumlah key unik harus sama dgn jumlah entry (cat + feature)');
});

test('FEATURE_REGISTRY — registry TIDAK termutasi saat dikumpulkan/divalidasi (collectNavEntries murni baca, tidak menulis)', () => {
  // Guard sebelum cat.target sungguhan diaktifkan di Langkah 2: memastikan
  // proses pengumpulan/validasi (di sini & di semua test target.* di bawah)
  // tidak diam-diam menambah/mengubah properti di objek cat/f asli — kalau
  // sampai memutasi, test lain yang jalan setelahnya bisa false-positive/
  // false-negative tanpa sebab yang kelihatan.
  const { FEATURE_REGISTRY } = ctx();
  const before = JSON.stringify(FEATURE_REGISTRY);
  collectNavEntries(FEATURE_REGISTRY);
  collectNavEntries(FEATURE_REGISTRY); // dipanggil 2x - mutasi kumulatif (kalau ada) harus tetap kelihatan
  const after = JSON.stringify(FEATURE_REGISTRY);
  assert.equal(after, before, 'FEATURE_REGISTRY berubah setelah dikumpulkan/divalidasi — collectNavEntries (atau pemanggilnya) tidak boleh menulis ke objek registry');
});

test('FEATURE_REGISTRY — target.page valid (cocok id="page-<page>" nyata) — cat.target & f.target setara (ADR-001 §5)', () => {
  const { FEATURE_REGISTRY } = ctx();
  for (const e of collectNavEntries(FEATURE_REGISTRY)) {
    if (!e.target || !e.target.page) continue; // fitur modal-only (mis. WorthIt), atau kategori tanpa target
    assert.ok(
      KNOWN_PAGES.includes(e.target.page),
      `${e.key} (${e.scope}): target.page "${e.target.page}" bukan salah satu page yang nyata ada`
    );
    assert.ok(
      idExistsInHtml(`page-${e.target.page}`),
      `${e.key} (${e.scope}): id="page-${e.target.page}" tidak ditemukan di index.html/app_production.html`
    );
  }
});

test('FEATURE_REGISTRY — target.tab valid sesuai TAB REFERENSI per page — cat.target & f.target setara (ADR-001 §5)', () => {
  const { FEATURE_REGISTRY } = ctx();
  for (const e of collectNavEntries(FEATURE_REGISTRY)) {
    if (!e.target || !e.target.tab) continue;
    const allowed = KNOWN_TABS[e.target.page];
    assert.ok(allowed, `${e.key} (${e.scope}): page "${e.target.page}" tidak punya tab yang dikenal`);
    assert.ok(
      allowed.includes(e.target.tab),
      `${e.key} (${e.scope}): tab "${e.target.tab}" bukan tab valid utk page "${e.target.page}" (valid: ${allowed.join(',')})`
    );
  }
});

test('FEATURE_REGISTRY — target.goTo mengarah ke id yang nyata ada di DOM — cat.target & f.target setara (ADR-001 §5)', () => {
  const { FEATURE_REGISTRY } = ctx();
  const missing = [];
  for (const e of collectNavEntries(FEATURE_REGISTRY)) {
    if (!e.target || !e.target.goTo) continue;
    if (!idExistsInHtml(e.target.goTo)) missing.push(`${e.key} (${e.scope}) -> #${e.target.goTo}`);
  }
  assert.deepEqual(missing, [], `target.goTo mengarah ke id yang tidak ada: ${missing.join(', ')}`);
});

test('FEATURE_REGISTRY — target.goTo BENAR-BENAR berada di dalam page yang ditunjuk target.page (bukan cuma sama-sama ada di HTML) — cat.target & f.target setara (ADR-001 §5)', () => {
  const { FEATURE_REGISTRY } = ctx();
  const HTML_SOURCES = { 'index.html': INDEX_HTML, 'app_production.html': APP_PRODUCTION_HTML };
  const problems = [];
  for (const [file, html] of Object.entries(HTML_SOURCES)) {
    for (const e of collectNavEntries(FEATURE_REGISTRY)) {
      if (!e.target || !e.target.goTo || !e.target.page) continue;
      const pageId = `page-${e.target.page}`;
      const block = extractPageBlock(html, pageId);
      if (!block) {
        problems.push(`${file}: ${e.key} (${e.scope}) - blok #${pageId} tidak ditemukan`);
        continue;
      }
      if (!new RegExp(`id="${e.target.goTo}"`).test(block)) {
        problems.push(
          `${file}: ${e.key} (${e.scope}) - target.goTo "${e.target.goTo}" TIDAK ada di dalam #${pageId} ` +
          `(target.page menunjuk page yang salah, atau elemen goTo sudah pindah page tapi registry belum di-update)`
        );
      }
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('FEATURE_REGISTRY — target.group (Settings) mengarah ke stgGroup yang nyata ada — cat.target & f.target setara (ADR-001 §5)', () => {
  const { FEATURE_REGISTRY } = ctx();
  for (const e of collectNavEntries(FEATURE_REGISTRY)) {
    if (!e.target || !e.target.group) continue;
    assert.equal(e.target.page, 'settings', `${e.key} (${e.scope}): target.group cuma valid kalau target.page==='settings'`);
    assert.ok(
      idExistsInHtml(e.target.group),
      `${e.key} (${e.scope}): id="${e.target.group}" (stgGroup) tidak ditemukan di HTML`
    );
  }
});

test('FEATURE_REGISTRY — target.dashKey cocok dgn key nyata di DASH_CARD_DEFS', () => {
  const { FEATURE_REGISTRY } = ctx();
  const modulesRenderSrc = fs.readFileSync(path.join(ROOT, 'modules-render.js'), 'utf8');
  const defsMatch = modulesRenderSrc.match(/const DASH_CARD_DEFS\s*=\s*\[([\s\S]*?)\];/);
  assert.ok(defsMatch, 'DASH_CARD_DEFS tidak ditemukan di modules-render.js (source berubah?)');
  const dashKeys = new Set();
  const keyRe = /key:\s*'([^']+)'/g;
  let m;
  while ((m = keyRe.exec(defsMatch[1]))) dashKeys.add(m[1]);
  assert.ok(dashKeys.size > 0);

  for (const e of collectNavEntries(FEATURE_REGISTRY)) {
    if (!e.target || !e.target.dashKey) continue;
    assert.ok(
      dashKeys.has(e.target.dashKey),
      `${e.key} (${e.scope}): dashKey "${e.target.dashKey}" tidak ada di DASH_CARD_DEFS (${[...dashKeys].join(',')})`
    );
  }
});

test('FEATURE_REGISTRY — target.action mengacu ke fungsi/data-action yang nyata ada — cat.target & f.target setara (ADR-001 §5)', () => {
  const { FEATURE_REGISTRY } = ctx();
  const jsBlob = allSourceJsText();
  for (const e of collectNavEntries(FEATURE_REGISTRY)) {
    if (!e.target || !e.target.action) continue;
    const action = e.target.action;
    const found =
      INDEX_HTML.includes(`data-action="${action}"`) ||
      (action.includes('.')
        ? jsBlob.includes(action) // pola "Modul.fn" mis. WorthIt.open / GoldImport.open
        : jsBlob.includes(`function ${action}(`));
    assert.ok(found, `${e.key} (${e.scope}): action "${action}" tidak ditemukan sbg data-action maupun deklarasi function`);
  }
});

test('FEATURE_REGISTRY — tiap kategori blueprint §1 (10 kategori) ada persis 1x', () => {
  const { FEATURE_REGISTRY } = ctx();
  const expectedLabels = [
    'Dashboard', 'Keuangan', 'Bisnis', 'Kendaraan', 'Pajak & Zakat',
    'Aset', 'Personal', 'AI', 'Backup', 'Settings',
  ];
  const actualLabels = FEATURE_REGISTRY.map((c) => c.label);
  for (const label of expectedLabels) {
    assert.ok(actualLabels.includes(label), `kategori "${label}" dari blueprint §1 tidak ditemukan di registry`);
  }
  assert.equal(actualLabels.length, expectedLabels.length, 'jumlah kategori tidak sama dgn blueprint §1');
});
