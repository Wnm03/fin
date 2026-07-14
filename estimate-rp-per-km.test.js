'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// estimateRpPerKm (vehicle-core.js, kw191-ongkir-jarak lanjutan — dipisah dari
// tukang-absensi.js (dulu features-tukang-kendaraan-storage.js) di split file besar bagian ke-4) dipakai oleh
// OngkirCalc.autoFillBiaya() (cobek.js) buat isi otomatis field "Ongkos/km" di kalkulator ongkir Shop
// dari histori BBM kendaraan asli (bukan cuma tebak-tebak manual). Fungsi murni (tidak baca/tulis DOM),
// jadi bisa dites langsung lewat loadSource.
function makeD(bbmLogs) {
  return { bbmLogs };
}
// Top-level file ini langsung mengeksekusi beberapa hal yang butuh global dari file LAIN
// (getWeekRange, MY_WRENCH, dateToISO) -- di-stub seperlunya di sini sekadar biar file bisa
// di-load, bukan bagian yg dites (pola sama seperti tests/servis-calc.test.js).
function loadEstimateRpPerKm(D) {
  const ctx = loadSource(['vehicle-core.js'], {
    D,
    dateToISO: (d) => d.toISOString().slice(0, 10),
    getWeekRange: () => ({ start: new Date(), end: new Date() }),
    MY_WRENCH: { minLbft: 10, maxLbft: 80 },
  });
  return ctx.estimateRpPerKm;
}

test('estimateRpPerKm — null kalau log full-tank kurang dari 2', () => {
  const D = makeD([
    { vehicleId: 'v1', fullTank: true, km: 1000, liter: 3, harga: 10000 },
  ]);
  const estimateRpPerKm = loadEstimateRpPerKm(D);
  assert.equal(estimateRpPerKm('v1'), null);
});

test('estimateRpPerKm — null kalau km tidak pernah naik antar log full-tank', () => {
  const D = makeD([
    { vehicleId: 'v1', fullTank: true, km: 1000, liter: 3, harga: 10000 },
    { vehicleId: 'v1', fullTank: true, km: 1000, liter: 3, harga: 10000 },
  ]);
  const estimateRpPerKm = loadEstimateRpPerKm(D);
  assert.equal(estimateRpPerKm('v1'), null);
});

test('estimateRpPerKm — hitung benar dari 2 titik full-tank berurutan (1 pasangan)', () => {
  // 100 km ditempuh pakai 2 liter (titik kedua) -> 50 km/liter. Harga/liter rata2 10000.
  // Ongkos/km = 10000 / 50 = 200
  const D = makeD([
    { vehicleId: 'v1', fullTank: true, km: 1000, liter: 3, harga: 10000 },
    { vehicleId: 'v1', fullTank: true, km: 1100, liter: 2, harga: 10000 },
  ]);
  const estimateRpPerKm = loadEstimateRpPerKm(D);
  const est = estimateRpPerKm('v1');
  assert.ok(est);
  assert.equal(est.kmPerLiter, 50);
  assert.equal(est.avgHarga, 10000);
  assert.equal(est.rpPerKm, 200);
});

test('estimateRpPerKm — gabungkan beberapa pasangan berurutan (bukan rata2 tiap pasangan)', () => {
  // Etape1: 1000->1100 (100km, 2L). Etape2: 1100->1300 (200km, 4L).
  // total 300km / 6L = 50 km/liter juga -> konsisten meski beda ukuran tiap etape.
  const D = makeD([
    { vehicleId: 'v1', fullTank: true, km: 1000, liter: 3, harga: 10000 },
    { vehicleId: 'v1', fullTank: true, km: 1100, liter: 2, harga: 10000 },
    { vehicleId: 'v1', fullTank: true, km: 1300, liter: 4, harga: 10000 },
  ]);
  const estimateRpPerKm = loadEstimateRpPerKm(D);
  const est = estimateRpPerKm('v1');
  assert.ok(est);
  assert.equal(est.kmPerLiter, 50);
  assert.equal(est.rpPerKm, 200);
});

test('estimateRpPerKm — abaikan log bukan full-tank & kendaraan lain', () => {
  const D = makeD([
    { vehicleId: 'v1', fullTank: true, km: 1000, liter: 3, harga: 10000 },
    { vehicleId: 'v1', fullTank: false, km: 1050, liter: 1, harga: 10000 }, // diabaikan
    { vehicleId: 'v2', fullTank: true, km: 5000, liter: 3, harga: 10000 }, // kendaraan lain, diabaikan
    { vehicleId: 'v1', fullTank: true, km: 1100, liter: 2, harga: 10000 },
  ]);
  const estimateRpPerKm = loadEstimateRpPerKm(D);
  const est = estimateRpPerKm('v1');
  assert.ok(est);
  assert.equal(est.kmPerLiter, 50);
});

test('estimateRpPerKm — null kalau tidak ada kendaraan cocok', () => {
  const D = makeD([
    { vehicleId: 'v1', fullTank: true, km: 1000, liter: 3, harga: 10000 },
    { vehicleId: 'v1', fullTank: true, km: 1100, liter: 2, harga: 10000 },
  ]);
  const estimateRpPerKm = loadEstimateRpPerKm(D);
  assert.equal(estimateRpPerKm('v-tidak-ada'), null);
});
