'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

// parsePzNum "asli" (angka murni dari string ber-format ribuan/tanda minus),
// dipakai berulang sbg stub di beberapa setup* di bawah supaya konsisten dgn
// stub yang sama yang dipakai setupPbb().
function fakeParsePzNum(v) {
  if (v === null || v === undefined || v === '') return 0;
  const neg = String(v).trim().startsWith('-');
  const digits = String(v).replace(/[^0-9]/g, '');
  const n = digits ? parseInt(digits, 10) : 0;
  return neg ? -n : n;
}

// pajak-pbb-zakat.js dimuat bareng format-tema.js supaya PPh21.hitungProgresif()
// (yang manggil fmtFull() buat susun teks breakdown per-bracket) pakai
// implementasi fmtFull ASLI, bukan stub — jadi test ini juga otomatis jadi
// jaring pengaman kalau format-tema.js berubah dengan cara yang bikin
// breakdown pajak jadi salah format.
// `const PPh21={...}` di top-level butuh `expose: ['PPh21']` karena vm TIDAK
// menempelkan binding const ke context secara otomatis (beda dari function).
const ctx = loadSource(['format-tema.js', 'pajak-pbb-zakat.js'], {}, ['PPh21']);

test('PPh21.getPTKP — TK0 (lajang tanpa tanggungan) = 54 juta', () => {
  assert.equal(ctx.PPh21.getPTKP('TK0'), 54000000);
});

test('PPh21.getPTKP — status kawin (K) menambah 4,5 juta dari status TK setara', () => {
  assert.equal(ctx.PPh21.getPTKP('K0'), 54000000 + 4500000);
});

test('PPh21.getPTKP — tiap tanggungan menambah 4,5 juta, maksimal terpakai 3 di sini', () => {
  assert.equal(ctx.PPh21.getPTKP('TK3'), 54000000 + 3 * 4500000);
  assert.equal(ctx.PPh21.getPTKP('K3'), 54000000 + 4500000 + 3 * 4500000);
});

test('PPh21.hitungProgresif — PKP 0 atau negatif tidak kena pajak', () => {
  // Catatan: hasil object berasal dari realm vm (sandbox) yang beda dari
  // realm host, jadi assert.deepEqual/deepStrictEqual di objeknya langsung
  // bisa gagal gara-gara prototype beda realm (bukan gara-gara isinya beda)
  // -- makanya di sini dibandingkan per-field (nilai primitif), bukan
  // deepEqual object utuh.
  const a = ctx.PPh21.hitungProgresif(0);
  assert.equal(a.pajak, 0);
  assert.equal(a.detail.length, 0);
  const b = ctx.PPh21.hitungProgresif(-1000);
  assert.equal(b.pajak, 0);
  assert.equal(b.detail.length, 0);
});

test('PPh21.hitungProgresif — PKP di dalam bracket pertama (5%) saja', () => {
  const { pajak, detail } = ctx.PPh21.hitungProgresif(50000000);
  assert.equal(pajak, 50000000 * 0.05); // 2.500.000
  assert.equal(detail.length, 1);
});

test('PPh21.hitungProgresif — PKP tepat di batas bracket pertama (60jt) belum masuk bracket 15%', () => {
  const { pajak, detail } = ctx.PPh21.hitungProgresif(60000000);
  assert.equal(pajak, 60000000 * 0.05); // 3.000.000, semuanya masih kena tarif 5%
  assert.equal(detail.length, 1);
});

test('PPh21.hitungProgresif — PKP menembus dua bracket (5% & 15%) dihitung berjenjang, bukan tarif tunggal', () => {
  // 100 juta = 60jt pertama @5% + 40jt sisanya @15%
  const { pajak, detail } = ctx.PPh21.hitungProgresif(100000000);
  const expected = 60000000 * 0.05 + 40000000 * 0.15; // 3.000.000 + 6.000.000 = 9.000.000
  assert.equal(pajak, expected);
  assert.equal(detail.length, 2);
});

test('PPh21.hitungProgresif — PKP besar menembus semua bracket sampai tarif tertinggi 35%', () => {
  // Lebar tiap bracket di kode: 60jt@5%, 190jt@15%, 250jt@25%, 4,5M@30%, sisanya@35%
  // (kumulatif ambang: 60jt, 250jt, 500jt, 5M, lalu >5M).
  const pkp = 6000000000; // 6 miliar
  const { pajak, detail } = ctx.PPh21.hitungProgresif(pkp);
  const b1 = 60000000 * 0.05; // 3.000.000
  const b2 = 190000000 * 0.15; // 28.500.000
  const b3 = 250000000 * 0.25; // 62.500.000
  const b4 = 4500000000 * 0.30; // 1.350.000.000
  const b5 = (pkp - 60000000 - 190000000 - 250000000 - 4500000000) * 0.35; // sisa 1M @35% = 350.000.000
  const expected = Math.round(b1 + b2 + b3 + b4 + b5);
  assert.equal(pajak, expected); // 1.794.000.000
  assert.equal(detail.length, 5);
});

// --- PBB (Pajak Bumi & Bangunan) ---

function setupPbb(values) {
  const fakeDocument = createFakeDocument({
    pbbNjopTotal: {}, pbbNjopKenaPajak: {}, pbbTerutang: {},
    ...values,
  });
  // TIDAK memuat format-tema.js di sini (beda dari test PPh21 di atas) --
  // format-tema.js mendeklarasikan fmtFull() lewat `function`, yang otomatis
  // menimpa properti context (termasuk stub fmtFull identity yang kita
  // kasih di extraGlobals). Supaya assertion di bawah bisa cek ANGKA
  // PERSIS (bukan string "Rp ..."), pajak-pbb-zakat.js dimuat SENDIRIAN.
  const pbbCtx = loadSource(['pajak-pbb-zakat.js'], {
    document: fakeDocument,
    D: { pajakZakat: { pbb: {} } },
    fmtFull: (n) => String(Math.round(n)),
    parsePzNum: (v) => {
      if (v === null || v === undefined || v === '') return 0;
      const neg = String(v).trim().startsWith('-');
      const digits = String(v).replace(/[^0-9]/g, '');
      const n = digits ? parseInt(digits, 10) : 0;
      return neg ? -n : n;
    },
    save: () => {},
  }, ['PBB']);
  return { pbbCtx, fakeDocument };
}

test('PBB.hitung — (NJOP bumi + bangunan − NJOPTKP) × tarif%', () => {
  const { pbbCtx, fakeDocument } = setupPbb({
    pbbNjopBumi: { value: '500000000' },
    pbbNjopBangunan: { value: '300000000' },
    pbbNjoptkp: { value: '12000000' },
    pbbTarif: { value: '0.1' },
  });
  pbbCtx.PBB.hitung();
  assert.equal(fakeDocument.getElementById('pbbNjopTotal').textContent, '800000000');
  assert.equal(fakeDocument.getElementById('pbbNjopKenaPajak').textContent, '788000000');
  assert.equal(fakeDocument.getElementById('pbbTerutang').textContent, '788000'); // 788.000.000 x 0,1%
});

test('PBB.hitung — NJOPTKP lebih besar dari NJOP total dibatasi ke 0, bukan minus', () => {
  const { pbbCtx, fakeDocument } = setupPbb({
    pbbNjopBumi: { value: '5000000' },
    pbbNjopBangunan: { value: '0' },
    pbbNjoptkp: { value: '12000000' },
    pbbTarif: { value: '0.1' },
  });
  pbbCtx.PBB.hitung();
  assert.equal(fakeDocument.getElementById('pbbNjopKenaPajak').textContent, '0');
  assert.equal(fakeDocument.getElementById('pbbTerutang').textContent, '0');
});

// --- Zakat (Penghasilan, Maal, Fitrah) ---

// Zakat.hitungPenghasilan/hitungMaal/hitungFitrah tidak butuh format-tema.js
// (beda dari test PPh21 di atas) -- sama seperti setupPbb(), dimuat SENDIRIAN
// supaya fmtFull stub identity kita tidak ketiban function fmtFull asli.

function setupZakatPenghasilan(values, D) {
  const fakeDocument = createFakeDocument({
    zpIncomeBulan: {}, zpNisabBulan: {}, zpStatus: {}, zpJumlah: {},
    ...values,
  });
  const ctx = loadSource(['pajak-pbb-zakat.js'], {
    document: fakeDocument,
    D,
    fmtFull: (n) => String(Math.round(n)),
  }, ['Zakat']);
  return { ctx, fakeDocument };
}

test('Zakat.hitungPenghasilan — income bulan ini < nisab => belum wajib, zakat 0', () => {
  const now = new Date();
  const D = {
    pajakZakat: { nisabPenghasilanBulan: 10000000 },
    transactions: [
      { type: 'income', amount: 5000000, date: now.toISOString() },
      { type: 'expense', amount: 1000000, date: now.toISOString() }, // tidak dihitung (bukan income)
    ],
  };
  const { ctx, fakeDocument } = setupZakatPenghasilan({}, D);
  ctx.Zakat.hitungPenghasilan();
  assert.equal(fakeDocument.getElementById('zpIncomeBulan').textContent, '5000000');
  assert.equal(fakeDocument.getElementById('zpNisabBulan').textContent, '10000000');
  assert.equal(fakeDocument.getElementById('zpStatus').textContent, '⬜ Belum Wajib (di bawah nisab)');
  assert.equal(fakeDocument.getElementById('zpJumlah').textContent, '0');
});

test('Zakat.hitungPenghasilan — income bulan ini >= nisab => wajib, zakat 2,5%', () => {
  const now = new Date();
  const D = {
    pajakZakat: { nisabPenghasilanBulan: 10000000 },
    transactions: [{ type: 'income', amount: 20000000, date: now.toISOString() }],
  };
  const { ctx, fakeDocument } = setupZakatPenghasilan({}, D);
  ctx.Zakat.hitungPenghasilan();
  assert.equal(fakeDocument.getElementById('zpStatus').textContent, '✅ Wajib Zakat');
  assert.equal(fakeDocument.getElementById('zpJumlah').textContent, '500000'); // 20jt x 2,5%
});

test('Zakat.hitungPenghasilan — income tepat sama dengan nisab tetap wajib (pakai >=, bukan >)', () => {
  const now = new Date();
  const D = {
    pajakZakat: { nisabPenghasilanBulan: 10000000 },
    transactions: [{ type: 'income', amount: 10000000, date: now.toISOString() }],
  };
  const { ctx, fakeDocument } = setupZakatPenghasilan({}, D);
  ctx.Zakat.hitungPenghasilan();
  assert.equal(fakeDocument.getElementById('zpStatus').textContent, '✅ Wajib Zakat');
  assert.equal(fakeDocument.getElementById('zpJumlah').textContent, '250000');
});

test('Zakat.hitungPenghasilan — income bulan LALU tidak ikut terhitung, hanya bulan berjalan', () => {
  const now = new Date();
  const bulanLalu = new Date(now.getFullYear(), now.getMonth() - 1, 15);
  const D = {
    pajakZakat: { nisabPenghasilanBulan: 10000000 },
    transactions: [
      { type: 'income', amount: 999000000, date: bulanLalu.toISOString() }, // bulan lalu, diabaikan
      { type: 'income', amount: 1000000, date: now.toISOString() },
    ],
  };
  const { ctx, fakeDocument } = setupZakatPenghasilan({}, D);
  ctx.Zakat.hitungPenghasilan();
  assert.equal(fakeDocument.getElementById('zpIncomeBulan').textContent, '1000000');
});

function setupZakatMaal(values, D, stubs = {}) {
  const fakeDocument = createFakeDocument({
    zmUtang: { value: '0' },
    zmTotalHarta: {}, zmNisab: {}, zmStatus: {}, zmJumlah: {}, zmHaulInfo: {},
    ...values,
  });
  const ctx = loadSource(['pajak-pbb-zakat.js'], {
    document: fakeDocument,
    D,
    fmtFull: (n) => String(Math.round(n)),
    parsePzNum: fakeParsePzNum,
    save: () => {},
    renderKekayaanBersih: () => {},
    totalSaldoAkun: stubs.totalSaldoAkun || (() => 0),
    totalPiutangValue: stubs.totalPiutangValue || (() => 0),
    totalDebtValue: stubs.totalDebtValue || (() => 0),
    totalCicilanOutstanding: stubs.totalCicilanOutstanding || (() => 0),
  }, ['Zakat']);
  return { ctx, fakeDocument, D };
}

test('Zakat.hitungMaal — harta di bawah nisab => belum wajib, haul tidak dihitung', () => {
  const D = { pajakZakat: { hargaEmasPerGram: 1000000, haulMaalMulai: null }, assets: [] };
  const { ctx, fakeDocument } = setupZakatMaal(
    { zmUtang: { value: '0' } },
    D,
    { totalSaldoAkun: () => 1000000 } // 1jt, jauh di bawah nisab 85jt (85 x 1jt)
  );
  ctx.Zakat.hitungMaal();
  assert.equal(fakeDocument.getElementById('zmTotalHarta').textContent, '1000000');
  assert.equal(fakeDocument.getElementById('zmNisab').textContent, '85000000');
  assert.equal(fakeDocument.getElementById('zmStatus').textContent, '⬜ Belum Wajib');
  assert.equal(fakeDocument.getElementById('zmJumlah').textContent, '0');
  assert.equal(fakeDocument.getElementById('zmHaulInfo').textContent, 'Harta belum mencapai nisab, haul belum dihitung.');
  assert.equal(D.pajakZakat.haulMaalMulai, null);
});

test('Zakat.hitungMaal — harta capai nisab PERTAMA KALI => haul mulai dihitung hari ini, belum wajib', () => {
  const D = { pajakZakat: { hargaEmasPerGram: 1000000, haulMaalMulai: null }, assets: [] };
  const { ctx, fakeDocument } = setupZakatMaal(
    {},
    D,
    { totalSaldoAkun: () => 100000000 } // 100jt >= nisab 85jt
  );
  ctx.Zakat.hitungMaal();
  const today = new Date().toISOString().slice(0, 10);
  assert.equal(D.pajakZakat.haulMaalMulai, today);
  assert.equal(fakeDocument.getElementById('zmStatus').textContent, '⏳ Sudah nisab, tunggu haul');
  assert.equal(fakeDocument.getElementById('zmJumlah').textContent, '0');
  assert.match(fakeDocument.getElementById('zmHaulInfo').textContent, /Haul mulai dihitung hari ini/);
});

test('Zakat.hitungMaal — sudah nisab tapi haul BELUM 354 hari => belum wajib, tampil sisa hari', () => {
  const mulai = new Date();
  mulai.setDate(mulai.getDate() - 100); // baru 100 hari
  const D = {
    pajakZakat: { hargaEmasPerGram: 1000000, haulMaalMulai: mulai.toISOString().slice(0, 10) },
    assets: [],
  };
  const { ctx, fakeDocument } = setupZakatMaal({}, D, { totalSaldoAkun: () => 100000000 });
  ctx.Zakat.hitungMaal();
  assert.equal(fakeDocument.getElementById('zmStatus').textContent, '⏳ Sudah nisab, tunggu haul');
  assert.equal(fakeDocument.getElementById('zmJumlah').textContent, '0');
  assert.match(fakeDocument.getElementById('zmHaulInfo').textContent, /Haul berjalan 100 dari 354 hari/);
  assert.equal(D.pajakZakat.haulMaalMulai, mulai.toISOString().slice(0, 10));
});

test('Zakat.hitungMaal — nisab tercapai & haul >= 354 hari => WAJIB, zakat 2,5% dari total harta', () => {
  const mulai = new Date();
  mulai.setDate(mulai.getDate() - 400); // sudah lewat 354 hari
  const D = {
    pajakZakat: { hargaEmasPerGram: 1000000, haulMaalMulai: mulai.toISOString().slice(0, 10) },
    assets: [{ id: 1, nilai: 20000000, zakatable: true }, { id: 2, nilai: 5000000, zakatable: false }],
  };
  const { ctx, fakeDocument } = setupZakatMaal({}, D, {
    totalSaldoAkun: () => 100000000,
    totalPiutangValue: () => 5000000,
  });
  ctx.Zakat.hitungMaal();
  assert.equal(fakeDocument.getElementById('zmTotalHarta').textContent, '125000000');
  assert.equal(fakeDocument.getElementById('zmStatus').textContent, '✅ Wajib Zakat');
  assert.equal(fakeDocument.getElementById('zmJumlah').textContent, '3125000'); // 125jt x 2,5%
  assert.match(fakeDocument.getElementById('zmHaulInfo').textContent, /Sudah mencapai haul/);
});

test('Zakat.hitungMaal — utang (manual + buku utang) mengurangi total harta, dan tidak boleh minus', () => {
  const D = { pajakZakat: { hargaEmasPerGram: 1000000, haulMaalMulai: null }, assets: [] };
  const { ctx, fakeDocument } = setupZakatMaal(
    { zmUtang: { value: '3000000' } },
    D,
    { totalSaldoAkun: () => 5000000, totalDebtValue: () => 10000000 }
  );
  ctx.Zakat.hitungMaal();
  assert.equal(fakeDocument.getElementById('zmTotalHarta').textContent, '0');
  assert.equal(D.pajakZakat.utangJT, 3000000);
});

test('Zakat.hitungMaal — sisa cicilan/paylater outstanding juga ikut mengurangi total harta', () => {
  const D = { pajakZakat: { hargaEmasPerGram: 1000000, haulMaalMulai: null }, assets: [] };
  const { ctx, fakeDocument } = setupZakatMaal(
    { zmUtang: { value: '0' } },
    D,
    { totalSaldoAkun: () => 100000000, totalCicilanOutstanding: () => 30000000 }
  );
  ctx.Zakat.hitungMaal();
  assert.equal(fakeDocument.getElementById('zmTotalHarta').textContent, '70000000');
});

function setupZakatFitrah(values, D) {
  const fakeDocument = createFakeDocument({
    zfJiwa: { value: '1' }, zfTotal: {},
    ...values,
  });
  const ctx = loadSource(['pajak-pbb-zakat.js'], {
    document: fakeDocument,
    D,
    fmtFull: (n) => String(Math.round(n)),
  }, ['Zakat']);
  return { ctx, fakeDocument };
}

test('Zakat.hitungFitrah — total = jumlah jiwa × zakat fitrah per jiwa', () => {
  const D = { pajakZakat: { zakatFitrahPerJiwa: 45000 } };
  const { ctx, fakeDocument } = setupZakatFitrah({ zfJiwa: { value: '5' } }, D);
  ctx.Zakat.hitungFitrah();
  assert.equal(fakeDocument.getElementById('zfTotal').textContent, '225000'); // 5 x 45.000
});

test('Zakat.hitungFitrah — jiwa 0/kosong/tidak valid dibatasi minimal 1 jiwa (bukan 0)', () => {
  const D = { pajakZakat: { zakatFitrahPerJiwa: 45000 } };
  const { ctx: ctxA, fakeDocument: docA } = setupZakatFitrah({ zfJiwa: { value: '0' } }, D);
  ctxA.Zakat.hitungFitrah();
  assert.equal(docA.getElementById('zfTotal').textContent, '45000');

  const { ctx: ctxB, fakeDocument: docB } = setupZakatFitrah({ zfJiwa: { value: '' } }, D);
  ctxB.Zakat.hitungFitrah();
  assert.equal(docB.getElementById('zfTotal').textContent, '45000');
});
