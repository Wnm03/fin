'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

// BBM._saveInner (alur simpan/edit "Catat Isi BBM" di Car Notes), di
// features-budget-laporan-carnotes-pelanggan.js. Sebelumnya BELUM ada test
// sama sekali untuk method ini (lihat catatan review di CLAUDE.md) — di sini
// khusus menutup temuan #1: catatan BBM "yatim" (txLinkId hilang, mis.
// transaksi terkaitnya kehapus manual di luar alur normal) yang dulu
// SILENTLY tetap tidak tersinkron ulang ke Keuangan saat diedit.
// Sama seperti test Servis._saveInner: pakai fakeDocument + stub semua
// dependency lintas-file, BUKAN test integrasi lintas file sungguhan.

function bbmFormFields(overrides = {}) {
  return {
    bbmKm: { value: '' }, bbmLiter: { value: '' }, bbmCost: { value: '' },
    bbmHarga: { value: '' }, bbmSpbu: { value: '' }, bbmFull: { checked: false },
    bbmDate: { value: '2026-07-01' }, bbmNote: { value: '' }, bbmAcc: { value: 'acc1' },
    ...overrides,
  };
}

function loadBbmFull(D, opts = {}) {
  const fakeDocument = createFakeDocument(bbmFormFields(opts.domValues));
  const toasts = [];
  const calls = { save: 0, closeModal: null };
  let n = 0;
  const ctx = loadSource(['features-budget-laporan-carnotes-pelanggan.js'], {
    D,
    document: fakeDocument,
    curVehicleId: opts.curVehicleId !== undefined ? opts.curVehicleId : 'veh1',
    uid: () => 'uid-' + (++n),
    toast: (msg) => toasts.push(msg),
    save: () => { calls.save++; },
    closeModal: (id) => { calls.closeModal = id; },
    renderCnTab: () => {}, renderDashboard: () => {}, renderKeuangan: () => {},
    resolveVehicleTxCategory: opts.resolveVehicleTxCategory || (() => 'Transport'),
    escapeHtml: (s) => String(s === null || s === undefined ? '' : s),
    // recordBbmLog aslinya di transaksi.js (file lain) -- di-stub di sini
    // dgn implementasi yg sama persis spt aslinya (lihat tests/bbm-log.test.js
    // utk test recordBbmLog itu sendiri), supaya BBM._saveInner bisa dites
    // terisolasi tanpa perlu load seluruh chain modul lain.
    recordBbmLog: (o) => {
      let harga = o.harga;
      if (!harga && o.liter) harga = Math.round(o.cost / o.liter);
      if (!D.bbmLogs) D.bbmLogs = [];
      if (o.existingBbmId) {
        const b = D.bbmLogs.find((x) => x.id === o.existingBbmId);
        if (b) {
          Object.assign(b, { date: o.date, km: o.km, liter: o.liter, harga, cost: o.cost, spbu: o.spbu, fullTank: o.fullTank, note: o.note, accountId: o.accountId, vehicleId: o.vehicleId || b.vehicleId });
          return { bbmId: b.id, isNew: false, harga };
        }
      }
      const bbmId = 'uid-' + (++n);
      D.bbmLogs.push({ id: bbmId, vehicleId: o.vehicleId, date: o.date, km: o.km, liter: o.liter, harga, cost: o.cost, spbu: o.spbu, fullTank: o.fullTank, note: o.note, accountId: o.accountId, txLinkId: o.txId });
      return { bbmId, isNew: true, harga };
    },
  }, ['BBM']);
  return { BBM: ctx.BBM, fakeDocument, toasts, calls };
}

function baseD(overrides = {}) {
  return {
    bbmLogs: [], transactions: [], vehicles: [{ id: 'veh1', name: 'Vario' }],
    accounts: [{ id: 'acc1' }], ...overrides,
  };
}

test('BBM._saveInner — KM/liter/biaya kosong => tolak simpan dgn toast, tidak ada log/transaksi baru', () => {
  const D = baseD();
  const { BBM, toasts } = loadBbmFull(D, { domValues: { bbmKm: { value: '' }, bbmLiter: { value: '' }, bbmCost: { value: '' } } });
  BBM._saveInner();
  assert.match(toasts[0], /Lengkapi KM, liter, dan biaya/);
  assert.equal(D.bbmLogs.length, 0);
  assert.equal(D.transactions.length, 0);
});

test('BBM._saveInner — catatan baru => bbmLogs & transaksi Keuangan sama2 dibuat, txLinkId terhubung', () => {
  const D = baseD();
  const { BBM, toasts } = loadBbmFull(D, {
    domValues: { bbmKm: { value: '10000' }, bbmLiter: { value: '5' }, bbmCost: { value: '50000' }, bbmHarga: { value: '10000' } },
  });
  BBM._saveInner();
  assert.equal(D.bbmLogs.length, 1);
  assert.equal(D.transactions.length, 1);
  assert.equal(D.bbmLogs[0].txLinkId, D.transactions[0].id);
  assert.equal(D.transactions[0].amount, 50000);
  assert.equal(D.transactions[0].subcategory, 'Bensin');
  assert.match(toasts[toasts.length - 1], /tersinkron ke Keuangan/);
});

test('BBM._saveInner — edit catatan normal (txLinkId ada): update di tempat, tidak nambah transaksi baru', () => {
  const D = baseD({
    bbmLogs: [{ id: 'bbm1', vehicleId: 'veh1', date: '2026-06-01', km: 5000, liter: 4, harga: 10000, cost: 40000, spbu: '', fullTank: false, note: '', accountId: 'acc1', txLinkId: 'tx1' }],
    transactions: [{ id: 'tx1', type: 'expense', amount: 40000, date: '2026-06-01', accountId: 'acc1', note: 'lama' }],
  });
  const { BBM, toasts } = loadBbmFull(D, {
    domValues: { bbmKm: { value: '5200' }, bbmLiter: { value: '4.5' }, bbmCost: { value: '47250' }, bbmHarga: { value: '10500' }, bbmDate: { value: '2026-07-05' } },
  });
  BBM.editId = 'bbm1';
  BBM._saveInner();
  assert.equal(D.bbmLogs.length, 1); // tidak nambah entry baru
  assert.equal(D.transactions.length, 1); // tidak nambah transaksi baru
  assert.equal(D.transactions[0].amount, 47250);
  assert.equal(D.transactions[0].date, '2026-07-05');
  assert.equal(D.bbmLogs[0].txLinkId, 'tx1'); // txLinkId tidak berubah
  assert.match(toasts[toasts.length - 1], /diperbarui/);
});

test('BBM._saveInner — BUGFIX edit catatan YATIM (txLinkId hilang): transaksi baru dibuat & txLinkId disambung ulang', () => {
  // Simulasi: transaksi terkait kehapus manual di luar alur normal, jadi
  // catatan BBM kehilangan txLinkId (jadi null/undefined) tapi tetap ada.
  const D = baseD({
    bbmLogs: [{ id: 'bbm1', vehicleId: 'veh1', date: '2026-06-01', km: 5000, liter: 4, harga: 10000, cost: 40000, spbu: 'Shell', fullTank: false, note: '', accountId: 'acc1', txLinkId: null }],
    transactions: [], // kosong -- ini yg bikin "yatim"
  });
  const { BBM, toasts } = loadBbmFull(D, {
    domValues: { bbmKm: { value: '5200' }, bbmLiter: { value: '4.5' }, bbmCost: { value: '47250' }, bbmHarga: { value: '10500' } },
  });
  BBM.editId = 'bbm1';
  BBM._saveInner();
  assert.equal(D.bbmLogs.length, 1); // tetap tidak dobel catatan BBM
  assert.equal(D.transactions.length, 1); // transaksi baru DIBUAT (dulu: tetap 0, silently unsynced)
  assert.equal(D.transactions[0].amount, 47250);
  assert.equal(D.transactions[0].subcategory, 'Bensin');
  assert.ok(D.bbmLogs[0].txLinkId, 'txLinkId harus terisi lagi setelah disambung ulang');
  assert.equal(D.bbmLogs[0].txLinkId, D.transactions[0].id);
  assert.match(toasts[toasts.length - 1], /disinkron ulang ke Keuangan/);
});

test('BBM._saveInner — data tidak ditemukan (editId tidak ada di bbmLogs) => tolak dgn toast', () => {
  const D = baseD();
  const { BBM, toasts } = loadBbmFull(D, {
    domValues: { bbmKm: { value: '5200' }, bbmLiter: { value: '4.5' }, bbmCost: { value: '47250' } },
  });
  BBM.editId = 'bbm-hilang';
  BBM._saveInner();
  assert.match(toasts[0], /Data tidak ditemukan/);
  assert.equal(D.bbmLogs.length, 0);
  assert.equal(D.transactions.length, 0);
});
