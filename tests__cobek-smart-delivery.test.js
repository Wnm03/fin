'use strict';
// tests/cobek-smart-delivery.test.js — Smart Delivery Engine, Sesi 4/6:
// fungsi additive di cobek-etalase.js (weightCalculator/volumeCalculator/
// packingCalculator), cobek-pricing.js (calculateFuel/calculateProfit/
// calculateVehicleCapacity), cobek-order.js (calculateSmartDelivery/
// requestAIRecommendation). Lihat RENCANA-SESI-RINGKAS.md untuk peta 6
// sesi. Sama pola dgn tests/logistics-engine.test.js & tests/ai-service.
// test.js: memuat file source ASLI lewat loadSource(), bukan reimplement
// logic di test.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// --- Grup 1: weightCalculator/volumeCalculator/packingCalculator ----------
// Murni, cuma butuh cobek-etalase.js sendiri.
function loadPacking() {
  return loadSource(
    ['modules/shop/cobek-etalase.js'],
    {},
    ['weightCalculator', 'volumeCalculator', 'packingCalculator'],
  );
}

test('weightCalculator — total = beratPerUnit x qty', () => {
  const ctx = loadPacking();
  const w = ctx.weightCalculator({ beratPerUnit: 2.5, qty: 4 });
  assert.equal(w.totalKg, 10);
});

test('weightCalculator — input negatif/NaN dipaksa 0, tidak throw', () => {
  const ctx = loadPacking();
  const w = ctx.weightCalculator({ beratPerUnit: -5, qty: 'abc' });
  assert.equal(w.beratPerUnit, 0);
  assert.equal(w.qty, 0);
  assert.equal(w.totalKg, 0);
});

test('volumeCalculator — m3PerUnit = (p*l*t)/1.000.000, totalM3 dikali qty', () => {
  const ctx = loadPacking();
  const v = ctx.volumeCalculator({ panjang: 100, lebar: 50, tinggi: 20, qty: 3 });
  assert.equal(v.cm3PerUnit, 100000);
  assert.equal(v.m3PerUnit, 0.1);
  assert.ok(Math.abs(v.totalM3 - 0.3) < 1e-9);
});

test('packingCalculator — batas berat lebih ketat dari volume: trips ikut berat', () => {
  const ctx = loadPacking();
  const p = ctx.packingCalculator({
    items: [{ beratPerUnit: 10, panjang: 10, lebar: 10, tinggi: 10, qty: 50 }], // 500kg, 0.05m3
    capacityKg: 100, // butuh 5 rit
    capacityM3: 10, // butuh 1 rit
  });
  assert.equal(p.tripsByWeight, 5);
  assert.equal(p.tripsByVolume, 1);
  assert.equal(p.trips, 5);
  assert.equal(p.limitingFactor, 'berat');
});

test('packingCalculator — kapasitas tidak dikasih: dianggap tidak membatasi (trips 0 dari sisi itu)', () => {
  const ctx = loadPacking();
  const p = ctx.packingCalculator({ items: [{ beratPerUnit: 10, qty: 5 }] });
  assert.equal(p.totalKg, 50);
  assert.equal(p.tripsByWeight, 0);
  assert.equal(p.tripsByVolume, 0);
  assert.equal(p.trips, 0);
  assert.equal(p.limitingFactor, null);
});

test('packingCalculator — item tanpa beratPerUnit/dimensi diabaikan dari sisi itu, tidak error', () => {
  const ctx = loadPacking();
  const p = ctx.packingCalculator({ items: [{ qty: 5 }, null, undefined], capacityKg: 10 });
  assert.equal(p.totalQty, 5);
  assert.equal(p.totalKg, 0);
  assert.equal(p.tripsByWeight, 0);
});

// --- Grup 2: calculateFuel/calculateProfit/calculateVehicleCapacity -------
function loadPricing(extraGlobals = {}) {
  return loadSource(
    [
      'modules/shop/cobek-etalase.js',
      'modules/shop/cobek-pricing.js',
      'modules/vehicle/vehicle-core.js',
      'modules/logistics/logistics-engine.js',
    ],
    extraGlobals,
    ['calculateFuel', 'calculateProfit', 'calculateVehicleCapacity'],
  );
}

test('calculateFuel — vehicleId kosong: ok false, reason jelas', () => {
  const ctx = loadPricing({ D: { bbmLogs: [] } });
  const f = ctx.calculateFuel('');
  assert.equal(f.ok, false);
  assert.ok(f.reason);
});

test('calculateFuel — histori BBM belum cukup: ok false', () => {
  const ctx = loadPricing({ D: { bbmLogs: [] } });
  const f = ctx.calculateFuel('veh_1');
  assert.equal(f.ok, false);
  assert.ok(f.reason.includes('BBM'));
});

test('calculateFuel — histori cukup: ok true, angka sama dgn LogisticsEngine.fuel()', () => {
  const ctx = loadPricing({
    D: {
      bbmLogs: [
        { vehicleId: 'veh_1', fullTank: true, km: 1000, liter: 2, harga: 10000 },
        { vehicleId: 'veh_1', fullTank: true, km: 1100, liter: 2, harga: 10000 },
      ],
    },
  });
  const f = ctx.calculateFuel('veh_1');
  assert.equal(f.ok, true);
  assert.equal(f.kmPerLiter, 50);
});

test('calculateProfit — productId tidak ketemu: null', () => {
  const ctx = loadPricing({ D: { products: [] } });
  const p = ctx.calculateProfit({ productId: 'x', qty: 1 });
  assert.equal(p, null);
});

test('calculateProfit — revenue-modal-ongkir, marginPct dihitung dari profit/revenue', () => {
  const ctx = loadPricing({
    D: { products: [{ id: 'p1', hargaBeli: 10000, hargaJual: 20000 }] },
  });
  const p = ctx.calculateProfit({
    productId: 'p1', qty: 10,
    deliveryPlan: { route: { totalPerPcs: 500 } },
  });
  assert.equal(p.revenue, 200000);
  assert.equal(p.modal, 100000);
  assert.equal(p.ongkir, 5000);
  assert.equal(p.profit, 95000);
  assert.equal(p.marginPct, (95000 / 200000) * 100);
});

test('calculateProfit — tanpa deliveryPlan: ongkir 0, tidak throw', () => {
  const ctx = loadPricing({
    D: { products: [{ id: 'p1', hargaBeli: 1000, hargaJual: 2000 }] },
  });
  const p = ctx.calculateProfit({ productId: 'p1', qty: 1 });
  assert.equal(p.ongkir, 0);
  assert.equal(p.profit, 1000);
});

test('calculateVehicleCapacity — gabung packing + fuel jadi satu hasil', () => {
  const ctx = loadPricing({
    D: {
      bbmLogs: [
        { vehicleId: 'veh_1', fullTank: true, km: 1000, liter: 2, harga: 10000 },
        { vehicleId: 'veh_1', fullTank: true, km: 1100, liter: 2, harga: 10000 },
      ],
    },
  });
  const c = ctx.calculateVehicleCapacity({
    vehicleId: 'veh_1',
    items: [{ beratPerUnit: 20, qty: 10 }],
    capacityKg: 50,
  });
  assert.equal(c.ok, true);
  assert.equal(c.tripsByWeight, 4); // 200kg / 50kg = 4
  assert.equal(c.trips, 4);
  assert.ok(c.fuel);
  assert.equal(c.fuel.kmPerLiter, 50);
  assert.equal(c.fuelReason, null);
});

test('calculateVehicleCapacity — vehicleId kosong: fuel null + fuelReason terisi, packing tetap dihitung', () => {
  const ctx = loadPricing({ D: { bbmLogs: [] } });
  const c = ctx.calculateVehicleCapacity({
    items: [{ beratPerUnit: 20, qty: 10 }],
    capacityKg: 50,
  });
  assert.equal(c.ok, true);
  assert.equal(c.fuel, null);
  assert.ok(c.fuelReason);
  assert.equal(c.trips, 4);
});

test('calculateVehicleCapacity — status AMAN kalau muatan di bawah 80% kapasitas', () => {
  const ctx = loadPricing({ D: { bbmLogs: [] } });
  const c = ctx.calculateVehicleCapacity({
    items: [{ beratPerUnit: 10, qty: 3 }], // 30kg dari 50kg = 60%
    capacityKg: 50,
  });
  assert.equal(c.status, 'AMAN');
  assert.equal(c.percentUsed, 60);
  assert.equal(c.sisaKapasitasKg, 20);
});

test('calculateVehicleCapacity — status HAMPIR OVERLOAD di rentang 80-100%', () => {
  const ctx = loadPricing({ D: { bbmLogs: [] } });
  const c = ctx.calculateVehicleCapacity({
    items: [{ beratPerUnit: 10, qty: 4.5 }], // 45kg dari 50kg = 90%
    capacityKg: 50,
  });
  assert.equal(c.status, 'HAMPIR OVERLOAD');
  assert.equal(c.percentUsed, 90);
});

test('calculateVehicleCapacity — status OVERLOAD kalau muatan lebih dari kapasitas', () => {
  const ctx = loadPricing({ D: { bbmLogs: [] } });
  const c = ctx.calculateVehicleCapacity({
    items: [{ beratPerUnit: 20, qty: 10 }], // 200kg dari 50kg = 400%
    capacityKg: 50,
  });
  assert.equal(c.status, 'OVERLOAD');
  assert.equal(c.sisaKapasitasKg, -150);
});

test('calculateVehicleCapacity — tanpa capacityKg/capacityM3: status null, tidak throw', () => {
  const ctx = loadPricing({ D: { bbmLogs: [] } });
  const c = ctx.calculateVehicleCapacity({ items: [{ beratPerUnit: 20, qty: 10 }] });
  assert.equal(c.status, null);
  assert.equal(c.percentUsed, null);
});

test('calculateVehicleCapacity — kmPerTrip + vehicleId dgn histori BBM cukup: biayaBBMPerTrip terisi', () => {
  const ctx = loadPricing({
    D: {
      bbmLogs: [
        { vehicleId: 'veh_1', fullTank: true, km: 1000, liter: 2, harga: 10000 },
        { vehicleId: 'veh_1', fullTank: true, km: 1100, liter: 2, harga: 10000 },
      ],
    },
  });
  const c = ctx.calculateVehicleCapacity({
    vehicleId: 'veh_1',
    items: [{ beratPerUnit: 10, qty: 1 }],
    capacityKg: 50,
    kmPerTrip: 20,
  });
  assert.ok(c.biayaBBMPerTrip > 0);
  assert.equal(c.biayaBBMPerTrip, Math.round(c.fuel.rpPerKm * 20));
});

test('calculateVehicleCapacity — tanpa kmPerTrip: biayaBBMPerTrip null walau fuel ada', () => {
  const ctx = loadPricing({
    D: {
      bbmLogs: [
        { vehicleId: 'veh_1', fullTank: true, km: 1000, liter: 2, harga: 10000 },
        { vehicleId: 'veh_1', fullTank: true, km: 1100, liter: 2, harga: 10000 },
      ],
    },
  });
  const c = ctx.calculateVehicleCapacity({
    vehicleId: 'veh_1',
    items: [{ beratPerUnit: 10, qty: 1 }],
    capacityKg: 50,
  });
  assert.equal(c.biayaBBMPerTrip, null);
});

// --- Grup 3: calculateSmartDelivery/requestAIRecommendation ---------------
function loadOrder(extraGlobals = {}) {
  const idbStore = new Map();
  const fakeIDBStore = {
    async get(key) { return idbStore.has(key) ? idbStore.get(key) : undefined; },
    async set(key, value) { idbStore.set(key, value); return true; },
  };
  const ctx = loadSource(
    [
      'modules/shop/cobek-etalase.js',
      'modules/shop/cobek-pricing.js',
      'modules/vehicle/vehicle-core.js',
      'modules/ai/ai-core.js',
      'modules/ai/ai-decision-engine.js',
      'modules/ai/ai-service.js',
      'modules/logistics/logistics-engine.js',
      'modules/logistics/logistics-service.js',
      'modules/shop/cobek-order.js',
    ],
    Object.assign({ IDBStore: fakeIDBStore }, extraGlobals),
    ['calculateSmartDelivery', 'requestAIRecommendation', 'calculateProfit'],
  );
  return ctx;
}

function baseD(overrides = {}) {
  return Object.assign({
    products: [{ id: 'p1', name: 'Cobek Batu 20cm', hargaBeli: 10000, hargaJual: 25000 }],
    produsen: [{ id: 'pr1', name: 'Produsen A', jarakKm: 20, biayaPerKm: 3000 }],
    bbmLogs: [],
    profile: {},
  }, overrides);
}

test('calculateSmartDelivery — productId tidak ketemu: ok false', () => {
  const ctx = loadOrder({ D: baseD() });
  const r = ctx.calculateSmartDelivery({ productId: 'nope', qty: 5, metode: 'ambil' });
  assert.equal(r.ok, false);
});

test('calculateSmartDelivery — km/biaya Etape 1 otomatis dari preferensi Produsen', () => {
  const ctx = loadOrder({ D: baseD() });
  const r = ctx.calculateSmartDelivery({
    productId: 'p1', qty: 20, produsenId: 'pr1', metode: 'ambil',
  });
  assert.equal(r.ok, true);
  assert.equal(r.plan.route.legProdusen, 3000); // (3000*20)/20
  assert.equal(r.plan.route.metode, 'ambil');
  assert.equal(r.productName, 'Cobek Batu 20cm');
  assert.ok(r.summary.includes('Ongkir'));
});

test('calculateSmartDelivery — profit dihitung dari hargaBeli/hargaJual produk + ongkir plan', () => {
  const ctx = loadOrder({ D: baseD() });
  const r = ctx.calculateSmartDelivery({
    productId: 'p1', qty: 20, produsenId: 'pr1', metode: 'ambil',
  });
  assert.ok(r.profit);
  assert.equal(r.profit.revenue, 25000 * 20);
  assert.equal(r.profit.modal, 10000 * 20);
  assert.equal(r.profit.ongkir, r.plan.route.totalPerPcs * 20);
});

test('requestAIRecommendation — tanpa API Key: aiText null, prompt tetap ada', async () => {
  const ctx = loadOrder({ D: baseD({ profile: {} }) });
  const r = await ctx.requestAIRecommendation({
    productId: 'p1', qty: 10, produsenId: 'pr1', metode: 'ambil',
  });
  assert.equal(r.ok, true);
  assert.equal(r.aiOk, false);
  assert.equal(r.aiText, null);
  assert.ok(r.aiReason.includes('API Key'));
  assert.ok(typeof r.prompt === 'string' && r.prompt.length > 0);
});

test('requestAIRecommendation — ada API Key & callAIProviderRaw sukses: aiText terisi', async () => {
  let calledWith = null;
  const ctx = loadOrder({
    D: baseD({ profile: { apiKey: 'sk-test', apiProvider: 'claude' } }),
    callAIProviderRaw: async (sys, msgs, opts) => {
      calledWith = { sys, msgs, opts };
      return { ok: true, text: 'Rekomendasi: kirim sekarang, margin masih sehat.' };
    },
  });
  const r = await ctx.requestAIRecommendation({
    productId: 'p1', qty: 10, produsenId: 'pr1', metode: 'ambil',
  });
  assert.equal(r.ok, true);
  assert.equal(r.aiOk, true);
  assert.equal(r.aiText, 'Rekomendasi: kirim sekarang, margin masih sehat.');
  assert.ok(calledWith);
  assert.equal(calledWith.msgs[0].role, 'user');
});

test('requestAIRecommendation — callAIProviderRaw gagal (ok:false): aiOk false, aiReason dari errMsg', async () => {
  const ctx = loadOrder({
    D: baseD({ profile: { apiKey: 'sk-test' } }),
    callAIProviderRaw: async () => ({ ok: false, errMsg: 'quota habis' }),
  });
  const r = await ctx.requestAIRecommendation({
    productId: 'p1', qty: 10, produsenId: 'pr1', metode: 'ambil',
  });
  assert.equal(r.aiOk, false);
  assert.equal(r.aiReason, 'quota habis');
});

test('requestAIRecommendation — productId tidak valid: langsung balikin delivery gagal, tidak panggil AI', async () => {
  let aiCalled = false;
  const ctx = loadOrder({
    D: baseD({ profile: { apiKey: 'sk-test' } }),
    callAIProviderRaw: async () => { aiCalled = true; return { ok: true, text: 'x' }; },
  });
  const r = await ctx.requestAIRecommendation({ productId: 'nope', qty: 1 });
  assert.equal(r.ok, false);
  assert.equal(aiCalled, false);
});
