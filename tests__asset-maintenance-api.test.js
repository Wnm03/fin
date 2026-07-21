'use strict';
// tests/asset-maintenance-api.test.js — AssetMaintenanceAPI
// (modules/asset/asset-maintenance-api.js). S104 (Batch 10) — Asset
// Maintenance Foundation: Maintenance Overview, Needs Attention List,
// Maintenance Summary, summary(). 100% reuse Penyusutan.hitung() /
// Penyusutan._monthsBetween() / todayStr() / Aset.ICON. Pola sama
// persis tests/asset-portfolio-api.test.js — dependency di-mock lewat
// loadSource extraGlobals (isolasi murni).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts = {}) {
  const ctx = loadSource(['modules/asset/asset-maintenance-api.js'], {
    ...opts,
  }, ['AssetMaintenanceAPI']);
  return { AssetMaintenanceAPI: ctx.AssetMaintenanceAPI };
}

function fullDeps(overrides = {}) {
  return Object.assign({
    todayStr: () => '2026-07-20',
    Aset: { ICON: { 'Kendaraan': '🏍️', 'Rumah/Bangunan': '🏠', 'Lainnya': '📦' } },
    Penyusutan: {
      _monthsBetween(dariStr, keStr) {
        const dari = new Date(dariStr); const ke = new Date(keStr);
        if (isNaN(dari) || isNaN(ke)) return 0;
        let months = (ke.getFullYear() - dari.getFullYear()) * 12 + (ke.getMonth() - dari.getMonth());
        if (ke.getDate() < dari.getDate()) months -= 1;
        return Math.max(0, months);
      },
      hitung(a) {
        if (!a || !a.penyusutan || !a.penyusutan.aktif) return null;
        // Simulasi sederhana: habisManfaat true kalau flag eksplisit di fixture
        return { metode: a.penyusutan.metode || 'garisLurus', hargaPerolehan: a.modalInvestasi || null, nilaiBuku: a._nilaiBukuFixture || 0, akumulasi: a._akumulasiFixture || 0, habisManfaat: !!a._habisManfaatFixture };
      },
    },
    D: {
      assets: [
        { id: 1, name: 'Motor Bebek', jenis: 'Kendaraan', nilai: 5000000, tanggal: '2020-01-01', modalInvestasi: 15000000, penyusutan: { aktif: true, metode: 'garisLurus' }, _habisManfaatFixture: true, _nilaiBukuFixture: 0, _akumulasiFixture: 15000000 },
        { id: 2, name: 'Rumah', jenis: 'Rumah/Bangunan', nilai: 500000000, tanggal: '2022-06-15', penyusutan: { aktif: true, metode: 'garisLurus' }, _habisManfaatFixture: false, _nilaiBukuFixture: 400000000, _akumulasiFixture: 20000000 },
        { id: 3, name: 'Perhiasan', jenis: 'Lainnya', nilai: 10000000, tanggal: '2024-01-01' },
      ],
    },
  }, overrides);
}

test('asset-maintenance-api.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

// ================= maintenanceOverview =================

test('maintenanceOverview() — Penyusutan belum dimuat: ok:false', () => {
  const { AssetMaintenanceAPI } = makeCtx(fullDeps({ Penyusutan: undefined }));
  const r = AssetMaintenanceAPI.maintenanceOverview();
  assert.equal(r.ok, false);
  assert.match(r.reason, /Penyusutan belum dimuat/);
});

test('maintenanceOverview() — D.assets tidak ada: ok:true, items kosong (tidak error)', () => {
  const { AssetMaintenanceAPI } = makeCtx(fullDeps({ D: undefined }));
  const r = AssetMaintenanceAPI.maintenanceOverview();
  assert.equal(r.ok, true);
  assert.equal(r.count, 0);
});

test('maintenanceOverview() — tiap aset dapat ageMonths, depreciation, needsAttention', () => {
  const { AssetMaintenanceAPI } = makeCtx(fullDeps());
  const r = AssetMaintenanceAPI.maintenanceOverview();
  assert.equal(r.ok, true);
  assert.equal(r.count, 3);
  const motor = r.items.find((x) => x.id === 1);
  assert.equal(motor.depreciationActive, true);
  assert.equal(motor.needsAttention, true);
  assert.equal(motor.icon, '🏍️');
  assert.ok(motor.ageMonths > 0);
  const rumah = r.items.find((x) => x.id === 2);
  assert.equal(rumah.needsAttention, false);
  const perhiasan = r.items.find((x) => x.id === 3);
  assert.equal(perhiasan.depreciationActive, false);
  assert.equal(perhiasan.depreciation, null);
  assert.equal(perhiasan.needsAttention, false);
});

test('maintenanceOverview() — aset tanpa tanggal: ageMonths null (tidak error)', () => {
  const { AssetMaintenanceAPI } = makeCtx(fullDeps({
    D: { assets: [{ id: 9, name: 'Tanpa Tanggal', jenis: 'Lainnya', nilai: 1000000 }] },
  }));
  const r = AssetMaintenanceAPI.maintenanceOverview();
  assert.equal(r.ok, true);
  assert.equal(r.items[0].ageMonths, null);
});

// ================= needsAttentionList =================

test('needsAttentionList() — meneruskan ok:false dari maintenanceOverview()', () => {
  const { AssetMaintenanceAPI } = makeCtx(fullDeps({ Penyusutan: undefined }));
  const r = AssetMaintenanceAPI.needsAttentionList();
  assert.equal(r.ok, false);
});

test('needsAttentionList() — hanya aset habisManfaat:true yang muncul', () => {
  const { AssetMaintenanceAPI } = makeCtx(fullDeps());
  const r = AssetMaintenanceAPI.needsAttentionList();
  assert.equal(r.ok, true);
  assert.equal(r.count, 1);
  assert.equal(r.items[0].name, 'Motor Bebek');
});

// ================= maintenanceSummary =================

test('maintenanceSummary() — meneruskan ok:false dari maintenanceOverview()', () => {
  const { AssetMaintenanceAPI } = makeCtx(fullDeps({ Penyusutan: undefined }));
  const r = AssetMaintenanceAPI.maintenanceSummary();
  assert.equal(r.ok, false);
});

test('maintenanceSummary() — totalAssets/trackedCount/untrackedCount/needsAttentionCount benar', () => {
  const { AssetMaintenanceAPI } = makeCtx(fullDeps());
  const r = AssetMaintenanceAPI.maintenanceSummary();
  assert.equal(r.ok, true);
  assert.equal(r.totalAssets, 3);
  assert.equal(r.trackedCount, 2);
  assert.equal(r.untrackedCount, 1);
  assert.equal(r.needsAttentionCount, 1);
});

test('maintenanceSummary() — tidak ada aset: semua nol (tidak error)', () => {
  const { AssetMaintenanceAPI } = makeCtx(fullDeps({ D: { assets: [] } }));
  const r = AssetMaintenanceAPI.maintenanceSummary();
  assert.equal(r.ok, true);
  assert.equal(r.totalAssets, 0);
  assert.equal(r.trackedCount, 0);
  assert.equal(r.needsAttentionCount, 0);
});

// ================= summary =================

test('summary() — ok true & menggabungkan stats + needsAttention, tidak ada logic tambahan', () => {
  const { AssetMaintenanceAPI } = makeCtx(fullDeps());
  const r = AssetMaintenanceAPI.summary();
  assert.equal(r.ok, true);
  assert.equal(r.stats.totalAssets, 3);
  assert.equal(r.needsAttention.count, 1);
});

test('summary() — dependency dasar hilang: ok false, tidak throw', () => {
  const { AssetMaintenanceAPI } = makeCtx(fullDeps({ Penyusutan: undefined }));
  assert.doesNotThrow(() => AssetMaintenanceAPI.summary());
  const r = AssetMaintenanceAPI.summary();
  assert.equal(r.ok, false);
});
