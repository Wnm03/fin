'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

// reset-gaji-mingguan.js pakai `new Date()` (waktu "sekarang") yg WAJIB bisa
// dikontrol (deteksi hari Sabtu, hitung rentang minggu) — default stub `loadSource`
// (permissive no-op) cuma cocok utk fungsi murni tanpa Date, jadi di sini `Date`
// disuntik lewat `extraGlobals` dgn class tiruan yg EXTENDS Date asli (bukan objek
// stub spt di error-handler.test.js, krn di sini butuh instance Date beneran yg bisa
// `.getDay()`/`.setDate()`/`.setHours()`, bukan cuma `Date.now()`): `new Date()` (tanpa
// argumen) balik waktu tetap yg diatur test, `new Date(x)` (dgn argumen, mis. parsing
// tanggal absensi atau copy-constructor dari `start`/`end`) tetap delegasi ke Date asli.
// Sandbox ini ber-TZ UTC (offset 0), jadi string ISO 'YYYY-MM-DD' aman dipakai
// konsisten antara waktu "sekarang" & tanggal absensi tanpa geser hari.
// Fungsi/var global lain dari file lain (D/save/toast/fmtFull/uid/todayStr/dateToISO
// dari features-helpers-global-security.js & helper-teks.js, openModal/closeModal dari
// modal-navigasi.js, populateAccFilters dari akun.js, renderWorkDays/renderDashboard/
// renderKeuangan dari modules-render.js) semua di-stub di sini (pola sama dgn
// onboarding.test.js), supaya test file ini tidak perlu me-load seluruh app.
function makeFakeDate(nowIso) {
  const fixedTime = new Date(nowIso).getTime();
  class FakeDate extends Date {
    constructor(...args) {
      if (args.length === 0) super(fixedTime);
      else super(...args);
    }
  }
  FakeDate.now = () => fixedTime;
  return FakeDate;
}

function makeCtx({ nowIso = '2026-07-11T10:00:00.000Z', domInitial = {}, D = {} } = {}) {
  const fakeDocument = createFakeDocument({
    wrCount: {}, wrTotal: {}, wrAutoIncome: {}, wrAccWrap: { style: {} }, wrAcc: {},
    ...domInitial,
  });
  const calls = {
    save: 0, toast: [], openModal: [], closeModal: [], populateAccFilters: 0,
    renderWorkDays: 0, renderDashboard: 0, renderKeuangan: 0, uid: 0,
  };
  const baseD = {
    workDays: [], transactions: [], accounts: [],
    categories: { income: [] },
    lastResetPromptDate: null,
    ...D,
  };
  const ctx = loadSource(['reset-gaji-mingguan.js'], {
    document: fakeDocument,
    Date: makeFakeDate(nowIso),
    D: baseD,
    save: () => { calls.save++; },
    toast: (msg) => calls.toast.push(msg),
    fmtFull: (n) => `FULL(${n})`,
    uid: () => { calls.uid++; return `uid-${calls.uid}`; },
    todayStr: () => nowIso.slice(0, 10),
    dateToISO: (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    openModal: (id) => calls.openModal.push(id),
    closeModal: (id) => calls.closeModal.push(id),
    populateAccFilters: () => { calls.populateAccFilters++; },
    renderWorkDays: () => { calls.renderWorkDays++; },
    renderDashboard: () => { calls.renderDashboard++; },
    renderKeuangan: () => { calls.renderKeuangan++; },
  });
  return { ctx, fakeDocument, calls, D: baseD };
}

// ---------- getWeekRange (pure) ----------

test('getWeekRange — input hari Sabtu: rentang Minggu 00:00:00.000 s/d Sabtu 23:59:59.999', () => {
  const { ctx } = makeCtx();
  const { start, end } = ctx.getWeekRange(new Date('2026-07-11T10:00:00.000Z')); // Sabtu
  assert.equal(start.toISOString(), '2026-07-05T00:00:00.000Z'); // Minggu
  assert.equal(end.toISOString(), '2026-07-11T23:59:59.999Z'); // Sabtu
});

test('getWeekRange — input hari tengah minggu (Rabu) tetap balik ke rentang Minggu-Sabtu yg sama', () => {
  const { ctx } = makeCtx();
  const { start, end } = ctx.getWeekRange(new Date('2026-07-08T03:00:00.000Z')); // Rabu
  assert.equal(start.toISOString(), '2026-07-05T00:00:00.000Z');
  assert.equal(end.toISOString(), '2026-07-11T23:59:59.999Z');
});

test('getWeekRange — input hari Minggu: start = hari itu sendiri jam 00:00', () => {
  const { ctx } = makeCtx();
  const { start, end } = ctx.getWeekRange(new Date('2026-07-05T18:00:00.000Z')); // Minggu
  assert.equal(start.toISOString(), '2026-07-05T00:00:00.000Z');
  assert.equal(end.toISOString(), '2026-07-11T23:59:59.999Z');
});

// ---------- checkWeeklySalaryReset ----------

test('checkWeeklySalaryReset — bukan hari Sabtu -> tidak melakukan apa-apa', () => {
  const { ctx, calls, D } = makeCtx({ nowIso: '2026-07-08T10:00:00.000Z' }); // Rabu
  ctx.checkWeeklySalaryReset();
  assert.equal(calls.save, 0);
  assert.equal(calls.openModal.length, 0);
  assert.equal(D.lastResetPromptDate, null);
});

test('checkWeeklySalaryReset — Sabtu tapi sudah pernah di-prompt hari ini -> return awal', () => {
  const { ctx, calls } = makeCtx({
    nowIso: '2026-07-11T10:00:00.000Z',
    D: { lastResetPromptDate: '2026-07-11' },
  });
  ctx.checkWeeklySalaryReset();
  assert.equal(calls.save, 0);
  assert.equal(calls.openModal.length, 0);
});

test('checkWeeklySalaryReset — Sabtu, tidak ada absensi minggu ini -> catat prompt date & save(), modal TIDAK dibuka', () => {
  const { ctx, calls, D } = makeCtx({ nowIso: '2026-07-11T10:00:00.000Z' });
  ctx.checkWeeklySalaryReset();
  assert.equal(D.lastResetPromptDate, '2026-07-11');
  assert.equal(calls.save, 1);
  assert.equal(calls.openModal.length, 0);
});

test('checkWeeklySalaryReset — Sabtu, ada absensi minggu ini -> total dihitung & modal dibuka', () => {
  const { ctx, calls, fakeDocument } = makeCtx({
    nowIso: '2026-07-11T10:00:00.000Z',
    D: {
      workDays: [{ date: '2026-07-06', total: 100000 }, { date: '2026-07-09', total: 150000 }],
      accounts: [{ id: 'acc1' }],
    },
  });
  ctx.checkWeeklySalaryReset();
  assert.equal(fakeDocument.getElementById('wrCount').textContent, 2);
  assert.equal(fakeDocument.getElementById('wrTotal').textContent, 'FULL(250000)');
  assert.equal(fakeDocument.getElementById('wrAutoIncome').checked, true);
  assert.equal(fakeDocument.getElementById('wrAccWrap').style.display, 'block');
  assert.equal(fakeDocument.getElementById('wrAcc').value, 'acc1');
  assert.deepEqual(calls.openModal, ['weeklyResetModal']);
});

test('checkWeeklySalaryReset — hanya absensi DI DALAM rentang minggu ini yg dihitung', () => {
  const { ctx, fakeDocument } = makeCtx({
    nowIso: '2026-07-11T10:00:00.000Z',
    D: {
      workDays: [
        { date: '2026-07-04', total: 999999 }, // Sabtu minggu LALU, di luar rentang
        { date: '2026-07-06', total: 100000 }, // di dalam rentang
      ],
    },
  });
  ctx.checkWeeklySalaryReset();
  assert.equal(fakeDocument.getElementById('wrCount').textContent, 1);
  assert.equal(fakeDocument.getElementById('wrTotal').textContent, 'FULL(100000)');
});

test('checkWeeklySalaryReset — D.accounts kosong -> wrAccWrap disembunyikan, wrAcc.value tidak disentuh', () => {
  const { ctx, fakeDocument } = makeCtx({
    nowIso: '2026-07-11T10:00:00.000Z',
    D: { workDays: [{ date: '2026-07-06', total: 100000 }], accounts: [] },
  });
  ctx.checkWeeklySalaryReset();
  assert.equal(fakeDocument.getElementById('wrAccWrap').style.display, 'none');
  assert.equal(fakeDocument.getElementById('wrAcc').value, '');
});

// ---------- openWeeklyResetManual ----------

test('openWeeklyResetManual — tidak ada absensi minggu ini -> toast peringatan, modal tidak disentuh', () => {
  const { ctx, calls } = makeCtx({ nowIso: '2026-07-11T10:00:00.000Z' });
  ctx.openWeeklyResetManual();
  assert.deepEqual(calls.toast, ['⚠️ Belum ada absensi minggu ini untuk dicatat']);
  assert.equal(calls.openModal.length, 0);
  assert.equal(calls.closeModal.length, 0);
  assert.equal(calls.populateAccFilters, 0);
});

test('openWeeklyResetManual — ada absensi -> isi ringkasan, tutup 2 modal sumber, buka modal reset', () => {
  const { ctx, calls, fakeDocument } = makeCtx({
    nowIso: '2026-07-11T10:00:00.000Z',
    D: {
      workDays: [{ date: '2026-07-07', total: 80000 }],
      accounts: [{ id: 'accX' }],
    },
  });
  ctx.openWeeklyResetManual();
  assert.equal(calls.populateAccFilters, 1);
  assert.equal(fakeDocument.getElementById('wrCount').textContent, 1);
  assert.equal(fakeDocument.getElementById('wrTotal').textContent, 'FULL(80000)');
  assert.equal(fakeDocument.getElementById('wrAcc').value, 'accX');
  assert.deepEqual(calls.closeModal, ['absensiModal', 'gajiCalcModal']);
  assert.deepEqual(calls.openModal, ['weeklyResetModal']);
});

// ---------- confirmWeeklyReset ----------

test('confirmWeeklyReset(false) — data absensi TIDAK direset, hanya catat prompt date & re-render (tanpa keuangan)', () => {
  const { ctx, calls, D } = makeCtx({
    nowIso: '2026-07-11T10:00:00.000Z',
    D: { workDays: [{ date: '2026-07-06', total: 100000 }] },
  });
  ctx.confirmWeeklyReset(false);
  assert.deepEqual(calls.toast, ['Oke, data absensi minggu ini tetap disimpan']);
  assert.equal(D.workDays.length, 1); // tidak terhapus
  assert.equal(D.lastResetPromptDate, '2026-07-11');
  assert.equal(calls.save, 1);
  assert.deepEqual(calls.closeModal, ['weeklyResetModal']);
  assert.equal(calls.renderWorkDays, 1);
  assert.equal(calls.renderDashboard, 1);
  assert.equal(calls.renderKeuangan, 0);
});

test('confirmWeeklyReset(true) — auto-income aktif: transaksi Pemasukan tercatat, absensi minggu ini terhapus, renderKeuangan dipanggil', () => {
  const { ctx, calls, D, fakeDocument } = makeCtx({
    nowIso: '2026-07-11T10:00:00.000Z',
    D: {
      workDays: [
        { date: '2026-07-06', total: 100000 },
        { date: '2026-07-01', total: 999999 }, // minggu lalu, harus TETAP ada setelah reset
      ],
      accounts: [{ id: 'acc1' }],
      categories: { income: [{ name: 'Gaji Bulanan' }, { name: 'Bonus' }] },
    },
  });
  // Simulasikan alur nyata: buka modal manual dulu (supaya _wrLastTotal/_wrLastCount
  // ke-set dari closure internal), baru konfirmasi — sesuai urutan pemakaian asli
  // (tombol buka modal reset SELALU dipanggil sebelum tombol konfirmasi).
  ctx.openWeeklyResetManual();
  fakeDocument.getElementById('wrAutoIncome').checked = true;
  fakeDocument.getElementById('wrAcc').value = 'acc1';
  ctx.confirmWeeklyReset(true);

  assert.equal(D.transactions.length, 1);
  const tx = D.transactions[0];
  assert.equal(tx.type, 'income');
  assert.equal(tx.amount, 100000);
  assert.equal(tx.category, 'Gaji Bulanan'); // match regex /gaji/i
  assert.equal(tx.accountId, 'acc1');
  assert.equal(tx.date, '2026-07-11');
  assert.equal(tx.note.includes('1 hari kerja'), true);
  assert.equal(tx.note.includes('2026-07-05 s/d 2026-07-11'), true);

  assert.equal(D.workDays.length, 1); // hanya sisa minggu lalu
  assert.equal(D.workDays[0].date, '2026-07-01');

  assert.deepEqual(calls.toast[calls.toast.length - 1], '✅ Absensi direset & FULL(100000) dicatat sebagai Pemasukan! 🎉');
  assert.equal(calls.renderKeuangan, 1);
});

test('confirmWeeklyReset(true) — checkbox auto-income OFF: absensi tetap direset tapi TIDAK ada transaksi & TIDAK renderKeuangan', () => {
  const { ctx, calls, D, fakeDocument } = makeCtx({
    nowIso: '2026-07-11T10:00:00.000Z',
    D: { workDays: [{ date: '2026-07-06', total: 100000 }] },
  });
  ctx.openWeeklyResetManual();
  fakeDocument.getElementById('wrAutoIncome').checked = false;
  ctx.confirmWeeklyReset(true);

  assert.equal(D.transactions.length, 0);
  assert.equal(D.workDays.length, 0); // absensi tetap direset
  assert.deepEqual(calls.toast[calls.toast.length - 1], '✅ Absensi minggu ini direset, selamat gajian! 🎉');
  assert.equal(calls.renderKeuangan, 0);
});

test('confirmWeeklyReset(true) — tidak ada kategori match /gaji/i -> fallback ke kategori income pertama', () => {
  const { ctx, D, fakeDocument } = makeCtx({
    nowIso: '2026-07-11T10:00:00.000Z',
    D: {
      workDays: [{ date: '2026-07-06', total: 50000 }],
      categories: { income: [{ name: 'Freelance' }, { name: 'Investasi' }] },
    },
  });
  ctx.openWeeklyResetManual();
  fakeDocument.getElementById('wrAutoIncome').checked = true;
  ctx.confirmWeeklyReset(true);
  assert.equal(D.transactions[0].category, 'Freelance');
});

test('confirmWeeklyReset(true) — kategori income kosong sama sekali -> fallback nama "Gaji"', () => {
  const { ctx, D, fakeDocument } = makeCtx({
    nowIso: '2026-07-11T10:00:00.000Z',
    D: { workDays: [{ date: '2026-07-06', total: 50000 }], categories: { income: [] } },
  });
  ctx.openWeeklyResetManual();
  fakeDocument.getElementById('wrAutoIncome').checked = true;
  ctx.confirmWeeklyReset(true);
  assert.equal(D.transactions[0].category, 'Gaji');
});

test('confirmWeeklyReset(true) — D.accounts kosong & wrAcc tanpa value -> accountId null (bukan crash)', () => {
  const { ctx, D, fakeDocument } = makeCtx({
    nowIso: '2026-07-11T10:00:00.000Z',
    D: { workDays: [{ date: '2026-07-06', total: 50000 }], accounts: [] },
  });
  ctx.openWeeklyResetManual();
  fakeDocument.getElementById('wrAutoIncome').checked = true;
  ctx.confirmWeeklyReset(true);
  assert.equal(D.transactions[0].accountId, null);
});

test('confirmWeeklyReset(true) — total 0 (semua absensi 0 jam) -> autoIncome tidak aktif walau checkbox nyala, tidak ada transaksi', () => {
  const { ctx, D, fakeDocument } = makeCtx({
    nowIso: '2026-07-11T10:00:00.000Z',
    D: { workDays: [{ date: '2026-07-06', total: 0 }] },
  });
  ctx.openWeeklyResetManual();
  fakeDocument.getElementById('wrAutoIncome').checked = true;
  ctx.confirmWeeklyReset(true);
  assert.equal(D.transactions.length, 0);
});
