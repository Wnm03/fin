'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

// Cakupan file ini: wiring checkbox "🏠 Ini KPR" (txCicilanIsKpr) <-> bill.isKpr
// di transaksi.js — bagian yang di PATCH-NOTES-jenis-akun-kpr-kategori.md
// ditandai "belum dikerjakan" (transaksi.js belum punya test harness sama
// sekali di repo ini). Fungsi INTI cara TanggaKeuangan MEMBACA flag ini
// (_isKprLike) sudah dites penuh di tangga-keuangan-kpr.test.js — file ini
// fokus ke 3 titik wiring baca/tulis checkbox itu sendiri:
//   1. openTxModal — reset checkbox ke false tiap buka form baru
//   2. editTx — prefill checkbox dari bill.isKpr saat edit cicilan existing
//   3. _saveTxInner — baca checkbox & simpan ke bill.isKpr, DUA jalur save
//      (bill baru saat mulai cicilan baru, & update bill existing saat edit
//      transaksi cicilan yg sudah lunas sebagian / masih berjalan)
//
// Sama seperti akun.test.js/cicilan.test.js, test ini pakai fakeDocument +
// stub SEMUA dependency lintas-file (populateAccFilters, save, toast,
// closeModal, render*, WorthIt/SewaKios/Tukang/Renov, dst) sebagai no-op —
// BUKAN test integrasi lintas file sungguhan. `saveTx` sendiri (pembungkus
// guard `_txSaving`) SENGAJA tidak dites — `_saveTxInner` dites langsung,
// pola sama dgn `_saveAccInner` di akun.test.js.

function txFields(overrides = {}) {
  return {
    txModalTitle: {}, txDelBtn: { style: {} }, txDate: { value: '' },
    txAmt: { value: '' }, txCat: { value: '' }, txSubCat: { value: '' },
    txNote: { value: '' }, txScanInsight: { style: {} },
    btnI: {}, btnE: {},
    pmTunai: { classList: [], style: { pointerEvents: '', opacity: '' } },
    pmCicilan: { classList: [], style: { pointerEvents: '', opacity: '' } },
    pmLangganan: { classList: [], style: { pointerEvents: '', opacity: '' } },
    txCicilanPanel: { style: {} }, txLanggananPanel: { style: {} },
    txStockPanel: { style: {} }, txBbmPanel: { style: {} },
    txShopStockPanel: { style: {} }, txShopSalePanel: { style: {} },
    txCicilanNama: { value: '' }, txCicilanTotal: { value: '' },
    txCicilanPerBulan: { value: '' }, txCicilanBunga: { value: '' },
    txLanggananNama: { value: '' }, txCicilanTenor: { value: '6' },
    txCicilanShared: { checked: false }, txCicilanIsKpr: { checked: false },
    txCicilanSharedPct: { value: '' }, txCicilanSharedNominal: { value: '' },
    txCicilanSharedWrap: { style: {} }, prevMineRow: { style: {} },
    txCicilanDue: { value: '' }, txLanggananDue: { value: '' },
    txCicilanPreview: { style: {} }, txCicilanDueLabel: {},
    txCicilanDueHint: { style: {} }, txCicilanHistoryBtn: { style: {} },
    txAddStock: { checked: false }, txStockNewName: { value: '' },
    txStockQty: { value: '' }, txStockUnit: { value: '' },
    txSyncBbm: { checked: false }, txBbmKm: { value: '' }, txBbmLiter: { value: '' },
    txBbmHargaL: { value: '' }, txBbmSpbu: { value: '' }, txBbmFull: { checked: false },
    txAddShopStock: { checked: false }, txShopStockNewName: { value: '' },
    txShopStockKategori: { value: '' }, txShopStockHarga: { value: '' },
    txShopStockJual: { value: '' }, txShopStockQty: { value: '' },
    txAddShopSale: { checked: false }, txShopSaleQty: { value: '' },
    txShopSaleHarga: { value: '' }, txShopSaleDiskon: { value: '' },
    txShopSaleOngkir: { value: '' }, txShopSaleCustName: { value: '' },
    txShopSaleCustPhone: { value: '' }, txShopSaleCustAddr: { value: '' },
    txAcc: { value: 'a1' },
    ...overrides,
  };
}

function makeTransaksi(D, opts = {}) {
  const fakeDocument = createFakeDocument(txFields(opts.domValues));
  const calls = { toast: [], save: 0, closeModal: [] };
  let uidCounter = opts.uidStart || 1000;
  const ctx = loadSource(['transaksi.js'], {
    D,
    document: fakeDocument,
    curTxType: opts.curTxType || 'expense',
    curPayMethod: opts.curPayMethod || 'tunai',
    txEditId: opts.txEditId || null,
    _txCatLearnSource: null,
    escapeHtml: (s) => String(s == null ? '' : s),
    toast: (msg) => calls.toast.push(msg),
    save: () => { calls.save++; },
    openModal: () => {},
    closeModal: (id) => calls.closeModal.push(id),
    populateAccFilters: () => {},
    isKendaraanCatName: () => false,
    isBensinSubName: () => false,
    isSparepartSubName: () => false,
    isShopStockCatName: () => false,
    toggleTxStockFields: () => {},
    toggleTxBbmFields: () => {},
    resetShopStockCart: () => {},
    toggleTxShopStockFields: () => {},
    resetTxShopSaleCart: () => {},
    toggleTxShopSaleFields: () => {},
    renderShopStockCartList: () => {},
    renderTxShopSaleCartList: () => {},
    syncCicilanPreview: () => {},
    syncCicilanDate: () => {},
    evalAmtExpr: () => {},
    validateCicilanFields: opts.validateCicilanFields || (() => true),
    findPossibleDuplicateTx: () => null,
    askConfirm: async () => true,
    fmtFull: (n) => 'Rp' + String(Math.round(n)),
    getCicilanSharedMine: opts.getCicilanSharedMine || ((perBulan) => ({ shared: false, pct: 50, mine: perBulan })),
    uid: () => uidCounter++,
    applyTxStockFromTx: () => {},
    applyTxShopStockFromTx: () => {},
    applyTxShopSaleFromTx: () => {},
    applyTxBbmFromTx: () => {},
    rememberLastAccForCat: () => {},
    learnCatFromItemName: () => {},
    renderDashboard: () => {},
    renderKeuangan: () => {},
    renderBillList: () => {},
    checkBills: () => {},
    renderCnTab: () => {},
    renderProductList: () => {},
    renderShop: () => {},
    renderShopRecent: () => {},
    WorthIt: { applyBuyLink: () => {}, onLinkedTxEdited: () => {} },
    SewaKios: { applyPaymentLink: () => {}, onLinkedTxEdited: () => {} },
    Tukang: { applyPendingPayment: () => {} },
    Renov: { onLinkedTxEdited: () => {} },
  });
  return { ctx, fakeDocument, calls };
}

// ================= openTxModal — reset txCicilanIsKpr =================

test('openTxModal — checkbox Ini KPR direset ke false tiap buka form Tambah Transaksi baru', () => {
  const D = { transactions: [], bills: [] };
  const { ctx, fakeDocument } = makeTransaksi(D);
  fakeDocument.getElementById('txCicilanIsKpr').checked = true;
  ctx.openTxModal('expense');
  assert.equal(fakeDocument.getElementById('txCicilanIsKpr').checked, false);
});

test('openTxModal — aman no-op kalau elemen txCicilanIsKpr tidak ada di DOM', () => {
  const D = { transactions: [], bills: [] };
  const { ctx, fakeDocument } = makeTransaksi(D);
  fakeDocument.getElementById = new Proxy(fakeDocument.getElementById, {
    apply(target, thisArg, args) { return args[0] === 'txCicilanIsKpr' ? null : Reflect.apply(target, thisArg, args); },
  });
  assert.doesNotThrow(() => ctx.openTxModal('expense'));
});

// ================= editTx — prefill txCicilanIsKpr dari bill.isKpr =================

test('editTx — prefill checkbox Ini KPR true dari cicilan existing dgn isKpr:true', () => {
  const bill = { id: 'b1', kind: 'cicilan', name: 'Cicilan Rumah', totalHarga: 500000000, tenor: 120, bunga: 0, nextDue: '2026-08-01', shared: false, isKpr: true };
  const tx = { id: 1, type: 'expense', accountId: 'a1', amount: 5000000, category: 'Cicilan', date: '2026-07-01', payMethod: 'cicilan', billLinkId: 'b1' };
  const D = { transactions: [tx], bills: [bill] };
  const { ctx, fakeDocument } = makeTransaksi(D);
  ctx.editTx(1);
  assert.equal(fakeDocument.getElementById('txCicilanIsKpr').checked, true);
});

test('editTx — prefill checkbox Ini KPR false dari cicilan existing dgn isKpr:false', () => {
  const bill = { id: 'b1', kind: 'cicilan', name: 'Cicilan Motor', totalHarga: 20000000, tenor: 24, bunga: 0, nextDue: '2026-08-01', shared: false, isKpr: false };
  const tx = { id: 1, type: 'expense', accountId: 'a1', amount: 900000, category: 'Cicilan', date: '2026-07-01', payMethod: 'cicilan', billLinkId: 'b1' };
  const D = { transactions: [tx], bills: [bill] };
  const { ctx, fakeDocument } = makeTransaksi(D);
  ctx.editTx(1);
  assert.equal(fakeDocument.getElementById('txCicilanIsKpr').checked, false);
});

test('editTx — cicilan LAMA tanpa field isKpr (undefined) -> checkbox di-set false (bukan undefined/truthy nyasar)', () => {
  const bill = { id: 'b1', kind: 'cicilan', name: 'Cicilan Renovasi Rumah', totalHarga: 15000000, tenor: 12, bunga: 0, nextDue: '2026-08-01', shared: false };
  const tx = { id: 1, type: 'expense', accountId: 'a1', amount: 1250000, category: 'Cicilan', date: '2026-07-01', payMethod: 'cicilan', billLinkId: 'b1' };
  const D = { transactions: [tx], bills: [bill] };
  const { ctx, fakeDocument } = makeTransaksi(D);
  ctx.editTx(1);
  assert.equal(fakeDocument.getElementById('txCicilanIsKpr').checked, false);
});

test('editTx — aman no-op kalau elemen txCicilanIsKpr tidak ada di DOM saat edit cicilan', () => {
  const bill = { id: 'b1', kind: 'cicilan', name: 'Cicilan Motor', totalHarga: 20000000, tenor: 24, bunga: 0, nextDue: '2026-08-01', shared: false, isKpr: true };
  const tx = { id: 1, type: 'expense', accountId: 'a1', amount: 900000, category: 'Cicilan', date: '2026-07-01', payMethod: 'cicilan', billLinkId: 'b1' };
  const D = { transactions: [tx], bills: [bill] };
  const { ctx, fakeDocument } = makeTransaksi(D);
  fakeDocument.getElementById = new Proxy(fakeDocument.getElementById, {
    apply(target, thisArg, args) { return args[0] === 'txCicilanIsKpr' ? null : Reflect.apply(target, thisArg, args); },
  });
  assert.doesNotThrow(() => ctx.editTx(1));
});

// ================= _saveTxInner (jalur bill BARU) — simpan isKpr:true/false =================

test('_saveTxInner — mulai cicilan BARU dgn checkbox Ini KPR dicentang -> bill.isKpr:true', () => {
  const D = { transactions: [], bills: [], products: [], cobek: [] };
  const { ctx } = makeTransaksi(D, {
    curPayMethod: 'cicilan',
    domValues: {
      txAmt: { value: '5000000' }, txCat: { value: 'Cicilan' }, txDate: { value: '2026-07-16' },
      txCicilanNama: { value: 'Cicilan Bulanan BTN' }, txCicilanTotal: { value: '500000000' },
      txCicilanTenor: { value: '120' }, txCicilanBunga: { value: '0' },
      txCicilanDue: { value: '2026-08-01' }, txCicilanIsKpr: { checked: true },
    },
  });
  ctx._saveTxInner();
  assert.equal(D.bills.length, 1);
  assert.equal(D.bills[0].isKpr, true);
  assert.equal(D.bills[0].name, 'Cicilan Bulanan BTN');
});

test('_saveTxInner — mulai cicilan BARU dgn checkbox Ini KPR TIDAK dicentang -> bill.isKpr:false', () => {
  const D = { transactions: [], bills: [], products: [], cobek: [] };
  const { ctx } = makeTransaksi(D, {
    curPayMethod: 'cicilan',
    domValues: {
      txAmt: { value: '900000' }, txCat: { value: 'Cicilan' }, txDate: { value: '2026-07-16' },
      txCicilanNama: { value: 'Cicilan Renovasi Rumah' }, txCicilanTotal: { value: '20000000' },
      txCicilanTenor: { value: '24' }, txCicilanBunga: { value: '0' },
      txCicilanDue: { value: '2026-08-01' }, txCicilanIsKpr: { checked: false },
    },
  });
  ctx._saveTxInner();
  assert.equal(D.bills.length, 1);
  assert.equal(D.bills[0].isKpr, false);
});

test('_saveTxInner — mulai cicilan BARU tanpa elemen txCicilanIsKpr di DOM -> fallback bill.isKpr:false', () => {
  const D = { transactions: [], bills: [], products: [], cobek: [] };
  const { ctx, fakeDocument } = makeTransaksi(D, {
    curPayMethod: 'cicilan',
    domValues: {
      txAmt: { value: '900000' }, txCat: { value: 'Cicilan' }, txDate: { value: '2026-07-16' },
      txCicilanNama: { value: 'Cicilan HP' }, txCicilanTotal: { value: '6000000' },
      txCicilanTenor: { value: '6' }, txCicilanBunga: { value: '0' }, txCicilanDue: { value: '2026-08-01' },
    },
  });
  fakeDocument.getElementById = new Proxy(fakeDocument.getElementById, {
    apply(target, thisArg, args) { return args[0] === 'txCicilanIsKpr' ? null : Reflect.apply(target, thisArg, args); },
  });
  ctx._saveTxInner();
  assert.equal(D.bills[0].isKpr, false);
});

test('_saveTxInner — tenor 1x (lunas langsung, tidak ada sisa) -> tidak bikin bill baru sama sekali (isKpr tidak relevan)', () => {
  const D = { transactions: [], bills: [], products: [], cobek: [] };
  const { ctx } = makeTransaksi(D, {
    curPayMethod: 'cicilan',
    domValues: {
      txAmt: { value: '500000' }, txCat: { value: 'Cicilan' }, txDate: { value: '2026-07-16' },
      txCicilanNama: { value: 'Bayar Lunas' }, txCicilanTotal: { value: '500000' },
      txCicilanTenor: { value: '1' }, txCicilanBunga: { value: '0' },
      txCicilanDue: { value: '2026-07-16' }, txCicilanIsKpr: { checked: true },
    },
  });
  ctx._saveTxInner();
  assert.equal(D.bills.length, 0);
  assert.equal(D.transactions.length, 1);
});

// ================= _saveTxInner (jalur UPDATE bill existing) — simpan isKpr =================

test('_saveTxInner — edit transaksi cicilan TERBARU yg tertaut bill -> ganti isKpr existing dari false ke true', () => {
  const bill = { id: 'b1', kind: 'cicilan', name: 'Cicilan Renovasi Rumah', amount: 1250000, nextDue: '2026-08-01', sisaTenor: 5, category: 'Cicilan', accountId: 'a1', note: '', totalHarga: 15000000, tenor: 12, bunga: 0, shared: false, isKpr: false };
  const tx = { id: 2000, type: 'expense', amount: 1250000, category: 'Cicilan', accountId: 'a1', payMethod: 'cicilan', billLinkId: 'b1', note: 'Cicilan Renovasi Rumah', date: '2026-07-01' };
  const D = { transactions: [tx], bills: [bill], products: [], cobek: [] };
  const { ctx } = makeTransaksi(D, {
    curPayMethod: 'cicilan',
    txEditId: 2000,
    domValues: {
      txAmt: { value: '1250000' }, txCat: { value: 'Cicilan' }, txDate: { value: '2026-07-01' },
      txCicilanNama: { value: 'Cicilan Renovasi Rumah' }, txCicilanTotal: { value: '15000000' },
      txCicilanTenor: { value: '12' }, txCicilanBunga: { value: '0' },
      txCicilanDue: { value: '2026-08-01' }, txCicilanIsKpr: { checked: true },
    },
  });
  ctx._saveTxInner();
  assert.equal(bill.isKpr, true);
});

test('_saveTxInner — edit transaksi cicilan LAMA (bukan instalment terbaru) -> bill.isKpr TIDAK ikut berubah', () => {
  const bill = { id: 'b1', kind: 'cicilan', name: 'Cicilan Bulanan BTN', amount: 5000000, nextDue: '2026-09-01', sisaTenor: 118, category: 'Cicilan', accountId: 'a1', note: '', totalHarga: 500000000, tenor: 120, bunga: 0, shared: false, isKpr: true };
  const txLama = { id: 1000, type: 'expense', amount: 5000000, category: 'Cicilan', accountId: 'a1', payMethod: 'cicilan', billLinkId: 'b1', note: 'Cicilan Bulanan BTN', date: '2026-06-01' };
  const txTerbaru = { id: 2000, type: 'expense', amount: 5000000, category: 'Cicilan', accountId: 'a1', payMethod: 'cicilan', billLinkId: 'b1', note: 'Cicilan Bulanan BTN', date: '2026-07-01' };
  const D = { transactions: [txLama, txTerbaru], bills: [bill], products: [], cobek: [] };
  const { ctx, calls } = makeTransaksi(D, {
    curPayMethod: 'cicilan',
    txEditId: 1000, // mengedit yg LAMA, bukan yg terbaru (2000)
    domValues: {
      txAmt: { value: '5000000' }, txCat: { value: 'Cicilan' }, txDate: { value: '2026-06-01' },
      txCicilanNama: { value: 'Cicilan Bulanan BTN' }, txCicilanTotal: { value: '500000000' },
      txCicilanTenor: { value: '120' }, txCicilanBunga: { value: '0' },
      txCicilanDue: { value: '2026-09-01' }, txCicilanIsKpr: { checked: false }, // dicentang lepas di form, TIDAK boleh nembus ke bill
    },
  });
  ctx._saveTxInner();
  assert.equal(bill.isKpr, true, 'bill.isKpr harus tetap TIDAK berubah krn ini bukan instalment terbaru');
  assert.ok(calls.toast.some((m) => m.includes('cicilan lama')));
});
