'use strict';
// tests/logistics-service.test.js — modules/logistics/logistics-service.js
// (Sesi 3/6 Smart Delivery Engine: LogisticsService facade). Sama pola dgn
// tests/ai-service.test.js: memastikan facade berperilaku benar tanpa perlu
// tahu detail internal LogisticsEngine.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/loadSource');

function loadService(extraGlobals = {}) {
  return loadSource(
    [
      'modules/shop/cobek-pricing.js',
      'modules/vehicle/vehicle-core.js',
      'modules/logistics/logistics-engine.js',
      'modules/logistics/logistics-service.js',
    ],
    extraGlobals,
    ['LogisticsService', 'LogisticsEngine'],
  );
}

test('planDelivery — meneruskan ke LogisticsEngine.plan() apa adanya', async () => {
  const ctx = loadService();
  const plan = await ctx.LogisticsService.planDelivery({
    kmProdusen: 20, biayaPerKmProdusen: 3000, pcs: 20, metode: 'ambil',
  });
  assert.ok(plan.route);
  assert.equal(plan.route.totalPerPcs, 3000);
});

test('formatSummary — plan kosong/null: pesan default, tidak throw', () => {
  const ctx = loadService();
  assert.equal(ctx.LogisticsService.formatSummary(null), 'Belum ada rencana pengiriman.');
  assert.equal(ctx.LogisticsService.formatSummary({}), 'Belum cukup data untuk hitung rencana pengiriman.');
});

test('formatSummary — plan lengkap: tiap bagian jadi 1 baris, tidak ada "null"/"undefined" nyasar', async () => {
  const ctx = loadService({
    D: {
      bbmLogs: [
        { vehicleId: 'veh_1', fullTank: true, km: 1000, liter: 2, harga: 10000 },
        { vehicleId: 'veh_1', fullTank: true, km: 1100, liter: 2, harga: 10000 },
      ],
    },
  });
  const plan = await ctx.LogisticsService.planDelivery({
    kmProdusen: 20, biayaPerKmProdusen: 3000, pcs: 20, metode: 'ambil',
    totalPcs: 40, capacityPerTrip: 20, vehicleId: 'veh_1',
    modal: 20000, marginPct: 50,
  });
  const summary = ctx.LogisticsService.formatSummary(plan);
  assert.ok(summary.includes('Ongkir'));
  assert.ok(summary.includes('Muatan'));
  assert.ok(summary.includes('BBM'));
  assert.ok(summary.includes('Rekomendasi harga jual'));
  assert.ok(!summary.includes('null'));
  assert.ok(!summary.includes('undefined'));
});

test('formatSummary — bagian yang null (mis. fuel krn tidak ada vehicleId) di-skip, bukan ditampilkan kosong', async () => {
  const ctx = loadService();
  const plan = await ctx.LogisticsService.planDelivery({
    kmProdusen: 20, biayaPerKmProdusen: 3000, pcs: 20, metode: 'ambil',
  });
  const summary = ctx.LogisticsService.formatSummary(plan);
  assert.ok(summary.includes('Ongkir'));
  assert.ok(!summary.includes('BBM'));
  assert.ok(!summary.includes('Muatan'));
  assert.ok(!summary.includes('Rekomendasi harga jual'));
});

test('healthCheck — semua dependensi ter-load: ok true', async () => {
  const ctx = loadService();
  const health = await ctx.LogisticsService.healthCheck();
  assert.equal(health.ok, true);
  assert.equal(health.checks.engineReady, true);
  assert.equal(health.checks.ongkirCalcReady, true);
  assert.equal(health.checks.priceRekoReady, true);
});

test('healthCheck — LogisticsEngine belum di-load: ok false, engineReady false', async () => {
  const ctx = loadSource(
    ['modules/shop/cobek-pricing.js', 'modules/logistics/logistics-service.js'],
    {},
    ['LogisticsService'],
  );
  const health = await ctx.LogisticsService.healthCheck();
  assert.equal(health.ok, false);
  assert.equal(health.checks.engineReady, false);
});
