'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

// dashboard-hub-summary.test.js — Sprint 1 Tahap 5 (DASHBOARD-SUMMARY.md).
// DashboardHubSummary dites di sini SENDIRI (bukan digabung ke
// tests/dashboard-hub.test.js atau tests/dashboard-hub-hero.test.js), pola
// sama persis dgn dashboard-hub-hero.test.js: dashboard-hub.js di-load APA
// ADANYA lewat loadSource() (bukan disalin ulang), document tiruan dipakai
// krn DashboardHubSummary baca/tulis DOM langsung lewat innerHTML.

function makeSummaryDoc(initial = {}) {
  return createFakeDocument({
    dashHubSummaryGrid: {},
    ...initial,
  });
}

function loadSummary(extraGlobals = {}) {
  const { document: docOverride, ...rest } = extraGlobals;
  const fakeDocument = docOverride || makeSummaryDoc();
  const ctx = loadSource(['dashboard-hub.js'], {
    FEATURE_REGISTRY: undefined,
    escapeHtml: (s) => String(s ?? ''),
    ...rest,
    document: fakeDocument,
  }, ['DashboardHubSummary']);
  return { DashboardHubSummary: ctx.DashboardHubSummary, fakeDocument };
}

test('dashboard-hub.js (dgn DashboardHubSummary baru) tetap berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => loadSummary());
});

test('DashboardHubSummary.render() — elemen container tidak ada di DOM: tidak error, tidak melempar', () => {
  const emptyDoc = {
    getElementById: () => null,
    querySelectorAll: () => [],
  };
  const { DashboardHubSummary } = loadSummary({ document: emptyDoc });
  assert.doesNotThrow(() => DashboardHubSummary.render());
});

test('DashboardHubSummary.render() — TANPA D (belum di-load): tidak error, tampil angka nol yang aman', () => {
  const { DashboardHubSummary, fakeDocument } = loadSummary();
  assert.doesNotThrow(() => DashboardHubSummary.render());
  const html = fakeDocument.getElementById('dashHubSummaryGrid').innerHTML;
  assert.match(html, /Pemasukan Bulan Ini/);
  assert.match(html, /Pengeluaran Bulan Ini/);
  assert.match(html, /Bersih Bulan Ini/);
  assert.match(html, /Jumlah Transaksi/);
  assert.match(html, /Rp 0/);
});

test('DashboardHubSummary.render() — pemasukan/pengeluaran/bersih/jumlah dihitung dari D.transactions bulan berjalan (pola sama dgn FinCoach.renderDash())', () => {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 5).toISOString();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 5).toISOString();
  const D = {
    transactions: [
      { date: thisMonth, type: 'income', amount: 1000000 },
      { date: thisMonth, type: 'income', amount: 500000 },
      { date: thisMonth, type: 'expense', amount: 300000 },
      { date: lastMonth, type: 'income', amount: 9999999 }, // bulan lalu -> HARUS diabaikan
      { date: thisMonth, type: 'transfer_out', amount: 200000 }, // bukan income/expense -> diabaikan dari nominal, TAPI tetap dihitung sbg 1 transaksi bulan ini
    ],
  };
  const fmt = (n) => 'Rp ' + n;
  const { DashboardHubSummary, fakeDocument } = loadSummary({ D, fmt });
  DashboardHubSummary.render();
  const html = fakeDocument.getElementById('dashHubSummaryGrid').innerHTML;
  assert.match(html, /Rp 1500000/, 'pemasukan bulan ini harus 1.000.000 + 500.000');
  assert.match(html, /Rp 300000/, 'pengeluaran bulan ini harus 300.000');
  assert.match(html, /Rp 1200000/, 'bersih bulan ini harus 1.500.000 - 300.000');
  assert.match(html, />4</, 'jumlah transaksi bulan ini harus 4 (semua tx bulan berjalan, termasuk transfer_out)');
});

test('DashboardHubSummary.render() — bersih bulan ini negatif: class "red" dipakai (reuse .red yang sudah ada)', () => {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 5).toISOString();
  const D = {
    transactions: [
      { date: thisMonth, type: 'income', amount: 100000 },
      { date: thisMonth, type: 'expense', amount: 900000 },
    ],
  };
  const fmt = (n) => 'Rp ' + n;
  const { DashboardHubSummary, fakeDocument } = loadSummary({ D, fmt });
  DashboardHubSummary.render();
  const html = fakeDocument.getElementById('dashHubSummaryGrid').innerHTML;
  assert.match(html, /Rp -?800000/, 'bersih bulan ini harus -800.000 (100rb - 900rb)');
  assert.match(html, /dashhub-summary-val red">-Rp 800000/, 'bersih negatif harus pakai class red & tanda minus di depan');
});

test('DashboardHubSummary tidak mengubah fungsi Hero (_dashHubHeroMonthTx tetap terpisah dari _dashHubSummaryMonthTx)', () => {
  // Guard konstruksi: Summary Cards TIDAK boleh memanggil/mereuse fungsi
  // Hero secara langsung (constraint: Hero Card tidak diubah) — dites lewat
  // memastikan kedua fungsi punya nama & instance berbeda di sandbox yang
  // sama, dan modifikasi salah satu tidak memengaruhi yang lain.
  const ctx = loadSource(['dashboard-hub.js'], {
    FEATURE_REGISTRY: undefined,
    document: makeSummaryDoc(),
  }, ['DashboardHubHero', 'DashboardHubSummary']);
  assert.notEqual(ctx.DashboardHubHero, undefined);
  assert.notEqual(ctx.DashboardHubSummary, undefined);
  assert.notEqual(ctx.DashboardHubHero, ctx.DashboardHubSummary);
});

// ---------- Integrasi ke DashboardHub.render() (harus additive, tidak mengubah grid/Hero) ----------

test('DashboardHub.render() — tetap memanggil DashboardHubSummary.render() tanpa mengubah rendering grid kategori maupun Hero Card', () => {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 5).toISOString();
  const D = { profile: { nama: 'Budi' }, transactions: [{ date: thisMonth, type: 'income', amount: 250000 }] };
  const totalSaldoAkun = () => 250000;
  const fmt = (n) => 'Rp ' + n;
  const fakeDocument = createFakeDocument({
    dashboardHubGrid: {},
    dashHubHeroGreet: {},
    dashHubHeroDate: {},
    dashHubHeroSaldo: {},
    dashHubHeroInc: {},
    dashHubHeroExp: {},
    dashHubSummaryGrid: {},
  });
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
  // Hero Card ikut terisi seperti sebelumnya (perilaku Tahap 2 tidak berubah)
  assert.equal(fakeDocument.getElementById('dashHubHeroGreet').textContent, 'Halo, Budi 👋');
  assert.equal(fakeDocument.getElementById('dashHubHeroSaldo').textContent, 'Rp 250000');
  // Summary Cards ikut terisi dari D yang sama
  const summaryHtml = fakeDocument.getElementById('dashHubSummaryGrid').innerHTML;
  assert.match(summaryHtml, /Rp 250000/);
  assert.match(summaryHtml, /Jumlah Transaksi/);
});
