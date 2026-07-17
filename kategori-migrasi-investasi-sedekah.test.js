'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// Cakupan file ini: migrasi data baru di features-helpers-global-security.js
// (DATA_MIGRATIONS, toVersion:2) yang menambahkan 2 kategori pengeluaran baku
// baru — "Investasi" (cat_inv) & "Sedekah/Donasi" (cat_sedekah) — utk user
// LAMA yang D.categories-nya sudah tersimpan sebelum patch ini ada (user baru
// otomatis kedapatan lewat DEFAULT_CATS di renovasi.js, sudah dites terpisah
// di bawah). runDataMigrations() sendiri murni memanggil D langsung (tidak
// sentuh DOM), jadi cukup di-load via loadSource dgn D milik test + stub
// minimal DEFAULT_* (dibutuhkan krn top-level `let D = {...}` di file itu
// membaca konstanta² tsb saat file di-load, meski kita timpa lagi D-nya
// sendiri sebelum panggil runDataMigrations).

function loadMigrations(extra = {}) {
  const ctx = loadSource(['features-helpers-global-security.js'], {
    DEFAULT_COBEK_KATEGORI: [],
    DEFAULT_ACCOUNTS: [],
    DEFAULT_SPAREPARTS: [],
    DEFAULT_CATS: { income: [], expense: [{ id: 'cat_lx', name: 'Lainnya', emoji: '📦', subs: [] }] },
    ...extra,
  }, ['runDataMigrations', 'DATA_MIGRATIONS', 'SCHEMA_VERSION', 'D']);
  return ctx;
}

// PENTING: `D` di file itu dideklarasikan `let` (bukan `var`), jadi expose()
// cuma bikin sandbox.D MENUNJUK ke objek yang sama (referensi), BUKAN
// membuatnya reassignable dari luar. Test ini SENGAJA mutasi properti di
// `ctx.D` (Object.assign / assign properti satu-satu), BUKAN `ctx.D = {...}`
// — reassign penuh cuma menimpa properti sandbox, tidak menyentuh binding
// `D` asli yang dibaca closure runDataMigrations/migrate().
function setD(ctx, patch) {
  Object.keys(ctx.D).forEach((k) => delete ctx.D[k]);
  Object.assign(ctx.D, patch);
}

test('SCHEMA_VERSION sudah naik ke 2 (migrasi kategori Investasi & Sedekah/Donasi terdaftar)', () => {
  const ctx = loadMigrations();
  assert.equal(ctx.SCHEMA_VERSION, 3);
  assert.ok(ctx.DATA_MIGRATIONS.some((m) => m.toVersion === 2));
});

test('runDataMigrations — user lama (fromVersion 0/undefined) dgn kategori tersimpan -> kedua kategori baru ditambahkan', () => {
  const ctx = loadMigrations();
  setD(ctx, {
    schemaVersion: undefined,
    categories: {
      income: [{ id: 'cat_gi', name: 'Gaji toko', emoji: '💼', subs: [] }],
      expense: [
        { id: 'cat_mk', name: 'Makan', emoji: '🍽️', subs: [] },
        { id: 'cat_lx', name: 'Lainnya', emoji: '📦', subs: [] },
      ],
    },
  });
  ctx.runDataMigrations(0);
  const ids = ctx.D.categories.expense.map((c) => c.id);
  assert.ok(ids.includes('cat_inv'), 'kategori Investasi harus ditambahkan');
  assert.ok(ids.includes('cat_sedekah'), 'kategori Sedekah/Donasi harus ditambahkan');
  // Kategori pengeluaran lain yang sudah ada tidak boleh hilang/berubah.
  assert.ok(ids.includes('cat_mk'));
  assert.ok(ids.includes('cat_lx'));
  // Kategori pemasukan tidak disentuh oleh migrasi ini.
  assert.deepEqual(ctx.D.categories.income.map((c) => c.id), ['cat_gi']);
  // schemaVersion ikut ter-update ke versi terbaru.
  assert.equal(ctx.D.schemaVersion, 3);
});

test('runDataMigrations — sudah di schemaVersion terbaru -> tidak dobel-tambah kategori', () => {
  const ctx = loadMigrations();
  setD(ctx, {
    schemaVersion: 2,
    categories: {
      income: [],
      expense: [
        { id: 'cat_inv', name: 'Investasi', emoji: '📈', subs: [] },
        { id: 'cat_sedekah', name: 'Sedekah/Donasi', emoji: '🤲', subs: [] },
        { id: 'cat_lx', name: 'Lainnya', emoji: '📦', subs: [] },
      ],
    },
  });
  ctx.runDataMigrations(2);
  const invCount = ctx.D.categories.expense.filter((c) => c.id === 'cat_inv').length;
  const sedekahCount = ctx.D.categories.expense.filter((c) => c.id === 'cat_sedekah').length;
  assert.equal(invCount, 1);
  assert.equal(sedekahCount, 1);
  assert.equal(ctx.D.categories.expense.length, 3);
});

test('runDataMigrations — user sudah pernah bikin kategori manual dgn nama sama persis -> tidak dobel (dicek by name, case-insensitive)', () => {
  const ctx = loadMigrations();
  setD(ctx, {
    schemaVersion: undefined,
    categories: {
      income: [],
      expense: [
        { id: 'cat_custom_1', name: 'investasi', emoji: '💹', subs: [] }, // dibuat manual sblm migrasi, huruf kecil
        { id: 'cat_lx', name: 'Lainnya', emoji: '📦', subs: [] },
      ],
    },
  });
  ctx.runDataMigrations(0);
  const invEntries = ctx.D.categories.expense.filter((c) => /^investasi$/i.test(c.name || ''));
  assert.equal(invEntries.length, 1, 'tidak boleh nambah kategori Investasi kedua kalau user sudah punya kategori dgn nama sama');
  // Sedekah/Donasi tetap ditambahkan krn belum ada.
  assert.ok(ctx.D.categories.expense.some((c) => c.id === 'cat_sedekah'));
});

test('runDataMigrations — D.categories belum ada sama sekali (user benar2 baru, ditangani DEFAULT_CATS bukan migrasi ini) -> aman, tidak error', () => {
  const ctx = loadMigrations();
  setD(ctx, { schemaVersion: undefined });
  assert.doesNotThrow(() => ctx.runDataMigrations(0));
  assert.equal(ctx.D.schemaVersion, 3);
});

test('DEFAULT_CATS.expense (renovasi.js) — user BARU langsung dapat kategori Investasi & Sedekah/Donasi tanpa perlu migrasi', () => {
  const ctx = loadSource(['renovasi.js'], {
    D: { renovProjects: [] },
    escapeHtml: (s) => String(s == null ? '' : s),
  }, ['DEFAULT_CATS']);
  const names = ctx.DEFAULT_CATS.expense.map((c) => c.name);
  assert.ok(names.includes('Investasi'));
  assert.ok(names.includes('Sedekah/Donasi'));
});
