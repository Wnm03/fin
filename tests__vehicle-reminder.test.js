'use strict';
// tests/vehicle-reminder.test.js — VehicleReminder (modules/vehicle/
// vehicle-reminder.js). Sesi 78 (Batch 7) — Vehicle Reminder Foundation:
// Service Reminder, Tax Reminder, Fuel Reminder, Reminder Summary API.
// Pola sama persis tests/vehicle-intelligence.test.js — dependency
// (predictService, VEHTAX_ITEMS, dateStatusBadge, daysUntilDate,
// fuelEfficiency, getVehicleKm, estimateServiceDateISO) di-mock lewat
// loadSource extraGlobals (isolasi murni), bukan me-load ulang
// vehicle-core.js/sparepart-servis.js/car-notes.js sungguhan.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const VEHTAX_ITEMS = {
  tahunan: { label: '🧾 STNK Tahunan', tglKey: 'pajakTahunanTgl', biayaKey: 'biayaTahunan' },
  limaTahun: { label: '🔄 Ganti Plat (5th)', tglKey: 'pajakLimaTahunTgl', biayaKey: 'biayaLimaTahun' },
  uji: { label: '🚗 Uji Kelayakan', tglKey: 'ujiKelayakanTgl', biayaKey: 'biayaUji' },
};

function daysUntilDate(dateStr) {
  if (!dateStr) return null;
  const now = new Date('2026-07-20T00:00:00.000Z');
  const target = new Date(dateStr);
  return Math.round((target - now) / 86400000);
}

function dateStatusBadge(dateStr) {
  const d = daysUntilDate(dateStr);
  if (d === null) return { col: '', label: 'Belum diisi' };
  if (d < 0) return { col: 'red', label: `⚠️ Lewat ${Math.abs(d)} hari` };
  if (d <= 30) return { col: 'orange', label: d === 0 ? '🔔 Jatuh tempo hari ini' : `🔔 H-${d} hari` };
  return { col: 'green', label: '✅ Aktif' };
}

function makeCtx(D, opts = {}) {
  return loadSource(['modules/vehicle/vehicle-reminder.js'], {
    D,
    predictService: opts.predictService,
    VEHTAX_ITEMS: opts.VEHTAX_ITEMS,
    dateStatusBadge: opts.dateStatusBadge,
    daysUntilDate: opts.daysUntilDate,
    fuelEfficiency: opts.fuelEfficiency,
    getVehicleKm: opts.getVehicleKm,
    estimateServiceDateISO: opts.estimateServiceDateISO,
    isFinite: opts.isFinite || isFinite,
  }, ['VehicleReminder']);
}

function baseD(overrides = {}) {
  return Object.assign({ vehicles: [], bbmLogs: [] }, overrides);
}

const VEH1 = { id: 'veh_1', name: 'Motor A', pajakTahunanTgl: null, pajakLimaTahunTgl: null, ujiKelayakanTgl: null };
const VEH2 = { id: 'veh_2', name: 'Mobil B', pajakTahunanTgl: null, pajakLimaTahunTgl: null, ujiKelayakanTgl: null };

// ================= serviceReminders =================

test('serviceReminders — predictService belum dimuat => array kosong', () => {
  const ctx = makeCtx(baseD({ vehicles: [VEH1] }));
  assert.equal(ctx.VehicleReminder.serviceReminders().length, 0);
});

test('serviceReminders — status "aman" tidak dijadikan reminder', () => {
  const D = baseD({ vehicles: [VEH1] });
  const ctx = makeCtx(D, {
    predictService: () => ({ ok: true, items: [{ categoryId: 'c1', categoryName: 'Oli', status: 'aman', sisaKm: 2000, estDateISO: null }] }),
  });
  assert.equal(ctx.VehicleReminder.serviceReminders().length, 0);
});

test('serviceReminders — status "lewat" => severity overdue, pesan sesuai', () => {
  const D = baseD({ vehicles: [VEH1] });
  const ctx = makeCtx(D, {
    predictService: () => ({ ok: true, items: [{ categoryId: 'c1', categoryName: 'Oli', status: 'lewat', sisaKm: -300, estDateISO: null }] }),
  });
  const out = ctx.VehicleReminder.serviceReminders();
  assert.equal(out.length, 1);
  assert.equal(out[0].type, 'service');
  assert.equal(out[0].severity, 'overdue');
  assert.equal(out[0].vehicleName, 'Motor A');
  assert.equal(out[0].categoryName, 'Oli');
  assert.match(out[0].message, /lewat jatuh tempo/);
});

test('serviceReminders — status "segera" => severity due-soon', () => {
  const D = baseD({ vehicles: [VEH1] });
  const ctx = makeCtx(D, {
    predictService: () => ({ ok: true, items: [{ categoryId: 'c1', categoryName: 'Rem', status: 'segera', sisaKm: 150, estDateISO: '2026-08-01' }] }),
  });
  const out = ctx.VehicleReminder.serviceReminders();
  assert.equal(out.length, 1);
  assert.equal(out[0].severity, 'due-soon');
  assert.equal(out[0].sisaKm, 150);
  assert.equal(out[0].estDateISO, '2026-08-01');
});

test('serviceReminders — vehicleId diberikan => hanya filter ke kendaraan itu', () => {
  const D = baseD({ vehicles: [VEH1, VEH2] });
  const calls = [];
  const ctx = makeCtx(D, {
    predictService: ({ vehicleId }) => { calls.push(vehicleId); return { ok: true, items: [] }; },
  });
  ctx.VehicleReminder.serviceReminders('veh_2');
  assert.deepEqual(calls, ['veh_2']);
});

test('serviceReminders — predictService ok:false utk 1 kendaraan tidak menghentikan kendaraan lain', () => {
  const D = baseD({ vehicles: [VEH1, VEH2] });
  const ctx = makeCtx(D, {
    predictService: ({ vehicleId }) => vehicleId === 'veh_1'
      ? { ok: false, reason: 'Kendaraan tidak ditemukan' }
      : { ok: true, items: [{ categoryId: 'c1', categoryName: 'Oli', status: 'lewat', sisaKm: -10, estDateISO: null }] },
  });
  const out = ctx.VehicleReminder.serviceReminders();
  assert.equal(out.length, 1);
  assert.equal(out[0].vehicleId, 'veh_2');
});

// ================= taxReminders =================

test('taxReminders — dependency belum dimuat => array kosong', () => {
  const ctx = makeCtx(baseD({ vehicles: [VEH1] }));
  assert.equal(ctx.VehicleReminder.taxReminders().length, 0);
});

test('taxReminders — tgl kosong dilewati (tidak dijadikan reminder)', () => {
  const D = baseD({ vehicles: [VEH1] });
  const ctx = makeCtx(D, { VEHTAX_ITEMS, dateStatusBadge, daysUntilDate });
  assert.equal(ctx.VehicleReminder.taxReminders().length, 0);
});

test('taxReminders — tgl lewat (col red) => severity overdue', () => {
  const veh = { ...VEH1, pajakTahunanTgl: '2026-01-01' };
  const D = baseD({ vehicles: [veh] });
  const ctx = makeCtx(D, { VEHTAX_ITEMS, dateStatusBadge, daysUntilDate });
  const out = ctx.VehicleReminder.taxReminders();
  assert.equal(out.length, 1);
  assert.equal(out[0].type, 'tax');
  assert.equal(out[0].severity, 'overdue');
  assert.equal(out[0].taxKey, 'tahunan');
  assert.match(out[0].label, /STNK Tahunan/);
});

test('taxReminders — tgl H-10 (col orange) => severity due-soon', () => {
  const veh = { ...VEH1, pajakTahunanTgl: '2026-07-30' };
  const D = baseD({ vehicles: [veh] });
  const ctx = makeCtx(D, { VEHTAX_ITEMS, dateStatusBadge, daysUntilDate });
  const out = ctx.VehicleReminder.taxReminders();
  assert.equal(out.length, 1);
  assert.equal(out[0].severity, 'due-soon');
  assert.equal(out[0].daysUntil, 10);
});

test('taxReminders — tgl masih jauh (col green) => tidak jadi reminder', () => {
  const veh = { ...VEH1, pajakTahunanTgl: '2027-06-01' };
  const D = baseD({ vehicles: [veh] });
  const ctx = makeCtx(D, { VEHTAX_ITEMS, dateStatusBadge, daysUntilDate });
  assert.equal(ctx.VehicleReminder.taxReminders().length, 0);
});

test('taxReminders — beberapa jenis pajak pada 1 kendaraan menghasilkan reminder terpisah', () => {
  const veh = { ...VEH1, pajakTahunanTgl: '2026-01-01', ujiKelayakanTgl: '2026-07-25' };
  const D = baseD({ vehicles: [veh] });
  const ctx = makeCtx(D, { VEHTAX_ITEMS, dateStatusBadge, daysUntilDate });
  const out = ctx.VehicleReminder.taxReminders();
  assert.equal(out.length, 2);
  const keys = out.map((r) => r.taxKey).sort();
  assert.deepEqual(Array.from(keys), ['tahunan', 'uji']);
});

test('taxReminders — vehicleId diberikan => hanya kendaraan itu', () => {
  const vehA = { ...VEH1, pajakTahunanTgl: '2026-01-01' };
  const vehB = { ...VEH2, pajakTahunanTgl: '2026-01-01' };
  const D = baseD({ vehicles: [vehA, vehB] });
  const ctx = makeCtx(D, { VEHTAX_ITEMS, dateStatusBadge, daysUntilDate });
  const out = ctx.VehicleReminder.taxReminders('veh_2');
  assert.equal(out.length, 1);
  assert.equal(out[0].vehicleId, 'veh_2');
});

// ================= fuelReminders =================

test('fuelReminders — fuelEfficiency tidak ok => reminder severity info dgn alasan', () => {
  const D = baseD({ vehicles: [VEH1] });
  const ctx = makeCtx(D, {
    fuelEfficiency: () => ({ ok: false, reason: 'Data BBM kurang (butuh min. 2 log "Isi Full Tank" dgn km naik)' }),
  });
  const out = ctx.VehicleReminder.fuelReminders();
  assert.equal(out.length, 1);
  assert.equal(out[0].type, 'fuel');
  assert.equal(out[0].severity, 'info');
  assert.match(out[0].message, /belum cukup/);
});

test('fuelReminders — ok tapi tanpa log fullTank valid di D.bbmLogs => tidak ada reminder', () => {
  const D = baseD({ vehicles: [VEH1], bbmLogs: [] });
  const ctx = makeCtx(D, {
    fuelEfficiency: () => ({ ok: true, kmPerLiter: 40, kmPerDay: 20 }),
  });
  assert.equal(ctx.VehicleReminder.fuelReminders().length, 0);
});

test('fuelReminders — masih jauh dari batas jangkauan => tidak ada reminder', () => {
  const D = baseD({
    vehicles: [VEH1],
    bbmLogs: [
      { vehicleId: 'veh_1', fullTank: true, km: 1000, liter: 4 },
      { vehicleId: 'veh_1', fullTank: true, km: 1200, liter: 4 },
    ],
  });
  // avgLiter=4, kmPerLiter=40 => rangeKm=160. curKm=1210 (baru 10km sejak full terakhir km=1200).
  const ctx = makeCtx(D, {
    fuelEfficiency: () => ({ ok: true, kmPerLiter: 40, kmPerDay: 20 }),
    getVehicleKm: () => 1210,
  });
  assert.equal(ctx.VehicleReminder.fuelReminders().length, 0);
});

test('fuelReminders — dalam ambang 15% jangkauan => severity due-soon', () => {
  const D = baseD({
    vehicles: [VEH1],
    bbmLogs: [
      { vehicleId: 'veh_1', fullTank: true, km: 1000, liter: 4 },
      { vehicleId: 'veh_1', fullTank: true, km: 1200, liter: 4 },
    ],
  });
  // rangeKm=160 (avgLiter 4 * kmPerLiter 40). 15% dari 160 = 24. kmSinceLastFull=145 => sisaKm=15 (<=24).
  const ctx = makeCtx(D, {
    fuelEfficiency: () => ({ ok: true, kmPerLiter: 40, kmPerDay: 20 }),
    getVehicleKm: () => 1345,
    estimateServiceDateISO: (sisaKm, kmPerDay) => (sisaKm > 0 && kmPerDay > 0) ? '2026-07-21' : null,
  });
  const out = ctx.VehicleReminder.fuelReminders();
  assert.equal(out.length, 1);
  assert.equal(out[0].severity, 'due-soon');
  assert.equal(out[0].sisaKm, 15);
  assert.equal(out[0].rangeKm, 160);
  assert.equal(out[0].estDateISO, '2026-07-21');
});

test('fuelReminders — sudah melewati estimasi jangkauan => severity overdue', () => {
  const D = baseD({
    vehicles: [VEH1],
    bbmLogs: [
      { vehicleId: 'veh_1', fullTank: true, km: 1000, liter: 4 },
      { vehicleId: 'veh_1', fullTank: true, km: 1200, liter: 4 },
    ],
  });
  // rangeKm=160. kmSinceLastFull=200 => sisaKm=-40 (<=0).
  const ctx = makeCtx(D, {
    fuelEfficiency: () => ({ ok: true, kmPerLiter: 40, kmPerDay: 20 }),
    getVehicleKm: () => 1400,
  });
  const out = ctx.VehicleReminder.fuelReminders();
  assert.equal(out.length, 1);
  assert.equal(out[0].severity, 'overdue');
  assert.equal(out[0].sisaKm, -40);
  assert.match(out[0].message, /melewati estimasi jangkauan/);
});

test('fuelReminders — vehicleId diberikan => hanya kendaraan itu', () => {
  const D = baseD({
    vehicles: [VEH1, VEH2],
    bbmLogs: [
      { vehicleId: 'veh_1', fullTank: true, km: 1000, liter: 4 },
      { vehicleId: 'veh_1', fullTank: true, km: 1200, liter: 4 },
      { vehicleId: 'veh_2', fullTank: true, km: 500, liter: 4 },
      { vehicleId: 'veh_2', fullTank: true, km: 700, liter: 4 },
    ],
  });
  const ctx = makeCtx(D, {
    fuelEfficiency: () => ({ ok: true, kmPerLiter: 40, kmPerDay: 20 }),
    getVehicleKm: (id) => (id === 'veh_1' ? 1400 : 800), // veh_2 masih jauh dari batas
  });
  const out = ctx.VehicleReminder.fuelReminders('veh_1');
  assert.equal(out.length, 1);
  assert.equal(out[0].vehicleId, 'veh_1');
});

// ================= summary (Reminder Summary API) =================

test('summary — gabungan service+tax+fuel & hitungan overdue/due-soon/info', () => {
  const veh = { ...VEH1, pajakTahunanTgl: '2026-01-01' }; // tax overdue
  const D = baseD({
    vehicles: [veh],
    bbmLogs: [
      { vehicleId: 'veh_1', fullTank: true, km: 1000, liter: 4 },
      { vehicleId: 'veh_1', fullTank: true, km: 1200, liter: 4 },
    ],
  });
  const ctx = makeCtx(D, {
    predictService: () => ({ ok: true, items: [{ categoryId: 'c1', categoryName: 'Oli', status: 'segera', sisaKm: 100, estDateISO: null }] }), // service due-soon
    VEHTAX_ITEMS, dateStatusBadge, daysUntilDate,
    fuelEfficiency: () => ({ ok: true, kmPerLiter: 40, kmPerDay: 20 }),
    getVehicleKm: () => 1400, // fuel overdue
  });
  const s = ctx.VehicleReminder.summary();
  assert.equal(s.total, 3);
  assert.equal(s.overdueCount, 2); // tax + fuel
  assert.equal(s.dueSoonCount, 1); // service
  assert.equal(s.infoCount, 0);
  assert.equal(s.service.length, 1);
  assert.equal(s.tax.length, 1);
  assert.equal(s.fuel.length, 1);
  assert.equal(s.all.length, 3);
});

test('summary — tidak ada kendaraan sama sekali => semua kosong, total 0', () => {
  const ctx = makeCtx(baseD());
  const s = ctx.VehicleReminder.summary();
  assert.equal(s.total, 0);
  assert.equal(s.overdueCount, 0);
  assert.equal(s.dueSoonCount, 0);
  assert.equal(s.infoCount, 0);
  assert.equal(s.all.length, 0);
});

test('summary — vehicleId diteruskan konsisten ke ketiga sub-fungsi', () => {
  const vehA = { ...VEH1, pajakTahunanTgl: '2026-01-01' };
  const vehB = { ...VEH2, pajakTahunanTgl: '2026-01-01' };
  const D = baseD({ vehicles: [vehA, vehB] });
  const ctx = makeCtx(D, { VEHTAX_ITEMS, dateStatusBadge, daysUntilDate });
  const s = ctx.VehicleReminder.summary('veh_2');
  assert.equal(s.tax.length, 1);
  assert.equal(s.tax[0].vehicleId, 'veh_2');
});
