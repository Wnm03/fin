'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// dashboard-hub-quickactions.test.js — Sprint 1 Tahap 3 (QUICK-ACTIONS.md).
// Quick Actions MURNI markup (HTML+CSS) — setiap tombol memanggil fungsi
// yang SUDAH ADA lewat data-onclick (pola sama dgn qs-action di
// qsDashboard/qsAI, lihat features-helpers-global-security.js baris
// "data-action],[data-onclick]"), tidak ada modul JS baru untuk dites lewat
// loadSource() seperti DashboardHubHero — jadi test di sini murni struktural
// terhadap index.html/app_production.html, pola sama dgn
// tests/dashboard-hub-default-landing.test.js.

const HTML_FILES = ['index.html', 'app_production.html'];

function readHtml(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

for (const file of HTML_FILES) {
  test(`${file}: #dashHubQuickActions ada, tepat di antara Hero Card dan search bar`, () => {
    const html = readHtml(file);
    const heroIdx = html.indexOf('id="dashHubHeroCard"');
    const qaIdx = html.indexOf('id="dashHubQuickActions"');
    const searchIdx = html.indexOf('id="dashHubSearchInput"');
    assert.notEqual(heroIdx, -1, 'Hero Card harus tetap ada');
    assert.notEqual(qaIdx, -1, 'Quick Actions harus ada');
    assert.notEqual(searchIdx, -1, 'Search bar harus tetap ada');
    assert.ok(heroIdx < qaIdx, 'Quick Actions harus SETELAH Hero Card');
    assert.ok(qaIdx < searchIdx, 'Quick Actions harus SEBELUM search bar');
  });

  test(`${file}: berisi tepat 5 tombol .dashhub-qa-btn`, () => {
    const html = readHtml(file);
    const btnMatches = [...html.matchAll(/class="dashhub-qa-btn"/g)];
    assert.equal(btnMatches.length, 5);
  });

  test(`${file}: tiap tombol Quick Action memanggil fungsi yang SUDAH ADA (bukan business logic baru)`, () => {
    const html = readHtml(file);
    // openTxModal, openCatatan, openBackupModal, showPage sudah ada sejak
    // sebelum Tahap 3 (transaksi.js / backup-restore.js / modal-navigasi.js);
    // fokus ke #dashHubSearchInput murni DOM focus, bukan logic baru.
    assert.match(html, /data-onclick="openTxModal\('expense'\)"/);
    assert.match(html, /data-onclick="openCatatan\('anak'\)"/);
    assert.match(html, /data-onclick="openBackupModal\(\)"/);
    assert.match(html, /data-onclick="document\.getElementById\('dashHubSearchInput'\)\.focus\(\)"/);
    assert.match(html, /data-onclick="showPage\('ai',document\.querySelectorAll\('\.nav-item'\)\[3\]\)"/);
  });

  test(`${file}: Hero Card & Grid Dashboard tidak disentuh (elemen sebelum/sesudah Quick Actions tetap sama persis)`, () => {
    const html = readHtml(file);
    assert.match(html, /<div class="dashhub-hero" id="dashHubHeroCard">/);
    assert.match(html, /<div class="dashhub-wrap" id="dashboardHubWrap">/);
    assert.match(html, /<div class="dashhub-grid" id="dashboardHubGrid"><\/div>/);
  });
}

test('index.html & app_production.html tetap identik setelah Tahap 3', () => {
  assert.equal(readHtml('index.html'), readHtml('app_production.html'));
});

// ---------------------------------------------------------------------------
// CSS: token yang dipakai harus semuanya SUDAH ADA di :root (tidak ada token
// baru), pola sama dgn HERO-CARD.md §3.
// ---------------------------------------------------------------------------

test('styles.css: .dashhub-qa-row/.dashhub-qa-btn hanya pakai token yang sudah ada', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
  assert.match(css, /\.dashhub-qa-row\{/);
  assert.match(css, /\.dashhub-qa-btn\{/);
  const block = css.slice(css.indexOf('.dashhub-qa-row{'), css.indexOf('.dashhub-qa-row{') + 1500);
  const usedTokens = [...block.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((m) => m[1]);
  assert.ok(usedTokens.length > 0, 'Harus ada token dipakai');
  for (const t of usedTokens) {
    assert.match(css, new RegExp(t.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\s*:'), `Token ${t} harus terdefinisi di :root`);
  }
});
