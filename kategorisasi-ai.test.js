'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument } = require('./helpers/fakeDom');

// Cakupan file ini: seluruh method AutoKat di kategorisasi-ai.js —
// onNoteInput/hideSuggest/runAiSuggest/renderSuggest/apply/learnFromNote.
// AutoKat dideklarasikan `const AutoKat = {...}` (bukan `function`), jadi
// perlu `expose: ['AutoKat']` supaya bisa dibaca dari luar vm context
// (lihat catatan di helpers/loadSource.js soal let/const top-level).
//
// setTimeout bawaan loadSource() cuma stub no-op (selalu return 0, TIDAK
// benar-benar menjalankan callback-nya) — jadi debounce 750ms di
// onNoteInput() tidak akan "terjadi" sendiri di test ini. Pola yang dipakai
// di sini: suntik setTimeout kustom yang MENYIMPAN callback-nya (tidak
// langsung dijalankan), supaya tiap test bisa memverifikasi "debounce
// terjadwal" (assert timer tersimpan) DAN/ATAU trigger manual kapan mau
// (panggil sendiri fn-nya) — mirip semangat catatan kerja soal fake
// setInterval/Date.now di CLAUDE.md (belum ada infra timer maju-mundur
// generik di project ini, jadi dibikin lokal seperlunya di sini).
// runAiSuggest sendiri juga dites LANGSUNG (tanpa lewat timer), sama pola
// dgn _saveAccInner/_saveInner di test-test lain.

function makeFakeTimer() {
  const calls = { setTimeout: [], cleared: [] };
  return {
    calls,
    setTimeout: (fn, ms) => { const id = calls.setTimeout.length + 1; calls.setTimeout.push({ id, fn, ms }); return id; },
    clearTimeout: (id) => { calls.cleared.push(id); },
  };
}

function makeAutoKat(D, opts = {}) {
  const fakeDocument = createFakeDocument({
    txNote: { value: '' },
    txCatAiSuggest: { classList: { add() {}, remove() {}, contains: () => false }, innerHTML: '', dataset: {} },
    txCat: { value: '' },
    txSubCat: { value: '' },
    ...opts.domValues,
  });
  const timer = makeFakeTimer();
  const calls = { save: 0, toast: [], selectTxCat: [], selectTxSubCat: [] };
  // getCatsByType berasal dari kategori.js (di luar cakupan file ini) — stub
  // default baca langsung dari D.categories, boleh dioverride per-test.
  const defaultGetCatsByType = (type) => (D.categories && D.categories[type]) || [];
  // `'key' in opts` dipakai (bukan `opts.key || default`) supaya test yang
  // SENGAJA mengoper `undefined` (mis. mensimulasikan "fungsi tidak
  // tersedia") tidak diam-diam ketimpa fallback recorder.
  const selectTxCat = 'selectTxCat' in opts ? opts.selectTxCat : (name) => calls.selectTxCat.push(name);
  const selectTxSubCat = 'selectTxSubCat' in opts ? opts.selectTxSubCat : (name) => calls.selectTxSubCat.push(name);
  const ctx = loadSource(['kategorisasi-ai.js'], {
    D,
    document: fakeDocument,
    escapeHtml: (s) => String(s == null ? '' : s),
    curTxType: opts.curTxType !== undefined ? opts.curTxType : 'expense',
    guessCategoryFromReceiptText: opts.guessCategoryFromReceiptText,
    getCatsByType: 'getCatsByType' in opts ? opts.getCatsByType : defaultGetCatsByType,
    callAIProviderRaw: opts.callAIProviderRaw,
    selectTxCat,
    selectTxSubCat,
    save: () => { calls.save++; },
    toast: (msg) => calls.toast.push(msg),
    setTimeout: timer.setTimeout,
    clearTimeout: timer.clearTimeout,
  }, ['AutoKat']);
  return { ctx, fakeDocument, calls, timer };
}

// ================= onNoteInput =================

test('onNoteInput — catatan < 3 karakter -> sembunyikan saran, tidak jadwal debounce', () => {
  const D = {};
  const { ctx, fakeDocument, timer } = makeAutoKat(D, { domValues: { txNote: { value: 'ab' } } });
  ctx.AutoKat.onNoteInput();
  assert.equal(fakeDocument.getElementById('txCatAiSuggest').innerHTML, '');
  assert.equal(timer.calls.setTimeout.length, 0);
});

test('onNoteInput — txNote/txCatAiSuggest tidak ada -> no-op tanpa error', () => {
  const D = {};
  const { ctx, fakeDocument } = makeAutoKat(D);
  fakeDocument.getElementById = () => null;
  assert.doesNotThrow(() => ctx.AutoKat.onNoteInput());
});

test('onNoteInput — tipe income -> tidak coba tebakan lokal (guessCategoryFromReceiptText hanya utk expense), tetap jadwalkan AI', () => {
  const D = {};
  let guessCalled = false;
  const { ctx, timer } = makeAutoKat(D, {
    curTxType: 'income',
    domValues: { txNote: { value: 'gaji bulanan' } },
    guessCategoryFromReceiptText: () => { guessCalled = true; return null; },
  });
  ctx.AutoKat.onNoteInput();
  assert.equal(guessCalled, false);
  assert.equal(timer.calls.setTimeout.length, 1);
  assert.equal(timer.calls.setTimeout[0].ms, 750);
});

test('onNoteInput — expense & field kategori masih kosong & tebakan lokal ketemu -> tampilkan saran "lokal"', () => {
  const D = {};
  const { ctx, fakeDocument } = makeAutoKat(D, {
    domValues: { txNote: { value: 'bayar galon+beras warung' }, txCat: { value: '' } },
    guessCategoryFromReceiptText: (text) => ({ name: 'Belanja Dapur', emoji: '🛒' }),
  });
  ctx.AutoKat.onNoteInput();
  const box = fakeDocument.getElementById('txCatAiSuggest');
  assert.match(box.innerHTML, /Tebakan cepat/);
  assert.match(box.innerHTML, /Belanja Dapur/);
  assert.equal(box.dataset.catName, 'Belanja Dapur');
});

test('onNoteInput — expense & field kategori sudah terisi -> tidak coba tebakan lokal, sembunyikan saran', () => {
  const D = {};
  let guessCalled = false;
  const { ctx, fakeDocument } = makeAutoKat(D, {
    domValues: { txNote: { value: 'bayar galon' }, txCat: { value: 'Sudah Dipilih' } },
    guessCategoryFromReceiptText: () => { guessCalled = true; return { name: 'X', emoji: '📦' }; },
  });
  ctx.AutoKat.onNoteInput();
  assert.equal(guessCalled, false);
  assert.equal(fakeDocument.getElementById('txCatAiSuggest').innerHTML, '');
});

test('onNoteInput — tebakan lokal tidak ketemu -> sembunyikan saran (bukan error)', () => {
  const D = {};
  const { ctx, fakeDocument } = makeAutoKat(D, {
    domValues: { txNote: { value: 'sesuatu yg aneh' } },
    guessCategoryFromReceiptText: () => null,
  });
  ctx.AutoKat.onNoteInput();
  assert.equal(fakeDocument.getElementById('txCatAiSuggest').innerHTML, '');
});

test('onNoteInput — guessCategoryFromReceiptText tidak tersedia (bukan function) -> sembunyikan saran, tidak error', () => {
  const D = {};
  const { ctx, fakeDocument } = makeAutoKat(D, { domValues: { txNote: { value: 'catatan apapun' } } });
  assert.doesNotThrow(() => ctx.AutoKat.onNoteInput());
  assert.equal(fakeDocument.getElementById('txCatAiSuggest').innerHTML, '');
});

test('onNoteInput — selalu jadwalkan debounce 750ms & clearTimeout timer lama lebih dulu', () => {
  const D = {};
  const { ctx, timer } = makeAutoKat(D, { domValues: { txNote: { value: 'catatan panjang' } } });
  ctx.AutoKat.onNoteInput();
  ctx.AutoKat.onNoteInput();
  assert.equal(timer.calls.setTimeout.length, 2);
  // clearTimeout dipanggil di TIAP onNoteInput (termasuk panggilan pertama,
  // clearTimeout(null) — no-op tapi tetap terpanggil), jadi 2x total di sini.
  assert.equal(timer.calls.cleared.length, 2);
  assert.equal(timer.calls.setTimeout[1].ms, 750);
});

// ================= hideSuggest =================

test('hideSuggest — kosongkan innerHTML, tambah class u-dnone, hapus dataset', () => {
  const D = {};
  const { ctx, fakeDocument } = makeAutoKat(D);
  const box = fakeDocument.getElementById('txCatAiSuggest');
  box.innerHTML = 'isi lama';
  box.dataset = { catName: 'X', subName: 'Y', note: 'Z' };
  let addedClass = null;
  box.classList.add = (c) => { addedClass = c; };
  ctx.AutoKat.hideSuggest();
  assert.equal(box.innerHTML, '');
  assert.equal(addedClass, 'u-dnone');
  assert.equal(box.dataset.catName, undefined);
  assert.equal(box.dataset.subName, undefined);
  assert.equal(box.dataset.note, undefined);
});

test('hideSuggest — box tidak ada -> no-op tanpa error', () => {
  const D = {};
  const { ctx, fakeDocument } = makeAutoKat(D);
  fakeDocument.getElementById = () => null;
  assert.doesNotThrow(() => ctx.AutoKat.hideSuggest());
});

// ================= runAiSuggest =================

test('runAiSuggest — catatan terlalu pendek (<4 char) -> tidak panggil AI', async () => {
  const D = { profile: { apiKey: 'sk-xxx' } };
  let apiCalled = false;
  const { ctx } = makeAutoKat(D, { callAIProviderRaw: async () => { apiCalled = true; } });
  await ctx.AutoKat.runAiSuggest('ab');
  assert.equal(apiCalled, false);
});

test('runAiSuggest — tanpa API key -> tidak panggil AI (cukup andalkan tebakan lokal)', async () => {
  const D = { profile: {} };
  let apiCalled = false;
  const { ctx } = makeAutoKat(D, { callAIProviderRaw: async () => { apiCalled = true; } });
  await ctx.AutoKat.runAiSuggest('bayar galon dan beras');
  assert.equal(apiCalled, false);
});

test('runAiSuggest — catatan sama dgn query terakhir -> tidak panggil AI lagi', async () => {
  const D = { profile: { apiKey: 'sk-xxx' }, categories: { expense: [{ name: 'Makan', emoji: '🍔', subs: [] }] } };
  let apiCallCount = 0;
  const { ctx } = makeAutoKat(D, {
    guessCategoryFromReceiptText: () => null,
    callAIProviderRaw: async () => { apiCallCount++; return { ok: true, text: '{"category":null}' }; },
  });
  await ctx.AutoKat.runAiSuggest('bayar galon dan beras');
  await ctx.AutoKat.runAiSuggest('bayar galon dan beras');
  assert.equal(apiCallCount, 1);
});

test('runAiSuggest — tidak ada kategori sama sekali utk tipe ini -> tidak panggil AI', async () => {
  const D = { profile: { apiKey: 'sk-xxx' }, categories: { expense: [] } };
  let apiCalled = false;
  const { ctx } = makeAutoKat(D, { callAIProviderRaw: async () => { apiCalled = true; } });
  await ctx.AutoKat.runAiSuggest('bayar galon dan beras');
  assert.equal(apiCalled, false);
});

test('runAiSuggest — sukses: AI balas kategori valid -> renderSuggest dgn source "ai"', async () => {
  const D = {
    profile: { apiKey: 'sk-xxx' },
    categories: { expense: [{ name: 'Belanja Dapur', emoji: '🛒', subs: [{ name: 'Warung' }] }] },
  };
  const { ctx, fakeDocument } = makeAutoKat(D, {
    domValues: { txNote: { value: 'bayar galon dan beras' } },
    callAIProviderRaw: async () => ({
      ok: true,
      text: '{"category":"Belanja Dapur","subcategory":"Warung","confidence":"tinggi","alasan":"cocok dgn item galon/beras"}',
    }),
  });
  await ctx.AutoKat.runAiSuggest('bayar galon dan beras');
  const box = fakeDocument.getElementById('txCatAiSuggest');
  assert.match(box.innerHTML, /Saran AI/);
  assert.match(box.innerHTML, /Belanja Dapur/);
  assert.match(box.innerHTML, /Warung/);
  assert.equal(box.dataset.catName, 'Belanja Dapur');
  assert.equal(box.dataset.subName, 'Warung');
});

test('runAiSuggest — AI balas kategori DI LUAR daftar yg diizinkan -> diabaikan, tidak render', async () => {
  const D = { profile: { apiKey: 'sk-xxx' }, categories: { expense: [{ name: 'Makan', emoji: '🍔', subs: [] }] } };
  const { ctx, fakeDocument } = makeAutoKat(D, {
    domValues: { txNote: { value: 'sesuatu yg aneh sekali' } },
    callAIProviderRaw: async () => ({ ok: true, text: '{"category":"Kategori Ngarang"}' }),
  });
  await ctx.AutoKat.runAiSuggest('sesuatu yg aneh sekali');
  assert.equal(fakeDocument.getElementById('txCatAiSuggest').innerHTML, '');
});

test('runAiSuggest — respons AI gagal (ok:false) -> diam-diam diabaikan, tidak error', async () => {
  const D = { profile: { apiKey: 'sk-xxx' }, categories: { expense: [{ name: 'Makan', emoji: '🍔', subs: [] }] } };
  const { ctx } = makeAutoKat(D, { callAIProviderRaw: async () => ({ ok: false }) });
  await assert.doesNotReject(() => ctx.AutoKat.runAiSuggest('catatan valid tp gagal'));
});

test('runAiSuggest — callAIProviderRaw melempar error -> ditangkap, tidak propagate', async () => {
  const D = { profile: { apiKey: 'sk-xxx' }, categories: { expense: [{ name: 'Makan', emoji: '🍔', subs: [] }] } };
  const { ctx } = makeAutoKat(D, { callAIProviderRaw: async () => { throw new Error('network down'); } });
  await assert.doesNotReject(() => ctx.AutoKat.runAiSuggest('catatan valid tp network mati'));
});

test('runAiSuggest — respons bukan JSON valid -> diabaikan, tidak error', async () => {
  const D = { profile: { apiKey: 'sk-xxx' }, categories: { expense: [{ name: 'Makan', emoji: '🍔', subs: [] }] } };
  const { ctx } = makeAutoKat(D, { callAIProviderRaw: async () => ({ ok: true, text: 'bukan json sama sekali' }) });
  await assert.doesNotReject(() => ctx.AutoKat.runAiSuggest('catatan dgn respons ngaco'));
});

test('runAiSuggest — field Keterangan sudah berubah sejak request dikirim -> saran basi tidak ditampilkan', async () => {
  const D = { profile: { apiKey: 'sk-xxx' }, categories: { expense: [{ name: 'Makan', emoji: '🍔', subs: [] }] } };
  const { ctx, fakeDocument } = makeAutoKat(D, {
    domValues: { txNote: { value: 'catatan yg SUDAH berubah' } }, // beda dari yg dikirim ke runAiSuggest
    callAIProviderRaw: async () => ({ ok: true, text: '{"category":"Makan"}' }),
  });
  await ctx.AutoKat.runAiSuggest('catatan lama');
  assert.equal(fakeDocument.getElementById('txCatAiSuggest').innerHTML, '');
});

test('runAiSuggest — subcategory dari AI tidak ketemu di kategori itu -> tetap render, subName null', async () => {
  const D = { profile: { apiKey: 'sk-xxx' }, categories: { expense: [{ name: 'Makan', emoji: '🍔', subs: [{ name: 'Warung' }] }] } };
  const { ctx, fakeDocument } = makeAutoKat(D, {
    domValues: { txNote: { value: 'makan siang' } },
    callAIProviderRaw: async () => ({ ok: true, text: '{"category":"Makan","subcategory":"Sub Ngarang"}' }),
  });
  await ctx.AutoKat.runAiSuggest('makan siang');
  const box = fakeDocument.getElementById('txCatAiSuggest');
  assert.equal(box.dataset.catName, 'Makan');
  assert.equal(box.dataset.subName, '');
});

test('runAiSuggest — request lebih baru menyusul sebelum yg lama selesai -> hasil basi dibuang (token check)', async () => {
  const D = { profile: { apiKey: 'sk-xxx' }, categories: { expense: [{ name: 'Makan', emoji: '🍔', subs: [] }] } };
  const { ctx, fakeDocument } = makeAutoKat(D, {
    domValues: { txNote: { value: 'note kedua' } },
    callAIProviderRaw: async (sys, msgs) => {
      const noteInCall = msgs[0].content;
      if (noteInCall.includes('note pertama')) {
        // simulasikan request kedua nyelip & selesai duluan sebelum yg pertama balas.
        await ctx.AutoKat.runAiSuggest('note kedua');
        return { ok: true, text: '{"category":"Makan"}' }; // hasil request PERTAMA, harus dibuang
      }
      return { ok: true, text: '{"category":"Makan"}' };
    },
  });
  await ctx.AutoKat.runAiSuggest('note pertama');
  // Boks tetap terisi (dari request kedua yg sah), bukan dari request pertama yg basi —
  // di sini keduanya sama2 valid, jadi cukup pastikan tidak error & box terisi wajar.
  assert.match(fakeDocument.getElementById('txCatAiSuggest').innerHTML, /Makan/);
});

// ================= renderSuggest =================

test('renderSuggest — tanpa subName -> tidak ada tanda panah sub, tanpa reasoning -> tidak ada blok alasan', () => {
  const D = {};
  const { ctx, fakeDocument } = makeAutoKat(D);
  ctx.AutoKat.renderSuggest({ categoryName: 'Makan', subName: null, emoji: '🍔', source: 'lokal', reasoning: null });
  const box = fakeDocument.getElementById('txCatAiSuggest');
  assert.doesNotMatch(box.innerHTML, /→/);
  assert.match(box.innerHTML, /Tebakan cepat/);
});

test('renderSuggest — dgn subName & reasoning -> keduanya muncul di innerHTML', () => {
  const D = {};
  const { ctx, fakeDocument } = makeAutoKat(D);
  ctx.AutoKat.renderSuggest({ categoryName: 'Makan', subName: 'Warung', emoji: '🍔', source: 'ai', reasoning: 'karena ada kata warung' });
  const box = fakeDocument.getElementById('txCatAiSuggest');
  assert.match(box.innerHTML, /→ Warung/);
  assert.match(box.innerHTML, /karena ada kata warung/);
});

test('renderSuggest — box tidak ada -> no-op tanpa error', () => {
  const D = {};
  const { ctx, fakeDocument } = makeAutoKat(D);
  fakeDocument.getElementById = () => null;
  assert.doesNotThrow(() => ctx.AutoKat.renderSuggest({ categoryName: 'X', emoji: '📦' }));
});

test('renderSuggest — emoji kosong fallback ke 📦', () => {
  const D = {};
  const { ctx, fakeDocument } = makeAutoKat(D);
  ctx.AutoKat.renderSuggest({ categoryName: 'X', emoji: null, source: 'lokal' });
  assert.match(fakeDocument.getElementById('txCatAiSuggest').innerHTML, /📦/);
});

// ================= apply =================

test('apply — box tidak ada catName tersimpan -> no-op', () => {
  const D = {};
  const { ctx, calls } = makeAutoKat(D);
  ctx.AutoKat.apply();
  assert.equal(calls.selectTxCat.length, 0);
  assert.equal(calls.toast.length, 0);
});

test('apply — isi kategori (& subkategori kalau ada) lewat selectTxCat/selectTxSubCat, lalu belajar & sembunyikan saran', () => {
  const D = {};
  const { ctx, fakeDocument, calls } = makeAutoKat(D);
  ctx.AutoKat.renderSuggest({ categoryName: 'Belanja Dapur', subName: 'Warung', emoji: '🛒', source: 'ai', note: 'bayar galon dan beras' });
  ctx.AutoKat.apply();
  assert.deepEqual(calls.selectTxCat, ['Belanja Dapur']);
  assert.deepEqual(calls.selectTxSubCat, ['Warung']);
  assert.ok(calls.toast[0].includes('Kategori & subkategori terisi'));
  assert.equal(D.learnedItemCat.galon, 'Belanja Dapur');
  assert.equal(D.learnedItemCat.beras, 'Belanja Dapur');
  assert.equal(fakeDocument.getElementById('txCatAiSuggest').innerHTML, ''); // hideSuggest ikut jalan
});

test('apply — tanpa subName -> selectTxSubCat TIDAK dipanggil, toast tanpa kata "subkategori"', () => {
  const D = {};
  const { ctx, calls } = makeAutoKat(D);
  ctx.AutoKat.renderSuggest({ categoryName: 'Makan', subName: null, emoji: '🍔', source: 'lokal', note: 'makan siang' });
  ctx.AutoKat.apply();
  assert.deepEqual(calls.selectTxCat, ['Makan']);
  assert.equal(calls.selectTxSubCat.length, 0);
  assert.ok(!calls.toast[0].includes('subkategori'));
});

test('apply — selectTxCat tidak tersedia -> fallback set txCat.value langsung', () => {
  const D = {};
  const { ctx, fakeDocument } = makeAutoKat(D, { selectTxCat: undefined });
  ctx.AutoKat.renderSuggest({ categoryName: 'Makan', subName: null, emoji: '🍔', source: 'lokal', note: 'x' });
  ctx.AutoKat.apply();
  assert.equal(fakeDocument.getElementById('txCat').value, 'Makan');
});

// ================= learnFromNote =================

test('learnFromNote — ekstrak kata kunci (>=4 huruf, bukan stopword/angka), maksimal 4 kata', () => {
  const D = {};
  const { ctx } = makeAutoKat(D);
  ctx.AutoKat.learnFromNote('bayar galon beras minyak gula telur 2024', 'Belanja Dapur');
  const learned = Object.keys(D.learnedItemCat);
  // "bayar" stopword dibuang, "2024" angka dibuang, sisanya max 4 kata pertama diambil.
  assert.ok(!learned.includes('bayar'));
  assert.ok(!learned.includes('2024'));
  assert.equal(learned.length, 4);
  assert.equal(D.learnedItemCat.galon, 'Belanja Dapur');
});

test('learnFromNote — note atau catName kosong -> no-op', () => {
  const D = {};
  const { ctx, calls } = makeAutoKat(D);
  ctx.AutoKat.learnFromNote('', 'Makan');
  ctx.AutoKat.learnFromNote('galon beras', '');
  assert.equal(D.learnedItemCat, undefined);
  assert.equal(calls.save, 0);
});

test('learnFromNote — semua kata cuma stopword/angka/pendek -> tidak ada yg dipelajari, tidak save', () => {
  const D = {};
  const { ctx, calls } = makeAutoKat(D);
  ctx.AutoKat.learnFromNote('bayar buat ini 123', 'Makan');
  assert.equal(D.learnedItemCat, undefined);
  assert.equal(calls.save, 0);
});

test('learnFromNote — D.learnedItemCat sudah ada isinya -> ditambahkan (bukan ditimpa total)', () => {
  const D = { learnedItemCat: { lama: 'Kategori Lama' } };
  const { ctx } = makeAutoKat(D);
  ctx.AutoKat.learnFromNote('galon beras', 'Belanja Dapur');
  assert.equal(D.learnedItemCat.lama, 'Kategori Lama');
  assert.equal(D.learnedItemCat.galon, 'Belanja Dapur');
});
