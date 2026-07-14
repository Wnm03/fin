'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// recordBbmLog (dulu di transaksi.js, sekarang dipindah ke tx-bbm.js -- lihat
// CLAUDE.md catatan kerja "split transaksi.js" bagian ke-6) adalah fungsi
// murni (tidak baca/tulis DOM), jadi bisa dites langsung lewat loadSource
// tanpa perlu fakeDocument. Ini test dasar pertama untuk fitur Catatan BBM —
// sebelumnya belum ada sama sekali test untuk logika ini (lihat review),
// padahal dipakai baik dari modal "Catat Isi BBM" (Car Notes) maupun dari
// form Transaksi umum (checkbox "sinkron BBM").
function makeD(overrides = {}) {
  return { bbmLogs: [], ...overrides };
}

// uid() aslinya didefinisikan di features-helpers-global-security.js (file
// lain) — di sini di-stub sederhana & unik per panggilan supaya recordBbmLog
// bisa dites terisolasi tanpa perlu load seluruh chain modul lain.
function loadRecordBbmLog(D) {
  let n = 0;
  const ctx = loadSource(['tx-bbm.js'], { D, uid: () => 'uid-stub-' + (++n) });
  return ctx.recordBbmLog;
}

test('recordBbmLog — catatan baru: dorong ke D.bbmLogs, isNew true, txLinkId terhubung ke txId', () => {
  const D = makeD();
  const recordBbmLog = loadRecordBbmLog(D);
  const result = recordBbmLog({
    vehicleId: 'veh1', date: '2026-07-01', km: 10000, liter: 5, harga: 10000,
    cost: 50000, spbu: 'Pertamina', fullTank: true, note: '', accountId: 'acc1',
    txId: 'tx1', existingBbmId: null,
  });
  assert.equal(result.isNew, true);
  assert.equal(D.bbmLogs.length, 1);
  const b = D.bbmLogs[0];
  assert.equal(b.id, result.bbmId);
  assert.equal(b.vehicleId, 'veh1');
  assert.equal(b.km, 10000);
  assert.equal(b.liter, 5);
  assert.equal(b.cost, 50000);
  assert.equal(b.harga, 10000);
  assert.equal(b.txLinkId, 'tx1');
});

test('recordBbmLog — D.bbmLogs otomatis dibuat kalau belum ada (data lama/kosong)', () => {
  const D = {}; // sengaja tanpa bbmLogs sama sekali
  const recordBbmLog = loadRecordBbmLog(D);
  recordBbmLog({
    vehicleId: 'veh1', date: '2026-07-01', km: 1000, liter: 2, harga: 10000,
    cost: 20000, spbu: '', fullTank: false, note: '', accountId: 'acc1',
    txId: 'tx1', existingBbmId: null,
  });
  assert.ok(Array.isArray(D.bbmLogs));
  assert.equal(D.bbmLogs.length, 1);
});

test('recordBbmLog — harga tidak diisi (0/NaN) => dihitung otomatis dari cost/liter, dibulatkan', () => {
  const D = makeD();
  const recordBbmLog = loadRecordBbmLog(D);
  const result = recordBbmLog({
    vehicleId: 'veh1', date: '2026-07-01', km: 1000, liter: 4, harga: undefined,
    cost: 41000, spbu: '', fullTank: true, note: '', accountId: 'acc1',
    txId: 'tx1', existingBbmId: null,
  });
  // 41000/4 = 10250 pas, tidak perlu pembulatan pecahan tapi tetap lewat Math.round
  assert.equal(result.harga, 10250);
  assert.equal(D.bbmLogs[0].harga, 10250);
});

test('recordBbmLog — harga eksplisit diisi => dipakai apa adanya, TIDAK dihitung ulang dari cost/liter', () => {
  const D = makeD();
  const recordBbmLog = loadRecordBbmLog(D);
  // cost/liter kalau dihitung ulang akan beda (50000/5=10000), tapi harga
  // eksplisit 12345 harus tetap dipakai (mis. harga custom promo SPBU).
  const result = recordBbmLog({
    vehicleId: 'veh1', date: '2026-07-01', km: 1000, liter: 5, harga: 12345,
    cost: 50000, spbu: '', fullTank: true, note: '', accountId: 'acc1',
    txId: 'tx1', existingBbmId: null,
  });
  assert.equal(result.harga, 12345);
  assert.equal(D.bbmLogs[0].harga, 12345);
});

test('recordBbmLog — edit (existingBbmId ada & ketemu): update field di tempat, isNew false, TIDAK menambah entry baru', () => {
  const D = makeD({
    bbmLogs: [{
      id: 'bbm1', vehicleId: 'veh1', date: '2026-06-01', km: 5000, liter: 4,
      harga: 10000, cost: 40000, spbu: 'Shell', fullTank: false, note: 'lama',
      accountId: 'acc1', txLinkId: 'tx1',
    }],
  });
  const recordBbmLog = loadRecordBbmLog(D);
  const result = recordBbmLog({
    vehicleId: 'veh1', date: '2026-06-02', km: 5200, liter: 4.5, harga: 10500,
    cost: 47250, spbu: 'Pertamina', fullTank: true, note: 'baru', accountId: 'acc2',
    txId: 'tx1', existingBbmId: 'bbm1',
  });
  assert.equal(result.isNew, false);
  assert.equal(result.bbmId, 'bbm1');
  assert.equal(D.bbmLogs.length, 1); // tidak nambah entry baru
  const b = D.bbmLogs[0];
  assert.equal(b.date, '2026-06-02');
  assert.equal(b.km, 5200);
  assert.equal(b.liter, 4.5);
  assert.equal(b.cost, 47250);
  assert.equal(b.spbu, 'Pertamina');
  assert.equal(b.fullTank, true);
  assert.equal(b.note, 'baru');
  assert.equal(b.accountId, 'acc2');
});

test('recordBbmLog — edit TIDAK mengubah txLinkId yang sudah ada (bukan bagian field yang di-update)', () => {
  const D = makeD({
    bbmLogs: [{
      id: 'bbm1', vehicleId: 'veh1', date: '2026-06-01', km: 5000, liter: 4,
      harga: 10000, cost: 40000, spbu: '', fullTank: false, note: '',
      accountId: 'acc1', txLinkId: 'tx-lama',
    }],
  });
  const recordBbmLog = loadRecordBbmLog(D);
  recordBbmLog({
    vehicleId: 'veh1', date: '2026-06-02', km: 5200, liter: 4, harga: 10000,
    cost: 40000, spbu: '', fullTank: false, note: '', accountId: 'acc1',
    txId: null, existingBbmId: 'bbm1',
  });
  // txLinkId tetap 'tx-lama' walau opts.txId dikirim null saat edit —
  // ini konsisten dgn cara _saveInner memanggilnya (edit reuse existing.txLinkId).
  assert.equal(D.bbmLogs[0].txLinkId, 'tx-lama');
});

test('recordBbmLog — edit tanpa vehicleId baru => vehicleId lama dipertahankan (fallback ke b.vehicleId)', () => {
  const D = makeD({
    bbmLogs: [{
      id: 'bbm1', vehicleId: 'veh-lama', date: '2026-06-01', km: 5000, liter: 4,
      harga: 10000, cost: 40000, spbu: '', fullTank: false, note: '',
      accountId: 'acc1', txLinkId: 'tx1',
    }],
  });
  const recordBbmLog = loadRecordBbmLog(D);
  recordBbmLog({
    vehicleId: undefined, date: '2026-06-02', km: 5200, liter: 4, harga: 10000,
    cost: 40000, spbu: '', fullTank: false, note: '', accountId: 'acc1',
    txId: 'tx1', existingBbmId: 'bbm1',
  });
  assert.equal(D.bbmLogs[0].vehicleId, 'veh-lama');
});

test('recordBbmLog — existingBbmId dikirim tapi datanya tidak ketemu di D.bbmLogs => jatuh ke jalur catatan baru', () => {
  const D = makeD({ bbmLogs: [] }); // id 'bbm-hilang' tidak ada
  const recordBbmLog = loadRecordBbmLog(D);
  const result = recordBbmLog({
    vehicleId: 'veh1', date: '2026-07-01', km: 1000, liter: 2, harga: 10000,
    cost: 20000, spbu: '', fullTank: false, note: '', accountId: 'acc1',
    txId: 'tx1', existingBbmId: 'bbm-hilang',
  });
  assert.equal(result.isNew, true);
  assert.equal(D.bbmLogs.length, 1);
  assert.notEqual(result.bbmId, 'bbm-hilang'); // id baru di-generate, bukan reuse id yg hilang
});
