'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/loadSource');

// Cakupan file ini: PajakInsight.compute(), ShopInsight.compute(), MobilInsight.compute() di
// feature-insights.js (kartu "💡 Insight ..." di paling atas halaman Pajak & Zakat/Shop/Car Notes,
// & item yg disinkronkan ke FinCoach di modules-calc.js). Pola sama dgn test lain di proyek ini:
// loadSource() menjalankan file ASLI di sandbox vm, D/helper murni di-stub minimal & permisif.
// render()/FeatureInsightUI TIDAK dites di sini krn baca/tulis DOM (getElementById) — itu ranah
// smoke-test.js/manual QA, bukan test murni-logika ini (lihat catatan di loadSource.js).

const fmtFull = (n) => 'RpFull' + String(Math.round(n || 0));
const escapeHtml = (s) => String(s == null ? '' : s);
const fmtDateID = (dateStr) => new Date(dateStr).toISOString().slice(0, 10);
function daysUntilDate(dateStr) {
  if (!dateStr) return null;
  const now = new Date('2026-07-16T00:00:00.000Z'); now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.round((target - now) / 86400000);
}
const VEHTAX_ITEMS = {
  tahunan: { label: '🧾 STNK Tahunan', tglKey: 'pajakTahunanTgl', biayaKey: 'biayaTahunan' },
  limaTahun: { label: '🔄 Ganti Plat (5th)', tglKey: 'pajakLimaTahunTgl', biayaKey: 'biayaLimaTahun' },
  uji: { label: '🚗 Uji Kelayakan', tglKey: 'ujiKelayakanTgl', biayaKey: 'biayaUji' },
};

function baseD(overrides = {}) {
  return {
    transactions: [],
    pajakZakat: { nisabPenghasilanBulan: 7640144, zakatLog: [], haulMaalMulai: null },
    bills: [],
    products: [],
    cobek: [],
    vehicles: [],
    simList: [],
    ...overrides,
  };
}

function load(D) {
  return loadSource(['modules/ai/feature-insights.js'], {
    D,
    escapeHtml,
    fmtFull,
    fmtDateID,
    daysUntilDate,
    VEHTAX_ITEMS,
    document: { getElementById: () => null },
  }, ['PajakInsight', 'ShopInsight', 'MobilInsight', 'FeatureInsightUI']);
}

test('PajakInsight.compute — pemasukan di atas nisab & belum dicatat -> muncul insight zakat penghasilan', () => {
  const now = new Date();
  const D = baseD({
    transactions: [{ type: 'income', amount: 10000000, date: now.toISOString().slice(0, 10) }],
  });
  const ctx = load(D);
  const out = ctx.PajakInsight.compute();
  assert.ok(out.some((x) => x.id === 'pajak-zakat-penghasilan'));
});

test('PajakInsight.compute — sudah dicatat dibayar bulan ini -> insight zakat penghasilan tidak muncul lagi', () => {
  const now = new Date();
  const iso = now.toISOString().slice(0, 10);
  const D = baseD({
    transactions: [{ type: 'income', amount: 10000000, date: iso }],
    pajakZakat: { nisabPenghasilanBulan: 7640144, zakatLog: [{ jenis: 'penghasilan', tanggal: iso }], haulMaalMulai: null },
  });
  const ctx = load(D);
  const out = ctx.PajakInsight.compute();
  assert.ok(!out.some((x) => x.id === 'pajak-zakat-penghasilan'));
});

test('PajakInsight.compute — pemasukan di bawah nisab -> tidak ada insight zakat penghasilan', () => {
  const D = baseD({
    transactions: [{ type: 'income', amount: 100000, date: new Date().toISOString().slice(0, 10) }],
  });
  const ctx = load(D);
  const out = ctx.PajakInsight.compute();
  assert.ok(!out.some((x) => x.id === 'pajak-zakat-penghasilan'));
});

test('PajakInsight.compute — PBB terikat tagihan & jatuh tempo dalam 30 hari -> level warning', () => {
  const D = baseD({
    bills: [{ pbbLink: true, nextDue: '2026-07-20', amount: 500000 }],
  });
  const ctx = load(D);
  const out = ctx.PajakInsight.compute();
  const item = out.find((x) => x.id === 'pajak-pbb-due');
  assert.ok(item);
  assert.equal(item.level, 'warning');
});

test('PajakInsight.compute — PBB sudah lewat jatuh tempo -> level danger', () => {
  const D = baseD({
    bills: [{ pbbLink: true, nextDue: '2026-07-01', amount: 500000 }],
  });
  const ctx = load(D);
  const out = ctx.PajakInsight.compute();
  const item = out.find((x) => x.id === 'pajak-pbb-due');
  assert.ok(item);
  assert.equal(item.level, 'danger');
});

test('PajakInsight.compute — PBB jatuh tempo jauh (>30 hari) -> tidak muncul', () => {
  const D = baseD({
    bills: [{ pbbLink: true, nextDue: '2027-01-01', amount: 500000 }],
  });
  const ctx = load(D);
  const out = ctx.PajakInsight.compute();
  assert.ok(!out.some((x) => x.id === 'pajak-pbb-due'));
});

test('PajakInsight.compute — zakat maal sudah mencapai haul -> muncul reminder', () => {
  const mulai = new Date('2025-06-01T00:00:00.000Z');
  const D = baseD({
    pajakZakat: { nisabPenghasilanBulan: 7640144, zakatLog: [], haulMaalMulai: mulai.toISOString().slice(0, 10) },
  });
  const ctx = load(D);
  const out = ctx.PajakInsight.compute();
  assert.ok(out.some((x) => x.id === 'pajak-zakat-maal-haul'));
});

test('PajakInsight.compute — belum ada data pajak/zakat -> array kosong, tidak error', () => {
  const D = baseD({ pajakZakat: null });
  const ctx = load(D);
  assert.equal(ctx.PajakInsight.compute().length, 0);
});

test('ShopInsight.compute — produk stok menipis (<=2) -> muncul insight stok', () => {
  const D = baseD({
    products: [{ name: 'Cobek Kecil', stock: 1 }, { name: 'Cobek Sedang', stock: 10 }],
  });
  const ctx = load(D);
  const out = ctx.ShopInsight.compute();
  assert.ok(out.some((x) => x.id === 'shop-stok-menipis'));
});

test('ShopInsight.compute — semua stok aman -> tidak ada insight stok', () => {
  const D = baseD({
    products: [{ name: 'Cobek Kecil', stock: 10 }],
  });
  const ctx = load(D);
  const out = ctx.ShopInsight.compute();
  assert.ok(!out.some((x) => x.id === 'shop-stok-menipis'));
});

test('ShopInsight.compute — margin bulan ini turun jauh dari bulan lalu (>=3 transaksi) -> muncul warning', () => {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 15);
  const mk = (d, total, profit) => ({ date: d.toISOString().slice(0, 10), total, profit });
  const D = baseD({
    cobek: [
      mk(now, 100000, 10000), mk(now, 100000, 10000), mk(now, 100000, 10000),
      mk(prev, 100000, 50000), mk(prev, 100000, 50000),
    ],
  });
  const ctx = load(D);
  const out = ctx.ShopInsight.compute();
  assert.ok(out.some((x) => x.id === 'shop-margin'));
});

test('ShopInsight.compute — kurang dari 3 transaksi bulan ini -> margin drop tidak dianggap sinyal', () => {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 15);
  const mk = (d, total, profit) => ({ date: d.toISOString().slice(0, 10), total, profit });
  const D = baseD({
    cobek: [mk(now, 100000, 10000), mk(prev, 100000, 50000)],
  });
  const ctx = load(D);
  const out = ctx.ShopInsight.compute();
  assert.ok(!out.some((x) => x.id === 'shop-margin'));
});

test('ShopInsight.compute — produk terlaris bulan ini muncul kalau transaksi >=3', () => {
  const now = new Date();
  const iso = now.toISOString().slice(0, 10);
  const D = baseD({
    cobek: [
      { date: iso, total: 1, profit: 1, items: [{ productId: 'p1', name: 'Cobek Kecil', qty: 3 }] },
      { date: iso, total: 1, profit: 1, items: [{ productId: 'p1', name: 'Cobek Kecil', qty: 2 }] },
      { date: iso, total: 1, profit: 1, items: [{ productId: 'p2', name: 'Lumpang', qty: 1 }] },
    ],
  });
  const ctx = load(D);
  const out = ctx.ShopInsight.compute();
  const item = out.find((x) => x.id === 'shop-terlaris');
  assert.ok(item);
  assert.match(item.text, /Cobek Kecil/);
});

test('ShopInsight.compute — tidak ada produk/transaksi -> array kosong', () => {
  const D = baseD();
  const ctx = load(D);
  assert.equal(ctx.ShopInsight.compute().length, 0);
});

test('MobilInsight.compute — STNK Tahunan jatuh tempo dekat -> muncul warning', () => {
  const D = baseD({
    vehicles: [{ id: 'veh_1', name: 'Vario 125', pajakTahunanTgl: '2026-07-25' }],
  });
  const ctx = load(D);
  const out = ctx.MobilInsight.compute();
  const item = out.find((x) => x.id === 'mobil-tax-veh_1-tahunan');
  assert.ok(item);
  assert.equal(item.level, 'warning');
});

test('MobilInsight.compute — STNK Tahunan sudah lewat -> level danger', () => {
  const D = baseD({
    vehicles: [{ id: 'veh_1', name: 'Vario 125', pajakTahunanTgl: '2026-06-01' }],
  });
  const ctx = load(D);
  const out = ctx.MobilInsight.compute();
  const item = out.find((x) => x.id === 'mobil-tax-veh_1-tahunan');
  assert.ok(item);
  assert.equal(item.level, 'danger');
});

test('MobilInsight.compute — tanggal pajak masih jauh (>30 hari) -> tidak muncul', () => {
  const D = baseD({
    vehicles: [{ id: 'veh_1', name: 'Vario 125', pajakTahunanTgl: '2027-01-01' }],
  });
  const ctx = load(D);
  const out = ctx.MobilInsight.compute();
  assert.ok(!out.some((x) => x.id === 'mobil-tax-veh_1-tahunan'));
});

test('MobilInsight.compute — SIM jatuh tempo dekat -> muncul insight SIM', () => {
  const D = baseD({
    simList: [{ id: 'sim_1', nama: 'W', jenis: 'C', tglAkhir: '2026-07-22' }],
  });
  const ctx = load(D);
  const out = ctx.MobilInsight.compute();
  assert.ok(out.some((x) => x.id === 'mobil-sim-sim_1'));
});

test('MobilInsight.compute — tidak ada kendaraan -> array kosong', () => {
  const D = baseD();
  const ctx = load(D);
  assert.equal(ctx.MobilInsight.compute().length, 0);
});
