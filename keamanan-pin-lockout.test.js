'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { loadSource } = require('../helpers/loadSource');
const { createFakeDocument } = require('../helpers/fakeDom');
const { makeFakeTimer } = require('../helpers/fakeTimer');

// Cakupan file ini: layar PIN interaktif & lockout percobaan salah —
// showPinScreen, _pinLockState, _pinLockRemainingMs, _formatLockDuration,
// updatePinLockUI, pinPress, pinBack, updatePinDots, checkPin. Ini bagian
// yang SENGAJA belum dicakup di keamanan-pin.test.js (lihat komentar di
// bagian atas file itu) — disebut berulang kali sbg saran "(BERAT)" di
// catatan kerja CLAUDE.md (butuh fake setInterval/Date.now yg bisa
// dimaju-mundurkan, lihat tests/helpers/fakeTimer.js) sejak beberapa sesi
// lalu, belum pernah ditulis sampai sesi ini.
//
// PIN_MAX_ATTEMPTS=5, PIN_LOCK_DURATIONS_SEC=[30,60,120,300,600] (30d, 1m,
// 2m, 5m, 10m; stage berikutnya tetap di durasi terakhir) — konstanta ini
// TIDAK diexpose lewat "expose" krn dites via observasi efek (localStorage/
// toast), bukan dibaca langsung.

function makeFakeLocalStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    _dump: () => Object.fromEntries(store),
  };
}

function makeCtx(opts = {}) {
  const fakeTimer = opts.fakeTimer || makeFakeTimer(opts.now || 0);
  const fakeLocalStorage = opts.localStorage || makeFakeLocalStorage(opts.storageInitial);
  const fakeDocument = createFakeDocument({
    onboard: { style: {} },
    pinScreen: { classList: ['u-dnone'], style: {} },
    pinScreenTitle: {},
    pinLockMsg: {},
    pinPad: { style: {} },
    pd0: {}, pd1: {}, pd2: {}, pd3: {},
    ...opts.dom,
  });
  const calls = { showMain: 0, toast: [], setTimeoutFns: [] };
  const D = opts.D || { profile: {} };
  const ctx = loadSource(['modules/shared/keamanan-pin.js'], {
    D,
    document: fakeDocument,
    localStorage: fakeLocalStorage,
    crypto: globalThis.crypto,
    TextEncoder,
    TextDecoder,
    atob,
    btoa,
    Date: fakeTimer.Date,
    setInterval: fakeTimer.setInterval,
    clearInterval: fakeTimer.clearInterval,
    // pinPress menjadwalkan checkPin lewat setTimeout(checkPin,120) --
    // ditangkap (BUKAN dijalankan otomatis) supaya test bisa memicu manual
    // & memverifikasi delay-nya (120ms), pola sama dgn override setTimeout
    // di keamanan-pin.test.js (makeKeamananPin) utk kasus lain.
    setTimeout: opts.setTimeout || ((fn, ms) => { calls.setTimeoutFns.push({ fn, ms }); return 0; }),
    clearTimeout: () => {},
    save: () => {},
    toast: (msg, dur) => calls.toast.push({ msg, dur }),
    showMain: () => { calls.showMain++; },
    showAlertModal: () => {},
    showPinPromptModal: async () => null,
    pinBuffer: '',
  }, ['API_KEY_ENC_STORAGE_KEY']);
  function getSessionPin() {
    return vm.runInContext('_sessionRawPin', ctx);
  }
  return { ctx, fakeDocument, fakeLocalStorage, fakeTimer, calls, D, getSessionPin };
}

// ================= _pinLockState =================

test('_pinLockState — belum ada apa pun di localStorage -> default fails/until/stage semua 0', () => {
  const { ctx } = makeCtx();
  assert.equal(JSON.stringify(ctx._pinLockState()), JSON.stringify({ fails: 0, until: 0, stage: 0 }));
});

test('_pinLockState — parse nilai tersimpan jadi integer', () => {
  const { ctx } = makeCtx({
    storageInitial: { kw_pin_fails: '3', kw_pin_lock_until: '5000', kw_pin_lock_stage: '2' },
  });
  assert.equal(JSON.stringify(ctx._pinLockState()), JSON.stringify({ fails: 3, until: 5000, stage: 2 }));
});

test('_pinLockState — nilai rusak/bukan angka -> fallback ke 0 (bukan NaN)', () => {
  const { ctx } = makeCtx({
    storageInitial: { kw_pin_fails: 'abc', kw_pin_lock_until: '', kw_pin_lock_stage: 'xyz' },
  });
  assert.equal(JSON.stringify(ctx._pinLockState()), JSON.stringify({ fails: 0, until: 0, stage: 0 }));
});

// ================= _pinLockRemainingMs =================

test('_pinLockRemainingMs — tidak ada lock -> 0', () => {
  const { ctx } = makeCtx({ now: 10000 });
  assert.equal(ctx._pinLockRemainingMs(), 0);
});

test('_pinLockRemainingMs — until sudah lewat (di masa lalu) -> 0 (bukan negatif)', () => {
  const { ctx } = makeCtx({ now: 10000, storageInitial: { kw_pin_lock_until: '5000' } });
  assert.equal(ctx._pinLockRemainingMs(), 0);
});

test('_pinLockRemainingMs — until di masa depan -> selisih persis', () => {
  const { ctx } = makeCtx({ now: 10000, storageInitial: { kw_pin_lock_until: '13000' } });
  assert.equal(ctx._pinLockRemainingMs(), 3000);
});

// ================= _formatLockDuration =================

test('_formatLockDuration — di bawah 1 menit -> "N detik" saja', () => {
  const { ctx } = makeCtx();
  assert.equal(ctx._formatLockDuration(45000), '45 detik');
});

test('_formatLockDuration — tepat kelipatan menit -> "N menit 0 detik"', () => {
  const { ctx } = makeCtx();
  assert.equal(ctx._formatLockDuration(60000), '1 menit 0 detik');
});

test('_formatLockDuration — menit + sisa detik', () => {
  const { ctx } = makeCtx();
  assert.equal(ctx._formatLockDuration(65000), '1 menit 5 detik');
});

test('_formatLockDuration — pembulatan ke atas (ceil), bukan lantai', () => {
  const { ctx } = makeCtx();
  // 1500ms -> ceil(1.5)=2 detik, bukan 1
  assert.equal(ctx._formatLockDuration(1500), '2 detik');
});

// ================= updatePinLockUI =================

test('updatePinLockUI — tidak lock -> pesan dikosongkan, keypad direset (bukan dikunci)', () => {
  const { ctx, fakeDocument } = makeCtx({ now: 10000 });
  fakeDocument.getElementById('pinLockMsg').textContent = 'sisa pesan lama';
  fakeDocument.getElementById('pinPad').style = { opacity: '0.35', pointerEvents: 'none' };
  ctx.updatePinLockUI();
  assert.equal(fakeDocument.getElementById('pinLockMsg').textContent, '');
  assert.equal(fakeDocument.getElementById('pinPad').style.opacity, '');
  assert.equal(fakeDocument.getElementById('pinPad').style.pointerEvents, '');
});

test('updatePinLockUI — sedang lock -> keypad dikunci (opacity/pointerEvents) & pesan countdown langsung tampil (tanpa nunggu interval)', () => {
  const { ctx, fakeDocument } = makeCtx({ now: 10000, storageInitial: { kw_pin_lock_until: '13000' } });
  ctx.updatePinLockUI();
  assert.equal(fakeDocument.getElementById('pinPad').style.opacity, '0.35');
  assert.equal(fakeDocument.getElementById('pinPad').style.pointerEvents, 'none');
  assert.match(fakeDocument.getElementById('pinLockMsg').textContent, /Terlalu banyak PIN salah/);
  assert.match(fakeDocument.getElementById('pinLockMsg').textContent, /3 detik/);
});

test('updatePinLockUI — setelah waktu habis (interval jalan lagi), otomatis unlock: hapus kw_pin_lock_until & reset UI', () => {
  const { ctx, fakeDocument, fakeLocalStorage, fakeTimer } = makeCtx({
    now: 10000,
    storageInitial: { kw_pin_lock_until: '13000' },
  });
  ctx.updatePinLockUI();
  assert.equal(fakeTimer.activeIntervalCount(), 1); // interval countdown terpasang
  fakeTimer.advance(3500); // lewat dari until (13000)
  fakeTimer.fireAll();
  assert.equal(fakeLocalStorage.getItem('kw_pin_lock_until'), null);
  assert.equal(fakeDocument.getElementById('pinLockMsg').textContent, '');
  assert.equal(fakeDocument.getElementById('pinPad').style.opacity, '');
  assert.equal(fakeTimer.activeIntervalCount(), 0); // interval ikut dibersihkan (via clearInterval saat updatePinLockUI dipanggil ulang)
});

test('updatePinLockUI — dipanggil dua kali saat lock aktif TIDAK menumpuk interval (interval lama dibersihkan dulu)', () => {
  const { ctx, fakeTimer } = makeCtx({ now: 10000, storageInitial: { kw_pin_lock_until: '13000' } });
  ctx.updatePinLockUI();
  ctx.updatePinLockUI();
  assert.equal(fakeTimer.activeIntervalCount(), 1);
});

// ================= showPinScreen =================

test('showPinScreen — sembunyikan onboard, tampilkan layar PIN, reset buffer, judul pakai nama profil', () => {
  const { ctx, fakeDocument, D } = makeCtx({ D: { profile: { nama: 'Sari' } } });
  ctx.pinBuffer = '12';
  ctx.showPinScreen();
  assert.equal(fakeDocument.getElementById('onboard').style.display, 'none');
  assert.equal(fakeDocument.getElementById('pinScreen').classList.contains('u-dnone'), false);
  assert.equal(fakeDocument.getElementById('pinScreen').style.display, 'flex');
  assert.equal(ctx.pinBuffer, '');
  assert.equal(fakeDocument.getElementById('pinScreenTitle').textContent, '🏠 Keluarga Sari');
});

test('showPinScreen — nama profil kosong -> fallback judul "W"', () => {
  const { ctx, fakeDocument } = makeCtx({ D: { profile: {} } });
  ctx.showPinScreen();
  assert.equal(fakeDocument.getElementById('pinScreenTitle').textContent, '🏠 Keluarga W');
});

test('showPinScreen — elemen judul tidak ada di DOM -> tidak error (guard if(t))', () => {
  const { ctx } = makeCtx({ dom: { pinScreenTitle: undefined } });
  // pinScreenTitle tetap "ada" krn createFakeDocument auto-ensure elemen kalau diakses;
  // guard if(t) di kode aslinya cuma relevan kalau getElementById betulan null -- tidak
  // bisa direplikasi lewat fakeDom ini (selalu return elemen). Cukup pastikan tidak throw.
  assert.doesNotThrow(() => ctx.showPinScreen());
});

// ================= pinPress / pinBack / updatePinDots =================

test('pinPress — sedang lock -> tidak menambah digit sama sekali', () => {
  const { ctx } = makeCtx({ now: 10000, storageInitial: { kw_pin_lock_until: '13000' } });
  ctx.pinBuffer = '';
  ctx.pinPress('5');
  assert.equal(ctx.pinBuffer, '');
});

test('pinPress — tidak lock -> digit ditambahkan & dot terisi sesuai panjang buffer', () => {
  const { ctx, fakeDocument } = makeCtx();
  ctx.pinBuffer = '';
  ctx.pinPress('1');
  assert.equal(ctx.pinBuffer, '1');
  assert.equal(fakeDocument.getElementById('pd0').classList.contains('filled'), true);
  assert.equal(fakeDocument.getElementById('pd1').classList.contains('filled'), false);
  ctx.pinPress('2');
  assert.equal(ctx.pinBuffer, '12');
  assert.equal(fakeDocument.getElementById('pd1').classList.contains('filled'), true);
  assert.equal(fakeDocument.getElementById('pd2').classList.contains('filled'), false);
});

test('pinPress — sudah 4 digit -> digit ke-5 diabaikan (guard length>=4)', () => {
  const { ctx } = makeCtx();
  ctx.pinBuffer = '1234';
  ctx.pinPress('9');
  assert.equal(ctx.pinBuffer, '1234');
});

test('pinPress — begitu genap 4 digit -> menjadwalkan checkPin lewat setTimeout 120ms (belum langsung jalan)', () => {
  const { ctx, calls } = makeCtx();
  ctx.pinBuffer = '123';
  ctx.pinPress('4');
  assert.equal(ctx.pinBuffer, '1234');
  assert.equal(calls.setTimeoutFns.length, 1);
  assert.equal(calls.setTimeoutFns[0].ms, 120);
  assert.equal(calls.setTimeoutFns[0].fn, ctx.checkPin);
});

test('pinPress — kurang dari 4 digit -> TIDAK menjadwalkan checkPin', () => {
  const { ctx, calls } = makeCtx();
  ctx.pinBuffer = '';
  ctx.pinPress('1');
  ctx.pinPress('2');
  assert.equal(calls.setTimeoutFns.length, 0);
});

test('pinBack — sedang lock -> tidak menghapus apa pun', () => {
  const { ctx } = makeCtx({ now: 10000, storageInitial: { kw_pin_lock_until: '13000' } });
  ctx.pinBuffer = '123';
  ctx.pinBack();
  assert.equal(ctx.pinBuffer, '123');
});

test('pinBack — tidak lock -> hapus digit terakhir & dot ikut update', () => {
  const { ctx, fakeDocument } = makeCtx();
  ctx.pinBuffer = '123';
  ctx.pinBack();
  assert.equal(ctx.pinBuffer, '12');
  assert.equal(fakeDocument.getElementById('pd2').classList.contains('filled'), false);
  assert.equal(fakeDocument.getElementById('pd1').classList.contains('filled'), true);
});

test('pinBack — buffer sudah kosong -> tetap kosong, tidak error', () => {
  const { ctx } = makeCtx();
  ctx.pinBuffer = '';
  assert.doesNotThrow(() => ctx.pinBack());
  assert.equal(ctx.pinBuffer, '');
});

test('updatePinDots — dot terisi PERSIS sepanjang buffer, sisanya kosong (bukan semua-atau-tidak)', () => {
  const { ctx, fakeDocument } = makeCtx();
  ctx.pinBuffer = '12';
  ctx.updatePinDots();
  assert.equal(fakeDocument.getElementById('pd0').classList.contains('filled'), true);
  assert.equal(fakeDocument.getElementById('pd1').classList.contains('filled'), true);
  assert.equal(fakeDocument.getElementById('pd2').classList.contains('filled'), false);
  assert.equal(fakeDocument.getElementById('pd3').classList.contains('filled'), false);
});

// ================= checkPin =================

async function setStoredPin(ctx, fakeLocalStorage, pin) {
  fakeLocalStorage.setItem('kw_pin', await ctx.hashPin(pin));
}

test('checkPin — sedang lock -> buffer langsung dikosongkan, TIDAK ada pengecekan hash/toast sama sekali', async () => {
  const { ctx, fakeLocalStorage, calls } = makeCtx({ now: 10000, storageInitial: { kw_pin_lock_until: '13000' } });
  await setStoredPin(ctx, fakeLocalStorage, '1234');
  ctx.pinBuffer = '1234'; // PIN BENAR, tapi tetap harus ditolak krn masih lock
  await ctx.checkPin();
  assert.equal(ctx.pinBuffer, '');
  assert.equal(calls.toast.length, 0);
  assert.equal(calls.showMain, 0);
});

test('checkPin — PIN benar -> sesi PIN terisi, layar PIN disembunyikan, showMain dipanggil, counter lock direset', async () => {
  const { ctx, fakeDocument, fakeLocalStorage, calls, getSessionPin } = makeCtx({
    storageInitial: { kw_pin_fails: '2' },
  });
  await setStoredPin(ctx, fakeLocalStorage, '1234');
  ctx.pinBuffer = '1234';
  await ctx.checkPin();
  assert.equal(getSessionPin(), '1234');
  assert.equal(fakeDocument.getElementById('pinScreen').style.display, 'none');
  assert.equal(calls.showMain, 1);
  assert.equal(fakeLocalStorage.getItem('kw_pin_fails'), null);
  assert.equal(fakeLocalStorage.getItem('kw_pin_lock_until'), null);
  assert.equal(fakeLocalStorage.getItem('kw_pin_lock_stage'), null);
});

test('checkPin — PIN salah, masih di bawah batas -> buffer dikosongkan, fails bertambah 1, toast sisa percobaan (BELUM lock)', async () => {
  const { ctx, fakeLocalStorage, calls } = makeCtx();
  await setStoredPin(ctx, fakeLocalStorage, '1234');
  ctx.pinBuffer = '0000';
  await ctx.checkPin();
  assert.equal(ctx.pinBuffer, '');
  assert.equal(fakeLocalStorage.getItem('kw_pin_fails'), '1');
  assert.equal(fakeLocalStorage.getItem('kw_pin_lock_until'), null);
  assert.equal(calls.toast.length, 1);
  assert.match(calls.toast[0].msg, /PIN salah \(1\/5 sebelum terkunci sementara\)/);
});

test('checkPin — PIN salah ke-5 kalinya (mencapai PIN_MAX_ATTEMPTS) -> stage 1, lock 30 detik, fails direset ke 0, toast pesan lock, keypad ikut terkunci', async () => {
  const { ctx, fakeDocument, fakeLocalStorage, calls } = makeCtx({
    now: 100000,
    storageInitial: { kw_pin_fails: '4' }, // sudah 4x salah sebelumnya
  });
  await setStoredPin(ctx, fakeLocalStorage, '1234');
  ctx.pinBuffer = '0000';
  await ctx.checkPin();
  assert.equal(fakeLocalStorage.getItem('kw_pin_fails'), '0');
  assert.equal(fakeLocalStorage.getItem('kw_pin_lock_stage'), '1');
  assert.equal(fakeLocalStorage.getItem('kw_pin_lock_until'), String(100000 + 30 * 1000));
  assert.equal(calls.toast.length, 1);
  assert.match(calls.toast[0].msg, /5x PIN salah/);
  assert.match(calls.toast[0].msg, /30 detik/);
  // updatePinLockUI ikut terpanggil di dalam checkPin -> keypad langsung terlihat terkunci:
  assert.equal(fakeDocument.getElementById('pinPad').style.opacity, '0.35');
});

test('checkPin — lock berulang (stage naik) -> stage 2 pakai durasi 60 detik, dst mengikuti PIN_LOCK_DURATIONS_SEC', async () => {
  const { ctx, fakeLocalStorage, fakeTimer } = makeCtx({
    now: 0,
    storageInitial: { kw_pin_fails: '4', kw_pin_lock_stage: '1' }, // sudah pernah kena lock stage 1 sebelumnya
  });
  await setStoredPin(ctx, fakeLocalStorage, '1234');
  ctx.pinBuffer = '0000';
  await ctx.checkPin();
  assert.equal(fakeLocalStorage.getItem('kw_pin_lock_stage'), '2');
  assert.equal(fakeLocalStorage.getItem('kw_pin_lock_until'), String(0 + 60 * 1000)); // durasi stage ke-2 = 60d
});

test('checkPin — stage sudah di durasi terakhir (5) -> stage berikutnya TETAP di durasi terakhir (600 detik), tidak index out-of-range', async () => {
  const { ctx, fakeLocalStorage } = makeCtx({
    now: 0,
    storageInitial: { kw_pin_fails: '4', kw_pin_lock_stage: '5' },
  });
  await setStoredPin(ctx, fakeLocalStorage, '1234');
  ctx.pinBuffer = '0000';
  await ctx.checkPin();
  assert.equal(fakeLocalStorage.getItem('kw_pin_lock_stage'), '6');
  assert.equal(fakeLocalStorage.getItem('kw_pin_lock_until'), String(0 + 600 * 1000)); // tetap durasi terakhir (index diclamp)
});

// ================= Alur end-to-end (integrasi ringan) =================

test('end-to-end — pinPress 4 digit salah berturut-turut sampai lock, lalu waktu habis -> keypad kebuka otomatis & pinPress normal lagi', async () => {
  const { ctx, fakeDocument, fakeLocalStorage, fakeTimer } = makeCtx({ now: 0 });
  await setStoredPin(ctx, fakeLocalStorage, '1234');

  async function salahSekali() {
    ctx.pinBuffer = '';
    for (const d of ['0', '0', '0', '0']) ctx.pinPress(d);
    // pinPress ke-4 menjadwalkan checkPin via setTimeout tertangkap manual -- jalankan sekarang:
    await ctx.checkPin();
  }
  for (let i = 0; i < 5; i++) await salahSekali();

  assert.equal(fakeLocalStorage.getItem('kw_pin_lock_stage'), '1');
  assert.equal(fakeDocument.getElementById('pinPad').style.pointerEvents, 'none');

  // Selama lock, pinPress tidak berefek sama sekali:
  ctx.pinBuffer = '';
  ctx.pinPress('1');
  assert.equal(ctx.pinBuffer, '');

  // Majukan waktu lewat dari durasi lock (30 detik) & jalankan interval countdown:
  fakeTimer.advance(31000);
  fakeTimer.fireAll();
  assert.equal(fakeLocalStorage.getItem('kw_pin_lock_until'), null);
  assert.equal(fakeDocument.getElementById('pinPad').style.pointerEvents, '');

  // Sekarang pinPress normal lagi & PIN benar bisa masuk:
  ctx.pinBuffer = '';
  for (const d of ['1', '2', '3', '4']) ctx.pinPress(d);
  await ctx.checkPin();
  assert.equal(fakeDocument.getElementById('pinScreen').style.display, 'none');
});
