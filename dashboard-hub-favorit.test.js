'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadSource } = require('./helpers/loadSource');

// dashboard-hub-favorit.js — storage + service MURNI (Langkah 6, ADR-001
// §3/§4/§5, blueprint Favorit final). Tidak baca/tulis DOM, jadi dites lewat
// loadSource() biasa (bukan document tiruan custom, pola sama dgn
// tests/gaji-calc.test.js) — `D` & `save()` di-inject langsung sbg
// extraGlobals, `window` juga di-inject sbg objek polos supaya
// window.DashboardHubFavorit mudah diperiksa isinya persis.

function makeFavorit(initialFavoritKeys) {
  const D = { favoritKeys: initialFavoritKeys };
  const saveCalls = [];
  const windowStub = {};
  const ctx = loadSource(['dashboard-hub-favorit.js'], {
    D,
    save: (...args) => saveCalls.push(args),
    window: windowStub,
  });
  return { ctx, D, saveCalls, window: windowStub };
}

test('getFavoritKeys() — default D.favoritKeys=[] (sesuai default literal D di features-helpers-global-security.js) dikembalikan apa adanya', () => {
  const { ctx } = makeFavorit([]);
  assert.deepEqual(ctx.getFavoritKeys(), []);
});

test('getFavoritKeys() — mengembalikan REFERENSI D.favoritKeys yang sama persis, bukan clone/copy', () => {
  const { ctx, D } = makeFavorit(['a', 'b']);
  const result = ctx.getFavoritKeys();
  assert.equal(result, D.favoritKeys, 'harus reference identik (===), bukan array baru dengan isi sama');
  // Bukti tambahan: mutasi langsung ke D.favoritKeys (di luar toggleFavorit,
  // simulasi state internal berubah) langsung kelihatan dari getFavoritKeys()
  // berikutnya, krn memang tidak pernah di-clone.
  D.favoritKeys.push('c');
  assert.deepEqual(ctx.getFavoritKeys(), ['a', 'b', 'c']);
});

test('toggleFavorit(key) — key belum ada -> ditambahkan (push) ke akhir array', () => {
  const { ctx, D } = makeFavorit([]);
  ctx.toggleFavorit('keu-transaksi');
  assert.deepEqual(D.favoritKeys, ['keu-transaksi']);
});

test('toggleFavorit(key) — key sudah ada -> dihapus (splice), bukan ditambah lagi', () => {
  const { ctx, D } = makeFavorit(['keu-transaksi', 'ai']);
  ctx.toggleFavorit('keu-transaksi');
  assert.deepEqual(D.favoritKeys, ['ai']);
});

test('toggleFavorit(key) dipanggil 2x berturut-turut pada key yang sama -> kembali ke state semula (idempotent)', () => {
  const { ctx, D } = makeFavorit([]);
  ctx.toggleFavorit('ai');
  ctx.toggleFavorit('ai');
  assert.deepEqual(D.favoritKeys, []);
});

test('toggleFavorit() TIDAK melakukan sorting — urutan array persis mengikuti urutan panggilan push (bukan alfabetis)', () => {
  const { ctx, D } = makeFavorit([]);
  ctx.toggleFavorit('zeta');
  ctx.toggleFavorit('alpha');
  ctx.toggleFavorit('mike');
  assert.deepEqual(D.favoritKeys, ['zeta', 'alpha', 'mike'], 'urutan harus persis urutan push, TIDAK di-sort ulang');
});

test('toggleFavorit() menghapus key di posisi manapun tanpa mengganggu urutan key lain', () => {
  const { ctx, D } = makeFavorit(['zeta', 'alpha', 'mike']);
  ctx.toggleFavorit('alpha'); // hapus yang di tengah
  assert.deepEqual(D.favoritKeys, ['zeta', 'mike'], 'urutan sisanya harus tetap terjaga, bukan ke-reorder');
});

test('toggleFavorit() — guard defensif: D.favoritKeys bukan array (mis. undefined/corrupt) direset jadi [] dulu sebelum push, tidak throw', () => {
  const { ctx, D } = makeFavorit(undefined);
  assert.doesNotThrow(() => ctx.toggleFavorit('ai'));
  // Array kosong internal dibuat DI DALAM sandbox vm (realm beda dari host),
  // jadi dibandingkan per-field (length + index), bukan assert.deepEqual —
  // pola sama dgn catatan cross-realm di tests/helpers/loadSource.js.
  assert.equal(D.favoritKeys.length, 1);
  assert.equal(D.favoritKeys[0], 'ai');
});

test('toggleFavorit() memanggil save() tepat 1x setiap kali dipanggil (add maupun remove)', () => {
  const { ctx, saveCalls } = makeFavorit([]);
  ctx.toggleFavorit('ai');
  assert.equal(saveCalls.length, 1, 'save() harus terpanggil setelah add');
  ctx.toggleFavorit('ai');
  assert.equal(saveCalls.length, 2, 'save() harus terpanggil lagi setelah remove');
});

test('toggleFavorit() TIDAK mengembalikan nilai apa pun (return undefined)', () => {
  const { ctx } = makeFavorit([]);
  assert.equal(ctx.toggleFavorit('ai'), undefined);
});

test('window.DashboardHubFavorit HANYA mengekspos getFavoritKeys & toggleFavorit — tidak ada open/launch/navigate ataupun API lain (guard executor kedua, ADR-001 §4)', () => {
  const { window } = makeFavorit([]);
  assert.ok(window.DashboardHubFavorit, 'window.DashboardHubFavorit harus di-expose');
  const keys = Object.keys(window.DashboardHubFavorit).sort();
  assert.deepEqual(keys, ['getFavoritKeys', 'toggleFavorit'], 'API publik harus PERSIS 2 fungsi ini, tidak lebih tidak kurang');
  assert.equal(typeof window.DashboardHubFavorit.getFavoritKeys, 'function');
  assert.equal(typeof window.DashboardHubFavorit.toggleFavorit, 'function');
  // Assersi eksplisit tambahan sesuai permintaan — redundan dgn cek di atas,
  // tapi sengaja dipertahankan supaya niatnya kelihatan jelas tanpa perlu
  // menyimpulkan dari panjang array keys.
  assert.equal(window.DashboardHubFavorit.open, undefined);
  assert.equal(window.DashboardHubFavorit.launch, undefined);
  assert.equal(window.DashboardHubFavorit.navigate, undefined);
});

// ---------- Guard ADR: satu pintu mutasi (blueprint final §3) ----------

test('guard — hanya dashboard-hub-favorit.js yang boleh menulis ke D.favoritKeys (tidak ada push/splice/assign langsung dari file lain)', () => {
  const ROOT = path.join(__dirname, '..');
  const EXCLUDE_DIRS = new Set(['node_modules', 'tests', 'archive', 'backups', '.github']);

  function walk(dir, acc) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (EXCLUDE_DIRS.has(entry.name)) continue;
        walk(path.join(dir, entry.name), acc);
      } else if (entry.isFile() && entry.name.endsWith('.js') && !entry.name.endsWith('.min.js')) {
        acc.push(path.join(dir, entry.name));
      }
    }
    return acc;
  }

  const jsFiles = walk(ROOT, []);
  assert.ok(jsFiles.length > 50, 'sanity check: harus nemu banyak file .js di root project, bukan cuma 1-2 (kalau kurang, walk() kemungkinan salah scope)');

  const offenders = [];
  for (const file of jsFiles) {
    const rel = path.relative(ROOT, file);
    if (rel === 'dashboard-hub-favorit.js') continue; // satu-satunya yang boleh
    const src = fs.readFileSync(file, 'utf8');
    if (src.includes('D.favoritKeys')) offenders.push(rel);
  }

  assert.deepEqual(offenders, [], `Ditemukan referensi "D.favoritKeys" di luar dashboard-hub-favorit.js (pelanggaran invariant satu pintu mutasi): ${offenders.join(', ')}`);
});
