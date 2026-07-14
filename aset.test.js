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
// totalValue}, PORTFOLIO_LABELS, TimelineW.{avgSurplus,goals,waterfall,
// addMonthsToDate,render}.
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
function fmt(n) { n = Math.abs(n || 0); return 'Rp ' + n; }
function fmtFull(n) { return 'Rp ' + Number(Math.abs(n || 0)).toLocaleString('id-ID'); }

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
    aaResult: {}, aaDana: { value: '' },
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
  const ctx = loadSource(['aset.js'], {
    D,
    document: fakeDocument,
    escapeHtml: (s) => String(s == null ? '' : s),
    parsePzNum: simpleParsePzNum,
    parseDecStr: simpleParseDecStr,
    calcPreviewValue: (s) => { const n = simpleParseDecStr(s); return n == null ? 0 : n; },
    fmt, fmtFull,
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
  }, ['ALOKASI_PRESETS', 'AlokasiAset', 'Aset', 'PORTFOLIO_LABELS', 'TimelineW']);
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
  const ctx = loadSource(['aset.js'], {
    D,
    document: fakeDocument,
    escapeHtml: (s) => String(s == null ? '' : s),
    sameId: (a, b) => String(a) === String(b),
    uid: opts.uid || (() => 'uid-' + (++makeAsetIO._c)),
    todayStr: () => '2026-07-11',
    fmt,
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
