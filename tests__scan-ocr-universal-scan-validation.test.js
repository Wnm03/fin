'use strict';
/**
 * scan-ocr-universal-scan-validation.test.js — test untuk fitur Batch 19 Tahap 1
 * (Universal OCR Smart Validation), REUSE UniversalScan/detectScreenType()/parse*Screen()
 * dari Sesi 125 (lihat tests/scan-ocr-universal-scan-parse.test.js untuk test parser
 * lamanya, TIDAK diulang di sini):
 *
 *  1. Confidence Score      -> detectScreenTypeWithConfidence(), field `confidence` di
 *                              parseBankScreen/parseWalletScreen/parseBibitScreen/
 *                              parseJagoPocketScreen (item 1)
 *  2. Preview Validation    -> validateUniversalScanItem() (item 2)
 *  3. Parser Registry       -> UNIVERSAL_SCAN_PARSERS / runUniversalScanParser() (item 4)
 *  4. Universal Scan History -> UniversalScanHistory (item 5)
 *
 * Editable Preview (item 3) ada di UniversalScan.updateItemField()/render() -- ini baca/
 * tulis DOM, jadi ranah smoke-test.js / manual QA, sama seperti UniversalScan.scan()/
 * render()/importSelected() yang lama (lihat catatan di scan-ocr-universal-scan-parse.test.js).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const ctx = loadSource(
  ['modules/shared/scan-ocr.js'],
  {
    normalizeOcrNumber(raw) {
      if (!raw) return NaN;
      return parseFloat(String(raw).replace(/\./g, '').replace(',', '.'));
    },
  },
  ['UNIVERSAL_SCAN_PARSERS', 'UniversalScanHistory'],
);

function ocrText(lines) {
  return lines.join('\n');
}

// ---------- item 1: Confidence Score ----------

test('detectScreenTypeWithConfidence — layar bank khas (skor tinggi, tanpa pesaing) -> confidence tinggi', () => {
  const text = ocrText([
    'Wisnu Nur Muhamad',
    'No. Rekening: 9017 9154 1957',
    'Total Saldo',
    'Rp 205.241',
    'Tabungan',
    'Deposito',
  ]);
  const r = ctx.detectScreenTypeWithConfidence(text);
  assert.equal(r.type, 'bank');
  assert.ok(r.confidence >= 0.75, 'confidence harus tinggi: ' + r.confidence);
});

test('detectScreenTypeWithConfidence — teks kosong/tidak dikenali -> type null, confidence 0', () => {
  const r = ctx.detectScreenTypeWithConfidence('halo dunia, ini bukan layar akun');
  assert.equal(r.type, null);
  assert.equal(r.confidence, 0);
});

test('detectScreenTypeWithConfidence — teks ambigu (skor bank & wallet mepet) -> confidence lebih rendah', () => {
  // "rekening" (skor bank lemah +1) + "top up" (skor wallet lemah +1) -> skor mepet
  const text = ocrText(['rekening', 'top up']);
  const r = ctx.detectScreenTypeWithConfidence(text);
  assert.ok(r.confidence <= 0.5, 'confidence harus rendah saat skor mepet: ' + r.confidence);
});

test('detectScreenType — tetap 100% backward compatible (kontrak lama tidak berubah)', () => {
  const text = ocrText(['No. Rekening: 123', 'Total Saldo', 'Rp 1.000']);
  assert.equal(ctx.detectScreenType(text), 'bank');
});

test('parseBankScreen — confidence tinggi saat "Total Saldo" (pola primer) + nama ketemu', () => {
  const text = ocrText(['Wisnu Nur Muhamad', 'No. Rekening: 9017 9154 1957', 'Total Saldo', 'Rp 205.241']);
  const r = ctx.parseBankScreen(text);
  assert.ok(r.confidence >= 0.9, 'confidence: ' + r.confidence);
});

test('parseBankScreen — confidence lebih rendah saat fallback "Saldo" polos', () => {
  const text = ocrText(['No. Rekening: 123', 'Saldo', 'Rp 50.000']);
  const r = ctx.parseBankScreen(text);
  assert.ok(r.confidence < 0.9 && r.confidence > 0, 'confidence: ' + r.confidence);
});

test('parseBankScreen — nominal tidak terbaca -> confidence 0', () => {
  const r = ctx.parseBankScreen('No. Rekening: 123, tidak ada nominal di sini');
  assert.equal(r.nominal, null);
  assert.equal(r.confidence, 0);
});

test('parseWalletScreen — brand kedetek (GoPay) -> confidence tinggi', () => {
  const text = ocrText(['GoPay', 'Rp 154.834', '500 Coins']);
  const r = ctx.parseWalletScreen(text);
  assert.equal(r.nama, 'GoPay');
  assert.ok(r.confidence >= 0.7, 'confidence: ' + r.confidence);
});

test('parseWalletScreen — brand tidak kedetek -> confidence lebih rendah dari yang brand kedetek', () => {
  const withBrand = ctx.parseWalletScreen(ocrText(['GoPay', 'Rp 154.834']));
  const noBrand = ctx.parseWalletScreen(ocrText(['E-Wallet lain', 'Rp 75.000 tersisa']));
  assert.ok(noBrand.confidence < withBrand.confidence);
});

test('parseJagoPocketScreen — tiap item punya field confidence', () => {
  const text = ocrText(['Aset Saya', 'GoPay Tabungan', 'Rp154.834', 'Reksa Dana', 'Rp11.671.521']);
  const items = ctx.parseJagoPocketScreen(text);
  assert.ok(items.length >= 2);
  items.forEach((it) => {
    assert.equal(typeof it.confidence, 'number');
    assert.ok(it.confidence > 0 && it.confidence <= 1);
  });
});

// ---------- item 2: Preview Validation ----------

test('validateUniversalScanItem — item normal (nominal wajar, nama jelas, confidence tinggi) -> valid', () => {
  const r = ctx.validateUniversalScanItem({ nama: 'GoPay', nominal: 154834, confidence: 0.9 });
  assert.equal(r.valid, true);
  // NOTE: pakai .length===0, BUKAN assert.deepEqual(r.issues,[]) -- array hasil sandbox vm
  // beda realm dari Array literal di file test ini, deepEqual antar-realm bisa gagal walau
  // isinya sama-sama kosong (pola sama persis tests/scan-ocr-universal-scan-parse.test.js).
  assert.equal(r.issues.length, 0);
});

test('validateUniversalScanItem — nominal null -> invalid dengan issue "nominal tidak terbaca"', () => {
  const r = ctx.validateUniversalScanItem({ nama: 'Bank X', nominal: null });
  assert.equal(r.valid, false);
  assert.ok(r.issues.some((s) => /nominal tidak terbaca/.test(s)));
});

test('validateUniversalScanItem — nominal negatif -> invalid', () => {
  const r = ctx.validateUniversalScanItem({ nama: 'Bank X', nominal: -1000 });
  assert.equal(r.valid, false);
  assert.ok(r.issues.some((s) => /negatif/.test(s)));
});

test('validateUniversalScanItem — nominal tidak wajar (>100 miliar, kemungkinan salah baca OCR) -> invalid', () => {
  const r = ctx.validateUniversalScanItem({ nama: 'Bank X', nominal: 999999999999 });
  assert.equal(r.valid, false);
  assert.ok(r.issues.some((s) => /tidak wajar/.test(s)));
});

test('validateUniversalScanItem — nama kosong -> invalid', () => {
  const r = ctx.validateUniversalScanItem({ nama: '  ', nominal: 10000 });
  assert.equal(r.valid, false);
  assert.ok(r.issues.some((s) => /nama akun kosong/.test(s)));
});

test('validateUniversalScanItem — nama 1 huruf -> invalid (kemungkinan salah baca)', () => {
  const r = ctx.validateUniversalScanItem({ nama: 'X', nominal: 10000 });
  assert.equal(r.valid, false);
  assert.ok(r.issues.some((s) => /terlalu pendek/.test(s)));
});

test('validateUniversalScanItem — confidence rendah -> invalid dengan peringatan cek manual', () => {
  const r = ctx.validateUniversalScanItem({ nama: 'Bank X', nominal: 10000, confidence: 0.3 });
  assert.equal(r.valid, false);
  assert.ok(r.issues.some((s) => /confidence rendah/.test(s)));
});

// ---------- item 4: Parser Registry ----------

test('UNIVERSAL_SCAN_PARSERS — berisi 4 parser existing yang SAMA (bukan duplikat/ditulis ulang)', () => {
  assert.equal(ctx.UNIVERSAL_SCAN_PARSERS.bank, ctx.parseBankScreen);
  assert.equal(ctx.UNIVERSAL_SCAN_PARSERS.wallet, ctx.parseWalletScreen);
  assert.equal(ctx.UNIVERSAL_SCAN_PARSERS.bibit, ctx.parseBibitScreen);
  assert.equal(ctx.UNIVERSAL_SCAN_PARSERS.jago_pocket, ctx.parseJagoPocketScreen);
});

test('runUniversalScanParser — screenType "bank" dibungkus jadi array 1 item', () => {
  const text = ocrText(['No. Rekening: 123', 'Total Saldo', 'Rp 205.241']);
  const items = ctx.runUniversalScanParser('bank', text);
  assert.equal(items.length, 1);
  assert.equal(items[0].nominal, 205241);
});

test('runUniversalScanParser — screenType "jago_pocket" tetap array (tidak dibungkus dobel)', () => {
  const text = ocrText(['Aset Saya', 'GoPay Tabungan', 'Rp154.834']);
  const items = ctx.runUniversalScanParser('jago_pocket', text);
  assert.ok(Array.isArray(items));
  assert.equal(items[0].nama, 'GoPay Tabungan');
});

test('runUniversalScanParser — screenType null/tidak dikenal -> array kosong (tidak error)', () => {
  assert.equal(ctx.runUniversalScanParser(null, 'apa saja').length, 0);
  assert.equal(ctx.runUniversalScanParser('tipe_asing', 'apa saja').length, 0);
});

test('runUniversalScanParser — parser tunggal yang nominalnya tidak terbaca tetap diteruskan apa adanya (nominal:null), penyaringan tetap tugas UniversalScan.scan()', () => {
  const items = ctx.runUniversalScanParser('bank', 'No. Rekening: 123, tanpa saldo');
  assert.equal(items.length, 1);
  assert.equal(items[0].nominal, null);
});

// ---------- item 5: Universal Scan History ----------

test('UniversalScanHistory.add/list — riwayat scan tersimpan urutan terbaru dulu', () => {
  ctx.UniversalScanHistory.clear();
  ctx.UniversalScanHistory.add({ screenType: 'bank', totalDetected: 1, importedCount: 1, confidence: 0.9 });
  ctx.UniversalScanHistory.add({ screenType: 'wallet', totalDetected: 1, importedCount: 0, confidence: 0.8 });
  const list = ctx.UniversalScanHistory.list();
  assert.equal(list.length, 2);
  assert.equal(list[0].screenType, 'wallet', 'entry terbaru harus di index 0');
  assert.equal(list[1].screenType, 'bank');
});

test('UniversalScanHistory.add — field default aman kalau record minim', () => {
  ctx.UniversalScanHistory.clear();
  const entry = ctx.UniversalScanHistory.add({ screenType: 'bibit' });
  assert.equal(entry.totalDetected, 0);
  assert.equal(entry.importedCount, 0);
  assert.equal(entry.confidence, null);
  assert.equal(typeof entry.ts, 'number');
});

test('UniversalScanHistory.clear — mengosongkan riwayat', () => {
  ctx.UniversalScanHistory.add({ screenType: 'bank' });
  ctx.UniversalScanHistory.clear();
  assert.equal(ctx.UniversalScanHistory.list().length, 0);
});

// ---------- S128: OCR Settings (getOcrMinConfidence/setOcrMinConfidence) ----------

test('getOcrMinConfidence — tanpa D (atau D.profile kosong) -> default 50', () => {
  // ctx sandbox TIDAK di-inject `D` (sengaja, sama seperti test lain di file ini) --
  // getOcrMinConfidence() harus tetap aman/tidak error, balik ke default.
  assert.equal(ctx.getOcrMinConfidence(), 50);
});

test('setOcrMinConfidence/getOcrMinConfidence — reuse pola getter/setter D.profile yang sudah ada (mis. getAIFinanceOverspendThreshold), nilai valid tersimpan & terbaca balik', () => {
  const sandboxD = { profile: {} };
  const ctx2 = loadSource(
    ['modules/shared/scan-ocr.js'],
    {
      D: sandboxD,
      normalizeOcrNumber(raw) {
        if (!raw) return NaN;
        return parseFloat(String(raw).replace(/\./g, '').replace(',', '.'));
      },
    },
    ['UNIVERSAL_SCAN_PARSERS', 'UniversalScanHistory'],
  );
  assert.equal(ctx2.getOcrMinConfidence(), 50, 'default sebelum di-set manapun');
  ctx2.setOcrMinConfidence(70);
  assert.equal(ctx2.getOcrMinConfidence(), 70);
  assert.equal(sandboxD.profile.ocrMinConfidencePct, 70, 'tersimpan di D.profile, BUKAN struktur data baru');
});

test('setOcrMinConfidence — nilai di luar rentang 0-100 atau bukan angka -> fallback ke default 50 (clamped)', () => {
  const sandboxD = { profile: {} };
  const ctx2 = loadSource(
    ['modules/shared/scan-ocr.js'],
    {
      D: sandboxD,
      normalizeOcrNumber(raw) {
        if (!raw) return NaN;
        return parseFloat(String(raw).replace(/\./g, '').replace(',', '.'));
      },
    },
    ['UNIVERSAL_SCAN_PARSERS', 'UniversalScanHistory'],
  );
  assert.equal(ctx2.setOcrMinConfidence(150), 50);
  assert.equal(ctx2.setOcrMinConfidence(-10), 50);
  assert.equal(ctx2.setOcrMinConfidence('abc'), 50);
  assert.equal(ctx2.setOcrMinConfidence(0), 0, '0 valid (ambang paling longgar, semua confidence dianggap cukup)');
  assert.equal(ctx2.setOcrMinConfidence(100), 100, '100 valid (ambang paling ketat)');
});

test('validateUniversalScanItem — parameter minConfidence opsional dipakai kalau disuplai (dari Pengaturan), tanpa mengubah kontrak lama', () => {
  const item = { nama: 'Bank X', nominal: 10000, confidence: 0.6 };
  // Default (0.5) -> 0.6 masih di atas ambang, valid.
  assert.equal(ctx.validateUniversalScanItem(item).valid, true);
  // Ambang diperketat ke 0.8 (mis. user set 80% di Pengaturan) -> 0.6 sekarang di bawah ambang.
  const r = ctx.validateUniversalScanItem(item, 0.8);
  assert.equal(r.valid, false);
  assert.ok(r.issues.some((s) => /confidence rendah/.test(s)));
});

test('UniversalScanHistory — dibatasi maksimal 50 entry (tidak tumbuh tanpa batas)', () => {
  ctx.UniversalScanHistory.clear();
  for (let i = 0; i < 60; i++) ctx.UniversalScanHistory.add({ screenType: 'bank' });
  assert.equal(ctx.UniversalScanHistory.list().length, 50);
});

