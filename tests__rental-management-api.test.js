'use strict';
// tests/rental-management-api.test.js — RentalManagementAPI
// (modules/asset/rental-management-api.js). S103 (Batch 10) — Rental
// Management Foundation: Rental Units, Unmanaged Properties, Income
// Summary, summary(). 100% reuse PropertyManagementAPI.propertyList()
// (S102) + LaporanAset.riwayatTransaksi(). Pola sama persis
// tests/property-management-api.test.js — dependency di-mock lewat
// loadSource extraGlobals (isolasi murni).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts = {}) {
  const ctx = loadSource(['modules/asset/rental-management-api.js'], {
    ...opts,
  }, ['RentalManagementAPI']);
  return { RentalManagementAPI: ctx.RentalManagementAPI };
}

function fullDeps(overrides = {}) {
  return Object.assign({
    PropertyManagementAPI: {
      propertyList: () => ({
        ok: true,
        count: 2,
        properties: [
          { id: 1, name: 'Rumah Kontrakan A', jenis: 'Rumah/Bangunan', icon: '🏠', nilai: 400000000, lokasi: '', tanggal: '', accountId: 'acc1', zakatable: false },
          { id: 2, name: 'Tanah Kosong', jenis: 'Tanah', icon: '🏞️', nilai: 150000000, lokasi: '', tanggal: '', accountId: null, zakatable: false },
        ],
      }),
      portfolioValue: () => ({ ok: true, count: 2, totalValue: 550000000, breakdown: [] }),
    },
    LaporanAset: {
      riwayatTransaksi: () => ({
        akunTertaut: [
          { assetId: 1, assetName: 'Rumah Kontrakan A', accountId: 'acc1', accountName: 'BCA Kontrakan', accountExists: true, jumlahTx: 4, totalMasuk: 12000000, totalKeluar: 1500000 },
          { assetId: 3, assetName: 'Motor', accountId: 'acc2', accountName: 'Cash', accountExists: true, jumlahTx: 2, totalMasuk: 0, totalKeluar: 500000 },
        ],
        recentTx: [],
        totalTx: 6,
      }),
    },
  }, overrides);
}

test('rental-management-api.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

// ================= rentalUnits =================

test('rentalUnits() — PropertyManagementAPI belum dimuat: ok:false', () => {
  const { RentalManagementAPI } = makeCtx(fullDeps({ PropertyManagementAPI: undefined }));
  const r = RentalManagementAPI.rentalUnits();
  assert.equal(r.ok, false);
  assert.match(r.reason, /PropertyManagementAPI belum dimuat/);
});

test('rentalUnits() — LaporanAset belum dimuat: ok:false', () => {
  const { RentalManagementAPI } = makeCtx(fullDeps({ LaporanAset: undefined }));
  const r = RentalManagementAPI.rentalUnits();
  assert.equal(r.ok, false);
  assert.match(r.reason, /LaporanAset belum dimuat/);
});

test('rentalUnits() — propertyList() ok:false diteruskan apa adanya', () => {
  const { RentalManagementAPI } = makeCtx(fullDeps({
    PropertyManagementAPI: { propertyList: () => ({ ok: false, reason: 'PajakAset belum dimuat' }) },
  }));
  const r = RentalManagementAPI.rentalUnits();
  assert.equal(r.ok, false);
  assert.match(r.reason, /PajakAset belum dimuat/);
});

test('rentalUnits() — hanya irisan properti & akun tertaut yang muncul (Motor bukan properti, difilter)', () => {
  const { RentalManagementAPI } = makeCtx(fullDeps());
  const r = RentalManagementAPI.rentalUnits();
  assert.equal(r.ok, true);
  assert.equal(r.count, 1);
  const u = r.units[0];
  assert.equal(u.assetId, 1);
  assert.equal(u.name, 'Rumah Kontrakan A');
  assert.equal(u.jenis, 'Rumah/Bangunan');
  assert.equal(u.totalMasuk, 12000000);
  assert.equal(u.totalKeluar, 1500000);
  assert.equal(u.netIncome, 10500000);
});

test('rentalUnits() — Tanah Kosong (belum tertaut akun) TIDAK muncul di rentalUnits', () => {
  const { RentalManagementAPI } = makeCtx(fullDeps());
  const r = RentalManagementAPI.rentalUnits();
  assert.ok(!r.units.some((u) => u.assetId === 2));
});

// ================= unmanagedProperties =================

test('unmanagedProperties() — meneruskan ok:false dari propertyList()', () => {
  const { RentalManagementAPI } = makeCtx(fullDeps({ PropertyManagementAPI: undefined }));
  const r = RentalManagementAPI.unmanagedProperties();
  assert.equal(r.ok, false);
});

test('unmanagedProperties() — properti tanpa accountId muncul di sini', () => {
  const { RentalManagementAPI } = makeCtx(fullDeps());
  const r = RentalManagementAPI.unmanagedProperties();
  assert.equal(r.ok, true);
  assert.equal(r.count, 1);
  assert.equal(r.properties[0].name, 'Tanah Kosong');
});

// ================= incomeSummary =================

test('incomeSummary() — meneruskan ok:false dari rentalUnits()', () => {
  const { RentalManagementAPI } = makeCtx(fullDeps({ LaporanAset: undefined }));
  const r = RentalManagementAPI.incomeSummary();
  assert.equal(r.ok, false);
});

test('incomeSummary() — totalIncome/totalExpense/netIncome dijumlahkan dari rentalUnits()', () => {
  const { RentalManagementAPI } = makeCtx(fullDeps());
  const r = RentalManagementAPI.incomeSummary();
  assert.equal(r.ok, true);
  assert.equal(r.unitCount, 1);
  assert.equal(r.totalIncome, 12000000);
  assert.equal(r.totalExpense, 1500000);
  assert.equal(r.netIncome, 10500000);
});

test('incomeSummary() — tidak ada unit sewa: semua nol (tidak error)', () => {
  const { RentalManagementAPI } = makeCtx(fullDeps({
    LaporanAset: { riwayatTransaksi: () => ({ akunTertaut: [], recentTx: [], totalTx: 0 }) },
  }));
  const r = RentalManagementAPI.incomeSummary();
  assert.equal(r.ok, true);
  assert.equal(r.unitCount, 0);
  assert.equal(r.totalIncome, 0);
  assert.equal(r.totalExpense, 0);
  assert.equal(r.netIncome, 0);
});

// ================= summary =================

test('summary() — ok true & menggabungkan seluruh sub-hasil (income/units/unmanaged/portfolio)', () => {
  const { RentalManagementAPI } = makeCtx(fullDeps());
  const r = RentalManagementAPI.summary();
  assert.equal(r.ok, true);
  assert.equal(r.income.netIncome, 10500000);
  assert.equal(r.units.count, 1);
  assert.equal(r.unmanaged.count, 1);
  assert.equal(r.portfolio.totalValue, 550000000);
});

test('summary() — PropertyManagementAPI.portfolioValue tidak ada: portfolio ok:false, tidak throw', () => {
  const { RentalManagementAPI } = makeCtx(fullDeps({
    PropertyManagementAPI: {
      propertyList: fullDeps().PropertyManagementAPI.propertyList,
    },
  }));
  assert.doesNotThrow(() => RentalManagementAPI.summary());
  const r = RentalManagementAPI.summary();
  assert.equal(r.portfolio.ok, false);
});

test('summary() — dependency dasar hilang: ok false, tidak throw', () => {
  const { RentalManagementAPI } = makeCtx(fullDeps({ LaporanAset: undefined }));
  assert.doesNotThrow(() => RentalManagementAPI.summary());
  const r = RentalManagementAPI.summary();
  assert.equal(r.ok, false);
});
