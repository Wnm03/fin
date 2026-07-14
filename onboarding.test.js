'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

// onboarding.js bergantung ke banyak fungsi/variabel global dari file lain (D/save/
// fmtFull/fmtFullSigned/safeSetItem/showMain dari features-helpers-global-security.js,
// hashPin/_sessionRawPin dari keamanan-pin.js, showAlertModal dari modals.js) — semua
// di-stub sendiri di sini (pola sama dgn identitas.test.js utk DEFAULT_CATS), supaya
// test file ini tidak perlu me-load seluruh app cuma demi 2 fungsi kecil ini.
// fmtFull/fmtFullSigned di-stub sederhana (bukan format Rupiah asli) krn yang dites di
// sini logic onboarding.js sendiri (rumus estimasi & alur simpan), bukan fmtFull.
function makeCtx(domInitial = {}) {
  const fakeDocument = createFakeDocument({
    onboard: {},
    ...domInitial,
  });
  const calls = {
    showAlertModal: [],
    safeSetItem: [],
    save: 0,
    showMain: 0,
    hashPinArgs: [],
  };
  const D = {};
  const ctx = loadSource(['onboarding.js'], {
    document: fakeDocument,
    fmtFull: (n) => `FULL(${n})`,
    fmtFullSigned: (n) => `SIGNED(${n})`,
    showAlertModal: (msg, opts) => calls.showAlertModal.push({ msg, opts }),
    D,
    save: () => { calls.save++; },
    safeSetItem: (k, v) => calls.safeSetItem.push([k, v]),
    hashPin: async (pin) => { calls.hashPinArgs.push(pin); return `hashed:${pin}`; },
    showMain: () => { calls.showMain++; },
  });
  return { ctx, fakeDocument, calls, D };
}

test('updateOnboardPreview — box tidak ada di DOM, langsung return tanpa error', () => {
  const { ctx } = makeCtx(); // obPreviewBox sengaja tidak didaftarkan
  assert.doesNotThrow(() => ctx.updateOnboardPreview());
});

test('updateOnboardPreview — hitung estimasi gaji bulanan (26 hari kerja) & sisa setelah kiriman', () => {
  const { ctx, fakeDocument } = makeCtx({
    obPreviewBox: {},
    ob_gaji: { value: '100000' },
    ob_kirim: { value: '500000' },
  });
  ctx.updateOnboardPreview();
  const html = fakeDocument.getElementById('obPreviewBox').innerHTML;
  // estBulanan = 100000*26 = 2600000; estSisaKirim = 2600000-(500000*4)=600000
  assert.equal(html.includes('FULL(2600000)'), true);
  assert.equal(html.includes('SIGNED(600000)'), true);
  assert.equal(html.includes('#22c55e'), true); // sisa positif -> hijau
});

test('updateOnboardPreview — sisa kiriman negatif ditandai warna merah', () => {
  const { ctx, fakeDocument } = makeCtx({
    obPreviewBox: {},
    ob_gaji: { value: '50000' },
    ob_kirim: { value: '1000000' },
  });
  ctx.updateOnboardPreview();
  const html = fakeDocument.getElementById('obPreviewBox').innerHTML;
  // estBulanan=1300000; estSisaKirim=1300000-4000000=-2700000 (negatif)
  assert.equal(html.includes('#ef4444'), true);
  assert.equal(html.includes('SIGNED(-2700000)'), true);
});

test('updateOnboardPreview — input kosong/non-angka dianggap 0 (fallback ||0)', () => {
  const { ctx, fakeDocument } = makeCtx({
    obPreviewBox: {},
    ob_gaji: { value: '' },
    ob_kirim: { value: 'abc' },
  });
  ctx.updateOnboardPreview();
  const html = fakeDocument.getElementById('obPreviewBox').innerHTML;
  assert.equal(html.includes('FULL(0)'), true);
  assert.equal(html.includes('SIGNED(0)'), true);
});

test('finishOnboard — PIN bukan 4 digit ditolak, tidak menyimpan apapun', async () => {
  const { ctx, calls, D } = makeCtx({
    ob_nama: { value: 'Budi' },
    ob_gaji: { value: '80000' },
    ob_kirim: { value: '300000' },
    ob_pin: { value: '12' },
    ob_tema: { value: 'dark' },
  });
  await ctx.finishOnboard();
  assert.equal(calls.showAlertModal.length, 1);
  assert.equal(calls.showAlertModal[0].msg, 'PIN harus 4 digit!');
  assert.equal(calls.showAlertModal[0].opts.title, 'PIN Belum Valid');
  assert.equal(D.profile, undefined); // tidak sampai menyimpan profil
  assert.equal(calls.save, 0);
  assert.equal(calls.showMain, 0);
});

test('finishOnboard — sukses: profil tersimpan, PIN di-hash, flag setup, & showMain dipanggil', async () => {
  const { ctx, calls, D, fakeDocument } = makeCtx({
    ob_nama: { value: 'Sari' },
    ob_gaji: { value: '75000' },
    ob_kirim: { value: '400000' },
    ob_pin: { value: '1234' },
    ob_tema: { value: 'light' },
    onboard: { style: {} },
  });
  await ctx.finishOnboard();
  assert.equal(calls.showAlertModal.length, 0);
  // D.profile lahir di dalam vm context -> beda prototype/realm dgn objek literal host,
  // deepStrictEqual gagal walau isinya sama (sudah didokumentasikan di aset.test.js/
  // fi-calc.test.js) -- bandingkan via JSON.stringify seperti pola di test lain.
  assert.equal(JSON.stringify(D.profile), JSON.stringify({
    nama: 'Sari', gajiPokok: 75000, kiriman: 400000, theme: 'light',
    tanggalLahir: null, statusKawin: false, tanggungan: 0, statusPekerjaan: null,
  }));
  assert.deepEqual(calls.hashPinArgs, ['1234']);
  const pinSaved = calls.safeSetItem.find((c) => c[0] === 'kw_pin');
  assert.equal(pinSaved[1], 'hashed:1234');
  const setupSaved = calls.safeSetItem.find((c) => c[0] === 'kw_setup');
  assert.equal(setupSaved[1], '1');
  assert.equal(calls.save, 1);
  assert.equal(calls.showMain, 1);
  assert.equal(fakeDocument.getElementById('onboard').style.display, 'none');
  assert.equal(ctx._sessionRawPin, '1234'); // di-assign global (bukan let lokal), pola sama spt curMonth dkk
});

test('finishOnboard — nama/gaji/kiriman kosong pakai default (W / 65000 / 500000)', async () => {
  const { ctx, D } = makeCtx({
    ob_nama: { value: '' },
    ob_gaji: { value: '' },
    ob_kirim: { value: '' },
    ob_pin: { value: '5555' },
    ob_tema: { value: 'dark' },
  });
  await ctx.finishOnboard();
  assert.equal(D.profile.nama, 'W');
  assert.equal(D.profile.gajiPokok, 65000);
  assert.equal(D.profile.kiriman, 500000);
});
