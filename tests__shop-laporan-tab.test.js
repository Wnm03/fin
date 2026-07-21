'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// shop-laporan-tab.test.js — Bangun UI utk tab "📊 Laporan" di Shop
// (kw-shop-laporan-tab) yang sebelumnya TIDAK PERNAH punya markup HTML sama
// sekali, walau logic-nya (Laporan.renderTab()/topProdukAgg()/
// renderTopProduk()/renderTopPelanggan()/setPeriodeLap()/getRangeLap() di
// cobek-order.js, exportLaporanShopXLSX() di cobek-io.js, dan cabang
// t==='laporan' di setShopTab()) sudah ada sejak lama tanpa pernah bisa
// diakses user (tidak ada tombol tab & tidak ada elemen #lapTrip/#lapOmzet/
// dst di index.html). Sesi ini menambahkan HANYA markup: 1 tombol tab baru,
// 1 div #shopTab-laporan berisi filter periode + 4 kartu stat + grafik +
// top produk + top pelanggan, dan 1 FAB kontekstual (#shopLaporanFab,
// pola sama persis dgn #laporanFab di tab Laporan Keuangan/REPORTS-2.0.md).
// TIDAK ADA business logic baru selain 1 wrapper tipis renderShopLaporan()
// (pola sama dgn renderShop()/renderShopGrafik() yang sudah ada) supaya
// input tanggal custom range bisa memanggil Laporan.renderTab().

const ROOT = path.join(__dirname, '..');
const HTML_FILES = ['index.html', 'app_production.html'];

function readHtml(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function readCss() {
  return fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
}

function extractShopLaporanTab(html) {
  const start = html.indexOf('<div id="shopTab-laporan"');
  const end = html.indexOf('<!-- CAR NOTES -->', start);
  assert.ok(start !== -1 && end !== -1 && end > start, 'blok markup tab Laporan Shop harus ditemukan');
  return html.slice(start, end);
}

function extractShopLaporanFabBlock(html) {
  const start = html.indexOf('<div class="keu-fab" id="shopLaporanFab">');
  const end = html.indexOf('id="lapPeriodeChips"', start);
  assert.ok(start !== -1 && end !== -1 && end > start, 'blok markup FAB Laporan Shop harus ditemukan');
  return html.slice(start, end);
}

for (const htmlFile of HTML_FILES) {
  test(`${htmlFile}: tombol tab "📊 Laporan" ada di deretan tab Shop, memanggil setShopTab (bukan fungsi baru)`, () => {
    const html = readHtml(htmlFile);
    const tabsIdx = html.indexOf('id="shopFab"');
    const pelangganBtnIdx = html.indexOf('setShopTab" data-args=\'["pelanggan"');
    const lapBtnIdx = html.indexOf('setShopTab" data-args=\'["laporan"');
    assert.ok(tabsIdx !== -1 && pelangganBtnIdx !== -1 && lapBtnIdx !== -1);
    assert.ok(
      pelangganBtnIdx < lapBtnIdx && lapBtnIdx < tabsIdx,
      `tombol tab Laporan harus berada setelah tombol Pelanggan & sebelum #shopFab di ${htmlFile}`
    );
  });

  test(`${htmlFile}: #shopTab-laporan ada di dalam #page-shop, setelah #shopTab-pelanggan`, () => {
    const html = readHtml(htmlFile);
    const pageStart = html.indexOf('id="page-shop"');
    const pelangganIdx = html.indexOf('id="shopTab-pelanggan"');
    const lapIdx = html.indexOf('id="shopTab-laporan"');
    const carNotesIdx = html.indexOf('id="page-carnotes"');
    assert.ok(pageStart !== -1 && pelangganIdx !== -1 && lapIdx !== -1 && carNotesIdx !== -1);
    assert.ok(
      pageStart < pelangganIdx && pelangganIdx < lapIdx && lapIdx < carNotesIdx,
      `#shopTab-laporan harus berada di dalam #page-shop, setelah #shopTab-pelanggan, sebelum #page-carnotes di ${htmlFile}`
    );
  });

  test(`${htmlFile}: #shopTab-laporan berisi elemen yang sudah dicari Laporan.renderTab()/topProdukAgg()/renderTopProduk()/renderTopPelanggan() (cobek-order.js, tidak disentuh)`, () => {
    const block = extractShopLaporanTab(readHtml(htmlFile));
    for (const id of ['lapTrip', 'lapOmzet', 'lapUntung', 'lapMargin', 'lapGrafikBars', 'lapTopProduk', 'lapTopPelanggan']) {
      assert.match(block, new RegExp(`id="${id}"`), `#shopTab-laporan harus punya elemen #${id}`);
    }
  });

  test(`${htmlFile}: filter periode Laporan Shop (#lapPeriodeChips/#lapCustomRange) TERPISAH dari filter periode tab Riwayat (#shopPeriodeChips), memanggil setLaporanPeriode (reuse Laporan.setPeriodeLap, tidak disentuh)`, () => {
    const block = extractShopLaporanTab(readHtml(htmlFile));
    assert.match(block, /id="lapPeriodeChips"/);
    assert.match(block, /id="lapCustomRange"/);
    assert.match(block, /id="lapFrom"/);
    assert.match(block, /id="lapTo"/);
    assert.match(block, /data-action="setLaporanPeriode"/);
    assert.doesNotMatch(block, /id="shopPeriodeChips"/, '#shopTab-laporan tidak boleh reuse id filter periode tab Riwayat (state periode harus terpisah, lihat Laporan.periodeLap)');
  });

  test(`${htmlFile}: input tanggal custom range Laporan Shop memanggil renderShopLaporan() (wrapper tipis baru, bukan renderShop() milik tab Riwayat)`, () => {
    const block = extractShopLaporanTab(readHtml(htmlFile));
    assert.match(block, /onchange="renderShopLaporan\(\)"/);
  });

  test(`${htmlFile}: 4 kartu stat Laporan Shop reuse class CSS .grid2/.stat-box/.stat-val/.stat-label yang sudah ada (tidak ada class grid-4 baru)`, () => {
    const block = extractShopLaporanTab(readHtml(htmlFile));
    assert.match(block, /class="grid2"/);
    assert.match(block, /class="stat-box u-tac"/);
    const statBoxCount = (block.match(/class="stat-box u-tac"/g) || []).length;
    assert.equal(statBoxCount, 4, 'harus ada tepat 4 kartu stat (Transaksi/Omzet/Untung/Margin)');
  });

  test(`${htmlFile}: grafik Laporan Shop reuse class .grafik-bar-wrap yang sama dgn tab Riwayat (Laporan.renderGrafik() generik menerima elId, tidak disentuh)`, () => {
    const block = extractShopLaporanTab(readHtml(htmlFile));
    assert.match(block, /class="grafik-bar-wrap" id="lapGrafikBars"/);
  });

  test(`${htmlFile}: FAB Laporan Shop (#shopLaporanFab) ada DI DALAM #shopTab-laporan (kontekstual, ikut ter-toggle 'u-dnone' oleh setShopTab() yang sudah ada)`, () => {
    const html = readHtml(htmlFile);
    const tabIdx = html.indexOf('id="shopTab-laporan"');
    const fabIdx = html.indexOf('id="shopLaporanFab"');
    const shopFabIdx = html.indexOf('id="shopFab"');
    assert.ok(tabIdx !== -1 && fabIdx !== -1 && shopFabIdx !== -1);
    assert.ok(
      fabIdx > tabIdx,
      `#shopLaporanFab harus berada di dalam/di bawah pembukaan #shopTab-laporan di ${htmlFile}`
    );
    assert.ok(
      shopFabIdx < tabIdx,
      `#shopFab (Sprint 2 Tahap 2) harus tetap SEBELUM #shopTab-laporan (tidak diubah strukturnya) supaya tetap tampil di seluruh tab Shop`
    );
  });

  test(`${htmlFile}: FAB Laporan Shop 100% reuse class CSS .keu-fab* (tidak ada class baru dibuat)`, () => {
    const block = extractShopLaporanFabBlock(readHtml(htmlFile));
    assert.match(block, /class="keu-fab" id="shopLaporanFab"/);
    assert.match(block, /class="keu-fab-actions"/);
    assert.match(block, /class="keu-fab-action"/);
    assert.match(block, /class="keu-fab-main"/);
    assert.match(block, /class="keu-fab-main-icon"/);
  });

  test(`${htmlFile}: tombol FAB Laporan Shop memanggil exportLaporanShopXLSX() dan exportShopSemuaXLSX() (reuse fungsi lama, tidak ada fungsi baru)`, () => {
    const block = extractShopLaporanFabBlock(readHtml(htmlFile));
    assert.match(block, /exportLaporanShopXLSX\(\)/);
    assert.match(block, /exportShopSemuaXLSX\(\)/);
  });

  test(`${htmlFile}: FAB Laporan Shop toggle pakai data-onclick generik yang sudah ada (bukan data-action/fungsi baru)`, () => {
    const block = extractShopLaporanFabBlock(readHtml(htmlFile));
    assert.match(block, /data-onclick=/);
    assert.doesNotMatch(
      block,
      /data-action=/,
      'FAB Laporan Shop tidak boleh pakai data-action — harus reuse data-onclick inline supaya tidak ada JS baru'
    );
  });
}

test('index.html dan app_production.html: markup tab Laporan Shop PERSIS SAMA (app_production.html harus selalu salinan persis index.html)', () => {
  const [a, b] = HTML_FILES.map(readHtml);
  assert.equal(extractShopLaporanTab(a), extractShopLaporanTab(b));
});

test('styles.css: TIDAK ada class CSS ".shop-laporan-fab*" baru dibuat (harus reuse .keu-fab yang sudah ada)', () => {
  const css = readCss();
  assert.doesNotMatch(css, /\.shop-laporan-fab/);
});

test('styles.css: hanya 1 override posisi aditif untuk FAB Laporan Shop (#shopTab-laporan .keu-fab), tidak mengubah rule .keu-fab asli maupun override Shop/Laporan Keuangan', () => {
  const css = readCss();
  assert.match(css, /#shopTab-laporan \.keu-fab\{bottom:236px;\}/);
  // rule .keu-fab asli (Tahap 1) & override sebelumnya tetap ada & tidak berubah
  assert.match(css, /\.keu-fab\{position:fixed;right:var\(--sp-9\);bottom:84px;/);
  assert.match(css, /#page-shop \.keu-fab\{bottom:150px;\}/);
  assert.match(css, /#keuanganTab-laporan \.keu-fab\{bottom:170px;\}/);
});

test('cobek-order.js: Laporan.renderTab()/topProdukAgg()/renderTopProduk()/renderTopPelanggan()/setPeriodeLap()/getRangeLap() (business logic pra-existing) tidak diubah', () => {
  const src = fs.readFileSync(path.join(ROOT, 'modules/shop/cobek-order.js'), 'utf8');
  assert.doesNotMatch(src, /shopLaporanFab/);
});

test('cobek-io.js: hanya 1 wrapper tipis baru renderShopLaporan(), setShopTab()/ShopExport/exportLaporanShopXLSX (business logic pra-existing) tidak diubah', () => {
  const src = fs.readFileSync(path.join(ROOT, 'modules/shop/cobek-io.js'), 'utf8');
  assert.match(src, /function renderShopLaporan\(\)\{return Laporan\.renderTab\(\);\}/);
  assert.doesNotMatch(src, /shopLaporanFab/);
});

test('dashboard-hub-registry.js (FEATURE_REGISTRY) tidak disentuh oleh penambahan tab Laporan Shop', () => {
  const src = fs.readFileSync(path.join(ROOT, 'modules/dashboard-hub/dashboard-hub-registry.js'), 'utf8');
  assert.doesNotMatch(src, /shopLaporanFab/);
});
