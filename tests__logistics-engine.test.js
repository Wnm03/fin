'use strict';
// tests/logistics-engine.test.js — modules/logistics/logistics-engine.js
// (Sesi 3/6 Smart Delivery Engine: LogisticsEngine.route/fuel/load/price/plan).
// Dimuat bareng cobek-pricing.js (sumber asli OngkirCalc/PriceReko) &
// vehicle-core.js (sumber asli estimateRpPerKm) supaya rumus yang dites
// benar-benar rumus produksi, bukan reimplementasi di file test — sama
// filosofinya dgn loadSource() di tests/helpers/loadSource.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function loadEngine(extraGlobals = {}) {
  return loadSource(
    ['modules/shop/cobek-pricing.js', 'modules/vehicle/vehicle-core.js', 'modules/logistics/logistics-engine.js'],
    extraGlobals,
    ['LogisticsEngine', 'OngkirCalc', 'PriceReko'],
  );
}

test('route — metode antar: total = leg produsen + leg konsumen', () => {
  const ctx = loadEngine();
  const r = ctx.LogisticsEngine.route({
    kmProdusen: 20, biayaPerKmProdusen: 3000,
    kmKonsumen: 10, biayaPerKmKonsumen: 3000,
    metode: 'antar', pcs: 20,
  });
  // leg = (rp*km)/pcs -> produsen (3000*20)/20=3000, konsumen (3000*10)/20=1500
  assert.equal(r.legProdusen, 3000);
  assert.equal(r.legKonsumen, 1500);
  assert.equal(r.totalPerPcs, 4500);
  assert.equal(r.metode, 'antar');
});

test('route — metode ambil: leg konsumen di-skip (0), tidak dihitung', () => {
  const ctx = loadEngine();
  const r = ctx.LogisticsEngine.route({
    kmProdusen: 20, biayaPerKmProdusen: 3000,
    kmKonsumen: 10, biayaPerKmKonsumen: 3000,
    metode: 'ambil', pcs: 20,
  });
  assert.equal(r.legKonsumen, 0);
  assert.equal(r.totalPerPcs, 3000);
  assert.equal(r.metode, 'ambil');
});

test('route — pcs 0/kosong: leg 0 (bukan Infinity/NaN), sesuai OngkirCalc.leg()', () => {
  const ctx = loadEngine();
  const r = ctx.LogisticsEngine.route({ kmProdusen: 20, biayaPerKmProdusen: 3000, pcs: 0 });
  assert.equal(r.legProdusen, 0);
  assert.equal(r.totalPerPcs, 0);
});

test('fuel — vehicleId tanpa histori BBM cukup: null, tidak throw', () => {
  const ctx = loadEngine({ D: { bbmLogs: [] } });
  const f = ctx.LogisticsEngine.fuel('veh_1');
  assert.equal(f, null);
});

test('fuel — histori BBM cukup: rpPerKm & kmPerLiter terisi dari estimateRpPerKm asli', () => {
  const ctx = loadEngine({
    D: {
      bbmLogs: [
        { vehicleId: 'veh_1', fullTank: true, km: 1000, liter: 2, harga: 10000 },
        { vehicleId: 'veh_1', fullTank: true, km: 1100, liter: 2, harga: 10000 }, // 100km/2L = 50 km/L
      ],
    },
  });
  const f = ctx.LogisticsEngine.fuel('veh_1');
  assert.ok(f, 'fuel() harus mengembalikan hasil, bukan null');
  assert.equal(f.kmPerLiter, 50);
  assert.equal(f.rpPerKm, 10000 / 50);
  assert.equal(f.vehicleId, 'veh_1');
});

test('load — total pcs dibagi kapasitas/rit, dibulatkan ke atas', () => {
  const ctx = loadEngine();
  const l = ctx.LogisticsEngine.load({ totalPcs: 45, capacityPerTrip: 20 });
  assert.equal(l.trips, 3); // ceil(45/20)
  assert.equal(l.totalPcs, 45);
  assert.equal(l.capacityPerTrip, 20);
  assert.equal(l.pcsPerTrip, 15); // ceil(45/3)
});

test('load — totalPcs 0: trips 0 (tidak ada rit dibutuhkan)', () => {
  const ctx = loadEngine();
  const l = ctx.LogisticsEngine.load({ totalPcs: 0, capacityPerTrip: 10 });
  assert.equal(l.trips, 0);
  assert.equal(l.pcsPerTrip, 0);
});

test('load — capacityPerTrip <=0/kosong: dipaksa minimal 1 (tidak divide-by-zero)', () => {
  const ctx = loadEngine();
  const l = ctx.LogisticsEngine.load({ totalPcs: 5, capacityPerTrip: 0 });
  assert.equal(l.capacityPerTrip, 1);
  assert.equal(l.trips, 5);
});

test('price — rumus sama dengan PriceReko.calc(): base*(1+margin/100), dibulatkan roundNice', () => {
  const ctx = loadEngine();
  const p = ctx.LogisticsEngine.price({ modal: 20000, transport: 3000, marginPct: 50 });
  assert.equal(p.base, 23000);
  // (23000*1.5)=34500 -> roundNice step 1000 (>=20000) -> 35000
  assert.equal(p.result, ctx.PriceReko.roundNice(34500));
});

test('plan — menggabungkan route+load+fuel+price, bagian tanpa parameter jadi null', () => {
  const ctx = loadEngine({ D: { bbmLogs: [] } });
  const plan = ctx.LogisticsEngine.plan({
    kmProdusen: 20, biayaPerKmProdusen: 3000, pcs: 10, metode: 'ambil',
  });
  assert.ok(plan.route);
  assert.equal(plan.load, null);
  assert.equal(plan.fuel, null);
  assert.equal(plan.price, null);
  assert.equal(typeof plan.generatedAt, 'string');
});

test('plan — transport price otomatis diisi dari route.totalPerPcs kalau tidak di-override', () => {
  const ctx = loadEngine();
  const plan = ctx.LogisticsEngine.plan({
    kmProdusen: 20, biayaPerKmProdusen: 3000, pcs: 20, metode: 'ambil',
    modal: 20000, marginPct: 50,
  });
  assert.equal(plan.price.transport, plan.route.totalPerPcs);
});
