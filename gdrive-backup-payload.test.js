'use strict';
/**
 * gdrive-backup-payload.test.js — test untuk _uploadBackupToDriveInner()
 * di gdrive-backup.js.
 *
 * Bug nyata: buildBackupPayload() itu async function, tapi dulu dipanggil
 * TANPA await ("const backupD=buildBackupPayload();"). backupD jadi Promise,
 * dan JSON.stringify(Promise) menghasilkan string "{}" kosong -- padahal
 * fetch() ke Google Drive tetap sukses (res.ok true), jadi tidak ada error
 * yang kelihatan. Akibatnya SETIAP backup ke Drive (manual maupun auto-sync)
 * diam-diam mengupload file kosong, menimpa backup lama yang valid.
 *
 * Test ini menjalankan _uploadBackupToDriveInner() sungguhan (bukan
 * re-implement logicnya) dengan fetch() di-stub buat menangkap body yang
 * BENERAN dikirim ke Drive API, lalu pastikan itu payload asli (bukan "{}").
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx() {
  let capturedBody = null;
  const D = {
    googleDrive: { fileId: 'existing-file-id', lastSync: null, clientId: '', autoSync: false },
    googleSheets: { spreadsheetId: '', lastSync: null },
    transactions: [{ id: 't1', amount: 1000 }],
    accounts: [{ id: 'a1' }],
    products: [], assets: [], bbmLogs: [], servisLogs: [],
  };
  const ctx = loadSource(['gdrive-backup.js'], {
    D,
    gdriveAccessToken: 'fake-token',
    Blob,
    // buildBackupPayload() ASLI ada di backup-restore.js (tidak dimuat di sini
    // supaya test ini fokus ke bug await-nya, bukan isi payloadnya) -- stub
    // async murni, TETAP async supaya kasus "lupa await" bisa ketangkep.
    async buildBackupPayload() {
      return { transactions: D.transactions, accounts: D.accounts, schemaVersion: 3 };
    },
    fetch: async (url, opts) => {
      if (String(url).includes('/upload/drive/')) {
        capturedBody = opts.body;
        return { ok: true, json: async () => ({ id: 'existing-file-id' }) };
      }
      return { ok: true, json: async () => ({ files: [] }) };
    },
    save() {},
    renderGDriveSettings() {},
    toast() {},
    gdriveThrowForFailedRes() { throw new Error('unexpected failed res'); },
  }, ['_uploadBackupToDriveInner']);
  return { ctx, D, getCapturedBody: () => capturedBody };
}

test('_uploadBackupToDriveInner — body yang dikirim ke Drive API adalah payload ASLI (ada transactions), BUKAN "{}" kosong', async () => {
  const { ctx, getCapturedBody } = makeCtx();
  const ok = await ctx._uploadBackupToDriveInner(true);
  assert.equal(ok, true, 'upload harus sukses (silent mode)');
  const body = getCapturedBody();
  assert.ok(body, 'harus ada body yang dikirim ke fetch()');
  assert.notEqual(body, '{}', 'REGRESI: body TIDAK BOLEH "{}" kosong (bug lupa await buildBackupPayload())');
  const parsed = JSON.parse(body);
  assert.ok(Array.isArray(parsed.transactions), 'body harus punya transactions berupa array');
  assert.equal(parsed.transactions.length, 1, 'transactions di body harus sesuai data asli, bukan kosong');
});
