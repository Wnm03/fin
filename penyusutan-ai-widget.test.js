'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('../helpers/loadSource');

// Cakupan file ini: penyusutan-ai-widget.js (PenyusutanAI) — widget "🤖
// Rekomendasi AI" di kartu 📉 Penyusutan Aset (target #assetPenyusutanAI,
// dipanggil dari aset.js: Penyusutan.renderList()). Pola loadSource sama
// dgn tests/aset.test.js: aset.js di-load bareng file yang dites supaya
// Penyusutan.hargaPerolehan()/hitung() yang dipakai PenyusutanAI beneran
// jalan dari source asli, bukan re-implementasi di file test.

function fmtFull(n) { return 'Rp ' + Number(Math.abs(n || 0)).toLocaleString('id-ID'); }

function makeAsset(overrides = {}) {
  return {
    id: overrides.id || 'a1',
    name: overrides.name || 'Aset Contoh',
    jenis: overrides.jenis || 'Kendaraan',
    nilai: overrides.nilai != null ? overrides.nilai : 50000000,
    tanggal: overrides.tanggal || '2024-01-01',
    zakatable: !!overrides.zakatable,
    ...overrides,
  };
}

function loadPenyusutanAI(D, extraGlobals = {}) {
  const ctx = loadSource(['modules/asset/aset.js', 'modules/asset/penyusutan-ai-widget.js'], {
    D,
    document: extraGlobals.document || {},
    escapeHtml: (s) => String(s == null ? '' : s),
    fmtFull,
    fmt: (n) => 'Rp ' + Math.abs(n || 0),
    fmtFullSigned: (n) => (n < 0 ? '-' : '') + fmtFull(n),
    parsePzNum: () => 0,
    parseDecStr: () => null,
    calcPreviewValue: () => 0,
    sameId: (a, b) => String(a) === String(b),
    uid: () => 'uid-x',
    todayStr: () => '2026-07-16',
    totalSaldoAkun: () => 0,
    recalcAccBalance: () => 0,
    save: () => {},
    toast: () => {},
    openModal: () => {},
    closeModal: () => {},
    askConfirm: async () => true,
    renderKekayaanBersih: () => {},
    hitungZakatMaal: () => {},
    renderAccGrid: () => {},
    renderDashAccList: () => {},
    renderLapAccList: () => {},
    applyOneCardCollapsePref: () => {},
    window: extraGlobals.window || {},
  }, ['Penyusutan', 'PenyusutanAI']);
  return ctx;
}

// ================= generateRecommendations() — kasus dasar =================

test('generateRecommendations — kosong kalau D.assets belum ada/masih kosong', () => {
  const ctx = loadPenyusutanAI({});
  assert.equal(ctx.PenyusutanAI.generateRecommendations().length, 0);
  const ctx2 = loadPenyusutanAI({ assets: [] });
  assert.equal(ctx2.PenyusutanAI.generateRecommendations().length, 0);
});

// ================= _checkBelumAktif =================

test('_checkBelumAktif — muncul kalau ada Kendaraan/Rumah-Bangunan yang belum aktifkan penyusutan', () => {
  const D = { assets: [makeAsset({ id: 'a1', name: 'Motor Vario', jenis: 'Kendaraan' })] };
  const ctx = loadPenyusutanAI(D);
  const hits = ctx.PenyusutanAI._checkBelumAktif();
  assert.equal(hits.length, 1);
  assert.match(hits[0].text, /Motor Vario/);
  assert.match(hits[0].text, /belum diaktifkan/);
});

test('_checkBelumAktif — TIDAK muncul utk jenis yang lazimnya tidak disusutkan (mis. Emas)', () => {
  const D = { assets: [makeAsset({ jenis: 'Emas/Logam Mulia' })] };
  const ctx = loadPenyusutanAI(D);
  assert.equal(ctx.PenyusutanAI._checkBelumAktif().length, 0);
});

test('_checkBelumAktif — TIDAK muncul kalau penyusutan sudah aktif', () => {
  const D = { assets: [makeAsset({ jenis: 'Kendaraan', penyusutan: { aktif: true, metode: 'manual' } })] };
  const ctx = loadPenyusutanAI(D);
  assert.equal(ctx.PenyusutanAI._checkBelumAktif().length, 0);
});

test('_checkBelumAktif — nama aset dipotong jadi 3 contoh + counter "+N lagi" kalau lebih dari 3', () => {
  const D = {
    assets: [
      makeAsset({ id: 'a1', name: 'Motor A', jenis: 'Kendaraan' }),
      makeAsset({ id: 'a2', name: 'Motor B', jenis: 'Kendaraan' }),
      makeAsset({ id: 'a3', name: 'Motor C', jenis: 'Kendaraan' }),
      makeAsset({ id: 'a4', name: 'Motor D', jenis: 'Kendaraan' }),
    ],
  };
  const ctx = loadPenyusutanAI(D);
  const hits = ctx.PenyusutanAI._checkBelumAktif();
  assert.equal(hits.length, 1);
  assert.match(hits[0].text, /\+1 lagi/);
  assert.match(hits[0].text, /Motor A, Motor B, Motor C/);
});

// ================= _checkTanahDisusutkan =================

test('_checkTanahDisusutkan — muncul kalau Tanah diaktifkan penyusutannya', () => {
  const D = { assets: [makeAsset({ name: 'Tanah Kavling', jenis: 'Tanah', penyusutan: { aktif: true, metode: 'manual' } })] };
  const ctx = loadPenyusutanAI(D);
  const hits = ctx.PenyusutanAI._checkTanahDisusutkan();
  assert.equal(hits.length, 1);
  assert.match(hits[0].text, /Tanah Kavling/);
});

test('_checkTanahDisusutkan — TIDAK muncul kalau Tanah belum diaktifkan penyusutannya', () => {
  const D = { assets: [makeAsset({ jenis: 'Tanah' })] };
  const ctx = loadPenyusutanAI(D);
  assert.equal(ctx.PenyusutanAI._checkTanahDisusutkan().length, 0);
});

// ================= _checkDataBelumLengkap =================

test('_checkDataBelumLengkap — muncul kalau aktif tapi Harga Perolehan (modalInvestasi/hargaBeli) belum diisi', () => {
  const D = { assets: [makeAsset({ name: 'Mobil Avanza', jenis: 'Kendaraan', penyusutan: { aktif: true, metode: 'garisLurus', umurManfaatTahun: 5, nilaiResidu: 0 } })] };
  const ctx = loadPenyusutanAI(D);
  const hits = ctx.PenyusutanAI._checkDataBelumLengkap();
  assert.equal(hits.length, 1);
  assert.match(hits[0].text, /Mobil Avanza/);
  assert.match(hits[0].text, /belum bisa dihitung/);
});

test('_checkDataBelumLengkap — TIDAK muncul kalau metode manual (tidak butuh Harga Perolehan)', () => {
  const D = { assets: [makeAsset({ jenis: 'Kendaraan', penyusutan: { aktif: true, metode: 'manual' } })] };
  const ctx = loadPenyusutanAI(D);
  assert.equal(ctx.PenyusutanAI._checkDataBelumLengkap().length, 0);
});

test('_checkDataBelumLengkap — TIDAK muncul kalau modalInvestasi sudah diisi', () => {
  const D = { assets: [makeAsset({ jenis: 'Kendaraan', modalInvestasi: 100000000, penyusutan: { aktif: true, metode: 'garisLurus', umurManfaatTahun: 5, nilaiResidu: 0 } })] };
  const ctx = loadPenyusutanAI(D);
  assert.equal(ctx.PenyusutanAI._checkDataBelumLengkap().length, 0);
});

// ================= _checkHabisManfaat =================

test('_checkHabisManfaat — muncul kalau umur manfaat Garis Lurus sudah lewat', () => {
  const D = {
    assets: [makeAsset({
      name: 'Laptop Kerja', jenis: 'Lainnya', modalInvestasi: 12000000, tanggal: '2015-01-01',
      penyusutan: { aktif: true, metode: 'garisLurus', umurManfaatTahun: 4, nilaiResidu: 0 },
    })],
  };
  const ctx = loadPenyusutanAI(D);
  const hits = ctx.PenyusutanAI._checkHabisManfaat();
  assert.equal(hits.length, 1);
  assert.match(hits[0].text, /Laptop Kerja/);
});

test('_checkHabisManfaat — TIDAK muncul kalau masih dalam umur manfaat', () => {
  const D = {
    assets: [makeAsset({
      jenis: 'Kendaraan', modalInvestasi: 100000000, tanggal: '2026-01-01',
      penyusutan: { aktif: true, metode: 'garisLurus', umurManfaatTahun: 8, nilaiResidu: 0 },
    })],
  };
  const ctx = loadPenyusutanAI(D);
  assert.equal(ctx.PenyusutanAI._checkHabisManfaat().length, 0);
});

// ================= _checkNilaiBukuKecil =================

test('_checkNilaiBukuKecil — muncul kalau nilai buku tersisa <=20% dari Harga Perolehan (belum habis manfaat)', () => {
  const D = {
    assets: [makeAsset({
      name: 'Motor Bebek', jenis: 'Kendaraan', modalInvestasi: 20000000, tanggal: '2025-01-01',
      penyusutan: { aktif: true, metode: 'saldoMenurun', tarifPersen: 90, nilaiResidu: 0 },
    })],
  };
  const ctx = loadPenyusutanAI(D);
  const hits = ctx.PenyusutanAI._checkNilaiBukuKecil();
  assert.equal(hits.length, 1);
  assert.match(hits[0].text, /Motor Bebek/);
  assert.match(hits[0].text, /%/);
});

test('_checkNilaiBukuKecil — TIDAK muncul kalau nilai buku masih di atas 20%', () => {
  const D = {
    assets: [makeAsset({
      jenis: 'Kendaraan', modalInvestasi: 100000000, tanggal: '2026-06-01',
      penyusutan: { aktif: true, metode: 'garisLurus', umurManfaatTahun: 8, nilaiResidu: 0 },
    })],
  };
  const ctx = loadPenyusutanAI(D);
  assert.equal(ctx.PenyusutanAI._checkNilaiBukuKecil().length, 0);
});

// ================= generateRecommendations() — gabungan & prioritas =================

test('generateRecommendations — diurutkan berdasarkan priority (data belum lengkap duluan) & maksimal 5', () => {
  const D = {
    assets: [
      makeAsset({ id: 'a1', name: 'Mobil Belum Lengkap', jenis: 'Kendaraan', penyusutan: { aktif: true, metode: 'garisLurus', umurManfaatTahun: 5, nilaiResidu: 0 } }),
      makeAsset({ id: 'a2', name: 'Motor Belum Aktif', jenis: 'Kendaraan' }),
      makeAsset({ id: 'a3', name: 'Tanah Disusutkan', jenis: 'Tanah', penyusutan: { aktif: true, metode: 'manual' } }),
    ],
  };
  const ctx = loadPenyusutanAI(D);
  const recs = ctx.PenyusutanAI.generateRecommendations();
  assert.ok(recs.length >= 2);
  assert.ok(recs.length <= 5);
  // priority 1 (data belum lengkap) harus di depan priority 2 (belum aktif)/3 (tanah disusutkan)
  assert.match(recs[0].text, /Mobil Belum Lengkap/);
});

// ================= buildWidgetHtml() =================

test('buildWidgetHtml — pesan fallback kalau tidak ada rekomendasi', () => {
  const ctx = loadPenyusutanAI({ assets: [] });
  const html = ctx.PenyusutanAI.buildWidgetHtml([]);
  assert.match(html, /Belum ada catatan otomatis/);
  assert.match(html, /Rekomendasi AI/);
});

test('buildWidgetHtml — merender tiap item rekomendasi (icon + text)', () => {
  const ctx = loadPenyusutanAI({ assets: [] });
  const html = ctx.PenyusutanAI.buildWidgetHtml([{ icon: '📉', text: 'Contoh catatan.' }]);
  assert.match(html, /📉/);
  assert.match(html, /Contoh catatan\./);
});

// ================= mountInto() =================

test('mountInto — set innerHTML elemen target, no-op kalau elemen null', () => {
  const ctx = loadPenyusutanAI({ assets: [] });
  const el = { innerHTML: '' };
  ctx.PenyusutanAI.mountInto(el);
  assert.match(el.innerHTML, /Rekomendasi AI/);
  assert.doesNotThrow(() => ctx.PenyusutanAI.mountInto(null));
});

// ================= window expose =================

test('PenyusutanAI ke-expose ke window (top-level const, bukan otomatis kayak function/var)', () => {
  const win = {};
  const ctx = loadPenyusutanAI({ assets: [] }, { window: win });
  assert.equal(ctx.window.PenyusutanAI, ctx.PenyusutanAI);
});

// ================= integrasi: Penyusutan.renderList() memanggil PenyusutanAI.mountInto() =================

test('Penyusutan.renderList() memanggil PenyusutanAI.mountInto ke #assetPenyusutanAI (integrasi, bukan cuma unit)', () => {
  const D = { assets: [makeAsset({ jenis: 'Kendaraan' })] };
  const aiEl = { innerHTML: '' };
  const listEl = { innerHTML: '' };
  const fakeDocument = {
    getElementById(id) {
      if (id === 'assetPenyusutanDashboard') return { classList: { add() {}, remove() {} } };
      if (id === 'assetPenyusutanList') return listEl;
      if (id === 'assetPenyusutanAI') return aiEl;
      if (id === 'assetPenyusutanTotalAkumulasi' || id === 'assetPenyusutanTotalBuku') return {};
      return null;
    },
  };
  const ctx = loadPenyusutanAI(D, { document: fakeDocument });
  ctx.Penyusutan.renderList();
  assert.match(aiEl.innerHTML, /Rekomendasi AI/);
  assert.match(aiEl.innerHTML, /belum diaktifkan/);
});
