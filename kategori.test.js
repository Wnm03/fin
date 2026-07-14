'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

// Cakupan file ini: seluruh fungsi di kategori.js — getAllCats/getCatsByType/
// getCat/getCatByType/uniqueCatList/subNamesForCat/populateCatSelect/
// populateSubSelect/openCatModal/delCatFromModal/setCatModalType/
// refreshTxCatIfOpen/saveCat/delCat/openSubCatModal/saveSubCat/delSubCat/
// toggleCatGroup/filterCat.
// Sama seperti akun.test.js: pakai fakeDocument + stub semua dependency
// lintas-file (renderCatList/populateCatFilter/populateKeuFilters/
// renderDashboard/renderKeuangan/updateTxVehiclePanels/askConfirm/save/toast),
// BUKAN test integrasi lintas file sungguhan.
// State module-scoped di kategori.js (catEditIdx/curCatModalType/
// catModalCallback/subCatParentId/subCatParentType/subCatEditId/curCatFilter)
// TIDAK dideklarasikan `let` di kategori.js sendiri — persis pola
// curMonth/curYear di tx-list-cashflow.js (dideklarasikan di
// features-helpers-global-security.js, diassign langsung tanpa `let` di
// file ini) — jadi bisa diinject & dibaca balik langsung lewat extraGlobals
// loadSource(), TANPA trik `expose`.
// DEFAULT_CATS sendiri didefinisikan di renovasi.js (GROUP_A, di luar
// cakupan test ini) — sama seperti identitas.test.js, cukup di-stub.

// Objek/array yang lahir di dalam vm context (mis. return value getCat(),
// uniqueCatList(), subNamesForCat()) punya prototype dari realm vm, beda
// dgn realm host -> assert.deepEqual/deepStrictEqual gagal walau isi sama
// (sudah didokumentasikan di aset.test.js/fi-calc.test.js). Pakai
// JSON.stringify buat bandingkan isi, bukan reference/prototype.
function sameJson(actual, expected, message) {
  assert.equal(JSON.stringify(actual), JSON.stringify(expected), message);
}

// kategori.js membaca `[...sel.options]` (bukan cuma innerHTML) di
// populateCatSelect/populateSubSelect utk cek apakah value lama masih
// valid. fakeDom.js TIDAK mem-parsing innerHTML jadi elemen beneran (lihat
// catatan di helpers/fakeDom.js), jadi elemen <select> yg dites lewat
// fungsi ini butuh dukungan tambahan lokal: `options` di-derive otomatis
// dari string innerHTML tiap kali di-set.
function withOptionsSupport(el) {
  let html = '';
  Object.defineProperty(el, 'innerHTML', {
    configurable: true,
    get() { return html; },
    set(v) {
      html = v;
      el.options = [...String(v).matchAll(/<option value="([^"]*)"/g)].map((m) => ({ value: m[1] }));
    },
  });
  el.options = [];
  return el;
}

function catFields(overrides = {}) {
  return {
    catModalTitle: {}, catName: { value: '' }, catEmoji: { value: '' },
    catDelBtn: { style: {} }, catBtnI: {}, catBtnE: {},
    subCatModalTitle: {}, subCatParentLabel: {}, subCatName: { value: '' },
    txModal: { classList: { contains: () => false } },
    ...overrides,
  };
}

function makeKategori(D, opts = {}) {
  const fakeDocument = createFakeDocument(catFields(opts.domValues), opts.queryGroups);
  const calls = { save: 0, toast: [], render: [], modal: [] };
  const record = (name) => (...args) => calls.render.push(name);
  const ctx = loadSource(['kategori.js'], {
    D,
    document: fakeDocument,
    escapeHtml: (s) => String(s == null ? '' : s),
    DEFAULT_CATS: opts.DEFAULT_CATS || { income: [], expense: [] },
    save: () => { calls.save++; },
    toast: (msg) => calls.toast.push(msg),
    openModal: opts.openModal || ((id) => calls.modal.push(['open', id])),
    closeModal: opts.closeModal || ((id) => calls.modal.push(['close', id])),
    askConfirm: opts.askConfirm || (async () => true),
    renderCatList: opts.renderCatList || record('renderCatList'),
    populateCatFilter: opts.populateCatFilter || record('populateCatFilter'),
    populateKeuFilters: opts.populateKeuFilters || record('populateKeuFilters'),
    renderDashboard: opts.renderDashboard || record('renderDashboard'),
    renderKeuangan: opts.renderKeuangan || record('renderKeuangan'),
    updateTxVehiclePanels: opts.updateTxVehiclePanels || record('updateTxVehiclePanels'),
    // State "global bebas" (bukan let di kategori.js) — inisialisasi awal.
    catEditIdx: null, curCatModalType: 'income', catModalCallback: null,
    subCatParentId: null, subCatParentType: null, subCatEditId: null,
    curCatFilter: 'semua',
  });
  return { ctx, fakeDocument, calls };
}

function cat(id, name, emoji, subs = []) { return { id, name, emoji, subs }; }

// ================= getAllCats / getCatsByType =================

test('getAllCats — gabungkan income+expense', () => {
  const D = { categories: { income: [cat('i1', 'Gaji', '💼')], expense: [cat('e1', 'Makan', '🍔')] } };
  const { ctx } = makeKategori(D);
  const all = ctx.getAllCats();
  assert.equal(all.length, 2);
  assert.equal(all[0].name, 'Gaji');
  assert.equal(all[1].name, 'Makan');
});

test('getCatsByType — balik array sesuai type, [] kalau tidak ada', () => {
  const D = { categories: { income: [cat('i1', 'Gaji', '💼')], expense: [] } };
  const { ctx } = makeKategori(D);
  assert.equal(ctx.getCatsByType('income').length, 1);
  assert.equal(ctx.getCatsByType('expense').length, 0);
  assert.equal(ctx.getCatsByType('lainnya').length, 0);
});

// ================= getCat / getCatByType =================

test('getCat — nama tidak ketemu -> fallback default "Lainnya"', () => {
  const D = { categories: { income: [], expense: [] } };
  const { ctx } = makeKategori(D);
  sameJson(ctx.getCat('Ngasal'), { name: 'Lainnya', emoji: '📦', subs: [] });
});

test('getCat — nama ketemu di 1 tempat -> balik apa adanya', () => {
  const D = { categories: { income: [], expense: [cat('e1', 'Makan', '🍔', [{ name: 'Warung' }])] } };
  const { ctx } = makeKategori(D);
  assert.equal(ctx.getCat('Makan').emoji, '🍔');
});

test('getCat — nama duplikat di income & expense -> pilih yg subs-nya paling banyak', () => {
  const D = {
    categories: {
      income: [cat('i1', 'Lain', '💰', [])],
      expense: [cat('e1', 'Lain', '📦', [{ name: 'A' }, { name: 'B' }])],
    },
  };
  const { ctx } = makeKategori(D);
  const result = ctx.getCat('Lain');
  assert.equal(result.id, 'e1');
  assert.equal(result.subs.length, 2);
});

test('getCatByType — cari di dalam type tertentu saja', () => {
  const D = {
    categories: {
      income: [cat('i1', 'Lain', '💰', [{ name: 'X' }])],
      expense: [cat('e1', 'Lain', '📦', [])],
    },
  };
  const { ctx } = makeKategori(D);
  assert.equal(ctx.getCatByType('Lain', 'income').id, 'i1');
  assert.equal(ctx.getCatByType('Lain', 'expense').id, 'e1');
});

test('getCatByType — tidak ketemu di type itu -> fallback getCat (cari semua type)', () => {
  const D = { categories: { income: [], expense: [cat('e1', 'Makan', '🍔')] } };
  const { ctx } = makeKategori(D);
  assert.equal(ctx.getCatByType('Makan', 'income').id, 'e1');
});

test('getCatByType — sama sekali tidak ketemu -> fallback default "Lainnya"', () => {
  const D = { categories: { income: [], expense: [] } };
  const { ctx } = makeKategori(D);
  assert.equal(ctx.getCatByType('Ngasal', 'income').name, 'Lainnya');
});

// ================= uniqueCatList =================

test('uniqueCatList — dedup nama, urutan kemunculan pertama, simpan emoji-nya', () => {
  const D = {
    categories: {
      income: [cat('i1', 'Lain', '💰')],
      expense: [cat('e1', 'Makan', '🍔'), cat('e2', 'Lain', '📦')], // 'Lain' dobel, emoji e2 diabaikan
    },
  };
  const { ctx } = makeKategori(D);
  const list = ctx.uniqueCatList();
  sameJson(list, [['Lain', '💰'], ['Makan', '🍔']]);
});

test('uniqueCatList — kategori kosong -> array kosong', () => {
  const D = { categories: { income: [], expense: [] } };
  const { ctx } = makeKategori(D);
  assert.equal(ctx.uniqueCatList().length, 0);
});

// ================= subNamesForCat =================

test('subNamesForCat — "semua" gabungkan sub dari semua kategori, unik & sorted', () => {
  const D = {
    categories: {
      income: [cat('i1', 'Gaji', '💼', [{ name: 'Bonus' }])],
      expense: [cat('e1', 'Makan', '🍔', [{ name: 'Warung' }, { name: 'Restoran' }])],
    },
  };
  const { ctx } = makeKategori(D);
  sameJson(ctx.subNamesForCat('semua'), ['Bonus', 'Restoran', 'Warung']);
});

test('subNamesForCat — nama kategori spesifik -> hanya sub kategori itu', () => {
  const D = {
    categories: {
      income: [],
      expense: [cat('e1', 'Makan', '🍔', [{ name: 'Warung' }]), cat('e2', 'Transport', '🚗', [{ name: 'Bensin' }])],
    },
  };
  const { ctx } = makeKategori(D);
  sameJson(ctx.subNamesForCat('Makan'), ['Warung']);
});

test('subNamesForCat — sub tanpa nama (falsy) diabaikan', () => {
  const D = { categories: { income: [], expense: [cat('e1', 'Makan', '🍔', [{ name: '' }, { name: 'Warung' }])] } };
  const { ctx } = makeKategori(D);
  sameJson(ctx.subNamesForCat('semua'), ['Warung']);
});

// ================= populateCatSelect =================

test('populateCatSelect — isi opsi "Semua" + semua kategori unik', () => {
  const D = { categories: { income: [cat('i1', 'Gaji', '💼')], expense: [cat('e1', 'Makan', '🍔')] } };
  const { ctx, fakeDocument } = makeKategori(D);
  withOptionsSupport(fakeDocument.getElementById('fKat'));
  ctx.populateCatSelect('fKat');
  const html = fakeDocument.getElementById('fKat').innerHTML;
  assert.match(html, /Semua/);
  assert.match(html, /Gaji/);
  assert.match(html, /Makan/);
});

test('populateCatSelect — value lama dipertahankan kalau masih valid', () => {
  const D = { categories: { income: [cat('i1', 'Gaji', '💼')], expense: [] } };
  const { ctx, fakeDocument } = makeKategori(D, { domValues: { fKat: { value: 'Gaji' } } });
  withOptionsSupport(fakeDocument.getElementById('fKat'));
  ctx.populateCatSelect('fKat');
  assert.equal(fakeDocument.getElementById('fKat').value, 'Gaji');
});

test('populateCatSelect — value lama sudah tidak ada -> reset ke "semua"', () => {
  const D = { categories: { income: [cat('i1', 'Gaji', '💼')], expense: [] } };
  const { ctx, fakeDocument } = makeKategori(D, { domValues: { fKat: { value: 'Sudah Dihapus' } } });
  withOptionsSupport(fakeDocument.getElementById('fKat'));
  ctx.populateCatSelect('fKat');
  assert.equal(fakeDocument.getElementById('fKat').value, 'semua');
});

test('populateCatSelect — elemen tidak ada -> no-op tanpa error', () => {
  const D = { categories: { income: [], expense: [] } };
  const { ctx, fakeDocument } = makeKategori(D);
  fakeDocument.getElementById = () => null;
  assert.doesNotThrow(() => ctx.populateCatSelect('fKat'));
});

// ================= populateSubSelect =================

test('populateSubSelect — isi sub sesuai kategori terpilih di katId', () => {
  const D = { categories: { income: [], expense: [cat('e1', 'Makan', '🍔', [{ name: 'Warung' }])] } };
  const { ctx, fakeDocument } = makeKategori(D, { domValues: { fKat: { value: 'Makan' } } });
  ctx.populateSubSelect('fSub', 'fKat');
  assert.match(fakeDocument.getElementById('fSub').innerHTML, /Warung/);
});

test('populateSubSelect — katId elemen tidak ada -> fallback "semua" (gabungkan semua sub)', () => {
  const D = {
    categories: {
      income: [cat('i1', 'Gaji', '💼', [{ name: 'Bonus' }])],
      expense: [cat('e1', 'Makan', '🍔', [{ name: 'Warung' }])],
    },
  };
  const { ctx, fakeDocument } = makeKategori(D);
  const original = fakeDocument.getElementById;
  fakeDocument.getElementById = (id) => (id === 'fKat' ? null : original(id));
  ctx.populateSubSelect('fSub', 'fKat');
  const html = original('fSub').innerHTML;
  assert.match(html, /Bonus/);
  assert.match(html, /Warung/);
});

test('populateSubSelect — value lama dipertahankan kalau masih ada di daftar sub baru', () => {
  const D = { categories: { income: [], expense: [cat('e1', 'Makan', '🍔', [{ name: 'Warung' }])] } };
  const { ctx, fakeDocument } = makeKategori(D, { domValues: { fKat: { value: 'Makan' }, fSub: { value: 'Warung' } } });
  ctx.populateSubSelect('fSub', 'fKat');
  assert.equal(fakeDocument.getElementById('fSub').value, 'Warung');
});

test('populateSubSelect — value lama tidak ada di daftar baru -> reset ke "semua"', () => {
  const D = { categories: { income: [], expense: [cat('e1', 'Makan', '🍔', [{ name: 'Warung' }])] } };
  const { ctx, fakeDocument } = makeKategori(D, { domValues: { fKat: { value: 'Makan' }, fSub: { value: 'Sudah Hilang' } } });
  ctx.populateSubSelect('fSub', 'fKat');
  assert.equal(fakeDocument.getElementById('fSub').value, 'semua');
});

// ================= openCatModal =================

test('openCatModal — mode tambah: field kosong/default, catEditIdx null, tombol hapus disembunyikan', () => {
  const D = { categories: { income: [], expense: [] } };
  const { ctx, fakeDocument, calls } = makeKategori(D);
  ctx.openCatModal();
  assert.equal(fakeDocument.getElementById('catModalTitle').textContent, 'Tambah Kategori');
  assert.equal(fakeDocument.getElementById('catName').value, '');
  assert.equal(fakeDocument.getElementById('catEmoji').value, '💰');
  assert.equal(fakeDocument.getElementById('catDelBtn').style.display, 'none');
  assert.equal(ctx.catEditIdx, null);
  assert.ok(calls.modal.some((m) => m[0] === 'open' && m[1] === 'catModal'));
});

test('openCatModal — mode edit: prefill dari kategori, tombol hapus tampil, catEditIdx tersimpan', () => {
  const D = { categories: { income: [], expense: [cat('e1', 'Makan', '🍔')] } };
  const { ctx, fakeDocument } = makeKategori(D, { domValues: { catName: { value: 'Makan' }, catEmoji: { value: '🍔' } } });
  ctx.openCatModal(0, 'expense');
  assert.equal(fakeDocument.getElementById('catModalTitle').textContent, 'Edit Kategori');
  assert.equal(fakeDocument.getElementById('catName').value, 'Makan');
  assert.equal(fakeDocument.getElementById('catEmoji').value, '🍔');
  assert.equal(fakeDocument.getElementById('catDelBtn').style.display, '');
  assert.equal(ctx.catEditIdx, 0);
  assert.equal(ctx.curCatModalType, 'expense');
});

test('openCatModal — tanpa type -> default "income"', () => {
  const D = { categories: { income: [], expense: [] } };
  const { ctx } = makeKategori(D);
  ctx.openCatModal();
  assert.equal(ctx.curCatModalType, 'income');
});

test('openCatModal — callback tersimpan (dibuktikan lewat saveCat)', () => {
  const D = { categories: { income: [], expense: [] } };
  const { ctx, fakeDocument } = makeKategori(D);
  let calledWith = null;
  ctx.openCatModal(undefined, 'income', (name) => { calledWith = name; });
  fakeDocument.getElementById('catName').value = 'Baru';
  ctx.saveCat();
  assert.equal(calledWith, 'Baru');
});

// ================= delCatFromModal =================

test('delCatFromModal — catEditIdx null -> no-op', async () => {
  const D = { categories: { income: [], expense: [] } };
  const { ctx, calls } = makeKategori(D);
  await ctx.delCatFromModal();
  assert.equal(calls.save, 0);
});

test('delCatFromModal — sukses hapus -> tutup modal & reset callback', async () => {
  const D = { categories: { income: [], expense: [cat('e1', 'Makan', '🍔')] }, transactions: [] };
  const { ctx, calls } = makeKategori(D);
  ctx.openCatModal(0, 'expense', () => {});
  await ctx.delCatFromModal();
  assert.equal(D.categories.expense.length, 0);
  assert.ok(calls.modal.some((m) => m[0] === 'close' && m[1] === 'catModal'));
});

test('delCatFromModal — user batal konfirmasi -> modal tetap terbuka, kategori tidak terhapus', async () => {
  const D = { categories: { income: [], expense: [cat('e1', 'Makan', '🍔')] }, transactions: [] };
  const { ctx, calls } = makeKategori(D, { askConfirm: async () => false });
  ctx.openCatModal(0, 'expense');
  await ctx.delCatFromModal();
  assert.equal(D.categories.expense.length, 1);
  assert.ok(!calls.modal.some((m) => m[0] === 'close' && m[1] === 'catModal'));
});

// ================= setCatModalType =================

test('setCatModalType — income: catBtnI dapat class "ai", catBtnE tidak', () => {
  const D = { categories: { income: [], expense: [] } };
  const { ctx, fakeDocument } = makeKategori(D);
  ctx.setCatModalType('income');
  assert.equal(fakeDocument.getElementById('catBtnI').className, 'type-btn ai');
  assert.equal(fakeDocument.getElementById('catBtnE').className, 'type-btn');
  assert.equal(ctx.curCatModalType, 'income');
});

test('setCatModalType — expense: catBtnE dapat class "ae", catBtnI tidak', () => {
  const D = { categories: { income: [], expense: [] } };
  const { ctx, fakeDocument } = makeKategori(D);
  ctx.setCatModalType('expense');
  assert.equal(fakeDocument.getElementById('catBtnE').className, 'type-btn ae');
  assert.equal(fakeDocument.getElementById('catBtnI').className, 'type-btn');
});

// ================= refreshTxCatIfOpen =================

test('refreshTxCatIfOpen — txModal tidak ada -> no-op', () => {
  const D = { categories: { income: [], expense: [] } };
  const { ctx, fakeDocument } = makeKategori(D);
  fakeDocument.getElementById = () => null;
  assert.doesNotThrow(() => ctx.refreshTxCatIfOpen());
});

test('refreshTxCatIfOpen — txModal ada tapi tidak "open" -> tidak panggil updateTxVehiclePanels', () => {
  const D = { categories: { income: [], expense: [] } };
  const { ctx, calls } = makeKategori(D);
  ctx.refreshTxCatIfOpen();
  assert.ok(!calls.render.includes('updateTxVehiclePanels'));
});

test('refreshTxCatIfOpen — txModal "open" -> panggil updateTxVehiclePanels', () => {
  const D = { categories: { income: [], expense: [] } };
  const { ctx, calls } = makeKategori(D, {
    domValues: { txModal: { classList: { contains: (c) => c === 'open' } } },
  });
  ctx.refreshTxCatIfOpen();
  assert.ok(calls.render.includes('updateTxVehiclePanels'));
});

// ================= saveCat =================

test('saveCat — nama kosong -> toast peringatan, tidak nambah', () => {
  const D = { categories: { income: [], expense: [] } };
  const { ctx, calls } = makeKategori(D, { domValues: { catName: { value: '   ' } } });
  ctx.openCatModal();
  ctx.saveCat();
  assert.equal(D.categories.income.length, 0);
  assert.ok(calls.toast[0].includes('Isi nama kategori'));
});

test('saveCat — tambah kategori baru', () => {
  const D = { categories: { income: [], expense: [] }, transactions: [] };
  const { ctx, calls, fakeDocument } = makeKategori(D);
  ctx.openCatModal(undefined, 'income');
  fakeDocument.getElementById('catName').value = 'Investasi';
  fakeDocument.getElementById('catEmoji').value = '📈';
  ctx.saveCat();
  assert.equal(D.categories.income.length, 1);
  assert.equal(D.categories.income[0].name, 'Investasi');
  assert.equal(D.categories.income[0].emoji, '📈');
  assert.equal(D.categories.income[0].subs.length, 0);
  assert.equal(calls.save, 1);
  assert.ok(calls.render.includes('renderCatList'));
  assert.ok(calls.render.includes('renderDashboard'));
  assert.ok(calls.render.includes('renderKeuangan'));
  assert.ok(calls.toast[0].includes('Kategori disimpan') && !calls.toast[0].includes('disesuaikan'));
});

test('saveCat — emoji kosong fallback ke 📦', () => {
  const D = { categories: { income: [], expense: [] }, transactions: [] };
  const { ctx, fakeDocument } = makeKategori(D);
  ctx.openCatModal(undefined, 'income');
  fakeDocument.getElementById('catName').value = 'X';
  fakeDocument.getElementById('catEmoji').value = '';
  ctx.saveCat();
  assert.equal(D.categories.income[0].emoji, '📦');
});

test('saveCat — edit tanpa ganti nama -> tidak ada transaksi ikut disesuaikan', () => {
  const D = { categories: { income: [], expense: [cat('e1', 'Makan', '🍔')] }, transactions: [{ category: 'Makan' }] };
  const { ctx, calls, fakeDocument } = makeKategori(D);
  ctx.openCatModal(0, 'expense');
  fakeDocument.getElementById('catName').value = 'Makan'; // nama tidak berubah
  fakeDocument.getElementById('catEmoji').value = '🍕';
  ctx.saveCat();
  assert.equal(D.categories.expense[0].emoji, '🍕');
  assert.equal(D.transactions[0].category, 'Makan');
  assert.ok(calls.toast[0].includes('Kategori disimpan') && !calls.toast[0].includes('disesuaikan'));
});

test('saveCat — edit ganti nama -> transaksi & tagihan (bills) ikut disesuaikan', () => {
  const D = {
    categories: { income: [], expense: [cat('e1', 'Makan', '🍔')] },
    transactions: [{ category: 'Makan' }, { category: 'Makan' }, { category: 'Lain' }],
    bills: [{ category: 'Makan' }],
  };
  const { ctx, calls, fakeDocument } = makeKategori(D);
  ctx.openCatModal(0, 'expense');
  fakeDocument.getElementById('catName').value = 'Kuliner';
  fakeDocument.getElementById('catEmoji').value = '🍔';
  ctx.saveCat();
  assert.equal(D.categories.expense[0].name, 'Kuliner');
  assert.equal(D.transactions[0].category, 'Kuliner');
  assert.equal(D.transactions[1].category, 'Kuliner');
  assert.equal(D.transactions[2].category, 'Lain'); // tidak ikut berubah
  assert.equal(D.bills[0].category, 'Kuliner');
  assert.ok(calls.toast[0].includes('2 transaksi lama ikut disesuaikan'));
});

test('saveCat — panggil callback (kalau ada) dengan nama baru, lalu reset callback', () => {
  const D = { categories: { income: [], expense: [] } };
  const { ctx, fakeDocument } = makeKategori(D);
  let callCount = 0;
  ctx.openCatModal(undefined, 'income', () => { callCount++; });
  fakeDocument.getElementById('catName').value = 'Sekali';
  ctx.saveCat();
  assert.equal(callCount, 1);
  // Callback sudah direset -> saveCat kedua (misal dipanggil lagi) tidak trigger lagi.
  fakeDocument.getElementById('catName').value = 'Dua';
  ctx.openCatModal();
  ctx.saveCat();
  assert.equal(callCount, 1);
});

// ================= delCat =================

test('delCat — kategori bawaan (default) -> warning khusus di pesan konfirmasi', async () => {
  const D = { categories: { income: [], expense: [cat('e1', 'Makan', '🍔')] }, transactions: [] };
  let confirmMsg = '';
  const { ctx } = makeKategori(D, {
    DEFAULT_CATS: { income: [], expense: [{ id: 'e1' }] },
    askConfirm: async (msg) => { confirmMsg = msg; return true; },
  });
  await ctx.delCat('e1', 'expense');
  assert.match(confirmMsg, /kategori bawaan/);
  assert.equal(D.categories.expense.length, 0);
});

test('delCat — kategori dipakai transaksi -> pesan sebutkan jumlah pemakaian, transaksi TIDAK ikut terhapus', async () => {
  const D = {
    categories: { income: [], expense: [cat('e1', 'Makan', '🍔')] },
    transactions: [{ category: 'Makan' }, { category: 'Makan' }],
  };
  let confirmMsg = '';
  const { ctx } = makeKategori(D, { askConfirm: async (msg) => { confirmMsg = msg; return true; } });
  await ctx.delCat('e1', 'expense');
  assert.match(confirmMsg, /2 transaksi/);
  assert.equal(D.categories.expense.length, 0);
  assert.equal(D.transactions.length, 2); // tetap ada, cuma kategorinya "yatim"
});

test('delCat — user batal konfirmasi -> tidak jadi hapus', async () => {
  const D = { categories: { income: [], expense: [cat('e1', 'Makan', '🍔')] }, transactions: [] };
  const { ctx, calls } = makeKategori(D, { askConfirm: async () => false });
  await ctx.delCat('e1', 'expense');
  assert.equal(D.categories.expense.length, 1);
  assert.equal(calls.save, 0);
});

test('delCat — sukses hapus -> save & re-render dipanggil, toast konfirmasi', async () => {
  const D = { categories: { income: [], expense: [cat('e1', 'Makan', '🍔')] }, transactions: [] };
  const { ctx, calls } = makeKategori(D);
  await ctx.delCat('e1', 'expense');
  assert.equal(calls.save, 1);
  assert.ok(calls.render.includes('renderCatList'));
  assert.ok(calls.toast[0].includes('Kategori dihapus'));
});

// ================= openSubCatModal =================

test('openSubCatModal — mode tambah: field kosong, judul "Tambah Subkategori"', () => {
  const D = { categories: { income: [], expense: [cat('e1', 'Makan', '🍔')] } };
  const { ctx, fakeDocument } = makeKategori(D);
  ctx.openSubCatModal('e1', 'expense');
  assert.equal(fakeDocument.getElementById('subCatModalTitle').textContent, 'Tambah Subkategori');
  assert.equal(fakeDocument.getElementById('subCatParentLabel').textContent, '🍔 Makan');
  assert.equal(fakeDocument.getElementById('subCatName').value, '');
  assert.equal(ctx.subCatParentId, 'e1');
  assert.equal(ctx.subCatParentType, 'expense');
  assert.equal(ctx.subCatEditId, null);
});

test('openSubCatModal — mode edit: prefill nama sub, judul "Edit Subkategori"', () => {
  const D = { categories: { income: [], expense: [cat('e1', 'Makan', '🍔', [{ id: 's1', name: 'Warung' }])] } };
  const { ctx, fakeDocument } = makeKategori(D);
  ctx.openSubCatModal('e1', 'expense', 's1');
  assert.equal(fakeDocument.getElementById('subCatModalTitle').textContent, 'Edit Subkategori');
  assert.equal(fakeDocument.getElementById('subCatName').value, 'Warung');
  assert.equal(ctx.subCatEditId, 's1');
});

test('openSubCatModal — mode edit tapi subId tidak ketemu -> field kosong (tidak error)', () => {
  const D = { categories: { income: [], expense: [cat('e1', 'Makan', '🍔', [])] } };
  const { ctx, fakeDocument } = makeKategori(D);
  assert.doesNotThrow(() => ctx.openSubCatModal('e1', 'expense', 'ngasal'));
  assert.equal(fakeDocument.getElementById('subCatName').value, '');
});

// ================= saveSubCat =================

test('saveSubCat — nama kosong -> toast peringatan', () => {
  const D = { categories: { income: [], expense: [cat('e1', 'Makan', '🍔', [])] } };
  const { ctx, calls } = makeKategori(D, { domValues: { subCatName: { value: ' ' } } });
  ctx.openSubCatModal('e1', 'expense');
  ctx.saveSubCat();
  assert.ok(calls.toast[0].includes('Isi nama subkategori'));
  assert.equal(D.categories.expense[0].subs.length, 0);
});

test('saveSubCat — tambah subkategori baru (auto-init cat.subs kalau belum ada)', () => {
  const D = { categories: { income: [], expense: [{ id: 'e1', name: 'Makan', emoji: '🍔' }] } }; // tanpa subs sama sekali
  const { ctx, calls, fakeDocument } = makeKategori(D);
  ctx.openSubCatModal('e1', 'expense');
  fakeDocument.getElementById('subCatName').value = 'Warung';
  ctx.saveSubCat();
  assert.equal(D.categories.expense[0].subs.length, 1);
  assert.equal(D.categories.expense[0].subs[0].name, 'Warung');
  assert.equal(calls.save, 1);
  assert.ok(calls.toast[0].includes('Subkategori ditambahkan'));
});

test('saveSubCat — edit sub tapi subCatEditId tidak ketemu -> toast peringatan, tidak error', () => {
  const D = { categories: { income: [], expense: [cat('e1', 'Makan', '🍔', [{ id: 's1', name: 'Warung' }])] } };
  const { ctx, calls } = makeKategori(D);
  ctx.openSubCatModal('e1', 'expense', 's1');
  ctx.subCatEditId = 'sudah-hilang'; // simulasi race/edge-case
  ctx.saveSubCat();
  assert.ok(calls.toast[0].includes('Subkategori tidak ditemukan'));
});

test('saveSubCat — edit tanpa ganti nama -> tidak ada rename yg disesuaikan', () => {
  const D = {
    categories: { income: [], expense: [cat('e1', 'Makan', '🍔', [{ id: 's1', name: 'Warung' }])] },
    transactions: [{ category: 'Makan', subcategory: 'Warung' }],
  };
  const { ctx, calls, fakeDocument } = makeKategori(D);
  ctx.openSubCatModal('e1', 'expense', 's1');
  fakeDocument.getElementById('subCatName').value = 'Warung';
  ctx.saveSubCat();
  assert.ok(calls.toast[0].includes('Subkategori disimpan') && !calls.toast[0].includes('disesuaikan'));
});

test('saveSubCat — edit ganti nama -> transaksi & bills dgn kategori+subkategori cocok ikut disesuaikan', () => {
  const D = {
    categories: { income: [], expense: [cat('e1', 'Makan', '🍔', [{ id: 's1', name: 'Warung' }])] },
    transactions: [
      { category: 'Makan', subcategory: 'Warung' },
      { category: 'Lain', subcategory: 'Warung' }, // kategori beda -> tidak ikut
    ],
    bills: [{ category: 'Makan', subcategory: 'Warung' }],
  };
  const { ctx, calls, fakeDocument } = makeKategori(D);
  ctx.openSubCatModal('e1', 'expense', 's1');
  fakeDocument.getElementById('subCatName').value = 'Warung Nasi';
  ctx.saveSubCat();
  assert.equal(D.categories.expense[0].subs[0].name, 'Warung Nasi');
  assert.equal(D.transactions[0].subcategory, 'Warung Nasi');
  assert.equal(D.transactions[1].subcategory, 'Warung'); // tidak berubah, kategori beda
  assert.equal(D.bills[0].subcategory, 'Warung Nasi');
  assert.ok(calls.toast[0].includes('1 transaksi lama ikut disesuaikan'));
});

// ================= delSubCat =================

test('delSubCat — user batal konfirmasi -> tidak jadi hapus', async () => {
  const D = { categories: { income: [], expense: [cat('e1', 'Makan', '🍔', [{ id: 's1', name: 'Warung' }])] } };
  const { ctx, calls } = makeKategori(D, { askConfirm: async () => false });
  await ctx.delSubCat('e1', 'expense', 's1');
  assert.equal(D.categories.expense[0].subs.length, 1);
  assert.equal(calls.save, 0);
});

test('delSubCat — sukses hapus sub dari kategori', async () => {
  const D = { categories: { income: [], expense: [cat('e1', 'Makan', '🍔', [{ id: 's1', name: 'Warung' }, { id: 's2', name: 'Resto' }])] } };
  const { ctx, calls } = makeKategori(D);
  await ctx.delSubCat('e1', 'expense', 's1');
  assert.equal(D.categories.expense[0].subs.length, 1);
  assert.equal(D.categories.expense[0].subs[0].id, 's2');
  assert.equal(calls.save, 1);
  assert.ok(calls.toast[0].includes('Subkategori dihapus'));
});

// ================= toggleCatGroup =================

test('toggleCatGroup — toggle class "open" pada elemen subs_ & arrow_ terkait', () => {
  const D = { categories: { income: [], expense: [] } };
  const { ctx, fakeDocument } = makeKategori(D);
  ctx.toggleCatGroup('e1');
  assert.equal(fakeDocument.getElementById('subs_e1').classList.contains('open'), true);
  assert.equal(fakeDocument.getElementById('arrow_e1').classList.contains('open'), true);
  ctx.toggleCatGroup('e1');
  assert.equal(fakeDocument.getElementById('subs_e1').classList.contains('open'), false);
});

test('toggleCatGroup — elemen subs_ tidak ada -> no-op tanpa error', () => {
  const D = { categories: { income: [], expense: [] } };
  const { ctx, fakeDocument } = makeKategori(D);
  fakeDocument.getElementById = () => null;
  assert.doesNotThrow(() => ctx.toggleCatGroup('e1'));
});

// ================= filterCat =================

test('filterCat — set curCatFilter, aktifkan chip terpilih, matikan chip lain, panggil renderCatList', () => {
  const D = { categories: { income: [], expense: [] } };
  const chipExpense = { classList: { add() {}, remove() {}, contains: () => false } };
  const chips = [
    { classList: { add() {}, remove() {}, contains: () => false } },
    chipExpense,
  ];
  const removed = [];
  chips.forEach((c) => { c.classList.remove = (n) => removed.push(n); });
  chipExpense.classList.add = (n) => { chipExpense._added = n; };
  const { ctx, calls } = makeKategori(D, { queryGroups: { '#catFilterChips .chip-btn': chips } });
  ctx.filterCat('expense', chipExpense);
  assert.equal(ctx.curCatFilter, 'expense');
  assert.equal(chipExpense._added, 'active');
  assert.equal(removed.length, 2); // remove('active') dipanggil ke semua chip
  assert.ok(calls.render.includes('renderCatList'));
});
