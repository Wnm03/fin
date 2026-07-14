'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// diagnostik-versi.js punya IIFE top-level (_checkModuleVersionSync) yang
// JALAN OTOMATIS begitu file di-load (bukan cuma deklarasi function) & butuh
// APP_BUILD_VERSION/MODULE_CALC_VERSION/dst SUDAH ada di sandbox SEBELUM
// load. Jadi tiap skenario beda kombinasi versi butuh loadSource() baru
// (tidak bisa reuse 1 ctx spt file lain) -- pola berbeda dari test file
// lain di repo ini krn side-effect-nya di load time, bukan di call time.
// FILE_SIZE_WARN_BYTES/FILE_SIZE_ACTION_BYTES dideklarasikan `const` jadi
// perlu expose:[...] eksplisit (lihat catatan di helpers/loadSource.js).

function makeCtx(overrides = {}) {
  const warnCalls = [];
  const errorCalls = [];
  const toastCalls = [];
  const consoleStub = {
    warn: (...args) => warnCalls.push(args),
    error: (...args) => errorCalls.push(args),
    log: () => {},
  };
  const extraGlobals = {
    console: consoleStub,
    APP_BUILD_VERSION: '100',
    PRODUCTION_BUILD_SYNCED_VERSION: '100',
    MODULE_CALC_VERSION: '100',
    MODULE_FEATURES_VERSION: '100',
    MODAL_VERSION: '100',
    MODULE_RENDER_VERSION: '100',
    toast: (msg, dur) => toastCalls.push({ msg, dur }),
    document: { documentElement: { outerHTML: '<html></html>' } },
    ...overrides,
  };
  const ctx = loadSource(
    ['diagnostik-versi.js'],
    extraGlobals,
    ['FILE_SIZE_WARN_BYTES', 'FILE_SIZE_ACTION_BYTES'],
  );
  return { ctx, warnCalls, errorCalls, toastCalls };
}

// ---------- getHtmlSnapshotForSelfTest ----------

test('getHtmlSnapshotForSelfTest — balikin persis document.documentElement.outerHTML', () => {
  const { ctx } = makeCtx({ document: { documentElement: { outerHTML: '<html><body>tes</body></html>' } } });
  assert.equal(ctx.getHtmlSnapshotForSelfTest(), '<html><body>tes</body></html>');
});

// ---------- computeProductionSyncStatus ----------

test('computeProductionSyncStatus — versi produksi sinkron dgn master: inSync true, label ✅', () => {
  const { ctx } = makeCtx({ APP_BUILD_VERSION: '120', PRODUCTION_BUILD_SYNCED_VERSION: '120' });
  const s = ctx.computeProductionSyncStatus();
  assert.equal(s.inSync, true);
  assert.equal(s.masterVersion, '120');
  assert.equal(s.syncedVersion, '120');
  assert.equal(s.label, '✅ Sinkron (v120)');
});

test('computeProductionSyncStatus — versi produksi KETINGGALAN dari master: inSync false, label ⚠️ sebut kedua versi', () => {
  const { ctx } = makeCtx({ APP_BUILD_VERSION: '130', PRODUCTION_BUILD_SYNCED_VERSION: '120' });
  const s = ctx.computeProductionSyncStatus();
  assert.equal(s.inSync, false);
  assert.equal(
    s.label,
    '⚠️ Ketinggalan -- terakhir sinkron di 120, master sudah 130. Kalau distribusi ke user pakai file produksi, regenerate dulu.',
  );
});

// ---------- computeModuleSyncStatus ----------

test('computeModuleSyncStatus — semua modul sinkron dgn APP_BUILD_VERSION: allOk true, semua *Ok true', () => {
  const { ctx } = makeCtx({
    APP_BUILD_VERSION: '50',
    MODULE_CALC_VERSION: '50',
    MODULE_FEATURES_VERSION: '50',
    MODAL_VERSION: '50',
    MODULE_RENDER_VERSION: '50',
  });
  const s = ctx.computeModuleSyncStatus();
  assert.equal(s.allOk, true);
  assert.equal(s.calcOk, true);
  assert.equal(s.featOk, true);
  assert.equal(s.modalOk, true);
  assert.equal(s.renderOk, true);
});

test('computeModuleSyncStatus — 1 modul ketinggalan versi (modules-calc.js): allOk false, cuma calcOk false', () => {
  const { ctx } = makeCtx({
    APP_BUILD_VERSION: '50',
    MODULE_CALC_VERSION: '49',
    MODULE_FEATURES_VERSION: '50',
    MODAL_VERSION: '50',
    MODULE_RENDER_VERSION: '50',
  });
  const s = ctx.computeModuleSyncStatus();
  assert.equal(s.allOk, false);
  assert.equal(s.calcOk, false);
  assert.equal(s.featOk, true);
  assert.equal(s.modalOk, true);
  assert.equal(s.renderOk, true);
});

test('computeModuleSyncStatus — variabel versi modul belum kebaca (typeof undefined): versionnya null, *Ok false', () => {
  // Simulasi modules-calc.js belum ter-load sama sekali di halaman (MODULE_CALC_VERSION
  // literally tidak ada), bukan cuma beda nilai -- harus difilter lewat `typeof x!=='undefined'`.
  const extraGlobals = {
    APP_BUILD_VERSION: '50',
    MODULE_FEATURES_VERSION: '50',
    MODAL_VERSION: '50',
    MODULE_RENDER_VERSION: '50',
    toast: () => {},
    document: { documentElement: { outerHTML: '' } },
  }; // MODULE_CALC_VERSION SENGAJA tidak dimasukkan
  const ctx = loadSource(['diagnostik-versi.js'], extraGlobals, ['FILE_SIZE_WARN_BYTES', 'FILE_SIZE_ACTION_BYTES']);
  const s = ctx.computeModuleSyncStatus();
  assert.equal(s.calcVersion, null);
  assert.equal(s.calcOk, false);
  assert.equal(s.allOk, false);
});

// ---------- IIFE _checkModuleVersionSync (jalan otomatis saat load) ----------

test('_checkModuleVersionSync (auto-run) — semua sinkron: TIDAK ada console.warn maupun toast', () => {
  const { warnCalls, toastCalls, errorCalls } = makeCtx(); // semua default v100, sinkron
  assert.equal(warnCalls.length, 0);
  assert.equal(toastCalls.length, 0);
  assert.equal(errorCalls.length, 0);
});

test('_checkModuleVersionSync (auto-run) — ada modul tidak sinkron: console.warn & toast (durasi 6000) berisi nama file yg bermasalah', () => {
  const { warnCalls, toastCalls } = makeCtx({ MODAL_VERSION: '99' }); // sisanya v100
  assert.equal(warnCalls.length, 1);
  assert.equal(warnCalls[0][1].includes('modals.js (v99)'), true);
  assert.equal(toastCalls.length, 1);
  assert.equal(toastCalls[0].dur, 6000);
  assert.equal(toastCalls[0].msg.includes('modals.js (v99)'), true);
});

test('_checkModuleVersionSync (auto-run) — beberapa modul tidak sinkron sekaligus: detail gabung semua nama file yg bermasalah', () => {
  const { warnCalls } = makeCtx({ MODULE_CALC_VERSION: '98', MODULE_RENDER_VERSION: '97' });
  assert.equal(warnCalls[0][1].includes('modules-calc.js (v98)'), true);
  assert.equal(warnCalls[0][1].includes('modules-render.js (v97)'), true);
  assert.equal(warnCalls[0][1].includes('modals.js'), false);
});

test('_checkModuleVersionSync (auto-run) — versi tidak sinkron TAPI toast belum jadi function: tetap console.warn, tidak crash, tidak ada toast', () => {
  const extraGlobals = {
    APP_BUILD_VERSION: '100',
    PRODUCTION_BUILD_SYNCED_VERSION: '100',
    MODULE_CALC_VERSION: '100',
    MODULE_FEATURES_VERSION: '100',
    MODAL_VERSION: '99',
    MODULE_RENDER_VERSION: '100',
    document: { documentElement: { outerHTML: '' } },
  }; // toast SENGAJA tidak disediakan
  const warnCalls = [];
  const errorCalls = [];
  extraGlobals.console = { warn: (...a) => warnCalls.push(a), error: (...a) => errorCalls.push(a), log: () => {} };
  assert.doesNotThrow(() => {
    loadSource(['diagnostik-versi.js'], extraGlobals, ['FILE_SIZE_WARN_BYTES', 'FILE_SIZE_ACTION_BYTES']);
  });
  assert.equal(warnCalls.length, 1);
  assert.equal(errorCalls.length, 0);
});

test('_checkModuleVersionSync (auto-run) — error tak terduga di dalam cek (mis. console.warn rusak): ditangkap via console.error, tidak crash saat load', () => {
  const errorCalls = [];
  const extraGlobals = {
    APP_BUILD_VERSION: '100',
    PRODUCTION_BUILD_SYNCED_VERSION: '100',
    MODULE_CALC_VERSION: '100',
    MODULE_FEATURES_VERSION: '100',
    MODAL_VERSION: '99', // bikin masuk cabang !allOk supaya console.warn kepanggil
    MODULE_RENDER_VERSION: '100',
    toast: () => {},
    document: { documentElement: { outerHTML: '' } },
    console: {
      warn: () => { throw new Error('console.warn rusak'); },
      error: (...a) => errorCalls.push(a),
      log: () => {},
    },
  };
  assert.doesNotThrow(() => {
    loadSource(['diagnostik-versi.js'], extraGlobals, ['FILE_SIZE_WARN_BYTES', 'FILE_SIZE_ACTION_BYTES']);
  });
  assert.equal(errorCalls.length, 1);
  assert.equal(errorCalls[0][0], 'Gagal cek sinkronisasi versi modul:');
});

// ---------- computeFileSizeStatus ----------

function ctxWithHtmlLength(len, overrides = {}) {
  const { ctx } = makeCtx({
    document: { documentElement: { outerHTML: 'x'.repeat(len) } },
    ...overrides,
  });
  return ctx;
}

test('computeFileSizeStatus — jauh di bawah ambang WARN: level "aman"', () => {
  const ctx = ctxWithHtmlLength(1000);
  const s = ctx.computeFileSizeStatus();
  assert.equal(s.level, 'aman');
  assert.equal(s.label, '✅ Aman');
  assert.equal(s.size, 1000);
});

test('computeFileSizeStatus — tepat di ambang WARN (2.0MB): level "warn"', () => {
  const ctx = ctxWithHtmlLength(2.0 * 1024 * 1024);
  const s = ctx.computeFileSizeStatus();
  assert.equal(s.level, 'warn');
  assert.equal(s.label, '⚠️ Mendekati ambang — mulai rencanakan pemisahan');
});

test('computeFileSizeStatus — 1 byte di bawah ambang WARN: masih "aman"', () => {
  const ctx = ctxWithHtmlLength(2.0 * 1024 * 1024 - 1);
  const s = ctx.computeFileSizeStatus();
  assert.equal(s.level, 'aman');
});

test('computeFileSizeStatus — tepat di ambang ACTION (2.5MB): level "action"', () => {
  const ctx = ctxWithHtmlLength(2.5 * 1024 * 1024);
  const s = ctx.computeFileSizeStatus();
  assert.equal(s.level, 'action');
  assert.equal(s.label, '🔴 Sudah lewat ambang — mulai pecah file');
});

test('computeFileSizeStatus — 1 byte di bawah ambang ACTION: masih "warn", bukan "action"', () => {
  const ctx = ctxWithHtmlLength(2.5 * 1024 * 1024 - 1);
  const s = ctx.computeFileSizeStatus();
  assert.equal(s.level, 'warn');
});

test('computeFileSizeStatus — expose warnAt/actionAt sesuai konstanta FILE_SIZE_WARN_BYTES/FILE_SIZE_ACTION_BYTES', () => {
  const { ctx } = makeCtx();
  const s = ctx.computeFileSizeStatus();
  assert.equal(s.warnAt, ctx.FILE_SIZE_WARN_BYTES);
  assert.equal(s.actionAt, ctx.FILE_SIZE_ACTION_BYTES);
  assert.equal(ctx.FILE_SIZE_WARN_BYTES, 2.0 * 1024 * 1024);
  assert.equal(ctx.FILE_SIZE_ACTION_BYTES, 2.5 * 1024 * 1024);
});
