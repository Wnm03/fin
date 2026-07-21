'use strict';
// tests/logistics-optimize-route.test.js — modules/logistics/logistics-engine.js
// LogisticsEngine.optimizeRoute() — Route Optimizer nearest-neighbor by km
// (fitur dari blueprint LifeOS yang tadinya belum ada). Dimuat bareng
// cobek-pricing.js (sumber asli OngkirCalc.leg) & vehicle-core.js (sumber
// asli estimateRpPerKm), sama pola dgn tests/logistics-engine.test.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function loadEngine(extraGlobals = {}) {
  return loadSource(
    ['modules/shop/cobek-pricing.js', 'modules/vehicle/vehicle-core.js', 'modules/logistics/logistics-engine.js'],
    extraGlobals,
    ['LogisticsEngine', 'OngkirCalc'],
  );
}

test('optimizeRoute — stop diurutkan dari km terdekat, legKm = selisih dari stop sebelumnya', () => {
  const ctx = loadEngine();
  const r = ctx.LogisticsEngine.optimizeRoute({
    stops: [
      { name: 'C (jauh)', km: 30, pcs: 2 },
      { name: 'A (dekat)', km: 10, pcs: 1 },
      { name: 'B (tengah)', km: 20, pcs: 1 },
    ],
    biayaPerKm: 3000,
  });
  assert.equal(r.ok, true);
  assert.deepEqual(r.order.map((o) => o.name), ['A (dekat)', 'B (tengah)', 'C (jauh)']);
  assert.equal(r.order[0].legKm, 10); // dari titik awal
  assert.equal(r.order[1].legKm, 10); // 20-10
  assert.equal(r.order[2].legKm, 10); // 30-20
  assert.equal(r.totalKm, 30);
});

test('optimizeRoute — totalOngkir pakai rumus OngkirCalc.leg() asli, bukan reimplementasi', () => {
  const ctx = loadEngine();
  const r = ctx.LogisticsEngine.optimizeRoute({
    stops: [{ name: 'A', km: 10, pcs: 2 }],
    biayaPerKm: 3000,
  });
  // leg = (rp*km)/pcs = (3000*10)/2 = 15000
  assert.equal(r.order[0].legOngkir, 15000);
  assert.equal(r.totalOngkir, 15000);
});

test('optimizeRoute — tanpa stop valid: balikin ok:false, tidak throw', () => {
  const ctx = loadEngine();
  const r = ctx.LogisticsEngine.optimizeRoute({ stops: [] });
  assert.equal(r.ok, false);
  assert.equal(r.totalKm, 0);
});

test('optimizeRoute — vehicleId dikasih tapi histori BBM belum cukup: fuel & biaya null, tidak throw', () => {
  const ctx = loadEngine({ D: { bbmLogs: [] } });
  const r = ctx.LogisticsEngine.optimizeRoute({
    stops: [{ name: 'A', km: 10 }],
    biayaPerKm: 3000,
    vehicleId: 'v1',
  });
  assert.equal(r.ok, true);
  assert.equal(r.fuel, null);
  assert.equal(r.totalBiayaBBM, null);
  assert.equal(r.profitKasar, null);
});
