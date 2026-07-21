'use strict';
// tests/vehicle-trend-api.test.js — VehicleTrendAPI (modules/vehicle/
// vehicle-trend-api.js). Sesi 81 (Batch 7) — Vehicle Analytics Foundation:
// monthlyCostTrend() (SUM D.bbmLogs[].cost/D.servisLogs[].cost per bulan
// kalender, N bulan terakhir). Pola sama persis tests/vehicle-reminder.
// test.js — dependency (D) di-mock lewat loadSource extraGlobals (isolasi
// murni), bukan me-load ulang vehicle-core.js/sparepart-servis.js
// sungguhan. MONTHS (modules/shared/helper-teks.js) di-mock manual di sini
// (array kecil, sama isinya) supaya _monthLabel() bisa dites tanpa me-load
// helper-teks.js sungguhan.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function makeCtx(D, opts = {}) {
  return loadSource(['modules/vehicle/vehicle-trend-api.js'], {
    D,
    MONTHS: ('MONTHS' in opts) ? opts.MONTHS : MONTHS,
  }, ['VehicleTrendAPI']);
}

function baseD(overrides = {}) {
  return Object.assign({
    vehicles: [],
    bbmLogs: [],
    servisLogs: [],
  }, overrides);
}

// key(offset) — kunci 'YYYY-MM' N bulan sebelum bulan berjalan (offset=0 =>
// bulan berjalan), dihitung dgn cara yang SAMA PERSIS VehicleTrendAPI.
// _monthKeys() supaya test tidak brittle terhadap tanggal jalannya test.
function key(offset) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

const VEH1 = { id: 'veh_1', name: 'Motor A', emoji: '🏍️' };
const VEH2 = { id: 'veh_2', name: 'Mobil B', emoji: '🚗' };

test('vehicle-trend-api.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx(baseD()));
});

// ================= monthlyCostTrend() =================

test('monthlyCostTrend — default months=6, rows selalu 6 titik walau tanpa data sama sekali', () => {
  const ctx = makeCtx(baseD());
  const result = ctx.VehicleTrendAPI.monthlyCostTrend();
  assert.equal(result.ok, true);
  assert.equal(result.months, 6);
  assert.equal(result.rows.length, 6);
  assert.equal(result.total, 0);
  result.rows.forEach((r) => {
    assert.equal(r.fuel, 0);
    assert.equal(r.service, 0);
    assert.equal(r.total, 0);
  });
});

test('monthlyCostTrend — bulan tanpa transaksi tetap muncul (total 0), bukan cuma bulan yang ada datanya', () => {
  const D = baseD({
    vehicles: [VEH1],
    bbmLogs: [{ vehicleId: 'veh_1', date: key(0) + '-15', cost: 100000 }],
  });
  const ctx = makeCtx(D);
  const result = ctx.VehicleTrendAPI.monthlyCostTrend({ months: 3 });
  assert.equal(result.rows.length, 3);
  assert.equal(result.rows[0].month, key(2));
  assert.equal(result.rows[1].month, key(1));
  assert.equal(result.rows[2].month, key(0));
  assert.equal(result.rows[0].total, 0);
  assert.equal(result.rows[1].total, 0);
  assert.equal(result.rows[2].total, 100000);
});

test('monthlyCostTrend — type:"fuel" hanya SUM D.bbmLogs[].cost, tidak ikut D.servisLogs', () => {
  const D = baseD({
    vehicles: [VEH1],
    bbmLogs: [{ vehicleId: 'veh_1', date: key(0) + '-05', cost: 50000 }],
    servisLogs: [{ vehicleId: 'veh_1', date: key(0) + '-06', cost: 200000 }],
  });
  const ctx = makeCtx(D);
  const result = ctx.VehicleTrendAPI.monthlyCostTrend({ type: 'fuel', months: 1 });
  assert.equal(result.type, 'fuel');
  assert.equal(result.total, 50000);
  assert.equal(result.rows[0].fuel, 50000);
  assert.equal(result.rows[0].service, 0);
});

test('monthlyCostTrend — type:"service" hanya SUM D.servisLogs[].cost, tidak ikut D.bbmLogs', () => {
  const D = baseD({
    vehicles: [VEH1],
    bbmLogs: [{ vehicleId: 'veh_1', date: key(0) + '-05', cost: 50000 }],
    servisLogs: [{ vehicleId: 'veh_1', date: key(0) + '-06', cost: 200000 }],
  });
  const ctx = makeCtx(D);
  const result = ctx.VehicleTrendAPI.monthlyCostTrend({ type: 'service', months: 1 });
  assert.equal(result.type, 'service');
  assert.equal(result.total, 200000);
  assert.equal(result.rows[0].fuel, 0);
  assert.equal(result.rows[0].service, 200000);
});

test('monthlyCostTrend — type:"all" (default) gabungan fuel+service per bulan', () => {
  const D = baseD({
    vehicles: [VEH1],
    bbmLogs: [{ vehicleId: 'veh_1', date: key(0) + '-05', cost: 50000 }],
    servisLogs: [{ vehicleId: 'veh_1', date: key(0) + '-06', cost: 200000 }],
  });
  const ctx = makeCtx(D);
  const result = ctx.VehicleTrendAPI.monthlyCostTrend({ months: 1 });
  assert.equal(result.rows[0].fuel, 50000);
  assert.equal(result.rows[0].service, 200000);
  assert.equal(result.rows[0].total, 250000);
  assert.equal(result.total, 250000);
});

test('monthlyCostTrend — vehicleId diberikan: hanya SUM log kendaraan itu, kendaraan lain tidak ikut', () => {
  const D = baseD({
    vehicles: [VEH1, VEH2],
    bbmLogs: [
      { vehicleId: 'veh_1', date: key(0) + '-05', cost: 50000 },
      { vehicleId: 'veh_2', date: key(0) + '-05', cost: 999000 },
    ],
  });
  const ctx = makeCtx(D);
  const result = ctx.VehicleTrendAPI.monthlyCostTrend({ vehicleId: 'veh_1', type: 'fuel', months: 1 });
  assert.equal(result.vehicleId, 'veh_1');
  assert.equal(result.total, 50000);
});

test('monthlyCostTrend — tanpa vehicleId: SUM lintas seluruh armada', () => {
  const D = baseD({
    vehicles: [VEH1, VEH2],
    bbmLogs: [
      { vehicleId: 'veh_1', date: key(0) + '-05', cost: 50000 },
      { vehicleId: 'veh_2', date: key(0) + '-05', cost: 30000 },
    ],
  });
  const ctx = makeCtx(D);
  const result = ctx.VehicleTrendAPI.monthlyCostTrend({ type: 'fuel', months: 1 });
  assert.equal(result.vehicleId, null);
  assert.equal(result.total, 80000);
});

test('monthlyCostTrend — log dgn cost<=0 atau tanpa date diabaikan (tidak ikut SUM)', () => {
  const D = baseD({
    vehicles: [VEH1],
    bbmLogs: [
      { vehicleId: 'veh_1', date: key(0) + '-05', cost: 0 },
      { vehicleId: 'veh_1', cost: 100000 },
    ],
  });
  const ctx = makeCtx(D);
  const result = ctx.VehicleTrendAPI.monthlyCostTrend({ type: 'fuel', months: 1 });
  assert.equal(result.total, 0);
});

test('monthlyCostTrend — label bulan reuse MONTHS apa adanya (format "MMM YYYY")', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const result = ctx.VehicleTrendAPI.monthlyCostTrend({ months: 1 });
  const now = new Date();
  const expected = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  assert.equal(result.rows[0].label, expected);
});

test('monthlyCostTrend — guard: D belum dimuat => rows tetap 0 semua, tidak throw', () => {
  const ctx = makeCtx(undefined);
  assert.doesNotThrow(() => ctx.VehicleTrendAPI.monthlyCostTrend());
  const result = ctx.VehicleTrendAPI.monthlyCostTrend({ months: 2 });
  assert.equal(result.total, 0);
  assert.equal(result.rows.length, 2);
});

test('monthlyCostTrend — guard: MONTHS belum dimuat => label fallback angka 2-digit, tidak throw', () => {
  const ctx = makeCtx(baseD(), { MONTHS: undefined });
  const result = ctx.VehicleTrendAPI.monthlyCostTrend({ months: 1 });
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  assert.equal(result.rows[0].label, `${mm} ${now.getFullYear()}`);
});
