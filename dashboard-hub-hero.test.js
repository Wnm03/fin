'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

// dashboard-hub-hero.test.js — Sprint 1 Tahap 2 (HERO-CARD.md).
// DashboardHubHero dites di sini SENDIRI (bukan digabung ke
// tests/dashboard-hub.test.js) supaya perubahan taksonomi FEATURE_REGISTRY
// di masa depan tidak ikut menyeret test Hero Card, dan sebaliknya. Pola
// harness sama persis dgn dashboard-hub.test.js: dashboard-hub.js di-load
// APA ADANYA lewat loadSource() (bukan disalin ulang), document tiruan
// dipakai krn DashboardHubHero baca/tulis DOM langsung.

function makeHeroDoc(initial = {}) {
  return createFakeDocument({
    dashHubHeroGreet: {},
    dashHubHeroDate: {},
    dashHubHeroSaldo: {},
    dashHubHeroInc: {},
    dashHubHeroExp: {},
    ...initial,
  });
}

function loadHero(extraGlobals = {}) {
  const { document: docOverride, ...rest } = extraGlobals;
  const fakeDocument = docOverride || makeHeroDoc();
  const ctx = loadSource(['dashboard-hub.js'], {
    FEATURE_REGISTRY: undefined,
    ...rest,
    document: fakeDocument,
  }, ['DashboardHubHero']);
  return { DashboardHubHero: ctx.DashboardHubHero, fakeDocument };
}

test('dashboard-hub.js (dgn DashboardHubHero baru) tetap berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => loadHero());
});

test('DashboardHubHero.render() — elemen Hero Card tidak ada di DOM: tidak error, tidak melempar', () => {
  const emptyDoc = {
    getElementById: () => null,
    querySelectorAll: () => [],
  };
  const { DashboardHubHero } = loadHero({ document: emptyDoc });
  assert.doesNotThrow(() => DashboardHubHero.render());
});

test('DashboardHubHero.render() — TANPA D/totalSaldoAkun/fmt (belum di-load): tidak error, tampil placeholder aman', () => {
  const { DashboardHubHero, fakeDocument } = loadHero();
  assert.doesNotThrow(() => DashboardHubHero.render());
  assert.match(fakeDocument.getElementById('dashHubHeroGreet').textContent, /^Halo, W /, 'fallback nama harus "W" sama seperti default D.profile.nama di features-helpers-global-security.js');
  assert.equal(fakeDocument.getElementById('dashHubHeroSaldo').textContent, '—', 'tanpa totalSaldoAkun() harus placeholder aman, bukan error/NaN');
  assert.equal(fakeDocument.getElementById('dashHubHeroInc').textContent, 'Rp 0');
  assert.equal(fakeDocument.getElementById('dashHubHeroExp').textContent, 'Rp 0');
  assert.notEqual(fakeDocument.getElementById('dashHubHeroDate').textContent, '', 'tanggal harus tetap terisi (Date native, bukan data D)');
});

test('DashboardHubHero.render() — pakai D.profile.nama yang sudah ada (bukan bikin field baru)', () => {
  const D = { profile: { nama: 'Rina' }, transactions: [] };
  const { DashboardHubHero, fakeDocument } = loadHero({ D });
  DashboardHubHero.render();
  assert.equal(fakeDocument.getElementById('dashHubHeroGreet').textContent, 'Halo, Rina 👋');
});

test('DashboardHubHero.render() — saldo dibaca APA ADANYA dari totalSaldoAkun() yang sudah ada (tidak duplikasi logic saldo)', () => {
  let called = 0;
  const totalSaldoAkun = () => { called++; return 1500000; };
  const fmt = (n) => 'Rp ' + n;
  const { DashboardHubHero, fakeDocument } = loadHero({ totalSaldoAkun, fmt, D: { profile: {}, transactions: [] } });
  DashboardHubHero.render();
  assert.equal(called, 1, 'totalSaldoAkun() dari akun.js harus benar-benar dipanggil, bukan dihitung ulang di sini');
  assert.equal(fakeDocument.getElementById('dashHubHeroSaldo').textContent, 'Rp 1500000');
  assert.doesNotMatch(fakeDocument.getElementById('dashHubHeroSaldo').className, /\bred\b/);
});

test('DashboardHubHero.render() — saldo negatif: class "red" ditambahkan (reuse .red yang sudah ada di styles.css)', () => {
  const totalSaldoAkun = () => -50000;
  const fmt = (n) => 'Rp ' + n;
  const { DashboardHubHero, fakeDocument } = loadHero({ totalSaldoAkun, fmt, D: { profile: {}, transactions: [] } });
  DashboardHubHero.render();
  const saldoEl = fakeDocument.getElementById('dashHubHeroSaldo');
  assert.equal(saldoEl.textContent, '-Rp 50000');
  assert.match(saldoEl.className, /\bred\b/);
});

test('DashboardHubHero.render() — pemasukan/pengeluaran dihitung dari D.transactions bulan berjalan (pola sama dgn renderDashboard())', () => {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 5).toISOString();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 5).toISOString();
  const D = {
    profile: { nama: 'W' },
    transactions: [
      { date: thisMonth, type: 'income', amount: 1000000 },
      { date: thisMonth, type: 'income', amount: 500000 },
      { date: thisMonth, type: 'expense', amount: 300000 },
      { date: lastMonth, type: 'income', amount: 9999999 }, // bulan lalu -> HARUS diabaikan
      { date: thisMonth, type: 'transfer_out', amount: 200000 }, // bukan income/expense -> diabaikan
    ],
  };
  const fmt = (n) => 'Rp ' + n;
  const { DashboardHubHero, fakeDocument } = loadHero({ D, fmt });
  DashboardHubHero.render();
  assert.equal(fakeDocument.getElementById('dashHubHeroInc').textContent, 'Rp 1500000');
  assert.equal(fakeDocument.getElementById('dashHubHeroExp').textContent, 'Rp 300000');
});

// ---------- Integrasi ke DashboardHub.render() (harus additive, tidak mengubah grid) ----------

test('DashboardHub.render() — tetap memanggil DashboardHubHero.render() tanpa mengubah rendering grid kategori', () => {
  const D = { profile: { nama: 'Budi' }, transactions: [] };
  const totalSaldoAkun = () => 250000;
  const fmt = (n) => 'Rp ' + n;
  const fakeDocument = makeHeroDoc({ dashboardHubGrid: {} });
  const registry = [
    { key: 'keuangan', label: 'Keuangan', icon: '💰', desc: 'd', navIdx: 1, features: [{ key: 'k1', label: 'F1', desc: 'd', target: { page: 'keuangan' } }] },
  ];
  const ctx = loadSource(['dashboard-hub.js'], {
    document: fakeDocument,
    FEATURE_REGISTRY: registry,
    escapeHtml: (s) => String(s ?? ''),
    D,
    totalSaldoAkun,
    fmt,
  }, ['DashboardHub']);
  assert.doesNotThrow(() => ctx.DashboardHub.render());
  // Grid kategori tetap terisi seperti sebelumnya (perilaku Tahap 1 tidak berubah)
  assert.match(fakeDocument.getElementById('dashboardHubGrid').innerHTML, /F1/);
  // Hero Card ikut terisi dari D yang sama
  assert.equal(fakeDocument.getElementById('dashHubHeroGreet').textContent, 'Halo, Budi 👋');
  assert.equal(fakeDocument.getElementById('dashHubHeroSaldo').textContent, 'Rp 250000');
});
