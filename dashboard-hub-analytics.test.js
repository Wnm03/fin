'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

// dashboard-hub-analytics.test.js — Sprint 1 Tahap 7 (DASHBOARD-ANALYTICS.md).
// DashboardHubAnalytics dites di sini SENDIRI (bukan digabung ke
// tests/dashboard-hub.test.js/dashboard-hub-summary.test.js), pola sama
// persis dgn dashboard-hub-summary.test.js: dashboard-hub.js di-load APA
// ADANYA lewat loadSource() (bukan disalin ulang), document tiruan dipakai
// krn DashboardHubAnalytics baca/tulis DOM langsung lewat innerHTML.

function makeAnalyticsDoc(initial = {}) {
  return createFakeDocument({
    dashHubAnalyticsRow: {},
    ...initial,
  });
}

function loadAnalytics(extraGlobals = {}) {
  const { document: docOverride, ...rest } = extraGlobals;
  const fakeDocument = docOverride || makeAnalyticsDoc();
  const ctx = loadSource(['dashboard-hub.js'], {
    FEATURE_REGISTRY: undefined,
    escapeHtml: (s) => String(s ?? ''),
    ...rest,
    document: fakeDocument,
  }, ['DashboardHubAnalytics']);
  return { DashboardHubAnalytics: ctx.DashboardHubAnalytics, fakeDocument };
}

test('dashboard-hub.js (dgn DashboardHubAnalytics baru) tetap berhasil diload tanpa error', () => {
  assert.doesNotThrow(() => loadAnalytics());
});

test('DashboardHubAnalytics.render() — elemen container tidak ada di DOM: tidak error, tidak melempar', () => {
  const emptyDoc = {
    getElementById: () => null,
    querySelectorAll: () => [],
  };
  const { DashboardHubAnalytics } = loadAnalytics({ document: emptyDoc });
  assert.doesNotThrow(() => DashboardHubAnalytics.render());
});

test('DashboardHubAnalytics.render() — TANPA D (belum di-load): tidak error, tampil angka nol/placeholder yang aman', () => {
  const { DashboardHubAnalytics, fakeDocument } = loadAnalytics();
  assert.doesNotThrow(() => DashboardHubAnalytics.render());
  const html = fakeDocument.getElementById('dashHubAnalyticsRow').innerHTML;
  assert.match(html, /Transaksi Bulan Ini/);
  assert.match(html, /Total Pemasukan/);
  assert.match(html, /Total Pengeluaran/);
  assert.match(html, /Saldo Bersih/);
  assert.match(html, /Pemasukan vs Pengeluaran/);
  assert.match(html, /Rp 0/);
  assert.match(html, /—/, 'persentase harus tampil placeholder "—" saat belum ada nominal (total 0)');
});

test('DashboardHubAnalytics.render() — transaksi/pemasukan/pengeluaran/bersih dihitung dari D.transactions bulan berjalan (pola sama dgn Summary Cards)', () => {
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
  const { DashboardHubAnalytics, fakeDocument } = loadAnalytics({ D, fmt });
  DashboardHubAnalytics.render();
  const html = fakeDocument.getElementById('dashHubAnalyticsRow').innerHTML;
  assert.match(html, />4</, 'jumlah transaksi bulan ini harus 4 (semua tx bulan berjalan, termasuk transfer_out)');
  assert.match(html, /Rp 1500000/, 'total pemasukan bulan ini harus 1.000.000 + 500.000');
  assert.match(html, /Rp 300000/, 'total pengeluaran bulan ini harus 300.000');
  assert.match(html, /Rp 1200000/, 'saldo bersih bulan ini harus 1.500.000 - 300.000');
  // pemasukan 1.500.000, pengeluaran 300.000 -> total 1.800.000 -> 83% : 17%
  assert.match(html, /83% : 17%/, 'persentase pemasukan vs pengeluaran harus dibulatkan dari 1.500.000/1.800.000 dan 300.000/1.800.000');
});

test('DashboardHubAnalytics.render() — saldo bersih negatif: class "red" dipakai (reuse .red yang sudah ada)', () => {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 5).toISOString();
  const D = {
    transactions: [
      { date: thisMonth, type: 'income', amount: 100000 },
      { date: thisMonth, type: 'expense', amount: 900000 },
    ],
  };
  const fmt = (n) => 'Rp ' + n;
  const { DashboardHubAnalytics, fakeDocument } = loadAnalytics({ D, fmt });
  DashboardHubAnalytics.render();
  const html = fakeDocument.getElementById('dashHubAnalyticsRow').innerHTML;
  assert.match(html, /Rp -?800000/, 'saldo bersih harus -800.000 (100rb - 900rb)');
  assert.match(html, /dashhub-analytics-val red">-Rp 800000/, 'saldo bersih negatif harus pakai class red & tanda minus di depan');
});

test('DashboardHubAnalytics tidak mengubah fungsi Hero/Summary (_dashHubHeroMonthTx/_dashHubSummaryMonthTx tetap terpisah dari _dashHubAnalyticsMonthTx)', () => {
  // Guard konstruksi: Dashboard Analytics TIDAK boleh memanggil/mereuse
  // fungsi Hero/Summary secara langsung (constraint: Hero Card & Summary
  // Cards tidak diubah) — dites lewat memastikan ketiga komponen punya nama
  // & instance berbeda di sandbox yang sama.
  const ctx = loadSource(['dashboard-hub.js'], {
    FEATURE_REGISTRY: undefined,
    document: makeAnalyticsDoc(),
  }, ['DashboardHubHero', 'DashboardHubSummary', 'DashboardHubAnalytics']);
  assert.notEqual(ctx.DashboardHubHero, undefined);
  assert.notEqual(ctx.DashboardHubSummary, undefined);
  assert.notEqual(ctx.DashboardHubAnalytics, undefined);
  assert.notEqual(ctx.DashboardHubHero, ctx.DashboardHubAnalytics);
  assert.notEqual(ctx.DashboardHubSummary, ctx.DashboardHubAnalytics);
});

// ---------- Integrasi ke DashboardHub.render() (harus additive, tidak mengubah Hero/Summary/Grid) ----------

test('DashboardHub.render() — tetap memanggil DashboardHubAnalytics.render() tanpa mengubah rendering grid kategori, Hero Card, maupun Summary Cards', () => {
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
    dashHubAnalyticsRow: {},
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
  // Summary Cards ikut terisi seperti sebelumnya (perilaku Tahap 5 tidak berubah)
  const summaryHtml = fakeDocument.getElementById('dashHubSummaryGrid').innerHTML;
  assert.match(summaryHtml, /Rp 250000/);
  assert.match(summaryHtml, /Jumlah Transaksi/);
  // Dashboard Analytics ikut terisi dari D yang sama
  const analyticsHtml = fakeDocument.getElementById('dashHubAnalyticsRow').innerHTML;
  assert.match(analyticsHtml, /Rp 250000/);
  assert.match(analyticsHtml, /Transaksi Bulan Ini/);
});
