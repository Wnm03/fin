'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

// Tahap 3a — migrasi 4 widget registry-driven (Refleksi, Kebebasan Finansial/FI,
// Dana Pensiun, Absensi) dari `#page-dashboard` (lama) ke section "Pinned
// Widgets" di dalam `#page-dashboard-hub` (baru). Blueprint §7 menegaskan
// migrasi ini HANYA memindah markup HTML (elemen dgn id yang sama dipindah ke
// parent baru) — DASH_CARD_DEFS/DASH_RENDER_ORDER/isDashCardOn()/
// renderDashboard() di modules-render.js TIDAK disentuh sama sekali. Test ini
// dipecah dua bagian:
//   1. Tes struktur HTML (index.html & app_production.html) — id tidak
//      duplikat, widget benar-benar pindah ke hub, page-dashboard lama tidak
//      menyisakan elemen kosong, kedua file tetap identik.
//   2. Tes perilaku render — menjalankan modules-render.js ASLI (bukan
//      re-implementasi) lewat loadSource(), memverifikasi isDashCardOn() tetap
//      mengontrol ke-4 widget itu & urutan DASH_RENDER_ORDER tidak berubah.

const ROOT = path.join(__dirname, '..');
const HTML_FILES = ['index.html', 'app_production.html'];

// key -> elId, diambil dari sumber asli (bukan angka hardcode) supaya test
// otomatis ikut benar kalau suatu saat elId-nya memang sengaja diganti lewat
// keputusan produk yang direview (bukan diam-diam).
const MIGRATED = { refleksi: 'refleksiCard', fi: 'dashFiCard', pensiun: 'dashPensiunCard', absensi: 'dashAbsensiCard' };

function readHtml(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

// Ambil substring blok "<div class="page"... id="X">...</div>" yang balanced
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
  test(`${file}: keempat widget Tahap 3a masing-masing muncul TEPAT SEKALI (tidak duplikat)`, () => {
    const html = readHtml(file);
    for (const [key, elId] of Object.entries(MIGRATED)) {
      const count = (html.match(new RegExp(`id="${elId}"`, 'g')) || []).length;
      assert.equal(count, 1, `id="${elId}" (widget "${key}") muncul ${count}x di ${file}, seharusnya 1x`);
    }
  });

  test(`${file}: keempat widget Tahap 3a berada DI DALAM #page-dashboard-hub`, () => {
    const html = readHtml(file);
    const hubBlock = extractPageBlock(html, 'page-dashboard-hub');
    for (const [key, elId] of Object.entries(MIGRATED)) {
      assert.match(hubBlock, new RegExp(`id="${elId}"`), `Widget "${key}" (id="${elId}") tidak ditemukan di dalam #page-dashboard-hub`);
    }
  });

  test(`${file}: keempat widget Tahap 3a TIDAK LAGI berada di #page-dashboard (lama), tidak ada elemen kosong tersisa`, () => {
    const html = readHtml(file);
    const oldBlock = extractPageBlock(html, 'page-dashboard');
    for (const [key, elId] of Object.entries(MIGRATED)) {
      assert.doesNotMatch(oldBlock, new RegExp(`id="${elId}"`), `Widget "${key}" (id="${elId}") masih tersisa di #page-dashboard lama`);
    }
  });

  test(`${file}: #page-dashboard-hub punya section "Pinned Widgets"`, () => {
    const html = readHtml(file);
    const hubBlock = extractPageBlock(html, 'page-dashboard-hub');
    assert.match(hubBlock, /Pinned Widgets/, 'Section "Pinned Widgets" tidak ditemukan di #page-dashboard-hub');
  });
}

test('index.html dan app_production.html tetap identik (HTML parity)', () => {
  const [a, b] = HTML_FILES.map(readHtml);
  assert.equal(a, b, 'index.html dan app_production.html berbeda isi — harus disinkronkan manual (lihat build.js poin 6)');
});

test('index.html: tag <div> seimbang (open === close) — migrasi tidak merusak struktur HTML', () => {
  const html = readHtml('index.html');
  const opens = (html.match(/<div/g) || []).length;
  const closes = (html.match(/<\/div>/g) || []).length;
  assert.equal(opens, closes, `<div> tidak seimbang: ${opens} open vs ${closes} close`);
});

// ---------------------------------------------------------------------------
// 2. Perilaku render (modules-render.js ASLI via loadSource, bukan
//    re-implementasi) — hanya menguji INVARIAN, tidak mengubah algoritma.
// ---------------------------------------------------------------------------

// Stub lengkap utk semua 17 key di DASH_CARD_DEFS supaya renderDashboard()
// bisa dijalankan end-to-end tanpa ReferenceError. Yang PENTING diverifikasi
// cuma 4 widget Tahap 3a (`calls`); sisanya cuma perlu "tidak meledak".
function makeStubs() {
  const calls = { refleksi: 0, fi: 0, pensiun: 0, absensi: 0 };
  const Budget = { renderDashMini: () => {} };
  const Zakat = { renderDashMini: () => {} };
  const FI = { renderFinancialFreedom: () => { calls.fi++; } };
  const Pensiun = { renderDashMini: () => { calls.pensiun++; } };
  const Payroll = { renderDashMini: () => { calls.absensi++; } };
  const Refleksi = { renderDashCard: () => { calls.refleksi++; } };
  const DanaDaruratAI = { renderDash: () => {} };
  const TimelineW = { render: () => {} };
  const EduFund = { renderDashMini: () => {} };
  const LifeBalance = { render: () => {} };
  const renderSiapPulang = () => {};
  const fmt = (n) => String(n);
  return { calls, Budget, Zakat, FI, Pensiun, Payroll, Refleksi, DanaDaruratAI, TimelineW, EduFund, LifeBalance, renderSiapPulang, fmt };
}

function makeD(dashCardPrefs) {
  return { transactions: [], cobek: [], bills: [], accounts: [], dashCardPrefs };
}

function run(dashCardPrefs) {
  const stubs = makeStubs();
  const fakeDocument = createFakeDocument();
  const warnings = [];
  const ctx = loadSource(['modules-render.js'], {
    D: makeD(dashCardPrefs),
    document: fakeDocument,
    ...stubs,
    console: { ...console, warn: (...a) => warnings.push(a) },
  }, ['DASH_RENDER_ORDER', 'DASH_CARD_DEFS']);
  return { ctx, calls: stubs.calls, fakeDocument, warnings };
}

test('DASH_RENDER_ORDER: keempat key Tahap 3a (refleksi/fi/pensiun/absensi) masih terdaftar, urutan relatif tidak berubah', () => {
  const { ctx } = run({});
  const order = [...ctx.DASH_RENDER_ORDER];
  for (const key of Object.keys(MIGRATED)) {
    assert.ok(order.includes(key), `key "${key}" hilang dari DASH_RENDER_ORDER`);
  }
  // Urutan relatif asli (lihat modules-render.js): ...'fi','pensiun','absensi',...,'refleksi'
  const idxFi = order.indexOf('fi');
  const idxPensiun = order.indexOf('pensiun');
  const idxAbsensi = order.indexOf('absensi');
  const idxRefleksi = order.indexOf('refleksi');
  assert.ok(idxFi < idxPensiun, 'urutan fi harus sebelum pensiun (DASH_RENDER_ORDER berubah)');
  assert.ok(idxPensiun < idxAbsensi, 'urutan pensiun harus sebelum absensi (DASH_RENDER_ORDER berubah)');
  assert.ok(idxAbsensi < idxRefleksi, 'urutan absensi harus sebelum refleksi (DASH_RENDER_ORDER berubah)');
});

test('setiap key Tahap 3a di DASH_CARD_DEFS elId-nya sesuai id HTML yang sudah dipindah', () => {
  const { ctx } = run({});
  const byKey = {};
  ctx.DASH_CARD_DEFS.forEach((c) => { byKey[c.key] = c; });
  for (const [key, elId] of Object.entries(MIGRATED)) {
    assert.ok(byKey[key], `key "${key}" tidak ada di DASH_CARD_DEFS`);
    assert.equal(byKey[key].elId, elId, `elId utk key "${key}" berubah (seharusnya tetap "${elId}")`);
  }
});

test('renderDashboard() — semua widget ON (default): keempat widget Tahap 3a dirender via isDashCardOn(), masing-masing TEPAT SEKALI', () => {
  const { ctx, calls, warnings } = run({}); // dashCardPrefs kosong => semua isDashCardOn() true (default)
  assert.doesNotThrow(() => ctx.renderDashboard());
  assert.equal(calls.refleksi, 1, 'Refleksi.renderDashCard() harus terpanggil tepat 1x');
  assert.equal(calls.fi, 1, 'FI.renderFinancialFreedom() harus terpanggil tepat 1x');
  assert.equal(calls.pensiun, 1, 'Pensiun.renderDashMini() harus terpanggil tepat 1x');
  assert.equal(calls.absensi, 1, 'Payroll.renderDashMini() harus terpanggil tepat 1x');
  const ourWarnings = warnings.filter((w) => Object.keys(MIGRATED).some((k) => String(w[0]).includes(`"${k}"`)));
  assert.deepEqual(ourWarnings, [], 'tidak boleh ada card Tahap 3a yang gagal dirender (masuk try/catch) saat semua ON');
});

test('renderDashboard() — widget OFF via dashCardPrefs: TIDAK dirender & elemennya disembunyikan (bukan cuma dilewati)', () => {
  const { ctx, calls, fakeDocument } = run({ refleksi: false, fi: false, pensiun: false, absensi: false });
  assert.doesNotThrow(() => ctx.renderDashboard());
  assert.equal(calls.refleksi, 0, 'Refleksi OFF seharusnya tidak dirender sama sekali');
  assert.equal(calls.fi, 0, 'FI OFF seharusnya tidak dirender sama sekali');
  assert.equal(calls.pensiun, 0, 'Pensiun OFF seharusnya tidak dirender sama sekali');
  assert.equal(calls.absensi, 0, 'Absensi OFF seharusnya tidak dirender sama sekali');
  for (const elId of Object.values(MIGRATED)) {
    const el = fakeDocument.getElementById(elId);
    assert.ok(el.classList.contains('u-dnone'), `elemen #${elId} harus dapat class u-dnone saat OFF (hideDashCardEl)`);
    assert.equal(el.style.display, 'none', `elemen #${elId} harus style.display=none saat OFF (hideDashCardEl)`);
  }
});

test('renderDashboard() — ON/OFF campuran: hanya widget yang ON yang dirender, sisanya tidak', () => {
  const { ctx, calls } = run({ fi: false, absensi: false }); // refleksi & pensiun tetap ON (default)
  assert.doesNotThrow(() => ctx.renderDashboard());
  assert.equal(calls.fi, 0, 'FI di-set OFF, tidak boleh dirender');
  assert.equal(calls.absensi, 0, 'Absensi di-set OFF, tidak boleh dirender');
  assert.equal(calls.refleksi, 1, 'Refleksi tetap ON, harus dirender');
  assert.equal(calls.pensiun, 1, 'Pensiun tetap ON, harus dirender');
});

test('isDashCardOn() — perilaku on/off generik (fungsi asli, tidak diubah) tetap benar utk ke-4 key Tahap 3a', () => {
  const { ctx } = run({ fi: false });
  assert.equal(ctx.isDashCardOn('fi'), false);
  assert.equal(ctx.isDashCardOn('pensiun'), true);
  assert.equal(ctx.isDashCardOn('refleksi'), true);
  assert.equal(ctx.isDashCardOn('absensi'), true);
});

test('renderDashboard() dipanggil berkali-kali (simulasi refresh dari modul lain, mis. akun.js/transaksi.js) — tidak melempar error & tidak double-render dalam satu panggilan', () => {
  const { ctx, calls } = run({});
  assert.doesNotThrow(() => { ctx.renderDashboard(); ctx.renderDashboard(); });
  // Dipanggil 2x scara terpisah => tiap widget harus tepat 2x total (1x per
  // panggilan), BUKAN lebih dari 2 (yang berarti ada double-registration/duplikasi
  // di dalam satu render loop).
  assert.equal(calls.refleksi, 2);
  assert.equal(calls.fi, 2);
  assert.equal(calls.pensiun, 2);
  assert.equal(calls.absensi, 2);
});
