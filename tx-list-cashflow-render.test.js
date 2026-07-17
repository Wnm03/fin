'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

// Cakupan file ini: bagian "render/filter" dari tx-list-cashflow.js —
// txHTML/changeMonth/setTxListPeriode/getTxListRange/setPeriode/getRange/
// setKeuanganTab. Sebelumnya nol test sama sekali (lihat daftar modul
// tanpa test di CLAUDE.md, bagian ke-13 & seterusnya).
//
// File tx-list-cashflow.js DIPECAH jadi 2 file test (bukan 1) karena ada 2
// kelompok fungsi dgn kebutuhan mock yg beda jauh: kelompok render/filter
// di file ini (murni baca D + DOM chip/toggle sederhana, gampang di-stub),
// vs `delTx` (side-effect berat lintas-modul: stok produk/Shop/servis/
// Renov/WorthIt/SewaKios/Tukang) + `computeCashflowForecast` (kalkulasi
// finansial dgn banyak cabang) yg ditaruh di
// tx-list-cashflow-deltx.test.js — pola sama seperti aset.js/IDBStore
// (CLAUDE.md bagian ke-25).
//
// curMonth/curYear/txListPage/filterPeriode adalah variabel GLOBAL bebas
// (dideklarasikan `let` di features-helpers-global-security.js, TIDAK di
// tx-list-cashflow.js), diassign langsung tanpa `let`/`const` di file ini
// -- sama seperti pola cicilanLastInput dkk di cicilan.test.js: BISA
// diinject & dibaca balik lewat extraGlobals langsung, TANPA trik `expose`.
// txListPeriode BEDA -- itu `let txListPeriode='bulan'` dideklarasikan DI
// DALAM tx-list-cashflow.js sendiri (module-scoped), jadi dites TIDAK
// langsung baca variabelnya tapi lewat efek getTxListRange() sesudah
// setTxListPeriode() dipanggil di context yg sama -- sama seperti pola
// editAccIdx di akun.test.js.

function baseFields(overrides = {}) {
  return {
    txListPeriodeChips: {}, txListCustomRange: { style: {} },
    txListFrom: { value: '' }, txListTo: { value: '' },
    periodeChips: {}, customRange: { style: {} },
    fFrom: { value: '' }, fTo: { value: '' },
    'keuanganTab-kelola': { style: {} }, 'keuanganTab-laporan': { style: {} },
    ...overrides,
  };
}

function makeCtx(D, opts = {}) {
  const queryGroups = opts.queryGroups || {};
  const fakeDocument = createFakeDocument(baseFields(opts.domValues), queryGroups);
  const calls = { render: [] };
  const record = (name) => (...args) => calls.render.push([name, ...args]);
  const ctx = loadSource(['tx-list-cashflow.js'], {
    D,
    document: fakeDocument,
    curMonth: opts.curMonth !== undefined ? opts.curMonth : 6,
    curYear: opts.curYear !== undefined ? opts.curYear : 2026,
    txListPage: 1,
    filterPeriode: opts.filterPeriode,
    getAllCats: opts.getAllCats || (() => (D.categories ? [...D.categories.income, ...D.categories.expense] : [])),
    escapeHtml: opts.escapeHtml || ((s) => String(s == null ? '' : s)),
    fmt: opts.fmt || ((n) => 'Rp' + String(Math.round(n))),
    closeModal: opts.closeModal || record('closeModal'),
    resetTxPageAndRender: opts.resetTxPageAndRender || record('resetTxPageAndRender'),
    renderKeuangan: opts.renderKeuangan || record('renderKeuangan'),
    renderLaporan: opts.renderLaporan || record('renderLaporan'),
    populateKeuFilters: opts.populateKeuFilters || record('populateKeuFilters'),
    loadKeuFilterPrefsIntoDOM: opts.loadKeuFilterPrefsIntoDOM || record('loadKeuFilterPrefsIntoDOM'),
    renderBillList: opts.renderBillList || record('renderBillList'),
    populateCatFilter: opts.populateCatFilter || record('populateCatFilter'),
    populateAccFilters: opts.populateAccFilters || record('populateAccFilters'),
  }, ['txListPeriode']);
  return { ctx, fakeDocument, calls };
}

// ================= txHTML =================

test('txHTML — transaksi income dgn kategori ketemu: icon dari kategori, bg accent3-soft, tanda "+", class green', () => {
  const D = {
    categories: { income: [{ name: 'Gaji', emoji: '💵' }], expense: [] },
    accounts: [],
  };
  const { ctx } = makeCtx(D);
  const html = ctx.txHTML({ id: 't1', type: 'income', category: 'Gaji', amount: 5000000, date: '2026-07-01' });
  assert.match(html, /💵/);
  assert.match(html, /var\(--accent3-soft\)/);
  assert.match(html, /\+Rp5000000/);
  assert.match(html, /class="tx-amount green"/);
});

test('txHTML — transaksi expense dgn kategori ketemu: bg accent2-soft, tanda "-", class red', () => {
  const D = {
    categories: { income: [], expense: [{ name: 'Belanja', emoji: '🛒' }] },
    accounts: [],
  };
  const { ctx } = makeCtx(D);
  const html = ctx.txHTML({ id: 't1', type: 'expense', category: 'Belanja', amount: 100000, date: '2026-07-01' });
  assert.match(html, /🛒/);
  assert.match(html, /var\(--accent2-soft\)/);
  assert.match(html, /-Rp100000/);
  assert.match(html, /class="tx-amount red"/);
});

test('txHTML — kategori TIDAK ketemu di getAllCats() => fallback icon default 💰', () => {
  const D = { categories: { income: [], expense: [] }, accounts: [] };
  const { ctx } = makeCtx(D);
  const html = ctx.txHTML({ id: 't1', type: 'expense', category: 'Entah', amount: 1000, date: '2026-07-01' });
  assert.match(html, /💰/);
});

test('txHTML — transfer_out/transfer_in: icon selalu ⇄ & bg accent-soft, terlepas dari kategori', () => {
  const D = { categories: { income: [], expense: [] }, accounts: [] };
  const { ctx } = makeCtx(D);
  const outHtml = ctx.txHTML({ id: 't1', type: 'transfer_out', category: 'Transfer', amount: 1000, date: '2026-07-01' });
  const inHtml = ctx.txHTML({ id: 't2', type: 'transfer_in', category: 'Transfer', amount: 1000, date: '2026-07-01' });
  assert.match(outHtml, /⇄/);
  assert.match(outHtml, /class="tx-amount red"/);
  assert.match(inHtml, /⇄/);
  assert.match(inHtml, /class="tx-amount green"/);
});

test('txHTML — akun tertaut (accountId cocok): tampilkan acc-chip emoji+nama; tidak ada akun => tidak ada chip akun', () => {
  const D = {
    categories: { income: [{ name: 'Gaji', emoji: '💵' }], expense: [] },
    accounts: [{ id: 'acc1', emoji: '🏦', name: 'BCA' }],
  };
  const { ctx } = makeCtx(D);
  const withAcc = ctx.txHTML({ id: 't1', type: 'income', category: 'Gaji', amount: 1000, date: '2026-07-01', accountId: 'acc1' });
  assert.match(withAcc, /🏦 BCA/);
  const noAcc = ctx.txHTML({ id: 't2', type: 'income', category: 'Gaji', amount: 1000, date: '2026-07-01', accountId: 'accXX' });
  assert.doesNotMatch(noAcc, /🏦 BCA/);
});

test('txHTML — subcategory & note tampil kalau ada, payMethod cicilan => badge 💳, tunai => tanpa badge', () => {
  const D = { categories: { income: [{ name: 'Gaji', emoji: '💵' }], expense: [] }, accounts: [] };
  const { ctx } = makeCtx(D);
  const withSub = ctx.txHTML({ id: 't1', type: 'income', category: 'Gaji', subcategory: 'Bonus', note: 'catatan', amount: 1000, date: '2026-07-01', payMethod: 'cicilan' });
  assert.match(withSub, /Bonus/);
  assert.match(withSub, /catatan/);
  assert.match(withSub, /💳 cicilan/);
  const tunai = ctx.txHTML({ id: 't2', type: 'income', category: 'Gaji', amount: 1000, date: '2026-07-01', payMethod: 'tunai' });
  assert.doesNotMatch(tunai, /acc-chip">.*tunai/);
});

// ================= changeMonth =================

test('changeMonth — dir positif dlm rentang bulan (tidak lewat Desember): curMonth nambah, curYear tetap', () => {
  const { ctx, calls } = makeCtx({}, { curMonth: 5, curYear: 2026 });
  ctx.changeMonth(1);
  assert.equal(ctx.curMonth, 6);
  assert.equal(ctx.curYear, 2026);
  assert.equal(ctx.txListPage, 1);
  assert.ok(calls.render.some((r) => r[0] === 'closeModal' && r[1] === 'filterTxModal'));
  assert.ok(calls.render.some((r) => r[0] === 'renderKeuangan'));
});

test('changeMonth — dir positif dari Desember (11): wrap ke bulan 0 & curYear naik', () => {
  const { ctx } = makeCtx({}, { curMonth: 11, curYear: 2026 });
  ctx.changeMonth(1);
  assert.equal(ctx.curMonth, 0);
  assert.equal(ctx.curYear, 2027);
});

test('changeMonth — dir negatif dari Januari (0): wrap ke bulan 11 & curYear turun', () => {
  const { ctx } = makeCtx({}, { curMonth: 0, curYear: 2026 });
  ctx.changeMonth(-1);
  assert.equal(ctx.curMonth, 11);
  assert.equal(ctx.curYear, 2025);
});

// ================= setTxListPeriode + getTxListRange =================

test('getTxListRange — periode "selamanya": rentang dari epoch 0 s/d tanggal jauh di masa depan', () => {
  const { ctx } = makeCtx({});
  ctx.setTxListPeriode('selamanya', { classList: { add() {} } });
  const range = ctx.getTxListRange();
  assert.equal(range.from.getTime(), 0);
  assert.equal(range.to.getTime(), 8640000000000000);
});

test('getTxListRange — periode "bulan": rentang dari tanggal 1 s/d akhir bulan sesuai curMonth/curYear', () => {
  const { ctx } = makeCtx({}, { curMonth: 6, curYear: 2026 }); // default periode = 'bulan'
  const range = ctx.getTxListRange();
  assert.equal(range.from.getFullYear(), 2026);
  assert.equal(range.from.getMonth(), 6);
  assert.equal(range.from.getDate(), 1);
  assert.equal(range.to.getFullYear(), 2026);
  assert.equal(range.to.getMonth(), 6);
  assert.equal(range.to.getDate(), 31); // Juli = 31 hari
  assert.equal(range.to.getHours(), 23);
});

test('getTxListRange — periode "hari": from = awal hari ini (00:00:00.000)', () => {
  const { ctx } = makeCtx({});
  ctx.setTxListPeriode('hari', { classList: { add() {} } });
  const range = ctx.getTxListRange();
  const expected = new Date(); expected.setHours(0, 0, 0, 0);
  assert.equal(range.from.getTime(), expected.getTime());
  assert.equal(range.from.getHours(), 0);
  assert.equal(range.from.getMinutes(), 0);
});

test('getTxListRange — periode "minggu": from = hari Minggu (getDay()===0) jam 00:00', () => {
  const { ctx } = makeCtx({});
  ctx.setTxListPeriode('minggu', { classList: { add() {} } });
  const range = ctx.getTxListRange();
  assert.equal(range.from.getDay(), 0);
  assert.equal(range.from.getHours(), 0);
});

test('getTxListRange — periode "tahun": from = 1 Januari tahun berjalan', () => {
  const { ctx } = makeCtx({});
  ctx.setTxListPeriode('tahun', { classList: { add() {} } });
  const range = ctx.getTxListRange();
  const nowYear = new Date().getFullYear();
  assert.equal(range.from.getFullYear(), nowYear);
  assert.equal(range.from.getMonth(), 0);
  assert.equal(range.from.getDate(), 1);
});

test('getTxListRange — periode "custom": pakai #txListFrom/#txListTo, kosong => from epoch 0 & to sekarang', () => {
  const { ctx: ctxFilled } = makeCtx({}, { domValues: { txListFrom: { value: '2026-01-05' }, txListTo: { value: '2026-01-10' } } });
  ctxFilled.setTxListPeriode('custom', { classList: { add() {} } });
  const filled = ctxFilled.getTxListRange();
  assert.equal(filled.from.toISOString().slice(0, 10), '2026-01-05');
  assert.equal(filled.to.toISOString().slice(0, 10), '2026-01-10');

  const { ctx: ctxEmpty } = makeCtx({});
  ctxEmpty.setTxListPeriode('custom', { classList: { add() {} } });
  const empty = ctxEmpty.getTxListRange();
  assert.equal(empty.from.getTime(), 0);
});

test('setTxListPeriode — toggle chip aktif, tampilkan/sembunyikan #txListCustomRange sesuai periode, panggil resetTxPageAndRender()', () => {
  const chip1 = { classList: { active: false, add() { this.active = true; }, remove() { this.active = false; } } };
  const { ctx, fakeDocument, calls } = makeCtx({}, { queryGroups: { '#txListPeriodeChips .chip-btn': [chip1] } });
  ctx.setTxListPeriode('custom', chip1);
  assert.equal(chip1.classList.active, true);
  assert.equal(fakeDocument.getElementById('txListCustomRange').classList.contains('u-dnone'), false);
  assert.ok(calls.render.some((r) => r[0] === 'resetTxPageAndRender'));
});

// ================= setPeriode + getRange (Laporan) =================

test('getRange — periode "bulan" (default Laporan): from = tanggal 1 bulan berjalan REAL TIME (bukan curMonth)', () => {
  const { ctx } = makeCtx({});
  ctx.setPeriode('bulan', { classList: { add() {} } });
  const range = ctx.getRange();
  const now = new Date();
  assert.equal(range.from.getFullYear(), now.getFullYear());
  assert.equal(range.from.getMonth(), now.getMonth());
  assert.equal(range.from.getDate(), 1);
});

test('getRange — periode "custom" pakai #fFrom/#fTo, "selamanya" pakai epoch => sama pola dgn getTxListRange tapi elemen DOM beda', () => {
  const { ctx } = makeCtx({}, { domValues: { fFrom: { value: '2026-02-01' }, fTo: { value: '2026-02-28' } } });
  ctx.setPeriode('custom', { classList: { add() {} } });
  const range = ctx.getRange();
  assert.equal(range.from.toISOString().slice(0, 10), '2026-02-01');
  assert.equal(range.to.toISOString().slice(0, 10), '2026-02-28');
});

test('setPeriode — toggle chip aktif di #periodeChips, toggle #customRange, panggil renderLaporan(); el null tidak error', () => {
  const chip1 = { classList: { active: false, add() { this.active = true; }, remove() { this.active = false; } } };
  const { ctx, fakeDocument, calls } = makeCtx({}, { queryGroups: { '#periodeChips .chip-btn': [chip1] } });
  ctx.setPeriode('custom', chip1);
  assert.equal(chip1.classList.active, true);
  assert.equal(fakeDocument.getElementById('customRange').classList.contains('u-dnone'), false);
  assert.ok(calls.render.some((r) => r[0] === 'renderLaporan'));

  // el=null (dipanggil programatik) tidak boleh error
  assert.doesNotThrow(() => ctx.setPeriode('bulan', null));
});

// ================= setKeuanganTab =================

function fakeTabBtn() {
  return { classList: { active: false, add() { this.active = true; }, remove() { this.active = false; } } };
}

test('setKeuanganTab — tab "kelola": tampilkan panel kelola, sembunyikan laporan, panggil populateKeuFilters/loadKeuFilterPrefsIntoDOM/renderKeuangan/renderBillList', () => {
  const { ctx, fakeDocument, calls } = makeCtx({}, { queryGroups: { '#page-keuangan .cn-tab': [fakeTabBtn(), fakeTabBtn()] } });
  ctx.setKeuanganTab('kelola', fakeTabBtn());
  assert.equal(fakeDocument.getElementById('keuanganTab-kelola').classList.contains('u-dnone'), false);
  assert.equal(fakeDocument.getElementById('keuanganTab-laporan').classList.contains('u-dnone'), true);
  const names = calls.render.map((r) => r[0]);
  assert.ok(names.includes('populateKeuFilters'));
  assert.ok(names.includes('loadKeuFilterPrefsIntoDOM'));
  assert.ok(names.includes('renderKeuangan'));
  assert.ok(names.includes('renderBillList'));
  assert.ok(!names.includes('renderLaporan'));
});

test('setKeuanganTab — tab "laporan": tampilkan panel laporan, panggil populateCatFilter/populateAccFilters/renderLaporan (BUKAN renderKeuangan/renderBillList)', () => {
  const { ctx, fakeDocument, calls } = makeCtx({}, { queryGroups: { '#page-keuangan .cn-tab': [fakeTabBtn(), fakeTabBtn()] } });
  ctx.setKeuanganTab('laporan', fakeTabBtn());
  assert.equal(fakeDocument.getElementById('keuanganTab-laporan').classList.contains('u-dnone'), false);
  assert.equal(fakeDocument.getElementById('keuanganTab-kelola').classList.contains('u-dnone'), true);
  const names = calls.render.map((r) => r[0]);
  assert.ok(names.includes('populateCatFilter'));
  assert.ok(names.includes('populateAccFilters'));
  assert.ok(names.includes('renderLaporan'));
  assert.ok(!names.includes('renderKeuangan'));
});

test('setKeuanganTab — el TIDAK diberikan (null): fallback pilih tombol ke-1 (index0) utk kelola, ke-2 (index1) utk laporan, dari queryGroups', () => {
  const btnKelola = fakeTabBtn();
  const btnLaporan = fakeTabBtn();
  const { ctx } = makeCtx({}, { queryGroups: { '#page-keuangan .cn-tab': [btnKelola, btnLaporan] } });
  ctx.setKeuanganTab('kelola');
  assert.equal(btnKelola.classList.active, true);
  assert.equal(btnLaporan.classList.active, false);

  const btnKelola2 = fakeTabBtn();
  const btnLaporan2 = fakeTabBtn();
  const { ctx: ctx2 } = makeCtx({}, { queryGroups: { '#page-keuangan .cn-tab': [btnKelola2, btnLaporan2] } });
  ctx2.setKeuanganTab('laporan');
  assert.equal(btnLaporan2.classList.active, true);
  assert.equal(btnKelola2.classList.active, false);
});
