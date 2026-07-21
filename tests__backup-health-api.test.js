'use strict';
// tests/backup-health-api.test.js — BackupHealthAPI (modules/shared/
// backup-health-api.js). Data Management Core — status kesehatan
// backup (kapan terakhir, terlambat atau tidak, ambang SAMA PERSIS
// dgn checkBackup() di backup-restore.js) + keandalan (derivatif dari
// BackupHistoryAPI).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(opts = {}) {
  const ctx = loadSource(['modules/shared/backup-health-api.js'], {
    ...opts,
  }, ['BackupHealthAPI']);
  return { BackupHealthAPI: ctx.BackupHealthAPI };
}

function isoDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

test('backup-health-api.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

// ================= daysSinceLastBackup =================

test('daysSinceLastBackup() — D belum dimuat: null', () => {
  const { BackupHealthAPI } = makeCtx({ D: undefined });
  assert.equal(BackupHealthAPI.daysSinceLastBackup(), null);
});

test('daysSinceLastBackup() — D.lastBackup kosong: null', () => {
  const { BackupHealthAPI } = makeCtx({ D: {} });
  assert.equal(BackupHealthAPI.daysSinceLastBackup(), null);
});

test('daysSinceLastBackup() — D.lastBackup 3 hari lalu: 3', () => {
  const D = { lastBackup: isoDaysAgo(3) };
  const { BackupHealthAPI } = makeCtx({ D });
  assert.equal(BackupHealthAPI.daysSinceLastBackup(), 3);
});

test('daysSinceLastBackup() — D.lastBackup baru saja (hari ini): 0', () => {
  const D = { lastBackup: new Date().toISOString() };
  const { BackupHealthAPI } = makeCtx({ D });
  assert.equal(BackupHealthAPI.daysSinceLastBackup(), 0);
});

// ================= status =================

test('status() — belum pernah backup: level "never"', () => {
  const { BackupHealthAPI } = makeCtx({ D: {} });
  const s = BackupHealthAPI.status();
  assert.equal(s.ok, true);
  assert.equal(s.level, 'never');
  assert.equal(s.days, null);
  assert.match(s.label, /Belum pernah/);
});

test('status() — 3 hari lalu (di bawah ambang 7 hari): level "ok"', () => {
  const D = { lastBackup: isoDaysAgo(3) };
  const { BackupHealthAPI } = makeCtx({ D });
  const s = BackupHealthAPI.status();
  assert.equal(s.level, 'ok');
  assert.equal(s.days, 3);
  assert.match(s.label, /aman/);
});

test('status() — persis 7 hari lalu (batas ambang, SAMA persis dgn checkBackup(): days>=7): level "overdue"', () => {
  const D = { lastBackup: isoDaysAgo(7) };
  const { BackupHealthAPI } = makeCtx({ D });
  const s = BackupHealthAPI.status();
  assert.equal(s.level, 'overdue');
  assert.equal(s.days, 7);
  assert.match(s.label, /terlambat/);
});

test('status() — 6 hari lalu (tepat di bawah ambang): masih "ok"', () => {
  const D = { lastBackup: isoDaysAgo(6) };
  const { BackupHealthAPI } = makeCtx({ D });
  const s = BackupHealthAPI.status();
  assert.equal(s.level, 'ok');
});

test('status() — 30 hari lalu: level "overdue"', () => {
  const D = { lastBackup: isoDaysAgo(30) };
  const { BackupHealthAPI } = makeCtx({ D });
  const s = BackupHealthAPI.status();
  assert.equal(s.level, 'overdue');
  assert.equal(s.days, 30);
});

// ================= reliability =================

test('reliability() — BackupHistoryAPI belum dimuat: ok:false', () => {
  const { BackupHealthAPI } = makeCtx({ D: {}, BackupHistoryAPI: undefined });
  const r = BackupHealthAPI.reliability();
  assert.equal(r.ok, false);
  assert.match(r.reason, /belum dimuat/);
});

test('reliability() — histori kosong: total 0, successRate null (bukan 0)', () => {
  const BackupHistoryAPI = { summary: () => ({ total: 0, success: 0, partial: 0, failed: 0, latest: null }) };
  const { BackupHealthAPI } = makeCtx({ D: {}, BackupHistoryAPI });
  const r = BackupHealthAPI.reliability();
  assert.equal(r.ok, true);
  assert.equal(r.total, 0);
  assert.equal(r.successRate, null);
});

test('reliability() — histori campuran: successRate dihitung dari BackupHistoryAPI.summary() apa adanya', () => {
  const BackupHistoryAPI = { summary: () => ({ total: 4, success: 3, partial: 1, failed: 0, latest: {} }) };
  const { BackupHealthAPI } = makeCtx({ D: {}, BackupHistoryAPI });
  const r = BackupHealthAPI.reliability();
  assert.equal(r.ok, true);
  assert.equal(r.total, 4);
  assert.equal(r.success, 3);
  assert.equal(r.successRate, 75); // 3/4 = 75%
});

test('reliability() — semua gagal: successRate 0 (BUKAN null, karena total>0)', () => {
  const BackupHistoryAPI = { summary: () => ({ total: 2, success: 0, partial: 0, failed: 2, latest: {} }) };
  const { BackupHealthAPI } = makeCtx({ D: {}, BackupHistoryAPI });
  const r = BackupHealthAPI.reliability();
  assert.equal(r.successRate, 0);
});

// ================= summary =================

test('summary() — gabungan status() + reliability(), 1 titik akses', () => {
  const D = { lastBackup: isoDaysAgo(1) };
  const BackupHistoryAPI = { summary: () => ({ total: 1, success: 1, partial: 0, failed: 0, latest: {} }) };
  const { BackupHealthAPI } = makeCtx({ D, BackupHistoryAPI });
  const s = BackupHealthAPI.summary();
  assert.equal(s.status.level, 'ok');
  assert.equal(s.reliability.successRate, 100);
});
