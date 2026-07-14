'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeElement } = require('./helpers/fakeDom');

// BBM.renderList (features-budget-laporan-carnotes-pelanggan.js) baca input
// dari D.bbmLogs & tulis hasil kalkulasi (rata2 km/L, total liter, total
// biaya, badge km/L per baris) langsung ke DOM -- bukan return value murni.
// Beda dari fakeDom.js punya createFakeDocument() (yang meng-auto-vivify
// SEMUA id lewat getElementById, cocok utk kasus id yang memang selalu ada
// di HTML), renderList juga butuh document.createElement() +
// el.insertAdjacentElement() utk elemen "load more" yang dia buat sendiri
// on-the-fly SEKALI lalu dicek ulang tiap render (if(!bbmMoreWrap){buat}) --
// jadi getElementById utk id itu HARUS bisa balikin null di panggilan
// pertama (auto-vivify createFakeDocument tidak cocok utk ini). Karena itu
// dipakai dokumen mini khusus di sini, bukan createFakeDocument.
function makeBbmDocument(prefilled = {}) {
  const els = new Map();
  function ensure(id, init) {
    if (!els.has(id)) els.set(id, createFakeElement(init));
    return els.get(id);
  }
  ['bbmAvgKmL', 'bbmTotalL', 'bbmTotalCost', 'bbmTrendCard'].forEach((id) => ensure(id));
  ensure('bbmList', { insertAdjacentElement() {} });
  Object.entries(prefilled).forEach(([id, val]) => Object.assign(ensure(id), val));
  return {
    getElementById: (id) => (els.has(id) ? els.get(id) : null),
    createElement: () => createFakeElement(),
  };
}

function makeBBM(D, opts = {}) {
  const fakeDocument = makeBbmDocument(opts.domValues);
  const ctx = loadSource(['features-budget-laporan-carnotes-pelanggan.js'], {
    D,
    document: fakeDocument,
    curVehicleId: opts.curVehicleId !== undefined ? opts.curVehicleId : 'veh1',
    // getCnRange() aslinya di tukang-absensi.js (dulu features-tukang-kendaraan-storage.js) (baca
    // filter periode dari DOM); di sini di-stub biar rentang dikontrol test.
    getCnRange: opts.getCnRange || (() => ({ from: new Date(0), to: new Date(8640000000000000) })),
    // fmt dibuat identity (bukan format Rupiah asli) supaya assertion bisa
    // cek ANGKA HASIL PERSIS -- pola sama dgn fmtFull di gaji-calc.test.js.
    fmt: (n) => String(Math.round(n)),
    escapeHtml: (s) => String(s === null || s === undefined ? '' : s),
    TX_PAGE_SIZE: 50,
  }, ['BBM']);
  return { BBM: ctx.BBM, fakeDocument };
}

function bbmLog(overrides) {
  return {
    id: 'id' + Math.random(), vehicleId: 'veh1', date: '2026-07-01', km: 0,
    liter: 0, harga: 0, cost: 0, spbu: '', fullTank: false, note: '',
    accountId: 'acc1', ...overrides,
  };
}

test('BBM.renderList — belum ada catatan utk kendaraan ini => tampil empty state, tidak error', () => {
  const D = { bbmLogs: [] };
  const { BBM, fakeDocument } = makeBBM(D);
  assert.doesNotThrow(() => BBM.renderList());
  assert.match(fakeDocument.getElementById('bbmList').innerHTML, /Belum ada catatan BBM/);
});

test('BBM.renderList — total liter & total biaya = jumlah semua catatan kendaraan yg aktif di rentang tanggal', () => {
  const D = {
    bbmLogs: [
      bbmLog({ id: 'a', km: 1000, liter: 20, cost: 200000, fullTank: true }),
      bbmLog({ id: 'b', km: 1200, liter: 15, cost: 150000, fullTank: true }),
      bbmLog({ id: 'c', km: 1500, liter: 20, cost: 200000, fullTank: true }),
    ],
  };
  const { BBM, fakeDocument } = makeBBM(D);
  BBM.renderList();
  assert.equal(fakeDocument.getElementById('bbmTotalL').textContent, '55.0 L');
  assert.equal(fakeDocument.getElementById('bbmTotalCost').textContent, '550000');
});

test('BBM.renderList — kendaraan lain & catatan di luar rentang tanggal TIDAK ikut terhitung', () => {
  const D = {
    bbmLogs: [
      bbmLog({ id: 'a', vehicleId: 'veh1', date: '2026-07-01', km: 1000, liter: 20, cost: 200000, fullTank: true }),
      bbmLog({ id: 'lain-kendaraan', vehicleId: 'veh2', date: '2026-07-01', km: 500, liter: 99, cost: 999000, fullTank: true }),
      bbmLog({ id: 'di-luar-rentang', vehicleId: 'veh1', date: '2020-01-01', km: 900, liter: 99, cost: 999000, fullTank: true }),
    ],
  };
  const { BBM, fakeDocument } = makeBBM(D, {
    getCnRange: () => ({ from: new Date('2026-01-01'), to: new Date('2026-12-31T23:59:59') }),
  });
  BBM.renderList();
  assert.equal(fakeDocument.getElementById('bbmTotalL').textContent, '20.0 L');
  assert.equal(fakeDocument.getElementById('bbmTotalCost').textContent, '200000');
});

test('BBM.renderList — rata2 km/L (>=2 isi penuh): jarak & liter dihitung ANTAR isi penuh berurutan, bukan dari isi pertama', () => {
  // Isi penuh di km 1000 (baseline, liternya TIDAK ikut dihitung sbg "dipakai"
  // krn belum ada jarak sebelumnya) -> 1200 (jarak 200, pakai 15L) -> 1500
  // (jarak 300, pakai 20L). Total: 500 km / 35 L = 14.2857... -> 14.3
  const D = {
    bbmLogs: [
      bbmLog({ id: 'a', km: 1000, liter: 20, cost: 200000, fullTank: true }),
      bbmLog({ id: 'b', km: 1200, liter: 15, cost: 150000, fullTank: true }),
      bbmLog({ id: 'c', km: 1500, liter: 20, cost: 200000, fullTank: true }),
    ],
  };
  const { BBM, fakeDocument } = makeBBM(D);
  BBM.renderList();
  assert.equal(fakeDocument.getElementById('bbmAvgKmL').textContent, '14.3');
});

test('BBM.renderList — rata2 km/L (belum ada 2 isi penuh): fallback pakai seluruh rentang data, liter isi PERTAMA dikecualikan', () => {
  // Cuma 1 isi penuh (atau tidak ada) -> fallback logs.length>=2: totalJarak
  // dari entry pertama ke terakhir, literTanpaAwal = jumlah liter SEMUA
  // entry KECUALI yg pertama (krn liter isi pertama belum "dipakai" apa2).
  const D = {
    bbmLogs: [
      bbmLog({ id: 'a', km: 1000, liter: 20, cost: 200000, fullTank: false }),
      bbmLog({ id: 'b', km: 1300, liter: 25, cost: 250000, fullTank: false }),
    ],
  };
  const { BBM, fakeDocument } = makeBBM(D);
  BBM.renderList();
  // totalJarak=300, literTanpaAwal=25 (liter entry 'a' dikecualikan) -> 300/25=12.0
  assert.equal(fakeDocument.getElementById('bbmAvgKmL').textContent, '12.0');
});

test('BBM.renderList — badge km/L per baris cuma tampil di baris "full tank" yg punya entry sebelumnya, angkanya sesuai liter sejak entry sebelumnya', () => {
  const D = {
    bbmLogs: [
      bbmLog({ id: 'a', km: 1000, liter: 20, cost: 200000, fullTank: true }),
      bbmLog({ id: 'b', km: 1200, liter: 15, cost: 150000, fullTank: true }), // 200km/15L = 13.3
      bbmLog({ id: 'c', km: 1500, liter: 20, cost: 200000, fullTank: true }), // 300km/20L = 15.0
    ],
  };
  const { BBM, fakeDocument } = makeBBM(D);
  BBM.renderList();
  const html = fakeDocument.getElementById('bbmList').innerHTML;
  assert.match(html, /13\.3 km\/L/);
  assert.match(html, /15\.0 km\/L/);
  // Baris pertama (km 1000) tidak punya entry sebelumnya -> tidak ada badge
  // utk dirinya; pastikan cuma ADA 2 badge total (bukan 3).
  const badgeCount = (html.match(/km\/L/g) || []).length;
  assert.equal(badgeCount, 2);
});

test('BBM.renderList — badge km/L TIDAK tampil di baris "isi sebagian" (bukan full tank), walau ada entry sebelumnya', () => {
  const D = {
    bbmLogs: [
      bbmLog({ id: 'a', km: 1000, liter: 20, cost: 200000, fullTank: true }),
      bbmLog({ id: 'b', km: 1100, liter: 5, cost: 50000, fullTank: false }), // isi sebagian
    ],
  };
  const { BBM, fakeDocument } = makeBBM(D);
  BBM.renderList();
  const html = fakeDocument.getElementById('bbmList').innerHTML;
  assert.doesNotMatch(html, /km\/L/);
  assert.match(html, /Isi sebagian/);
});
