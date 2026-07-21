'use strict';
// tests/cross-module-integration-hardening.test.js — Regression test S118
// (Cross Module Integration Hardening, lanjutan S116/S117).
//
// Audit S118 menemukan 1 gap wiring nyata: DashboardHub.render() (dipanggil
// saat navigasi/showPage) memanggil 5 presenter cross-module berurutan —
// CrossDashboardCard, CrossInsightPresenter, UnifiedBriefingPresenter,
// UnifiedDashboardHome, DecisionCenterHome — TAPI renderDashboard() (live-
// wiring di modules/shared/modules-render.js, dipanggil dari puluhan titik
// save() di seluruh app) hanya menyambungkan 4 dari 5 (DecisionCenterHome
// tertinggal). Akibatnya Recommendation Panel & Action Queue tidak ikut
// ter-update kalau user tetap di halaman Dashboard Hub lalu menyimpan data
// dari halaman lain (Keuangan/Vehicle/dst) — beda perilaku dari 4 presenter
// cross lain yang SUDAH live. Diperbaiki sesi ini (S118): 1 baris
// ditambahkan ke renderDashboard(), 100% reuse DecisionCenterHome.render()
// yang sudah ada, 0 rumus/mekanisme baru.
//
// Test ini dibuat generik (regex-parse source ASLI, bukan daftar hardcode
// yang gampang basi) — sama gaya dgn tests/dashboard-hub-live-wiring.test.js
// & tests/cross-module-graph-static.test.js — supaya kalau ada presenter
// cross baru ditambahkan ke salah satu sisi (DashboardHub.render() ATAU
// renderDashboard()) tanpa disambungkan ke sisi yang lain, test ini gagal
// duluan sebelum sempat ke-release.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DASHBOARD_HUB_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'modules/dashboard-hub/dashboard-hub.js'),
  'utf8'
);
const MODULES_RENDER_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'modules/shared/modules-render.js'),
  'utf8'
);

// Daftar presenter cross-module yang render()-nya WAJIB dipanggil dari kedua
// jalur (DashboardHub.render() = navigasi, renderDashboard() = live-refresh)
// — diambil dari modules/cross/*.js yang punya method render() dipanggil
// langsung oleh salah satu dari kedua orchestrator ini (bukan lewat
// UnifiedDashboardHome/DecisionCenterHome — keduanya SUDAH orchestrator
// tipis yang membungkus presenter-presenter lain, jadi cukup dicek 1 titik).
const CROSS_RENDER_ENTRYPOINTS = [
  'CrossDashboardCard',
  'CrossInsightPresenter',
  'UnifiedBriefingPresenter',
  'UnifiedDashboardHome',
  'DecisionCenterHome',
];

function guardedCallPattern(name) {
  return new RegExp(`typeof ${name}\\s*!==\\s*['"]undefined['"]\\)\\s*${name}\\.render\\(\\)`);
}

test('DashboardHub.render() menyambungkan seluruh 5 entrypoint render cross-module', () => {
  for (const name of CROSS_RENDER_ENTRYPOINTS) {
    assert.match(
      DASHBOARD_HUB_SRC,
      guardedCallPattern(name),
      `DashboardHub.render() tidak (lagi) memanggil ${name}.render() secara guarded (typeof check)`
    );
  }
});

test('renderDashboard() (live-wiring) menyambungkan seluruh 5 entrypoint render cross-module yang sama (paritas dgn DashboardHub.render())', () => {
  for (const name of CROSS_RENDER_ENTRYPOINTS) {
    assert.match(
      MODULES_RENDER_SRC,
      guardedCallPattern(name),
      `renderDashboard() tidak memanggil ${name}.render() secara guarded (typeof check) — presenter ini tidak akan ter-update live saat data berubah di halaman lain (gap S118 sama persis DecisionCenterHome, harus diperbaiki bukan diabaikan).`
    );
  }
});

// countGuardedCalls() — hitung HANYA baris pemanggilan guarded (`typeof X
// !== 'undefined') X.render()`) yang sungguhan dieksekusi, BUKAN penyebutan
// prosa di komentar (mis. "pola sama dgn CrossDashboardCard.render() di
// atas") — regex.match count polos di atas sempat false-positive krn
// beberapa komentar sengaja menyebut nama presenter+`.render()` sbg
// referensi silang antar-baris kode.
function countGuardedCalls(src, name) {
  const matches = src.match(new RegExp(`typeof ${name}\\s*!==\\s*['"]undefined['"]\\)\\s*${name}\\.render\\(\\)`, 'g')) || [];
  return matches.length;
}

test('tidak ada entrypoint render cross-module yang dipanggil dua kali di renderDashboard() (0 duplikasi wiring)', () => {
  for (const name of CROSS_RENDER_ENTRYPOINTS) {
    const count = countGuardedCalls(MODULES_RENDER_SRC, name);
    assert.equal(count, 1, `${name}.render() harus dipanggil TEPAT 1x (guarded) di modules-render.js, ditemukan ${count}x`);
  }
});

test('tidak ada entrypoint render cross-module yang dipanggil dua kali di DashboardHub.render() (0 duplikasi wiring)', () => {
  for (const name of CROSS_RENDER_ENTRYPOINTS) {
    const count = countGuardedCalls(DASHBOARD_HUB_SRC, name);
    assert.equal(count, 1, `${name}.render() harus dipanggil TEPAT 1x (guarded) di dashboard-hub.js, ditemukan ${count}x`);
  }
});
