'use strict';
// tests/logistics-smart-engine.test.js — Tahap 3 "Smart Logistics Engine"
// (blueprint override). Cakupan: LogisticsEngine.vehicleCapacityCheck/
// volumeCylinder/fuelCalculator/operationalCost/smartOngkir/profitCalculator/
// deliverySummary + facade LogisticsService yang sejajar. Dimuat bareng
// cobek-etalase.js (weightCalculator/volumeCalculator/packingCalculator) &
// cobek-pricing.js (OngkirCalc) supaya reuse helper produksi asli, sama
// filosofinya dgn tests/logistics-engine.test.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/loadSource');

function loadEngine(extraGlobals = {}) {
  return loadSource(
    [
      'modules/shop/cobek-etalase.js',
      'modules/shop/cobek-pricing.js',
      'modules/vehicle/vehicle-core.js',
      'modules/logistics/logistics-engine.js',
      'modules/logistics/logistics-service.js',
    ],
    extraGlobals,
    ['LogisticsEngine', 'LogisticsService', 'weightCalculator', 'volumeCalculator', 'packingCalculator'],
  );
}

// --- fuelCalculator (§5) -----------------------------------------------
test('fuelCalculator — liter & biaya BBM murni dari jarak/konsumsi/harga', () => {
  const ctx = loadEngine();
  const r = ctx.LogisticsEngine.fuelCalculator({ jarak: 100, konsumsiKmPerLiter: 25, hargaBBM: 10000 });
  assert.equal(r.liter, 4);
  assert.equal(r.biayaBBM, 40000);
});

test('fuelCalculator — konsumsi 0 tidak crash (liter 0, bukan Infinity)', () => {
  const ctx = loadEngine();
  const r = ctx.LogisticsEngine.fuelCalculator({ jarak: 100, konsumsiKmPerLiter: 0, hargaBBM: 10000 });
  assert.equal(r.liter, 0);
  assert.equal(r.biayaBBM, 0);
});

// --- vehicleCapacityCheck (§1) ------------------------------------------
test('vehicleCapacityCheck — status AMAN kalau pemakaian < 80%', () => {
  const ctx = loadEngine();
  const r = ctx.LogisticsEngine.vehicleCapacityCheck({
    jenisKendaraan: 'Pickup', merkKendaraan: 'Grandmax',
    kapasitasBeratKg: 1000, kapasitasVolumeM3: 5,
    totalBeratKg: 300, totalVolumeM3: 1,
  });
  assert.equal(r.status, 'AMAN');
  assert.equal(r.sisaBeratKg, 700);
});

test('vehicleCapacityCheck — status HAMPIR_OVERLOAD (80-100%), underscore sesuai kontrak', () => {
  const ctx = loadEngine();
  const r = ctx.LogisticsEngine.vehicleCapacityCheck({
    kapasitasBeratKg: 1000, kapasitasVolumeM3: 5, totalBeratKg: 850, totalVolumeM3: 1,
  });
  assert.equal(r.status, 'HAMPIR_OVERLOAD');
});

test('vehicleCapacityCheck — status OVERLOAD kalau > 100%', () => {
  const ctx = loadEngine();
  const r = ctx.LogisticsEngine.vehicleCapacityCheck({
    kapasitasBeratKg: 1000, kapasitasVolumeM3: 5, totalBeratKg: 1200, totalVolumeM3: 1,
  });
  assert.equal(r.status, 'OVERLOAD');
  assert.equal(r.sisaBeratKg, -200);
});

test('vehicleCapacityCheck — pakai items via packingCalculator() yang SUDAH ADA (reuse, bukan reimplement)', () => {
  const ctx = loadEngine();
  const r = ctx.LogisticsEngine.vehicleCapacityCheck({
    kapasitasBeratKg: 100, kapasitasVolumeM3: 10,
    items: [{ beratPerUnit: 5, qty: 4 }], // total 20kg lewat weightCalculator()
  });
  assert.equal(r.totalBeratKg, 20);
  assert.equal(r.status, 'AMAN');
});

// --- volumeCylinder (§3 fallback) ---------------------------------------
test('volumeCylinder — volume tabung dari diameter+tinggi+qty', () => {
  const ctx = loadEngine();
  const r = ctx.LogisticsEngine.volumeCylinder({ diameter: 20, tinggi: 30, qty: 2 });
  // volume 1 unit = pi*r^2*t = pi*100*30 ≈ 9424.78 cm3
  assert.ok(Math.abs(r.volumeCm3PerUnit - 9424.78) < 1);
  assert.ok(r.totalM3 > 0);
});

// --- operationalCost (§6) -----------------------------------------------
test('operationalCost — total = BBM + sopir + operasional + lain', () => {
  const ctx = loadEngine();
  const r = ctx.LogisticsEngine.operationalCost({
    biayaBBM: 40000, biayaSopir: 50000, biayaOperasional: 10000, biayaLain: 5000,
  });
  assert.equal(r.total, 105000);
});

test('operationalCost — biayaSopir opsional, default 0', () => {
  const ctx = loadEngine();
  const r = ctx.LogisticsEngine.operationalCost({ biayaBBM: 40000 });
  assert.equal(r.biayaSopir, 0);
  assert.equal(r.total, 40000);
});

// --- smartOngkir (§7) -----------------------------------------------------
test('smartOngkir — mempertimbangkan jarak+berat+volume+operasional+margin', () => {
  const ctx = loadEngine();
  const r = ctx.LogisticsEngine.smartOngkir({
    jarak: 10, biayaPerKm: 3000, pcs: 1,
    beratKg: 20, rpPerKg: 500,
    volumeM3: 0.5, rpPerM3: 20000,
    biayaOperasional: 10000, marginPct: 10,
  });
  // biayaJarak = leg(3000,10,1)*1 = 30000; biayaBerat=20*500=10000; biayaVolume=0.5*20000=10000
  // subtotal = 30000+10000+10000+10000 = 60000; +10% margin = 66000
  assert.equal(r.biayaJarak, 30000);
  assert.equal(r.biayaBerat, 10000);
  assert.equal(r.biayaVolume, 10000);
  assert.equal(r.subtotal, 60000);
  assert.equal(r.totalOngkir, 66000);
});

// --- profitCalculator (§8) -------------------------------------------------
test('profitCalculator — breakdown penjualan/diskon/ongkir/BBM/operasional/margin%', () => {
  const ctx = loadEngine();
  const r = ctx.LogisticsEngine.profitCalculator({
    totalPenjualan: 500000, diskon: 20000, ongkir: 30000, biayaBBM: 15000, biayaOperasional: 10000,
  });
  assert.equal(r.penjualanBersih, 480000);
  assert.equal(r.profitBersih, 480000 - 30000 - 15000 - 10000);
  assert.equal(r.marginPct, Math.round((r.profitBersih / 500000) * 100 * 100) / 100);
});

test('profitCalculator — semua parameter default 0 (boleh isi sebagian)', () => {
  const ctx = loadEngine();
  const r = ctx.LogisticsEngine.profitCalculator({ totalPenjualan: 100000 });
  assert.equal(r.profitBersih, 100000);
  assert.equal(r.marginPct, 100);
});

// --- deliverySummary (§9, orkestrator) -------------------------------------
test('deliverySummary — gabungkan berat/volume/status/BBM/operasional/ongkir/profit', () => {
  const ctx = loadEngine();
  const r = ctx.LogisticsEngine.deliverySummary({
    kapasitasBeratKg: 1000, kapasitasVolumeM3: 5,
    totalBeratKg: 300, totalVolumeM3: 1,
    jarak: 10, biayaPerKm: 3000, pcs: 1,
    konsumsiKmPerLiter: 25, hargaBBM: 10000,
    biayaSopir: 20000, marginPct: 10,
    totalPenjualan: 500000, diskon: 0,
  });
  assert.equal(r.berat, 300);
  assert.equal(r.volume, 1);
  assert.equal(r.statusKendaraan, 'AMAN');
  assert.ok(r.estimasiBBM.biayaBBM > 0);
  assert.ok(r.biayaOperasional.total >= r.estimasiBBM.biayaBBM);
  assert.ok(r.ongkir.totalOngkir > 0);
  assert.ok(r.profit && typeof r.profit.profitBersih === 'number');
});

test('deliverySummary — profit null kalau totalPenjualan tidak dikasih (tidak menebak default)', () => {
  const ctx = loadEngine();
  const r = ctx.LogisticsEngine.deliverySummary({
    kapasitasBeratKg: 1000, kapasitasVolumeM3: 5, totalBeratKg: 300, totalVolumeM3: 1, jarak: 10,
  });
  assert.equal(r.profit, null);
});

// --- Facade LogisticsService (pola sama planDelivery/optimizeRoute) -------
test('LogisticsService — semua 6 method Tahap 3 delegasi ke LogisticsEngine (facade tipis)', async () => {
  const ctx = loadEngine();
  assert.equal(typeof ctx.LogisticsService.vehicleCapacityCheck, 'function');
  assert.equal(typeof ctx.LogisticsService.fuelCalculator, 'function');
  assert.equal(typeof ctx.LogisticsService.operationalCost, 'function');
  assert.equal(typeof ctx.LogisticsService.smartOngkir, 'function');
  assert.equal(typeof ctx.LogisticsService.profitCalculator, 'function');
  assert.equal(typeof ctx.LogisticsService.deliverySummary, 'function');

  const fuel = await ctx.LogisticsService.fuelCalculator({ jarak: 50, konsumsiKmPerLiter: 25, hargaBBM: 10000 });
  assert.equal(fuel.liter, 2);
  assert.equal(fuel.biayaBBM, 20000);
});

// --- Backward compatibility: fungsi lama TIDAK berubah ---------------------
test('backward compat — LogisticsEngine.route()/fuel()/load()/price()/plan() lama masih ada & tidak berubah', () => {
  const ctx = loadEngine();
  assert.equal(typeof ctx.LogisticsEngine.route, 'function');
  assert.equal(typeof ctx.LogisticsEngine.fuel, 'function');
  assert.equal(typeof ctx.LogisticsEngine.load, 'function');
  assert.equal(typeof ctx.LogisticsEngine.price, 'function');
  assert.equal(typeof ctx.LogisticsEngine.optimizeRoute, 'function');
  assert.equal(typeof ctx.LogisticsEngine.plan, 'function');
  const r = ctx.LogisticsEngine.route({
    kmProdusen: 20, biayaPerKmProdusen: 3000, kmKonsumen: 10, biayaPerKmKonsumen: 3000,
    metode: 'antar', pcs: 20,
  });
  assert.equal(r.totalPerPcs, 4500); // sama persis dgn tests/logistics-engine.test.js
});
