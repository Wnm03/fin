'use strict';
// tests/property-management-api.test.js — PropertyManagementAPI
// (modules/asset/property-management-api.js). S102 (Batch 10) —
// Property Management Foundation: Property List, Portfolio Value, Tax
// Summary, Depreciation Summary, summary(). 100% reuse
// PajakAset.JENIS_PROPERTI / PajakAset.hitungPBB() / Penyusutan.hitung()
// / Aset.ICON. Pola sama persis tests/asset-portfolio-api.test.js —
// dependency di-mock lewat loadSource extraGlobals (isolasi murni).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts = {}) {
  const ctx = loadSource(['modules/asset/property-management-api.js'], {
    ...opts,
  }, ['PropertyManagementAPI']);
  return { PropertyManagementAPI: ctx.PropertyManagementAPI };
}

function fullDeps(overrides = {}) {
  return Object.assign({
    PajakAset: {
      JENIS_PROPERTI: ['Tanah', 'Rumah/Bangunan'],
      settings: () => ({ njoptkp: 12000000, tarifPersen: 0.5 }),
      hitungPBB(a, s) {
        if (!a || !this.JENIS_PROPERTI.includes(a.jenis)) return null;
        const njop = a.nilai || 0;
        const njoptkp = s.njoptkp || 0;
        const dasar = Math.max(0, njop - njoptkp);
        const terutang = Math.round(dasar * (s.tarifPersen || 0) / 100);
        return { njop, njoptkp, dasar, terutang };
      },
    },
    Penyusutan: {
      hitung(a) {
        if (!a || !a.penyusutan) return null;
        return { metode: 'garisLurus', hargaPerolehan: 100000000, nilaiBuku: 80000000, akumulasi: 20000000 };
      },
    },
    Aset: { ICON: { 'Tanah': '🏞️', 'Rumah/Bangunan': '🏠', 'Kendaraan': '🏍️' } },
    D: {
      assets: [
        { id: 1, name: 'Tanah Kavling', jenis: 'Tanah', nilai: 200000000, lokasi: 'Bogor' },
        { id: 2, name: 'Rumah Utama', jenis: 'Rumah/Bangunan', nilai: 500000000, lokasi: 'Depok', penyusutan: { aktif: true } },
        { id: 3, name: 'Motor', jenis: 'Kendaraan', nilai: 20000000 },
      ],
    },
  }, overrides);
}

test('property-management-api.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

// ================= propertyList =================

test('propertyList() — PajakAset belum dimuat: ok:false', () => {
  const { PropertyManagementAPI } = makeCtx(fullDeps({ PajakAset: undefined }));
  const r = PropertyManagementAPI.propertyList();
  assert.equal(r.ok, false);
  assert.match(r.reason, /PajakAset belum dimuat/);
});

test('propertyList() — D.assets tidak ada: ok:true, list kosong (tidak error)', () => {
  const { PropertyManagementAPI } = makeCtx(fullDeps({ D: undefined }));
  const r = PropertyManagementAPI.propertyList();
  assert.equal(r.ok, true);
  assert.equal(r.count, 0);
});

test('propertyList() — hanya jenis Tanah/Rumah-Bangunan yang ikut (Kendaraan difilter)', () => {
  const { PropertyManagementAPI } = makeCtx(fullDeps());
  const r = PropertyManagementAPI.propertyList();
  assert.equal(r.ok, true);
  assert.equal(r.count, 2);
  assert.deepEqual(r.properties.map((p) => p.jenis).sort(), ['Rumah/Bangunan', 'Tanah']);
  const tanah = r.properties.find((p) => p.jenis === 'Tanah');
  assert.equal(tanah.icon, '🏞️');
  assert.equal(tanah.nilai, 200000000);
});

// ================= portfolioValue =================

test('portfolioValue() — meneruskan ok:false dari propertyList()', () => {
  const { PropertyManagementAPI } = makeCtx(fullDeps({ PajakAset: undefined }));
  const r = PropertyManagementAPI.portfolioValue();
  assert.equal(r.ok, false);
});

test('portfolioValue() — totalValue & breakdown per jenis, diurutkan desc', () => {
  const { PropertyManagementAPI } = makeCtx(fullDeps());
  const r = PropertyManagementAPI.portfolioValue();
  assert.equal(r.ok, true);
  assert.equal(r.totalValue, 700000000);
  assert.equal(r.breakdown.length, 2);
  assert.equal(r.breakdown[0].jenis, 'Rumah/Bangunan');
  assert.equal(r.breakdown[0].nilai, 500000000);
  const sumPct = r.breakdown.reduce((s, b) => s + b.pct, 0);
  assert.ok(Math.abs(sumPct - 100) < 0.0001);
});

test('portfolioValue() — tidak ada properti: totalValue 0, breakdown kosong (guard div-by-zero)', () => {
  const { PropertyManagementAPI } = makeCtx(fullDeps({ D: { assets: [] } }));
  const r = PropertyManagementAPI.portfolioValue();
  assert.equal(r.ok, true);
  assert.equal(r.totalValue, 0);
  assert.equal(r.breakdown.length, 0);
});

// ================= taxSummary =================

test('taxSummary() — PajakAset.hitungPBB belum dimuat: ok:false', () => {
  const { PropertyManagementAPI } = makeCtx(fullDeps({ PajakAset: undefined }));
  const r = PropertyManagementAPI.taxSummary();
  assert.equal(r.ok, false);
  assert.match(r.reason, /PajakAset belum dimuat/);
});

test('taxSummary() — totalPBB dijumlahkan dari PajakAset.hitungPBB() per item', () => {
  const { PropertyManagementAPI } = makeCtx(fullDeps());
  const r = PropertyManagementAPI.taxSummary();
  assert.equal(r.ok, true);
  assert.equal(r.count, 2);
  // Tanah: (200jt-12jt)*0.5% = 940000; Rumah: (500jt-12jt)*0.5% = 2440000
  assert.equal(r.items.find((i) => i.jenis === 'Tanah').pbb.terutang, 940000);
  assert.equal(r.items.find((i) => i.jenis === 'Rumah/Bangunan').pbb.terutang, 2440000);
  assert.equal(r.totalPBB, 940000 + 2440000);
});

// ================= depreciationSummary =================

test('depreciationSummary() — Penyusutan belum dimuat: ok:false', () => {
  const { PropertyManagementAPI } = makeCtx(fullDeps({ Penyusutan: undefined }));
  const r = PropertyManagementAPI.depreciationSummary();
  assert.equal(r.ok, false);
  assert.match(r.reason, /Penyusutan belum dimuat/);
});

test('depreciationSummary() — hanya properti dgn penyusutan.aktif yang dihitung', () => {
  const { PropertyManagementAPI } = makeCtx(fullDeps());
  const r = PropertyManagementAPI.depreciationSummary();
  assert.equal(r.ok, true);
  assert.equal(r.jumlahAktif, 1);
  assert.equal(r.totalAkumulasi, 20000000);
  assert.equal(r.totalNilaiBuku, 80000000);
  assert.equal(r.belumLengkap, 0);
});

test('depreciationSummary() — tidak ada properti dgn penyusutan aktif: semua nol', () => {
  const { PropertyManagementAPI } = makeCtx(fullDeps({
    D: { assets: [{ id: 1, name: 'Tanah', jenis: 'Tanah', nilai: 100000000 }] },
  }));
  const r = PropertyManagementAPI.depreciationSummary();
  assert.equal(r.ok, true);
  assert.equal(r.jumlahAktif, 0);
  assert.equal(r.totalAkumulasi, 0);
  assert.equal(r.totalNilaiBuku, 0);
});

// ================= summary =================

test('summary() — ok true & menggabungkan seluruh sub-hasil, tidak ada logic tambahan', () => {
  const { PropertyManagementAPI } = makeCtx(fullDeps());
  const r = PropertyManagementAPI.summary();
  assert.equal(r.ok, true);
  assert.equal(r.portfolio.totalValue, 700000000);
  assert.equal(r.tax.totalPBB, 940000 + 2440000);
  assert.equal(r.depreciation.jumlahAktif, 1);
});

test('summary() — dependency dasar hilang: ok false, tidak throw', () => {
  const { PropertyManagementAPI } = makeCtx(fullDeps({ PajakAset: undefined }));
  assert.doesNotThrow(() => PropertyManagementAPI.summary());
  const r = PropertyManagementAPI.summary();
  assert.equal(r.ok, false);
});
