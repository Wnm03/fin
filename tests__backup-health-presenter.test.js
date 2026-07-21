'use strict';
// tests/backup-health-presenter.test.js — BackupHealthPresenter
// (modules/shared/backup-health-presenter.js). Data Management Core —
// UI hanya presenter, 100% reuse BackupHealthAPI.summary(). Pola sama
// persis tests/debt-optimizer-presenter.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeDoc(initial = {}) {
  return createFakeDocument({ backupHealthCard: {}, ...initial });
}

function makeCtx(opts = {}) {
  const { document: docOverride, ...rest } = opts;
  const fakeDocument = docOverride || makeDoc();
  const ctx = loadSource(['modules/shared/backup-health-presenter.js'], {
    escapeHtml: (s) => String(s ?? ''),
    ...rest,
    document: fakeDocument,
  }, ['BackupHealthPresenter']);
  return { BackupHealthPresenter: ctx.BackupHealthPresenter, fakeDocument };
}

function fullSummary(overrides = {}) {
  return Object.assign({
    status: { ok: true, level: 'ok', days: 2, label: 'Backup aman (2 hari lalu)' },
    reliability: { ok: true, total: 4, success: 3, partial: 1, failed: 0, successRate: 75 },
  }, overrides);
}

test('backup-health-presenter.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('render() — container #backupHealthCard tidak ada di DOM: tidak throw', () => {
  const emptyDoc = { getElementById: () => null };
  const { BackupHealthPresenter } = makeCtx({ document: emptyDoc, BackupHealthAPI: { summary: () => fullSummary() } });
  assert.doesNotThrow(() => BackupHealthPresenter.render());
});

test('render() — BackupHealthAPI belum dimuat: pesan fallback, tidak throw', () => {
  const { BackupHealthPresenter, fakeDocument } = makeCtx({ BackupHealthAPI: undefined });
  assert.doesNotThrow(() => BackupHealthPresenter.render());
  assert.match(fakeDocument.getElementById('backupHealthCard').innerHTML, /belum tersedia/);
});

test('render() — level "ok": label & reliability tampil, class bh-health-ok', () => {
  const summary = fullSummary();
  const BackupHealthAPI = { summary: () => summary };
  const { BackupHealthPresenter, fakeDocument } = makeCtx({ BackupHealthAPI });
  BackupHealthPresenter.render();
  const html = fakeDocument.getElementById('backupHealthCard').innerHTML;
  assert.match(html, /bh-health-ok/);
  assert.match(html, /Backup aman \(2 hari lalu\)/);
  assert.match(html, /75% sukses \(4 backup tercatat\)/);
});

test('render() — level "overdue": class bh-health-overdue', () => {
  const summary = fullSummary({ status: { ok: true, level: 'overdue', days: 10, label: 'Backup terlambat (10 hari lalu)' } });
  const BackupHealthAPI = { summary: () => summary };
  const { BackupHealthPresenter, fakeDocument } = makeCtx({ BackupHealthAPI });
  BackupHealthPresenter.render();
  const html = fakeDocument.getElementById('backupHealthCard').innerHTML;
  assert.match(html, /bh-health-overdue/);
  assert.match(html, /Backup terlambat \(10 hari lalu\)/);
});

test('render() — level "never": class bh-health-never', () => {
  const summary = fullSummary({ status: { ok: true, level: 'never', days: null, label: 'Belum pernah backup' } });
  const BackupHealthAPI = { summary: () => summary };
  const { BackupHealthPresenter, fakeDocument } = makeCtx({ BackupHealthAPI });
  BackupHealthPresenter.render();
  const html = fakeDocument.getElementById('backupHealthCard').innerHTML;
  assert.match(html, /bh-health-never/);
});

test('render() — reliability successRate null (belum ada histori): pesan "Belum ada histori backup"', () => {
  const summary = fullSummary({ reliability: { ok: true, total: 0, success: 0, partial: 0, failed: 0, successRate: null } });
  const BackupHealthAPI = { summary: () => summary };
  const { BackupHealthPresenter, fakeDocument } = makeCtx({ BackupHealthAPI });
  BackupHealthPresenter.render();
  const html = fakeDocument.getElementById('backupHealthCard').innerHTML;
  assert.match(html, /Belum ada histori backup/);
});
