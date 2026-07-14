'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createFakeElement } = require('./helpers/fakeDom');

// Tahap 4 — blueprint-dashboard-hub.md §5 "Ganti default". Dashboard Hub
// sekarang jadi halaman yang dibuka saat startup, murni lewat markup statis
// class="page active" dipindah dari page-dashboard ke page-dashboard-hub
// (§7: tidak ada mekanisme JS yang menentukan halaman awal). page-dashboard
// TIDAK dihapus (masih dipertahankan, isinya masih dipakai beberapa
// shortcut lain — mis. "Saldo Akun"/dLaporanMini yang datanya belum
// dipindah ke hub). Tombol Beranda di bottom-nav diretarget ke
// 'dashboard-hub' supaya konsisten dgn landing page baru (Langkah 3).

const HTML_FILES = ['index.html', 'app_production.html'];
const MODULES_RENDER = fs.readFileSync(path.join(__dirname, '..', 'modules-render.js'), 'utf8');
const MODAL_NAVIGASI = fs.readFileSync(path.join(__dirname, '..', 'modal-navigasi.js'), 'utf8');

function readHtml(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

// ---------------------------------------------------------------------------
// 1. Markup statis — satu-satunya penentu halaman awal (§7)
// ---------------------------------------------------------------------------

for (const file of HTML_FILES) {
  test(`${file}: startup membuka page-dashboard-hub (satu-satunya class="page active")`, () => {
    const html = readHtml(file);
    const activeMatches = [...html.matchAll(/<div class="page active" id="(page-[a-z0-9-]+)">/g)];
    assert.equal(activeMatches.length, 1, `Harus tepat 1 page aktif, ketemu ${activeMatches.length}: ${activeMatches.map((m) => m[1])}`);
    assert.equal(activeMatches[0][1], 'page-dashboard-hub');
  });

  test(`${file}: page-dashboard tidak lagi aktif saat startup (tapi elemennya tetap ada, tidak dihapus)`, () => {
    const html = readHtml(file);
    assert.match(html, /<div class="page" id="page-dashboard">/, 'page-dashboard harus tetap ada di DOM, cuma tidak "active"');
    assert.doesNotMatch(html, /<div class="page active" id="page-dashboard">/);
  });

  test(`${file}: entry "Buka Dashboard Hub" di Pengaturan > Diagnostik masih dipertahankan (belum dihapus)`, () => {
    const html = readHtml(file);
    assert.match(html, /Buka Dashboard Hub/);
  });

  test(`${file}: tombol Beranda (bottom-nav) menunjuk ke 'dashboard-hub'`, () => {
    const html = readHtml(file);
    const m = html.match(/<button class="nav-item active" aria-current="page" data-action="showPage" data-args='\["([^"]+)", "\$el"\]'>/);
    assert.ok(m, 'Tombol Beranda (nav-item pertama, aria-current="page") tidak ditemukan / formatnya berubah');
    assert.equal(m[1], 'dashboard-hub');
  });

  test(`${file}: shortcut "Saldo Akun" tetap menunjuk ke page-dashboard lama (kontennya belum dipindah ke hub, tidak boleh diubah Tahap 4)`, () => {
    const html = readHtml(file);
    assert.match(html, /data-action="showPage" data-args='\["dashboard", "\$nav:0"\]'/, 'Shortcut Saldo Akun berubah/hilang - seharusnya TETAP ke page-dashboard lama');
  });
}

test('index.html & app_production.html tetap identik setelah Tahap 4', () => {
  assert.equal(readHtml('index.html'), readHtml('app_production.html'));
});

// ---------------------------------------------------------------------------
// 2. Perilaku showPage()/renderPageContent() — dijalankan bareng di 1
//    context vm (pola sama dgn tests/dashboard-hub-lifecycle.test.js Tahap
//    3c), memverifikasi showPage('dashboard-hub',...) benar2 mengaktifkan
//    HANYA page-dashboard-hub & memicu DashboardHub.render() via
//    renderPageContent (case yang sudah ditambah Tahap 3c, TIDAK diubah lagi
//    di sini).
// ---------------------------------------------------------------------------

function extractFnSource(src, fnName) {
  const marker = `function ${fnName}(`;
  const start = src.indexOf(marker);
  assert.ok(start !== -1, `"${marker}" tidak ditemukan`);
  const braceOpen = src.indexOf('{', start);
  let depth = 1;
  let i = braceOpen + 1;
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') depth--;
    i++;
  }
  return src.slice(start, i);
}

// Fake document minimal: dua halaman (page-dashboard, page-dashboard-hub) +
// beberapa nav-item, cukup buat menjalankan showPage() ASLI apa adanya.
function makeShowPageContext() {
  const pages = {
    'page-dashboard': createFakeElement({ id: 'page-dashboard' }),
    'page-dashboard-hub': createFakeElement({ id: 'page-dashboard-hub' }),
  };
  const navItems = [
    createFakeElement({ setAttribute: () => {} }),
    createFakeElement({ setAttribute: () => {} }),
  ];
  const scrollRoot = createFakeElement();

  const fakeDocument = {
    getElementById: (id) => {
      if (id === 'page-' + 'dashboard') return pages['page-dashboard'];
      if (id === 'page-' + 'dashboard-hub') return pages['page-dashboard-hub'];
      if (id === 'scrollRoot') return scrollRoot;
      return null;
    },
    querySelectorAll: (selector) => {
      if (selector === '.page') return Object.values(pages);
      if (selector === '.nav-item') return navItems;
      return [];
    },
    querySelector: () => null,
  };

  const calls = { dashboardHub: 0, renderDashboard: 0 };
  const sandbox = {
    console,
    document: fakeDocument,
    DashboardHub: { render: () => { calls.dashboardHub++; } },
    renderDashboard: () => { calls.renderDashboard++; },
  };
  const context = vm.createContext(sandbox);
  const src = `
${extractFnSource(MODAL_NAVIGASI, 'showPage')}
${extractFnSource(MODULES_RENDER, 'renderPageContent')}
`;
  new vm.Script(src, { filename: 'default-landing-showpage-snippet' }).runInContext(context);
  return { context, calls, pages };
}

test("showPage('dashboard-hub') mengaktifkan HANYA page-dashboard-hub (page-dashboard jadi tidak aktif) & memicu DashboardHub.render() lewat renderPageContent()", () => {
  const { context, calls, pages } = makeShowPageContext();
  context.showPage('dashboard-hub');
  assert.equal(pages['page-dashboard-hub'].classList.contains('active'), true);
  assert.equal(pages['page-dashboard'].classList.contains('active'), false);
  assert.equal(calls.dashboardHub, 1);
  assert.equal(calls.renderDashboard, 0);
});

test("showPage('dashboard') tetap mengaktifkan HANYA page-dashboard (dashboard lama tetap bisa diakses) & memicu renderDashboard(), bukan DashboardHub.render()", () => {
  const { context, calls, pages } = makeShowPageContext();
  // Simulasikan hub aktif duluan (kondisi startup Tahap 4), lalu navigasi
  // manual ke dashboard lama lewat shortcut yang memang masih dituju ke sana.
  context.showPage('dashboard-hub');
  context.showPage('dashboard');
  assert.equal(pages['page-dashboard'].classList.contains('active'), true);
  assert.equal(pages['page-dashboard-hub'].classList.contains('active'), false);
  assert.equal(calls.renderDashboard, 1);
  assert.equal(calls.dashboardHub, 1, 'DashboardHub.render() dari showPage(dashboard-hub) sebelumnya tidak boleh ikut ke-double-count, tapi juga tidak boleh terpanggil lagi oleh showPage(dashboard)');
});
