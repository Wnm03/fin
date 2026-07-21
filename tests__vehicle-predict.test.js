'use strict';
// tests/vehicle-predict.test.js — Smart Delivery Engine, Sesi 5/6:
// fuelEfficiency (modules/vehicle/vehicle-core.js) & predictService/
// maintenanceForecast (modules/vehicle/sparepart-servis.js). Ketiganya
// MEMBUNGKUS fungsi murni yang sudah ada & sudah dites terpisah
// (estimateRpPerKm/estimateKmPerDay/estimateServiceDateISO di
// tests/estimate-rp-per-km.test.js & servis-calc.test.js, getEffectiveIntervalKm/
// hasIntervalOverride juga di servis-calc.test.js) — jadi fixture data di
// sini dibuat sekadar cukup buat lewat fungsi2 itu, bukan mengulang semua
// skenario edge-case-nya.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// Servis.getLastServiceKmForCat (dipanggil predictService lewat wrapper
// global getLastServiceKmForCat di sparepart-servis.js) aslinya di
// car-notes.js — di-stub di sini (bukan load car-notes.js utuh) supaya
// fixture tetap kecil & terarah, sama pola dgn tests/servis-calc.test.js
// yang men-stub dependency lintas-file lain.
function loadVehiclePredict(D, opts = {}) {
  return loadSource(['modules/vehicle/vehicle-core.js', 'modules/vehicle/sparepart-servis.js'], {
    D,
    dateToISO: (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'),
    getWeekRange: () => ({ start: new Date(), end: new Date() }),
    MY_WRENCH: { minLbft: 10, maxLbft: 80 },
    Servis: opts.Servis || { getLastServiceKmForCat: () => null },
  });
}

// ================= fuelEfficiency =================

test('fuelEfficiency — data BBM kurang (< 2 log full-tank) => ok:false', () => {
  const D = { bbmLogs: [{ vehicleId: 'v1', fullTank: true, km: 1000, liter: 3, harga: 10000 }], kmLogs: [] };
  const ctx = loadVehiclePredict(D);
  const result = ctx.fuelEfficiency('v1');
  assert.equal(result.ok, false);
});

test('fuelEfficiency — data cukup: kmPerLiter/rpPerKm dari estimateRpPerKm() asli, estMonthlyCost dihitung dari kmPerDay', () => {
  const D = {
    bbmLogs: [
      { vehicleId: 'v1', fullTank: true, km: 1000, liter: 3, harga: 10000, date: '2026-06-01' },
      { vehicleId: 'v1', fullTank: true, km: 1100, liter: 2, harga: 10000, date: '2026-06-11' },
    ],
    kmLogs: [],
  };
  const ctx = loadVehiclePredict(D);
  const est = ctx.estimateRpPerKm('v1'); // sumber asli, dipakai buat cross-check
  const kmPerDay = ctx.estimateKmPerDay('v1'); // dari bbmLogs juga (>=2 titik, rentang 10 hari)
  const result = ctx.fuelEfficiency('v1');
  assert.equal(result.ok, true);
  assert.equal(result.kmPerLiter, est.kmPerLiter);
  assert.equal(result.rpPerKm, est.rpPerKm);
  assert.equal(result.kmPerDay, kmPerDay);
  if (kmPerDay) {
    const expMonthlyKm = kmPerDay * 30;
    assert.equal(result.estMonthlyKm, expMonthlyKm);
    assert.equal(result.estMonthlyLiter, expMonthlyKm / est.kmPerLiter);
    assert.equal(result.estMonthlyCost, (expMonthlyKm / est.kmPerLiter) * est.avgHarga);
  } else {
    assert.equal(result.estMonthlyCost, null);
  }
});

// ================= predictService =================

test('predictService — kendaraan tidak ditemukan => ok:false', () => {
  const ctx = loadVehiclePredict({ vehicles: [], sparepartCats: [] });
  const result = ctx.predictService({ vehicleId: 'tidak-ada' });
  assert.equal(result.ok, false);
});

test('predictService — belum ada kategori sparepart terdaftar => ok:false', () => {
  const D = { vehicles: [{ id: 'v1' }], sparepartCats: [], kmLogs: [], bbmLogs: [], servisLogs: [] };
  const ctx = loadVehiclePredict(D);
  const result = ctx.predictService({ vehicleId: 'v1' });
  assert.equal(result.ok, false);
});

test('predictService — categoryId spesifik: balikin 1 objek (bukan array), status "lewat" kalau sisaKm<=0', () => {
  const D = {
    vehicles: [{ id: 'v1' }],
    sparepartCats: [{ id: 'cat1', name: 'Ganti Oli', intervalKm: 3000 }],
    kmLogs: [{ vehicleId: 'v1', date: '2026-06-01', km: 5000 }],
    bbmLogs: [],
    servisLogs: [],
  };
  const Servis = { getLastServiceKmForCat: () => 1000 }; // 5000-1000=4000 tempuh > interval 3000
  const ctx = loadVehiclePredict(D, { Servis });
  const result = ctx.predictService({ vehicleId: 'v1', categoryId: 'cat1' });
  assert.equal(result.ok, true);
  assert.equal(result.items, undefined);
  assert.equal(result.categoryId, 'cat1');
  assert.equal(result.sisaKm, 3000 - 4000);
  assert.equal(result.status, 'lewat');
});

test('predictService — tanpa categoryId: array semua kategori, terurut sisaKm ascending (paling mendesak dulu)', () => {
  const D = {
    vehicles: [{ id: 'v1' }],
    sparepartCats: [
      { id: 'catA', name: 'Ganti Oli', intervalKm: 3000 },
      { id: 'catB', name: 'Kampas Rem', intervalKm: 10000 },
    ],
    kmLogs: [{ vehicleId: 'v1', date: '2026-06-01', km: 2000 }],
    bbmLogs: [],
    servisLogs: [],
  };
  // catA: belum pernah servis (lastKm null) -> jarakTempuh=curKm=2000, sisa=3000-2000=1000
  //   (1000 > 3000*0.15=450 -> status 'aman', walau sisa km-nya paling kecil dari semua kategori)
  // catB: belum pernah servis -> sisa=10000-2000=8000 (jauh lebih besar -> 'aman' juga)
  const Servis = { getLastServiceKmForCat: () => null };
  const ctx = loadVehiclePredict(D, { Servis });
  const result = ctx.predictService({ vehicleId: 'v1' });
  assert.equal(result.ok, true);
  assert.equal(result.items.length, 2);
  assert.deepEqual(result.items.map((r) => r.categoryId), ['catA', 'catB']); // catA sisa lebih kecil -> duluan
  assert.equal(result.items[0].sisaKm, 1000);
  assert.equal(result.items[0].status, 'aman');
});

// ================= maintenanceForecast =================

test('maintenanceForecast — item yg lewat/estDateISO dlm jendela bulan ikut, biaya dirata2 dari histori D.servisLogs[].cost', () => {
  const D = {
    vehicles: [{ id: 'v1' }],
    sparepartCats: [{ id: 'catA', name: 'Ganti Oli', intervalKm: 3000 }],
    kmLogs: [{ vehicleId: 'v1', date: '2026-06-01', km: 4000 }], // sudah lewat interval (belum pernah servis)
    bbmLogs: [],
    servisLogs: [
      { vehicleId: 'v1', categoryId: 'catA', cost: 100000 },
      { vehicleId: 'v1', categoryId: 'catA', cost: 120000 },
    ],
  };
  const Servis = { getLastServiceKmForCat: () => null };
  const ctx = loadVehiclePredict(D, { Servis });
  const result = ctx.maintenanceForecast({ vehicleId: 'v1', monthsAhead: 3 });
  assert.equal(result.ok, true);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].biayaEstimasi, 110000);
  assert.equal(result.totalBiaya, 110000);
  assert.equal(result.totalBiayaLengkap, true);
});

test('maintenanceForecast — kategori due TANPA histori biaya: biayaEstimasi null, totalBiayaLengkap false, tidak ikut totalBiaya', () => {
  const D = {
    vehicles: [{ id: 'v1' }],
    sparepartCats: [{ id: 'catA', name: 'Ganti Oli', intervalKm: 3000 }],
    kmLogs: [{ vehicleId: 'v1', date: '2026-06-01', km: 4000 }],
    bbmLogs: [],
    servisLogs: [], // tidak ada histori biaya sama sekali
  };
  const Servis = { getLastServiceKmForCat: () => null };
  const ctx = loadVehiclePredict(D, { Servis });
  const result = ctx.maintenanceForecast({ vehicleId: 'v1', monthsAhead: 3 });
  assert.equal(result.ok, true);
  assert.equal(result.items[0].biayaEstimasi, null);
  assert.equal(result.totalBiaya, 0);
  assert.equal(result.totalBiayaLengkap, false);
});

test('maintenanceForecast — vehicleId tidak ditemukan => ok:false diteruskan dari predictService', () => {
  const ctx = loadVehiclePredict({ vehicles: [], sparepartCats: [] });
  const result = ctx.maintenanceForecast({ vehicleId: 'tidak-ada' });
  assert.equal(result.ok, false);
});
