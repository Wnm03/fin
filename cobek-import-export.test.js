'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

// cobek-import-export.test.js — lanjutan cakupan cobek-io.js (5 file hasil split
// cobek.js) yang BELUM disentuh tests/cobek.test.js: ImportKatalog (impor massal
// produk dari teks tempel), ShopExport (builder baris utk export XLSX — HANYA
// bagian pure row-builder: etalaseRows/produsenRows/riwayatRows/pelangganRows/
// laporanRows, BUKAN exportXxx()/_download()/_ensureLib() yang bergantung
// pustaka XLSX & file download nyata — di luar cakupan harness vm murni ini,
// sama alasannya dgn kenapa Order.save/withSaveGuard tidak dites di
// cobek.test.js, cuma _saveInner-nya), dan ImportShopExcel (kebalikan
// ShopExport: baca hasil parse baris Excel yg SUDAH di-array-kan — HANYA
// _parse()/commit()/setTarget()/open(), BUKAN onFileSelected() yang butuh
// stub File/XLSX.read() nyata).
//
// `ImportKatalog`/`ShopExport`/`ImportShopExcel` dideklarasikan `const` di
// top-level cobek-io.js (bukan `function`), jadi HARUS di-expose eksplisit
// lewat parameter ke-3 loadSource() (lihat catatan di loadSource.js) —
// inilah kenapa 3 namespace ini sebelumnya 0% tercakup: makeCtx() di
// cobek.test.js cuma expose 10 namespace lain, bukan 3 ini.

function baseD(overrides = {}) {
  return {
    products: [],
    produsen: [],
    cobek: [],
    cobekKategori: [],
    ...overrides,
  };
}

function baseFields(overrides = {}) {
  const ids = [
    'importKatalogText', 'importKatalogPreview', 'importKatalogTargetReseller',
    'importKatalogCommitBtn',
    'importShopExcelFile', 'importShopExcelPreview', 'importShopExcelCommitBtn',
    'importShopExcelTargetEtalase', 'importShopExcelTargetProdusen',
  ];
  const fields = {};
  ids.forEach((id) => { fields[id] = {}; });
  return { ...fields, ...overrides };
}

function makeCtx(D, opts = {}) {
  const fakeDocument = createFakeDocument(baseFields(opts.domValues), opts.queryGroups);
  const calls = { save: 0, toast: [], closeModal: [], openModal: [], render: [] };
  const ctx = loadSource(['modules/shop/cobek-etalase.js', 'modules/shop/cobek-pricing.js', 'modules/shop/cobek-order.js', 'modules/shop/cobek-tx-cart.js', 'modules/shop/cobek-io.js'], {
    D,
    document: fakeDocument,
    toast: (msg) => calls.toast.push(msg),
    save: () => { calls.save++; },
    closeModal: (id) => calls.closeModal.push(id),
    openModal: (id) => calls.openModal.push(id),
    askConfirm: opts.askConfirm || (async () => true),
    showPromptModal: opts.showPromptModal || (async () => null),
    uid: opts.uid || (() => 'uid-' + Math.random().toString(36).slice(2)),
    escapeHtml: (s) => String(s == null ? '' : s),
    fmt: (n) => 'Rp' + String(Math.round(n || 0)),
    fmtFull: (n) => 'RpFull' + String(Math.round(n || 0)),
    fmtFullSigned: (n) => (n < 0 ? '-' : '') + 'RpFull' + String(Math.round(Math.abs(n || 0))),
    jsAttrEscape: (s) => String(s == null ? '' : s),
    hideSuggestBox: (id) => calls.render.push(['hideSuggestBox', id]),
    MONTHS: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
    withSaveGuard: (key, modalId, fn) => fn(),
    withSaveGuardAsync: async (key, modalId, fn) => await fn(),
    ensureXLSX: opts.ensureXLSX || (async () => {}),
  }, [
    'Etalase', 'PriceReko', 'OngkirCalc', 'PriceRekoWidget', 'StockRekoWidget', 'Produsen',
    'SiapPulang', 'Order', 'Laporan', 'Pelanggan',
    'ImportKatalog', 'ShopExport', 'ImportShopExcel',
  ]);
  return { ctx, fakeDocument, calls };
}

// ================= ImportKatalog =================

test('ImportKatalog._parsePrice — angka polos, "rb"/"ribu"/"k" dikali 1000, non-digit diabaikan', () => {
  const D = baseD();
  const { ctx } = makeCtx(D);
  assert.equal(ctx.ImportKatalog._parsePrice('30000'), 30000);
  assert.equal(ctx.ImportKatalog._parsePrice('Rp30.000'), 30000);
  assert.equal(ctx.ImportKatalog._parsePrice('60rb'), 60000);
  assert.equal(ctx.ImportKatalog._parsePrice('60 ribu'), 60000);
  assert.equal(ctx.ImportKatalog._parsePrice('60k'), 60000);
  assert.equal(ctx.ImportKatalog._parsePrice('abc'), 0);
});

test('ImportKatalog._parse — baris tanpa harga jadi nama kategori utk baris2 sesudahnya', () => {
  const D = baseD();
  const { ctx } = makeCtx(D);
  const text = 'Batu Alam\nAkik Merah\t30rb\nAkik Kuning 45.000\nAksesoris\nGantungan 10rb';
  const items = ctx.ImportKatalog._parse(text);
  assert.equal(JSON.stringify(items), JSON.stringify([
    { name: 'Akik Merah', price: 30000, kategori: 'Batu Alam' },
    { name: 'Akik Kuning', price: 45000, kategori: 'Batu Alam' },
    { name: 'Gantungan', price: 10000, kategori: 'Aksesoris' },
  ]));
});

test('ImportKatalog._parse — baris kosong diabaikan, harga 0/tidak valid tidak masuk hasil', () => {
  const D = baseD();
  const { ctx } = makeCtx(D);
  const items = ctx.ImportKatalog._parse('Kategori X\n\nBarang Gratis 0rb\nBarang Wajar 5rb\n   \n');
  assert.equal(JSON.stringify(items), JSON.stringify([{ name: 'Barang Wajar', price: 5000, kategori: 'Kategori X' }]));
});

test('ImportKatalog.preview — teks kosong: toast peringatan, tidak menyentuh box', () => {
  const D = baseD();
  const { ctx, calls } = makeCtx(D, { domValues: { importKatalogText: { value: '   ' } } });
  ctx.ImportKatalog.preview();
  assert.equal(calls.toast.length, 1);
  assert.match(calls.toast[0], /Tempel dulu/);
});

test('ImportKatalog.preview — tidak ada baris harga kebaca: pesan kosong & commit disabled', () => {
  const D = baseD();
  const { ctx, fakeDocument } = makeCtx(D, { domValues: { importKatalogText: { value: 'cuma judul tanpa harga' } } });
  ctx.ImportKatalog.preview();
  assert.match(fakeDocument.getElementById('importKatalogPreview').innerHTML, /Tidak ada baris harga/);
  assert.equal(fakeDocument.getElementById('importKatalogCommitBtn').disabled, true);
});

test('ImportKatalog.preview — data valid: parsed[] terisi, preview HTML berisi jumlah produk/kategori, commit enabled', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Akik Merah' }] });
  const { ctx, fakeDocument } = makeCtx(D, { domValues: { importKatalogText: { value: 'Batu\nAkik Merah 30rb\nAkik Baru 20rb' } } });
  ctx.ImportKatalog.preview();
  assert.equal(ctx.ImportKatalog.parsed.length, 2);
  const html = fakeDocument.getElementById('importKatalogPreview').innerHTML;
  assert.match(html, /2 produk kebaca dari 1 kategori/);
  assert.match(html, /update/); // Akik Merah sudah ada di D.products
  assert.match(html, /baru/); // Akik Baru belum ada
  assert.equal(fakeDocument.getElementById('importKatalogCommitBtn').disabled, false);
});

test('ImportKatalog.commit — belum preview (parsed kosong): toast peringatan, tidak menyentuh D.products', () => {
  const D = baseD({ products: [] });
  const { ctx, calls } = makeCtx(D);
  ctx.ImportKatalog.commit();
  assert.equal(calls.toast.length, 1);
  assert.match(calls.toast[0], /Klik Pratinjau dulu/);
  assert.equal(D.products.length, 0);
  assert.equal(calls.save, 0);
});

test('ImportKatalog.commit — produk baru dibuat sesuai target harga (reseller), produk existing di-update', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Akik Merah', hargaJual: 25000, hargaReseller: 20000 }], cobekKategori: [] });
  const { ctx, calls } = makeCtx(D);
  ctx.ImportKatalog.target = 'reseller';
  ctx.ImportKatalog.parsed = [
    { name: 'Akik Merah', price: 30000, kategori: '' },
    { name: 'Akik Baru', price: 15000, kategori: '' },
  ];
  ctx.ImportKatalog.commit();
  assert.equal(D.products.length, 2);
  const existing = D.products.find((p) => p.name === 'Akik Merah');
  assert.equal(existing.hargaJual, 30000);
  assert.equal(existing.hargaReseller, 30000); // ikut ke-update krn target='reseller'
  const created = D.products.find((p) => p.name === 'Akik Baru');
  assert.equal(created.hargaJual, 15000);
  assert.equal(created.hargaReseller, 15000);
  assert.equal(created.stock, 0);
  assert.equal(calls.save, 1);
  assert.equal(calls.closeModal[0], 'importKatalogModal');
  assert.match(calls.toast[0], /1 produk baru, 1 diperbarui/);
  assert.equal(ctx.ImportKatalog.parsed.length, 0); // direset setelah commit
});

test('ImportKatalog.commit — target "beli": hargaBeli produk baru terisi, hargaReseller null', () => {
  const D = baseD({ products: [] });
  const { ctx } = makeCtx(D);
  ctx.ImportKatalog.target = 'beli';
  ctx.ImportKatalog.parsed = [{ name: 'Barang Modal', price: 8000, kategori: '' }];
  ctx.ImportKatalog.commit();
  const created = D.products[0];
  assert.equal(created.hargaBeli, 8000);
  assert.equal(created.hargaJual, 8000);
  assert.equal(created.hargaReseller, null);
});

test('ImportKatalog.open — reset parsed/target, kosongkan field teks & preview, buka modal', () => {
  const D = baseD();
  const { ctx, fakeDocument, calls } = makeCtx(D, { domValues: { importKatalogText: { value: 'sisa lama' }, importKatalogPreview: { innerHTML: 'sisa preview' } } });
  ctx.ImportKatalog.parsed = [{ name: 'x', price: 1, kategori: '' }];
  ctx.ImportKatalog.target = 'beli';
  ctx.ImportKatalog.open();
  assert.equal(ctx.ImportKatalog.parsed.length, 0);
  assert.equal(ctx.ImportKatalog.target, 'reseller');
  assert.equal(fakeDocument.getElementById('importKatalogText').value, '');
  assert.equal(fakeDocument.getElementById('importKatalogPreview').innerHTML, '');
  assert.equal(fakeDocument.getElementById('importKatalogCommitBtn').disabled, true);
  assert.ok(calls.openModal.includes('importKatalogModal'));
});

test('ImportKatalog.setTarget — ganti target & toggle class active tombol yang dipilih', () => {
  const D = baseD();
  const btnBeli = { classList: { add: () => {}, remove: () => {} } };
  let addedActive = false;
  btnBeli.classList.add = () => { addedActive = true; };
  const { ctx } = makeCtx(D);
  ctx.ImportKatalog.setTarget('beli', btnBeli);
  assert.equal(ctx.ImportKatalog.target, 'beli');
  assert.equal(addedActive, true);
});

// ================= ShopExport (row builder murni) =================

test('ShopExport.etalaseRows — header + 1 baris per produk, margin Rp & % terhitung benar', () => {
  const D = baseD({
    products: [{ name: 'Akik', kategoriId: '', produsenId: '', stock: 10, hargaBeli: 20000, hargaJual: 30000, hargaReseller: 25000, diskonPersen: 0 }],
    produsen: [],
  });
  const { ctx } = makeCtx(D);
  const rows = ctx.ShopExport.etalaseRows();
  assert.equal(rows.length, 2);
  assert.equal(rows[0][0], 'Nama Produk');
  const r = rows[1];
  assert.equal(r[0], 'Akik');
  assert.equal(r[3], 10); // stok
  assert.equal(r[4], 20000); // beli
  assert.equal(r[5], 30000); // jual
  assert.equal(r[8], 10000); // margin Rp = 30000-20000
  assert.equal(r[9], 50); // margin % = 10000/20000*100
});

test('ShopExport.etalaseRows — hargaBeli 0: margin % tidak NaN/Infinity (fallback 0)', () => {
  const D = baseD({ products: [{ name: 'Gratisan', stock: 1, hargaBeli: 0, hargaJual: 5000 }] });
  const { ctx } = makeCtx(D);
  const rows = ctx.ShopExport.etalaseRows();
  assert.equal(rows[1][9], 0);
});

test('ShopExport.produsenRows — jumlah produk terhubung dihitung dari hargaByProdusen', () => {
  const D = baseD({
    produsen: [{ id: 'pr1', name: 'Supplier A', contact: '0812', note: '', jarakKm: 5, biayaPerKm: 2000 }],
    products: [
      { hargaByProdusen: { pr1: 1000 } },
      { hargaByProdusen: { pr1: 2000 } },
      { hargaByProdusen: {} },
    ],
  });
  const { ctx } = makeCtx(D);
  const rows = ctx.ShopExport.produsenRows();
  assert.equal(rows[1][0], 'Supplier A');
  assert.equal(rows[1][5], 2); // jumlah produk terhubung
});

test('ShopExport.riwayatRows — hanya transaksi dalam range Laporan.getRange() (periode tab Riwayat), format item terjual "nama xqty"', () => {
  const D = baseD({
    cobek: [
      { id: 2, date: '2026-07-10', customer: { name: 'Budi', phone: '0812', address: 'Jl A' }, items: [{ name: 'Akik', qty: 2 }], priceType: 'reseller', subtotal: 60000, diskon: 0, ongkir: 5000, total: 65000, profit: 20000, delivered: true },
      { id: 1, date: '2000-01-01', customer: { name: 'Lama' }, items: [{ name: 'X', qty: 1 }], total: 1000, profit: 0 },
    ],
  });
  const { ctx } = makeCtx(D);
  ctx.Laporan.periode = 'bulan-ini';
  ctx.Laporan.getRange = () => ({ from: new Date('2026-07-01'), to: new Date('2026-07-31') });
  const rows = ctx.ShopExport.riwayatRows();
  assert.equal(rows.length, 2); // header + 1 transaksi dalam range
  assert.equal(rows[1][1], 'Budi');
  assert.equal(rows[1][4], 'Akik x2');
  assert.equal(rows[1][11], 'Sudah');
});

test('ShopExport.riwayatRows — transaksi data lama (tanpa .items, ada .sets): baris fallback "N set (data lama)"', () => {
  const D = baseD({ cobek: [{ id: 1, date: '2026-07-05', sets: 3, total: 9000, profit: 1000, note: 'lama' }] });
  const { ctx } = makeCtx(D);
  ctx.Laporan.getRange = () => ({ from: new Date('2026-07-01'), to: new Date('2026-07-31') });
  const rows = ctx.ShopExport.riwayatRows();
  assert.equal(rows[1][4], '3 set (data lama)');
  assert.equal(rows[1][9], 9000);
});

test('ShopExport.pelangganRows — delegasi ke Pelanggan.aggregate(), langganan "Ya" jika order>=3', () => {
  const D = baseD();
  const { ctx } = makeCtx(D);
  ctx.Pelanggan.aggregate = () => [
    { name: 'Budi', phone: '0812', address: 'Jl A', orders: [1, 2, 3], totalOmzet: 300000, totalProfit: 50000 },
    { name: 'Sari', phone: '0813', address: 'Jl B', orders: [1], totalOmzet: 50000, totalProfit: 10000 },
  ];
  const rows = ctx.ShopExport.pelangganRows();
  assert.equal(rows.length, 3);
  assert.equal(rows[1][6], 'Ya');
  assert.equal(rows[2][6], 'Tidak');
});

test('ShopExport.laporanRows — ringkasan periode Laporan (getRangeLap, TERPISAH dari getRange tab Riwayat) + top produk', () => {
  const D = baseD({ cobek: [{ id: 1, date: '2026-07-05', total: 100000, profit: 30000 }] });
  const { ctx } = makeCtx(D);
  ctx.Laporan.getRangeLap = () => ({ from: new Date('2026-07-01'), to: new Date('2026-07-31') });
  ctx.Laporan.topProdukAgg = () => [{ name: 'Akik', qty: 5, omzet: 100000 }];
  const rows = ctx.ShopExport.laporanRows();
  assert.equal(JSON.stringify(rows[0]), JSON.stringify(['Ringkasan Periode Ini']));
  assert.equal(JSON.stringify(rows[1]), JSON.stringify(['Jumlah Transaksi', 1]));
  assert.equal(JSON.stringify(rows[2]), JSON.stringify(['Total Omzet', 100000]));
  assert.equal(JSON.stringify(rows[3]), JSON.stringify(['Total Untung', 30000]));
  assert.equal(JSON.stringify(rows[4]), JSON.stringify(['Margin Rata-rata (%)', 30]));
  const topRow = rows.find((r) => r[0] === 'Akik');
  assert.equal(JSON.stringify(topRow), JSON.stringify(['Akik', 5, 100000]));
});

test('ShopExport.laporanRows — omzet 0 (tidak ada transaksi dalam range): margin rata-rata fallback 0, bukan NaN', () => {
  const D = baseD({ cobek: [] });
  const { ctx } = makeCtx(D);
  ctx.Laporan.getRangeLap = () => ({ from: new Date('2026-07-01'), to: new Date('2026-07-31') });
  ctx.Laporan.topProdukAgg = () => [];
  const rows = ctx.ShopExport.laporanRows();
  assert.equal(JSON.stringify(rows[4]), JSON.stringify(['Margin Rata-rata (%)', 0]));
});

// ================= ImportShopExcel (_parse/commit murni, tanpa file/XLSX nyata) =================

test('ImportShopExcel._parse — target etalase: map header Excel ke field produk, baris tanpa nama dibuang', () => {
  const D = baseD();
  const { ctx } = makeCtx(D);
  ctx.ImportShopExcel.target = 'etalase';
  ctx.ImportShopExcel._parse([
    { 'Nama Produk': 'Akik', 'Kategori': 'Batu', 'Produsen': 'Supplier A', 'Stok': '10', 'Harga Beli': '20000', 'Harga Jual': '30000', 'Harga Reseller': '25000', 'Diskon %': '5' },
    { 'Nama Produk': '', 'Stok': '1' }, // dibuang, nama kosong
  ]);
  assert.equal(ctx.ImportShopExcel.parsedRows.length, 1);
  const r = ctx.ImportShopExcel.parsedRows[0];
  assert.equal(r.name, 'Akik');
  assert.equal(r.stock, 10);
  assert.equal(r.hargaBeli, 20000);
  assert.equal(r.hargaReseller, 25000);
  assert.equal(r.diskonPersen, 5);
});

test('ImportShopExcel._parse — target produsen: map header Kontak/Catatan/Jarak/Biaya per km', () => {
  const D = baseD();
  const { ctx } = makeCtx(D);
  ctx.ImportShopExcel.target = 'produsen';
  ctx.ImportShopExcel._parse([
    { 'Nama Produsen': 'Supplier B', 'Kontak': '0812', 'Catatan': 'cepat', 'Jarak (km)': '5', 'Biaya/km': '2000' },
  ]);
  assert.equal(ctx.ImportShopExcel.parsedRows.length, 1);
  assert.equal(ctx.ImportShopExcel.parsedRows[0].name, 'Supplier B');
  assert.equal(ctx.ImportShopExcel.parsedRows[0].jarakKm, 5);
});

test('ImportShopExcel.commit — target etalase kosong: toast peringatan, tidak mengubah D.products', () => {
  const D = baseD({ products: [] });
  const { ctx, calls } = makeCtx(D);
  ctx.ImportShopExcel.target = 'etalase';
  ctx.ImportShopExcel.parsedRows = [];
  ctx.ImportShopExcel.commit();
  assert.match(calls.toast[0], /Belum ada data/);
  assert.equal(D.products.length, 0);
});

test('ImportShopExcel.commit — target etalase: produk baru dibuat, existing (match nama, case-insensitive) di-update', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'akik merah', stock: 1, hargaBeli: 1000, hargaJual: 2000 }] });
  const { ctx, calls } = makeCtx(D);
  ctx.ImportShopExcel.target = 'etalase';
  ctx.ImportShopExcel.parsedRows = [
    { name: 'Akik Merah', kategori: '', produsen: '', stock: 20, hargaBeli: 15000, hargaJual: 25000, hargaReseller: null, diskonPersen: 0 },
    { name: 'Akik Baru', kategori: '', produsen: '', stock: 5, hargaBeli: 3000, hargaJual: 6000, hargaReseller: null, diskonPersen: 0 },
  ];
  ctx.ImportShopExcel.commit();
  assert.equal(D.products.length, 2);
  const updated = D.products.find((p) => p.id === 'p1');
  assert.equal(updated.stock, 20);
  assert.equal(updated.hargaJual, 25000);
  const created = D.products.find((p) => p.name === 'Akik Baru');
  assert.equal(created.stock, 5);
  assert.equal(calls.save, 1);
  assert.equal(calls.closeModal[0], 'importShopExcelModal');
  assert.match(calls.toast[0], /1 produk baru, 1 diperbarui/);
  assert.equal(ctx.ImportShopExcel.parsedRows.length, 0);
});

test('ImportShopExcel.commit — target produsen: produsen baru dibuat, existing di-update (kontak/catatan/jarak/biaya)', () => {
  const D = baseD({ produsen: [{ id: 'pr1', name: 'Supplier A', contact: 'lama', note: '', jarakKm: 1, biayaPerKm: 500 }] });
  const { ctx, calls } = makeCtx(D);
  ctx.ImportShopExcel.target = 'produsen';
  ctx.ImportShopExcel.parsedRows = [
    { name: 'Supplier A', kontak: '0812baru', catatan: 'update', jarakKm: 7, biayaPerKm: 2500 },
    { name: 'Supplier Baru', kontak: '0899', catatan: '', jarakKm: '', biayaPerKm: '' },
  ];
  ctx.ImportShopExcel.commit();
  assert.equal(D.produsen.length, 2);
  const updated = D.produsen.find((p) => p.id === 'pr1');
  assert.equal(updated.contact, '0812baru');
  assert.equal(updated.jarakKm, 7);
  const created = D.produsen.find((p) => p.name === 'Supplier Baru');
  assert.equal(created.jarakKm, '');
  assert.equal(calls.closeModal[0], 'importShopExcelModal');
  assert.match(calls.toast[0], /1 baru, 1 diperbarui/);
});

test('ImportShopExcel.setTarget — ganti target, reset parsedRows & preview, kosongkan input file', () => {
  const D = baseD();
  const { ctx, fakeDocument } = makeCtx(D, { domValues: { importShopExcelPreview: { innerHTML: 'sisa' }, importShopExcelFile: { value: 'C:\\fakepath\\x.xlsx' } } });
  ctx.ImportShopExcel.parsedRows = [{ name: 'sisa' }];
  ctx.ImportShopExcel.setTarget('produsen', null);
  assert.equal(ctx.ImportShopExcel.target, 'produsen');
  assert.equal(ctx.ImportShopExcel.parsedRows.length, 0);
  assert.equal(fakeDocument.getElementById('importShopExcelPreview').innerHTML, '');
  assert.equal(fakeDocument.getElementById('importShopExcelFile').value, '');
  assert.equal(fakeDocument.getElementById('importShopExcelCommitBtn').disabled, true);
});

test('ImportShopExcel.open — default target "etalase", reset parsedRows, kosongkan file & preview, buka modal', () => {
  const D = baseD();
  const { ctx, fakeDocument, calls } = makeCtx(D, { domValues: { importShopExcelFile: { value: 'sisa' } } });
  ctx.ImportShopExcel.parsedRows = [{ name: 'sisa' }];
  ctx.ImportShopExcel.open();
  assert.equal(ctx.ImportShopExcel.target, 'etalase');
  assert.equal(ctx.ImportShopExcel.parsedRows.length, 0);
  assert.equal(fakeDocument.getElementById('importShopExcelFile').value, '');
  assert.ok(calls.openModal.includes('importShopExcelModal'));
});
