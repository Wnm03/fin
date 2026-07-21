'use strict';
// tests/backup-history-presenter.test.js — BackupHistoryPresenter
// (modules/shared/backup-history-presenter.js). Data Management Core —
// UI hanya presenter, 100% reuse BackupHistoryAPI.list(). Pola sama
// persis tests/debt-optimizer-presenter.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

function makeDoc(initial = {}) {
  return createFakeDocument({ backupHistoryList: {}, ...initial });
}

function makeCtx(opts = {}) {
  const { document: docOverride, ...rest } = opts;
  const fakeDocument = docOverride || makeDoc();
  const ctx = loadSource(['modules/shared/backup-history-presenter.js'], {
    escapeHtml: (s) => String(s ?? ''),
    ...rest,
    document: fakeDocument,
  }, ['BackupHistoryPresenter']);
  return { BackupHistoryPresenter: ctx.BackupHistoryPresenter, fakeDocument };
}

function makeEntry(overrides = {}) {
  return Object.assign({
    id: 'bh_1', timestamp: '2026-07-18T10:00:00.000Z', type: 'full',
    status: 'success', done: ['File lokal (JSON)'], skipped: [], errors: [],
  }, overrides);
}

test('backup-history-presenter.js berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => makeCtx());
});

test('render() — container #backupHistoryList tidak ada di DOM: tidak throw', () => {
  const emptyDoc = { getElementById: () => null };
  const { BackupHistoryPresenter } = makeCtx({ document: emptyDoc, BackupHistoryAPI: { list: () => [makeEntry()] } });
  assert.doesNotThrow(() => BackupHistoryPresenter.render());
});

test('render() — BackupHistoryAPI belum dimuat: pesan fallback, tidak throw', () => {
  const { BackupHistoryPresenter, fakeDocument } = makeCtx({ BackupHistoryAPI: undefined });
  assert.doesNotThrow(() => BackupHistoryPresenter.render());
  assert.match(fakeDocument.getElementById('backupHistoryList').innerHTML, /belum tersedia/);
});

test('render() — histori kosong: pesan "Belum ada histori backup"', () => {
  const BackupHistoryAPI = { list: () => [] };
  const { BackupHistoryPresenter, fakeDocument } = makeCtx({ BackupHistoryAPI });
  BackupHistoryPresenter.render();
  assert.match(fakeDocument.getElementById('backupHistoryList').innerHTML, /Belum ada histori backup/);
});

test('render() — 1 entri sukses: ikon ✅ & isi "done" tampil', () => {
  const BackupHistoryAPI = { list: () => [makeEntry()] };
  const { BackupHistoryPresenter, fakeDocument } = makeCtx({ BackupHistoryAPI });
  BackupHistoryPresenter.render();
  const html = fakeDocument.getElementById('backupHistoryList').innerHTML;
  assert.match(html, /✅/);
  assert.match(html, /File lokal \(JSON\)/);
});

test('render() — entri partial: ikon ⚠️', () => {
  const BackupHistoryAPI = { list: () => [makeEntry({ status: 'partial' })] };
  const { BackupHistoryPresenter, fakeDocument } = makeCtx({ BackupHistoryAPI });
  BackupHistoryPresenter.render();
  assert.match(fakeDocument.getElementById('backupHistoryList').innerHTML, /⚠️/);
});

test('render() — entri failed: ikon ❌', () => {
  const BackupHistoryAPI = { list: () => [makeEntry({ status: 'failed', done: [] })] };
  const { BackupHistoryPresenter, fakeDocument } = makeCtx({ BackupHistoryAPI });
  BackupHistoryPresenter.render();
  const html = fakeDocument.getElementById('backupHistoryList').innerHTML;
  assert.match(html, /❌/);
  // done kosong -> fallback ke type
  assert.match(html, />full</);
});

test('render() — dibatasi ke 10 entri terbaru walau histori lebih panjang', () => {
  const entries = [];
  for (let i = 0; i < 15; i++) entries.push(makeEntry({ id: 'bh_' + i, done: ['entry-' + i] }));
  const BackupHistoryAPI = { list: () => entries };
  const { BackupHistoryPresenter, fakeDocument } = makeCtx({ BackupHistoryAPI });
  BackupHistoryPresenter.render();
  const html = fakeDocument.getElementById('backupHistoryList').innerHTML;
  assert.match(html, /entry-0/);
  assert.match(html, /entry-9/);
  assert.doesNotMatch(html, /entry-10/);
});
