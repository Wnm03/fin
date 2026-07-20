'use strict';
// tests/ai-context-collector.test.js — Smart Delivery Engine, Sesi 13:
// Context Collector per-domain di AIContext.snapshot() (modules/ai/ai-core.js
// — TODO.md #1). Menguji 4 builder internal (_aiContextFinance/Asset/
// Vehicle/Shop) LEWAT snapshot() publik (bukan expose langsung, sama pola
// dgn cara lain modul ai-core.js dites — lihat tests/ai-core.test.js).
//
// Prinsip yang dites di sini:
//   1) Tiap domain reuse fungsi yang SUDAH ADA (computeCashflowForecast/
//      netWorthForecast/fuelEfficiency/_deliveryLowStockCheck) — TIDAK ada
//      rumus baru; test membandingkan angka snapshot dgn hasil manggil
//      fungsi itu langsung.
//   2) Tiap domain SKIP (`available:false`) kalau file sumbernya belum
//      di-load, TIDAK melempar error — dicek dgn load ai-core.js SENDIRIAN.
//   3) Kalau D sama sekali tidak ada, keempat domain ikut false, sama
//      seperti hasAppData.
//   4) Integrasi: load KEEMPAT file domain bareng ai-core.js sekaligus —
//      snapshot() satu kali balikin 4 domain available:true (fondasi rule
//      cross-module Finance+Delivery, TODO.md #2, baca 2+ domain dari 1
//      objek snapshot).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/loadSource');

const fakeIDB = { async get() { return null; }, async set() { return true; } };

// ================= Sesi 1 lama tetap utuh (guard: hanya ai-core.js) =================

test('snapshot — hanya ai-core.js di-load (domain lain belum ada): keempat domain available:false, tidak error', () => {
  const ctx = loadSource(
    ['modules/ai/ai-core.js'],
    { IDBStore: fakeIDB, D: { some: 'thing' } },
    ['AIContext'],
  );
  const snap = ctx.AIContext.snapshot();
  assert.equal(snap.hasAppData, true);
  // JSON.stringify, bukan deepEqual langsung: objek berasal dari vm sandbox
  // (realm berbeda dari literal test), lihat catatan sama di ai-core.test.js.
  assert.equal(JSON.stringify(snap.finance), JSON.stringify({ available: false }));
  assert.equal(JSON.stringify(snap.asset), JSON.stringify({ available: false }));
  assert.equal(JSON.stringify(snap.vehicle), JSON.stringify({ available: false }));
  assert.equal(JSON.stringify(snap.shop), JSON.stringify({ available: false }));
});

test('snapshot — D tidak ada sama sekali: hasAppData & keempat domain false', () => {
  const ctx = loadSource(
    ['modules/ai/ai-core.js'],
    { IDBStore: fakeIDB },
    ['AIContext'],
  );
  const snap = ctx.AIContext.snapshot();
  assert.equal(snap.hasAppData, false);
  assert.equal(snap.finance.available, false);
  assert.equal(snap.asset.available, false);
  assert.equal(snap.vehicle.available, false);
  assert.equal(snap.shop.available, false);
});

// ================= FINANCE =================

function financeD(overrides = {}) {
  const now = new Date();
  return Object.assign({
    profile: {},
    transactions: [
      { type: 'income', amount: 9000000, date: now.toISOString() },
      { type: 'expense', amount: 3000000, date: now.toISOString() },
    ],
    bills: [],
  }, overrides);
}

test('snapshot.finance — reuse computeCashflowForecast() apa adanya (angka sama persis)', () => {
  const D = financeD();
  const ctx = loadSource(
    ['modules/ai/ai-core.js', 'modules/finance/tx-list-cashflow.js'],
    { D, totalSaldoAkun: () => 1000000, IDBStore: fakeIDB },
    ['AIContext'],
  );
  const cf = ctx.computeCashflowForecast();
  const snap = ctx.AIContext.snapshot();
  assert.equal(snap.finance.available, true);
  assert.equal(snap.finance.saldoNow, cf.saldoNow);
  assert.equal(snap.finance.incAvgBulanan, cf.incAvg);
  assert.equal(snap.finance.expAvgBulanan, cf.expAvg);
  assert.equal(snap.finance.billsDue30Hari, cf.billsDue);
  assert.equal(snap.finance.billsDueCount, cf.upcoming.length);
  assert.equal(snap.finance.projected30Hari, cf.projected);
});

test('snapshot.finance — file tx-list-cashflow.js belum di-load => available:false (tidak menebak)', () => {
  const ctx = loadSource(
    ['modules/ai/ai-core.js'],
    { D: financeD(), totalSaldoAkun: () => 1000000, IDBStore: fakeIDB },
    ['AIContext'],
  );
  assert.equal(JSON.stringify(ctx.AIContext.snapshot().finance), JSON.stringify({ available: false }));
});

// ================= ASSET =================

function fakeKekayaanCAGR(netWorthNow, cagr) {
  return { currentNetWorth: () => netWorthNow, actualCAGR: () => ({ cagr }) };
}

test('snapshot.asset — reuse netWorthForecast() apa adanya, trend "naik" kalau proyeksi >= sekarang', () => {
  const D = { assets: [{ id: 'a1' }, { id: 'a2' }] };
  const ctx = loadSource(
    ['modules/ai/ai-core.js', 'modules/asset/aset.js'],
    {
      D, document: {}, window: {}, escapeHtml: (s) => String(s), sameId: (a, b) => String(a) === String(b),
      todayStr: () => '2026-07-18', dateToISO: (d) => d.toISOString().slice(0, 10), save: () => {}, toast: () => {},
      Kekayaan: fakeKekayaanCAGR(10000000, 0.12),
      IDBStore: fakeIDB,
    },
    ['AIContext'],
  );
  const fc = ctx.netWorthForecast({ monthsAhead: 1 });
  const snap = ctx.AIContext.snapshot();
  assert.equal(snap.asset.available, true);
  assert.equal(snap.asset.assetCount, 2);
  assert.equal(snap.asset.netWorthNow, fc.netWorthNow);
  assert.equal(snap.asset.metode, fc.metode);
  assert.equal(snap.asset.trend, 'naik');
});

test('snapshot.asset — netWorthForecast balikin ok:false (data histori kurang) => available:false + reason', () => {
  const D = { assets: [] };
  const ctx = loadSource(
    ['modules/ai/ai-core.js', 'modules/asset/aset.js'],
    {
      D, document: {}, window: {}, escapeHtml: (s) => String(s), sameId: (a, b) => String(a) === String(b),
      todayStr: () => '2026-07-18', dateToISO: (d) => d.toISOString().slice(0, 10), save: () => {}, toast: () => {},
      Kekayaan: undefined, // Kekayaan belum ada -> netWorthForecast() ok:false
      IDBStore: fakeIDB,
    },
    ['AIContext'],
  );
  const snap = ctx.AIContext.snapshot();
  assert.equal(snap.asset.available, false);
  assert.equal(typeof snap.asset.reason, 'string');
});

// ================= VEHICLE =================

test('snapshot.vehicle — reuse fuelEfficiency() per kendaraan, histori cukup => rpPerKm/estMonthlyCost terisi', () => {
  const D = {
    vehicles: [{ id: 'v1', name: 'Vario 125' }],
    bbmLogs: [
      { vehicleId: 'v1', fullTank: true, km: 1000, liter: 3, harga: 10000 },
      { vehicleId: 'v1', fullTank: true, km: 1300, liter: 3, harga: 10000 },
    ],
    kmLogs: [
      { vehicleId: 'v1', date: '2026-07-01', km: 1000 },
      { vehicleId: 'v1', date: '2026-07-10', km: 1300 },
    ],
  };
  const ctx = loadSource(
    ['modules/ai/ai-core.js', 'modules/vehicle/vehicle-core.js'],
    { D, dateToISO: (d) => d.toISOString().slice(0, 10), IDBStore: fakeIDB },
    ['AIContext'],
  );
  const eff = ctx.fuelEfficiency('v1');
  const snap = ctx.AIContext.snapshot();
  assert.equal(snap.vehicle.available, true);
  assert.equal(snap.vehicle.vehicleCount, 1);
  assert.equal(snap.vehicle.vehicles.length, 1);
  assert.equal(snap.vehicle.vehicles[0].id, 'v1');
  assert.equal(snap.vehicle.vehicles[0].name, 'Vario 125');
  assert.equal(snap.vehicle.vehicles[0].rpPerKm, eff.rpPerKm);
  assert.equal(snap.vehicle.vehicles[0].estMonthlyCost, eff.estMonthlyCost);
});

test('snapshot.vehicle — histori BBM kurang: kendaraan TETAP masuk daftar, rpPerKm/estMonthlyCost null (tidak di-skip)', () => {
  const D = { vehicles: [{ id: 'v1', name: 'Vario 125' }], bbmLogs: [], kmLogs: [] };
  const ctx = loadSource(
    ['modules/ai/ai-core.js', 'modules/vehicle/vehicle-core.js'],
    { D, dateToISO: (d) => d.toISOString().slice(0, 10), IDBStore: fakeIDB },
    ['AIContext'],
  );
  const snap = ctx.AIContext.snapshot();
  assert.equal(snap.vehicle.available, true);
  assert.equal(snap.vehicle.vehicleCount, 1);
  assert.equal(snap.vehicle.vehicles[0].rpPerKm, null);
  assert.equal(snap.vehicle.vehicles[0].estMonthlyCost, null);
});

// ================= SHOP =================

test('snapshot.shop — recentAvgMarginPct dari 5 transaksi Cobek terakhir (formula profit/total*100, sort by id desc)', () => {
  const D = {
    products: [{ id: 'p1', stock: 10 }],
    cobek: [
      { id: 1, profit: 10000, total: 100000 }, // margin 10%
      { id: 2, profit: 20000, total: 100000 }, // margin 20%
    ],
    profile: {},
  };
  const ctx = loadSource(
    ['modules/ai/ai-core.js', 'modules/shop/cobek-pricing.js'],
    { D, IDBStore: fakeIDB },
    ['AIContext'],
  );
  const snap = ctx.AIContext.snapshot();
  assert.equal(snap.shop.available, true);
  assert.equal(snap.shop.productCount, 1);
  assert.equal(snap.shop.recentOrdersConsidered, 2);
  assert.equal(snap.shop.recentAvgMarginPct, 15); // rata2 (10+20)/2
});

test('snapshot.shop — reuse _deliveryLowStockCheck() apa adanya buat lowStockCount', () => {
  const D = {
    products: [{ id: 'p1', stock: 1 }, { id: 'p2', stock: 5 }],
    cobek: [],
    profile: {},
  };
  const ctx = loadSource(
    ['modules/ai/ai-core.js', 'modules/shop/cobek-pricing.js'],
    { D, IDBStore: fakeIDB },
    ['AIContext'],
  );
  const low = ctx._deliveryLowStockCheck();
  const snap = ctx.AIContext.snapshot();
  assert.equal(snap.shop.lowStockCount, low.low.length);
  assert.equal(snap.shop.lowStockCount, 1); // default threshold 2, cuma p1 (stock 1)
  assert.equal(snap.shop.recentAvgMarginPct, null); // tidak ada cobek entry
  assert.equal(snap.shop.recentOrdersConsidered, 0);
});

test('snapshot.shop — cobek-pricing.js belum di-load: domain TETAP available (baca D.cobek/D.products langsung), tapi lowStockCount null (bukan menebak lewat rumus baru)', () => {
  const ctx = loadSource(
    ['modules/ai/ai-core.js'],
    { D: { products: [{ id: 'p1', stock: 1 }], cobek: [] }, IDBStore: fakeIDB },
    ['AIContext'],
  );
  const shop = ctx.AIContext.snapshot().shop;
  assert.equal(shop.available, true);
  assert.equal(shop.productCount, 1);
  assert.equal(shop.lowStockCount, null); // _deliveryLowStockCheck belum ada -> null, TIDAK dihitung ulang manual
});

test('snapshot.shop — D.cobek/D.products tidak ada sama sekali => available:false', () => {
  const ctx = loadSource(
    ['modules/ai/ai-core.js', 'modules/shop/cobek-pricing.js'],
    { D: { profile: {} }, IDBStore: fakeIDB },
    ['AIContext'],
  );
  assert.equal(JSON.stringify(ctx.AIContext.snapshot().shop), JSON.stringify({ available: false }));
});

// ================= INTEGRASI 4 DOMAIN SEKALIGUS =================
// Fondasi wajib TODO.md #2: satu snapshot() bisa dibaca rule cross-module
// (mis. margin Shop tipis DAN saldo Finance rendah) dalam 1 condition().

test('snapshot — 4 file domain di-load bareng: finance/asset/vehicle/shop SEMUA available:true dalam 1 snapshot()', () => {
  const now = new Date();
  const D = {
    profile: {},
    transactions: [
      { type: 'income', amount: 9000000, date: now.toISOString() },
      { type: 'expense', amount: 3000000, date: now.toISOString() },
    ],
    bills: [],
    assets: [{ id: 'a1' }],
    vehicles: [{ id: 'v1', name: 'Vario 125' }],
    bbmLogs: [],
    kmLogs: [],
    products: [{ id: 'p1', stock: 10 }],
    cobek: [{ id: 1, profit: 5000, total: 100000 }], // margin tipis 5%
  };
  const ctx = loadSource(
    [
      'modules/ai/ai-core.js',
      'modules/finance/tx-list-cashflow.js',
      'modules/asset/aset.js',
      'modules/vehicle/vehicle-core.js',
      'modules/shop/cobek-pricing.js',
    ],
    {
      D,
      totalSaldoAkun: () => 500000, // saldo rendah, dipadukan dgn margin Shop tipis di atas
      document: {}, window: {}, escapeHtml: (s) => String(s), sameId: (a, b) => String(a) === String(b),
      todayStr: () => '2026-07-18', dateToISO: (d) => d.toISOString().slice(0, 10), save: () => {}, toast: () => {},
      Kekayaan: fakeKekayaanCAGR(10000000, 0.05),
      IDBStore: fakeIDB,
    },
    ['AIContext'],
  );
  const snap = ctx.AIContext.snapshot();
  assert.equal(snap.finance.available, true);
  assert.equal(snap.asset.available, true);
  assert.equal(snap.vehicle.available, true);
  assert.equal(snap.shop.available, true);
  // Sinyal cross-module yang dicontohkan TODO.md #2: saldo Finance rendah +
  // margin Shop tipis, keduanya bisa dibaca dari 1 objek snapshot yang sama.
  assert.equal(snap.finance.saldoNow, 500000);
  assert.equal(snap.shop.recentAvgMarginPct, 5);
});
