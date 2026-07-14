'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

// Tahap 3b — migrasi 2 widget "inti" Dashboard (AI Advisor/`advisorCard` &
// Skor Hidup Seimbang/`lifeBalanceCard`) dari `#page-dashboard` (lama) ke
// section "Pinned Widgets" di dalam `#page-dashboard-hub` (baru). Sama
// seperti Tahap 3a, migrasi ini HANYA memindah markup HTML (elemen dgn id
// yang sama dipindah ke parent baru) — TIDAK ada dashKey/DASH_CARD_DEFS
// entry utk kedua widget ini (mereka "kartu inti", selalu tampil, dipanggil
// LANGSUNG & TANPA SYARAT di awal renderDashboard(): Advisor.render(),
// AIWidget.render(), FinCoach.renderDash(), LifeBalance.render() — lihat
// komentar { page, goTo } di dashboard-hub-registry.js). Test ini dipecah
// dua bagian, sama seperti dashboard-hub-pinned-widgets.test.js:
//   1. Tes struktur HTML — id tidak duplikat, widget benar-benar pindah ke
//      hub, page-dashboard lama tidak menyisakan elemen kosong, kedua file
//      tetap identik, <div> tetap balanced.
//   2. Tes perilaku render — menjalankan modules-render.js ASLI (bukan
//      re-implementasi) lewat loadSource(), memverifikasi Advisor/AIWidget/
//      FinCoach/LifeBalance tetap terpanggil TEPAT SEKALI dari
//      renderDashboard() (tidak double-render, tidak hilang).

const ROOT = path.join(__dirname, '..');
const HTML_FILES = ['index.html', 'app_production.html'];
const MIGRATED = { advisor: 'advisorCard', lifeBalance: 'lifeBalanceCard' };

function readHtml(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

// Sama persis dgn extractPageBlock di dashboard-hub-pinned-widgets.test.js
// (brace-counting ala extractFunction di loadSource.js, tapi utk tag <div>).
function extractPageBlock(html, pageId) {
  const re = new RegExp(`<div class="page[^"]*" id="${pageId}">`);
  const m = html.match(re);
  assert.ok(m, `Blok <div id="${pageId}"> tidak ditemukan`);
  const start = m.index;
  let i = start + m[0].length;
  let depth = 1;
  while (i < html.length && depth > 0) {
    if (html.startsWith('<div', i)) { depth++; i += 4; continue; }
    if (html.startsWith('</div>', i)) { depth--; i += 6; continue; }
    i++;
  }
  return html.slice(start, i);
}

// ---------------------------------------------------------------------------
// 1. Struktur HTML
// ---------------------------------------------------------------------------

for (const file of HTML_FILES) {
  test(`${file}: advisorCard & lifeBalanceCard masing-masing muncul TEPAT SEKALI (tidak duplikat)`, () => {
    const html = readHtml(file);
    for (const [key, elId] of Object.entries(MIGRATED)) {
      const count = (html.match(new RegExp(`id="${elId}"`, 'g')) || []).length;
      assert.equal(count, 1, `id="${elId}" (widget "${key}") muncul ${count}x di ${file}, seharusnya 1x`);
    }
  });

  test(`${file}: advisorCard & lifeBalanceCard berada DI DALAM #page-dashboard-hub`, () => {
    const html = readHtml(file);
    const hubBlock = extractPageBlock(html, 'page-dashboard-hub');
    for (const [key, elId] of Object.entries(MIGRATED)) {
      assert.match(hubBlock, new RegExp(`id="${elId}"`), `Widget "${key}" (id="${elId}") tidak ditemukan di dalam #page-dashboard-hub`);
    }
  });

  test(`${file}: advisorCard & lifeBalanceCard TIDAK LAGI berada di #page-dashboard (lama), tidak ada elemen kosong tersisa`, () => {
    const html = readHtml(file);
    const oldBlock = extractPageBlock(html, 'page-dashboard');
    for (const [key, elId] of Object.entries(MIGRATED)) {
      assert.doesNotMatch(oldBlock, new RegExp(`id="${elId}"`), `Widget "${key}" (id="${elId}") masih tersisa di #page-dashboard lama`);
    }
  });

  test(`${file}: seluruh id turunan advisorCard (tab/panel/tombol) & lifeBalanceCard (skor/ring/bar) ikut pindah bersama, tidak nyangkut di page lama`, () => {
    const html = readHtml(file);
    const hubBlock = extractPageBlock(html, 'page-dashboard-hub');
    const oldBlock = extractPageBlock(html, 'page-dashboard');
    const childIds = [
      'advisorCard-chev', 'advisorTabBtn-coach', 'advisorTabBtn-report',
      'advisorPanel-coach', 'advisorPanel-report', 'finCoachBody',
      'aiWidgetBody', 'aiWidgetGenBtn',
      'lifeBalanceCard-chev', 'lifeBalanceCard-cbody', 'lbRing', 'lbScoreNum',
      'lbLevel', 'lbSummary', 'lbTrendBadge', 'lbBars', 'lbDataNote', 'lbFocus',
    ];
    for (const id of childIds) {
      assert.match(hubBlock, new RegExp(`id="${id}"`), `id="${id}" tidak ditemukan di dalam #page-dashboard-hub`);
      assert.doesNotMatch(oldBlock, new RegExp(`id="${id}"`), `id="${id}" masih tersisa di #page-dashboard lama`);
    }
  });
}

test('index.html dan app_production.html tetap identik (HTML parity) setelah migrasi Tahap 3b', () => {
  const [a, b] = HTML_FILES.map(readHtml);
  assert.equal(a, b, 'index.html dan app_production.html berbeda isi — harus disinkronkan manual (lihat build.js poin 6)');
});

test('index.html: tag <div> seimbang (open === close) — migrasi Tahap 3b tidak merusak struktur HTML', () => {
  const html = readHtml('index.html');
  const opens = (html.match(/<div/g) || []).length;
  const closes = (html.match(/<\/div>/g) || []).length;
  assert.equal(opens, closes, `<div> tidak seimbang: ${opens} open vs ${closes} close`);
});

// ---------------------------------------------------------------------------
// 2. Perilaku render (modules-render.js ASLI via loadSource, bukan
//    re-implementasi) — hanya menguji INVARIAN, tidak mengubah algoritma.
// ---------------------------------------------------------------------------

// Stub lengkap utk semua key di DASH_CARD_DEFS + Advisor/AIWidget/FinCoach/
// LifeBalance ("kartu inti", di luar DASH_CARD_DEFS) supaya renderDashboard()
// bisa dijalankan end-to-end tanpa ReferenceError. Yang PENTING diverifikasi
// cuma call-count Advisor/AIWidget/FinCoach/LifeBalance; sisanya cuma perlu
// "tidak meledak" (pola sama dgn dashboard-hub-pinned-widgets.test.js).
function makeStubs() {
  const calls = { advisor: 0, aiWidget: 0, finCoach: 0, lifeBalance: 0 };
  const Budget = { renderDashMini: () => {} };
  const Zakat = { renderDashMini: () => {} };
  const FI = { renderFinancialFreedom: () => {} };
  const Pensiun = { renderDashMini: () => {} };
  const Payroll = { renderDashMini: () => {} };
  const Refleksi = { renderDashCard: () => {} };
  const DanaDaruratAI = { renderDash: () => {} };
  const TimelineW = { render: () => {} };
  const EduFund = { renderDashMini: () => {} };
  const LifeBalance = { render: () => { calls.lifeBalance++; } };
  const Advisor = { render: () => { calls.advisor++; } };
  const AIWidget = { render: () => { calls.aiWidget++; } };
  const FinCoach = { renderDash: () => { calls.finCoach++; } };
  const renderSiapPulang = () => {};
  const fmt = (n) => String(n);
  return {
    calls, Budget, Zakat, FI, Pensiun, Payroll, Refleksi, DanaDaruratAI,
    TimelineW, EduFund, LifeBalance, Advisor, AIWidget, FinCoach,
    renderSiapPulang, fmt,
  };
}

function makeD() {
  return { transactions: [], cobek: [], bills: [], accounts: [], dashCardPrefs: {} };
}

function run() {
  const stubs = makeStubs();
  const fakeDocument = createFakeDocument();
  const warnings = [];
  const ctx = loadSource(['modules-render.js'], {
    D: makeD(),
    document: fakeDocument,
    ...stubs,
    console: { ...console, warn: (...a) => warnings.push(a) },
  }, ['renderDashboard']);
  return { ctx, calls: stubs.calls, fakeDocument, warnings };
}

test('renderDashboard() — AI Advisor (Advisor.render()) berhasil dirender, TEPAT SEKALI (tidak double-render)', () => {
  const { ctx, calls } = run();
  assert.doesNotThrow(() => ctx.renderDashboard());
  assert.equal(calls.advisor, 1, 'Advisor.render() harus terpanggil tepat 1x per renderDashboard()');
});

test('renderDashboard() — Laporan AI (AIWidget.render()) berhasil dirender, TEPAT SEKALI (tidak double-render)', () => {
  const { ctx, calls } = run();
  assert.doesNotThrow(() => ctx.renderDashboard());
  assert.equal(calls.aiWidget, 1, 'AIWidget.render() harus terpanggil tepat 1x per renderDashboard()');
});

test('renderDashboard() — Insight Cepat (FinCoach.renderDash()) berhasil dirender, TEPAT SEKALI (tidak double-render)', () => {
  const { ctx, calls } = run();
  assert.doesNotThrow(() => ctx.renderDashboard());
  assert.equal(calls.finCoach, 1, 'FinCoach.renderDash() harus terpanggil tepat 1x per renderDashboard()');
});

test('renderDashboard() — Skor Hidup Seimbang (LifeBalance.render()) berhasil dirender, TEPAT SEKALI (tidak double-render)', () => {
  const { ctx, calls } = run();
  assert.doesNotThrow(() => ctx.renderDashboard());
  assert.equal(calls.lifeBalance, 1, 'LifeBalance.render() harus terpanggil tepat 1x per renderDashboard()');
});

test('renderDashboard() dipanggil 2x berturut-turut (mis. buka Beranda lalu ganti data): masing-masing widget inti tetap 1x PER PANGGILAN, totalnya 2x — bukan double-render dalam 1x panggilan', () => {
  const { ctx, calls } = run();
  ctx.renderDashboard();
  ctx.renderDashboard();
  assert.equal(calls.advisor, 2, 'Advisor.render() harus 1x per panggilan renderDashboard() (2 panggilan = 2x)');
  assert.equal(calls.aiWidget, 2, 'AIWidget.render() harus 1x per panggilan renderDashboard() (2 panggilan = 2x)');
  assert.equal(calls.finCoach, 2, 'FinCoach.renderDash() harus 1x per panggilan renderDashboard() (2 panggilan = 2x)');
  assert.equal(calls.lifeBalance, 2, 'LifeBalance.render() harus 1x per panggilan renderDashboard() (2 panggilan = 2x)');
});

