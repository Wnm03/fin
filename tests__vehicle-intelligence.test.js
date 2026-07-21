'use strict';
// tests/vehicle-intelligence.test.js — VehicleIntelligence (modules/vehicle/
// vehicle-intelligence.js). Sesi 76 (Batch 7) — Vehicle Intelligence
// Foundation: vehicle overview, health score per kendaraan, ringkasan
// armada (fleet), insight dasar. Pola sama persis tests/finance-
// intelligence.test.js — dependency (getVehicleKm, predictService,
// fuelEfficiency) di-mock lewat loadSource extraGlobals (isolasi murni),
// bukan me-load ulang vehicle-core.js/sparepart-servis.js sungguhan (yang
// masing2 sudah/akan dites terpisah di file test-nya sendiri) — di sini
// fokus ke lapisan agregasi VehicleIntelligence sendiri.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D, opts = {}) {
  return loadSource(['modules/vehicle/vehicle-intelligence.js'], {
    D,
    getVehicleKm: opts.getVehicleKm,
    predictService: opts.predictService,
    fuelEfficiency: opts.fuelEfficiency,
  }, ['VehicleIntelligence']);
}

function baseD(overrides = {}) {
  return Object.assign({
    vehicles: [],
  }, overrides);
}

const VEH1 = { id: 'veh_1', name: 'Motor A', emoji: '🏍️' };
const VEH2 = { id: 'veh_2', name: 'Mobil B', emoji: '🚗' };

// ================= vehicleOverview =================

test('vehicleOverview — kendaraan tidak ditemukan => ok:false', () => {
  const ctx = makeCtx(baseD({ vehicles: [VEH1] }));
  const result = ctx.VehicleIntelligence.vehicleOverview('veh_x');
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'Kendaraan tidak ditemukan');
});

test('vehicleOverview — reuse getVehicleKm()/predictService()/fuelEfficiency() apa adanya', () => {
  const D = baseD({ vehicles: [VEH1] });
  const service = { ok: true, vehicleId: 'veh_1', curKm: 15000, kmPerDay: 20, items: [] };
  const fuel = { ok: true, vehicleId: 'veh_1', kmPerLiter: 40, rpPerKm: 250, estMonthlyCost: 300000 };
  const ctx = makeCtx(D, {
    getVehicleKm: () => 15000,
    predictService: () => service,
    fuelEfficiency: () => fuel,
  });
  const result = ctx.VehicleIntelligence.vehicleOverview('veh_1');
  assert.equal(result.ok, true);
  assert.equal(result.name, 'Motor A');
  assert.equal(result.emoji, '🏍️');
  assert.equal(result.curKm, 15000);
  assert.deepEqual(result.service, service);
  assert.deepEqual(result.fuel, fuel);
});

test('vehicleOverview — guard: predictService/fuelEfficiency belum dimuat => ok:false per komponen, curKm default 0', () => {
  const D = baseD({ vehicles: [VEH1] });
  const ctx = makeCtx(D);
  const result = ctx.VehicleIntelligence.vehicleOverview('veh_1');
  assert.equal(result.ok, true);
  assert.equal(result.curKm, 0);
  assert.equal(result.service.ok, false);
  assert.equal(result.fuel.ok, false);
});

// ================= healthScore =================

test('healthScore — tidak ada service tersedia => score 0, label "Data Kurang"', () => {
  const ctx = makeCtx(baseD({ vehicles: [VEH1] }));
  const result = ctx.VehicleIntelligence.healthScore('veh_1');
  assert.equal(result.score, 0);
  assert.equal(result.label, 'Data Kurang');
  assert.equal(result.parts.length, 0);
});

test('healthScore — hanya komponen service tersedia (fuel belum dimuat), rescale 100% dari service', () => {
  const D = baseD({ vehicles: [VEH1] });
  const pred = { ok: true, items: [{ status: 'aman' }, { status: 'aman' }] }; // avg 1.0
  const ctx = makeCtx(D, { predictService: () => pred });
  const result = ctx.VehicleIntelligence.healthScore('veh_1');
  assert.equal(result.score, 100);
  assert.equal(result.label, 'Sehat');
  assert.equal(result.parts.length, 1);
  assert.equal(result.parts[0].key, 'service');
});

test('healthScore — komponen service+fuel tersedia, campuran status aman/segera/lewat', () => {
  const D = baseD({ vehicles: [VEH1] });
  const pred = { ok: true, items: [{ status: 'aman' }, { status: 'segera' }, { status: 'lewat' }] }; // avg 0.5
  const fuel = { ok: true };
  const ctx = makeCtx(D, { predictService: () => pred, fuelEfficiency: () => fuel });
  const result = ctx.VehicleIntelligence.healthScore('veh_1');
  // service: 0.5*50=25, fuel: 50 => total 75/100 = 75
  assert.equal(result.score, 75);
  assert.equal(result.label, 'Cukup Sehat');
  assert.equal(result.parts.length, 2);
});

test('healthScore — fuelEfficiency ok:false tidak ikut dihitung (rescale ke service saja)', () => {
  const D = baseD({ vehicles: [VEH1] });
  const pred = { ok: true, items: [{ status: 'lewat' }] }; // avg 0
  const ctx = makeCtx(D, { predictService: () => pred, fuelEfficiency: () => ({ ok: false, reason: 'kurang data' }) });
  const result = ctx.VehicleIntelligence.healthScore('veh_1');
  assert.equal(result.score, 0);
  assert.equal(result.label, 'Perlu Perhatian');
  assert.equal(result.parts.length, 1);
});

test('healthScore — predictService ok tapi items kosong (belum ada kategori sparepart) tidak ikut dihitung', () => {
  const D = baseD({ vehicles: [VEH1] });
  const ctx = makeCtx(D, { predictService: () => ({ ok: true, items: [] }), fuelEfficiency: () => ({ ok: true }) });
  const result = ctx.VehicleIntelligence.healthScore('veh_1');
  assert.equal(result.parts.length, 1);
  assert.equal(result.parts[0].key, 'fuel');
  assert.equal(result.score, 100);
});

// ================= fleetSummary =================

test('fleetSummary — tidak ada kendaraan => totalVehicles 0, avgHealth 0', () => {
  const ctx = makeCtx(baseD({ vehicles: [] }));
  const result = ctx.VehicleIntelligence.fleetSummary();
  assert.equal(result.totalVehicles, 0);
  assert.equal(result.totalOverdue, 0);
  assert.equal(result.avgHealth, 0);
  assert.equal(result.vehicles.length, 0);
});

test('fleetSummary — agregasi lintas kendaraan: totalOverdue & avgHealth', () => {
  const D = baseD({ vehicles: [VEH1, VEH2] });
  const predByVeh = {
    veh_1: { ok: true, items: [{ status: 'lewat' }, { status: 'aman' }] }, // 1 overdue, avg 0.5, hanya komponen service (fuel belum dimuat) => rescale 0.5*50/50*100=50
    veh_2: { ok: true, items: [{ status: 'aman' }] }, // 0 overdue, avg 1 => score 100
  };
  const ctx = makeCtx(D, { predictService: ({ vehicleId }) => predByVeh[vehicleId] });
  const result = ctx.VehicleIntelligence.fleetSummary();
  assert.equal(result.totalVehicles, 2);
  assert.equal(result.totalOverdue, 1);
  assert.equal(result.vehicles.length, 2);
  const v1 = result.vehicles.find((r) => r.vehicleId === 'veh_1');
  const v2 = result.vehicles.find((r) => r.vehicleId === 'veh_2');
  assert.equal(v1.overdueCount, 1);
  assert.equal(v1.healthScore, 50);
  assert.equal(v2.overdueCount, 0);
  assert.equal(v2.healthScore, 100);
  assert.equal(result.avgHealth, Math.round((v1.healthScore + v2.healthScore) / 2));
});

// ================= insights =================

test('insights(vehicleId) — kendaraan tidak ditemukan => array kosong', () => {
  const ctx = makeCtx(baseD({ vehicles: [] }));
  const result = ctx.VehicleIntelligence.insights('veh_x');
  assert.equal(result.length, 0);
});

test('insights(vehicleId) — item servis lewat => warning, estimasi biaya BBM => info, health score selalu ada', () => {
  const D = baseD({ vehicles: [VEH1] });
  const pred = { ok: true, items: [{ status: 'lewat' }, { status: 'lewat' }, { status: 'aman' }] };
  const fuel = { ok: true, estMonthlyCost: 250000 };
  const ctx = makeCtx(D, {
    getVehicleKm: () => 1000,
    predictService: () => pred,
    fuelEfficiency: () => fuel,
  });
  const result = ctx.VehicleIntelligence.insights('veh_1');
  const codes = result.map((r) => r.code);
  assert.ok(codes.includes('service_overdue'));
  assert.ok(codes.includes('fuel_cost_estimate'));
  assert.ok(codes.includes('health_score'));
  const overdueMsg = result.find((r) => r.code === 'service_overdue');
  assert.equal(overdueMsg.type, 'warning');
  assert.match(overdueMsg.message, /2 item servis Motor A/);
});

test('insights(vehicleId) — tidak ada item lewat & tidak ada estMonthlyCost => hanya health_score', () => {
  const D = baseD({ vehicles: [VEH1] });
  const pred = { ok: true, items: [{ status: 'aman' }] };
  const fuel = { ok: false, reason: 'kurang data' };
  const ctx = makeCtx(D, { predictService: () => pred, fuelEfficiency: () => fuel });
  const result = ctx.VehicleIntelligence.insights('veh_1');
  assert.equal(result.length, 1);
  assert.equal(result[0].code, 'health_score');
});

test('insights() fleet-level — totalOverdue>0 => warning fleet_overdue + info fleet_health', () => {
  const D = baseD({ vehicles: [VEH1, VEH2] });
  const predByVeh = {
    veh_1: { ok: true, items: [{ status: 'lewat' }] },
    veh_2: { ok: true, items: [{ status: 'aman' }] },
  };
  const ctx = makeCtx(D, { predictService: ({ vehicleId }) => predByVeh[vehicleId] });
  const result = ctx.VehicleIntelligence.insights();
  const codes = result.map((r) => r.code);
  assert.ok(codes.includes('fleet_overdue'));
  assert.ok(codes.includes('fleet_health'));
});

test('insights() fleet-level — tidak ada kendaraan sama sekali => array kosong (tidak ada fleet_health palsu)', () => {
  const ctx = makeCtx(baseD({ vehicles: [] }));
  const result = ctx.VehicleIntelligence.insights();
  assert.equal(result.length, 0);
});

// ================= summary =================

test('summary() tanpa vehicleId — fleet-level saja, tidak ada key vehicle/healthScore', () => {
  const D = baseD({ vehicles: [VEH1] });
  const ctx = makeCtx(D, { predictService: () => ({ ok: true, items: [{ status: 'aman' }] }) });
  const result = ctx.VehicleIntelligence.summary();
  assert.ok(result.fleet);
  assert.ok(Array.isArray(result.insights));
  assert.equal(result.vehicle, undefined);
  assert.equal(result.healthScore, undefined);
});

test('summary(vehicleId) — gabungan fleet + vehicle + healthScore + vehicleInsights', () => {
  const D = baseD({ vehicles: [VEH1] });
  const pred = { ok: true, items: [{ status: 'aman' }] };
  const ctx = makeCtx(D, {
    getVehicleKm: () => 500,
    predictService: () => pred,
    fuelEfficiency: () => ({ ok: false, reason: 'kurang data' }),
  });
  const result = ctx.VehicleIntelligence.summary('veh_1');
  assert.ok(result.fleet);
  assert.ok(Array.isArray(result.insights));
  assert.equal(result.vehicle.ok, true);
  assert.equal(result.vehicle.name, 'Motor A');
  assert.equal(result.healthScore.score, 100);
  assert.ok(Array.isArray(result.vehicleInsights));
});
