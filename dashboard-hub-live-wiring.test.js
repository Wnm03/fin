'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Pola sama dgn tests/dash-card-registry.test.js: modules-render.js terlalu besar & bergantung
// ke banyak modul lain buat dijalankan lewat VM, jadi test ini regex-parse source-nya langsung.
// Yang dijaga: renderDashboard() (dipanggil dari puluhan titik save() di seluruh app) juga
// menyambungkan (bukan cuma DashboardHub.render() yang hanya jalan saat navigasi) 5 widget live
// Dashboard Hub — supaya kalau salah satu baris wiring ini dihapus/kelupaan tanpa sadar di sesi
// berikutnya, test ini gagal duluan sebelum sempat ke-release.
const SRC = fs.readFileSync(
  path.join(__dirname, '..', '..', 'modules/shared/modules-render.js'),
  'utf8'
);

function renderDashboardBody() {
  const start = SRC.indexOf('function renderDashboard(){');
  assert.ok(start !== -1, 'function renderDashboard() tidak ditemukan di modules-render.js');
  // Ambil sampai penutup fungsi berikutnya (function renderDashLaporanMini) — cukup untuk
  // memastikan baris wiring ada DI DALAM renderDashboard(), bukan di fungsi lain.
  const end = SRC.indexOf('function renderDashLaporanMini', start);
  assert.ok(end !== -1, 'Penanda akhir renderDashboard() (renderDashLaporanMini) tidak ditemukan');
  return SRC.slice(start, end);
}

test('renderDashboard() menyambungkan 5 widget live Dashboard Hub (Hero/Summary/Analytics/Favorit/EIE)', () => {
  const body = renderDashboardBody();
  const expected = [
    'DashboardHubHero',
    'DashboardHubSummary',
    'DashboardHubAnalytics',
    'DashboardHubFavoritView',
    'EIEDashboard',
  ];
  for (const name of expected) {
    assert.match(
      body,
      new RegExp(`typeof ${name}!==['"]undefined['"]\\)${name}\\.render\\(\\)`),
      `renderDashboard() tidak lagi memanggil ${name}.render() secara guarded (typeof check) — widget ini tidak akan ter-update live lagi saat data berubah di halaman lain.`
    );
  }
});

test('wiring live Dashboard Hub dibungkus try/catch sendiri (tidak boleh menjatuhkan sisa renderDashboard())', () => {
  const body = renderDashboardBody();
  const wiringStart = body.indexOf('DASHBOARD HUB — LIVE WIRING');
  assert.ok(wiringStart !== -1, 'Komentar penanda blok live-wiring tidak ditemukan');
  const wiringBlock = body.slice(wiringStart);
  const tryIdx = wiringBlock.indexOf('try{');
  const catchIdx = wiringBlock.indexOf('}catch(e){');
  assert.ok(tryIdx !== -1 && catchIdx !== -1 && tryIdx < catchIdx, 'Blok live-wiring harus dibungkus try/catch sendiri, terpisah dari loop DASH_RENDER_ORDER di atasnya');
});
