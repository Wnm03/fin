'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument, createFakeElement } = require('./helpers/fakeDom');

// Cakupan file ini: seluruh fungsi SYNC di aset.js kecuali IDBStore (dites
// terpisah di idb-store.test.js krn butuh mock indexedDB async tersendiri —
// lihat catatan kerja bagian ke-25 di CLAUDE.md):
// ALOKASI_PRESETS/AlokasiAset.{setRisk,onDanaInput,renderAll,renderOne,init},
// Aset.{openModal,updateProfitPreview,toggleZakatable,save,delete,renderList,
// totalValue,renderDashboard}, Penyusutan.{hargaPerolehan,garisLurus,
// saldoMenurun,manual,hitung,toggleAktif,updateParam,renderList},
// PajakAset.{settings,updateSetting,hitungPBB,zakatableAssets,hitungZakatAset,
// renderList}, PORTFOLIO_LABELS, TimelineW.{avgSurplus,goals,waterfall,
// addMonthsToDate,render}.
// PajakAset (fitur baru, bagian ke-12): estimasi PBB (khusus aset Tanah/
// Rumah-Bangunan, dari NJOP≈nilai aset dikurangi NJOPTKP dikali tarif PBB-P2)
// & breakdown Zakat Maal 2,5% khusus aset zakatable di Buku Aset, plus
// Ringkasan Pajak gabungan keduanya — lihat blok test "PajakAset" di bagian
// bawah file ini.
// Penyusutan (fitur baru): estimasi nilai buku aset yg menurun (kendaraan/
// bangunan/dll), 3 metode — Garis Lurus, Saldo Menurun, Manual — lihat blok
// test "Penyusutan" di bagian bawah file ini utk detail skenario tiap metode.
// Aset.renderDashboard() (Dashboard Aset): Komposisi Aset & Persentase Kategori
// sudah ada sejak awal (breakdown per jenis + % dari total nilai pasar);
// ditambahkan Ringkasan Diversifikasi (assetDashDiversifikasi) — simpulan 1
// kalimat + label status berdasarkan jumlah kategori & konsentrasi kategori
// terbesar. Lihat blok test "Aset.renderDashboard" di bawah.
// Pola sama dgn akun.test.js/cicilan.test.js: fakeDocument + stub semua
// dependency lintas-file (save/toast/openModal/closeModal/askConfirm/render*
// dkk), BUKAN test integrasi lintas file sungguhan. parsePzNum/parseDecStr/
// calcPreviewValue/fmt/fmtFull/sameId/uid/todayStr di-stub versi sederhana
// tapi setara (bukan pure-passthrough) krn fungsi2 itu sendiri sudah dites
// terpisah di format-angka.test.js/parse-angka.test.js.

function simpleParsePzNum(v) {
  if (v === null || v === undefined) return 0;
  const negative = /-/.test(String(v));
  const digits = String(v).replace(/[^0-9]/g, '');
  const n = Number(digits);
  if (isNaN(n)) return 0;
  return negative ? -n : n;
}
function simpleParseDecStr(v) {
  if (v === null || v === undefined || v === '') return null;
  let s = String(v).trim().replace(/[^0-9.,-]/g, '');
  if (!s) return null;
  if (s.includes(',') && !s.includes('.')) s = s.replace(',', '.');
  else s = s.replace(/,/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}
// plain() — konversi hasil sandbox vm (realm beda dari host, lihat catatan
// cross-realm di tests/helpers/loadSource.js) jadi struktur host biasa
// sebelum dibandingkan pakai assert.deepEqual (pola sama dgn
// tests/ai-command-center.test.js / tests/dashboard-hub-favorit-view.test.js).
function plain(x) { return JSON.parse(JSON.stringify(x)); }

function fmt(n) { n = Math.abs(n || 0); return 'Rp ' + n; }
function fmtFull(n) { return 'Rp ' + Number(Math.abs(n || 0)).toLocaleString('id-ID'); }
function fmtFullSigned(n) { n = Number(n || 0); return (n < 0 ? '-' : '') + 'Rp ' + Math.abs(n).toLocaleString('id-ID'); }

function makeChip() {
  return createFakeElement({ classList: [] });
}

function assetFields(overrides = {}) {
  return {
    assetModalTitle: {}, assetName: { value: '' }, assetJenis: { value: 'Tanah' },
    assetLokasi: { value: '' }, assetNilai: { value: '' }, assetModalInvestasi: { value: '' },
    assetHargaBeli: { value: '' }, assetJumlahUnit: { value: '' }, assetTanggal: { value: '' },
    assetAccId: { value: '' }, assetScanCandidates: { style: {} }, assetZakatableBtn: {},
    assetProfitInfo: {}, assetList: {},
    assetDashboard: { classList: [] }, assetDashTotal: {}, assetDashBuku: {}, assetDashPasar: {},
    assetDashSelisih: {}, assetDashKategori: {}, assetDashDiversifikasi: {},
    assetInvestasiDashboard: { classList: [] }, assetInvestasiROI: {}, assetInvestasiGain: {},
    assetInvestasiYield: {}, assetInvestasiRingkasan: {},
    assetPenyusutanDashboard: { classList: [] }, assetPenyusutanList: {},
    assetPenyusutanTotalAkumulasi: {}, assetPenyusutanTotalBuku: {},
    assetPajakDashboard: { classList: [] }, assetPajakList: {},
    assetPajakTotalPBB: {}, assetPajakTotalZakat: {}, assetPajakRingkasan: {},
    pajakAsetNjoptkp: { value: '' }, pajakAsetTarif: { value: '' },
    aaResult: {}, aaDana: { value: '' },
    laporanAsetCard: { classList: [] }, lapAsetDaftar: {}, lapAsetRiwayat: {},
    lapAsetNilai: {}, lapAsetPenyusutan: {}, lapAsetRingkasan: {},
    ...overrides,
  };
}

function makeAset(D, opts = {}) {
  const chips = opts.chips || [makeChip(), makeChip(), makeChip()];
  const fakeDocument = createFakeDocument(
    assetFields(opts.domValues),
    { '#aaRiskChips .chip-btn': chips, ...(opts.queryGroups || {}) }
  );
  const calls = { save: 0, toast: [], render: [] };
  const record = (name) => (...args) => calls.render.push({ name, args });
  const ctx = loadSource(['modules/asset/aset.js'], {
    D,
    document: fakeDocument,
    escapeHtml: (s) => String(s == null ? '' : s),
    parsePzNum: simpleParsePzNum,
    parseDecStr: simpleParseDecStr,
    calcPreviewValue: (s) => { const n = simpleParseDecStr(s); return n == null ? 0 : n; },
    fmt, fmtFull, fmtFullSigned,
    sameId: (a, b) => String(a) === String(b),
    uid: opts.uid || (() => 'uid-' + (++makeAset._c)),
    todayStr: () => '2026-07-11',
    totalSaldoAkun: opts.totalSaldoAkun || (() => 0),
    recalcAccBalance: opts.recalcAccBalance || (() => 0),
    save: () => { calls.save++; },
    toast: (msg) => calls.toast.push(msg),
    openModal: opts.openModal || record('openModal'),
    closeModal: opts.closeModal || record('closeModal'),
    askConfirm: opts.askConfirm || (async () => true),
    renderKekayaanBersih: record('renderKekayaanBersih'),
    hitungZakatMaal: record('hitungZakatMaal'),
    renderAccGrid: record('renderAccGrid'),
    renderDashAccList: record('renderDashAccList'),
    renderLapAccList: record('renderLapAccList'),
    applyOneCardCollapsePref: record('applyOneCardCollapsePref'),
    Renov: opts.Renov,
    Pensiun: opts.Pensiun,
    window: opts.window || {},
  }, ['ALOKASI_PRESETS', 'AlokasiAset', 'Aset', 'Penyusutan', 'PajakAset', 'LaporanAset', 'PORTFOLIO_LABELS', 'TimelineW']);
  return { ctx, fakeDocument, calls, chips };
}
makeAset._c = 0;

// ================= ALOKASI_PRESETS =================

test('ALOKASI_PRESETS — konservatif/moderat/agresif masing2 total persentase = 100', () => {
  const { ctx } = makeAset({});
  for (const key of ['konservatif', 'moderat', 'agresif']) {
    const preset = ctx.ALOKASI_PRESETS[key];
    const total = preset.items.reduce((s, it) => s + it.pct, 0);
    assert.equal(total, 100, `preset ${key} harus total 100%`);
    assert.ok(preset.label);
    assert.ok(preset.desc);
  }
});

// ================= AlokasiAset.setRisk / onDanaInput =================

test('setRisk — set D.assetAllocation.risk, panggil save() & render ulang', () => {
  const D = {};
  const { ctx, calls, fakeDocument } = makeAset(D);
  ctx.AlokasiAset.setRisk('moderat');
  assert.equal(D.assetAllocation.risk, 'moderat');
  assert.equal(calls.save, 1);
  // renderOne() TIDAK menampilkan preset.label (cuma preset.desc) — buktikan
  // render ulang lewat desc preset moderat.
  assert.match(fakeDocument.getElementById('aaResult').innerHTML, /Seimbang antara peluang pertumbuhan/);
});

test('onDanaInput — elemen dana tidak ada -> no-op (tidak error, tidak save)', () => {
  const D = {};
  const { ctx, calls, fakeDocument } = makeAset(D);
  // fakeDom selalu bikin elemen kosong; simulasikan "tidak ada" via getElementById custom.
  fakeDocument.getElementById = (id) => (id === 'aaDana' ? null : createFakeElement());
  ctx.AlokasiAset.onDanaInput('');
  assert.equal(calls.save, 0);
});

test('onDanaInput — simpan D.assetAllocation.dana dari parsePzNum(value), panggil save & renderAll', () => {
  const D = {};
  const { ctx, calls, fakeDocument } = makeAset(D, { domValues: { aaDana: { value: '2.500.000' } } });
  ctx.AlokasiAset.onDanaInput();
  assert.equal(D.assetAllocation.dana, 2500000);
  assert.equal(calls.save, 1);
});

// ================= AlokasiAset.renderOne =================

test('renderOne — box tidak ada -> no-op', () => {
  const D = {};
  const { ctx, fakeDocument } = makeAset(D);
  fakeDocument.getElementById = (id) => (id === 'aaResult' ? null : createFakeElement());
  assert.doesNotThrow(() => ctx.AlokasiAset.renderOne(''));
});

test('renderOne — belum pilih risiko -> pesan "Pilih dulu..."', () => {
  const D = {};
  const { ctx, fakeDocument } = makeAset(D);
  ctx.AlokasiAset.renderOne('');
  assert.match(fakeDocument.getElementById('aaResult').innerHTML, /Pilih dulu salah satu profil risiko/);
});

test('renderOne — risk tidak dikenal (bukan salah satu preset) -> box.innerHTML TIDAK ditulis ulang', () => {
  const D = { assetAllocation: { risk: 'ngasal' } };
  const { ctx, fakeDocument } = makeAset(D);
  const before = fakeDocument.getElementById('aaResult').innerHTML;
  ctx.AlokasiAset.renderOne('');
  assert.equal(fakeDocument.getElementById('aaResult').innerHTML, before);
});

test('renderOne — chip aktif sesuai index risk (konservatif=0/moderat=1/agresif=2)', () => {
  const D = { assetAllocation: { risk: 'agresif' } };
  const { ctx, chips } = makeAset(D);
  ctx.AlokasiAset.renderOne('');
  assert.equal(chips[0].classList.contains('active'), false);
  assert.equal(chips[1].classList.contains('active'), false);
  assert.equal(chips[2].classList.contains('active'), true);
});

test('renderOne — danaEl.value pakai D.assetAllocation.dana kalau ada, fallback totalSaldoAkun()', () => {
  const D = { assetAllocation: { risk: 'moderat', dana: 5000000 } };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.AlokasiAset.renderOne('');
  assert.equal(fakeDocument.getElementById('aaDana').value, 5000000);

  const D2 = { assetAllocation: { risk: 'moderat' } };
  const { ctx: ctx2, fakeDocument: fd2 } = makeAset(D2, { totalSaldoAkun: () => 999000 });
  ctx2.AlokasiAset.renderOne('');
  assert.equal(fd2.getElementById('aaDana').value, 999000);
});

test('renderOne — hitung nominal per item dari dana × pct%, & tampilkan disclaimer', () => {
  const D = { assetAllocation: { risk: 'konservatif', dana: 1000000 } };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.AlokasiAset.renderOne('');
  const html = fakeDocument.getElementById('aaResult').innerHTML;
  assert.match(html, /Kas \/ Dana Darurat/);
  assert.match(html, /Rp 400.000/); // 40% dari 1jt
  assert.match(html, /bukan saran investasi personal/);
});

test('renderOne — tidak ada target Dana Darurat -> tampilkan banner ajakan buat target', () => {
  const D = { assetAllocation: { risk: 'konservatif', dana: 1000000 }, targets: [] };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.AlokasiAset.renderOne('');
  assert.match(fakeDocument.getElementById('aaResult').innerHTML, /Belum ada target yang ditandai/);
});

test('renderOne — ada target Dana Darurat -> tanpa banner ajakan, tampilkan progress ddInfo', () => {
  const D = {
    assetAllocation: { risk: 'konservatif', dana: 1000000 },
    targets: [{ id: 't1', isDanaDarurat: true, name: 'Dana Darurat Kami', amount: 1000000, saved: 500000 }],
  };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.AlokasiAset.renderOne('');
  const html = fakeDocument.getElementById('aaResult').innerHTML;
  assert.doesNotMatch(html, /Belum ada target yang ditandai/);
  assert.match(html, /Dana Darurat Kami/);
  assert.match(html, /50%/);
});

test('renderOne — target Dana Darurat pakai accountId -> ambil saldo via recalcAccBalance', () => {
  const D = {
    assetAllocation: { risk: 'konservatif', dana: 1000000 },
    targets: [{ id: 't1', isDanaDarurat: true, name: 'DD', amount: 1000000, accountId: 'a1', saved: 0 }],
  };
  const { ctx, fakeDocument } = makeAset(D, { recalcAccBalance: (id) => (id === 'a1' ? 750000 : 0) });
  ctx.AlokasiAset.renderOne('');
  assert.match(fakeDocument.getElementById('aaResult').innerHTML, /75%/);
});

test('init — delegasi ke renderOne(suffix)', () => {
  const D = { assetAllocation: { risk: 'moderat' } };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.AlokasiAset.init('');
  assert.match(fakeDocument.getElementById('aaResult').innerHTML, /Seimbang antara peluang pertumbuhan/);
});

test('renderAll — panggil renderOne utk setiap SUFFIXES (default cuma [\'\'])', () => {
  const D = { assetAllocation: { risk: 'moderat' } };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.AlokasiAset.renderAll();
  assert.match(fakeDocument.getElementById('aaResult').innerHTML, /Seimbang antara peluang pertumbuhan/);
});

// ================= Aset.openModal =================

test('Aset.openModal — mode tambah: judul "Tambah Aset", field kosong, tanggal=hari ini, nonaktif zakat', () => {
  const D = { assets: [] };
  const { ctx, fakeDocument, calls } = makeAset(D);
  ctx.Aset.openModal();
  assert.equal(fakeDocument.getElementById('assetModalTitle').textContent, 'Tambah Aset');
  assert.equal(fakeDocument.getElementById('assetName').value, '');
  assert.equal(fakeDocument.getElementById('assetJenis').value, 'Tanah');
  assert.equal(fakeDocument.getElementById('assetTanggal').value, '2026-07-11');
  assert.equal(fakeDocument.getElementById('assetZakatableBtn').textContent, 'Nonaktif');
  assert.equal(ctx.Aset.editId, null);
  assert.ok(calls.render.some((r) => r.name === 'openModal'));
});

test('Aset.openModal — mode edit: prefill semua field dari aset, zakatable aktif, editId tersimpan', () => {
  const D = {
    assets: [{
      id: 'as1', name: 'Tanah Kavling', jenis: 'Tanah', lokasi: 'Sukorejo', nilai: 500000000,
      modalInvestasi: 400000000, hargaBeli: null, jumlahUnit: null, tanggal: '2024-01-01',
      accountId: 'acc1', zakatable: true,
    }],
  };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.Aset.openModal('as1');
  assert.equal(fakeDocument.getElementById('assetModalTitle').textContent, 'Edit Aset');
  assert.equal(fakeDocument.getElementById('assetName').value, 'Tanah Kavling');
  assert.equal(fakeDocument.getElementById('assetLokasi').value, 'Sukorejo');
  assert.equal(fakeDocument.getElementById('assetNilai').value, 500000000);
  assert.equal(fakeDocument.getElementById('assetAccId').value, 'acc1');
  assert.equal(fakeDocument.getElementById('assetZakatableBtn').textContent, '✓ Aktif');
  assert.equal(ctx.Aset.editId, 'as1');
});

test('Aset.openModal — scanBox disembunyikan & dikosongkan tiap dibuka', () => {
  const D = { assets: [] };
  const { ctx, fakeDocument } = makeAset(D, { domValues: { assetScanCandidates: { style: { display: 'block' }, innerHTML: 'lama' } } });
  ctx.Aset.openModal();
  const box = fakeDocument.getElementById('assetScanCandidates');
  assert.equal(box.style.display, 'none');
  assert.equal(box.innerHTML, '');
});

// ================= Aset.updateProfitPreview / toggleZakatable =================

test('updateProfitPreview — modal investasi kosong -> box dikosongkan', () => {
  const D = {};
  const { ctx, fakeDocument } = makeAset(D, { domValues: { assetNilai: { value: '1000000' }, assetModalInvestasi: { value: '' } } });
  ctx.Aset.updateProfitPreview();
  assert.equal(fakeDocument.getElementById('assetProfitInfo').innerHTML, '');
});

test('updateProfitPreview — untung (nilai > modal) -> class green & tanda +', () => {
  const D = {};
  const { ctx, fakeDocument } = makeAset(D, { domValues: { assetNilai: { value: '1500000' }, assetModalInvestasi: { value: '1000000' } } });
  ctx.Aset.updateProfitPreview();
  const html = fakeDocument.getElementById('assetProfitInfo').innerHTML;
  assert.match(html, /class="green"/);
  assert.match(html, /\+Rp 500.000/);
  assert.match(html, /\+50\.00%/);
});

test('updateProfitPreview — rugi (nilai < modal) -> class red, tanpa tanda +', () => {
  const D = {};
  const { ctx, fakeDocument } = makeAset(D, { domValues: { assetNilai: { value: '800000' }, assetModalInvestasi: { value: '1000000' } } });
  ctx.Aset.updateProfitPreview();
  const html = fakeDocument.getElementById('assetProfitInfo').innerHTML;
  assert.match(html, /class="red"/);
  assert.doesNotMatch(html, /\+Rp/);
});

test('toggleZakatable — membalik state & update teks/class tombol', () => {
  const D = { assets: [] };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.Aset.openModal(); // _zakatableState=false
  ctx.Aset.toggleZakatable();
  assert.equal(fakeDocument.getElementById('assetZakatableBtn').textContent, '✓ Aktif');
  ctx.Aset.toggleZakatable();
  assert.equal(fakeDocument.getElementById('assetZakatableBtn').textContent, 'Nonaktif');
});

// ================= Aset.save =================

test('save — nama kosong -> toast peringatan, tidak menambah aset', () => {
  const D = { assets: [] };
  const { ctx, calls } = makeAset(D, { domValues: { assetName: { value: '   ' } } });
  ctx.Aset.save();
  assert.equal(D.assets.length, 0);
  assert.ok(calls.toast[0].includes('Nama aset wajib diisi'));
});

test('save — tambah aset baru, hitung keuntungan dari modalInvestasi, panggil save+renders+toast', () => {
  const D = { assets: [] };
  const { ctx, calls } = makeAset(D, {
    domValues: {
      assetName: { value: 'Emas Antam' }, assetJenis: { value: 'Emas/Logam Mulia' },
      assetNilai: { value: '1200000' }, assetModalInvestasi: { value: '1000000' },
      assetTanggal: { value: '2026-01-01' },
    },
  });
  ctx.Aset.save();
  assert.equal(D.assets.length, 1);
  const a = D.assets[0];
  assert.equal(a.name, 'Emas Antam');
  assert.equal(a.nilai, 1200000);
  assert.equal(a.keuntungan, 200000);
  assert.equal(a.keuntunganPct, 20);
  assert.equal(calls.save, 1);
  assert.ok(calls.render.some((r) => r.name === 'closeModal'));
  assert.ok(calls.render.some((r) => r.name === 'renderKekayaanBersih'));
  assert.ok(calls.render.some((r) => r.name === 'hitungZakatMaal'));
  assert.ok(calls.render.some((r) => r.name === 'renderAccGrid'));
  assert.ok(calls.render.some((r) => r.name === 'renderDashAccList'));
  assert.ok(calls.render.some((r) => r.name === 'renderLapAccList'));
  assert.ok(calls.toast[0].includes('tersimpan'));
});

test('save — tanpa modalInvestasi -> keuntungan/keuntunganPct null', () => {
  const D = { assets: [] };
  const { ctx } = makeAset(D, { domValues: { assetName: { value: 'Tanah' }, assetNilai: { value: '5000000' } } });
  ctx.Aset.save();
  assert.equal(D.assets[0].keuntungan, null);
  assert.equal(D.assets[0].keuntunganPct, null);
});

test('save — mode edit: update aset existing (bukan nambah baru)', () => {
  const D = { assets: [{ id: 'as1', name: 'Lama', jenis: 'Tanah', nilai: 100 }] };
  const { ctx, calls, fakeDocument } = makeAset(D);
  ctx.Aset.openModal('as1'); // prefill form dari data lama (editId=as1)
  // simulasikan user mengedit field setelah modal terbuka
  fakeDocument.getElementById('assetName').value = 'Baru';
  fakeDocument.getElementById('assetNilai').value = '200';
  ctx.Aset.save();
  assert.equal(D.assets.length, 1);
  assert.equal(D.assets[0].name, 'Baru');
  assert.equal(D.assets[0].nilai, 200);
  assert.ok(calls.toast[0].includes('tersimpan'));
});

test('save — mode edit tapi aset sudah tidak ada (mis. dihapus tab lain) -> toast error, tidak crash', () => {
  const D = { assets: [{ id: 'as1', name: 'X' }] };
  const { ctx, calls } = makeAset(D, { domValues: { assetName: { value: 'Y' } } });
  ctx.Aset.openModal('as1');
  D.assets = []; // dihapus "di tempat lain" sebelum simpan
  ctx.Aset.save();
  assert.ok(calls.toast[0].includes('tidak ditemukan'));
});

// ================= Aset.delete =================

test('delete — user batal konfirmasi -> tidak jadi hapus', async () => {
  const D = { assets: [{ id: 'as1' }] };
  const { ctx, calls } = makeAset(D, { askConfirm: async () => false });
  await ctx.Aset.delete('as1');
  assert.equal(D.assets.length, 1);
  assert.equal(calls.save, 0);
});

test('delete — konfirmasi ya -> hapus aset & panggil save+renders', async () => {
  const D = { assets: [{ id: 'as1' }, { id: 'as2' }] };
  const { ctx, calls } = makeAset(D);
  await ctx.Aset.delete('as1');
  assert.equal(D.assets.length, 1);
  assert.equal(D.assets[0].id, 'as2');
  assert.equal(calls.save, 1);
  assert.ok(calls.render.some((r) => r.name === 'renderKekayaanBersih'));
  assert.ok(calls.render.some((r) => r.name === 'hitungZakatMaal'));
});

// ================= Aset.renderList / totalValue =================

test('renderList — kosong -> empty state', () => {
  const D = { assets: [] };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.Aset.renderList();
  assert.match(fakeDocument.getElementById('assetList').innerHTML, /Belum ada aset tercatat/);
});

test('renderList — tampilkan nama/jenis/nilai/badge zakat & badge untung-rugi', () => {
  const D = {
    assets: [{ id: 'as1', name: 'Reksadana X', jenis: 'Reksadana', nilai: 1100000, zakatable: true, keuntunganPct: 10 }],
  };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.Aset.renderList();
  const html = fakeDocument.getElementById('assetList').innerHTML;
  assert.match(html, /Reksadana X/);
  assert.match(html, /Zakat/);
  assert.match(html, /▲/);
  assert.match(html, /\+10\.00%/);
});

test('renderList — aset ditautkan akun yang masih ada vs sudah terhapus', () => {
  const D = {
    assets: [
      { id: 'as1', name: 'A', jenis: 'Tanah', nilai: 1, accountId: 'a1' },
      { id: 'as2', name: 'B', jenis: 'Tanah', nilai: 1, accountId: 'ghost' },
    ],
    accounts: [{ id: 'a1', name: 'Bank BCA' }],
  };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.Aset.renderList();
  const html = fakeDocument.getElementById('assetList').innerHTML;
  assert.match(html, /Bank BCA/);
  assert.match(html, /akun terhapus/);
});

test('totalValue — jumlah nilai semua aset, D.assets kosong/tidak ada -> 0', () => {
  const { ctx: ctx1 } = makeAset({ assets: [{ nilai: 100 }, { nilai: 250 }] });
  assert.equal(ctx1.Aset.totalValue(), 350);
  const { ctx: ctx2 } = makeAset({});
  assert.equal(ctx2.Aset.totalValue(), 0);
});

// ================= Aset.renderDashboard =================
// Dashboard Aset: Komposisi Aset (breakdown per jenis, urut nilai terbesar ->
// terkecil), Persentase Kategori (% tiap jenis dari total Nilai Pasar), dan
// Ringkasan Diversifikasi (assetDashDiversifikasi — kesimpulan status sebaran
// aset berdasarkan jumlah kategori & konsentrasi kategori terbesar).

test('renderDashboard — D.assets kosong -> dashboard tetap tampil dengan pesan ajakan (bukan disembunyikan)', () => {
  const D = { assets: [] };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.Aset.renderDashboard();
  assert.equal(fakeDocument.getElementById('assetDashboard').classList.contains('u-dnone'), false);
  assert.equal(fakeDocument.getElementById('assetDashTotal').textContent, 'Rp 0');
  assert.match(fakeDocument.getElementById('assetDashKategori').innerHTML, /Belum ada aset tercatat/);
});

test('renderDashboard — ada aset -> dashboard ditampilkan & Total/Buku/Pasar terisi', () => {
  const D = {
    assets: [
      { id: 'a1', jenis: 'Emas/Logam Mulia', nilai: 1200000, modalInvestasi: 1000000 },
      { id: 'a2', jenis: 'Reksadana', nilai: 500000, hargaBeli: 4000, jumlahUnit: 100 }, // buku 400.000
      { id: 'a3', jenis: 'Tanah', nilai: 700000 }, // tanpa modal -> buku = pasar
    ],
  };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.Aset.renderDashboard();
  assert.equal(fakeDocument.getElementById('assetDashboard').classList.contains('u-dnone'), false);
  assert.equal(fakeDocument.getElementById('assetDashTotal').textContent, 'Rp 2.400.000');
  assert.equal(fakeDocument.getElementById('assetDashPasar').textContent, 'Rp 2.400.000');
  assert.equal(fakeDocument.getElementById('assetDashBuku').textContent, 'Rp 2.100.000');
  assert.match(fakeDocument.getElementById('assetDashSelisih').innerHTML, /Rp 300\.000 \(\+14\.29%\)/);
});

test('renderDashboard — Komposisi Aset & Persentase Kategori: urut terbesar->terkecil, % dari total Nilai Pasar', () => {
  const D = {
    assets: [
      { id: 'a1', name: 'Tanah A', jenis: 'Tanah', nilai: 600000000 },
      { id: 'a2', name: 'Emas A', jenis: 'Emas/Logam Mulia', nilai: 300000000 },
      { id: 'a3', name: 'Saham A', jenis: 'Saham', nilai: 100000000 },
    ],
  };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.Aset.renderDashboard();
  const html = fakeDocument.getElementById('assetDashKategori').innerHTML;
  const idxTanah = html.indexOf('Tanah');
  const idxEmas = html.indexOf('Emas/Logam Mulia');
  const idxSaham = html.indexOf('Saham');
  assert.ok(idxTanah < idxEmas && idxEmas < idxSaham, 'urutan kategori harus dari nilai terbesar ke terkecil');
  assert.match(html, /60\.0% dari total/);
  assert.match(html, /30\.0% dari total/);
  assert.match(html, /10\.0% dari total/);
});

test('renderDashboard — Ringkasan Diversifikasi: cuma 1 kategori -> "Belum Terdiversifikasi"', () => {
  const D = { assets: [{ id: 'a1', jenis: 'Tanah', nilai: 500000000 }] };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.Aset.renderDashboard();
  assert.match(fakeDocument.getElementById('assetDashDiversifikasi').innerHTML, /Belum Terdiversifikasi/);
});

test('renderDashboard — Ringkasan Diversifikasi: kategori terbesar >=70% -> "Konsentrasi Tinggi"', () => {
  const D = {
    assets: [
      { id: 'a1', jenis: 'Tanah', nilai: 800000000 },
      { id: 'a2', jenis: 'Emas/Logam Mulia', nilai: 200000000 },
    ],
  };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.Aset.renderDashboard();
  const html = fakeDocument.getElementById('assetDashDiversifikasi').innerHTML;
  assert.match(html, /Konsentrasi Tinggi/);
  assert.match(html, /80\.0%/);
});

test('renderDashboard — Ringkasan Diversifikasi: kategori terbesar 50–70% -> "Cukup Terkonsentrasi"', () => {
  const D = {
    assets: [
      { id: 'a1', jenis: 'Tanah', nilai: 550000000 },
      { id: 'a2', jenis: 'Emas/Logam Mulia', nilai: 250000000 },
      { id: 'a3', jenis: 'Saham', nilai: 200000000 },
    ],
  };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.Aset.renderDashboard();
  assert.match(fakeDocument.getElementById('assetDashDiversifikasi').innerHTML, /Cukup Terkonsentrasi/);
});

test('renderDashboard — Ringkasan Diversifikasi: kategori terbesar <50% & >=3 kategori -> "Terdiversifikasi Baik"', () => {
  const D = {
    assets: [
      { id: 'a1', jenis: 'Tanah', nilai: 300000000 },
      { id: 'a2', jenis: 'Emas/Logam Mulia', nilai: 250000000 },
      { id: 'a3', jenis: 'Saham', nilai: 250000000 },
      { id: 'a4', jenis: 'Reksadana', nilai: 200000000 },
    ],
  };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.Aset.renderDashboard();
  const html = fakeDocument.getElementById('assetDashDiversifikasi').innerHTML;
  assert.match(html, /Terdiversifikasi Baik/);
  assert.match(html, /4 kategori/);
});

test('renderDashboard — dipanggil otomatis lewat renderList() (save/delete/import semua lewat sini)', () => {
  const D = { assets: [{ id: 'a1', jenis: 'Tanah', nilai: 100 }] };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.Aset.renderList();
  assert.equal(fakeDocument.getElementById('assetDashboard').classList.contains('u-dnone'), false);
  assert.match(fakeDocument.getElementById('assetDashDiversifikasi').innerHTML, /Belum Terdiversifikasi/);
});

// ================= Aset.renderInvestasi =================
// Ringkasan Performa Investasi: ROI, Capital Gain/Loss, Yield (CAGR tahunan
// tertimbang modal), & ringkasan performa portofolio (best/worst performer).
// HANYA mencakup aset yg py data modal (modalInvestasi ATAU hargaBeli×jumlahUnit
// > 0) -- aset tanpa data modal dikecualikan dari agregasi. Referensi "hari ini"
// pakai todayStr() (di-stub '2026-07-11' lewat makeAset) supaya deterministik.

test('renderInvestasi — tidak ada aset dgn data modal -> box tetap tampil dengan pesan ajakan', () => {
  const D = { assets: [{ id: 'a1', jenis: 'Tanah', nilai: 500000000 }] }; // tanpa modal sama sekali
  const { ctx, fakeDocument } = makeAset(D);
  ctx.Aset.renderInvestasi();
  assert.equal(fakeDocument.getElementById('assetInvestasiDashboard').classList.contains('u-dnone'), false);
  assert.equal(fakeDocument.getElementById('assetInvestasiROI').textContent, '—');
  assert.match(fakeDocument.getElementById('assetInvestasiRingkasan').innerHTML, /Belum ada aset dengan data modal/);
});

test('renderInvestasi — D.assets kosong -> box tetap tampil dengan pesan ajakan', () => {
  const D = { assets: [] };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.Aset.renderInvestasi();
  assert.equal(fakeDocument.getElementById('assetInvestasiDashboard').classList.contains('u-dnone'), false);
  assert.match(fakeDocument.getElementById('assetInvestasiRingkasan').innerHTML, /Belum ada aset dengan data modal/);
});

test('renderInvestasi — ROI & Capital Gain/Loss dihitung dari total modal vs total nilai (untung)', () => {
  const D = {
    assets: [
      { id: 'a1', name: 'Emas Antam', jenis: 'Emas/Logam Mulia', nilai: 1200000, modalInvestasi: 1000000 },
      { id: 'a2', name: 'Reksadana X', jenis: 'Reksadana', nilai: 500000, hargaBeli: 4000, jumlahUnit: 100 }, // modal 400.000
    ],
  };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.Aset.renderInvestasi();
  assert.equal(fakeDocument.getElementById('assetInvestasiDashboard').classList.contains('u-dnone'), false);
  // total modal 1.400.000, total nilai 1.700.000, gain 300.000, ROI 21.43%
  assert.match(fakeDocument.getElementById('assetInvestasiROI').innerHTML, /class="green"/);
  assert.match(fakeDocument.getElementById('assetInvestasiROI').innerHTML, /\+21\.43%/);
  assert.match(fakeDocument.getElementById('assetInvestasiGain').innerHTML, /Rp 300\.000 \(\+21\.43%\)/);
});

test('renderInvestasi — rugi (total nilai < total modal) -> class red, tanpa tanda +', () => {
  const D = {
    assets: [{ id: 'a1', name: 'Saham Y', jenis: 'Saham', nilai: 700000, modalInvestasi: 1000000 }],
  };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.Aset.renderInvestasi();
  const roiHtml = fakeDocument.getElementById('assetInvestasiROI').innerHTML;
  assert.match(roiHtml, /class="red"/);
  assert.doesNotMatch(roiHtml, /\+/);
  assert.match(roiHtml, /-30\.00%/);
});

test('renderInvestasi — aset tanpa tanggal -> Yield "belum bisa dihitung"', () => {
  const D = { assets: [{ id: 'a1', name: 'Emas', jenis: 'Emas/Logam Mulia', nilai: 1200000, modalInvestasi: 1000000 }] };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.Aset.renderInvestasi();
  assert.match(fakeDocument.getElementById('assetInvestasiYield').innerHTML, /Belum bisa dihitung/);
});

test('renderInvestasi — Yield (CAGR) dihitung tertimbang modal dari tanggal ke todayStr()', () => {
  // Aset dipegang persis 1 tahun (365 hari): 2025-07-11 -> 2026-07-11 (todayStr stub).
  // Modal 1.000.000 -> nilai 1.100.000 = return 10% dalam ~1 tahun -> CAGR ~10%.
  const D = {
    assets: [{ id: 'a1', name: 'Deposito', jenis: 'Deposito/Investasi', nilai: 1100000, modalInvestasi: 1000000, tanggal: '2025-07-11' }],
  };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.Aset.renderInvestasi();
  const html = fakeDocument.getElementById('assetInvestasiYield').innerHTML;
  assert.match(html, /class="green"/);
  assert.match(html, /\+(9\.9|10\.0)\d%\/tahun/); // toleransi pembulatan hari->tahun
});

test('renderInvestasi — Ringkasan Performa menyebutkan jumlah aset, total modal/nilai, & untung/rugi', () => {
  const D = {
    assets: [
      { id: 'a1', name: 'Emas Antam', jenis: 'Emas/Logam Mulia', nilai: 1200000, modalInvestasi: 1000000 },
      { id: 'a2', name: 'Reksadana X', jenis: 'Reksadana', nilai: 500000, hargaBeli: 4000, jumlahUnit: 100 },
    ],
  };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.Aset.renderInvestasi();
  const html = fakeDocument.getElementById('assetInvestasiRingkasan').innerHTML;
  assert.match(html, /Dari <b>2<\/b> aset/);
  assert.match(html, /untung/);
  assert.match(html, /Kinerja terbaik/);
  assert.match(html, /Emas Antam/); // ROI 20% > Reksadana 25%? cek performer benar di bawah
});

test('renderInvestasi — best/worst performer dipilih dari %ROI per-aset tertinggi/terendah', () => {
  const D = {
    assets: [
      { id: 'a1', name: 'Saham Cuan', jenis: 'Saham', nilai: 1500000, modalInvestasi: 1000000 }, // +50%
      { id: 'a2', name: 'Reksadana Boncos', jenis: 'Reksadana', nilai: 800000, modalInvestasi: 1000000 }, // -20%
    ],
  };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.Aset.renderInvestasi();
  const html = fakeDocument.getElementById('assetInvestasiRingkasan').innerHTML;
  const idxBest = html.indexOf('terbaik');
  const idxSahamCuan = html.indexOf('Saham Cuan');
  const idxWorst = html.indexOf('terendah');
  const idxReksaBoncos = html.indexOf('Reksadana Boncos');
  assert.ok(idxBest > -1 && idxSahamCuan > idxBest, 'Saham Cuan harus jadi performer terbaik');
  assert.ok(idxWorst > -1 && idxReksaBoncos > idxWorst, 'Reksadana Boncos harus jadi performer terendah');
});

test('renderInvestasi — cuma 1 aset ter-track -> tanpa kalimat best/worst performer', () => {
  const D = { assets: [{ id: 'a1', name: 'Emas', jenis: 'Emas/Logam Mulia', nilai: 1200000, modalInvestasi: 1000000 }] };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.Aset.renderInvestasi();
  assert.doesNotMatch(fakeDocument.getElementById('assetInvestasiRingkasan').innerHTML, /Kinerja terbaik/);
});

test('renderInvestasi — aset campur (ada modal & tidak) -> yg tanpa modal dikecualikan dari agregasi', () => {
  const D = {
    assets: [
      { id: 'a1', name: 'Emas', jenis: 'Emas/Logam Mulia', nilai: 1200000, modalInvestasi: 1000000 },
      { id: 'a2', name: 'Tanah Warisan', jenis: 'Tanah', nilai: 900000000 }, // tanpa modal, harus dikecualikan
    ],
  };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.Aset.renderInvestasi();
  assert.match(fakeDocument.getElementById('assetInvestasiRingkasan').innerHTML, /Dari <b>1<\/b> aset/);
});

test('renderInvestasi — box tidak ada di DOM -> no-op (tidak error)', () => {
  const D = { assets: [{ id: 'a1', nilai: 1, modalInvestasi: 1 }] };
  const { ctx, fakeDocument } = makeAset(D);
  fakeDocument.getElementById = (id) => (id === 'assetInvestasiDashboard' ? null : createFakeElement());
  assert.doesNotThrow(() => ctx.Aset.renderInvestasi());
});

test('renderInvestasi — dipanggil otomatis lewat renderList()', () => {
  const D = { assets: [{ id: 'a1', name: 'Emas', jenis: 'Emas/Logam Mulia', nilai: 1200000, modalInvestasi: 1000000 }] };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.Aset.renderList();
  assert.equal(fakeDocument.getElementById('assetInvestasiDashboard').classList.contains('u-dnone'), false);
  assert.match(fakeDocument.getElementById('assetInvestasiGain').innerHTML, /Rp 200\.000/);
});

// ================= Aset.exportXLSX / importXLSX =================
// Fitur export/import data di Buku Aset, format .xlsx (ganti dari JSON/CSV
// lama). Pola sama dgn ShopExport/ImportShopExcel di cobek.js: pustaka
// SheetJS diakses lewat global `XLSX` (di-mock manual di sini) + ensureXLSX()
// utk lazy-load-nya (di-mock jadi no-op krn XLSX sudah "ada").

function makeFakeXLSX(opts = {}) {
  const written = [];
  return {
    utils: {
      book_new: () => ({ sheets: [] }),
      aoa_to_sheet: (rows) => ({ rows }),
      book_append_sheet: (wb, ws, name) => { wb.sheets.push({ name, ws }); },
      sheet_to_json: (ws) => ws.rows,
    },
    writeFile: (wb, filename) => { written.push({ wb, filename }); },
    read: opts.read || (() => { throw new Error('bukan file excel'); }),
    _written: written,
  };
}

function makeAsetIO(D, opts = {}) {
  const fakeDocument = createFakeDocument(assetFields(opts.domValues));
  const calls = { save: 0, toast: [], render: [] };
  const record = (name) => (...args) => calls.render.push({ name, args });
  const XLSX = ('XLSX' in opts) ? opts.XLSX : makeFakeXLSX(opts);
  const ctx = loadSource(['modules/asset/aset.js'], {
    D,
    document: fakeDocument,
    escapeHtml: (s) => String(s == null ? '' : s),
    sameId: (a, b) => String(a) === String(b),
    uid: opts.uid || (() => 'uid-' + (++makeAsetIO._c)),
    todayStr: () => '2026-07-11',
    fmt,
    fmtFull,
    fmtFullSigned,
    save: () => { calls.save++; },
    toast: (msg) => calls.toast.push(msg),
    askConfirm: opts.askConfirm || (async () => true),
    renderKekayaanBersih: record('renderKekayaanBersih'),
    hitungZakatMaal: record('hitungZakatMaal'),
    renderAccGrid: record('renderAccGrid'),
    renderDashAccList: record('renderDashAccList'),
    renderLapAccList: record('renderLapAccList'),
    XLSX,
    ensureXLSX: opts.ensureXLSX || (async () => {}),
    window: opts.window || {},
  }, ['Aset']);
  return { ctx, fakeDocument, calls, XLSX };
}
makeAsetIO._c = 0;

function makeFakeXLSXImportEvent() {
  const target = { value: 'C:\\fakepath\\aset.xlsx', files: [{ name: 'aset.xlsx' }] };
  target.files[0].arrayBuffer = async () => new ArrayBuffer(0);
  return { target };
}

test('exportXLSX — D.assets kosong -> toast peringatan, tidak bikin file', async () => {
  const { ctx, calls, XLSX } = makeAsetIO({ assets: [] });
  await ctx.Aset.exportXLSX();
  assert.equal(XLSX._written.length, 0);
  assert.match(calls.toast[0], /Belum ada aset/);
});

test('exportXLSX — ada aset -> bikin file .xlsx, toast sukses', async () => {
  const D = { accounts: [{ id: 'acc1', name: 'BCA' }], assets: [{ id: 'a1', name: 'Tanah Kavling', jenis: 'Tanah', nilai: 500000000, accountId: 'acc1' }] };
  const { ctx, calls, XLSX } = makeAsetIO(D);
  await ctx.Aset.exportXLSX();
  assert.equal(XLSX._written.length, 1);
  assert.match(XLSX._written[0].filename, /^aset-W-.*\.xlsx$/);
  const sheet = XLSX._written[0].wb.sheets[0];
  assert.equal(sheet.name, 'Buku Aset');
  assert.equal(sheet.ws.rows[0][0], 'Nama');
  assert.equal(sheet.ws.rows[1][0], 'Tanah Kavling');
  assert.equal(sheet.ws.rows[1][9], 'BCA');
  assert.match(calls.toast[0], /1 aset di-export/);
});

test('exportXLSX — pustaka Excel gagal dimuat -> toast peringatan, tidak bikin file', async () => {
  const D = { assets: [{ id: 'a1', name: 'Tanah', nilai: 1 }] };
  const { ctx, calls } = makeAsetIO(D, { XLSX: undefined, ensureXLSX: async () => { throw new Error('offline'); } });
  await ctx.Aset.exportXLSX();
  assert.match(calls.toast[0], /Gagal memuat pustaka Excel/);
});

test('importXLSX — file tidak ada (batal pilih) -> no-op', async () => {
  const { ctx } = makeAsetIO({ assets: [] });
  await ctx.Aset.importXLSX({ target: { files: [] } });
  // tidak boleh throw; tidak ada assersi lanjutan krn memang no-op murni.
});

test('importXLSX — file bukan Excel valid -> toast error, value input direset', async () => {
  const event = makeFakeXLSXImportEvent();
  const XLSX = makeFakeXLSX({ read: () => { throw new Error('corrupt'); } });
  const { ctx, calls } = makeAsetIO({ assets: [] }, { XLSX });
  await ctx.Aset.importXLSX(event);
  assert.match(calls.toast[0], /tidak valid.*rusak/);
  assert.equal(event.target.value, '');
});

test('importXLSX — semua baris tidak valid (nama/nilai kosong) -> toast tidak ada aset valid', async () => {
  const event = makeFakeXLSXImportEvent();
  const XLSX = makeFakeXLSX({
    read: () => ({ SheetNames: ['Buku Aset'], Sheets: { 'Buku Aset': { rows: [{ Nama: '' }, { Nama: 'Tanpa Nilai', Nilai: '' }] } } }),
  });
  const { ctx, calls } = makeAsetIO({ assets: [] }, { XLSX });
  await ctx.Aset.importXLSX(event);
  assert.match(calls.toast[0], /Tidak ada aset valid/);
});

test('importXLSX — user batal konfirmasi -> tidak jadi import, D.assets tidak berubah', async () => {
  const D = { assets: [] };
  const event = makeFakeXLSXImportEvent();
  const XLSX = makeFakeXLSX({
    read: () => ({ SheetNames: ['Buku Aset'], Sheets: { 'Buku Aset': { rows: [{ Nama: 'Tanah', Nilai: 1000000 }] } } }),
  });
  const { ctx, calls } = makeAsetIO(D, { XLSX, askConfirm: async () => false });
  await ctx.Aset.importXLSX(event);
  assert.equal(D.assets.length, 0);
  assert.equal(calls.save, 0);
});

test('importXLSX — baris valid berhasil diimport: id baru, accountId di-null-kan, save+render terpanggil', async () => {
  const D = { assets: [{ id: 'existing', name: 'Sudah Ada', nilai: 1, jenis: 'Lainnya' }] };
  const event = makeFakeXLSXImportEvent();
  const XLSX = makeFakeXLSX({
    read: () => ({
      SheetNames: ['Buku Aset'],
      Sheets: { 'Buku Aset': { rows: [
        { Nama: 'Sawah Warisan', Jenis: 'Tanah', Nilai: 200000000, Zakatable: 'Ya', 'Akun Tertaut': 'acc-lama-di-hp-lain' },
        { Nama: 'no-jenis-cocok', Jenis: 'JenisAsalAsalan', Nilai: 500 },
      ] } },
    }),
  });
  const { ctx, calls } = makeAsetIO(D, { XLSX });
  await ctx.Aset.importXLSX(event);
  assert.equal(D.assets.length, 3);
  const sawah = D.assets.find((a) => a.name === 'Sawah Warisan');
  assert.ok(sawah);
  assert.notEqual(sawah.id, 'existing');
  assert.equal(sawah.accountId, null, 'accountId dari file import harus di-null-kan (id akun beda perangkat)');
  assert.equal(sawah.zakatable, true);
  const asalan = D.assets.find((a) => a.name === 'no-jenis-cocok');
  assert.equal(asalan.jenis, 'Lainnya', 'jenis yang tidak dikenal fallback ke Lainnya');
  assert.equal(calls.save, 1);
  assert.ok(calls.render.some((r) => r.name === 'renderKekayaanBersih'));
  assert.ok(calls.render.some((r) => r.name === 'hitungZakatMaal'));
  assert.match(calls.toast[0], /2 aset berhasil di-import/);
  assert.equal(event.target.value, '');
});

test('importXLSX — sebagian baris tidak valid -> hanya yang valid diimport, toast sebutkan jumlah dilewati', async () => {
  const D = { assets: [] };
  const event = makeFakeXLSXImportEvent();
  const XLSX = makeFakeXLSX({
    read: () => ({
      SheetNames: ['Buku Aset'],
      Sheets: { 'Buku Aset': { rows: [
        { Nama: 'Valid Satu', Nilai: 100 },
        { Nama: '', Nilai: 200 },
        { Nama: 'Tanpa Nilai', Nilai: '' },
      ] } },
    }),
  });
  const { ctx, calls } = makeAsetIO(D, { XLSX });
  await ctx.Aset.importXLSX(event);
  assert.equal(D.assets.length, 1);
  assert.match(calls.toast[0], /1 aset berhasil di-import \(2 dilewati\)/);
});

test('importXLSX — Modal Investasi ikut diisi -> keuntungan & keuntunganPct dihitung ulang', async () => {
  const D = { assets: [] };
  const event = makeFakeXLSXImportEvent();
  const XLSX = makeFakeXLSX({
    read: () => ({
      SheetNames: ['Buku Aset'],
      Sheets: { 'Buku Aset': { rows: [{ Nama: 'Reksadana X', Nilai: 1200000, 'Modal Investasi': 1000000 }] } },
    }),
  });
  const { ctx } = makeAsetIO(D, { XLSX });
  await ctx.Aset.importXLSX(event);
  const a = D.assets[0];
  assert.equal(a.keuntungan, 200000);
  assert.equal(a.keuntunganPct, 20);
});

// ================= PORTFOLIO_LABELS =================

test('PORTFOLIO_LABELS — regex mengenali label kolom scan portofolio', () => {
  const { ctx } = makeAset({});
  assert.match('Nilai Sekarang', ctx.PORTFOLIO_LABELS.nilai);
  assert.match('Modal Investasi', ctx.PORTFOLIO_LABELS.modal);
  assert.match('Harga Beli', ctx.PORTFOLIO_LABELS.hargaBeli);
  assert.match('Harga Perolehan', ctx.PORTFOLIO_LABELS.hargaBeli);
  assert.match('Jumlah Unit', ctx.PORTFOLIO_LABELS.jumlahUnit);
  assert.doesNotMatch('Nama Barang', ctx.PORTFOLIO_LABELS.nilai);
});

// ================= TimelineW =================

test('TimelineW.avgSurplus — Pensiun tidak ada (typeof undefined) -> default {surplus:0,months:0}', () => {
  const { ctx } = makeAset({});
  // Objek literal dibuat di dalam vm context punya Object.prototype dari
  // realm beda -> assert.deepEqual/deepStrictEqual gagal walau isi sama
  // (sudah didokumentasikan di catatan kerja piutang-utang.js). Assert per-field.
  const r = ctx.TimelineW.avgSurplus();
  assert.equal(r.surplus, 0);
  assert.equal(r.months, 0);
});

test('TimelineW.avgSurplus — Pensiun ada -> delegasi ke Pensiun.avgSurplus()', () => {
  const { ctx } = makeAset({}, { Pensiun: { avgSurplus: () => ({ surplus: 500000, months: 3 }) } });
  const r = ctx.TimelineW.avgSurplus();
  assert.equal(r.surplus, 500000);
  assert.equal(r.months, 3);
});

test('TimelineW.goals — proyek renovasi dgn sisa>0 & target non-danaDarurat dgn remaining>0 masuk daftar', () => {
  const D = {
    renovProjects: [{ id: 'r1', name: 'Renov Dapur' }],
    targets: [
      { id: 't1', name: 'Motor Baru', amount: 20000000, saved: 5000000, emoji: '🏍️' },
      { id: 't2', name: 'Dana Darurat', isDanaDarurat: true, amount: 10000000, saved: 0 },
      { id: 't3', name: 'Lunas', amount: 1000000, saved: 1000000 }, // remaining 0, tidak masuk
    ],
  };
  const { ctx } = makeAset(D, { Renov: { totals: () => ({ sisa: 3000000 }) } });
  const goals = ctx.TimelineW.goals();
  assert.equal(goals.length, 2);
  assert.ok(goals.some((g) => g.key === 'renov-r1' && g.remaining === 3000000));
  assert.ok(goals.some((g) => g.key === 'target-t1' && g.remaining === 15000000));
  assert.ok(!goals.some((g) => g.key === 'target-t2')); // dana darurat dikecualikan
  assert.ok(!goals.some((g) => g.key === 'target-t3')); // sudah lunas
});

test('TimelineW.goals — proyek renov sisa 0 tidak masuk daftar', () => {
  const D = { renovProjects: [{ id: 'r1' }], targets: [] };
  const { ctx } = makeAset(D, { Renov: { totals: () => ({ sisa: 0 }) } });
  assert.equal(ctx.TimelineW.goals().length, 0);
});

test('TimelineW.waterfall — surplus 0 -> monthsNeeded/endMonth semua null', () => {
  const D = { targets: [{ id: 't1', name: 'X', amount: 1000000, saved: 0 }] };
  const { ctx } = makeAset(D);
  const { rows, surplus } = ctx.TimelineW.waterfall();
  assert.equal(surplus, 0);
  assert.equal(rows[0].monthsNeeded, null);
  assert.equal(rows[0].endMonth, null);
});

test('TimelineW.waterfall — surplus>0 -> cursor berjalan akumulatif antar goal', () => {
  const D = {
    targets: [
      { id: 't1', name: 'A', amount: 1000000, saved: 0 }, // butuh 2 bulan @500rb/bln
      { id: 't2', name: 'B', amount: 500000, saved: 0 },  // butuh 1 bulan
    ],
  };
  const { ctx } = makeAset(D, { Pensiun: { avgSurplus: () => ({ surplus: 500000, months: 6 }) } });
  const { rows } = ctx.TimelineW.waterfall();
  assert.equal(rows[0].startMonth, 0);
  assert.equal(rows[0].monthsNeeded, 2);
  assert.equal(rows[0].endMonth, 2);
  assert.equal(rows[1].startMonth, 2);
  assert.equal(rows[1].monthsNeeded, 1);
  assert.equal(rows[1].endMonth, 3);
});

test('TimelineW.addMonthsToDate — geser bulan sesuai n, tanggal jadi awal bulan', () => {
  const { ctx } = makeAset({});
  const d0 = ctx.TimelineW.addMonthsToDate(0);
  const d3 = ctx.TimelineW.addMonthsToDate(3);
  assert.equal(d0.getDate(), 1);
  assert.equal(d3.getDate(), 1);
  // beda 3 bulan (mod 12, menangani wrap tahun)
  const diff = (d3.getFullYear() - d0.getFullYear()) * 12 + (d3.getMonth() - d0.getMonth());
  assert.equal(diff, 3);
});

test('TimelineW.render — card tidak ada -> no-op', () => {
  const D = { targets: [] };
  const { ctx, fakeDocument } = makeAset(D);
  fakeDocument.getElementById = () => null;
  assert.doesNotThrow(() => ctx.TimelineW.render());
});

test('TimelineW.render — tidak ada goals & tidak ada data pensiun -> card disembunyikan', () => {
  const D = { targets: [] };
  const { ctx, fakeDocument } = makeAset(D, { domValues: { timelineWCard: { style: {} } } });
  ctx.TimelineW.render();
  assert.equal(fakeDocument.getElementById('timelineWCard').style.display, 'none');
});

test('TimelineW.render — ada goal -> card ditampilkan, berisi label & durasi', () => {
  const D = { targets: [{ id: 't1', name: 'Laptop Baru', amount: 1000000, saved: 0, emoji: '💻' }] };
  const { ctx, fakeDocument } = makeAset(D, {
    domValues: { timelineWCard: { style: {} } },
    Pensiun: { avgSurplus: () => ({ surplus: 500000, months: 3 }) },
  });
  ctx.TimelineW.render();
  const card = fakeDocument.getElementById('timelineWCard');
  assert.equal(card.style.display, 'block');
  assert.match(card.innerHTML, /Linimasa Tujuan Finansial/);
  assert.match(card.innerHTML, /Laptop Baru/);
  assert.ok(makeAset && true); // no-op keep lint happy
});

test('TimelineW.render — surplus<=0 -> tampilkan peringatan belum surplus', () => {
  const D = { targets: [{ id: 't1', name: 'X', amount: 1000000, saved: 0 }] };
  const { ctx, fakeDocument } = makeAset(D, { domValues: { timelineWCard: { style: {} } } });
  ctx.TimelineW.render();
  assert.match(fakeDocument.getElementById('timelineWCard').innerHTML, /belum surplus/);
});

test('TimelineW.render — data Pensiun lengkap (usiaSekarang/usiaPensiun/accId) -> tampilkan blok Pensiun', () => {
  const D = {
    targets: [],
    pensiun: { usiaSekarang: 30, usiaPensiun: 58, accId: 'accP', targetDana: 1000000000 },
  };
  const { ctx, fakeDocument } = makeAset(D, {
    domValues: { timelineWCard: { style: {} } },
    Pensiun: {
      avgSurplus: () => ({ surplus: 500000, months: 3 }),
      sisaBulan: () => 24,
      proyeksi: () => 1200000000,
    },
  });
  ctx.TimelineW.render();
  const html = fakeDocument.getElementById('timelineWCard').innerHTML;
  assert.match(html, /Pensiun \(usia 30→58\)/);
  assert.match(html, /Proyeksi on-track/);
});

test('TimelineW.render — proyeksi Pensiun kurang dari target -> tampilkan peringatan kurang', () => {
  const D = { targets: [], pensiun: { usiaSekarang: 30, usiaPensiun: 58, accId: 'accP', targetDana: 2000000000 } };
  const { ctx, fakeDocument } = makeAset(D, {
    domValues: { timelineWCard: { style: {} } },
    Pensiun: { avgSurplus: () => ({ surplus: 500000, months: 3 }), sisaBulan: () => 24, proyeksi: () => 1000000000 },
  });
  ctx.TimelineW.render();
  assert.match(fakeDocument.getElementById('timelineWCard').innerHTML, /Proyeksi masih kurang/);
});

// ================= PENYUSUTAN =================

test('Penyusutan.hargaPerolehan — pakai modalInvestasi kalau ada, fallback hargaBeli×jumlahUnit, else null', () => {
  const { ctx } = makeAset({});
  assert.equal(ctx.Penyusutan.hargaPerolehan({ modalInvestasi: 50000000, hargaBeli: 999, jumlahUnit: 999 }), 50000000);
  assert.equal(ctx.Penyusutan.hargaPerolehan({ modalInvestasi: null, hargaBeli: 200000, jumlahUnit: 10 }), 2000000);
  assert.equal(ctx.Penyusutan.hargaPerolehan({ modalInvestasi: null, hargaBeli: null, jumlahUnit: null }), null);
  assert.equal(ctx.Penyusutan.hargaPerolehan(null), null);
});

test('Penyusutan.garisLurus — beban rata per bulan, nilai buku turun proporsional bulan berjalan', () => {
  const { ctx } = makeAset({});
  const r = ctx.Penyusutan.garisLurus(120000000, 20000000, 5, '2024-07-11', '2026-07-11');
  assert.equal(r.bulanBerjalan, 24);
  assert.equal(r.bebanPerTahun, 20000000);
  assert.equal(r.akumulasi, 40000000);
  assert.equal(r.nilaiBuku, 80000000);
  assert.equal(r.habisManfaat, false);
});

test('Penyusutan.garisLurus — sudah lewat umur manfaat -> nilai buku mentok di Nilai Residu, habisManfaat true', () => {
  const { ctx } = makeAset({});
  const r = ctx.Penyusutan.garisLurus(120000000, 20000000, 5, '2010-01-01', '2026-07-11');
  assert.equal(r.nilaiBuku, 20000000);
  assert.equal(r.akumulasi, 100000000);
  assert.equal(r.habisManfaat, true);
});

test('Penyusutan.garisLurus — belum ada waktu berjalan (tanggal perolehan = tanggal hitung) -> belum ada penyusutan', () => {
  const { ctx } = makeAset({});
  const r = ctx.Penyusutan.garisLurus(100000000, 0, 4, '2026-07-11', '2026-07-11');
  assert.equal(r.bulanBerjalan, 0);
  assert.equal(r.akumulasi, 0);
  assert.equal(r.nilaiBuku, 100000000);
});

test('Penyusutan.garisLurus — input tidak valid (harga<=0 / umur<=0 / tanpa tanggal) -> nilai buku = harga apa adanya, tidak error', () => {
  const { ctx } = makeAset({});
  assert.deepEqual(plain(ctx.Penyusutan.garisLurus(0, 0, 4, '2020-01-01', '2026-07-11')), { nilaiBuku: 0, akumulasi: 0, bebanPerTahun: 0, bebanPerBulan: 0, bulanBerjalan: 0, habisManfaat: false });
  const r2 = ctx.Penyusutan.garisLurus(100000000, 0, 0, '2020-01-01', '2026-07-11');
  assert.equal(r2.nilaiBuku, 100000000);
  const r3 = ctx.Penyusutan.garisLurus(100000000, 0, 4, '', '2026-07-11');
  assert.equal(r3.nilaiBuku, 100000000);
});

test('Penyusutan.saldoMenurun — tarif diterapkan ke nilai buku (bukan harga awal) tiap tahun penuh', () => {
  const { ctx } = makeAset({});
  const r = ctx.Penyusutan.saldoMenurun(100000000, 20, 0, '2023-07-11', '2026-07-11');
  assert.equal(Math.round(r.nilaiBuku), 51200000);
  assert.equal(Math.round(r.akumulasi), 48800000);
  assert.equal(r.tahunBerjalan, 3);
});

test('Penyusutan.saldoMenurun — nilai buku tidak boleh turun di bawah Nilai Residu (floor)', () => {
  const { ctx } = makeAset({});
  const r = ctx.Penyusutan.saldoMenurun(100000000, 90, 10000000, '2010-01-01', '2026-07-11');
  assert.equal(r.nilaiBuku, 10000000);
  assert.equal(r.akumulasi, 90000000);
});

test('Penyusutan.saldoMenurun — input tidak valid (harga<=0 / tarif<=0 / tanpa tanggal) -> nilai buku = harga apa adanya', () => {
  const { ctx } = makeAset({});
  assert.deepEqual(plain(ctx.Penyusutan.saldoMenurun(0, 20, 0, '2020-01-01', '2026-07-11')), { nilaiBuku: 0, akumulasi: 0, tahunBerjalan: 0 });
  const r2 = ctx.Penyusutan.saldoMenurun(100000000, 0, 0, '2020-01-01', '2026-07-11');
  assert.equal(r2.nilaiBuku, 100000000);
});

test('Penyusutan.manual — pass-through nilai aset saat ini, tanpa formula/akumulasi', () => {
  const { ctx } = makeAset({});
  assert.deepEqual(plain(ctx.Penyusutan.manual(7500000)), { nilaiBuku: 7500000, akumulasi: null, tahunBerjalan: null });
  assert.deepEqual(plain(ctx.Penyusutan.manual(undefined)), { nilaiBuku: 0, akumulasi: null, tahunBerjalan: null });
});

test('Penyusutan.hitung — belum diaktifkan (tidak ada a.penyusutan / aktif:false) -> null', () => {
  const { ctx } = makeAset({});
  assert.equal(ctx.Penyusutan.hitung({ id: '1', nilai: 1000 }), null);
  assert.equal(ctx.Penyusutan.hitung({ id: '1', nilai: 1000, penyusutan: { aktif: false, metode: 'manual' } }), null);
  assert.equal(ctx.Penyusutan.hitung(null), null);
});

test('Penyusutan.hitung — metode manual -> dispatch ke manual(a.nilai)', () => {
  const { ctx } = makeAset({});
  const a = { id: '1', nilai: 7000000, modalInvestasi: 9000000, penyusutan: { aktif: true, metode: 'manual' } };
  const r = ctx.Penyusutan.hitung(a);
  assert.equal(r.metode, 'manual');
  assert.equal(r.nilaiBuku, 7000000);
  assert.equal(r.akumulasi, null);
});

test('Penyusutan.hitung — garisLurus/saldoMenurun tanpa data modal (hargaPerolehan null) -> nilai buku fallback ke a.nilai', () => {
  const { ctx } = makeAset({});
  const a = { id: '1', nilai: 15000000, tanggal: '2024-01-01', penyusutan: { aktif: true, metode: 'garisLurus', umurManfaatTahun: 4, nilaiResidu: 0 } };
  const r = ctx.Penyusutan.hitung(a, '2026-07-11');
  assert.equal(r.hargaPerolehan, null);
  assert.equal(r.nilaiBuku, 15000000);
  assert.equal(r.akumulasi, null);
});

test('Penyusutan.hitung — metode saldoMenurun dgn data modal lengkap -> hasil sama dgn panggil saldoMenurun() langsung', () => {
  const { ctx } = makeAset({});
  const a = { id: '1', nilai: 999, modalInvestasi: 100000000, tanggal: '2023-07-11', penyusutan: { aktif: true, metode: 'saldoMenurun', tarifPersen: 20, nilaiResidu: 0 } };
  const r = ctx.Penyusutan.hitung(a, '2026-07-11');
  const expected = ctx.Penyusutan.saldoMenurun(100000000, 20, 0, '2023-07-11', '2026-07-11');
  assert.equal(r.metode, 'saldoMenurun');
  assert.equal(r.hargaPerolehan, 100000000);
  assert.equal(r.nilaiBuku, expected.nilaiBuku);
  assert.equal(r.akumulasi, expected.akumulasi);
});

test('Penyusutan.hitung — default metode garisLurus kalau metode tidak diisi', () => {
  const { ctx } = makeAset({});
  const a = { id: '1', nilai: 999, modalInvestasi: 120000000, tanggal: '2024-07-11', penyusutan: { aktif: true, umurManfaatTahun: 5, nilaiResidu: 20000000 } };
  const r = ctx.Penyusutan.hitung(a, '2026-07-11');
  assert.equal(r.metode, 'garisLurus');
  assert.equal(r.nilaiBuku, 80000000);
});

test('Penyusutan.toggleAktif — aset tidak ditemukan -> no-op', () => {
  const D = { assets: [{ id: '1' }] };
  const { ctx, calls } = makeAset(D);
  ctx.Penyusutan.toggleAktif('99');
  assert.equal(calls.save, 0);
});

test('Penyusutan.toggleAktif — pertama kali dinyalakan -> isi DEFAULTS & aktif=true, save() terpanggil', () => {
  const D = { assets: [{ id: '1', name: 'Motor' }] };
  const { ctx, calls } = makeAset(D);
  ctx.Penyusutan.toggleAktif('1');
  assert.equal(D.assets[0].penyusutan.aktif, true);
  assert.equal(D.assets[0].penyusutan.metode, 'garisLurus');
  assert.equal(D.assets[0].penyusutan.umurManfaatTahun, 4);
  assert.equal(calls.save, 1);
});

test('Penyusutan.toggleAktif — dipanggil lagi -> toggle jadi nonaktif, parameter lain TIDAK direset', () => {
  const D = { assets: [{ id: '1', penyusutan: { aktif: true, metode: 'saldoMenurun', tarifPersen: 30, nilaiResidu: 1000000 } }] };
  const { ctx, calls } = makeAset(D);
  ctx.Penyusutan.toggleAktif('1');
  assert.equal(D.assets[0].penyusutan.aktif, false);
  assert.equal(D.assets[0].penyusutan.tarifPersen, 30);
  assert.equal(calls.save, 1);
});

test('Penyusutan.updateParam — aset atau penyusutan belum ada -> no-op (tidak bikin objek baru, tidak save)', () => {
  const D = { assets: [{ id: '1' }] };
  const { ctx, calls } = makeAset(D);
  ctx.Penyusutan.updateParam('1', 'metode', 'manual');
  assert.equal(D.assets[0].penyusutan, undefined);
  assert.equal(calls.save, 0);
  ctx.Penyusutan.updateParam('99', 'metode', 'manual');
  assert.equal(calls.save, 0);
});

test('Penyusutan.updateParam — update metode/nilaiResidu(Rp)/umurManfaatTahun/tarifPersen, panggil save()', () => {
  const D = { assets: [{ id: '1', penyusutan: { aktif: true, metode: 'garisLurus', umurManfaatTahun: 4, nilaiResidu: 0, tarifPersen: 25 } }] };
  const { ctx, calls } = makeAset(D);
  ctx.Penyusutan.updateParam('1', 'metode', 'saldoMenurun');
  assert.equal(D.assets[0].penyusutan.metode, 'saldoMenurun');
  ctx.Penyusutan.updateParam('1', 'nilaiResidu', '5.000.000');
  assert.equal(D.assets[0].penyusutan.nilaiResidu, 5000000);
  ctx.Penyusutan.updateParam('1', 'umurManfaatTahun', '8');
  assert.equal(D.assets[0].penyusutan.umurManfaatTahun, 8);
  ctx.Penyusutan.updateParam('1', 'tarifPersen', '12.5');
  assert.equal(D.assets[0].penyusutan.tarifPersen, 12.5);
  assert.equal(calls.save, 4);
});

test('Penyusutan.renderList — kartu/list tidak ada di DOM -> no-op', () => {
  const D = { assets: [{ id: '1' }] };
  const { ctx, fakeDocument } = makeAset(D);
  fakeDocument.getElementById = (id) => (id === 'assetPenyusutanDashboard' ? null : createFakeElement());
  assert.doesNotThrow(() => ctx.Penyusutan.renderList());
});

test('Penyusutan.renderList — tidak ada aset sama sekali -> kartu tetap tampil dengan pesan ajakan', () => {
  const D = { assets: [] };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.Penyusutan.renderList();
  assert.equal(fakeDocument.getElementById('assetPenyusutanDashboard').classList.contains('u-dnone'), false);
  assert.match(fakeDocument.getElementById('assetPenyusutanList').innerHTML, /Belum ada aset tercatat/);
});

test('Penyusutan.renderList — ada aset (belum aktif penyusutan) -> kartu tampil, checkbox tidak dicentang, tanpa hasil hitung', () => {
  const D = { assets: [{ id: '1', name: 'Rumah Kontrakan', jenis: 'Rumah/Bangunan' }] };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.Penyusutan.renderList();
  assert.equal(fakeDocument.getElementById('assetPenyusutanDashboard').classList.contains('u-dnone'), false);
  const html = fakeDocument.getElementById('assetPenyusutanList').innerHTML;
  assert.match(html, /Rumah Kontrakan/);
  assert.doesNotMatch(html, /checked/);
  assert.doesNotMatch(html, /Nilai Buku Sekarang/);
});

test('Penyusutan.renderList — aset aktif garisLurus dgn data modal lengkap -> tampilkan hasil & update total', () => {
  const D = {
    assets: [{ id: '1', name: 'Mobil', jenis: 'Kendaraan', modalInvestasi: 120000000, tanggal: '2024-07-11', penyusutan: { aktif: true, metode: 'garisLurus', umurManfaatTahun: 5, nilaiResidu: 20000000 } }],
  };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.Penyusutan.renderList();
  const html = fakeDocument.getElementById('assetPenyusutanList').innerHTML;
  assert.match(html, /checked/);
  assert.match(html, /Nilai Buku Sekarang: Rp 80.000.000/);
  assert.match(html, /Akumulasi Penyusutan: Rp 40.000.000/);
  assert.equal(fakeDocument.getElementById('assetPenyusutanTotalAkumulasi').textContent, 'Rp 40.000.000');
  assert.equal(fakeDocument.getElementById('assetPenyusutanTotalBuku').textContent, 'Rp 80.000.000');
});

test('Penyusutan.renderList — aset aktif tapi belum ada data modal (Modal Investasi/Harga Beli×Unit) -> tampilkan peringatan, bukan hasil hitung', () => {
  const D = {
    assets: [{ id: '1', name: 'Motor Bekas', jenis: 'Kendaraan', nilai: 8000000, tanggal: '2024-01-01', penyusutan: { aktif: true, metode: 'garisLurus', umurManfaatTahun: 4, nilaiResidu: 0 } }],
  };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.Penyusutan.renderList();
  const html = fakeDocument.getElementById('assetPenyusutanList').innerHTML;
  assert.match(html, /Isi dulu Modal Investasi atau Harga Beli/);
  assert.doesNotMatch(html, /Nilai Buku Sekarang/);
});

test('Penyusutan.renderList — aset aktif metode manual -> tampilkan catatan manual, nilai buku = a.nilai, tidak masuk akumulasi', () => {
  const D = {
    assets: [{ id: '1', name: 'Emas Batangan', jenis: 'Emas/Logam Mulia', nilai: 25000000, penyusutan: { aktif: true, metode: 'manual' } }],
  };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.Penyusutan.renderList();
  const html = fakeDocument.getElementById('assetPenyusutanList').innerHTML;
  assert.match(html, /di-update manual sendiri/);
  assert.match(html, /Nilai Buku Sekarang: Rp 25.000.000/);
  assert.doesNotMatch(html, /Akumulasi Penyusutan/);
  assert.equal(fakeDocument.getElementById('assetPenyusutanTotalAkumulasi').textContent, 'Rp 0');
});

// ================= PAJAK ASET =================

test('PajakAset.settings — belum ada D.pajakAsetSettings -> isi DEFAULTS (NJOPTKP 12jt, tarif 0.5%)', () => {
  const D = {};
  const { ctx } = makeAset(D);
  const s = ctx.PajakAset.settings();
  assert.equal(s.njoptkp, 12000000);
  assert.equal(s.tarifPersen, 0.5);
  assert.equal(D.pajakAsetSettings, s);
});

test('PajakAset.settings — sudah ada D.pajakAsetSettings -> dipakai apa adanya, tidak ditimpa DEFAULTS', () => {
  const D = { pajakAsetSettings: { njoptkp: 20000000, tarifPersen: 0.2 } };
  const { ctx } = makeAset(D);
  const s = ctx.PajakAset.settings();
  assert.equal(s.njoptkp, 20000000);
  assert.equal(s.tarifPersen, 0.2);
});

test('PajakAset.updateSetting — njoptkp pakai parsePzNum, tarifPersen pakai parseDecStr, panggil save() & renderList()', () => {
  const D = { assets: [] };
  const { ctx, calls } = makeAset(D);
  ctx.PajakAset.updateSetting('njoptkp', '15.000.000');
  assert.equal(D.pajakAsetSettings.njoptkp, 15000000);
  ctx.PajakAset.updateSetting('tarifPersen', '0.3');
  assert.equal(D.pajakAsetSettings.tarifPersen, 0.3);
  assert.equal(calls.save, 2);
});

test('PajakAset.updateSetting — field tidak dikenal -> no-op, tidak save()', () => {
  const D = { assets: [] };
  const { ctx, calls } = makeAset(D);
  ctx.PajakAset.updateSetting('lainnya', '123');
  assert.equal('pajakAsetSettings' in D, false);
  assert.equal(calls.save, 0);
});

test('PajakAset.hitungPBB — bukan aset Tanah/Rumah-Bangunan -> null', () => {
  const { ctx } = makeAset({});
  assert.equal(ctx.PajakAset.hitungPBB({ jenis: 'Kendaraan', nilai: 100000000 }), null);
  assert.equal(ctx.PajakAset.hitungPBB(null), null);
});

test('PajakAset.hitungPBB — aset Tanah: (NJOP-NJOPTKP)*tarif, dasar tidak boleh negatif', () => {
  const { ctx } = makeAset({});
  const s = { njoptkp: 12000000, tarifPersen: 0.5 };
  const r = ctx.PajakAset.hitungPBB({ jenis: 'Tanah', nilai: 212000000 }, s);
  assert.equal(r.njop, 212000000);
  assert.equal(r.njoptkp, 12000000);
  assert.equal(r.dasar, 200000000);
  assert.equal(r.terutang, 1000000);
  const r2 = ctx.PajakAset.hitungPBB({ jenis: 'Rumah/Bangunan', nilai: 5000000 }, s);
  assert.equal(r2.dasar, 0);
  assert.equal(r2.terutang, 0);
});

test('PajakAset.zakatableAssets / hitungZakatAset — filter aset zakatable & hitung 2.5%', () => {
  const D = {
    assets: [
      { id: '1', name: 'Emas', jenis: 'Emas/Logam Mulia', nilai: 40000000, zakatable: true },
      { id: '2', name: 'Rumah Tinggal', jenis: 'Rumah/Bangunan', nilai: 500000000, zakatable: false },
      { id: '3', name: 'Deposito', jenis: 'Deposito/Investasi', nilai: 60000000, zakatable: true },
    ],
  };
  const { ctx } = makeAset(D);
  const list = ctx.PajakAset.zakatableAssets();
  assert.equal(list.length, 2);
  const z = ctx.PajakAset.hitungZakatAset();
  assert.equal(z.totalNilai, 100000000);
  assert.equal(z.totalZakat, 2500000);
});

test('PajakAset.renderList — kartu/list tidak ada di DOM -> no-op', () => {
  const D = { assets: [{ id: '1', jenis: 'Tanah', nilai: 100000000 }] };
  const { ctx, fakeDocument } = makeAset(D);
  fakeDocument.getElementById = (id) => (id === 'assetPajakDashboard' ? null : createFakeElement());
  assert.doesNotThrow(() => ctx.PajakAset.renderList());
});

test('PajakAset.renderList — tidak ada aset properti maupun zakatable -> kartu tetap tampil dengan pesan ajakan', () => {
  const D = { assets: [{ id: '1', name: 'Motor', jenis: 'Kendaraan', nilai: 20000000, zakatable: false }] };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.PajakAset.renderList();
  assert.equal(fakeDocument.getElementById('assetPajakDashboard').classList.contains('u-dnone'), false);
  assert.equal(fakeDocument.getElementById('assetPajakTotalPBB').textContent, 'Rp 0');
  assert.match(fakeDocument.getElementById('assetPajakList').innerHTML, /Belum ada aset properti/);
});

test('PajakAset.renderList — ada aset Tanah & aset zakatable -> kartu tampil, breakdown PBB & Zakat, total & ringkasan benar', () => {
  const D = {
    assets: [
      { id: '1', name: 'Sawah Warisan', jenis: 'Tanah', nilai: 212000000 },
      { id: '2', name: 'Emas Simpanan', jenis: 'Emas/Logam Mulia', nilai: 40000000, zakatable: true },
    ],
    pajakAsetSettings: { njoptkp: 12000000, tarifPersen: 0.5 },
  };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.PajakAset.renderList();
  assert.equal(fakeDocument.getElementById('assetPajakDashboard').classList.contains('u-dnone'), false);
  const html = fakeDocument.getElementById('assetPajakList').innerHTML;
  assert.match(html, /Sawah Warisan/);
  assert.match(html, /Rp 1.000.000/); // PBB terutang
  assert.match(html, /Emas Simpanan/);
  assert.match(html, /Rp 1.000.000/); // zakat 2.5% dari 40jt
  assert.equal(fakeDocument.getElementById('assetPajakTotalPBB').textContent, 'Rp 1.000.000');
  assert.equal(fakeDocument.getElementById('assetPajakTotalZakat').textContent, 'Rp 1.000.000');
  assert.equal(fakeDocument.getElementById('pajakAsetNjoptkp').value, 12000000);
  assert.equal(fakeDocument.getElementById('pajakAsetTarif').value, 0.5);
  const ringkasan = fakeDocument.getElementById('assetPajakRingkasan').innerHTML;
  assert.match(ringkasan, /Ringkasan Pajak/);
  assert.match(ringkasan, /Rp 2.000.000/); // total gabungan PBB + Zakat
});

test('PajakAset.renderList — setting NJOPTKP/tarif belum ada -> pakai DEFAULTS otomatis', () => {
  const D = { assets: [{ id: '1', name: 'Tanah Kosong', jenis: 'Tanah', nilai: 100000000 }] };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.PajakAset.renderList();
  assert.equal(fakeDocument.getElementById('pajakAsetNjoptkp').value, 12000000);
  assert.equal(fakeDocument.getElementById('pajakAsetTarif').value, 0.5);
  assert.equal(fakeDocument.getElementById('assetPajakTotalPBB').textContent, 'Rp 440.000');
});

test('Aset.renderList — memicu PajakAset.renderList() (kartu Pajak Aset ikut sinkron tiap save/delete/import)', () => {
  const D = { assets: [{ id: '1', name: 'Tanah Kosong', jenis: 'Tanah', nilai: 100000000 }] };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.Aset.renderList();
  assert.equal(fakeDocument.getElementById('assetPajakDashboard').classList.contains('u-dnone'), false);
});

test('Aset.renderList — list KOSONG (hapus aset terakhir) TETAP memicu PajakAset.renderList() supaya kartu Pajak Aset ikut dibersihkan dari data lama (BUGFIX: sebelumnya cabang empty-state ini melewatkan panggilan PajakAset.renderList(), jadi kartu PBB/Zakat sisa aset yg sudah dihapus tetap nyangkut tampil; sekarang kartu tetap tampil tapi kontennya direset ke pesan ajakan, bukan disembunyikan)', () => {
  const D = { assets: [] };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.Aset.renderList();
  assert.equal(fakeDocument.getElementById('assetPajakDashboard').classList.contains('u-dnone'), false);
  assert.equal(fakeDocument.getElementById('assetPajakTotalPBB').textContent, 'Rp 0');
  assert.match(fakeDocument.getElementById('assetPajakList').innerHTML, /Belum ada aset properti/);
});

// ================= LaporanAset (bagian ke-13) =================
// Cakupan: LaporanAset.{riwayatTransaksi,nilaiAset,penyusutan,ringkasanKekayaan,
// build,renderList}. Pola test sama dgn PajakAset di atas: fungsi murni (tanpa
// DOM) dites terpisah dari renderList() (yg pegang DOM).

test('LaporanAset.riwayatTransaksi — aset tanpa accountId -> tidak masuk akunTertaut, totalTx 0', () => {
  const D = { assets: [{ id: 'a1', name: 'Motor', jenis: 'Kendaraan', nilai: 1 }] };
  const { ctx } = makeAset(D);
  const r = ctx.LaporanAset.riwayatTransaksi();
  assert.equal(r.akunTertaut.length, 0);
  assert.equal(r.totalTx, 0);
  assert.equal(r.recentTx.length, 0);
});

test('LaporanAset.riwayatTransaksi — accountId nunjuk akun yang sudah terhapus -> accountExists false, tidak error', () => {
  const D = { assets: [{ id: 'a1', name: 'Tanah', jenis: 'Tanah', nilai: 1, accountId: 'ghost' }], accounts: [] };
  const { ctx } = makeAset(D);
  const r = ctx.LaporanAset.riwayatTransaksi();
  assert.equal(r.akunTertaut.length, 1);
  assert.equal(r.akunTertaut[0].accountExists, false);
  assert.equal(r.totalTx, 0);
});

test('LaporanAset.riwayatTransaksi — hitung jumlah/total masuk-keluar per akun tertaut & gabungan lintas akun', () => {
  const D = {
    assets: [
      { id: 'a1', name: 'Tanah Kavling', jenis: 'Tanah', nilai: 1, accountId: 'acc1' },
      { id: 'a2', name: 'Deposito', jenis: 'Deposito/Investasi', nilai: 1, accountId: 'acc2' },
    ],
    accounts: [{ id: 'acc1', name: 'Bank BCA' }, { id: 'acc2', name: 'Bank Mandiri' }],
    transactions: [
      { accountId: 'acc1', type: 'income', amount: 500000, date: '2026-07-01' },
      { accountId: 'acc1', type: 'expense', amount: 200000, date: '2026-07-05' },
      { accountId: 'acc2', type: 'income', amount: 1000000, date: '2026-07-10' },
      { accountId: 'acc3', type: 'income', amount: 999999, date: '2026-07-11' }, // akun lain, tidak boleh ikut
    ],
  };
  const { ctx } = makeAset(D);
  const r = ctx.LaporanAset.riwayatTransaksi();
  assert.equal(r.akunTertaut.length, 2);
  const acc1 = r.akunTertaut.find((x) => x.accountId === 'acc1');
  assert.equal(acc1.jumlahTx, 2);
  assert.equal(acc1.totalMasuk, 500000);
  assert.equal(acc1.totalKeluar, 200000);
  assert.equal(r.totalTx, 3); // acc1 (2) + acc2 (1), acc3 dikecualikan
  assert.equal(r.recentTx.length, 3);
  assert.equal(r.recentTx[0].date, '2026-07-10'); // terbaru duluan
});

test('LaporanAset.nilaiAset — total pasar/buku, selisih, & breakdown per kategori', () => {
  const D = {
    assets: [
      { id: 'a1', name: 'Emas', jenis: 'Emas/Logam Mulia', nilai: 1200000, modalInvestasi: 1000000 },
      { id: 'a2', name: 'Motor', jenis: 'Kendaraan', nilai: 20000000 }, // tanpa modal -> buku = pasar
    ],
  };
  const { ctx } = makeAset(D);
  const n = ctx.LaporanAset.nilaiAset();
  assert.equal(n.totalPasar, 21200000);
  assert.equal(n.totalBuku, 21000000);
  assert.equal(n.selisih, 200000);
  assert.equal(n.perKategori['Emas/Logam Mulia'].count, 1);
  assert.equal(n.perKategori['Kendaraan'].nilai, 20000000);
});

test('LaporanAset.nilaiAset — D.assets kosong -> semua total 0, perKategori {}', () => {
  const { ctx } = makeAset({});
  const n = ctx.LaporanAset.nilaiAset();
  assert.equal(n.totalPasar, 0);
  assert.equal(n.totalBuku, 0);
  assert.equal(n.selisih, 0);
  assert.equal(Object.keys(n.perKategori).length, 0);
});

test('LaporanAset.penyusutan — hanya hitung aset yg penyusutannya aktif & datanya lengkap', () => {
  const D = {
    assets: [
      { id: 'a1', name: 'Mobil', jenis: 'Kendaraan', nilai: 200000000, modalInvestasi: 300000000, tanggal: '2023-07-11', penyusutan: { aktif: true, metode: 'garisLurus', umurManfaatTahun: 5, nilaiResidu: 0 } },
      { id: 'a2', name: 'Tanah', jenis: 'Tanah', nilai: 100000000, penyusutan: { aktif: false } }, // tidak aktif
      { id: 'a3', name: 'Kios', jenis: 'Rumah/Bangunan', nilai: 50000000, tanggal: '2020-01-01', penyusutan: { aktif: true, metode: 'garisLurus', umurManfaatTahun: 10 } }, // aktif tapi tanpa data modal
    ],
  };
  const { ctx } = makeAset(D);
  const p = ctx.LaporanAset.penyusutan();
  assert.equal(p.jumlahAktif, 2); // a1 & a3 (yg aktif=true)
  assert.equal(p.belumLengkap, 1); // a3 tanpa modal
  assert.ok(p.totalAkumulasi > 0);
  assert.ok(p.totalBukuSekarang > 0);
});

test('LaporanAset.penyusutan — tidak ada aset yg aktif penyusutan -> semua 0', () => {
  const D = { assets: [{ id: 'a1', name: 'Tanah', jenis: 'Tanah', nilai: 1 }] };
  const { ctx } = makeAset(D);
  const p = ctx.LaporanAset.penyusutan();
  assert.equal(p.jumlahAktif, 0);
  assert.equal(p.totalAkumulasi, 0);
  assert.equal(p.totalBukuSekarang, 0);
});

test('LaporanAset.ringkasanKekayaan — total nilai, kategori terbesar, & rekap zakatable dari PajakAset', () => {
  const D = {
    assets: [
      { id: 'a1', name: 'Sawah', jenis: 'Tanah', nilai: 300000000 },
      { id: 'a2', name: 'Emas', jenis: 'Emas/Logam Mulia', nilai: 40000000, zakatable: true },
    ],
  };
  const { ctx } = makeAset(D);
  const rk = ctx.LaporanAset.ringkasanKekayaan();
  assert.equal(rk.jumlahAset, 2);
  assert.equal(rk.jumlahKategori, 2);
  assert.equal(rk.totalNilaiPasar, 340000000);
  assert.equal(rk.kategoriTerbesar.jenis, 'Tanah');
  assert.equal(rk.jumlahZakatable, 1);
  assert.equal(rk.totalZakatable, 40000000);
});

test('LaporanAset.ringkasanKekayaan — D.assets kosong -> kategoriTerbesar null', () => {
  const { ctx } = makeAset({});
  const rk = ctx.LaporanAset.ringkasanKekayaan();
  assert.equal(rk.jumlahAset, 0);
  assert.equal(rk.kategoriTerbesar, null);
});

test('LaporanAset.build — menggabungkan ke-5 bagian sekaligus (tanpa DOM)', () => {
  const D = { assets: [{ id: 'a1', name: 'Tanah', jenis: 'Tanah', nilai: 100000000, zakatable: false }] };
  const { ctx } = makeAset(D);
  const data = ctx.LaporanAset.build();
  assert.equal(data.daftarAset.length, 1);
  assert.equal(data.daftarAset[0].name, 'Tanah');
  assert.ok('riwayatTransaksi' in data);
  assert.ok('nilaiAset' in data);
  assert.ok('penyusutan' in data);
  assert.ok('ringkasanKekayaan' in data);
});

test('LaporanAset.renderList — kartu/elemen tidak ada di DOM -> no-op', () => {
  const D = { assets: [{ id: '1', jenis: 'Tanah', nilai: 1 }] };
  const { ctx, fakeDocument } = makeAset(D);
  fakeDocument.getElementById = (id) => (id === 'laporanAsetCard' ? null : createFakeElement());
  assert.doesNotThrow(() => ctx.LaporanAset.renderList());
});

test('LaporanAset.renderList — D.assets kosong -> kartu tetap tampil dengan pesan ajakan (bukan disembunyikan)', () => {
  const D = { assets: [] };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.LaporanAset.renderList();
  assert.equal(fakeDocument.getElementById('laporanAsetCard').classList.contains('u-dnone'), false);
  assert.match(fakeDocument.getElementById('lapAsetDaftar').innerHTML, /Belum ada aset tercatat/);
});

test('LaporanAset.renderList — ada aset -> kartu tampil & ke-5 bagian terisi', () => {
  const D = {
    assets: [
      { id: 'a1', name: 'Sawah Warisan', jenis: 'Tanah', nilai: 300000000, accountId: 'acc1' },
      { id: 'a2', name: 'Emas Simpanan', jenis: 'Emas/Logam Mulia', nilai: 40000000, zakatable: true },
    ],
    accounts: [{ id: 'acc1', name: 'Bank BCA' }],
    transactions: [{ accountId: 'acc1', type: 'income', amount: 1000000, date: '2026-07-01' }],
  };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.LaporanAset.renderList();
  assert.equal(fakeDocument.getElementById('laporanAsetCard').classList.contains('u-dnone'), false);
  assert.match(fakeDocument.getElementById('lapAsetDaftar').innerHTML, /Sawah Warisan/);
  assert.match(fakeDocument.getElementById('lapAsetRiwayat').innerHTML, /Bank BCA/);
  assert.match(fakeDocument.getElementById('lapAsetRiwayat').innerHTML, /Rp 1.000.000/);
  assert.match(fakeDocument.getElementById('lapAsetNilai').innerHTML, /Rp 340.000.000/);
  assert.match(fakeDocument.getElementById('lapAsetPenyusutan').innerHTML, /Belum ada aset yang mengaktifkan penyusutan/);
  assert.match(fakeDocument.getElementById('lapAsetRingkasan').innerHTML, /2<\/b> aset di <b>2<\/b> kategori/);
  assert.match(fakeDocument.getElementById('lapAsetRingkasan').innerHTML, /1 aset zakatable/);
});

test('Aset.renderList — memicu LaporanAset.renderList() (kartu Laporan Aset ikut sinkron tiap save/delete/import)', () => {
  const D = { assets: [{ id: '1', name: 'Tanah Kosong', jenis: 'Tanah', nilai: 100000000 }] };
  const { ctx, fakeDocument } = makeAset(D);
  ctx.Aset.renderList();
  assert.equal(fakeDocument.getElementById('laporanAsetCard').classList.contains('u-dnone'), false);
});

test('Aset.renderList — D.assets kosong -> LaporanAset.renderList() ikut jalan (kartu tetap tampil dgn pesan ajakan, bukan error)', () => {
  const D = { assets: [] };
  const { ctx, fakeDocument } = makeAset(D);
  assert.doesNotThrow(() => ctx.Aset.renderList());
  assert.equal(fakeDocument.getElementById('laporanAsetCard').classList.contains('u-dnone'), false);
});
