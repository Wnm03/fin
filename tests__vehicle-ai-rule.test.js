'use strict';
// tests/vehicle-ai-rule.test.js — Smart Delivery Engine, Sesi 8: rule domain
// VEHICLE untuk AIDecision (lanjutan Sesi 7 — lihat RENCANA-SESI-RINGKAS.md).
// registerVehicleAIRules()/rule 'vehicle-service-overdue'
// (modules/vehicle/sparepart-servis.js). Tidak menguji ulang predictService()
// sendiri (sudah dites di tests/vehicle-predict.test.js) — fixture di sini
// dibuat sekadar cukup untuk memicu status 'lewat'/'aman'.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D, opts = {}) {
  return loadSource(
    ['modules/ai/ai-core.js', 'modules/ai/ai-decision-engine.js', 'modules/vehicle/vehicle-core.js', 'modules/vehicle/sparepart-servis.js'],
    {
      D,
      dateToISO: (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'),
      getWeekRange: () => ({ start: new Date(), end: new Date() }),
      MY_WRENCH: { minLbft: 10, maxLbft: 80 },
      Servis: opts.Servis || { getLastServiceKmForCat: () => null },
      IDBStore: { async get() { return null; }, async set() { return true; } },
    },
    ['AIDecision'],
  );
}

function overdueD() {
  return {
    vehicles: [{ id: 'v1', name: 'Vario 125' }],
    sparepartCats: [{ id: 'catA', name: 'Ganti Oli', intervalKm: 3000 }],
    kmLogs: [{ vehicleId: 'v1', date: '2026-06-01', km: 5000 }],
    bbmLogs: [], servisLogs: [],
  };
}

function amanD() {
  return {
    vehicles: [{ id: 'v1', name: 'Vario 125' }],
    sparepartCats: [{ id: 'catA', name: 'Ganti Oli', intervalKm: 3000 }],
    kmLogs: [{ vehicleId: 'v1', date: '2026-06-01', km: 500 }],
    bbmLogs: [], servisLogs: [],
  };
}

test('registerVehicleAIRules() — berhasil daftar, idempotent, guard AIDecision belum ada', () => {
  const ctx = makeCtx(overdueD());
  assert.equal(ctx.registerVehicleAIRules(), true);
  assert.equal(ctx.AIDecision.rules.getAll().some((r) => r.id === 'vehicle-service-overdue'), true);
  assert.equal(ctx.registerVehicleAIRules(), false); // idempotent

  const ctxNoAI = loadSource(['modules/vehicle/vehicle-core.js', 'modules/vehicle/sparepart-servis.js'], {
    D: overdueD(),
    dateToISO: (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'),
    getWeekRange: () => ({ start: new Date(), end: new Date() }),
    MY_WRENCH: { minLbft: 10, maxLbft: 80 },
    Servis: { getLastServiceKmForCat: () => null },
  });
  assert.equal(ctxNoAI.registerVehicleAIRules(), false);
});

test('rule vehicle-service-overdue — trigger kalau ada item servis status "lewat" (sisaKm<=0)', () => {
  // kmLogs km=5000, lastServiceKm null -> jarakTempuh=5000, interval 3000 -> sisaKm=-2000 -> 'lewat'
  const ctx = makeCtx(overdueD(), { Servis: { getLastServiceKmForCat: () => null } });
  ctx.registerVehicleAIRules();
  const triggered = ctx.AIDecision.rules.evaluate({});
  assert.equal(triggered.length, 1);
  assert.equal(triggered[0].ruleId, 'vehicle-service-overdue');
  assert.equal(triggered[0].category, 'vehicle');
  assert.match(triggered[0].message, /Vario 125/);
  assert.match(triggered[0].message, /Ganti Oli/);
});

test('rule vehicle-service-overdue — TIDAK trigger kalau semua kategori masih "aman"', () => {
  const ctx = makeCtx(amanD(), { Servis: { getLastServiceKmForCat: () => null } });
  ctx.registerVehicleAIRules();
  const triggered = ctx.AIDecision.rules.evaluate({});
  assert.equal(triggered.length, 0);
});

test('rule vehicle-service-overdue — TIDAK trigger kalau belum ada kendaraan sama sekali', () => {
  const ctx = makeCtx({ vehicles: [], sparepartCats: [], kmLogs: [], bbmLogs: [], servisLogs: [] });
  ctx.registerVehicleAIRules();
  const triggered = ctx.AIDecision.rules.evaluate({});
  assert.equal(triggered.length, 0);
});

// ================= rule kedua: vehicle-fuel-efficiency-drop =================
// 4 log Full Tank berurutan -> 3 segmen (jarak/liter berturut): 100 km/L,
// 100 km/L, 100 km/L (rata-rata sebelumnya 100), lalu segmen terakhir (drop)
// sengaja dibuat jauh lebih boros -> km/L turun >=20%.

function fuelDropD(lastKmPerLiter) {
  // km berturut naik 1000 tiap isi, liter disesuaikan supaya km/L = target.
  const logs = [
    { vehicleId: 'v1', fullTank: true, km: 1000, liter: 10 }, // titik awal, tidak dihitung sbg segmen
    { vehicleId: 'v1', fullTank: true, km: 2000, liter: 1000 / 100 }, // segmen1: 1000/10=100 km/L
    { vehicleId: 'v1', fullTank: true, km: 3000, liter: 1000 / 100 }, // segmen2: 100 km/L
    { vehicleId: 'v1', fullTank: true, km: 4000, liter: 1000 / 100 }, // segmen3: 100 km/L
    { vehicleId: 'v1', fullTank: true, km: 5000, liter: 1000 / lastKmPerLiter }, // segmen4 (terakhir, dibandingkan)
  ];
  return { vehicles: [{ id: 'v1', name: 'Vario 125' }], sparepartCats: [], kmLogs: [], bbmLogs: logs, servisLogs: [] };
}

function makeCtxWithLogistics(D) {
  return loadSource(
    ['modules/ai/ai-core.js', 'modules/ai/ai-decision-engine.js', 'modules/vehicle/vehicle-core.js', 'modules/vehicle/sparepart-servis.js', 'modules/logistics/logistics-engine.js'],
    {
      D,
      dateToISO: (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'),
      getWeekRange: () => ({ start: new Date(), end: new Date() }),
      MY_WRENCH: { minLbft: 10, maxLbft: 80 },
      Servis: { getLastServiceKmForCat: () => null },
      IDBStore: { async get() { return null; }, async set() { return true; } },
    },
    ['AIDecision', 'LogisticsEngine'],
  );
}

function fuelDropDWithHarga(lastKmPerLiter) {
  const D = fuelDropD(lastKmPerLiter);
  D.bbmLogs = D.bbmLogs.map((l) => Object.assign({}, l, { harga: 10000 })); // Rp10.000/liter
  return D;
}

test('rule vehicle-fuel-efficiency-drop — Sesi 12: LogisticsEngine dimuat & histori harga BBM cukup -> estimatedImpact/actions terisi dari LogisticsEngine.fuelCalculator()', () => {
  const ctx = makeCtxWithLogistics(fuelDropDWithHarga(70)); // 100 -> 70 km/L
  ctx.registerVehicleAIRules();
  return ctx.AIDecision.decide({}).then((result) => {
    const dec = result.decisions.find((d) => d.ruleId === 'vehicle-fuel-efficiency-drop');
    assert.ok(dec, 'decision vehicle-fuel-efficiency-drop harus ada');
    assert.equal(dec.title, 'Cek performa BBM kendaraan');
    assert.equal(dec.affectedModules.length, 2);
    assert.equal(dec.affectedModules[0], 'vehicle');
    assert.equal(dec.affectedModules[1], 'finance');
    assert.ok(dec.estimatedImpact.biayaBBMPer100kmSekarang, 'biayaBBMPer100kmSekarang harus terisi');
    assert.ok(dec.estimatedImpact.biayaBBMPer100kmBiasanya, 'biayaBBMPer100kmBiasanya harus terisi');
    assert.ok(dec.estimatedImpact.selisihPer100km.startsWith('+'), 'selisih harus positif (konsumsi turun -> biaya naik)');
    assert.equal(dec.actions.length, 2);
  });
});

test('rule vehicle-fuel-efficiency-drop — LogisticsEngine TIDAK dimuat -> fallback message-only (backward compatible)', () => {
  const ctx = makeCtx(fuelDropD(70)); // makeCtx (tanpa logistics-engine.js), sama seperti test lama
  ctx.registerVehicleAIRules();
  return ctx.AIDecision.decide({}).then((result) => {
    const dec = result.decisions.find((d) => d.ruleId === 'vehicle-fuel-efficiency-drop');
    assert.ok(dec, 'decision harus tetap ada');
    assert.match(dec.message, /Vario 125/); // message lama tetap jalan
    assert.equal(dec.title, null); // tidak ada enrichment
    assert.equal(dec.estimatedImpact, null);
  });
});

test('registerVehicleAIRules() — juga daftarkan rule vehicle-fuel-efficiency-drop', () => {
  const ctx = makeCtx(fuelDropD(100));
  ctx.registerVehicleAIRules();
  assert.equal(ctx.AIDecision.rules.getAll().some((r) => r.id === 'vehicle-fuel-efficiency-drop'), true);
});

test('rule vehicle-fuel-efficiency-drop — trigger kalau segmen terakhir turun >=20% dari rata-rata segmen sebelumnya', () => {
  const ctx = makeCtx(fuelDropD(70)); // 100 -> 70 km/L = turun 30%
  ctx.registerVehicleAIRules();
  const triggered = ctx.AIDecision.rules.evaluate({});
  const rule = triggered.find((r) => r.ruleId === 'vehicle-fuel-efficiency-drop');
  assert.ok(rule, 'rule vehicle-fuel-efficiency-drop harusnya trigger');
  assert.equal(rule.category, 'vehicle');
  assert.match(rule.message, /Vario 125/);
  assert.match(rule.message, /30%/);
});

test('rule vehicle-fuel-efficiency-drop — TIDAK trigger kalau penurunan < 20%', () => {
  const ctx = makeCtx(fuelDropD(90)); // 100 -> 90 km/L = turun 10%, di bawah ambang
  ctx.registerVehicleAIRules();
  const triggered = ctx.AIDecision.rules.evaluate({});
  assert.equal(triggered.some((r) => r.ruleId === 'vehicle-fuel-efficiency-drop'), false);
});

test('rule vehicle-fuel-efficiency-drop — TIDAK trigger kalau log Full Tank kurang dari 4', () => {
  const D = fuelDropD(70);
  D.bbmLogs = D.bbmLogs.slice(0, 3); // cuma 2 segmen
  const ctx = makeCtx(D);
  ctx.registerVehicleAIRules();
  const triggered = ctx.AIDecision.rules.evaluate({});
  assert.equal(triggered.some((r) => r.ruleId === 'vehicle-fuel-efficiency-drop'), false);
});

// ============ getAIVehicleFuelDropThreshold()/setAIVehicleFuelDropThreshold() ============

test('getAIVehicleFuelDropThreshold() — default 20 kalau belum diatur', () => {
  const ctx = makeCtx(fuelDropD(100));
  assert.equal(ctx.getAIVehicleFuelDropThreshold(), 20);
});

test('getAIVehicleFuelDropThreshold() — pakai D.profile.aiVehicleFuelDropThresholdPct kalau valid', () => {
  const D = fuelDropD(100);
  D.profile = { aiVehicleFuelDropThresholdPct: 40 };
  const ctx = makeCtx(D);
  assert.equal(ctx.getAIVehicleFuelDropThreshold(), 40);
});

test('getAIVehicleFuelDropThreshold() — di luar rentang 5-90 fallback default', () => {
  const D = fuelDropD(100);
  D.profile = { aiVehicleFuelDropThresholdPct: 2 };
  const ctx = makeCtx(D);
  assert.equal(ctx.getAIVehicleFuelDropThreshold(), 20);
});

test('setAIVehicleFuelDropThreshold(pct) — set & clamp rentang 5-90', () => {
  const D = fuelDropD(100);
  D.profile = {};
  const ctx = makeCtx(D);
  assert.equal(ctx.setAIVehicleFuelDropThreshold(30), 30);
  assert.equal(ctx.D.profile.aiVehicleFuelDropThresholdPct, 30);
  assert.equal(ctx.setAIVehicleFuelDropThreshold(1), 20); // di bawah 5 -> fallback default
  assert.equal(ctx.setAIVehicleFuelDropThreshold('abc'), 20); // bukan angka -> fallback default
});

test('rule vehicle-fuel-efficiency-drop — ambang custom (setAIVehicleFuelDropThreshold) dihormati', () => {
  const D = fuelDropD(90); // turun 10%, di bawah ambang default 20%
  D.profile = {};
  const ctx = makeCtx(D);
  ctx.registerVehicleAIRules();
  assert.equal(ctx.AIDecision.rules.evaluate({}).some((r) => r.ruleId === 'vehicle-fuel-efficiency-drop'), false);
  ctx.setAIVehicleFuelDropThreshold(5); // turunkan ambang ke bawah 10% -> harusnya trigger
  assert.equal(ctx.AIDecision.rules.evaluate({}).some((r) => r.ruleId === 'vehicle-fuel-efficiency-drop'), true);
});
