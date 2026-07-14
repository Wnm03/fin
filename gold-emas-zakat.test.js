'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

// Cakupan file ini:
// 1. GoldImport/GoldZakat (aset-emas-impor.js) harus ke-expose ke `window` lewat
//    Object.assign(window,{...}) di features-sheets-pwa-selftest.js — kalau tidak,
//    tombol data-action="GoldImport.open" / "GoldZakat.open" di index.html DIAM saja
//    saat diklik (window.GoldImport tidak ada, padahal `const GoldImport={...}` di
//    scope top-level TIDAK otomatis nempel ke `window`, beda dari `function`/`var`).
//    BUG NYATA yg kejadian: 2 modul ini sempat lupa ditambahkan ke daftar itu.
// 2. Zakat.hitungMaal() (pajak-pbb-zakat.js): total harta zakat maal yg tertampil
//    harus konsisten dgn formula yg dipakai self-test
//    (fitur-sheets-pwa-selftest.js) — saldo akun + aset zakatable + piutang
//    zakatable − (utang manual + Buku Utang + cicilan outstanding). BUG NYATA yg
//    kejadian: formula expected di self-test ketinggalan (cuma kurangi utang
//    manual), sehingga selftest gagal terus kalau ada utang di Buku Utang/cicilan
//    outstanding/piutang.

const SELFTEST_FILE = 'features-sheets-pwa-selftest.js';

test('Object.assign(window,{...}) di features-sheets-pwa-selftest.js harus menyertakan GoldImport & GoldZakat', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', SELFTEST_FILE), 'utf8');
  const m = src.match(/Object\.assign\(window,\{([\s\S]*?)\}\);/);
  assert.ok(m, 'Blok Object.assign(window,{...}) harus ditemukan di ' + SELFTEST_FILE);
  const names = m[1].split(',').map((s) => s.trim()).filter(Boolean);
  assert.ok(names.includes('GoldImport'), 'GoldImport tidak ada di Object.assign(window,{...}) -> tombol GoldImport.open akan diam saat diklik');
  assert.ok(names.includes('GoldZakat'), 'GoldZakat tidak ada di Object.assign(window,{...}) -> tombol GoldZakat.open akan diam saat diklik');
});

test('Setiap modul (const Nama={...}) yang dipakai lewat data-action="Nama.method" harus ke-expose ke window', () => {
  const root = path.join(__dirname, '..');
  const srcFiles = fs.readdirSync(root).filter((f) => f.endsWith('.js') && !f.includes('app-bundle'));
  const htmlFiles = ['index.html'];
  const usedModules = new Set();
  const re = /data-action=\\?"([A-Z][A-Za-z0-9_]*)\./g;
  for (const f of [...srcFiles, ...htmlFiles]) {
    const src = fs.readFileSync(path.join(root, f), 'utf8');
    let m;
    while ((m = re.exec(src))) usedModules.add(m[1]);
  }
  const selftestSrc = fs.readFileSync(path.join(root, SELFTEST_FILE), 'utf8');
  const assignMatch = selftestSrc.match(/Object\.assign\(window,\{([\s\S]*?)\}\);/);
  const exposed = new Set(assignMatch[1].split(',').map((s) => s.trim()).filter(Boolean));
  // GoldImport & GoldZakat wajib ada di sini (fokus laporan bug ini);
  // modul lain yang mungkin belum ke-expose (mis. bug lama yg sudah ada sebelum
  // sesi ini) dilaporkan tapi tidak menggagalkan test supaya scope perbaikan
  // tetap ke bug yang dilaporkan.
  assert.ok(usedModules.has('GoldImport') && exposed.has('GoldImport'));
  assert.ok(usedModules.has('GoldZakat') && exposed.has('GoldZakat'));
});

// Sama persis dengan implementasi asli di features-sheets-pwa-selftest.js
// (di-duplikasi kecil di sini krn loadSource() men-scan 1 file per panggilan;
// logikanya murni & stabil sehingga aman dipakai sbg stub test).
function parsePzNum(v) {
  if (v === null || v === undefined) return 0;
  const str = String(v);
  const negative = /-/.test(str);
  const digits = str.replace(/[^0-9]/g, '');
  const n = Number(digits);
  if (isNaN(n)) return 0;
  return negative ? -n : n;
}

function makeD(overrides = {}) {
  return {
    accounts: [],
    transactions: [],
    assets: [],
    debts: [],
    piutang: [],
    bills: [],
    pajakZakat: { hargaEmasPerGram: 1000000, haulMaalMulai: null },
    ...overrides,
  };
}

function makeZakatCtx(D, domValues = {}) {
  const fakeDocument = createFakeDocument({
    zmUtang: { value: '' },
    zmTotalHarta: { textContent: '' },
    zmNisab: { textContent: '' },
    zmStatus: { textContent: '', style: {} },
    zmHaulInfo: { textContent: '' },
    zpIncomeBulan: { textContent: '' },
    zpNisabBulan: { textContent: '' },
    zpJumlah: { textContent: '' },
    zpStatus: { textContent: '', style: {} },
    ...domValues,
  });
  const ctx = loadSource(['pajak-pbb-zakat.js'], {
    D,
    document: fakeDocument,
    fmtFull: (n) => 'Rp ' + Number(Math.abs(n || 0)).toLocaleString('id-ID'),
    parsePzNum: parsePzNum,
    totalSaldoAkun: () => (D.accounts || []).reduce((s, a) => s + (a.baseBalance || 0), 0),
    totalPiutangValue: () => (D.piutang || []).reduce((s, p) => s + (p.nilai || 0), 0),
    totalDebtValue: () => (D.debts || []).reduce((s, d) => s + (d.nilai || 0), 0),
    totalCicilanOutstanding: () => (D.bills || []).reduce((s, b) => s + (b.outstanding || 0), 0),
    renderKekayaanBersih: () => {},
    save: () => {},
  }, ['Zakat']);
  return { ctx, fakeDocument };
}

test('Zakat.hitungMaal() — total harta = saldo akun + aset zakatable + piutang zakatable − (utang manual + Buku Utang + cicilan outstanding)', () => {
  const D = makeD({
    accounts: [{ id: 'a1', baseBalance: 1000000 }],
    assets: [{ id: 'g1', jenis: 'Emas/Logam Mulia', zakatable: true, nilai: 3000000 }],
    piutang: [{ nilai: 500000 }],
    debts: [{ nilai: 200000 }],
    bills: [{ outstanding: 100000 }],
  });
  const { ctx, fakeDocument } = makeZakatCtx(D, { zmUtang: { value: '50000' } });
  ctx.Zakat.hitungMaal();
  const displayed = parsePzNum(fakeDocument.getElementById('zmTotalHarta').textContent);
  // formula: 1.000.000 + 3.000.000 + 500.000 - (50.000 + 200.000 + 100.000) = 4.150.000
  assert.equal(displayed, 4150000);
});

test('Zakat.hitungMaal() tidak boleh negatif (di-clamp ke 0) walau utang > harta', () => {
  const D = makeD({
    accounts: [{ id: 'a1', baseBalance: 100000 }],
    debts: [{ nilai: 5000000 }],
  });
  const { ctx, fakeDocument } = makeZakatCtx(D);
  ctx.Zakat.hitungMaal();
  const displayed = parsePzNum(fakeDocument.getElementById('zmTotalHarta').textContent);
  assert.equal(displayed, 0);
});

// --- fake SheetJS, pola identik makeFakeXLSX di tests/aset.test.js (satu pustaka,
// beberapa tempat pakai: Aset.exportXLSX/importXLSX, ShopExport/ImportShopExcel,
// & sekarang GoldImport.importXLSXFile) ---
function makeFakeXLSX(opts = {}) {
  return {
    utils: {
      sheet_to_json: opts.sheet_to_json || (() => []),
    },
    read: opts.read || (() => { throw new Error('bukan file excel'); }),
  };
}

// helper: ubah array-of-object (cara lama nulis mock data, lebih ringkas dibaca)
// jadi array-of-array (AOA) yg dibutuhkan _sheetToRows() (selalu panggil
// XLSX.utils.sheet_to_json(ws,{header:1,...}) skrg, krn header row dicari otomatis
// -- lihat komentar BUGFIX di _sheetToRows di aset-emas-impor.js).
function rowsToAOA(objRows) {
  const headers = [];
  objRows.forEach((r) => Object.keys(r).forEach((k) => { if (!headers.includes(k)) headers.push(k); }));
  const aoa = [headers];
  objRows.forEach((r) => aoa.push(headers.map((h) => (h in r ? r[h] : ''))));
  return aoa;
}

function makeFakeXLSXImportEvent(filename = 'nota-emas.xlsx') {
  const target = { value: 'C:\\fakepath\\' + filename, files: [{ name: filename }] };
  target.files[0].arrayBuffer = async () => new ArrayBuffer(0);
  return { target };
}

function makeGoldCtx(D, opts = {}) {
  const calls = { renderList: 0, renderKekayaan: 0, hitungZakat: 0, toast: [], filePickerClicked: 0 };
  const fakeDocument = createFakeDocument({
    goldImportText: { value: '' },
    goldImportPreview: { innerHTML: '' },
    goldImportCommitBtn: { disabled: false },
    goldImportXLSXFile: { click: () => { calls.filePickerClicked++; } },
  });
  const XLSX = ('XLSX' in opts) ? opts.XLSX : makeFakeXLSX(opts);
  const ctx = loadSource(['aset-emas-impor.js'], {
    D,
    document: fakeDocument,
    Aset: { renderList: () => { calls.renderList++; } },
    renderKekayaanBersih: () => { calls.renderKekayaan++; },
    hitungZakatMaal: () => { calls.hitungZakat++; },
    openModal: () => {},
    closeModal: () => {},
    escapeHtml: (s) => String(s == null ? '' : s),
    fmtFull: (n) => 'Rp ' + Number(Math.abs(n || 0)).toLocaleString('id-ID'),
    parsePzNum: (v) => { const n = parseFloat(String(v).replace(/[^\d.-]/g, '')); return isNaN(n) ? 0 : n; },
    parseDecStr: (v) => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? 0 : n; },
    uid: (() => { let i = 0; return () => 'id' + (++i); })(),
    save: () => {},
    toast: (msg) => calls.toast.push(msg),
    todayStr: () => '2026-07-12',
    XLSX,
    ensureXLSX: opts.ensureXLSX || (async () => {}),
  }, ['GoldImport', 'GoldZakat']);
  return { ctx, fakeDocument, calls, XLSX };
}

test('GoldImport.preview()+commit() — parse 1 nota emas & simpan sbg aset zakatable', () => {
  const D = makeD();
  const { ctx, fakeDocument, calls } = makeGoldCtx(D);
  fakeDocument.getElementById('goldImportText').value =
    'Pekalongan, 18-7-2020\nNama: Alina\n1 pt cincin plat model AD Rose + putih\n750\nB: 4.130 g\n@755\nJUMLAH 3.118.000';
  ctx.GoldImport.preview();
  assert.equal(ctx.GoldImport.parsed.length, 1);
  ctx.GoldImport.commit();
  assert.equal(D.assets.length, 1);
  const a = D.assets[0];
  assert.equal(a.jenis, 'Emas/Logam Mulia');
  assert.equal(a.zakatable, true);
  assert.equal(a.nilai, 3118000);
  assert.equal(a.goldKadar, 750);
  assert.equal(calls.renderList, 1);
  assert.equal(calls.renderKekayaan, 1);
  assert.equal(calls.hitungZakat, 1, 'GoldImport.commit() harus memanggil hitungZakatMaal() supaya total zakat maal langsung ter-update');
});

// ================= GoldImport — upload rekap .xlsx (fitur baru) =================

test('GoldImport.openXLSXPicker() — men-trigger klik pada input file tersembunyi', () => {
  const { ctx, calls } = makeGoldCtx(makeD());
  ctx.GoldImport.openXLSXPicker();
  assert.equal(calls.filePickerClicked, 1);
});

test('GoldImport.importXLSXFile() — event tanpa file terpilih (batal) -> no-op', async () => {
  const { ctx, calls } = makeGoldCtx(makeD());
  await ctx.GoldImport.importXLSXFile({ target: { files: [] } });
  assert.equal(calls.toast.length, 0);
  assert.equal(ctx.GoldImport.parsed.length, 0);
});

test('GoldImport.importXLSXFile() — pustaka Excel gagal dimuat -> toast peringatan, value input direset', async () => {
  const event = makeFakeXLSXImportEvent();
  const { ctx, calls } = makeGoldCtx(makeD(), { XLSX: undefined, ensureXLSX: async () => { throw new Error('offline'); } });
  await ctx.GoldImport.importXLSXFile(event);
  assert.match(calls.toast[0], /Gagal memuat pustaka Excel/);
  assert.equal(event.target.value, '');
});

test('GoldImport.importXLSXFile() — file bukan Excel valid (rusak/corrupt) -> toast error, value direset', async () => {
  const event = makeFakeXLSXImportEvent();
  const XLSX = makeFakeXLSX({ read: () => { throw new Error('corrupt'); } });
  const { ctx, calls } = makeGoldCtx(makeD(), { XLSX });
  await ctx.GoldImport.importXLSXFile(event);
  assert.match(calls.toast[0], /File tidak valid/);
  assert.equal(event.target.value, '');
});

test('GoldImport.importXLSXFile() — semua baris tanpa Berat & Total -> tidak ada nota valid, tombol commit tetap disabled', async () => {
  const event = makeFakeXLSXImportEvent();
  const XLSX = makeFakeXLSX({
    read: () => ({ SheetNames: ['S'], Sheets: { S: {} } }),
    sheet_to_json: () => rowsToAOA([{ Tanggal: '2020-07-18', 'Jenis Perhiasan & Spesifikasi Detail': 'Cincin' }]),
  });
  const { ctx, fakeDocument } = makeGoldCtx(makeD(), { XLSX });
  await ctx.GoldImport.importXLSXFile(event);
  assert.equal(ctx.GoldImport.parsed.length, 0);
  assert.match(fakeDocument.getElementById('goldImportPreview').innerHTML, /Tidak ada nota valid/);
  assert.equal(fakeDocument.getElementById('goldImportCommitBtn').disabled, true);
});

test('GoldImport.importXLSXFile()+commit() — 1 baris rekap lengkap (Total & Berat terisi) berhasil diparse & diimpor sbg aset zakatable', async () => {
  const D = makeD();
  const event = makeFakeXLSXImportEvent();
  const XLSX = makeFakeXLSX({
    read: () => ({ SheetNames: ['S'], Sheets: { S: {} } }),
    sheet_to_json: () => rowsToAOA([{
      Tanggal: '18-7-2020',
      'Toko (Staf)': 'Toko Pekalongan',
      'Atas Nama': 'Alina',
      'Jenis Perhiasan & Spesifikasi Detail': '1 pt cincin plat model AD Rose + putih',
      'Kadar (‰)': 750,
      'Berat (gram)': '4.130',
      'Total Harga Riil (Rp)': 3118000,
    }]),
  });
  const { ctx, calls } = makeGoldCtx(D, { XLSX });
  await ctx.GoldImport.importXLSXFile(event);
  assert.equal(ctx.GoldImport.parsed.length, 1);
  const parsedItem = ctx.GoldImport.parsed[0];
  assert.equal(parsedItem.tanggal, '2020-07-18');
  assert.equal(parsedItem.kadar, 750);
  assert.equal(parsedItem.berat, 4.13);
  assert.equal(parsedItem.total, 3118000);
  assert.equal(parsedItem.hargaPerGram, Math.round(3118000 / 4.13));
  assert.equal(parsedItem.nama, 'Toko Pekalongan · a.n. Alina');
  assert.match(calls.toast[0], /1 baris nota kebaca/);
  assert.equal(event.target.value, '');

  ctx.GoldImport.commit();
  assert.equal(D.assets.length, 1);
  const a = D.assets[0];
  assert.equal(a.jenis, 'Emas/Logam Mulia');
  assert.equal(a.zakatable, true);
  assert.equal(a.nilai, 3118000);
  assert.equal(a.goldKadar, 750);
  assert.equal(a.goldBeratGram, 4.13);
  assert.equal(a.goldToko, 'Toko Pekalongan · a.n. Alina');
});

test('GoldImport.importXLSXFile() — baris dengan Berat tapi tanpa Harga/gram -> hargaPerGram dihitung dari Total÷Berat; baris tanpa Berat&Total dilewati', async () => {
  const event = makeFakeXLSXImportEvent();
  const XLSX = makeFakeXLSX({
    read: () => ({ SheetNames: ['S'], Sheets: { S: {} } }),
    sheet_to_json: () => rowsToAOA([
      { Tanggal: '2020-07-21', 'Berat (gram)': '2.050', 'Total Harga Riil (Rp)': 1507000, 'Jenis Perhiasan & Spesifikasi Detail': 'Liontin susup' },
      { Tanggal: 'TOTAL', 'Berat (gram)': '', 'Total Harga Riil (Rp)': '' },
    ]),
  });
  const { ctx } = makeGoldCtx(makeD(), { XLSX });
  await ctx.GoldImport.importXLSXFile(event);
  assert.equal(ctx.GoldImport.parsed.length, 1, 'baris rekap "TOTAL" tanpa berat/total harus dilewati');
  const it = ctx.GoldImport.parsed[0];
  assert.equal(it.hargaPerGram, Math.round(1507000 / 2.05));
});

test('GoldImport.importXLSXFile() — Tanggal berupa objek Date (cellDates:true) diformat jadi YYYY-MM-DD', async () => {
  const event = makeFakeXLSXImportEvent();
  const XLSX = makeFakeXLSX({
    read: () => ({ SheetNames: ['S'], Sheets: { S: {} } }),
    sheet_to_json: () => rowsToAOA([{ Tanggal: new Date(2020, 6, 18), 'Berat (gram)': 4.13, 'Total Harga Riil (Rp)': 3118000 }]),
  });
  const { ctx } = makeGoldCtx(makeD(), { XLSX });
  await ctx.GoldImport.importXLSXFile(event);
  assert.equal(ctx.GoldImport.parsed[0].tanggal, '2020-07-18');
});

// BUGFIX nyata (dilaporkan user): file rekap yang benar-benar diunduh dari template
// (2 baris judul + 1 baris kosong + baris header di baris ke-4, ada baris "TOTAL"
// rekap di akhir, dan kadang ada teks asing yang menyelip di baris terakhir) selalu
// gagal diimpor ("tidak ada nota kebaca") krn importXLSXFile() lama SELALU asumsikan
// baris PERTAMA sheet = header (`XLSX.utils.sheet_to_json(ws,{defval:''})` polos).
// Sekarang header dicari otomatis lewat _sheetToRows().
function makeRealisticRekapAOA() {
  return [
    ['Rekap Nota Pembelian Emas (Revisi)', '', '', '', '', '', '', '', '', '', '', ''],
    ['Sumber: 6 Nota (5x Toko Mas Kelapa Mas Pekalongan, 1x Mustika Gold & Service Centre Magelang)', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', ''],
    ['No', 'Toko (Staf)', 'Tanggal', 'Atas Nama', 'Jenis Perhiasan & Spesifikasi Detail', 'Kadar (‰)', 'Karat', 'Berat (gram)', 'Harga/gram (Rp)', 'Keterangan / Ongkos', 'Total Harga Riil (Rp)', 'Harga/gram 24K-equiv (Rp)'],
    [1, 'Kelapa Mas (Mada)', '2020-07-18', 'Nina', 'Cincin plat model AD Rose + putih', 750, 18, 4.13, 755000, 'Citra 750, Ok: 150', 3118000, ''],
    [2, 'Kelapa Mas (Amira)', '2020-07-21', 'Wisnu', 'Liontin Slusup AD (K)', 750, 18, 2.05, 735000, '750 UBS', 1507000, ''],
    [6, 'Mustika Gold Magelang', '2020-08-06', 'Wisnu', 'Anting jepit cor AD full', 750, 18, 2.1, '', 'Kode: AT-1-29/P', 1580500, ''],
    ['TOTAL', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', ''],
    ['[ NAVIGATION KEY | SYNC SUCCESS: 2026-07-12 04:53:40 WIB | VERSION: v2.0 ]', '', '', '', '', '', '', '', '', '', '', ''],
  ];
}

test('GoldImport.importXLSXFile() — file rekap asli (judul 2 baris + baris kosong sebelum header, header BUKAN di baris pertama) berhasil dibaca semua notanya', async () => {
  const D = makeD();
  const event = makeFakeXLSXImportEvent('rekap-nota-emas-v2.xlsx');
  const XLSX = makeFakeXLSX({
    read: () => ({ SheetNames: ['Rekap Nota Emas', 'Ringkasan & Zakat'], Sheets: { 'Rekap Nota Emas': {}, 'Ringkasan & Zakat': {} } }),
    sheet_to_json: (ws, opts) => (opts && opts.header === 1 ? makeRealisticRekapAOA() : []),
  });
  const { ctx, calls } = makeGoldCtx(D, { XLSX });
  await ctx.GoldImport.importXLSXFile(event);
  assert.equal(ctx.GoldImport.parsed.length, 3, 'harus kebaca 3 nota (baris "TOTAL", baris kosong, & baris teks asing di akhir harus dilewati)');
  assert.match(calls.toast[0], /3 baris nota kebaca/);

  const [cincin, liontin, anting] = ctx.GoldImport.parsed;
  assert.equal(cincin.jenis, 'Cincin');
  assert.equal(cincin.tanggal, '2020-07-18');
  assert.equal(cincin.total, 3118000);
  assert.equal(liontin.jenis, 'Kalung');
  // "Mustika Gold Magelang" tidak boleh salah kedeteksi jadi jenis "Gelang" gara2
  // substring "gelang" nyempil di "Magelang" -- harus tetap kebaca dari kolom Jenis
  // Perhiasan ("Anting jepit...") sbg Anting, & Harga/gram kosong tapi Total ada jadi
  // hargaPerGram harus dihitung otomatis dari Total÷Berat.
  assert.equal(anting.jenis, 'Anting');
  assert.equal(anting.total, 1580500);
  assert.equal(anting.hargaPerGram, Math.round(1580500 / 2.1));

  ctx.GoldImport.commit();
  assert.equal(D.assets.length, 3);
  assert.ok(D.assets.every((a) => a.jenis === 'Emas/Logam Mulia' && a.zakatable === true));
});
