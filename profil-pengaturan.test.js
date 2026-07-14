'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const { createFakeDocument, createFakeElement } = require('./helpers/fakeDom');

// profil-pengaturan.js bergantung ke fungsi/var global dari file lain (D/save dari
// features-helpers-global-security.js, persistApiKeyEncrypted dari keamanan-pin.js,
// fiCalcAge dari modules-calc.js, renderPajakRekomendasi dari modules-render.js) —
// semua di-stub di sini (pola sama dgn onboarding.test.js), supaya test file ini
// tidak perlu me-load seluruh app cuma demi 1 file kecil ini.
// Selector chip (`#sStatusKawinPicker .chip-btn` dst) didaftarkan lewat queryGroups
// karena fakeDom bukan mesin CSS selector asli (lihat catatan di fakeDom.js).
function makeCtx(domInitial = {}, queryGroups = {}) {
  const fakeDocument = createFakeDocument(domInitial, queryGroups);
  const calls = {
    save: 0,
    persistApiKeyEncrypted: 0,
    renderPajakRekomendasiArgs: [],
    fiCalcAgeArgs: [],
  };
  const D = { profile: {} };
  const ctx = loadSource(['profil-pengaturan.js'], {
    document: fakeDocument,
    D,
    save: () => { calls.save++; },
    persistApiKeyEncrypted: () => { calls.persistApiKeyEncrypted++; },
    fiCalcAge: (iso) => { calls.fiCalcAgeArgs.push(iso); return 30; },
    renderPajakRekomendasi: (applyOpen) => { calls.renderPajakRekomendasiArgs.push(applyOpen); },
  });
  return { ctx, fakeDocument, calls, D };
}

// ---------- autoSaveProfile ----------

test('autoSaveProfile — nama/gaji/kiriman kosong pakai default (W / 65000 / 500000)', () => {
  const { ctx, D } = makeCtx({
    sNama: { value: '' },
    sGaji: { value: '' },
    sKirim: { value: 'abc' },
    hNama: {},
  });
  ctx.autoSaveProfile();
  assert.equal(D.profile.nama, 'W');
  assert.equal(D.profile.gajiPokok, 65000);
  assert.equal(D.profile.kiriman, 500000);
});

test('autoSaveProfile — nama/gaji/kiriman terisi dipakai apa adanya', () => {
  const { ctx, D } = makeCtx({
    sNama: { value: 'Budi' },
    sGaji: { value: '100000' },
    sKirim: { value: '500000' },
    hNama: {},
  });
  ctx.autoSaveProfile();
  assert.equal(D.profile.nama, 'Budi');
  assert.equal(D.profile.gajiPokok, 100000);
  assert.equal(D.profile.kiriman, 500000);
});

test('autoSaveProfile — field opsional (lembur/tarif minggu/tanggal lahir) diisi kalau elemen ada', () => {
  const { ctx, D } = makeCtx({
    sNama: { value: 'Budi' }, sGaji: { value: '100000' }, sKirim: { value: '500000' },
    hNama: {},
    sLemburMx: { value: '2' },
    sTarifMinggu: { value: '150000' },
    sTanggalLahir: { value: '1995-05-01' },
  });
  ctx.autoSaveProfile();
  assert.equal(D.profile.lemburMultiplier, 2);
  assert.equal(D.profile.tarifMinggu, 150000);
  assert.equal(D.profile.tanggalLahir, '1995-05-01');
});

test('autoSaveProfile — field opsional yg elemennya tidak ada di DOM tidak disentuh sama sekali', () => {
  const { ctx, D, fakeDocument } = makeCtx({
    sNama: { value: 'Budi' }, sGaji: { value: '100000' }, sKirim: { value: '500000' },
    hNama: {},
  });
  // fakeDom selalu bikin elemen; simulasikan "tidak ada di DOM" via getElementById custom
  // utk id opsional saja (id wajib tetap harus balik elemen, bukan null).
  const OPSIONAL = ['sLemburMx', 'sTarifMinggu', 'sTanggalLahir', 'sApiKey', 'sApiProvider'];
  const origGetById = fakeDocument.getElementById;
  fakeDocument.getElementById = (id) => (OPSIONAL.includes(id) ? null : origGetById(id));
  assert.doesNotThrow(() => ctx.autoSaveProfile());
  assert.equal(D.profile.lemburMultiplier, undefined);
  assert.equal(D.profile.tarifMinggu, undefined);
  assert.equal(D.profile.tanggalLahir, undefined);
  assert.equal(D.profile.apiKey, undefined);
  assert.equal(D.profile.apiProvider, undefined);
});

test('autoSaveProfile — lembur/tarif minggu tanpa angka valid fallback ke default (1.5 / 139000)', () => {
  const { ctx, D } = makeCtx({
    sNama: { value: 'Budi' }, sGaji: { value: '100000' }, sKirim: { value: '500000' },
    hNama: {},
    sLemburMx: { value: 'xyz' },
    sTarifMinggu: { value: '' },
  });
  ctx.autoSaveProfile();
  assert.equal(D.profile.lemburMultiplier, 1.5);
  assert.equal(D.profile.tarifMinggu, 139000);
});

test('autoSaveProfile — apiKey di-trim & persistApiKeyEncrypted() dipanggil kalau elemen sApiKey ada', () => {
  const { ctx, D, calls } = makeCtx({
    sNama: { value: 'Budi' }, sGaji: { value: '100000' }, sKirim: { value: '500000' },
    hNama: {},
    sApiKey: { value: '  sk-ant-rahasia  ' },
  });
  ctx.autoSaveProfile();
  assert.equal(D.profile.apiKey, 'sk-ant-rahasia');
  assert.equal(calls.persistApiKeyEncrypted, 1);
});

test('autoSaveProfile — tanpa elemen sApiKey, persistApiKeyEncrypted() tidak dipanggil', () => {
  const { ctx, calls, fakeDocument } = makeCtx({
    sNama: { value: 'Budi' }, sGaji: { value: '100000' }, sKirim: { value: '500000' },
    hNama: {},
  });
  // fakeDom selalu bikin elemen; simulasikan sApiKey tidak ada di DOM via getElementById custom.
  const origGetById = fakeDocument.getElementById;
  fakeDocument.getElementById = (id) => (id === 'sApiKey' ? null : origGetById(id));
  ctx.autoSaveProfile();
  assert.equal(calls.persistApiKeyEncrypted, 0);
});

test('autoSaveProfile — sApiProvider diisi ke D.profile.apiProvider kalau elemen ada', () => {
  const { ctx, D } = makeCtx({
    sNama: { value: 'Budi' }, sGaji: { value: '100000' }, sKirim: { value: '500000' },
    hNama: {},
    sApiProvider: { value: 'gemini' },
  });
  ctx.autoSaveProfile();
  assert.equal(D.profile.apiProvider, 'gemini');
});

test('autoSaveProfile — hNama.textContent diisi nama & save() dipanggil tepat 1x', () => {
  const { ctx, fakeDocument, calls } = makeCtx({
    sNama: { value: 'Sari' }, sGaji: { value: '100000' }, sKirim: { value: '500000' },
    hNama: {},
  });
  ctx.autoSaveProfile();
  assert.equal(fakeDocument.getElementById('hNama').textContent, 'Sari');
  assert.equal(calls.save, 1);
});

// ---------- profilePTKPStatus / profileJiwaKeluarga (pure) ----------

test('profilePTKPStatus — belum kawin, tanpa tanggungan -> TK0', () => {
  const { ctx, D } = makeCtx();
  D.profile = { statusKawin: false, tanggungan: 0 };
  assert.equal(ctx.profilePTKPStatus(), 'TK0');
});

test('profilePTKPStatus — kawin, 2 tanggungan -> K2', () => {
  const { ctx, D } = makeCtx();
  D.profile = { statusKawin: true, tanggungan: 2 };
  assert.equal(ctx.profilePTKPStatus(), 'K2');
});

test('profilePTKPStatus — tanggungan di-clamp maksimal 3', () => {
  const { ctx, D } = makeCtx();
  D.profile = { statusKawin: true, tanggungan: 10 };
  assert.equal(ctx.profilePTKPStatus(), 'K3');
});

test('profilePTKPStatus — tanggungan negatif/non-angka di-clamp minimal 0', () => {
  const { ctx, D } = makeCtx();
  D.profile = { statusKawin: false, tanggungan: -5 };
  assert.equal(ctx.profilePTKPStatus(), 'TK0');
  D.profile = { statusKawin: false, tanggungan: 'abc' };
  assert.equal(ctx.profilePTKPStatus(), 'TK0');
});

test('profilePTKPStatus — D.profile belum ada sama sekali tidak error, hasil TK0', () => {
  const { ctx, D } = makeCtx();
  D.profile = undefined;
  assert.equal(ctx.profilePTKPStatus(), 'TK0');
});

test('profileJiwaKeluarga — sendiri tanpa kawin/tanggungan -> 1', () => {
  const { ctx, D } = makeCtx();
  D.profile = { statusKawin: false, tanggungan: 0 };
  assert.equal(ctx.profileJiwaKeluarga(), 1);
});

test('profileJiwaKeluarga — kawin + 2 tanggungan -> 4 (1 + pasangan + 2 anak)', () => {
  const { ctx, D } = makeCtx();
  D.profile = { statusKawin: true, tanggungan: 2 };
  assert.equal(ctx.profileJiwaKeluarga(), 4);
});

test('profileJiwaKeluarga — TIDAK di-clamp maksimal 3 (beda dgn profilePTKPStatus)', () => {
  const { ctx, D } = makeCtx();
  D.profile = { statusKawin: true, tanggungan: 5 };
  assert.equal(ctx.profileJiwaKeluarga(), 7); // 1 + 1 + 5, bukan 1+1+3
});

// ---------- updateProfilPTKPPreview ----------

test('updateProfilPTKPPreview — elemen sPTKPPreview tidak ada, langsung return tanpa error', () => {
  const { ctx } = makeCtx();
  assert.doesNotThrow(() => ctx.updateProfilPTKPPreview());
});

test('updateProfilPTKPPreview — status TK0 dirender jadi "TK/0"', () => {
  const { ctx, fakeDocument, D } = makeCtx({ sPTKPPreview: {} });
  D.profile = { statusKawin: false, tanggungan: 0 };
  ctx.updateProfilPTKPPreview();
  assert.equal(fakeDocument.getElementById('sPTKPPreview').textContent, 'TK/0');
});

test('updateProfilPTKPPreview — status K2 dirender jadi "K/2"', () => {
  const { ctx, fakeDocument, D } = makeCtx({ sPTKPPreview: {} });
  D.profile = { statusKawin: true, tanggungan: 2 };
  ctx.updateProfilPTKPPreview();
  assert.equal(fakeDocument.getElementById('sPTKPPreview').textContent, 'K/2');
});

// ---------- updateUsiaPreview ----------

test('updateUsiaPreview — elemen wrap/val tidak lengkap, langsung return tanpa error', () => {
  const { ctx } = makeCtx({ sUsiaPreview: {} }); // sUsiaVal sengaja tidak ada
  assert.doesNotThrow(() => ctx.updateUsiaPreview());
});

test('updateUsiaPreview — tanpa tanggal lahir, wrap disembunyikan', () => {
  const { ctx, fakeDocument, D } = makeCtx({
    sUsiaPreview: { style: {} },
    sUsiaVal: {},
  });
  D.profile = { tanggalLahir: null };
  ctx.updateUsiaPreview();
  assert.equal(fakeDocument.getElementById('sUsiaPreview').style.display, 'none');
});

test('updateUsiaPreview — dengan tanggal lahir, wrap ditampilkan & usia diisi dari fiCalcAge', () => {
  // createFakeElement() (bukan objek literal) dipakai di sini supaya classList-nya
  // beneran bisa contains()/remove(), bukan array biasa (pola sama spt fi-calc.test.js).
  const { ctx, fakeDocument, D, calls } = makeCtx({
    sUsiaPreview: createFakeElement({ style: {}, classList: ['u-dnone'] }),
    sUsiaVal: {},
  });

  D.profile = { tanggalLahir: '1995-05-01' };
  ctx.updateUsiaPreview();
  const wrap = fakeDocument.getElementById('sUsiaPreview');
  assert.equal(wrap.style.display, 'block');
  assert.equal(wrap.classList.contains('u-dnone'), false);
  assert.equal(fakeDocument.getElementById('sUsiaVal').textContent, '30 tahun');
  assert.deepEqual(calls.fiCalcAgeArgs, ['1995-05-01']);
});

// ---------- selectStatusKawin ----------

test('selectStatusKawin — set true, aktifkan chip yg diklik & nonaktifkan yg lain, update preview & save', () => {
  const chipYa = { classList: { active: false, add(n) { if (n === 'active') this.active = true; }, remove(n) { if (n === 'active') this.active = false; } } };
  const chipTidak = { classList: { active: true, add(n) { if (n === 'active') this.active = true; }, remove(n) { if (n === 'active') this.active = false; } } };
  const { ctx, D, calls } = makeCtx(
    { sPTKPPreview: {} },
    { '#sStatusKawinPicker .chip-btn': [chipYa, chipTidak] },
  );
  ctx.selectStatusKawin(1, chipYa);
  assert.equal(D.profile.statusKawin, true);
  assert.equal(chipYa.classList.active, true);
  assert.equal(chipTidak.classList.active, false);
  assert.equal(calls.save, 1);
});

test('selectStatusKawin — val falsy disimpan sbg false (!!val)', () => {
  const chip = { classList: { add() {}, remove() {} } };
  const { ctx, D } = makeCtx({ sPTKPPreview: {} }, { '#sStatusKawinPicker .chip-btn': [chip] });
  ctx.selectStatusKawin(0, chip);
  assert.equal(D.profile.statusKawin, false);
});

// ---------- selectTanggungan ----------

test('selectTanggungan — nilai wajar disimpan apa adanya & chip aktif berpindah', () => {
  const chip = { classList: { add() {}, remove() {} } };
  const { ctx, D, calls } = makeCtx({ sPTKPPreview: {} }, { '#sTanggunganPicker .chip-btn': [chip] });
  ctx.selectTanggungan(2, chip);
  assert.equal(D.profile.tanggungan, 2);
  assert.equal(calls.save, 1);
});

test('selectTanggungan — di-clamp ke rentang 0-3', () => {
  const chip = { classList: { add() {}, remove() {} } };
  const { ctx, D } = makeCtx({ sPTKPPreview: {} }, { '#sTanggunganPicker .chip-btn': [chip] });
  ctx.selectTanggungan(9, chip);
  assert.equal(D.profile.tanggungan, 3);
  ctx.selectTanggungan(-4, chip);
  assert.equal(D.profile.tanggungan, 0);
  ctx.selectTanggungan('abc', chip);
  assert.equal(D.profile.tanggungan, 0);
});

// ---------- selectStatusPekerjaan ----------

test('selectStatusPekerjaan — set status, save(), & renderPajakRekomendasi(true) dipanggil', () => {
  const chip = { classList: { add() {}, remove() {} } };
  const { ctx, D, calls } = makeCtx({}, { '#sPekerjaanPicker .chip-btn': [chip] });
  ctx.selectStatusPekerjaan('karyawan', chip);
  assert.equal(D.profile.statusPekerjaan, 'karyawan');
  assert.equal(calls.save, 1);
  assert.deepEqual(calls.renderPajakRekomendasiArgs, [true]);
});

// ---------- toggleApiKeyHint ----------

test('toggleApiKeyHint — provider gemini: placeholder & hint mengarah ke aistudio.google.com', () => {
  const { ctx, fakeDocument } = makeCtx({
    sApiProvider: { value: 'gemini' },
    apiKeyHint: {},
    sApiKey: {},
  });
  ctx.toggleApiKeyHint();
  assert.equal(fakeDocument.getElementById('sApiKey').placeholder, 'AIza...');
  assert.equal(fakeDocument.getElementById('apiKeyHint').innerHTML.includes('aistudio.google.com'), true);
});

test('toggleApiKeyHint — provider selain gemini (mis. anthropic): placeholder & hint mengarah ke console.anthropic.com', () => {
  const { ctx, fakeDocument } = makeCtx({
    sApiProvider: { value: 'anthropic' },
    apiKeyHint: {},
    sApiKey: {},
  });
  ctx.toggleApiKeyHint();
  assert.equal(fakeDocument.getElementById('sApiKey').placeholder, 'sk-ant-...');
  assert.equal(fakeDocument.getElementById('apiKeyHint').innerHTML.includes('console.anthropic.com'), true);
});

test('toggleApiKeyHint — elemen hint/keyEl tidak ada, langsung return tanpa error', () => {
  const { ctx } = makeCtx({ sApiProvider: { value: 'gemini' } }); // apiKeyHint/sApiKey sengaja tidak ada
  assert.doesNotThrow(() => ctx.toggleApiKeyHint());
});
