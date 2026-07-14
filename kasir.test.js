'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument, createFakeElement } = require('./helpers/fakeDom');

// Cakupan file ini: kasir.js (sebelumnya nol test) — fokus ke jalur inti (renderGrid/renderCart/
// addToCart/changeQty/computeTotals/_checkoutInner) DAN fitur baru sesi ini: integrasi dgn
// PriceRekoWidget.checkOne() (kw194-kasir-order-pricereko) supaya kasir kelihatan kalau Harga
// Jual produk yg lagi dijual sudah menyimpang jauh dari estimasi widget "🤖 Rekomendasi Harga
// Jual AI" di Etalase — TANPA harus bolak-balik buka tab Etalase dulu.
//
// PriceRekoWidget sendiri didefinisikan di cobek.js (beda file) — di sini di-stub lewat
// extraGlobals (fungsi murni: checkOne(p) => {reko,diffPct}|null, openDetail(id) dicatat lewat
// spy), BUKAN loadSource(['cobek.js','kasir.js']) supaya test ini fokus ke kasir.js sendiri &
// tidak ikut menanggung semua dependency cobek.js. Konsistensi rumusnya sendiri sudah dites
// terpisah di tests/cobek.test.js (PriceRekoWidget.checkOne).

function baseD(overrides = {}) {
  return {
    products: [],
    accounts: [{ id: 'acc1', emoji: '💰', name: 'Kas' }],
    cobek: [],
    transactions: [],
    profile: {},
    ...overrides,
  };
}

function makeCtx(D, opts = {}) {
  const ids = [
    'kasirGrid', 'kasirCartList', 'kasirAcc', 'kasirSearch', 'kasirDiskon', 'kasirOngkir',
    'kasirCustName', 'kasirCustPhone', 'kasirNote', 'kasirTotalDisplay', 'kasirProfitDisplay',
    'kasirCheckoutBtn', 'kasirAiCard', 'kasirAiBody',
  ];
  const fields = {};
  ids.forEach((id) => { fields[id] = {}; });
  const fakeDocument = createFakeDocument({ ...fields, ...(opts.domValues || {}) }, opts.queryGroups);
  const calls = { save: 0, toast: [], openDetail: [], render: [] };
  const priceRekoChecks = opts.priceRekoChecks || {}; // { productId: {reko,diffPct} | undefined }
  const ctx = loadSource(['kasir.js'], {
    D,
    document: fakeDocument,
    toast: (msg) => calls.toast.push(msg),
    save: () => { calls.save++; },
    escapeHtml: (s) => String(s == null ? '' : s),
    fmt: (n) => 'Rp' + String(Math.round(n || 0)),
    fmtFull: (n) => 'RpFull' + String(Math.round(n || 0)),
    uid: opts.uid || (() => 'uid-' + Math.random().toString(36).slice(2)),
    withSaveGuard: (key, modalId, fn) => fn(),
    recordShopSale: opts.recordShopSale || (() => ({ ok: true, shopId: 'shop1' })),
    renderProductList: record('renderProductList'),
    renderShop: record('renderShop'),
    renderDashboard: record('renderDashboard'),
    renderKeuangan: record('renderKeuangan'),
    renderSiapPulang: record('renderSiapPulang'),
    Order: { renderRecent: record('Order.renderRecent') },
    PriceRekoWidget: {
      checkOne: (p) => (p && Object.prototype.hasOwnProperty.call(priceRekoChecks, p.id) ? priceRekoChecks[p.id] : null),
      openDetail: (id) => { calls.openDetail.push(id); },
    },
  }, ['Kasir']);
  function record(name) { return (...args) => calls.render.push([name, ...args]); }
  return { ctx, fakeDocument, calls };
}

// ================= renderGrid + integrasi PriceRekoWidget =================

test('Kasir.renderGrid — produk normal (tidak flagged) => tidak ada badge peringatan harga', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Shop Kecil', stock: 5, hargaJual: 20000, hargaBeli: 10000 }] });
  const { ctx, fakeDocument } = makeCtx(D, { priceRekoChecks: { p1: null } });
  ctx.Kasir.renderGrid();
  const html = fakeDocument.getElementById('kasirGrid').innerHTML;
  assert.ok(html.includes('Shop Kecil'));
  assert.ok(!html.includes('kasir-tile-pricewarn'));
});

test('Kasir.renderGrid — produk flagged harga di ATAS estimasi => badge ⬆️ muncul dgn data-action Kasir.openPriceReko', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Shop Mahal', stock: 5, hargaJual: 50000, hargaBeli: 10000 }] });
  const { ctx, fakeDocument } = makeCtx(D, { priceRekoChecks: { p1: { reko: 20000, diffPct: 150 } } });
  ctx.Kasir.renderGrid();
  const html = fakeDocument.getElementById('kasirGrid').innerHTML;
  assert.ok(html.includes('kasir-tile-pricewarn'));
  assert.ok(html.includes('⬆️'));
  assert.ok(html.includes('Kasir.openPriceReko'));
  assert.ok(html.includes('"p1"'));
});

test('Kasir.renderGrid — produk flagged harga di BAWAH estimasi => badge ⬇️', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Shop Murah', stock: 5, hargaJual: 8000, hargaBeli: 10000 }] });
  const { ctx, fakeDocument } = makeCtx(D, { priceRekoChecks: { p1: { reko: 20000, diffPct: -60 } } });
  ctx.Kasir.renderGrid();
  const html = fakeDocument.getElementById('kasirGrid').innerHTML;
  assert.ok(html.includes('kasir-tile-pricewarn'));
  assert.ok(html.includes('⬇️'));
});

test('Kasir.renderGrid — produk habis stok tetap boleh dapat badge, tapi tidak dapat data-action addToCart di tile', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Habis', stock: 0, hargaJual: 50000, hargaBeli: 10000 }] });
  const { ctx, fakeDocument } = makeCtx(D, { priceRekoChecks: { p1: { reko: 20000, diffPct: 150 } } });
  ctx.Kasir.renderGrid();
  const html = fakeDocument.getElementById('kasirGrid').innerHTML;
  assert.ok(html.includes('kasir-tile-disabled'));
  assert.ok(html.includes('kasir-tile-pricewarn')); // badge tetap tampil biar kelihatan walau stok habis
});

test('Kasir.openPriceReko — delegasi ke PriceRekoWidget.openDetail(pid)', () => {
  const D = baseD();
  const { ctx, calls } = makeCtx(D);
  ctx.Kasir.openPriceReko('p1');
  assert.deepEqual(calls.openDetail, ['p1']);
});

test('Kasir.renderCart — item flagged menampilkan hint "Reko Etalase"', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Shop Mahal', stock: 5, hargaJual: 50000, hargaBeli: 10000 }] });
  const { ctx, fakeDocument } = makeCtx(D, { priceRekoChecks: { p1: { reko: 20000, diffPct: 150 } } });
  ctx.Kasir.cart.push({ productId: 'p1', qty: 1, hargaOverride: null });
  ctx.Kasir.renderCart();
  const html = fakeDocument.getElementById('kasirCartList').innerHTML;
  assert.ok(html.includes('Reko Etalase'));
});

test('Kasir.renderCart — item tidak flagged tidak menampilkan hint reko', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'Shop Normal', stock: 5, hargaJual: 20000, hargaBeli: 10000 }] });
  const { ctx, fakeDocument } = makeCtx(D, { priceRekoChecks: { p1: null } });
  ctx.Kasir.cart.push({ productId: 'p1', qty: 1, hargaOverride: null });
  ctx.Kasir.renderCart();
  const html = fakeDocument.getElementById('kasirCartList').innerHTML;
  assert.ok(!html.includes('Reko Etalase'));
});

// ================= jalur inti Kasir (sanity, belum pernah dites sebelumnya) =================

test('Kasir.addToCart — nambah produk baru & menambah qty produk yg sudah ada; ditolak kalau stok kurang', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'A', stock: 1, hargaJual: 1000, hargaBeli: 500 }] });
  const { ctx, calls } = makeCtx(D);
  ctx.Kasir.addToCart('p1');
  assert.equal(ctx.Kasir.cart.length, 1);
  assert.equal(ctx.Kasir.cart[0].qty, 1);
  ctx.Kasir.addToCart('p1'); // stok cuma 1, tidak boleh nambah lagi
  assert.equal(ctx.Kasir.cart[0].qty, 1);
  assert.ok(calls.toast.some((t) => t.includes('Stok')));
});

test('Kasir.computeTotals — subtotal/modal/diskon/ongkir/total/profit dihitung benar', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'A', stock: 10, hargaJual: 10000, hargaBeli: 6000 }] });
  const { ctx, fakeDocument } = makeCtx(D);
  fakeDocument.getElementById('kasirDiskon').value = '1000';
  fakeDocument.getElementById('kasirOngkir').value = '2000';
  ctx.Kasir.cart.push({ productId: 'p1', qty: 2, hargaOverride: null });
  const t = ctx.Kasir.computeTotals();
  assert.equal(t.subtotal, 20000);
  assert.equal(t.modal, 12000);
  assert.equal(t.total, 20000 - 1000 + 2000);
  assert.equal(t.profit, 20000 - 12000 - 1000);
});

test('Kasir._checkoutInner — keranjang kosong => toast, tidak menyimpan apapun', () => {
  const D = baseD();
  const { ctx, calls } = makeCtx(D);
  ctx.Kasir._checkoutInner();
  assert.equal(calls.save, 0);
  assert.ok(calls.toast.some((t) => t.includes('kosong')));
});

test('Kasir._checkoutInner — sukses => push D.transactions income, reset cart, toast sukses', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'A', stock: 10, hargaJual: 10000, hargaBeli: 6000 }] });
  const { ctx, calls } = makeCtx(D, {
    recordShopSale: (payload) => { D.cobek.push({ id: 'shop1', ...payload }); return { ok: true, shopId: 'shop1' }; },
  });
  ctx.Kasir.cart.push({ productId: 'p1', qty: 1, hargaOverride: null });
  ctx.Kasir._checkoutInner();
  assert.equal(D.transactions.length, 1);
  assert.equal(D.transactions[0].type, 'income');
  assert.equal(D.transactions[0].cobekLinkId, 'shop1');
  assert.equal(calls.save, 1);
  assert.equal(ctx.Kasir.cart.length, 0); // Kasir.reset() dipanggil di akhir
  assert.ok(calls.toast.some((t) => t.includes('tersimpan')));
});

test('Kasir._checkoutInner — recordShopSale gagal (mis. stok berubah) => toast pesan, tidak push transaksi', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'A', stock: 10, hargaJual: 10000, hargaBeli: 6000 }] });
  const { ctx, calls } = makeCtx(D, {
    recordShopSale: () => ({ ok: false, message: 'Stok berubah' }),
  });
  ctx.Kasir.cart.push({ productId: 'p1', qty: 1, hargaOverride: null });
  ctx.Kasir._checkoutInner();
  assert.equal(D.transactions.length, 0);
  assert.ok(calls.toast.some((t) => t.includes('Stok berubah')));
});

// ================= filter kategori chip (kw199-kasir-kategori-chip) =================

test('Kasir.availableCategories — cuma kategori yg dipakai minimal 1 produk yg muncul, dgn count benar', () => {
  const D = baseD({
    cobekKategori: [{ id: 'k1', name: 'Minuman' }, { id: 'k2', name: 'Kosong' }, { id: 'k3', name: 'Makanan' }],
    products: [
      { id: 'p1', name: 'Teh', stock: 5, hargaJual: 5000, hargaBeli: 2000, kategoriId: 'k1' },
      { id: 'p2', name: 'Kopi', stock: 5, hargaJual: 8000, hargaBeli: 3000, kategoriId: 'k1' },
      { id: 'p3', name: 'Nasi', stock: 5, hargaJual: 10000, hargaBeli: 5000, kategoriId: 'k3' },
      { id: 'p4', name: 'Tanpa Kategori', stock: 5, hargaJual: 3000, hargaBeli: 1000 },
    ],
  });
  const { ctx } = makeCtx(D);
  // Array hasil balik dari vm context lahir dari realm beda -> assert.deepEqual gagal walau isi
  // sama (sudah didokumentasikan di aset.test.js/fi-calc.test.js). Bandingkan per-field manual.
  const cats = ctx.Kasir.availableCategories();
  assert.equal(cats.length, 2); // 'Kosong' tidak muncul krn tidak ada produk yg pakai
  assert.equal(cats[0].name, 'Makanan'); // urut nama (id 'Kosong' dilewati)
  assert.equal(cats[1].name, 'Minuman');
  assert.equal(cats.find((c) => c.id === 'k1').count, 2);
  assert.equal(cats.find((c) => c.id === 'k3').count, 1);
});

test('Kasir.renderCategoryChips — tidak ada produk berkategori => baris chip disembunyikan', () => {
  const D = baseD({ products: [{ id: 'p1', name: 'A', stock: 5, hargaJual: 1000, hargaBeli: 500 }] });
  const { ctx, fakeDocument } = makeCtx(D, { domValues: { kasirKategoriChips: {} } });
  ctx.Kasir.renderCategoryChips();
  const el = fakeDocument.getElementById('kasirKategoriChips');
  assert.equal(el.style.display, 'none');
  assert.equal(el.innerHTML, '');
});

test('Kasir.renderCategoryChips — ada kategori => render chip "Semua" + tiap kategori, "Semua" default active', () => {
  const D = baseD({
    cobekKategori: [{ id: 'k1', name: 'Minuman' }],
    products: [{ id: 'p1', name: 'Teh', stock: 5, hargaJual: 5000, hargaBeli: 2000, kategoriId: 'k1' }],
  });
  const { ctx, fakeDocument } = makeCtx(D, { domValues: { kasirKategoriChips: {} } });
  ctx.Kasir.renderCategoryChips();
  const el = fakeDocument.getElementById('kasirKategoriChips');
  assert.equal(el.style.display, 'flex');
  assert.ok(el.innerHTML.includes('Semua (1)'));
  assert.ok(el.innerHTML.includes('Minuman (1)'));
  // "Semua" chip aktif duluan krn categoryFilter default ''
  const semuaBtnHtml = el.innerHTML.slice(0, el.innerHTML.indexOf('Minuman'));
  assert.ok(semuaBtnHtml.includes('active'));
});

test('Kasir.setCategoryFilter + filteredProducts — filter berdasar kategori, digabung dgn search', () => {
  const D = baseD({
    cobekKategori: [{ id: 'k1', name: 'Minuman' }, { id: 'k3', name: 'Makanan' }],
    products: [
      { id: 'p1', name: 'Teh Manis', stock: 5, hargaJual: 5000, hargaBeli: 2000, kategoriId: 'k1' },
      { id: 'p2', name: 'Kopi Susu', stock: 5, hargaJual: 8000, hargaBeli: 3000, kategoriId: 'k1' },
      { id: 'p3', name: 'Nasi Goreng', stock: 5, hargaJual: 10000, hargaBeli: 5000, kategoriId: 'k3' },
    ],
  });
  const { ctx, fakeDocument } = makeCtx(D, { domValues: { kasirKategoriChips: {} } });
  ctx.Kasir.setCategoryFilter('k1');
  assert.equal(ctx.Kasir.categoryFilter, 'k1');
  let filtered = ctx.Kasir.filteredProducts();
  assert.equal(filtered.length, 2);
  assert.equal(filtered[0].name, 'Teh Manis');
  assert.equal(filtered[1].name, 'Kopi Susu');
  const gridHtml = fakeDocument.getElementById('kasirGrid').innerHTML;
  assert.ok(gridHtml.includes('Teh Manis') && gridHtml.includes('Kopi Susu'));
  assert.ok(!gridHtml.includes('Nasi Goreng'));
  ctx.Kasir.onSearch('kopi');
  filtered = ctx.Kasir.filteredProducts();
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].name, 'Kopi Susu'); // kategori + search digabung (AND)
  ctx.Kasir.setCategoryFilter(''); // balik ke "Semua"
  assert.equal(ctx.Kasir.categoryFilter, '');
});

test('Kasir.reset — categoryFilter ikut kembali ke "" (semua)', () => {
  const D = baseD({
    cobekKategori: [{ id: 'k1', name: 'Minuman' }],
    products: [{ id: 'p1', name: 'Teh', stock: 5, hargaJual: 5000, hargaBeli: 2000, kategoriId: 'k1' }],
  });
  const { ctx, fakeDocument } = makeCtx(D, { domValues: { kasirKategoriChips: {}, kasirDiskon: {}, kasirOngkir: {}, kasirCustName: {}, kasirCustPhone: {}, kasirNote: {} } });
  ctx.Kasir.setCategoryFilter('k1');
  assert.equal(ctx.Kasir.categoryFilter, 'k1');
  ctx.Kasir.reset();
  assert.equal(ctx.Kasir.categoryFilter, '');
  assert.equal(fakeDocument.getElementById('kasirKategoriChips').style.display, 'flex'); // masih ada kategori -> chip tetap tampil, cuma balik ke "Semua"
});
