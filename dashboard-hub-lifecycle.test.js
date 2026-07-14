'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createFakeElement } = require('./helpers/fakeDom');

// Tahap 3c — blueprint-dashboard-hub.md, "Dashboard Hub Readiness (Wiring &
// Regression Fixes)". Tahap ini TIDAK mengubah landing page default, TIDAK
// memindah widget lagi — cuma menutup 2 bug wiring yang ditemukan audit
// sebelum Tahap 4:
//   1. renderPageContent() (modules-render.js) belum punya case utk
//      'dashboard-hub' -> DashboardHub.render() tidak pernah terpanggil
//      otomatis lewat refreshCurrentPage()/showPage(), cuma lewat tombol
//      manual "Buka Dashboard Hub".
//   2. Insight "Cek Absensi" (wh-lowdays, modules-calc.js) masih menunjuk ke
//      page:'dashboard' padahal dashAbsensiCard sudah pindah ke
//      page-dashboard-hub sejak Tahap 3a (dead reference).
//
// Sama seperti tests/dash-card-registry.test.js, renderPageContent DAN
// refreshCurrentPage TIDAK dijalankan lewat loadSource() penuh (modules-
// render.js/modal-navigasi.js terlalu besar & bergantung ke puluhan modul
// lain buat runtime) -- dua fungsi itu diekstrak langsung dari source ASLI
// via brace-counting (pola sama dgn extractFunction di loadSource.js), lalu
// dijalankan bersama di SATU context vm kecil dgn DashboardHub/renderDashboard
// tiruan (spy) supaya jumlah pemanggilan bisa dihitung persis.

const MODULES_RENDER = fs.readFileSync(path.join(__dirname, '..', 'modules-render.js'), 'utf8');
const MODAL_NAVIGASI = fs.readFileSync(path.join(__dirname, '..', 'modal-navigasi.js'), 'utf8');
const MODULES_CALC = fs.readFileSync(path.join(__dirname, '..', 'modules-calc.js'), 'utf8');
const HTML_FILES = ['index.html', 'app_production.html'].map((f) =>
  fs.readFileSync(path.join(__dirname, '..', f), 'utf8')
);

// Brace-counting: sama persis dgn extractFunction() di helpers/loadSource.js,
// tapi mengembalikan TEKS snippet-nya (bukan langsung dieksekusi) supaya
// beberapa fungsi bisa digabung dalam satu vm context.
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

// Jalankan renderPageContent + refreshCurrentPage ASLI bareng di 1 context vm,
// dgn document/DashboardHub/renderDashboard tiruan yg bisa dihitung.
function makeLifecycleContext({ activePageId } = {}) {
  const renderPageContentSrc = extractFnSource(MODULES_RENDER, 'renderPageContent');
  const refreshCurrentPageSrc = extractFnSource(MODAL_NAVIGASI, 'refreshCurrentPage');

  const calls = { dashboardHub: 0, renderDashboard: 0, pageContentArgs: [] };

  const activeEl = activePageId ? createFakeElement({ id: activePageId }) : null;
  const fakeDocument = {
    querySelector(selector) {
      if (selector === '.page.active') return activeEl;
      return null;
    },
  };

  const sandbox = {
    console,
    document: fakeDocument,
    DashboardHub: { render: () => { calls.dashboardHub++; } },
    renderDashboard: () => { calls.renderDashboard++; },
  };
  const context = vm.createContext(sandbox);
  const wrapped = `
${renderPageContentSrc}
${refreshCurrentPageSrc}
function __renderPageContent(name){ __calls.push(name); return renderPageContent(name); }
`;
  // renderPageContent aslinya juga memanggil banyak fungsi lain (populateKeuFilters,
  // renderKeuangan, dst) utk name selain 'dashboard'/'dashboard-hub' -- tidak
  // relevan buat test ini & sengaja TIDAK di-stub (test ini cuma memanggil
  // dgn name 'dashboard' / 'dashboard-hub').
  context.__calls = calls.pageContentArgs;
  new vm.Script(wrapped, { filename: 'dashboard-hub-lifecycle-snippet' }).runInContext(context);
  return { context, calls };
}

test('renderPageContent("dashboard-hub") memanggil DashboardHub.render() tepat sekali, tidak memanggil renderDashboard()', () => {
  const { context, calls } = makeLifecycleContext();
  context.renderPageContent('dashboard-hub');
  assert.equal(calls.dashboardHub, 1);
  assert.equal(calls.renderDashboard, 0);
});

test('renderPageContent("dashboard") tetap memanggil renderDashboard() saja (tidak ikut memanggil DashboardHub.render())', () => {
  const { context, calls } = makeLifecycleContext();
  context.renderPageContent('dashboard');
  assert.equal(calls.renderDashboard, 1);
  assert.equal(calls.dashboardHub, 0);
});

test('renderPageContent("dashboard-hub") dipanggil 2x -> DashboardHub.render() persis 2x (tidak double-render per panggilan, tidak hilang)', () => {
  const { context, calls } = makeLifecycleContext();
  context.renderPageContent('dashboard-hub');
  context.renderPageContent('dashboard-hub');
  assert.equal(calls.dashboardHub, 2);
});

test('refreshCurrentPage() merender Hub dgn benar saat page-dashboard-hub aktif', () => {
  const { context, calls } = makeLifecycleContext({ activePageId: 'page-dashboard-hub' });
  context.refreshCurrentPage();
  assert.equal(calls.dashboardHub, 1);
  assert.equal(calls.renderDashboard, 0);
});

test('refreshCurrentPage() tetap merender dashboard lama dgn benar saat page-dashboard aktif (tidak regresi)', () => {
  const { context, calls } = makeLifecycleContext({ activePageId: 'page-dashboard' });
  context.refreshCurrentPage();
  assert.equal(calls.renderDashboard, 1);
  assert.equal(calls.dashboardHub, 0);
});

test('refreshCurrentPage() tidak error & tidak merender apa pun kalau tidak ada .page.active', () => {
  const { context, calls } = makeLifecycleContext({ activePageId: null });
  assert.doesNotThrow(() => context.refreshCurrentPage());
  assert.equal(calls.dashboardHub, 0);
  assert.equal(calls.renderDashboard, 0);
});

// ---------------------------------------------------------------------------
// Regresi navigasi: insight "Cek Absensi" harus menunjuk ke page-dashboard-hub
// (lokasi dashAbsensiCard sekarang), bukan lagi page-dashboard (dead reference
// sejak widget ini pindah di Tahap 3a).
// ---------------------------------------------------------------------------

test('modules-calc.js: insight "Cek Absensi" (wh-lowdays) menunjuk ke page:\'dashboard-hub\', bukan lagi page:\'dashboard\'', () => {
  const m = MODULES_CALC.match(/id:'wh-lowdays'[\s\S]*?action:\{label:'Cek Absensi',page:'([^']+)'\}/);
  assert.ok(m, 'Entry insight wh-lowdays tidak ditemukan / formatnya berubah');
  assert.equal(m[1], 'dashboard-hub');
});

for (const [i, file] of ['index.html', 'app_production.html'].entries()) {
  test(`${file}: target insight "Cek Absensi" (dashAbsensiCard) memang berada di page-dashboard-hub`, () => {
    const html = HTML_FILES[i];
    const hubBlockStart = html.indexOf('id="page-dashboard-hub"');
    const oldBlockStart = html.indexOf('id="page-dashboard"');
    assert.ok(hubBlockStart !== -1 && oldBlockStart !== -1);
    const absensiIdx = html.indexOf('id="dashAbsensiCard"');
    assert.ok(absensiIdx !== -1, 'dashAbsensiCard tidak ditemukan');
    // dashAbsensiCard harus muncul SETELAH marker page-dashboard-hub (bukan di
    // dalam blok page-dashboard lama yang berakhir sebelum page-dashboard-hub
    // dimulai) -- cross-check sederhana thd urutan dokumen, konsisten dgn
    // pendekatan tests/dashboard-hub-pinned-widgets.test.js.
    assert.ok(absensiIdx > hubBlockStart, 'dashAbsensiCard tampaknya belum ada di dalam page-dashboard-hub');
  });
}
