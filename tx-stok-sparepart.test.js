'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

// tx-stok-sparepart.js — panel "Tambah ke Stok Sparepart juga?" pada txModal.
// Sebelumnya nol test (lihat tab Shop di CLAUDE.md — cobek.js/kasir.js/
// tx-stok-sparepart.js belum ada coverage sama sekali). Dipilih sbg modul
// terkecil (72 baris) yg masih murni-DOM (bukan async/AI), jadi cocok pola
// fakeDocument + loadSource yg sama dgn tests/bbm-saveinner.test.js.
//
// toggleTxStockFields() SENGAJA tidak dites di sini: cuma toggle
// display show/hide checkbox + delegasi ke populateTxStockSelect(), sama
// spt fungsi modal-toggle lain yg dikecualikan dari cakupan test (lihat
// CLAUDE.md pola pengecualian test).

function loadTxStock(D, domInitial = {}, opts = {}) {
  const fakeDocument = createFakeDocument(domInitial);
  const toasts = [];
  const calls = { renderStockList: 0 };
  const ctx = loadSource(['tx-stok-sparepart.js'], {
    D,
    document: fakeDocument,
    toast: (msg) => toasts.push(msg),
    escapeHtml: (s) => String(s === null || s === undefined ? '' : s),
    codeFromName: opts.codeFromName || ((name) => (name || '').slice(0, 3).toUpperCase()),
    renderStockList: () => { calls.renderStockList++; },
  });
  return { ctx, fakeDocument, toasts, calls };
}

function baseD(overrides = {}) {
  return { partsStock: [], sparepartCats: [], ...overrides };
}

// ---------- populateTxStockSelect ----------

test('populateTxStockSelect — tidak ada elemen txStockItem di DOM => tidak error, langsung return', () => {
  const D = baseD();
  const { ctx, fakeDocument } = loadTxStock(D, {});
  // fakeDocument.getElementById selalu bikin elemen kosong (bukan null), jadi
  // ini cuma memastikan pemanggilan tidak melempar walau elemen "kosong".
  assert.doesNotThrow(() => ctx.populateTxStockSelect());
  assert.match(fakeDocument.getElementById('txStockItem').innerHTML, /Sparepart Baru/);
});

test('populateTxStockSelect — daftar opsi dibangun dari D.partsStock + opsi "Sparepart Baru" di awal', () => {
  const D = baseD({
    partsStock: [
      { id: 'sp1', name: 'Kampas Rem', qty: 3, unit: 'pcs' },
      { id: 'sp2', name: 'Oli Mesin', qty: 5, unit: 'botol' },
    ],
  });
  const { ctx, fakeDocument } = loadTxStock(D, {});
  ctx.populateTxStockSelect();
  const html = fakeDocument.getElementById('txStockItem').innerHTML;
  assert.match(html, /__new__[\s\S]*Sparepart Baru/);
  assert.match(html, /Kampas Rem \(stok 3 pcs\)/);
  assert.match(html, /Oli Mesin \(stok 5 botol\)/);
});

test('populateTxStockSelect — value sebelumnya MASIH ada di partsStock => dipertahankan', () => {
  const D = baseD({ partsStock: [{ id: 'sp1', name: 'Kampas Rem', qty: 3, unit: 'pcs' }] });
  const { ctx, fakeDocument } = loadTxStock(D, { txStockItem: { value: 'sp1' } });
  ctx.populateTxStockSelect();
  assert.equal(fakeDocument.getElementById('txStockItem').value, 'sp1');
});

test('populateTxStockSelect — value sebelumnya SUDAH TIDAK ADA di partsStock (mis. item terhapus) => fallback ke __new__', () => {
  const D = baseD({ partsStock: [{ id: 'sp1', name: 'Kampas Rem', qty: 3, unit: 'pcs' }] });
  const { ctx, fakeDocument } = loadTxStock(D, { txStockItem: { value: 'sp-hilang' } });
  ctx.populateTxStockSelect();
  assert.equal(fakeDocument.getElementById('txStockItem').value, '__new__');
});

// ---------- onTxStockItemChange ----------

test('onTxStockItemChange — pilihan "__new__" => wrap ditampilkan (display block)', () => {
  const D = baseD();
  const { ctx, fakeDocument } = loadTxStock(D, {
    txStockItem: { value: '__new__' },
    txStockNewWrap: {},
    txNote: { value: '' },
    txStockNewName: { value: '' },
  });
  ctx.onTxStockItemChange();
  assert.equal(fakeDocument.getElementById('txStockNewWrap').style.display, 'block');
});

test('onTxStockItemChange — pilih item existing (bukan "__new__") => wrap disembunyikan (display none)', () => {
  const D = baseD({ partsStock: [{ id: 'sp1', name: 'Kampas Rem', qty: 3, unit: 'pcs' }] });
  const { ctx, fakeDocument } = loadTxStock(D, {
    txStockItem: { value: 'sp1' },
    txStockNewWrap: {},
  });
  ctx.onTxStockItemChange();
  assert.equal(fakeDocument.getElementById('txStockNewWrap').style.display, 'none');
});

test('onTxStockItemChange — "__new__" & nama field masih kosong => diisi otomatis dari catatan transaksi (txNote)', () => {
  const D = baseD();
  const { ctx, fakeDocument } = loadTxStock(D, {
    txStockItem: { value: '__new__' },
    txStockNewWrap: {},
    txNote: { value: '  Beli kampas rem depan  ' },
    txStockNewName: { value: '' },
  });
  ctx.onTxStockItemChange();
  assert.equal(fakeDocument.getElementById('txStockNewName').value, 'Beli kampas rem depan');
});

test('onTxStockItemChange — "__new__" & nama field SUDAH diisi user => TIDAK ditimpa oleh txNote', () => {
  const D = baseD();
  const { ctx, fakeDocument } = loadTxStock(D, {
    txStockItem: { value: '__new__' },
    txStockNewWrap: {},
    txNote: { value: 'Beli kampas rem depan' },
    txStockNewName: { value: 'Nama Sudah Diisi Manual' },
  });
  ctx.onTxStockItemChange();
  assert.equal(fakeDocument.getElementById('txStockNewName').value, 'Nama Sudah Diisi Manual');
});

// ---------- applyTxStockFromTx ----------

function stockFormFields(overrides = {}) {
  return {
    txAddStock: { checked: true },
    txStockPanel: { style: { display: 'block' } },
    txStockItem: { value: '__new__' },
    txStockQty: { value: '2' },
    txStockUnit: { value: 'pcs' },
    txStockNewName: { value: 'Kampas Rem Depan' },
    ...overrides,
  };
}

test('applyTxStockFromTx — checkbox "Tambah ke Stok" TIDAK dicentang => no-op total, tidak ada perubahan/toast', () => {
  const D = baseD();
  const { ctx, toasts, calls } = loadTxStock(D, stockFormFields({ txAddStock: { checked: false } }));
  ctx.applyTxStockFromTx('catatan');
  assert.equal(D.partsStock.length, 0);
  assert.equal(D.sparepartCats.length, 0);
  assert.equal(toasts.length, 0);
  assert.equal(calls.renderStockList, 0);
});

test('applyTxStockFromTx — panel disembunyikan (style.display "none") => no-op walau checkbox tercentang', () => {
  const D = baseD();
  const { ctx, toasts, calls } = loadTxStock(D, stockFormFields({ txStockPanel: { style: { display: 'none' } } }));
  ctx.applyTxStockFromTx('catatan');
  assert.equal(D.partsStock.length, 0);
  assert.equal(toasts.length, 0);
  assert.equal(calls.renderStockList, 0);
});

test('applyTxStockFromTx — qty 0 => ditolak dgn toast peringatan, tidak ada stok/kategori baru', () => {
  const D = baseD();
  const { ctx, toasts, calls } = loadTxStock(D, stockFormFields({ txStockQty: { value: '0' } }));
  ctx.applyTxStockFromTx('catatan');
  assert.match(toasts[0], /Jumlah stok yang ditambah harus lebih dari 0/);
  assert.equal(D.partsStock.length, 0);
  assert.equal(calls.renderStockList, 0);
});

test('applyTxStockFromTx — qty negatif => ditolak dgn toast yg sama', () => {
  const D = baseD();
  const { ctx, toasts } = loadTxStock(D, stockFormFields({ txStockQty: { value: '-5' } }));
  ctx.applyTxStockFromTx('catatan');
  assert.match(toasts[0], /Jumlah stok yang ditambah harus lebih dari 0/);
  assert.equal(D.partsStock.length, 0);
});

test('applyTxStockFromTx — item "__new__", kategori & sparepart BELUM ada => kategori baru + entry stok baru dibuat, kode digenerate', () => {
  const D = baseD();
  const { ctx, toasts, calls } = loadTxStock(D, stockFormFields());
  ctx.applyTxStockFromTx('catatan transaksi');
  assert.equal(D.sparepartCats.length, 1);
  assert.equal(D.sparepartCats[0].name, 'Kampas Rem Depan');
  assert.equal(D.partsStock.length, 1);
  const p = D.partsStock[0];
  assert.equal(p.name, 'Kampas Rem Depan');
  assert.equal(p.qty, 2);
  assert.equal(p.unit, 'pcs');
  assert.equal(p.catId, D.sparepartCats[0].id);
  assert.match(p.code, /^KAM-001$/); // codeFromName stub: 3 huruf pertama + urutan 001
  assert.match(toasts[0], /otomatis dibuat/);
  assert.equal(calls.renderStockList, 1);
});

test('applyTxStockFromTx — item "__new__" tapi nama field kosong => fallback pakai catatan transaksi (note)', () => {
  const D = baseD();
  const { ctx } = loadTxStock(D, stockFormFields({ txStockNewName: { value: '' } }));
  ctx.applyTxStockFromTx('Servis rutin bulanan');
  assert.equal(D.partsStock[0].name, 'Servis rutin bulanan');
});

test('applyTxStockFromTx — nama field & catatan transaksi SAMA-SAMA kosong => fallback "Sparepart Baru"', () => {
  const D = baseD();
  const { ctx } = loadTxStock(D, stockFormFields({ txStockNewName: { value: '' } }));
  ctx.applyTxStockFromTx('');
  assert.equal(D.partsStock[0].name, 'Sparepart Baru');
});

test('applyTxStockFromTx — item "__new__", kategori dgn nama SAMA (case-insensitive) sudah ada => reuse kategori, TIDAK bikin kategori dobel', () => {
  const D = baseD({ sparepartCats: [{ id: 'sp_cat1', name: 'kampas rem depan', code: 'KAM', intervalKm: 0 }] });
  const { ctx } = loadTxStock(D, stockFormFields());
  ctx.applyTxStockFromTx('catatan');
  assert.equal(D.sparepartCats.length, 1); // tidak nambah kategori baru
  assert.equal(D.partsStock[0].catId, 'sp_cat1');
});

test('applyTxStockFromTx — item "__new__", entry stok dgn nama+kategori PERSIS SAMA sudah ada => qty digabung, TIDAK bikin entry dobel', () => {
  const D = baseD({
    sparepartCats: [{ id: 'sp_cat1', name: 'Kampas Rem Depan', code: 'KAM', intervalKm: 0 }],
    partsStock: [{ id: 'st1', name: 'Kampas Rem Depan', catId: 'sp_cat1', code: 'KAM-001', qty: 4, unit: 'pcs', minStock: 1, price: 15000, note: '' }],
  });
  const { ctx, calls } = loadTxStock(D, stockFormFields());
  ctx.applyTxStockFromTx('catatan');
  assert.equal(D.partsStock.length, 1); // tidak dobel
  assert.equal(D.partsStock[0].qty, 6); // 4 + 2
  assert.equal(calls.renderStockList, 1);
});

test('applyTxStockFromTx — item existing dipilih dari dropdown => qty bertambah di entry itu, toast sebut nama produk', () => {
  const D = baseD({ partsStock: [{ id: 'st1', name: 'Oli Mesin', qty: 5, unit: 'botol' }] });
  const { ctx, toasts, calls } = loadTxStock(D, stockFormFields({ txStockItem: { value: 'st1' }, txStockQty: { value: '3' }, txStockUnit: { value: 'botol' } }));
  ctx.applyTxStockFromTx('catatan');
  assert.equal(D.partsStock.length, 1);
  assert.equal(D.partsStock[0].qty, 8);
  assert.match(toasts[0], /Oli Mesin/);
  assert.match(toasts[0], /\+3 botol/);
  assert.equal(calls.renderStockList, 1);
});

test('applyTxStockFromTx — item existing dipilih tapi SUDAH TERHAPUS dari D.partsStock => tidak error, tidak ada toast, render tetap dipanggil', () => {
  const D = baseD({ partsStock: [] }); // item 'st-hilang' tidak ada
  const { ctx, toasts, calls } = loadTxStock(D, stockFormFields({ txStockItem: { value: 'st-hilang' } }));
  assert.doesNotThrow(() => ctx.applyTxStockFromTx('catatan'));
  assert.equal(toasts.length, 0);
  assert.equal(calls.renderStockList, 1);
});

test('applyTxStockFromTx — unit dikosongkan => fallback default "pcs"', () => {
  const D = baseD();
  const { ctx } = loadTxStock(D, stockFormFields({ txStockUnit: { value: '' } }));
  ctx.applyTxStockFromTx('catatan');
  assert.equal(D.partsStock[0].unit, 'pcs');
});
