'use strict';
// tests/lifeos-today-adapter.test.js — todayAdapterList() (lifeos/adapters/
// today-adapter.js). Fokus: (1) todayAdapterList() SEKARANG registry-driven
// (iterasi LIFEOS_TODAY_SOURCES, dispatch ke TODAY_SOURCE_BUILDERS per key)
// — bukan cuma diklaim di komentar; (2) 5 sumber (bills/reminders/selfcare/
// payroll/tukang) semuanya menghasilkan item sesuai kondisi masing-masing,
// murni baca D, TIDAK ada akses DOM.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/loadSource');

function load(D) {
  const ctx = loadSource(
    [
      'modules/shared/helper-teks.js',
      'modules/business/reset-gaji-mingguan.js',
      'lifeos/lifeos-registry.js',
      'lifeos/adapters/today-adapter.js',
    ],
    {
      // reset-gaji-mingguan.js referensi D/save/toast/fmtFull/uid/todayStr
      // di fungsi lain (openWeeklyResetManual dkk) tapi getWeekRange() murni
      // tidak butuh itu; stub permisif dari loadSource sudah cukup utk sisanya.
      todayStr: () => '2026-07-18',
    },
    ['LIFEOS_TODAY_SOURCES', 'TODAY_SOURCE_BUILDERS'],
  );
  return { ctx, D };
}

function baseD(overrides = {}) {
  return {
    bills: [], reminders: [], refleksi: { selfCareLog: {}, gratitude: [] },
    workDays: [], lastResetPromptDate: null,
    tukangWorkers: [], tukangAbsensi: [],
    ...overrides,
  };
}

test('todayAdapterList() registry-driven: TODAY_SOURCE_BUILDERS punya entri utk semua key di LIFEOS_TODAY_SOURCES', () => {
  const { ctx } = load(baseD());
  const keys = ctx.LIFEOS_TODAY_SOURCES.map((s) => s.key);
  keys.forEach((k) => {
    assert.equal(typeof ctx.TODAY_SOURCE_BUILDERS[k], 'function', `builder utk key "${k}" harus ada`);
  });
});

test('todayAdapterList() registry-driven: kalau 1 entri dihapus dari LIFEOS_TODAY_SOURCES, sumbernya otomatis berhenti diproses', () => {
  const D = baseD({ reminders: [{ id: 'r1', text: 'Test', done: false }] });
  const { ctx } = load(D);
  // hapus entri "reminders" dari registry SETELAH file dimuat -> harus ikut hilang dari hasil,
  // membuktikan todayAdapterList() benar2 iterasi array registry tiap dipanggil (bukan snapshot statis).
  ctx.LIFEOS_TODAY_SOURCES.splice(
    ctx.LIFEOS_TODAY_SOURCES.findIndex((s) => s.key === 'reminders'), 1,
  );
  const items = ctx.todayAdapterList(D);
  assert.equal(items.some((i) => i.sourceKind === 'reminders'), false);
});

test('bills: due dalam 3 hari masuk, due jauh tidak', () => {
  const soon = new Date(); soon.setDate(soon.getDate() + 2);
  const far = new Date(); far.setDate(far.getDate() + 30);
  const D = baseD({
    bills: [
      { id: 'b1', name: 'Listrik', dueDate: soon.toISOString().slice(0, 10) },
      { id: 'b2', name: 'Internet', dueDate: far.toISOString().slice(0, 10) },
    ],
  });
  const { ctx } = load(D);
  const items = ctx.todayAdapterList(D);
  const kinds = items.filter((i) => i.sourceKind === 'bills').map((i) => i.sourceId);
  assert.equal(kinds.length, 1);
  assert.equal(kinds[0], 'b1');
});

test('reminders: hanya yang belum done masuk', () => {
  const D = baseD({
    reminders: [
      { id: 'r1', text: 'Belum', done: false },
      { id: 'r2', text: 'Sudah', done: true },
    ],
  });
  const { ctx } = load(D);
  const items = ctx.todayAdapterList(D).filter((i) => i.sourceKind === 'reminders');
  assert.equal(items.length, 1);
  assert.equal(items[0].sourceId, 'r1');
});

test('selfcare: checklist hari ini kosong -> 1 item urgent', () => {
  const D = baseD({ refleksi: { selfCareLog: {}, gratitude: [] } });
  const { ctx } = load(D);
  const items = ctx.todayAdapterList(D).filter((i) => i.sourceKind === 'selfcare');
  assert.equal(items.length, 1);
});

test('selfcare: checklist hari ini sudah diisi -> tidak ada item', () => {
  const today = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0');
  const D = baseD({ refleksi: { selfCareLog: { [today]: ['sc1', 'sc2'] }, gratitude: [] } });
  const { ctx } = load(D);
  const items = ctx.todayAdapterList(D).filter((i) => i.sourceKind === 'selfcare');
  assert.equal(items.length, 0);
});

test('selfcare: D.refleksi belum ada (domain belum di-load) -> tidak throw, 0 item', () => {
  const D = baseD({ refleksi: undefined });
  const { ctx } = load(D);
  assert.doesNotThrow(() => ctx.todayAdapterList(D));
  const items = ctx.todayAdapterList(D).filter((i) => i.sourceKind === 'selfcare');
  assert.equal(items.length, 0);
});

test('payroll: bukan hari Sabtu -> 0 item walau ada workDays minggu ini', () => {
  const D = baseD({ workDays: [{ date: new Date().toISOString().slice(0, 10), total: 100000 }] });
  const { ctx } = load(D);
  const origGetDay = Date.prototype.getDay;
  Date.prototype.getDay = function () { return 3; }; // Rabu
  try {
    const items = ctx.todayAdapterList(D).filter((i) => i.sourceKind === 'payroll');
    assert.equal(items.length, 0);
  } finally {
    Date.prototype.getDay = origGetDay;
  }
});

test('payroll: hari Sabtu, ada workDays minggu ini, belum di-reset (lastResetPromptDate beda) -> 1 item', () => {
  const now = new Date();
  const D = baseD({
    workDays: [{ date: now.toISOString().slice(0, 10), total: 150000 }],
    lastResetPromptDate: '2000-01-01',
  });
  const { ctx } = load(D);
  const origGetDay = Date.prototype.getDay;
  Date.prototype.getDay = function () { return 6; }; // Sabtu
  try {
    const items = ctx.todayAdapterList(D).filter((i) => i.sourceKind === 'payroll');
    assert.equal(items.length, 1);
    assert.match(items[0].label, /150000|150\.000/);
  } finally {
    Date.prototype.getDay = origGetDay;
  }
});

test('payroll: hari Sabtu tapi sudah di-reset hari ini (lastResetPromptDate == todayStr()) -> 0 item', () => {
  const D = baseD({
    workDays: [{ date: new Date().toISOString().slice(0, 10), total: 100000 }],
    lastResetPromptDate: '2026-07-18', // sama dgn stub todayStr() di load()
  });
  const { ctx } = load(D);
  const origGetDay = Date.prototype.getDay;
  Date.prototype.getDay = function () { return 6; };
  try {
    const items = ctx.todayAdapterList(D).filter((i) => i.sourceKind === 'payroll');
    assert.equal(items.length, 0);
  } finally {
    Date.prototype.getDay = origGetDay;
  }
});

test('tukang: pekerja tanpa absensi hari ini -> masuk daftar, yang sudah absen tidak', () => {
  const today = new Date().toISOString().slice(0, 10);
  const D = baseD({
    tukangWorkers: [{ id: 'w1', name: 'Budi' }, { id: 'w2', name: 'Andi' }],
    tukangAbsensi: [{ id: 'a1', workerId: 'w1', date: today }],
  });
  const { ctx } = load(D);
  const items = ctx.todayAdapterList(D).filter((i) => i.sourceKind === 'tukang');
  assert.equal(items.length, 1);
  assert.equal(items[0].sourceId, 'w2');
});

test('tukang: tidak ada pekerja -> 0 item, tidak throw', () => {
  const D = baseD({ tukangWorkers: [] });
  const { ctx } = load(D);
  assert.doesNotThrow(() => ctx.todayAdapterList(D));
});
