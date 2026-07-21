'use strict';
// tests/backup-history-api.test.js — BackupHistoryAPI (modules/shared/
// backup-history-api.js). Data Management Core — pencatatan histori
// backup (D.backupHistory, array baru) + API baca murni di atasnya.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts = {}) {
  const ctx = loadSource(['modules/shared/backup-history-api.js'], {
    ...opts,
  }, ['BackupHistoryAPI']);
  return { BackupHistoryAPI: ctx.BackupHistoryAPI, D: ctx.D };
}

test('backup-history-api.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

// ================= _ensure / list (guard D belum ada) =================

test('list() — D belum dimuat: array kosong, tidak error', () => {
  const { BackupHistoryAPI } = makeCtx({ D: undefined });
  assert.doesNotThrow(() => BackupHistoryAPI.list());
  assert.equal(BackupHistoryAPI.list().length, 0);
});

test('list() — D ada tapi backupHistory belum pernah ada (data lama): auto-init array kosong', () => {
  const D = {};
  const { BackupHistoryAPI } = makeCtx({ D });
  const list = BackupHistoryAPI.list();
  assert.equal(Array.isArray(list), true);
  assert.equal(list.length, 0);
  assert.equal(Array.isArray(D.backupHistory), true);
});

// ================= recordEntry =================

test('recordEntry() — D belum dimuat: return null, tidak error', () => {
  const { BackupHistoryAPI } = makeCtx({ D: undefined });
  let r;
  assert.doesNotThrow(() => { r = BackupHistoryAPI.recordEntry({ type: 'local', status: 'success' }); });
  assert.equal(r, null);
});

test('recordEntry() — entri baru masuk field lengkap (id/timestamp/type/status/done/skipped/errors)', () => {
  const D = {};
  const { BackupHistoryAPI } = makeCtx({ D });
  const rec = BackupHistoryAPI.recordEntry({
    type: 'full', status: 'success', done: ['File lokal (JSON)'], skipped: ['Google Drive'], errors: [],
  });
  assert.equal(typeof rec.id, 'string');
  assert.ok(rec.id.length > 0);
  assert.equal(typeof rec.timestamp, 'string');
  assert.doesNotThrow(() => new Date(rec.timestamp).toISOString());
  assert.equal(rec.type, 'full');
  assert.equal(rec.status, 'success');
  assert.equal(JSON.stringify(rec.done), JSON.stringify(['File lokal (JSON)']));
  assert.equal(JSON.stringify(rec.skipped), JSON.stringify(['Google Drive']));
  assert.equal(JSON.stringify(rec.errors), JSON.stringify([]));
});

test('recordEntry() — field opsional hilang: fallback aman (type/status unknown, array kosong)', () => {
  const D = {};
  const { BackupHistoryAPI } = makeCtx({ D });
  const rec = BackupHistoryAPI.recordEntry({});
  assert.equal(rec.type, 'unknown');
  assert.equal(rec.status, 'unknown');
  assert.equal(rec.done.length, 0);
  assert.equal(rec.skipped.length, 0);
  assert.equal(rec.errors.length, 0);
});

test('recordEntry() dipanggil tanpa argumen sama sekali: tidak crash', () => {
  const D = {};
  const { BackupHistoryAPI } = makeCtx({ D });
  assert.doesNotThrow(() => BackupHistoryAPI.recordEntry());
});

test('recordEntry() — entri terbaru ditaruh di depan (index 0, urutan terbaru-dulu)', () => {
  const D = {};
  const { BackupHistoryAPI } = makeCtx({ D });
  BackupHistoryAPI.recordEntry({ type: 'local', status: 'success' });
  BackupHistoryAPI.recordEntry({ type: 'full', status: 'partial' });
  const list = BackupHistoryAPI.list();
  assert.equal(list.length, 2);
  assert.equal(list[0].type, 'full'); // yang terakhir direkam ada di depan
  assert.equal(list[1].type, 'local');
});

test('recordEntry() — dipotong ke BACKUP_HISTORY_MAX_ENTRIES (50) entri terakhir', () => {
  const D = {};
  const { BackupHistoryAPI } = makeCtx({ D });
  for (let i = 0; i < 60; i++) {
    BackupHistoryAPI.recordEntry({ type: 'local', status: 'success', done: ['entry-' + i] });
  }
  const list = BackupHistoryAPI.list();
  assert.equal(list.length, 50);
  // entri paling depan adalah yang terakhir direkam (entry-59)
  assert.equal(list[0].done[0], 'entry-59');
  // entri paling belakang adalah entry-10 (0..9 sudah terpotong keluar)
  assert.equal(list[49].done[0], 'entry-10');
});

// ================= latest =================

test('latest() — histori kosong: null', () => {
  const D = {};
  const { BackupHistoryAPI } = makeCtx({ D });
  assert.equal(BackupHistoryAPI.latest(), null);
});

test('latest() — histori ada: entri paling baru (index 0)', () => {
  const D = {};
  const { BackupHistoryAPI } = makeCtx({ D });
  BackupHistoryAPI.recordEntry({ type: 'local', status: 'success' });
  BackupHistoryAPI.recordEntry({ type: 'full', status: 'failed' });
  const latest = BackupHistoryAPI.latest();
  assert.equal(latest.type, 'full');
  assert.equal(latest.status, 'failed');
});

// ================= clear =================

test('clear() — mengosongkan D.backupHistory', () => {
  const D = {};
  const { BackupHistoryAPI } = makeCtx({ D });
  BackupHistoryAPI.recordEntry({ type: 'local', status: 'success' });
  assert.equal(BackupHistoryAPI.list().length, 1);
  BackupHistoryAPI.clear();
  assert.equal(BackupHistoryAPI.list().length, 0);
});

test('clear() — D belum dimuat: tidak error', () => {
  const { BackupHistoryAPI } = makeCtx({ D: undefined });
  assert.doesNotThrow(() => BackupHistoryAPI.clear());
});

// ================= summary =================

test('summary() — histori kosong: total 0, latest null', () => {
  const D = {};
  const { BackupHistoryAPI } = makeCtx({ D });
  const s = BackupHistoryAPI.summary();
  assert.equal(s.total, 0);
  assert.equal(s.success, 0);
  assert.equal(s.partial, 0);
  assert.equal(s.failed, 0);
  assert.equal(s.latest, null);
});

test('summary() — hitung success/partial/failed dari histori campuran', () => {
  const D = {};
  const { BackupHistoryAPI } = makeCtx({ D });
  BackupHistoryAPI.recordEntry({ type: 'local', status: 'success' });
  BackupHistoryAPI.recordEntry({ type: 'full', status: 'success' });
  BackupHistoryAPI.recordEntry({ type: 'full', status: 'partial' });
  BackupHistoryAPI.recordEntry({ type: 'custom', status: 'failed' });
  const s = BackupHistoryAPI.summary();
  assert.equal(s.total, 4);
  assert.equal(s.success, 2);
  assert.equal(s.partial, 1);
  assert.equal(s.failed, 1);
  assert.equal(s.latest.status, 'failed');
});

test('summary() — status tidak dikenal (unknown) tidak masuk kategori manapun', () => {
  const D = {};
  const { BackupHistoryAPI } = makeCtx({ D });
  BackupHistoryAPI.recordEntry({ type: 'local' }); // status fallback 'unknown'
  const s = BackupHistoryAPI.summary();
  assert.equal(s.total, 1);
  assert.equal(s.success, 0);
  assert.equal(s.partial, 0);
  assert.equal(s.failed, 0);
});
